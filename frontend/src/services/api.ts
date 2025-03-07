import { MarketDataItem, Prediction, TopMover, Sentiment, TradingMetrics } from '../types';

// Mock API for development
// In a real app, this would use axios or fetch to call your backend API

// Create a mock API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Mock market data generator
const generateMockMarketData = (symbol: string, count: number): MarketDataItem[] => {
  const basePrice = symbol === 'SPY' ? 450 : 
                   symbol === 'AAPL' ? 180 :
                   symbol === 'MSFT' ? 350 :
                   symbol === 'GOOGL' ? 140 :
                   symbol === 'AMZN' ? 175 : 100;
  
  return Array.from({ length: count }).map((_, index) => ({
    time: new Date(Date.now() - (count - index) * 5 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: basePrice + Math.sin(index / 3) * 5 + Math.random() * 2,
    volume: 50000 + Math.random() * 20000
  }));
};

// Mock OHLC data generator
const generateMockOHLCData = (symbol: string, count: number) => {
  const basePrice = symbol === 'SPY' ? 450 : 
                   symbol === 'AAPL' ? 180 :
                   symbol === 'MSFT' ? 350 :
                   symbol === 'GOOGL' ? 140 :
                   symbol === 'AMZN' ? 175 : 100;
  
  const ohlcData = Array.from({ length: count }).map((_, index) => {
    const time = new Date(Date.now() - (count - index) * 5 * 60000).toISOString();
    const open = basePrice + Math.sin(index / 3) * 5 + Math.random() * 2;
    const high = open + Math.random() * 2;
    const low = open - Math.random() * 2;
    const close = (open + high + low) / 3;
    const volume = 50000 + Math.random() * 20000;
    
    return {
      time,
      open,
      high,
      low,
      close,
      volume
    };
  });
  
  return {
    symbol,
    ohlc: ohlcData,
    timestamp: new Date().toISOString()
  };
};

// API service methods
export const fetchMarketData = async (symbol = 'SPY'): Promise<MarketDataItem[]> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return generateMockMarketData(symbol, 20);
};

export const fetchPredictions = async (symbol = 'SPY'): Promise<Prediction[]> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const currentPrice = (generateMockMarketData(symbol, 1)[0]).price;
  
  return [
    { time: '15min', price: currentPrice * (1 + (Math.random() * 0.005)) },
    { time: '30min', price: currentPrice * (1 + (Math.random() * 0.01)) },
    { time: '60min', price: currentPrice * (1 + (Math.random() * 0.015)) }
  ];
};

export const fetchSentiment = async (symbol = 'SPY'): Promise<Sentiment> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const random = Math.random();
  if (random > 0.8) return 'Bullish';
  if (random > 0.6) return 'Slightly Bullish';
  if (random > 0.4) return 'Neutral';
  if (random > 0.2) return 'Slightly Bearish';
  return 'Bearish';
};

export const fetchTopMovers = async (): Promise<TopMover[]> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    { symbol: 'AAPL', change: 2.5 + (Math.random() - 0.5) },
    { symbol: 'MSFT', change: 1.8 + (Math.random() - 0.5) },
    { symbol: 'GOOGL', change: -1.2 + (Math.random() - 0.5) },
    { symbol: 'AMZN', change: 0.9 + (Math.random() - 0.5) },
    { symbol: 'TSLA', change: -3.2 + (Math.random() - 0.5) }
  ];
};

export const fetchTradingMetrics = async (symbol = 'SPY'): Promise<TradingMetrics> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const basePrice = symbol === 'SPY' ? 450 : 
                   symbol === 'AAPL' ? 180 :
                   symbol === 'MSFT' ? 350 :
                   symbol === 'GOOGL' ? 140 :
                   symbol === 'AMZN' ? 175 : 100;
  
  return {
    high52w: basePrice * 1.15,
    low52w: basePrice * 0.85,
    avgVolume: Math.floor(Math.random() * 10) + '.' + Math.floor(Math.random() * 10) + 'M',
    volatility: 10 + Math.random() * 10
  };
};

export const fetchAlerts = async (symbol = 'SPY'): Promise<string[]> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const alerts = [
    'Unusual volume detected: 2.3x average',
    'RSI indicates overbought conditions',
    'MACD bullish crossover detected',
    '20-day MA crossed above 50-day MA',
    'Price approaching 52-week high',
    'Bollinger band squeeze detected'
  ];
  
  // Return 1-3 random alerts
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...alerts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getOHLCData = async (symbol = 'SPY'): Promise<any> => {
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return generateMockOHLCData(symbol, 50);
};

// Export a mock api object for compatibility
export const api = {
  get: async (url: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { data: {} };
  },
  post: async (url: string, data: any) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { data: {} };
  }
};