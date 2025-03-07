import { useState, useEffect, useCallback } from 'react';
import { MarketDataItem, Prediction, TopMover, Sentiment, TradingMetrics } from '../types';

// Mock data for development
const mockMarketData: MarketDataItem[] = Array.from({ length: 20 }).map((_, index) => ({
  time: new Date(Date.now() - (20 - index) * 5 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  price: 450 + Math.sin(index / 3) * 5 + Math.random() * 2,
  volume: 50000 + Math.random() * 20000
}));

const mockPredictions: Prediction[] = [
  { time: '15min', price: 455.75 },
  { time: '30min', price: 456.50 },
  { time: '60min', price: 458.25 }
];

const mockTopMovers: TopMover[] = [
  { symbol: 'AAPL', change: 2.5 },
  { symbol: 'MSFT', change: 1.8 },
  { symbol: 'GOOGL', change: -1.2 },
  { symbol: 'AMZN', change: 0.9 },
  { symbol: 'TSLA', change: -3.2 }
];

const mockAlerts: string[] = [
  'Unusual volume detected: 2.3x average',
  'RSI indicates overbought conditions',
  'MACD bullish crossover detected'
];

const mockTradingMetrics: TradingMetrics = {
  high52w: 468.75,
  low52w: 410.25,
  avgVolume: '5.2M',
  volatility: 15.8
};

interface UseMarketDataReturn {
  marketData: MarketDataItem[];
  predictions: Prediction[];
  sentiment: Sentiment;
  topMovers: TopMover[];
  alerts: string[];
  tradingMetrics: TradingMetrics | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useMarketData = (symbol: string = 'SPY'): UseMarketDataReturn => {
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment>('Neutral');
  const [topMovers, setTopMovers] = useState<TopMover[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real app, you would fetch data from your API
      // For now, simulate a fetch operation with a delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set mock data
      setMarketData(mockMarketData);
      setPredictions(mockPredictions);
      setSentiment(Math.random() > 0.7 ? 'Bullish' : Math.random() > 0.5 ? 'Slightly Bullish' : 'Neutral');
      setTopMovers(mockTopMovers);
      setAlerts(mockAlerts);
      setTradingMetrics(mockTradingMetrics);
      
    } catch (err: any) {
      console.error('Error fetching market data:', err);
      setError(err.message || 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
    
    // Poll for updates
    const intervalId = setInterval(() => {
      fetchAllData();
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  return {
    marketData,
    predictions,
    sentiment,
    topMovers,
    alerts,
    tradingMetrics,
    isLoading,
    error,
    refreshData: fetchAllData
  };
};

export default useMarketData;