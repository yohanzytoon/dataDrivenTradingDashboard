import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../layout/Card';
import { MarketDataItem } from '../../types';

interface PriceChartProps {
  marketData: MarketDataItem[];
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ marketData, symbol }) => {
  if (!marketData || marketData.length === 0) {
    return (
      <Card>
        <div className="text-center p-4 text-gray-500">No market data available</div>
      </Card>
    );
  }

  // Calculate current price and change
  const currentPrice = marketData[marketData.length - 1].price;
  const previousPrice = marketData.length > 1 ? marketData[marketData.length - 2].price : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const percentChange = ((priceChange / previousPrice) * 100);
  const isPositive = priceChange >= 0;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Activity className="w-5 h-5 mr-2" /> {symbol} Market Overview
        </h2>
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="w-4 h-4 mr-1" /> Live
        </div>
      </div>
      <div className="flex items-center mb-4">
        <div className="text-3xl font-bold mr-3">
          ${currentPrice.toFixed(2)}
        </div>
        <div className={`flex items-center font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? (
            <ArrowUp className="w-4 h-4 mr-1" />
          ) : (
            <ArrowDown className="w-4 h-4 mr-1" />
          )}
          <span>{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)</span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={marketData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={2}
              activeDot={{ r: 8 }} 
              name="Price ($)" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PriceChart;