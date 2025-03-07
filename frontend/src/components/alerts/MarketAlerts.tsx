import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Card from '../layout/Card';

interface MarketAlertsProps {
  alerts: string[];
}

const MarketAlerts: React.FC<MarketAlertsProps> = ({ alerts }) => {
  return (
    <Card title={<><AlertTriangle className="w-5 h-5 mr-2" /> Market Alerts</>}>
      {alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {alerts.map((alert, index) => (
            <div key={index} className="p-2 bg-red-100 text-red-800 rounded flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>{alert}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500">No active alerts at this time</div>
      )}
    </Card>
  );
};

export default MarketAlerts;
