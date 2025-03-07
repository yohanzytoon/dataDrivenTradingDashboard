import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-screen">
    <div className="bg-red-50 text-red-800 p-6 rounded-lg shadow-md max-w-md">
      <h2 className="text-xl font-semibold mb-3 flex items-center">
        <AlertTriangle className="w-6 h-6 mr-2" /> 
        Data Connection Error
      </h2>
      <p className="mb-4">{message}</p>
      <button 
        className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded flex items-center justify-center w-full"
        onClick={onRetry}
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        Retry Connection
      </button>
    </div>
  </div>
);

export default ErrorState;
