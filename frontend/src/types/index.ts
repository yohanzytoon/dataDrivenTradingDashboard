export interface MarketDataItem {
    time: string;
    price: number;
    volume: number;
  }
  
  export interface Prediction {
    time: string;
    price: number;
  }
  
  export interface TopMover {
    symbol: string;
    change: number;
  }
  
  export type Sentiment = 'Bearish' | 'Slightly Bearish' | 'Neutral' | 'Slightly Bullish' | 'Bullish';
  
  export interface TradingMetrics {
    high52w: number;
    low52w: number;
    avgVolume: string;
    volatility: number;
  }
  