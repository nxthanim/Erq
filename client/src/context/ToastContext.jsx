import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Info, Bell, MessageCircle, DollarSign, Award, Gavel } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertTriangle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
  message: <MessageCircle size={18} />,
  payment: <DollarSign size={18} />,
  achievement: <Award size={18} />,
  dispute: <Gavel size={18} />,
  notification: <Bell size={18} />,
};

const COLORS = {
  success: { bg: '#e8e8e8', border: '#b0b0b0', text: '#444444', icon: '#1a1a1a' },
  error: { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', icon: '#ef4444' },
  warning: { bg: '#fef3c7', border: '#fcd34d', text: '#b45309', icon: '#f59e0b' },
  info: { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', icon: '#3b82f6' },
  message: { bg: '#e0e0e0', border: '#b0b0b0', text: '#444444', icon: '#1a1a1a' },
  payment: { bg: '#f3e8ff', border: '#d8b4fe', text: '#7c3aed', icon: '#8b5cf6' },
  achievement: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', icon: '#eab308' },
  dispute: { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', icon: '#ef4444' },
  notification: { bg: '#e8e8e8', border: '#cccccc', text: '#333333', icon: '#555555' },
};

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((message, options = {}) => {
    const id = ++toastIdCounter;
    const toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration || 4000,
      title: options.title || '',
      action: options.action || null,
    };
    setToasts(prev => [...prev, toast]);

    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, toast.duration);

    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, opts) => addToast(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => addToast(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => addToast(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => addToast(msg, { ...opts, type: 'info' }),
    message: (msg, opts) => addToast(msg, { ...opts, type: 'message', title: '📩 New Message' }),
    payment: (msg, opts) => addToast(msg, { ...opts, type: 'payment', title: '💳 Payment Update' }),
    achievement: (msg, opts) => addToast(msg, { ...opts, type: 'achievement', title: '🏆 Achievement!' }),
    dispute: (msg, opts) => addToast(msg, { ...opts, type: 'dispute', title: '⚖️ Dispute Update' }),
  }), [addToast]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, toast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 400 }}>
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const colors = COLORS[t.type] || COLORS.info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="pointer-events-auto rounded-2xl p-4 shadow-lg border flex items-start gap-3"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1), inset -2px -2px 6px rgba(0,0,0,0.02), inset 2px 2px 6px rgba(255,255,255,0.4)',
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.icon}15`, color: colors.icon }}>
                  {ICONS[t.type] || ICONS.info}
                </div>
                <div className="flex-1 min-w-0">
                  {t.title && (
                    <p className="text-sm font-semibold mb-0.5" style={{ color: colors.text }}>{t.title}</p>
                  )}
                  <p className="text-sm" style={{ color: colors.text }}>{t.message}</p>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 hover:bg-black/5 transition-colors"
                  style={{ color: colors.text }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
