import React from 'react';
import { RefreshCcw } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading market data..." 
}) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-xl font-semibold flex items-center">
      <RefreshCcw className="w-6 h-6 mr-2 animate-spin" />
      {message}
    </div>
  </div>
);

export default LoadingSpinner;