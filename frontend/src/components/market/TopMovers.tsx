import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../layout/Card';
import { TopMover } from '../../types';

interface TopMoversProps {
  movers: TopMover[];
}

const TopMovers: React.FC<TopMoversProps> = ({ movers }) => {
  return (
    <Card title="Top Market Movers">
      {movers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {movers.map((stock, index) => (
            <div key={index} className={`flex justify-between items-center ${
              index < movers.length - 1 ? 'pb-2 border-b border-gray-200' : ''
            }`}>
              <div className="font-medium">{stock.symbol}</div>
              <div className={`flex items-center ${
                stock.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.change >= 0 ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stock.change)}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 p-4 text-center">
          No market movers data available
        </div>
      )}
    </Card>
  );
};

export default TopMovers;
