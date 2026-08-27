import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersAPI } from '../utils/api';

const SocketContext = createContext(null);

// Track which userIds we need to monitor for online status.
const WATCHED_USERS = new Set();
const POLL_INTERVAL = 15000;

function getSocketUrl() {
  const configured = (import.meta.env.VITE_SOCKET_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  const apiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!apiUrl) return '';
  return apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/api$/, '');
}

function createSocketAdapter(websocket, dispatch) {
  const listeners = new Map();
  const adapter = {
    get connected() {
      return websocket.readyState === WebSocket.OPEN;
    },
    on(event, handler) {
      const handlers = listeners.get(event) || new Set();
      handlers.add(handler);
      listeners.set(event, handlers);
      return adapter;
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      return adapter;
    },
    emit(event, data) {
      if (websocket.readyState !== WebSocket.OPEN) return false;
      const payload = event === 'register'
        ? { type: 'register', userId: data?.userId || data }
        : { type: event, data: data || {} };
      websocket.send(JSON.stringify(payload));
      return true;
    },
    disconnect() {
      websocket.close();
    },
  };

  websocket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      const eventName = message.type;
      const eventPayload = message.message || message.data || message;
      dispatch(eventName, eventPayload, listeners);
    } catch {
      // Ignore malformed server messages rather than breaking the provider.
    }
  });

  return adapter;
}

function dispatch(eventName, payload, listeners) {
  listeners.get(eventName)?.forEach((handler) => handler(payload));
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState(null);
  const pollIntervalRef = useRef(null);

  const socketUrl = getSocketUrl();

  // Native WebSocket connection to FastAPI on Railway. If no socket URL is
  // configured, the provider intentionally uses the HTTP polling fallback.
  useEffect(() => {
    if (!user || !socketUrl) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setSocketConnected(false);
      }
      return undefined;
    }

    let adapter;
    const websocket = new WebSocket(`${socketUrl}/socket.io/`);
    adapter = createSocketAdapter(websocket, (eventName, payload, listeners) => {
      if (eventName === 'user:online' && payload?.onlineUsers) {
        setOnlineUsers(payload.onlineUsers);
      }
      if (eventName === 'user:offline' && payload?.userId) {
        setOnlineUsers((prev) => prev.filter((id) => id !== payload.userId));
      }
      if (eventName === 'message:new') {
        setNewMessage(payload);
      }
      dispatch(eventName, payload, listeners);
    });

    websocket.addEventListener('open', () => {
      setSocket(adapter);
      setSocketConnected(true);
      adapter.emit('register', { userId: user.id });
    });
    websocket.addEventListener('error', () => {
      setSocketConnected(false);
    });
    websocket.addEventListener('close', () => {
      setSocketConnected(false);
      setSocket((current) => (current === adapter ? null : current));
    });

    return () => {
      websocket.close();
      setSocketConnected(false);
      setSocket((current) => (current === adapter ? null : current));
    };
  }, [user, socketUrl]);

  // HTTP polling fallback for presence and messages when WebSocket is absent.
  const pollOnlineStatus = useCallback(async () => {
    const watched = Array.from(WATCHED_USERS).filter(Boolean);
    if (watched.length === 0) return;

    try {
      const res = await usersAPI.getOnlineStatus(watched);
      if (res.data?.online) setOnlineUsers(res.data.online);
    } catch {
      // Keep the fallback silent when the API is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    if (socketConnected) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } else if (user) {
      pollOnlineStatus();
      pollIntervalRef.current = setInterval(pollOnlineStatus, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [socketConnected, user, pollOnlineStatus]);

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
