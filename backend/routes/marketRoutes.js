// marketRoutes.js - Enhanced with better error handling, validation, and caching
const express = require('express');
const router = express.Router();
const { 
  getLatestMarketData,
  fetchHistoricalData,
  fetchTopMovers,
  getMarketSummary,
  searchSymbols,
  getSymbolNews
} = require('../services/marketDataService');
const NodeCache = require('node-cache');
const { check, query, validationResult } = require('express-validator');

// Initialize cache with 5 minute default TTL
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 1 minute
  useClones: false // Don't clone data when returning from cache for performance
});

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds
 */
const cacheMiddleware = (ttl = 300) => (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Create a cache key from the URL and query params
  const cacheKey = `${req.originalUrl || req.url}`;
  
  // Try to get data from cache
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    // Add cache hit header for debugging
    res.set('X-Cache', 'HIT');
    return res.json(cachedData);
  }
  
  // Add method to save response to cache
  res.sendWithCache = (data) => {
    cache.set(cacheKey, data, ttl);
    res.set('X-Cache', 'MISS');
    res.json(data);
  };
  
  next();
};

/**
 * Invalidate specific cache entries
 * @param {string} pattern - Pattern to match cache keys
 */
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  
  if (matchingKeys.length > 0) {
    matchingKeys.forEach(key => cache.del(key));
    console.log(`Invalidated ${matchingKeys.length} cache entries for pattern: ${pattern}`);
  }
};

/**
 * Utility to handle common API error patterns
 * @param {Function} asyncFn - Async function to execute
 */
const asyncHandler = (asyncFn) => (req, res, next) => {
  return Promise.resolve(asyncFn(req, res, next))
    .catch(error => {
      console.error(`Error in ${req.method} ${req.originalUrl}:`, error);
      
      // Handle different error types
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.message
        });
      }
      
      if (error.name === 'MongoError' && error.code === 11000) {
        return res.status(409).json({ 
          error: 'Duplicate key error', 
          details: error.message 
        });
      }
      
      return res.status(500).json({ 
        error: 'Server error', 
        message: error.message 
      });
    });
};

// Validation chains
const symbolValidation = [
  query('symbol')
    .optional()
    .isString()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Za-z0-9.]{1,10}$/)
    .withMessage('Symbol must be 1-10 alphanumeric characters'),
];

const limitValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500')
    .toInt(),
];

const periodValidation = [
  query('period')
    .optional()
    .isIn(['1d', '1w', '1m', '3m', '6m', '1y'])
    .withMessage('Period must be one of: 1d, 1w, 1m, 3m, 6m, 1y'),
];

const searchValidation = [
  query('query')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query is required and must be between 1-50 characters'),
];

// Process validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: errors.array() 
    });
  }
  next();
};

// Get latest market data - with caching for 30 seconds
router.get(
  '/', 
  [...symbolValidation, ...limitValidation], 
  validate,
  cacheMiddleware(30),
  asyncHandler(async (req, res) => {
    const { symbol = 'SPY', limit = 100 } = req.query;
    const data = await getLatestMarketData(symbol, parseInt(limit));
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No market data found' });
    }
    
    // Use the sendWithCache method added by middleware
    res.sendWithCache(data);
  })
);

// Get historical data - caching for longer (5 minutes)
router.get(
  '/historical', 
  [...symbolValidation, ...periodValidation], 
  validate,
  cacheMiddleware(300),
  asyncHandler(async (req, res) => {
    const { symbol = 'SPY', period = '1m' } = req.query;
    const data = await fetchHistoricalData(symbol, period);
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No historical data found' });
    }
    
    res.sendWithCache(data);
  })
);

// Get market summary - caching for 1 minute
router.get(
  '/summary', 
  cacheMiddleware(60),
  asyncHandler(async (req, res) => {
    const summary = await getMarketSummary();
    
    if (!summary || Object.keys(summary).length === 0) {
      return res.status(404).json({ error: 'Market summary data not available' });
    }
    
    // Add timestamp if not present
    if (!summary.timestamp) {
      summary.timestamp = new Date();
    }
    
    res.sendWithCache(summary);
  })
);

