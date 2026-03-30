import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { STORAGE_KEYS } from '../constants/appConstants';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const userData = localStorage.getItem(STORAGE_KEYS.USER);

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
      setUser(response.data.user);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (firstName, lastName, email, phone, password) => {
    setLoading(true);
    setError(null);
    try {
      return await authAPI.register(firstName, lastName, email, phone, password);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      register,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
