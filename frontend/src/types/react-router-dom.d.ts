declare module 'react-router-dom' {
    import React from 'react';
    
    export interface NavigateFunction {
      (to: string, options?: { replace?: boolean; state?: any }): void;
    }
    
    export interface NavLinkProps {
      to: string;
      className?: string | ((props: { isActive: boolean }) => string);
      children?: React.ReactNode;
    }
    
    export interface OutletProps {}
    
    export const Outlet: React.FC<OutletProps>;
    export const NavLink: React.FC<NavLinkProps>;
    export function useNavigate(): NavigateFunction;
    export function useParams<T extends object = {}>(): T;
  }