import React from 'react';
import Card from '../layout/Card';

interface MarketSentimentProps {
  sentiment: 'Bearish' | 'Slightly Bearish' | 'Neutral' | 'Slightly Bullish' | 'Bullish';
}

const MarketSentiment: React.FC<MarketSentimentProps> = ({ sentiment }) => {
  // Helper functions
  const getSentimentWidth = (sent: string): string => {
    switch (sent) {
      case 'Bearish': return '20%';
      case 'Slightly Bearish': return '40%';
      case 'Neutral': return '60%';
      case 'Slightly Bullish': return '80%';
      case 'Bullish': return '100%';
      default: return '60%';
    }
  };

  const getSentimentColor = (sent: string): string => {
    if (sent === 'Bearish' || sent === 'Slightly Bearish') {
      return '#ef4444';
    } else if (sent === 'Neutral') {
      return '#6b7280';
    } else {
      return '#10b981';
    }
  };

  return (
    <Card title="Market Sentiment">
      <div className="flex items-center justify-between">
        <div className="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full" 
            style={{
              width: getSentimentWidth(sentiment),
              backgroundColor: getSentimentColor(sentiment),
            }} 
          />
        </div>
        <div className="ml-4 text-lg font-medium">
          {sentiment}
        </div>
      </div>
      <div className="mt-4 text-xs">
        <div className="grid grid-cols-5 text-center">
          <div>Bearish</div>
          <div>Slightly Bearish</div>
          <div>Neutral</div>
          <div>Slightly Bullish</div>
          <div>Bullish</div>
        </div>
      </div>
    </Card>
  );
};

export default MarketSentiment;