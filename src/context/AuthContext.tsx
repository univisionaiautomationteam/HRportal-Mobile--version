import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeDecode } from '../utils';

interface AuthContextType {
  user: { name: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken) {
          setToken(storedToken);
          setIsAuthenticated(true);
          
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser({
              name: parsed.full_name || parsed.name || parsed.username || 'User',
              role: parsed.role || 'HR',
            });
          } else {
            const decoded = safeDecode(storedToken);
            setUser(decoded);
          }
        }
      } catch (e) {
        console.error('Failed to restore token during session bootstrap', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (newToken: string, userData: any) => {
    try {
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setIsAuthenticated(true);

      const displayName = userData.full_name || userData.name || userData.username || 'User';
      setUser({
        name: displayName,
        role: userData.role || 'HR',
      });
    } catch (e) {
      console.error('Error saving session details in AsyncStorage', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('adminLoggedIn');
      
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (e) {
      console.error('Failed to clear credentials during logout', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
