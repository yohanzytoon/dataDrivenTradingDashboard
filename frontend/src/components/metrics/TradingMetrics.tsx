import React from 'react';
import { DollarSign } from 'lucide-react';
import Card from '../layout/Card';
import { TradingMetrics as TradingMetricsType } from '../../types';

interface TradingMetricsProps {
  metrics: TradingMetricsType | null;
}

const TradingMetrics: React.FC<TradingMetricsProps> = ({ metrics }) => {
  return (
    <Card title={<><DollarSign className="w-5 h-5 mr-2" /> Trading Metrics</>}>
      {metrics ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">52W High</div>
            <div className="font-bold">${metrics.high52w.toFixed(2)}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">52W Low</div>
            <div className="font-bold">${metrics.low52w.toFixed(2)}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Avg Volume</div>
            <div className="font-bold">{metrics.avgVolume}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Volatility</div>
            <div className="font-bold">{metrics.volatility} β</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 p-4 text-center">
          No metrics data available
        </div>
      )}
    </Card>
  );
};

export default TradingMetrics;