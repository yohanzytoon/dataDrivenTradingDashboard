import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  currentTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  
  // Initialize theme from user preferences or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (user?.preferences?.theme) {
      setThemeState(user.preferences.theme);
    } else if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, [user]);
  
  // Update current theme based on preference and system settings
  useEffect(() => {
    const updateCurrentTheme = () => {
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(systemDark ? 'dark' : 'light');
      } else {
        setCurrentTheme(theme);
      }
    };
    
    updateCurrentTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateCurrentTheme();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Apply theme to document
  useEffect(() => {
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);
  
  // Save theme to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
