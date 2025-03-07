import React from 'react';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../layout/Card';
import { Prediction } from '../../types';

interface ForecastCardProps {
  predictions: Prediction[];
  currentPrice: number;
}

const ForecastCard: React.FC<ForecastCardProps> = ({ predictions, currentPrice }) => {
  return (
    <Card title={<><TrendingUp className="w-5 h-5 mr-2" /> ML Price Forecasts</>}>
      {predictions.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {predictions.map((pred, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-500">{pred.time} Forecast</div>
              <div className="text-xl font-bold mt-1">${pred.price.toFixed(2)}</div>
              <div className={`text-sm mt-1 flex items-center ${pred.price > currentPrice ? 'text-green-600' : 'text-red-600'}`}>
                {pred.price > currentPrice ? (
                  <>
                    <ArrowUp className="w-3 h-3 mr-1" />
                    {(((pred.price - currentPrice) / currentPrice) * 100).toFixed(2)}%
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 mr-1" />
                    {(((currentPrice - pred.price) / currentPrice) * 100).toFixed(2)}%
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 p-4 text-center">
          No prediction data available at this time
        </div>
      )}
      <div className="mt-3 text-sm text-gray-500">
        Predictions based on time series analysis and sentiment data
      </div>
    </Card>
  );
};

export default ForecastCard;