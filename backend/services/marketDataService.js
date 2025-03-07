// marketDataService.js - Enhanced service with better error handling, validation and performance
const mongoose = require('mongoose');
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure enhanced logging with file rotation and better formatting
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'market-data-service' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, service }) => {
          return `${timestamp} [${service}] ${level}: ${message}`;
        })
      )
    }),
    new transports.File({ 
      filename: path.join(logsDir, 'market-data-error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: path.join(logsDir, 'market-data.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// MongoDB schema for market data with improved validation
const MarketDataSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: true, 
    trim: true,
    uppercase: true,
    match: /^[A-Z0-9.]{1,10}$/  // Validate symbol format
  },
  timestamp: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: props => `${props.value} is not a valid date!`
    }
  },
  open: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: props => `Open price must be positive`
    }
  },
  high: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        return v >= this.open;
      },
      message: props => `High price must be greater than or equal to open price`
    }
  },
  low: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        return v <= this.open;
      },
      message: props => `Low price must be less than or equal to open price`
    }
  },
  close: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: props => `Close price must be positive`
    }
  },
  volume: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: props => `Volume must be non-negative`
    }
  },
  source: { 
    type: String, 
    default: 'SIMULATED',
    enum: ['SIMULATED', 'ALPHA_VANTAGE', 'YAHOO', 'IEX', 'CUSTOM']
  }
}, { 
  timestamps: true,
  // Add index optimization for query performance
  indexes: [
    { symbol: 1, timestamp: -1 },  // For fetching latest data by symbol
    { timestamp: 1 }               // For time-based queries
  ]
});

// Pre-save hook for additional validation
MarketDataSchema.pre('save', function(next) {
  if (this.high < this.low) {
    return next(new Error('High price cannot be less than low price'));
  }
  next();
});

// Create compound index for uniqueness constraint
MarketDataSchema.index({ symbol: 1, timestamp: 1 }, { unique: true });

// Use existing model if available or create a new one (prevents model overwrite warning)
const MarketData = mongoose.models.MarketData || mongoose.model('MarketData', MarketDataSchema);

/**
 * Generate sample market data if none exists
 * @param {string} symbol - Stock symbol
 * @param {number} numPoints - Number of data points to generate
 * @returns {Promise<void>}
 */
