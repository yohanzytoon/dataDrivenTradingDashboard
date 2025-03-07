import React from 'react';
import { ArrowUp, ArrowDown, Activity, DollarSign, BarChart2 } from 'lucide-react';

interface StockStatsProps {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayRange: {
    low: number;
    high: number;
  };
  volume: number;
  avgVolume: number;
  marketCap?: number;
  pe?: number;
  dividend?: number;
}

const StockStats: React.FC<StockStatsProps> = ({
  symbol,
  price,
  change,
  changePercent,
  dayRange,
  volume,
  avgVolume,
  marketCap,
  pe,
  dividend
}) => {
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toString();
  };
  
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{symbol}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">NASDAQ</p>
        </div>
        
        <div className="mt-2 md:mt-0 flex items-baseline">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">${price.toFixed(2)}</span>
          <span className={`ml-2 flex items-center text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
            {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Activity className="w-4 h-4 mr-1" />
            <span>Day Range</span>
          </div>
          <div className="font-semibold text-gray-900 dark:text-white">
            ${dayRange.low.toFixed(2)} - ${dayRange.high.toFixed(2)}
          </div>
        </div>
        
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
            <BarChart2 className="w-4 h-4 mr-1" />
            <span>Volume</span>
          </div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatLargeNumber(volume)}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {volume > avgVolume ? '(+' : '(-'}
              {Math.abs(((volume / avgVolume) - 1) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        
        {marketCap && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
              <DollarSign className="w-4 h-4 mr-1" />
              <span>Market Cap</span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              ${formatLargeNumber(marketCap)}
            </div>
          </div>
        )}
        
        {pe && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span>P/E Ratio</span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {pe.toFixed(2)}
              {dividend && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  (Div: {dividend.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockStats;