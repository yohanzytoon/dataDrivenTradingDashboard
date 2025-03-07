import React from 'react';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import Card from '../layout/Card';

interface MarketMover {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface MarketMoversTableProps {
  title: React.ReactNode;
  movers: MarketMover[];
  limit?: number;
  onRowClick?: (symbol: string) => void;
}

const MarketMoversTable: React.FC<MarketMoversTableProps> = ({ 
  title, 
  movers, 
  limit = 5,
  onRowClick
}) => {
  const displayedMovers = movers.slice(0, limit);
  
  const handleRowClick = (symbol: string) => {
    if (onRowClick) {
      onRowClick(symbol);
    }
  };
  
  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {displayedMovers.map((mover) => (
              <tr 
                key={mover.symbol}
                onClick={() => handleRowClick(mover.symbol)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mover.symbol}
                    </div>
                    {mover.name && (
                      <div className="ml-2 text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate max-w-[150px]">
                        {mover.name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  ${mover.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`inline-flex items-center ${
                    mover.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mover.change >= 0 ? (
                      <ArrowUp className="w-4 h-4 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 mr-1" />
                    )}
                    {Math.abs(mover.changePercent).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {movers.length > limit && (
        <div className="mt-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // If you have proper routing, uncomment this
              // window.location.href = '/market/movers';
            }}
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all market movers
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      )}
    </Card>
  );
};

export default MarketMoversTable;