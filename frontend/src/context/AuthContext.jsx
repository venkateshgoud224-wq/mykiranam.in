import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [extraData, setExtraData] = useState({}); // Stores shop metadata or customer trust statistics

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Fetch profile details on load if token exists
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Set extra metrics (trust metrics for customer, shop settings for seller)
          setExtraData({
            trustMetrics: data.trustMetrics || null,
            shop: data.shop || null,
            performanceMetrics: data.performanceMetrics || null,
            spendStats: data.spendStats || null,
            sellerStats: data.sellerStats || null
          });
        } else if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          logout();
        } else {
          console.error("Server error while loading profile:", response.status);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed.');

      localStorage.setItem('token', data.token);
      sessionStorage.removeItem('explicit_logout');
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  // Sign up handler
  const register = async (name, email, password, phone, role) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed.');

      // Return data successfully without automatically logging in
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Simulated Google login for MVP
  const googleLogin = async (credential, name, email) => {
    try {
      const response = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, name, email })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Google login failed.');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  // Update user role
  const updateRole = async (role, locationData = {}) => {
    try {
      const response = await fetch(`${API_URL}/auth/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, ...locationData })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Updating role failed.');

      // Update token in storage (role changed inside claims)
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  // Fetch updated profile metrics
  const refreshProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setExtraData({
          trustMetrics: data.trustMetrics || null,
          shop: data.shop || null,
          performanceMetrics: data.performanceMetrics || null,
          spendStats: data.spendStats || null,
          sellerStats: data.sellerStats || null
        });
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.setItem('explicit_logout', 'true');
    sessionStorage.removeItem('kirana_activeTab');
    sessionStorage.removeItem('kirana_selectedShop');
    setToken(null);
    setUser(null);
    setExtraData({});
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      extraData,
      login,
      register,
      googleLogin,
      updateRole,
      refreshProfile,
      logout,
      apiUrl: API_URL
    }}>
      {children}
    </AuthContext.Provider>
  );
};
