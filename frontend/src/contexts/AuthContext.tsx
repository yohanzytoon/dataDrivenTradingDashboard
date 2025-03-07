import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

// Temporary mock for useNavigate until react-router-dom is installed
const useNavigate = () => {
  return (path: string) => {
    console.log(`Would navigate to: ${path}`);
  };
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  error: string | null;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // Mock authenticated user
          setUser({
            id: '1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'user'
          });
        } catch (err) {
          console.error('Auth check error:', err);
          localStorage.removeItem('access_token');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Mock login function
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Simulate login delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Validate credentials (mock)
      if (email !== 'user@example.com' || password !== 'password') {
        throw new Error('Invalid credentials');
      }
      
      // Mock successful login
      localStorage.setItem('access_token', 'mock_token');
      
      // Set user data
      setUser({
        id: '1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      });
      
      // Redirect to dashboard
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mock register function
  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Simulate registration delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock successful registration
      localStorage.setItem('access_token', 'mock_token');
      
      // Set user data
      setUser({
        id: '1',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user'
      });
      
      // Redirect to dashboard
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('access_token');
    
    // Clear user data
    setUser(null);
    
    // Redirect to login page
    navigate('/login');
  };
  
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  
  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    login,
    register,
    logout,
    error
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;