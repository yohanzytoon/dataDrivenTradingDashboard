import React, { useRef, useEffect, useState } from 'react';
import { createChart, IChartApi, UTCTimestamp } from 'lightweight-charts';
import Card from '../layout/Card';

interface CandlestickChartProps {
  data: {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  title: string;
  symbol: string;
  height?: number;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  data, 
  title, 
  symbol, 
  height = 400 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const handleResize = () => {
      chart?.applyOptions({ width: chartContainerRef.current?.clientWidth || 600 });
    };
    
    // Create chart
    const newChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: 'rgba(75, 85, 99, 1)',
      },
      grid: {
        vertLines: { color: 'rgba(229, 231, 235, 0.5)' },
        horzLines: { color: 'rgba(229, 231, 235, 0.5)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'rgba(107, 114, 128, 0.5)',
          style: 0,
        },
        horzLine: {
          width: 1,
          color: 'rgba(107, 114, 128, 0.5)',
          style: 0,
        },
      },
      timeScale: {
        rightOffset: 10,
        borderColor: 'rgba(229, 231, 235, 1)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(229, 231, 235, 1)',
      },
    });
    
    // Add series
    const candlestickSeries = newChart.addCandlestickSeries({
      upColor: 'rgba(16, 185, 129, 1)', // green
      downColor: 'rgba(239, 68, 68, 1)', // red
      borderVisible: false,
      wickUpColor: 'rgba(16, 185, 129, 1)',
      wickDownColor: 'rgba(239, 68, 68, 1)',
    });
    
    candlestickSeries.setData(data);
    
    // Set the chart instance
    setChart(newChart);
    
    // Add window resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      newChart.remove();
    };
  }, [data, height]);
  
  return (
    <Card title={<div className="flex items-center justify-between w-full">
      <span>{title}</span>
      <span className="text-base text-gray-500 font-normal">{symbol}</span>
    </div>}>
      <div ref={chartContainerRef} className="w-full" />
    </Card>
  );
};

export default CandlestickChart;
