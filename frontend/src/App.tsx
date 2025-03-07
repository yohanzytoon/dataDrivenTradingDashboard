import React, { useState } from 'react';
import ErrorBoundary from './components/layout/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorState from './components/ui/ErrorState';
import PriceChart from './components/market/PriceChart';
import VolumeChart from './components/market/VolumeChart';
import MarketSentiment from './components/market/MarketSentiment';
import TopMovers from './components/market/TopMovers';
import MarketAlerts from './components/alerts/MarketAlerts';
import ForecastCard from './components/predictions/ForecastCard';
import TradingMetrics from './components/metrics/TradingMetrics';
import { RefreshCcw } from 'lucide-react';
import { useMarketData } from './hooks/useMarketData';
import './dashboard-fix.css';

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('SPY');
  
  const {
    marketData,
    predictions,
    sentiment,
    topMovers,
    alerts,
    tradingMetrics,
    isLoading,
    error,
    refreshData
  } = useMarketData(symbol);
  
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].price : 0;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorState 
        message={`Unable to connect to the market data service: ${error}`}
        onRetry={refreshData}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="font-sans text-gray-800 bg-gray-100 min-h-screen p-4">
        <header className="bg-gray-800 text-white p-4 mb-4 rounded-md shadow">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Trading Dashboard</h1>
            <button 
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md flex items-center text-sm"
            >
              <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column - 2/3 width on large screens */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <PriceChart marketData={marketData} symbol={symbol} />
            <VolumeChart marketData={marketData} />
            <ForecastCard predictions={predictions} currentPrice={currentPrice} />
          </div>

          {/* Side Column - 1/3 width on large screens */}
          <div className="flex flex-col gap-4">
            <MarketSentiment sentiment={sentiment} />
            <TopMovers movers={topMovers} />
            <MarketAlerts alerts={alerts} />
            <TradingMetrics metrics={tradingMetrics} />
          </div>
        </div>
        
        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>Data updates automatically every minute. Last updated: {new Date().toLocaleTimeString()}</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;