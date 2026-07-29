import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { messagesAPI, featuresAPI } from '../utils/api';
import { PageTransition } from './ScrollReveal';
import {
  ClipboardList, Plus, Image, Save, Gavel, MessageCircle, User, Bot, BarChart3, Settings, Home, Store,
  Bell, Award, Inbox, Info, Globe, LogOut, Moon, Sun, DollarSign, Briefcase, Menu, X, Package,
  Sparkles, Search, ChevronDown, ArrowRight, Star,
} from 'lucide-react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const { isUserOnline, socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast()?.addToast;
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useDeviceDetect();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) {
      messagesAPI.getUnreadCount()
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
      featuresAPI.getNotifications()
        .then(res => {
          setNotifications(res.data.notifications);
          setNotifUnread(res.data.unreadCount);
        })
        .catch(() => {});
      featuresAPI.getDashboardStats()
        .then(res => setDashboardStats(res.data.stats))
        .catch(() => {});
    }
  }, [user]);

  // Socket notifications
  useEffect(() => {
    if (!socket || !toast) return;
    const handleNewMessage = (msg) => {
      toast(`New message from ${msg.sender_name || 'someone'}`, {
        type: 'message',
        title: '📩 New Message',
        duration: 5000,
      });
    };
    const handleNotification = (notif) => {
      // Increment unread count and prepend the new notification
      setNotifUnread(prev => prev + 1);
      setNotifications(prev => [notif, ...prev]);
      toast(notif.message || 'New notification', {
        type: notif.type || 'notification',
        title: notif.title || 'Notification',
        duration: 5000,
      });
    };
    socket.on('message:new', handleNewMessage);
    socket.on('notification:new', handleNotification);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('notification:new', handleNotification);
    };
  }, [socket, toast]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const handleNotifClick = (notif) => {
    if (!notif.read) {
      featuresAPI.markNotificationRead(notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: 1 } : n));
      setNotifUnread(prev => Math.max(0, prev - 1));
    }
    setShowNotifs(false);
  };

  const handleMarkAllRead = () => {
    featuresAPI.markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setNotifUnread(0);
  };

  const totalUnread = unreadCount + notifUnread;

  const navLinks = [
    ...(user?.role === 'freelancer' ? [
      { path: '/create-gig', label: t('gig.create'), icon: <Plus size={16} /> },
      { path: `/portfolio/${user.id}`, label: 'Portfolio', icon: <Image size={16} /> },
    ] : []),
    ...(user?.role === 'client' ? [
      { path: '/post-job', label: t('job.create'), icon: <Plus size={16} /> },
    ] : []),
    { path: '/saved-gigs', label: 'Saved Gigs', icon: <Save size={16} /> },
    { path: '/wallet', label: 'Wallet', icon: <DollarSign size={16} /> },
    { path: '/transactions', label: 'Transactions', icon: <DollarSign size={16} /> },
    { path: '/business', label: 'Business', icon: <Briefcase size={16} /> },
    { path: '/agents', label: 'My Agents', icon: <Bot size={16} /> },
    { path: '/orders', label: 'Orders', icon: <Package size={16} /> },
    { path: '/disputes', label: 'Disputes', icon: <Gavel size={16} /> },
    { path: '/messages', label: t('nav.messages'), icon: <MessageCircle size={16} />, badge: unreadCount },
    { path: '/my-jobs', label: 'My Jobs', icon: <ClipboardList size={16} /> },
    { path: '/my-gigs', label: 'My Gigs', icon: <ClipboardList size={16} /> },
    { path: '/profile', label: t('nav.profile'), icon: <User size={16} /> },
    { path: '/ai-store', label: 'AI Store', icon: <Bot size={16} /> },
    ...(user ? [
      { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
      ...(user?.role === 'admin' ? [{ path: '/admin', label: t('nav.admin'), icon: <Settings size={16} /> }] : []),
    ] : []),
  ];

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  useEffect(() => {
    if (isMobile || isTablet) setSidebarOpen(false);
  }, [location.pathname, isMobile, isTablet]);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return;
    const handleClick = (e) => {
      if (!e.target.closest('#sidebar') && !e.target.closest('#sidebar-toggle')) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [sidebarOpen, isDesktop]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: '#ffffff' }}>
      {/* Mobile/Tablet Top Header Bar */}
      {(isMobile || isTablet) && (
        <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f2f2f3' }}>
          <div className="flex items-center gap-3">
            <button id="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] transition-all hover:bg-[#f2f2f3]">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/high-resolution-color-logo.png" alt="Erq" className="h-7 w-auto no-grayscale" />
              <span style={{ fontFamily: 'var(--font-signifier)', fontSize: '18px', color: '#17191c', fontWeight: 400 }}>Erq</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={() => setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 flex items-center justify-center rounded-[12px] transition-all hover:bg-[#f2f2f3]"
                style={{ color: '#777b86' }}>
                <Bell size={18} />
                {notifUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[9px] font-bold text-white rounded-full"
                    style={{ backgroundColor: '#5d2a1a', fontSize: '9px' }}>
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </button>
            )}
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-[12px] transition-all hover:bg-[#f2f2f3]"
              style={{ color: '#777b86' }}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={toggleLanguage} className="text-xs font-medium px-2 py-1 rounded-[8px] transition-all hover:bg-[#f2f2f3]"
              style={{ color: '#777b86' }}>
              {language === 'en' ? 'አማ' : 'EN'}
            </button>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <aside id="sidebar"
        className={`${
          isDesktop
            ? 'w-64 fixed h-full'
            : `fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
        } flex flex-col h-full z-30`}
        style={{
          backgroundColor: '#fafafb',
          borderRight: '1px solid #f2f2f3',
          boxShadow: isDesktop ? 'none' : '4px 0 20px rgba(0,0,0,0.06)',
        }}>
        {/* Logo + Notifications */}
        <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #f2f2f3' }}>
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/high-resolution-color-logo.png" alt="Erq" className="h-9 w-auto no-grayscale" />
            <div>
              <h1 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', color: '#17191c', fontWeight: 400, letterSpacing: '-0.5px' }}>Erq</h1>
              <p className="text-[9px]" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>Marketplace</p>
            </div>
          </Link>

          {user && (
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 flex items-center justify-center rounded-[12px] transition-all hover:bg-[#f2f2f3]"
                style={{ color: '#777b86' }}>
                <Bell size={18} />
                {notifUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[9px] font-bold text-white rounded-full"
                    style={{ backgroundColor: '#5d2a1a' }}>
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-80 overflow-hidden z-50 animate-scale-in"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    boxShadow: 'oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 8px 40px 0px',
                  }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f2f2f3' }}>
                    <h3 className="text-sm font-medium" style={{ color: '#17191c' }}>Notifications</h3>
                    {notifUnread > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs" style={{ color: '#777b86' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                    {notifications.length === 0 ? (
                      <div className="text-center py-10" style={{ color: '#a3a6af' }}>
                        <Bell size={24} className="block mb-2 mx-auto" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button key={n.id} onClick={() => handleNotifClick(n)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 transition-all hover:bg-[#fafafb]"
                          style={{ borderBottom: '1px solid #fafafb' }}>
                          <span className="mt-0.5" style={{ color: n.type === 'review' ? '#5d2a1a' : '#777b86' }}>
                            {n.type === 'review' ? <Star size={18} fill="#5d2a1a" /> : n.type === 'achievement' ? <Award size={18} /> : n.type === 'message' ? <MessageCircle size={18} /> : n.type === 'bid' ? <Inbox size={18} /> : n.type === 'payment' ? <DollarSign size={18} /> : n.type === 'order' ? <Package size={18} /> : <Info size={18} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.read ? 'font-medium' : ''}`} style={{ color: !n.read ? '#17191c' : '#777b86' }}>{n.title}</p>
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#979799' }}>{n.message}</p>
                            <p className="text-xs mt-1" style={{ color: '#a3a6af' }}>{formatTime(n.created_at)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: '#5d2a1a' }} />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info + Dashboard Stats */}
        {user && dashboardStats && (
          <div className="px-4 py-4" style={{ borderBottom: '1px solid #f2f2f3' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-medium overflow-hidden"
                  style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                  {user.profile_picture ? (
                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <span className={`status-dot ${isUserOnline(user.id) ? 'online' : 'offline'} absolute -bottom-0.5 -right-0.5`} style={{ border: '2px solid #fafafb' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#17191c' }}>{user.full_name}</p>
                <p className="text-xs capitalize" style={{ color: '#979799' }}>{user.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {user.role === 'freelancer' && (
                <>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>{dashboardStats.activeGigs}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Active</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>ETB {(dashboardStats.totalEarned || 0).toLocaleString()}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Earned</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#5d2a1a' }}>{dashboardStats.unreadMessages}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Unread</p>
                  </div>
                </>
              )}
              {user.role === 'client' && (
                <>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>{dashboardStats.activeJobs}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Open</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>ETB {(dashboardStats.totalSpent || 0).toLocaleString()}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Spent</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#5d2a1a' }}>{dashboardStats.unreadMessages}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Unread</p>
                  </div>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>{dashboardStats.totalUsers}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Users</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>{dashboardStats.pendingDisputes}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Disputes</p>
                  </div>
                  <div className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
                    <p className="text-xs font-medium" style={{ color: '#17191c' }}>{dashboardStats.totalTransactions}</p>
                    <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>Txns</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
            <Home size={16} />
            <span>{t('nav.home')}</span>
          </Link>
          <Link to="/marketplace" className={`sidebar-link ${isActive('/marketplace') ? 'active' : ''}`}>
            <Search size={16} />
            <span>{t('nav.marketplace')}</span>
          </Link>

          {user && (
            <>
              <div style={{ height: '1px', backgroundColor: '#f2f2f3', margin: '8px 12px' }} />

              {navLinks.map(link => (
                <Link key={link.path} to={link.path}
                  className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}>
                  <span style={{ color: 'inherit' }}>{link.icon}</span>
                  <span className="flex-1">{link.label}</span>
                  {link.badge > 0 && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Bottom: Theme Toggle + Lang + Logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid #f2f2f3' }}>
          <div className="flex items-center justify-between px-3 py-2 mb-1">
            <button onClick={toggleTheme} className="sidebar-link flex items-center gap-2 px-0" style={{ color: '#777b86' }}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-xs">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <button onClick={toggleLanguage} className="text-xs font-medium px-2 py-1 rounded-[8px] transition-all hover:bg-[#f2f2f3]"
              style={{ color: '#777b86' }}>
              {language === 'en' ? 'አማ' : 'EN'}
            </button>
          </div>
          {user && (
            <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: '#777b86' }}>
              <LogOut size={16} />
              <span className="text-xs">{t('nav.logout')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 ${isDesktop ? 'ml-64' : ''}`}>
        <PageTransition>
          <main style={{ minHeight: '100vh', padding: isDesktop ? '24px' : '16px' }}>
            {children}
          </main>
        </PageTransition>
      </div>

      {/* Mobile sidebar overlay */}
      {(isMobile || isTablet) && sidebarOpen && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }} />
      )}
    </div>
  );
}
