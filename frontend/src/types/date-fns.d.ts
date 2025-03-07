declare module 'date-fns' {
    export function format(date: Date | number, formatStr: string, options?: any): string;
    export function formatDistance(date: Date | number, baseDate: Date | number, options?: any): string;
    export function parseISO(dateString: string): Date;
    export function addDays(date: Date | number, amount: number): Date;
    export function subDays(date: Date | number, amount: number): Date;
    export function isToday(date: Date | number): boolean;
    export function isPast(date: Date | number): boolean;
    export function isFuture(date: Date | number): boolean;
  }