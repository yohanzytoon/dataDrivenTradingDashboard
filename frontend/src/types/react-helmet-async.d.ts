declare module 'react-helmet-async' {
    import React from 'react';
    
    export interface HelmetProps {
      children?: React.ReactNode;
      title?: string;
      defer?: boolean;
      encodeSpecialCharacters?: boolean;
      htmlAttributes?: any;
      bodyAttributes?: any;
    }
    
    export const Helmet: React.FC<HelmetProps>;
    
    export interface HelmetProviderProps {
      children: React.ReactNode;
      context?: any;
    }
    
    export const HelmetProvider: React.FC<HelmetProviderProps>;
  }