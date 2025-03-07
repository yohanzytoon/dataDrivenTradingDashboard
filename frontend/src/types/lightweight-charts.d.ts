declare module 'lightweight-charts' {
    export interface ChartOptions {
      width?: number;
      height?: number;
      layout?: object;
      grid?: object;
      crosshair?: object;
      timeScale?: object;
      rightPriceScale?: object;
    }
    
    export interface SeriesOptionsCommon {
      lastValueVisible?: boolean;
      priceLineVisible?: boolean;
      visible?: boolean;
      title?: string;
    }
    
    export interface CandlestickSeriesOptions extends SeriesOptionsCommon {
      upColor?: string;
      downColor?: string;
      borderVisible?: boolean;
      wickVisible?: boolean;
      borderColor?: string;
      wickUpColor?: string;
      wickDownColor?: string;
    }
    
    export interface ISeriesApi<TSeriesOptions> {
      setData(data: any[]): void;
      update(bar: any): void;
      setMarkers(markers: any[]): void;
      options(): Readonly<TSeriesOptions>;
      applyOptions(options: Partial<TSeriesOptions>): void;
    }
    
    export interface ICandlestickSeriesApi extends ISeriesApi<CandlestickSeriesOptions> {}
    
    export interface IChartApi {
      applyOptions(options: object): void;
      remove(): void;
      addCandlestickSeries(options?: CandlestickSeriesOptions): ICandlestickSeriesApi;
      resize(width: number, height: number): void;
      timeScale(): any;
      priceScale(): any;
    }
    
    export type UTCTimestamp = number;
    
    export function createChart(container: HTMLElement, options?: ChartOptions): IChartApi;
  }