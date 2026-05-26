import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// Synthetic Audio Synthesizer using Browser Web Audio API (Zero downloads required)
export const playSoundAlert = (type = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'new_order' || type === 'alert') {
      // High-pitched urgent double chime for busy sellers
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'success') {
      // Friendly upward arpeggio for customers (order accepted, packing finished)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); // C6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } else if (type === 'cancelled' || type === 'warning') {
      // Downward buzz chime for rejects/cancellations
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392.00, ctx.currentTime); // G4
      osc.frequency.setValueAtTime(293.66, ctx.currentTime + 0.15); // D4
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (err) {
    console.warn('Browser blocked AudioContext auto-play. Requires user interaction first.', err.message);
  }
};

export const SocketProvider = ({ children }) => {
  const { user, token, extraData, refreshProfile } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestShopUpdate, setLatestShopUpdate] = useState(null);

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

  // Request browser desktop notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch notifications from backend database on load
  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${SOCKET_URL}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          const unreads = (data.notifications || []).filter(n => !n.read_status).length;
          setUnreadCount(unreads);
        }
      } catch (err) {
        console.error('Error fetching initial notifications:', err);
      }
    };
    fetchNotifications();
  }, [token, SOCKET_URL]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Initialize Socket connection
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket.IO connected:', socketInstance.id);
      
      // Register user with socket backend
      socketInstance.emit('register', user.id);

      // If user is seller and has shop, join shop channel
      if (user.role === 'seller' && extraData.shop) {
        socketInstance.emit('join_shop', extraData.shop.id);
      }
    });

    // Listen for realtime notifications
    socketInstance.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Play sound based on notification event type
      if (notif.type === 'new_order' || notif.type === 'order_confirmed') {
        playSoundAlert('new_order');
      } else if (notif.type === 'order_cancelled') {
        playSoundAlert('cancelled');
      } else {
        playSoundAlert('success');
      }

      // Show OS notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title || 'Kiranam.in Update', {
          body: notif.message,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>'
        });
      }
    });

    // Listen for new orders (Seller only - handles dashboard triggers)
    socketInstance.on('new_order', (order) => {
      refreshProfile(); // Refresh metrics/shop data
    });

    // Listen for order status updates
    socketInstance.on('order_status_updated', (order) => {
      refreshProfile(); // Refresh context profile data
    });

    // Listen for shop queue updates (all users for hyperlocal shop cards)
    socketInstance.on('shop_status_updated', (shopUpdate) => {
      setLatestShopUpdate(shopUpdate);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user, extraData.shop?.id]);

  const markAllAsRead = async () => {
    try {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
      if (token) {
        await fetch(`${SOCKET_URL}/api/notifications/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (token) {
        await fetch(`${SOCKET_URL}/api/notifications/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id })
        });
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const clearNotifications = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      if (token) {
        await fetch(`${SOCKET_URL}/api/notifications/clear`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      unreadCount,
      latestShopUpdate,
      markAllAsRead,
      markAsRead,
      clearNotifications,
      playSoundAlert
    }}>
      {children}
    </SocketContext.Provider>
  );
};
