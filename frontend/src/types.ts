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
    name?: string;
    price?: number;
    changePercent?: number;
  }
  
  export type Sentiment = 'Bearish' | 'Slightly Bearish' | 'Neutral' | 'Slightly Bullish' | 'Bullish';
  
  export interface TradingMetrics {
    high52w: number;
    low52w: number;
    avgVolume: string;
    volatility: number;
    beta?: number;
    periodReturns?: {
      day: number;
      week: number;
      month: number;
    };
  }
  
  export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'user' | 'admin';
    preferences?: {
      theme: 'light' | 'dark' | 'system';
      defaultSymbols: string[];
      refreshInterval: number;
    };
  }
  
  export interface OHLCData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  export interface APIError {
    message: string;
    status: number;
    stack?: string;
  }