// Get top market movers - caching for 1 minute
router.get(
  '/top-movers', 
  limitValidation, 
  validate,
  cacheMiddleware(60),
  asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;
    const movers = await fetchTopMovers(parseInt(limit));
    
    if (!movers || movers.length === 0) {
      return res.status(404).json({ error: 'No market movers data available' });
    }
    
    const result = {
      movers,
      timestamp: new Date()
    };
    
    res.sendWithCache(result);
  })
);

// Search for symbols - caching for 1 hour
router.get(
  '/search', 
  searchValidation, 
  validate,
  cacheMiddleware(3600),
  asyncHandler(async (req, res) => {
    const { query } = req.query;
    
    const results = await searchSymbols(query);
    
    const response = {
      query,
      results,
      timestamp: new Date()
    };
    
    res.sendWithCache(response);
  })
);

// Get news for a symbol - caching for 5 minutes
router.get(
  '/news', 
  [...symbolValidation, limitValidation], 
  validate,
  cacheMiddleware(300),
  asyncHandler(async (req, res) => {
    const { symbol = 'SPY', limit = 5 } = req.query;
    const news = await getSymbolNews(symbol, parseInt(limit));
    
    const response = {
      symbol,
      news,
      timestamp: new Date()
    };
    
    res.sendWithCache(response);
  })
);

// Invalidate cache for a symbol (useful after data updates)
router.post(
  '/invalidate-cache',
  [check('symbol').isString().isLength({ min: 1, max: 10 })],
  validate,
  asyncHandler(async (req, res) => {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // Invalidate all cache entries for this symbol
    invalidateCache(symbol);
    
    res.json({ 
      message: `Cache invalidated for symbol: ${symbol}`,
      timestamp: new Date()
    });
  })
);

// New endpoint: Compare multiple symbols
router.get(
  '/compare', 
  [
    query('symbols')
      .isString()
      .withMessage('Symbols parameter is required')
      .customSanitizer(value => value.split(','))
      .custom(symbols => {
        if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
          throw new Error('At least 2 symbols are required for comparison');
        }
        if (symbols.length > 5) {
          throw new Error('Maximum 5 symbols can be compared at once');
        }
        return symbols;
      }),
    query('period')
      .optional()
      .isIn(['1d', '1w', '1m'])
      .withMessage('Period must be one of: 1d, 1w, 1m')
  ],
  validate,
  cacheMiddleware(300),
  asyncHandler(async (req, res) => {
    const { symbols, period = '1w' } = req.query;
    
    // Fetch data for all symbols in parallel
    const promises = symbols.map(symbol => fetchHistoricalData(symbol, period));
    const results = await Promise.all(promises);
    
    // Format the response
    const comparisonData = {};
    
    // Process each symbol's data
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const data = results[i];
      
      if (!data || data.length === 0) {
        comparisonData[symbol] = { error: 'No data available' };
        continue;
      }
      
      // Calculate percentage change from first point
      const firstPrice = data[0].close;
      const priceChanges = data.map(point => ({
        timestamp: point.timestamp,
        close: point.close,
        percentChange: ((point.close - firstPrice) / firstPrice) * 100
      }));
      
      // Calculate summary stats
      const latestPrice = data[data.length - 1].close;
      const periodChange = ((latestPrice - firstPrice) / firstPrice) * 100;
      
      comparisonData[symbol] = {
        firstPrice,
        latestPrice,
        periodChange,
        dataPoints: priceChanges
      };
    }
    
    const response = {
      symbols,
      period,
      comparison: comparisonData,
      timestamp: new Date()
    };
    
    res.sendWithCache(response);
  })
);

// New endpoint: Get intraday OHLC data (for candlestick charts)
router.get(
  '/ohlc', 
  [...symbolValidation, limitValidation], 
  validate,
  cacheMiddleware(60),
  asyncHandler(async (req, res) => {
    const { symbol = 'SPY', limit = 100 } = req.query;
    const rawData = await getLatestMarketData(symbol, parseInt(limit));
    
    if (!rawData || rawData.length === 0) {
      return res.status(404).json({ error: 'No market data found' });
    }
    
    // Format for candlestick charting
    const ohlcData = rawData.map(item => ({
      time: new Date(item.timestamp).toISOString(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));
    
    const response = {
      symbol,
      ohlc: ohlcData,
      timestamp: new Date()
    };
    
    res.sendWithCache(response);
  })
);

// Export the router and cache for use in tests
module.exports = router;