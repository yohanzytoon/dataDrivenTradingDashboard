require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');  // Add security headers
const morgan = require('morgan');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const compression = require('compression'); // Add compression for responses

const rateLimit = require('express-rate-limit');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-dashboard';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const API_VERSION = process.env.API_VERSION || '1.0.0';
const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:5002/predict';

// Configure basic rate limiter - no Redis dependency for simplicity
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

// Configure more strict rate limiter for sensitive routes
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many API requests, please try again later.'
  }
});

// Import route handlers and services
const marketRoutes = require('./routes/marketRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const userRoutes = require('./routes/userRoutes');
const { getLatestMarketData, fetchMarketData } = require('./services/marketDataService');

// Setup Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: NODE_ENV === 'production' ? CLIENT_URL : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging - use 'combined' format for production, 'dev' for development
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// Apply rate limiting
app.use(limiter);

// Setup Socket.io for real-time updates
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// MongoDB connection with retry logic
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  };

  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('Connected to MongoDB successfully');
    
    // Setup MongoDB error handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, attempting to reconnect...');
      setTimeout(connectDB, 5000); // Retry after 5s
    });
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000); // Retry after 5s
    return false;
  }
};

// API Routes with stricter rate limits for API endpoints
app.use('/api/market', apiLimiter, marketRoutes);
app.use('/api/analysis', apiLimiter, analysisRoutes);
app.use('/api/user', apiLimiter, userRoutes);

// Prediction endpoint using real market data from the DB
app.post('/api/prediction', apiLimiter, async (req, res) => {
  try {
    const { symbol = 'SPY', limit = 100, days = 30 } = req.body;
    
    // Input validation
    if (typeof symbol !== 'string' || symbol.length === 0) {
      return res.status(400).json({ error: 'Invalid symbol' });
    }
    
    if (typeof limit !== 'number' || limit <= 0 || limit > 500) {
      return res.status(400).json({ error: 'Limit must be between 1 and 500' });
    }
    
    if (typeof days !== 'number' || days <= 0 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' });
    }
    
    // Get the latest data from the database
    const marketData = await getLatestMarketData(symbol, limit);
    
    if (!marketData || marketData.length === 0) {
      return res.status(400).json({ error: 'Insufficient market data for prediction' });
    }
    
    // Create the payload expected by the Python ML microservice
    const payload = { symbol, days, marketData };
    
    try {
      // Use dynamic import for axios to avoid dependency if not used
      const { default: axios } = await import('axios');
      
      const pythonResponse = await axios.post(PYTHON_ML_URL, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return res.status(200).json(pythonResponse.data);
    } catch (pythonError) {
      console.error("Error calling Python prediction service:", pythonError.message);
      
      // Create fallback predictions if Python service is unavailable
      const fallbackPredictions = generateFallbackPredictions(marketData);
      
      return res.status(200).json({
        symbol,
        predictions: fallbackPredictions,
        timestamp: new Date().toISOString(),
        model_version: 'fallback-1.0',
        note: 'Using fallback predictions as ML service is unavailable'
      });
    }
  } catch (error) {
    console.error("Error in /api/prediction:", error);
    return res.status(500).json({ 
      error: 'Prediction service error',
      message: error.message
    });
  }
});

// Generate fallback predictions based on recent trend
function generateFallbackPredictions(marketData) {
  if (!marketData || marketData.length < 5) {
    return {};
  }
  
  const predictions = {};
  const lastPrice = marketData[marketData.length - 1].close;
  
  // Calculate simple trend
  const recentPrices = marketData.slice(-5).map(item => item.close);
  const avgChange = recentPrices.slice(1).reduce(
    (sum, price, i) => sum + (price - recentPrices[i]) / recentPrices[i],
    0
  ) / (recentPrices.length - 1);
  
  // Project forward with slight randomness
  predictions['15min'] = lastPrice * (1 + avgChange * 0.5);
  predictions['30min'] = lastPrice * (1 + avgChange * 1.0);
  predictions['60min'] = lastPrice * (1 + avgChange * 1.5);
  
  return predictions;
}

// Root route with enhanced status information
app.get('/', (req, res) => {
  const status = {
    service: 'Trading Dashboard API',
    status: 'running',
    timestamp: new Date(),
    version: API_VERSION,
    environment: NODE_ENV,
    endpoints: {
      market: '/api/market',
      analysis: '/api/analysis',
      prediction: '/api/prediction',
      user: '/api/user'
    }
  };
  res.json(status);
});

// Health check endpoint with enhanced diagnostics
app.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    services: {
      mongodb: false,
      ml_service: false
    }
  };
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      healthcheck.services.mongodb = true;
    } else {
      healthcheck.message = 'Database connection issue';
    }
    
    // Check ML service
    try {
      const { default: axios } = await import('axios');
      await axios.get(`${PYTHON_ML_URL.split('/predict')[0]}/health`, { timeout: 3000 });
      healthcheck.services.ml_service = true;
    } catch (error) {
      console.warn('ML service health check failed:', error.message);
      // Continue even if ML service is down
    }
    
    // Overall status - OK if critical services are working
    if (healthcheck.services.mongodb) {
      res.status(200).json(healthcheck);
    } else {
      res.status(503).json(healthcheck);
    }
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json(healthcheck);
  }
});

