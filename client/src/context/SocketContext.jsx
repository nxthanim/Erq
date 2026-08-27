import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { usersAPI } from '../utils/api';

const SocketContext = createContext(null);

// Track which userIds we need to monitor for online status
// Components call isUserOnline(userId) which registers interest
const WATCHED_USERS = new Set();

// HTTP polling interval for online status (when socket not available)
const POLL_INTERVAL = 15000; // 15 seconds

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState(null);
  const pollIntervalRef = useRef(null);
  const watchedCacheRef = useRef(new Set());

  // ====== SOCKET.IO CONNECTION ======
  // The FastAPI deployment uses HTTP polling for presence by default. Only
  // create a Socket.IO client when an explicit compatible endpoint is set;
  // otherwise an io('/') client repeatedly hits an unsupported /socket.io
  // polling route and floods the console with 404 errors.
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  useEffect(() => {
    if (!user || !socketUrl) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setSocketConnected(false);
      }
      return;
    }

    const newSocket = io('/', {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 3, // Only retry 3 times, then fallback to HTTP
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setSocketConnected(true);
      newSocket.emit('register', user.id);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
      setSocketConnected(false);
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    newSocket.on('user:online', ({ onlineUsers: users }) => {
      setOnlineUsers(users);
    });

    newSocket.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('message:new', (message) => {
      setNewMessage(message);
    });

    newSocket.on('notification:new', (notification) => {
      // Could trigger a toast
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocketConnected(false);
    };
  }, [user, socketUrl]);

  // ====== HTTP POLLING FALLBACK for online status ======
  // When socket is not available (e.g. Vercel serverless), poll via HTTP
  const pollOnlineStatus = useCallback(async () => {
    const watched = Array.from(WATCHED_USERS).filter(Boolean);
    if (watched.length === 0) return;
    
    try {
      const res = await usersAPI.getOnlineStatus(watched);
      if (res.data?.online) {
        setOnlineUsers(res.data.online);
      }
    } catch (err) {
      // Silently fail — don't spam console
    }
  }, []);

  // Start/stop polling based on socket connection status
  useEffect(() => {
    if (socketConnected) {
      // Socket is working — no need for HTTP polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } else if (user) {
      // Socket not available — start HTTP polling
      pollOnlineStatus(); // Immediate first poll
      pollIntervalRef.current = setInterval(pollOnlineStatus, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [socketConnected, user, pollOnlineStatus]);

  // ====== ONLINE STATUS CHECKER ======
  // When a component calls isUserOnline(id), register it for polling
  const isUserOnline = useCallback((userId) => {
    if (userId) WATCHED_USERS.add(String(userId));
    return onlineUsers.includes(String(userId));
  }, [onlineUsers]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isUserOnline, newMessage, setNewMessage, socketConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
