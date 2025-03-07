// analysisRoutes.js - Enhanced with better error handling, validation, and analysis methods
const express = require('express');
const router = express.Router();
const { getLatestMarketData, getMarketAlerts } = require('../services/marketDataService');

/**
 * Validate common request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRequest = (req, res, next) => {
  const { symbol } = req.query;
  
  if (symbol && (typeof symbol !== 'string' || !symbol.match(/^[A-Za-z0-9.]{1,10}$/))) {
    return res.status(400).json({ 
      error: 'Invalid symbol format', 
      message: 'Symbol must be 1-10 alphanumeric characters' 
    });
  }
  
  next();
};

/**
 * Calculate technical indicators for market data
 * @param {Array} marketData - Array of market data points
 * @returns {Object} - Object with calculated indicators
 */
const calculateIndicators = (marketData) => {
  if (!marketData || marketData.length === 0) {
    return {};
  }

  // Extract prices and volumes
  const closes = marketData.map(d => d.close);
  const highs = marketData.map(d => d.high);
  const lows = marketData.map(d => d.low);
  const volumes = marketData.map(d => d.volume);
  
  // Calculate Simple Moving Averages
  const calculateSMA = (data, periods) => {
    if (data.length < periods) return null;
    
    const result = [];
    for (let i = periods - 1; i < data.length; i++) {
      const sum = data.slice(i - periods + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / periods);
    }
    return result;
  };
  
  // Calculate Exponential Moving Average
  const calculateEMA = (data, periods) => {
    if (data.length < periods) return null;
    
    const k = 2 / (periods + 1);
    
    // First EMA is SMA
    let ema = data.slice(0, periods).reduce((a, b) => a + b, 0) / periods;
    
    const result = [ema];
    
    // Calculate EMA for remaining data points
    for (let i = periods; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result.push(ema);
    }
    
    return result;
  };
  
  // Calculate Relative Strength Index
  const calculateRSI = (data, periods = 14) => {
    if (data.length <= periods) return null;
    
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }
    
    const result = [];
    
    for (let i = periods; i < changes.length; i++) {
      const window = changes.slice(i - periods, i);
      
      let gains = 0;
      let losses = 0;
      
      window.forEach(change => {
        if (change > 0) gains += change;
        else losses -= change;
      });
      
      const avgGain = gains / periods;
      const avgLoss = losses / periods;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    
    return result;
  };
  
  // Calculate MACD
  const calculateMACD = (data, fast = 12, slow = 26, signal = 9) => {
    if (data.length < Math.max(fast, slow) + signal) return null;
    
    const emaFast = calculateEMA(data, fast);
    const emaSlow = calculateEMA(data, slow);
    
    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < emaFast.length; i++) {
      if (i >= emaSlow.length - emaFast.length) {
        macdLine.push(emaFast[i] - emaSlow[i - (emaSlow.length - emaFast.length)]);
      }
    }
    
    // Calculate signal line
    const signalLine = calculateEMA(macdLine, signal);
    
    // Calculate histogram
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
    }
    
    return {
      macdLine,
      signalLine,
      histogram
    };
  };
  
  // Calculate indicators
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  
  // Get the latest values
  const getLatestValue = (arr) => arr ? arr[arr.length - 1] : null;
  
  // Return calculated indicators
  return {
    sma20: getLatestValue(sma20),
    sma50: getLatestValue(sma50),
    ema12: getLatestValue(ema12),
    ema26: getLatestValue(ema26),
    rsi: getLatestValue(rsi),
    macd: {
      line: getLatestValue(macd?.macdLine),
      signal: getLatestValue(macd?.signalLine),
      histogram: getLatestValue(macd?.histogram)
    }
  };
};

