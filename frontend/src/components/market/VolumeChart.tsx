import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';
import Card from '../layout/Card';
import { MarketDataItem } from '../../types';

interface VolumeChartProps {
  marketData: MarketDataItem[];
}

const VolumeChart: React.FC<VolumeChartProps> = ({ marketData }) => {
  if (!marketData || marketData.length === 0) {
    return (
      <Card title={<><BarChart2 className="w-5 h-5 mr-2" /> Trading Volume</>}>
        <div className="text-center p-4 text-gray-500">No volume data available</div>
      </Card>
    );
  }

  return (
    <Card title={<><BarChart2 className="w-5 h-5 mr-2" /> Trading Volume</>}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={marketData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value.toLocaleString(), 'Volume']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Bar dataKey="volume" fill="#4f46e5" name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default VolumeChart;