async function generateSampleData(symbol = 'SPY', numPoints = 100) {
  try {
    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    if (!numPoints || numPoints <= 0 || numPoints > 1000) {
      throw new Error('Number of points must be between 1 and 1000');
    }
    
    // Check if data already exists
    const existingData = await MarketData.find({ symbol }).limit(1);
    
    if (existingData.length > 0) {
      logger.debug(`Sample data already exists for ${symbol}, skipping generation`);
      return;
    }
    
    logger.info(`Generating ${numPoints} sample data points for ${symbol}`);
    
    const basePrice = symbol === 'SPY' ? 450 : 
                     symbol === 'AAPL' ? 180 :
                     symbol === 'MSFT' ? 350 :
                     symbol === 'GOOGL' ? 140 :
                     symbol === 'AMZN' ? 175 : 100;
    
    const now = new Date();
    const marketData = [];
    
    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(now.getTime() - (numPoints - i) * 5 * 60000);
      
      // More realistic price movement simulation
      const dayFactor = Math.sin(i / 30) * 3;  // Longer trend
      const hourFactor = Math.sin(i / 8) * 2;  // Medium trend
      const minuteFactor = (Math.random() - 0.5) * 1.5;  // Random noise
      
      const dailyVol = 0.015;  // 1.5% daily volatility
      const volatilityFactor = dailyVol * Math.sqrt(1/288);  // Scaled to 5-min intervals
      const noise = dayFactor + hourFactor + minuteFactor;
      
      const close = basePrice * (1 + noise * volatilityFactor);
      const range = close * 0.002;  // 0.2% range for high/low
      
      const open = close - (Math.random() - 0.5) * range;
      const high = Math.max(close, open) + Math.random() * range;
      const low = Math.min(close, open) - Math.random() * range;
      
      marketData.push({
        symbol,
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.floor(50000 + Math.random() * 150000),
        source: 'SIMULATED'
      });
    }
    
    try {
      // Use ordered: false for better performance on bulk inserts
      await MarketData.insertMany(marketData, { ordered: false });
      logger.info(`Successfully generated ${marketData.length} sample data points for ${symbol}`);
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        logger.warn(`Some duplicate entries were skipped for ${symbol}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error(`Error generating sample data: ${error.message}`);
    throw new Error(`Failed to generate sample data: ${error.message}`);
  }
}

/**
 * Get the latest market data from MongoDB
 * @param {string} symbol - Stock symbol
 * @param {number} limit - Number of data points to retrieve
 * @returns {Promise<Array>} - Array of market data points
 */
async function getLatestMarketData(symbol = 'SPY', limit = 100) {
  try {
    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    if (!limit || limit <= 0 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    // Ensure we have some sample data
    await generateSampleData(symbol, Math.max(limit, 100));
    
    // Optimize query with lean() and projection
    const data = await MarketData.find(
      { symbol }, 
      { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    )
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    
    if (!data || data.length === 0) {
      logger.warn(`No data found for symbol ${symbol}`);
      return generateSimulatedData(symbol, limit);
    }
    
    // Reverse so that data is in ascending (chronological) order
    return data.reverse();
  } catch (error) {
    logger.error(`Error fetching latest market data: ${error.message}`);
    // Return simulated data as fallback
    return generateSimulatedData(symbol, limit);
  }
}

/**
 * Fetch market data (will add a new point to the database)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} - Array of market data points
 */
async function fetchMarketData(symbol = 'SPY') {
  try {
    // Validate input
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    // Get the latest data point with error handling
    const latestData = await MarketData.findOne({ symbol })
      .sort({ timestamp: -1 })
      .lean()
      .exec();
    
    if (!latestData) {
      logger.info(`No existing data found for ${symbol}, generating sample data`);
      await generateSampleData(symbol, 100);
      return getLatestMarketData(symbol, 100);
    }
    
    // Create a new data point based on the previous one
    const now = new Date();
    const prevClose = latestData.close;
    
    // More realistic price movement simulation
    const timeElapsed = (now - new Date(latestData.timestamp)) / (1000 * 60); // in minutes
    const volatilityFactor = 0.0007 * Math.sqrt(timeElapsed); // scaled to time elapsed
    const change = prevClose * (Math.random() - 0.5) * 2 * volatilityFactor;
    
    const newClose = prevClose + change;
    const range = prevClose * 0.001; // 0.1% range for high/low
    
    const newDataPoint = {
      symbol,
      timestamp: now,
      open: prevClose,
      high: Math.max(prevClose, newClose) + Math.random() * range,
      low: Math.min(prevClose, newClose) - Math.random() * range,
      close: newClose,
      volume: Math.floor(50000 + Math.random() * 150000),
      source: 'SIMULATED'
    };
    
    // Save to database with validation
    const marketData = new MarketData(newDataPoint);
    await marketData.save();
    
    logger.debug(`Added new data point for ${symbol} at ${now}`);
    
    // Return the latest data
    return getLatestMarketData(symbol, 100);
  } catch (error) {
    logger.error(`Error fetching market data: ${error.message}`);
    // Return simulated data as fallback with specific error logging
    logger.warn(`Falling back to simulated data for ${symbol}`);
    return generateSimulatedData(symbol, 100);
  }
}

/**
 * Generate simulated data as a fallback
 * @param {string} symbol - Stock symbol
 * @param {number} numPoints - Number of data points to generate
 * @returns {Array} - Array of simulated market data points
 */
function generateSimulatedData(symbol = 'SPY', numPoints = 100) {
  try {
    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    if (!numPoints || numPoints <= 0 || numPoints > 1000) {
      throw new Error('Number of points must be between 1 and 1000');
    }
    
    logger.info(`Generating ${numPoints} simulated data points for ${symbol} as fallback`);
    
    const basePrice = symbol === 'SPY' ? 450 : 
                     symbol === 'AAPL' ? 180 :
                     symbol === 'MSFT' ? 350 :
                     symbol === 'GOOGL' ? 140 :
                     symbol === 'AMZN' ? 175 : 100;
    
    const now = new Date();
    const marketData = [];
    
    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(now.getTime() - (numPoints - i) * 5 * 60000);
      
      // More realistic price movement
      const dayFactor = Math.sin(i / 30) * 3;
      const hourFactor = Math.sin(i / 8) * 2;
      const minuteFactor = (Math.random() - 0.5) * 1.5;
      
      const volatilityFactor = 0.001;
      const noise = dayFactor + hourFactor + minuteFactor;
      
      const close = basePrice * (1 + noise * volatilityFactor);
      const range = close * 0.002; // 0.2% range for high/low
      
      const open = close - (Math.random() - 0.5) * range;
      const high = Math.max(close, open) + Math.random() * range;
      const low = Math.min(close, open) - Math.random() * range;
      
      marketData.push({
        symbol,
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.floor(50000 + Math.random() * 150000),
        source: 'SIMULATED'
      });
    }
    
    return marketData;
  } catch (error) {
    logger.error(`Error generating simulated data: ${error.message}`);
    // Return empty array as ultimate fallback
    return [];
  }
}

/**
 * Fetch historical data
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period (1w, 1m, 3m, 6m, 1y)
 * @returns {Promise<Array>} - Array of market data points
 */
async function fetchHistoricalData(symbol = 'SPY', period = '1m') {
  try {
    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    const validPeriods = ['1d', '1w', '1m', '3m', '6m', '1y'];
    if (!validPeriods.includes(period)) {
      throw new Error(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }
    
    // Generate sample data if needed - more points for longer periods
    let numPoints;
    switch (period) {
      case '1d': numPoints = 75; break; // ~6.5 hours of 5-min data
      case '1w': numPoints = 390; break; // 5 days * 78 points
      case '1m': numPoints = 1680; break; // ~22 days * 78 points
      case '3m': numPoints = 5000; break; // ~65 days * 78 points
      case '6m': numPoints = 10000; break; // ~130 days * 78 points
      case '1y': numPoints = 20000; break; // ~260 days * 78 points
      default: numPoints = 100;
    }
    
    await generateSampleData(symbol, Math.min(numPoints, 1000)); // Cap at 1000 for performance
    
    // For longer periods, we'll simulate the data since we can't generate that much in MongoDB
    if (numPoints > 1000) {
      logger.info(`Generating simulated historical data for ${symbol} over ${period}`);
      return generateHistoricalSimulation(symbol, numPoints);
    }
    
    return getLatestMarketData(symbol, numPoints);
  } catch (error) {
    logger.error(`Error fetching historical data: ${error.message}`);
    return generateSimulatedData(symbol, 200);
  }
}

/**
 * Generate historical simulation data for longer time periods
 * @param {string} symbol - Stock symbol
 * @param {number} numPoints - Number of data points
 * @returns {Array} - Array of simulated historical data
 */
function generateHistoricalSimulation(symbol, numPoints) {
  const basePrice = symbol === 'SPY' ? 450 : 
                   symbol === 'AAPL' ? 180 :
                   symbol === 'MSFT' ? 350 :
                   symbol === 'GOOGL' ? 140 :
                   symbol === 'AMZN' ? 175 : 100;
  
  const now = new Date();
  const marketData = [];
  
  // Market parameters for simulation
  const annualDrift = 0.08; // 8% annual drift
  const annualVol = 0.15; // 15% annual volatility
  const tradingDaysPerYear = 252;
  const intervalsPerDay = 78; // 5-min intervals in 6.5 hour trading day
  
  // Scaled parameters for 5-min interval
  const intervalDrift = annualDrift / (tradingDaysPerYear * intervalsPerDay);
  const intervalVol = annualVol / Math.sqrt(tradingDaysPerYear * intervalsPerDay);
  
  let currentPrice = basePrice;
  
  for (let i = 0; i < numPoints; i++) {
    // Calculate timestamp with market hours (9:30 AM - 4:00 PM, M-F)
    const timestamp = new Date(now.getTime() - (numPoints - i) * 5 * 60000);
    
    // Price evolution using geometric Brownian motion
    const drift = intervalDrift;
    const diffusion = intervalVol * (Math.random() * 2 - 1);
    currentPrice = currentPrice * (1 + drift + diffusion);
    
    const range = currentPrice * 0.002; // 0.2% range for high/low
    const open = currentPrice - (Math.random() - 0.5) * range;
    const close = currentPrice;
    const high = Math.max(open, close) + Math.random() * range;
    const low = Math.min(open, close) - Math.random() * range;
    
    marketData.push({
      symbol,
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.floor(50000 + Math.random() * 150000),
      source: 'SIMULATED'
    });
  }
  
  return marketData;
}

/**
 * Get market summary for multiple symbols
 * @returns {Promise<Object>} - Market summary object
 */
async function getMarketSummary() {
  try {
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM'];
    const summary = {};
    
    // Use Promise.all for parallel processing
    const promises = indices.map(async (symbol) => {
      try {
        await generateSampleData(symbol, 100);
        const data = await getLatestMarketData(symbol, 20);
        
        if (data && data.length > 0) {
          const latestPrice = data[data.length - 1].close;
          const previousClose = data[data.length - 2]?.close || latestPrice;
          const change = latestPrice - previousClose;
          const percentChange = (change / previousClose) * 100;
          
          summary[symbol] = {
            price: parseFloat(latestPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            percentChange: parseFloat(percentChange.toFixed(2)),
            volume: data[data.length - 1].volume,
            timestamp: data[data.length - 1].timestamp
          };
        }
      } catch (error) {
        logger.error(`Error processing market summary for ${symbol}: ${error.message}`);
        // Continue with other symbols
      }
    });
    
    await Promise.all(promises);
    
    return summary;
  } catch (error) {
    logger.error(`Error getting market summary: ${error.message}`);
    return {};
  }
}

/**
 * Get top movers with more realistic simulation
 * @param {number} limit - Number of top movers to return
 * @returns {Promise<Array>} - Array of top movers
 */
async function fetchTopMovers(limit = 5) {
  try {
    // Validate input
    if (!limit || limit <= 0 || limit > 20) {
      throw new Error('Limit must be between 1 and 20');
    }
    
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
    const movers = [];
    
    for (const symbol of symbols) {
      // Fetch actual data from database if exists
      const latestData = await MarketData.find({ symbol })
        .sort({ timestamp: -1 })
        .limit(2)
        .lean()
        .exec();
      
      let change;
      if (latestData && latestData.length >= 2) {
        // Calculate real change based on actual data
        const current = latestData[0].close;
        const previous = latestData[1].close;
        change = ((current - previous) / previous) * 100;
      } else {
        // Simulate change if no data exists
        // More realistic distribution: mostly small changes, occasionally large ones
        const isLargeMove = Math.random() < 0.2; // 20% chance of large move
        const direction = Math.random() < 0.5 ? -1 : 1;
        
        if (isLargeMove) {
          change = direction * (2 + Math.random() * 8); // 2-10% move
        } else {
          change = direction * Math.random() * 2; // 0-2% move
        }
      }
      
      movers.push({
        symbol,
        change: parseFloat(change.toFixed(2))
      });
    }
    
    // Sort by absolute change value (largest moves first)
    movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return movers.slice(0, limit);
  } catch (error) {
    logger.error(`Error fetching top movers: ${error.message}`);
    return [];
  }
}

/**
 * Search symbols with improved matching
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching symbols
 */
async function searchSymbols(query) {
  try {
    // Validate input
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query provided');
    }
    
    const symbols = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'WMT', name: 'Walmart Inc.' },
      { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF' }
    ];
    
    const normalized = query.toLowerCase().trim();
    
    // Enhanced search: match against symbol or name
    return symbols
      .filter(item => 
        item.symbol.toLowerCase().includes(normalized) || 
        item.name.toLowerCase().includes(normalized)
      )
      .slice(0, 10); // Limit to 10 results for performance
  } catch (error) {
    logger.error(`Error searching symbols: ${error.message}`);
    return [];
  }
}

/**
 * Get news for a symbol (placeholder function)
 * @param {string} symbol - Stock symbol
 * @param {number} limit - Number of news items
 * @returns {Promise<Array>} - Array of news items
 */
async function getSymbolNews(symbol, limit = 5) {
  try {
    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    if (!limit || limit <= 0 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }
    
    // In a real implementation, this would fetch from a news API
    // For now, return simulated news with realistic timestamps
    const now = new Date();
    const news = [];
    
    // News templates for different types of updates
    const templates = [
      { type: 'earnings', title: '{SYMBOL} Reports {BEAT_MISS} Earnings Expectations' },
      { type: 'analyst', title: 'Analyst {UPGRADES_DOWNGRADES} {SYMBOL} to {RATING}' },
      { type: 'product', title: '{SYMBOL} Announces New {PRODUCT_TYPE}' },
      { type: 'market', title: '{SYMBOL} {GAINS_DROPS} on {MARKET_CONDITION}' },
      { type: 'general', title: '{SYMBOL} {ANNOUNCES_CONFIRMS} {EVENT_TYPE}' }
    ];
    
    // Date formatter for readable dates
    const formatDate = (date) => {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit' 
      });
    };
    
    for (let i = 0; i < limit; i++) {
      // Generate a news item with decreasing recency
      const hoursAgo = Math.floor(Math.pow(i, 1.5)); // Non-linear time distribution
      const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      
      // Select a random template
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Fill in template placeholders based on type
      let title = template.title;
      
      if (template.type === 'earnings') {
        const beatMiss = Math.random() > 0.5 ? 'Beats' : 'Misses';
        title = title.replace('{SYMBOL}', symbol).replace('{BEAT_MISS}', beatMiss);
      } else if (template.type === 'analyst') {
        const action = Math.random() > 0.5 ? 'Upgrades' : 'Downgrades';
        const ratings = ['Buy', 'Overweight', 'Hold', 'Underweight', 'Sell'];
        const rating = ratings[Math.floor(Math.random() * ratings.length)];
        title = title.replace('{SYMBOL}', symbol)
                     .replace('{UPGRADES_DOWNGRADES}', action)
                     .replace('{RATING}', rating);
      } else if (template.type === 'product') {
        const products = ['Product', 'Service', 'Initiative', 'Partnership', 'Technology'];
        const product = products[Math.floor(Math.random() * products.length)];
        title = title.replace('{SYMBOL}', symbol).replace('{PRODUCT_TYPE}', product);
      } else if (template.type === 'market') {
        const action = Math.random() > 0.5 ? 'Gains' : 'Drops';
        const conditions = [
          'Market Volatility', 
          'Positive Economic Data', 
          'Interest Rate Concerns',
          'Sector Rotation',
          'Earnings Season'
        ];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        title = title.replace('{SYMBOL}', symbol)
                     .replace('{GAINS_DROPS}', action)
                     .replace('{MARKET_CONDITION}', condition);
      } else if (template.type === 'general') {
        const action = Math.random() > 0.5 ? 'Announces' : 'Confirms';
        const events = [
          'Leadership Change', 
          'Strategic Review', 
          'Share Buyback Program',
          'Dividend Increase',
          'International Expansion'
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        title = title.replace('{SYMBOL}', symbol)
                     .replace('{ANNOUNCES_CONFIRMS}', action)
                     .replace('{EVENT_TYPE}', event);
      }
      
      news.push({
        id: `news-${symbol.toLowerCase()}-${i}`,
        symbol,
        title,
        source: ['Bloomberg', 'CNBC', 'Reuters', 'Wall Street Journal', 'Financial Times'][Math.floor(Math.random() * 5)],
        url: '#', // Placeholder URL
        timestamp,
        date: formatDate(timestamp)
      });
    }
    
    return news;
  } catch (error) {
    logger.error(`Error fetching news: ${error.message}`);
    return [];
  }
}

/**
 * Get market alerts for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} - Array of alerts
 */
async function getMarketAlerts(symbol = 'SPY') {
  try {
    // Validate input
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol provided');
    }
    
    // Fetch recent market data for analysis
    const marketData = await getLatestMarketData(symbol, 50);
    
    if (!marketData || marketData.length === 0) {
      return [];
    }
    
    const alerts = [];
    
    // Price movement alert
    const latestPrice = marketData[marketData.length - 1].close;
    const prevPrice = marketData[marketData.length - 2]?.close || latestPrice;
    const priceChange = (latestPrice - prevPrice) / prevPrice;
    
    if (Math.abs(priceChange) > 0.01) { // 1% threshold
      alerts.push(`Significant price movement: ${(priceChange * 100).toFixed(2)}% in the last period`);
    }
    
    // Volume spike alert
    const latestVolume = marketData[marketData.length - 1].volume;
    const avgVolume = marketData.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10;
    
    if (latestVolume > avgVolume * 1.5) { // 50% above average
      alerts.push(`Unusual volume detected: ${(latestVolume / avgVolume).toFixed(1)}x average`);
    }
    
    // Price consolidation alert
    const recentHigh = Math.max(...marketData.slice(-10).map(d => d.high));
    const recentLow = Math.min(...marketData.slice(-10).map(d => d.low));
    const recentRange = (recentHigh - recentLow) / recentLow;
    
    if (recentRange < 0.005) { // 0.5% range
      alerts.push(`Price consolidation detected: ${(recentRange * 100).toFixed(2)}% range over last 10 periods`);
    }
    
    // Calculate simple moving averages
    const calcSMA = (data, periods) => {
      const closes = data.map(d => d.close);
      return closes.slice(-periods).reduce((sum, price) => sum + price, 0) / periods;
    };
    
    // MA crossover alerts
    if (marketData.length >= 50) {
      const sma20Today = calcSMA(marketData, 20);
      const sma50Today = calcSMA(marketData, 50);
      
      // Calculate yesterday's SMAs
      const yesterdayData = marketData.slice(0, -1);
      const sma20Yesterday = calcSMA(yesterdayData, 20);
      const sma50Yesterday = calcSMA(yesterdayData, 50);
      
      // Check for crossovers
      if (sma20Yesterday < sma50Yesterday && sma20Today > sma50Today) {
        alerts.push(`Bullish signal: 20-period SMA crossed above 50-period SMA`);
      } else if (sma20Yesterday > sma50Yesterday && sma20Today < sma50Today) {
        alerts.push(`Bearish signal: 20-period SMA crossed below 50-period SMA`);
      }
    }
    
    return alerts;
  } catch (error) {
    logger.error(`Error generating alerts: ${error.message}`);
    return [];
  }
}

module.exports = {
  getLatestMarketData,
  fetchMarketData,
  fetchHistoricalData,
  getMarketSummary,
  fetchTopMovers,
  searchSymbols,
  getSymbolNews,
  getMarketAlerts
};