// Get market sentiment with enhanced analysis
router.get('/sentiment', validateRequest, async (req, res) => {
  try {
    const { symbol = 'SPY' } = req.query;
    
    // Fetch sufficient market data to analyze
    const marketData = await getLatestMarketData(symbol, 50);
    
    if (!marketData || marketData.length === 0) {
      return res.status(404).json({ error: 'No market data available for sentiment analysis' });
    }
    
    // Calculate technical indicators
    const indicators = calculateIndicators(marketData);
    
    // More sophisticated sentiment analysis using multiple indicators
    let sentimentScore = 0;
    let signals = [];
    
    // RSI analysis (0-100 scale)
    if (indicators.rsi !== null) {
      if (indicators.rsi < 30) {
        sentimentScore += 1; // Oversold (bullish)
        signals.push({ indicator: 'RSI', signal: 'Bullish', value: indicators.rsi.toFixed(2), interpretation: 'Oversold' });
      } else if (indicators.rsi > 70) {
        sentimentScore -= 1; // Overbought (bearish)
        signals.push({ indicator: 'RSI', signal: 'Bearish', value: indicators.rsi.toFixed(2), interpretation: 'Overbought' });
      } else if (indicators.rsi > 50) {
        sentimentScore += 0.2; // Slight bullish bias
        signals.push({ indicator: 'RSI', signal: 'Neutral-Bullish', value: indicators.rsi.toFixed(2), interpretation: 'Above center line' });
      } else {
        sentimentScore -= 0.2; // Slight bearish bias
        signals.push({ indicator: 'RSI', signal: 'Neutral-Bearish', value: indicators.rsi.toFixed(2), interpretation: 'Below center line' });
      }
    }
    
    // MACD analysis
    if (indicators.macd.line !== null && indicators.macd.signal !== null) {
      if (indicators.macd.line > indicators.macd.signal) {
        sentimentScore += 0.75; // Bullish signal
        signals.push({ indicator: 'MACD', signal: 'Bullish', value: 'Line > Signal', interpretation: 'Bullish momentum' });
      } else {
        sentimentScore -= 0.75; // Bearish signal
        signals.push({ indicator: 'MACD', signal: 'Bearish', value: 'Line < Signal', interpretation: 'Bearish momentum' });
      }
      
      // Histogram analysis for momentum
      if (indicators.macd.histogram !== null) {
        if (indicators.macd.histogram > 0 && indicators.macd.histogram > marketData[marketData.length - 2].macd?.histogram) {
          sentimentScore += 0.5; // Increasing positive histogram (strong bullish)
          signals.push({ indicator: 'MACD Histogram', signal: 'Bullish', value: 'Increasing Positive', interpretation: 'Strong bullish momentum' });
        } else if (indicators.macd.histogram < 0 && indicators.macd.histogram < marketData[marketData.length - 2].macd?.histogram) {
          sentimentScore -= 0.5; // Decreasing negative histogram (strong bearish)
          signals.push({ indicator: 'MACD Histogram', signal: 'Bearish', value: 'Decreasing Negative', interpretation: 'Strong bearish momentum' });
        }
      }
    }
    
    // Moving average analysis
    if (indicators.sma20 !== null && indicators.sma50 !== null) {
      if (indicators.sma20 > indicators.sma50) {
        sentimentScore += 0.75; // Bullish trend
        signals.push({ indicator: 'Moving Averages', signal: 'Bullish', value: 'SMA20 > SMA50', interpretation: 'Uptrend' });
      } else {
        sentimentScore -= 0.75; // Bearish trend
        signals.push({ indicator: 'Moving Averages', signal: 'Bearish', value: 'SMA20 < SMA50', interpretation: 'Downtrend' });
      }
    }
    
    // Price action analysis
    const latestPrice = marketData[marketData.length - 1].close;
    const prevClose = marketData[marketData.length - 2]?.close || latestPrice;
    const priceChange = (latestPrice - prevClose) / prevClose;
    
    if (priceChange > 0.01) {
      sentimentScore += 0.5; // Strong positive day
      signals.push({ indicator: 'Price Action', signal: 'Bullish', value: `${(priceChange * 100).toFixed(2)}%`, interpretation: 'Strong positive move' });
    } else if (priceChange < -0.01) {
      sentimentScore -= 0.5; // Strong negative day
      signals.push({ indicator: 'Price Action', signal: 'Bearish', value: `${(priceChange * 100).toFixed(2)}%`, interpretation: 'Strong negative move' });
    }
    
    // Volume analysis
    const latestVolume = marketData[marketData.length - 1].volume;
    const avgVolume = marketData.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10;
    const volumeRatio = latestVolume / avgVolume;
    
    if (volumeRatio > 1.5 && priceChange > 0) {
      sentimentScore += 0.5; // High volume with price up (strong bullish)
      signals.push({ indicator: 'Volume', signal: 'Bullish', value: `${volumeRatio.toFixed(2)}x avg`, interpretation: 'High volume on up day' });
    } else if (volumeRatio > 1.5 && priceChange < 0) {
      sentimentScore -= 0.5; // High volume with price down (strong bearish)
      signals.push({ indicator: 'Volume', signal: 'Bearish', value: `${volumeRatio.toFixed(2)}x avg`, interpretation: 'High volume on down day' });
    }
    
    // Determine sentiment based on score
    let sentiment;
    if (sentimentScore < -2) sentiment = 'Bearish';
    else if (sentimentScore < -0.5) sentiment = 'Slightly Bearish';
    else if (sentimentScore < 0.5) sentiment = 'Neutral';
    else if (sentimentScore < 2) sentiment = 'Slightly Bullish';
    else sentiment = 'Bullish';
    
    // Normalize score to a reasonable range (-100 to 100)
    const normalizedScore = Math.max(-100, Math.min(100, sentimentScore * 25));
    
    res.json({ 
      symbol,
      sentiment,
      score: Math.round(normalizedScore),
      signals,
      timestamp: new Date(),
      technicalIndicators: indicators
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment', message: error.message });
  }
});

// Get enhanced trading metrics
router.get('/metrics', validateRequest, async (req, res) => {
  try {
    const { symbol = 'SPY' } = req.query;
    
    // Fetch sufficient market data for metrics calculation
    const marketData = await getLatestMarketData(symbol, 500);
    
    if (!marketData || marketData.length === 0) {
      return res.status(404).json({ error: 'No market data available for metrics calculation' });
    }
    
    // Calculate 52-week high and low (assuming 252 trading days in a year)
    const tradingDaysPerYear = 252;
    const dataPointsPerDay = 78; // Assuming 5-min intervals in 6.5 hour trading day
    const annually = Math.min(marketData.length, tradingDaysPerYear * dataPointsPerDay);
    
    const last52Weeks = marketData.slice(-annually);
    const high52w = Math.max(...last52Weeks.map(d => d.high));
    const low52w = Math.min(...last52Weeks.map(d => d.low));
    
    // Current price
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Distance from 52-week high/low as percentage
    const distFromHigh = ((high52w - currentPrice) / high52w) * 100;
    const distFromLow = ((currentPrice - low52w) / low52w) * 100;
    
    // Calculate average volume with proper formatting
    const avgVolume = (last52Weeks.reduce((sum, d) => sum + d.volume, 0) / last52Weeks.length).toFixed(0);
    const formattedAvgVolume = avgVolume > 1000000 
      ? (avgVolume / 1000000).toFixed(1) + 'M' 
      : (avgVolume / 1000).toFixed(1) + 'K';
    
    // Calculate volatility (standard deviation of daily returns)
    const returns = [];
    for (let i = 1; i < last52Weeks.length; i++) {
      returns.push((last52Weeks[i].close - last52Weeks[i-1].close) / last52Weeks[i-1].close);
    }
    
    // Annualized volatility calculation
    const dailyStdDev = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    const annualizedVol = dailyStdDev * Math.sqrt(252); // Scale to annual (252 trading days)
    
    // Calculate beta against market (if SPY, use market beta of 1)
    let beta = 1;
    if (symbol !== 'SPY') {
      try {
        const marketData = await getLatestMarketData('SPY', annually);
        if (marketData && marketData.length > 0) {
          const marketReturns = [];
          for (let i = 1; i < marketData.length; i++) {
            marketReturns.push((marketData[i].close - marketData[i-1].close) / marketData[i-1].close);
          }
          
          // Match lengths
          const minLength = Math.min(returns.length, marketReturns.length);
          const stockReturnsSubset = returns.slice(-minLength);
          const marketReturnsSubset = marketReturns.slice(-minLength);
          
          // Calculate covariance and variance
          const stockMean = stockReturnsSubset.reduce((sum, r) => sum + r, 0) / minLength;
          const marketMean = marketReturnsSubset.reduce((sum, r) => sum + r, 0) / minLength;
          
          let covariance = 0;
          let marketVariance = 0;
          
          for (let i = 0; i < minLength; i++) {
            covariance += (stockReturnsSubset[i] - stockMean) * (marketReturnsSubset[i] - marketMean);
            marketVariance += Math.pow(marketReturnsSubset[i] - marketMean, 2);
          }
          
          covariance /= minLength;
          marketVariance /= minLength;
          
          beta = covariance / marketVariance;
        }
      } catch (error) {
        console.error(`Error calculating beta for ${symbol}:`, error);
        // Fall back to default beta of 1
      }
    }
    
    // Calculate moving averages
    const ma50 = marketData.slice(-50).reduce((sum, d) => sum + d.close, 0) / 50;
    const ma200 = marketData.slice(-Math.min(200, marketData.length)).reduce((sum, d) => sum + d.close, 0) / Math.min(200, marketData.length);
    
    // Calculate relative strength
    const periodReturns = {
      day: ((currentPrice / marketData[Math.max(0, marketData.length - dataPointsPerDay)].close) - 1) * 100,
      week: ((currentPrice / marketData[Math.max(0, marketData.length - 5 * dataPointsPerDay)].close) - 1) * 100,
      month: ((currentPrice / marketData[Math.max(0, marketData.length - 22 * dataPointsPerDay)].close) - 1) * 100
    };
    
    res.json({
      symbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      high52w: parseFloat(high52w.toFixed(2)),
      low52w: parseFloat(low52w.toFixed(2)),
      distFromHigh: parseFloat(distFromHigh.toFixed(1)),
      distFromLow: parseFloat(distFromLow.toFixed(1)),
      avgVolume: formattedAvgVolume,
      volatility: parseFloat((annualizedVol * 100).toFixed(1)),
      beta: parseFloat(beta.toFixed(2)),
      ma50: parseFloat(ma50.toFixed(2)),
      ma200: parseFloat(ma200.toFixed(2)),
      periodReturns,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: 'Failed to calculate metrics', message: error.message });
  }
});

// Get market alerts with enhanced detection
router.get('/alerts', validateRequest, async (req, res) => {
  try {
    const { symbol = 'SPY' } = req.query;
    
    // Use the enhanced market alerts service function
    const alerts = await getMarketAlerts(symbol);
    
    res.json({
      symbol,
      alerts,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error generating alerts:', error);
    res.status(500).json({ error: 'Failed to generate alerts', message: error.message });
  }
});

// New endpoint: Technical Analysis
router.get('/technical', validateRequest, async (req, res) => {
  try {
    const { symbol = 'SPY' } = req.query;
    
    // Fetch market data
    const marketData = await getLatestMarketData(symbol, 200);
    
    if (!marketData || marketData.length === 0) {
      return res.status(404).json({ error: 'No market data available for technical analysis' });
    }
    
    // Calculate indicators
    const indicators = calculateIndicators(marketData);
    
    // Generate analysis based on indicators
    const analysis = [];
    
    // SMA analysis
    if (indicators.sma20 !== null && indicators.sma50 !== null) {
      if (indicators.sma20 > indicators.sma50) {
        analysis.push({
          indicator: 'SMA Crossover',
          signal: 'Bullish',
          interpretation: 'Price above key moving averages indicates an uptrend',
          values: {
            sma20: indicators.sma20.toFixed(2),
            sma50: indicators.sma50.toFixed(2)
          }
        });
      } else {
        analysis.push({
          indicator: 'SMA Crossover',
          signal: 'Bearish',
          interpretation: 'Price below key moving averages indicates a downtrend',
          values: {
            sma20: indicators.sma20.toFixed(2),
            sma50: indicators.sma50.toFixed(2)
          }
        });
      }
    }
    
    // RSI analysis
    if (indicators.rsi !== null) {
      let rsiSignal, rsiInterpretation;
      
      if (indicators.rsi < 30) {
        rsiSignal = 'Bullish';
        rsiInterpretation = 'Oversold condition, potential buying opportunity';
      } else if (indicators.rsi > 70) {
        rsiSignal = 'Bearish';
        rsiInterpretation = 'Overbought condition, potential selling opportunity';
      } else if (indicators.rsi > 50) {
        rsiSignal = 'Neutral-Bullish';
        rsiInterpretation = 'RSI above centerline, potential upward momentum';
      } else {
        rsiSignal = 'Neutral-Bearish';
        rsiInterpretation = 'RSI below centerline, potential downward momentum';
      }
      
      analysis.push({
        indicator: 'RSI',
        signal: rsiSignal,
        interpretation: rsiInterpretation,
        values: {
          rsi: indicators.rsi.toFixed(2)
        }
      });
    }
    
    // MACD analysis
    if (indicators.macd.line !== null && indicators.macd.signal !== null) {
      let macdSignal, macdInterpretation;
      
      if (indicators.macd.line > indicators.macd.signal) {
        macdSignal = 'Bullish';
        macdInterpretation = 'MACD line above signal line, indicating bullish momentum';
      } else {
        macdSignal = 'Bearish';
        macdInterpretation = 'MACD line below signal line, indicating bearish momentum';
      }
      
      analysis.push({
        indicator: 'MACD',
        signal: macdSignal,
        interpretation: macdInterpretation,
        values: {
          macd: indicators.macd.line.toFixed(2),
          signal: indicators.macd.signal.toFixed(2),
          histogram: indicators.macd.histogram.toFixed(2)
        }
      });
    }
    
    res.json({
      symbol,
      analysis,
      indicators,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error performing technical analysis:', error);
    res.status(500).json({ error: 'Failed to perform technical analysis', message: error.message });
  }
});

module.exports = router;