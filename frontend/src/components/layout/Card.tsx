import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold mb-3 flex items-center">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;