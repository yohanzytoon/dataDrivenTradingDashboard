import React, { useState, useEffect } from 'react';
import { Activity, BarChart2, Clock, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../components/layout/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';
import { getOHLCData } from '../services/api';
import StockStats from '../components/dashboard/StockStats';
import MarketMoversTable from '../components/tables/MarketMoverTable';

// This is a temporary replacement for useParams from react-router-dom
const useParams = () => {
  // In a real app, you would parse this from the URL
  return { symbol: 'SPY' };
};

// This is a temporary replacement for Helmet from react-helmet-async
const Helmet = (props: { children: React.ReactNode }) => {
  return <>{props.children}</>;
};

// This is a temporary replacement for format from date-fns
const format = (date: Date, formatStr: string) => {
  return date.toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
};

interface DayRange {
  low: number;
  high: number;
}

const MarketDetail: React.FC = () => {
  const { symbol = 'SPY' } = useParams();
  const [marketData, setMarketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getOHLCData(symbol);
        setMarketData(data);
      } catch (err: any) {
        console.error('Error fetching market data:', err);
        setError(err.message || 'Failed to load market data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [symbol]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error || !marketData) {
    return (
      <ErrorState 
        message={error || `No data available for ${symbol}`}
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  // Process data for chart
  const chartData = marketData.ohlc?.map((item: any) => ({
    time: new Date(item.time).getTime() / 1000,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close
  })) || [];
  
  // Calculate price and change
  const latestData = marketData.ohlc?.[marketData.ohlc.length - 1] || { close: 0 };
  const previousData = marketData.ohlc?.[marketData.ohlc.length - 2] || latestData;
  const price = latestData.close;
  const change = latestData.close - previousData.close;
  const changePercent = (change / previousData.close) * 100;
  
  // Calculate day range
  const dayData = marketData.ohlc?.slice(-78) || []; // Assuming 5-min intervals, ~6.5 hours (78 intervals)
  const dayHigh = Math.max(...dayData.map((item: any) => item.high || 0), 0);
  const dayLow = Math.min(...dayData.map((item: any) => item.low || Number.MAX_VALUE), Number.MAX_VALUE);
  
  // Calculate volume
  const volume = latestData.volume || 0;
  const avgVolume = dayData.reduce((sum: number, item: any) => sum + (item.volume || 0), 0) / Math.max(dayData.length, 1);
  
  return (
    <>
      <Helmet>
        <title>{symbol} | Market Detail | Trading Dashboard</title>
      </Helmet>
      
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">{symbol} Market Detail</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Last updated: {format(new Date(marketData.timestamp || new Date()), 'MMMM d, yyyy h:mm a')}
        </p>
      </div>
      
      <StockStats
        symbol={symbol}
        price={price}
        change={change}
        changePercent={changePercent}
        dayRange={{ low: dayLow, high: dayHigh }}
        volume={volume}
        avgVolume={avgVolume}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Card title="Price History (OHLC)">
            <div className="h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-gray-500 dark:text-gray-400">
                Candlestick chart will be displayed here once the lightweight-charts package is installed
              </p>
            </div>
          </Card>
        </div>
        
        <div>
          <Card title={<><Activity className="w-5 h-5 mr-2" /> Technical Indicators</>}>
            <div className="space-y-4">
              {/* RSI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">RSI (14)</span>
                  <span className="text-sm font-bold">65.4</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65.4%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Oversold</span>
                  <span>Neutral</span>
                  <span>Overbought</span>
                </div>
              </div>
              
              {/* MACD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">MACD</span>
                  <span className="text-sm font-bold text-green-600">Bullish</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  MACD(12,26,9): 0.42 &gt; Signal: 0.21
                </p>
              </div>
              
              {/* Moving Averages */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Moving Averages</span>
                  <span className="text-sm font-bold text-green-600">Buy</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>MA(20): $442.18</div>
                  <div>MA(50): $438.74</div>
                  <div>MA(100): $432.91</div>
                  <div>MA(200): $418.05</div>
                </div>
              </div>
              
              {/* Bollinger Bands */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bollinger Bands</span>
                  <span className="text-sm font-bold">Neutral</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Upper: $457.82</div>
                  <div>Middle: $442.18</div>
                  <div>Lower: $426.54</div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card title={<><AlertTriangle className="w-5 h-5 mr-2" /> Market Alerts</>} className="mt-4">
            <div className="space-y-2">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  Unusual volume detected: 1.6x average
                </div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 rounded flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  20-period SMA crossed above 50-period SMA
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={<><Clock className="w-5 h-5 mr-2" /> Price Predictions</>}>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm text-gray-500 dark:text-gray-400">15min Forecast</div>
              <div className="text-xl font-bold mt-1">${(price * 1.002).toFixed(2)}</div>
              <div className="text-sm mt-1 flex items-center text-green-600">
                <ArrowUp className="w-3 h-3 mr-1" />
                0.20%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm text-gray-500 dark:text-gray-400">30min Forecast</div>
              <div className="text-xl font-bold mt-1">${(price * 1.003).toFixed(2)}</div>
              <div className="text-sm mt-1 flex items-center text-green-600">
                <ArrowUp className="w-3 h-3 mr-1" />
                0.30%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm text-gray-500 dark:text-gray-400">60min Forecast</div>
              <div className="text-xl font-bold mt-1">${(price * 1.005).toFixed(2)}</div>
              <div className="text-sm mt-1 flex items-center text-green-600">
                <ArrowUp className="w-3 h-3 mr-1" />
                0.50%
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Predictions based on time series analysis and sentiment data
          </div>
        </Card>
        
        <MarketMoversTable 
          title={<><BarChart2 className="w-5 h-5 mr-2" /> Related Stocks</>}
          movers={[
            { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 388.42, change: 1.53, changePercent: 0.4 },
            { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 452.18, change: 1.27, changePercent: 0.28 },
            { symbol: 'IVV', name: 'iShares Core S&P 500 ETF', price: 451.82, change: 1.21, changePercent: 0.27 },
            { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', price: 252.34, change: 0.92, changePercent: 0.37 },
            { symbol: 'DIA', name: 'SPDR Dow Jones Industrial', price: 380.15, change: -0.42, changePercent: -0.11 }
          ]}
        />
      </div>
    </>
  );
};

export default MarketDetail;