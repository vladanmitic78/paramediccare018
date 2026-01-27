import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if token is explicitly invalid/expired (401)
      // Don't logout on network errors or server issues (5xx)
      if (error.response?.status === 401) {
        console.log('Token invalid or expired, logging out');
        logout();
      } else {
        // Network error or server error - keep token, user might reconnect
        console.log('Network/server error, keeping session');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  };

  const register = async (email, password, full_name, phone, language = 'sr') => {
    const response = await axios.post(`${API}/auth/register`, { 
      email, 
      password, 
      full_name, 
      phone,
      role: 'regular',
      language  // Include language for email template
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'superadmin';
  };

  const isStaff = () => {
    return ['doctor', 'nurse', 'driver', 'admin', 'superadmin'].includes(user?.role);
  };

  // Refresh user data (useful after profile updates)
  const refreshUser = () => {
    return fetchUser();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser,
      token, 
      loading, 
      login, 
      register, 
      logout, 
      isAdmin, 
      isStaff,
      refreshUser
    }}>
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