// Generic error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Schedule market data fetching every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log('Fetching latest market data...');
    
    // Fetch market data for multiple symbols
    const symbols = ['SPY', 'AAPL', 'MSFT', 'GOOGL'];
    
    for (const symbol of symbols) {
      try {
        const marketData = await fetchMarketData(symbol);
        
        // Only emit if data was successfully fetched
        if (marketData && marketData.length > 0) {
          io.emit(`marketUpdate:${symbol}`, marketData);
        }
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in scheduled market data fetch:', error);
  }
});

// Socket.io connection handler with enhanced error handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Track subscribed symbols for this client
  const subscribedSymbols = new Set(['SPY']); // Default subscription
  
  // Send the latest market data to newly connected clients
  getLatestMarketData('SPY', 100)
    .then(data => {
      if (data && data.length > 0) {
        socket.emit('marketUpdate', data);
        console.log(`Sent initial market data to client ${socket.id}`);
      } else {
        console.warn(`No market data available to send to client ${socket.id}`);
        socket.emit('marketError', { message: 'No market data available' });
      }
    })
    .catch(err => {
      console.error(`Error fetching initial market data for client ${socket.id}:`, err.message);
      socket.emit('marketError', { message: 'Error fetching market data' });
    });
    
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle specific client requests for data refresh
  socket.on('requestDataRefresh', ({ symbol = 'SPY', limit = 100 } = {}) => {
    getLatestMarketData(symbol, limit)
      .then(data => {
        if (data && data.length > 0) {
          socket.emit('marketUpdate', data);
        } else {
          socket.emit('marketError', { message: 'No updated market data available' });
        }
      })
      .catch(err => {
        console.error('Error handling client data refresh request:', err.message);
        socket.emit('marketError', { message: 'Error refreshing market data' });
      });
  });
  
  // Handle symbol subscription
  socket.on('subscribeSymbol', (symbol) => {
    if (typeof symbol === 'string' && symbol.length > 0) {
      subscribedSymbols.add(symbol.toUpperCase());
      console.log(`Client ${socket.id} subscribed to ${symbol}`);
      
      // Send initial data for the newly subscribed symbol
      getLatestMarketData(symbol, 100)
        .then(data => {
          if (data && data.length > 0) {
            socket.emit(`marketUpdate:${symbol}`, data);
          }
        })
        .catch(err => {
          console.error(`Error sending initial data for ${symbol}:`, err.message);
        });
    }
  });
  
  // Handle symbol unsubscription
  socket.on('unsubscribeSymbol', (symbol) => {
    if (typeof symbol === 'string') {
      subscribedSymbols.delete(symbol.toUpperCase());
      console.log(`Client ${socket.id} unsubscribed from ${symbol}`);
    }
  });
});

// Start the application
const startServer = async () => {
  await connectDB();
  
  httpServer.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer();
