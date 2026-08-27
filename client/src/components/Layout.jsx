import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { featuresAPI, messagesAPI } from '../utils/api';
import { PageTransition } from './ScrollReveal';
import { Activity, BarChart3, Bell, Bot, BriefcaseBusiness, ChevronRight, ClipboardList, Compass, DollarSign, FolderKanban, Globe2, ImagePlus, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, MoreHorizontal, Package, Palette, Search, Sparkles, Sun, UserRound, WalletCards, X } from 'lucide-react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

const COLORS = { ink: '#18221f', moss: '#1f6f5c', leaf: '#e8f5ee', cream: '#fbfaf7', line: '#ebe9e3', muted: '#7a817d' };

function NavItem({ to, label, icon: Icon, active, badge, collapsed, onClick }) {
  return <Link to={to} onClick={onClick} title={collapsed ? label : undefined} className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${active ? 'font-bold' : 'font-medium hover:bg-[#f4f5f2]'}`} style={{ color: active ? COLORS.ink : COLORS.muted, backgroundColor: active ? COLORS.leaf : 'transparent' }}>
    {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: COLORS.moss }} />}
    <Icon size={17} className="shrink-0" />
    {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    {!collapsed && badge > 0 && <span className="min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: COLORS.moss }}>{badge > 9 ? '9+' : badge}</span>}
  </Link>;
}

function NavGroup({ label, children, collapsed }) {
  return <div className="mt-5 first:mt-0"><p className={`px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] ${collapsed ? 'sr-only' : ''}`} style={{ color: '#adb4af' }}>{label}</p><div className="space-y-1">{children}</div></div>;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast()?.addToast;
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useDeviceDetect();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    messagesAPI.getUnreadCount().then(res => setUnreadCount(Number(res.data?.count || 0))).catch(() => {});
    featuresAPI.getNotifications().then(res => { setNotifications(res.data?.notifications || []); setNotifUnread(Number(res.data?.unreadCount || 0)); }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket || !toast) return;
    const onMessage = msg => toast(`New message from ${msg.sender_name || 'someone'}`, { type: 'message', title: 'New message', duration: 5000 });
    const onNotification = notification => { setNotifUnread(prev => prev + 1); setNotifications(prev => [notification, ...prev]); toast(notification.message || 'New notification', { type: notification.type || 'notification', title: notification.title || 'Notification', duration: 5000 }); };
    socket.on('message:new', onMessage); socket.on('notification:new', onNotification);
    return () => { socket.off('message:new', onMessage); socket.off('notification:new', onNotification); };
  }, [socket, toast]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { const close = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);

  const active = path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  const handleLogout = () => { logout(); navigate('/'); };
  const markAllRead = () => { featuresAPI.markAllNotificationsRead().catch(() => {}); setNotifications(prev => prev.map(item => ({ ...item, read: 1 }))); setNotifUnread(0); };
  const markRead = item => { if (!item.read) { featuresAPI.markNotificationRead(item.id).catch(() => {}); setNotifUnread(prev => Math.max(0, prev - 1)); setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: 1 } : n)); } setShowNotifications(false); };
  const formatTime = value => { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const diff = Date.now() - date.getTime(); if (diff < 60000) return 'just now'; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; return date.toLocaleDateString(); };

  const nav = {
    overview: [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/marketplace', label: 'Marketplace', icon: Compass }, { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount }],
    work: [...(user?.role === 'freelancer' ? [{ to: '/my-gigs', label: 'My gigs', icon: FolderKanban }, { to: `/portfolio/${user.id}`, label: 'Portfolio', icon: ImagePlus }] : []), ...(user?.role === 'client' ? [{ to: '/my-jobs', label: 'My jobs', icon: ClipboardList }] : []), { to: '/orders', label: 'Orders', icon: Package }, { to: '/business', label: 'Business workspace', icon: BriefcaseBusiness }],
    build: [{ to: '/ai-store', label: 'AI Store Builder', icon: Bot }, { to: '/creative-studio', label: 'Creative Studio', icon: Palette }, { to: '/agents', label: 'AI agents', icon: Sparkles }, { to: '/analytics', label: 'Analytics', icon: BarChart3 }, { to: '/ads', label: 'Promotion', icon: Activity }],
    money: [{ to: '/wallet', label: 'Wallet', icon: WalletCards }, { to: '/transactions', label: 'Transactions', icon: DollarSign }],
  };

  const sidebar = <aside className={`h-full flex flex-col ${collapsed && isDesktop ? 'w-[84px]' : 'w-[272px]'} transition-[width] duration-200`} style={{ backgroundColor: COLORS.cream, borderRight: `1px solid ${COLORS.line}` }}>
    <div className={`h-[76px] flex items-center ${collapsed && isDesktop ? 'justify-center px-3' : 'justify-between px-5'}`} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
      <Link to="/" className="flex items-center gap-3 min-w-0"><img src="/high-resolution-color-logo.png" alt="Otr Gebeya" className="h-9 w-9 object-contain rounded-xl" /><div className={collapsed && isDesktop ? 'hidden' : 'min-w-0'}><p className="text-base font-bold truncate" style={{ color: COLORS.ink }}>Otr Gebeya</p><p className="text-[9px] uppercase tracking-[0.16em]" style={{ color: COLORS.muted }}>Work marketplace</p></div></Link>
      {!collapsed && <button onClick={() => setCollapsed(true)} className="hidden lg:flex w-8 h-8 rounded-xl items-center justify-center hover:bg-white" style={{ color: COLORS.muted }}><MoreHorizontal size={17} /></button>}
    </div>
    {collapsed && isDesktop && <button onClick={() => setCollapsed(false)} className="mx-auto mt-3 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white" style={{ color: COLORS.muted }} title="Expand navigation"><ChevronRight size={17} /></button>}
    <div className="flex-1 overflow-y-auto px-3 py-5"><NavGroup label="Navigate" collapsed={collapsed && isDesktop}>{nav.overview.map(item => <NavItem key={item.to} {...item} active={active(item.to)} collapsed={collapsed && isDesktop} onClick={() => setMobileOpen(false)} />)}</NavGroup><NavGroup label="Work" collapsed={collapsed && isDesktop}>{nav.work.map(item => <NavItem key={item.to} {...item} active={active(item.to)} collapsed={collapsed && isDesktop} onClick={() => setMobileOpen(false)} />)}</NavGroup><NavGroup label="Build & grow" collapsed={collapsed && isDesktop}>{nav.build.map(item => <NavItem key={item.to} {...item} active={active(item.to)} collapsed={collapsed && isDesktop} onClick={() => setMobileOpen(false)} />)}</NavGroup><NavGroup label="Money" collapsed={collapsed && isDesktop}>{nav.money.map(item => <NavItem key={item.to} {...item} active={active(item.to)} collapsed={collapsed && isDesktop} onClick={() => setMobileOpen(false)} />)}</NavGroup></div>
    <div className="p-3" style={{ borderTop: `1px solid ${COLORS.line}` }}><Link to="/profile" className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white ${collapsed && isDesktop ? 'justify-center' : ''}`}><div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden text-xs font-bold" style={{ backgroundColor: COLORS.leaf, color: COLORS.moss }}>{user?.profile_picture ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" /> : (user?.full_name || '?').charAt(0).toUpperCase()}</div>{!(collapsed && isDesktop) && <div className="min-w-0 flex-1"><p className="text-xs font-bold truncate" style={{ color: COLORS.ink }}>{user?.full_name || 'Account'}</p><p className="text-[10px] capitalize truncate" style={{ color: COLORS.muted }}>{user?.role || 'member'}</p></div>}<UserRound size={15} style={{ color: COLORS.muted }} /></Link>{!(collapsed && isDesktop) && <div className="flex items-center justify-between px-2 pt-2"><button onClick={toggleTheme} className="text-[10px] flex items-center gap-1.5" style={{ color: COLORS.muted }}>{theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}{theme === 'light' ? 'Dark mode' : 'Light mode'}</button><button onClick={toggleLanguage} className="text-[10px] flex items-center gap-1" style={{ color: COLORS.muted }}><Globe2 size={13} />{language === 'en' ? 'አማ' : 'EN'}</button><button onClick={handleLogout} className="text-[10px] flex items-center gap-1" style={{ color: COLORS.muted }}><LogOut size={13} />Exit</button></div>}</div>
  </aside>;

  return <div className="min-h-screen" style={{ backgroundColor: '#f5f6f3' }}>
    {(isMobile || isTablet) && <header className="sticky top-0 z-30 h-16 px-4 flex items-center justify-between" style={{ backgroundColor: COLORS.cream, borderBottom: `1px solid ${COLORS.line}` }}><button id="sidebar-toggle" onClick={() => setMobileOpen(prev => !prev)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: COLORS.ink }}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button><Link to="/" className="flex items-center gap-2"><img src="/high-resolution-color-logo.png" alt="Otr Gebeya" className="w-8 h-8 rounded-lg" /><span className="font-bold" style={{ color: COLORS.ink }}>Otr Gebeya</span></Link><button onClick={() => setShowNotifications(prev => !prev)} className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ color: COLORS.muted }}><Bell size={18} />{notifUnread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.moss }} />}</button></header>}
    <div className="flex min-h-screen"><div className={`${isDesktop ? 'fixed left-0 top-0 bottom-0 z-20' : `fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}`}>{sidebar}</div>{(isMobile || isTablet) && mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/20" />}
      <div className={`flex-1 min-w-0 ${isDesktop ? (collapsed ? 'ml-[84px]' : 'ml-[272px]') : ''}`}><div className="sticky top-0 z-20 hidden lg:flex h-[76px] items-center justify-between px-8" style={{ backgroundColor: 'rgba(245,246,243,0.9)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${COLORS.line}` }}><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center" style={{ color: COLORS.moss }}><LayoutDashboard size={17} /></div><div><p className="text-xs font-bold" style={{ color: COLORS.ink }}>{location.pathname === '/dashboard' ? 'Overview' : 'Workspace'}</p><p className="text-[10px]" style={{ color: COLORS.muted }}>Otr Gebeya / {location.pathname === '/dashboard' ? 'Dashboard' : 'Workspace'}</p></div></div><div className="flex items-center gap-2"><Link to="/marketplace" className="h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-bold border bg-white" style={{ borderColor: COLORS.line, color: COLORS.ink }}><Search size={14} /> Find work</Link><Link to="/ai-store" className="h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-bold text-white" style={{ backgroundColor: COLORS.moss }}><Bot size={14} /> Build with AI</Link><div className="relative" ref={notifRef}><button onClick={() => setShowNotifications(prev => !prev)} className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white border" style={{ borderColor: COLORS.line, color: COLORS.muted }}><Bell size={17} />{notifUnread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.moss }} />}</button>{showNotifications && <div className="absolute right-0 top-12 w-80 rounded-2xl bg-white border p-3 shadow-2xl" style={{ borderColor: COLORS.line }}><div className="flex items-center justify-between px-2 pb-2 border-b" style={{ borderColor: COLORS.line }}><p className="text-xs font-bold" style={{ color: COLORS.ink }}>Notifications</p>{notifUnread > 0 && <button onClick={markAllRead} className="text-[10px] font-bold" style={{ color: COLORS.moss }}>Mark all read</button>}</div><div className="max-h-72 overflow-y-auto pt-1">{notifications.length === 0 ? <div className="py-8 text-center"><Bell size={20} className="mx-auto" style={{ color: '#c9cfca' }} /><p className="mt-2 text-xs" style={{ color: COLORS.muted }}>No notifications yet</p></div> : notifications.slice(0, 8).map(item => <button key={item.id} onClick={() => markRead(item)} className="w-full text-left p-2 rounded-xl hover:bg-[#fafaf8]"><p className="text-xs font-bold" style={{ color: item.read ? COLORS.muted : COLORS.ink }}>{item.title}</p><p className="text-[10px] mt-1 line-clamp-2" style={{ color: COLORS.muted }}>{item.message}</p><p className="text-[9px] mt-1" style={{ color: '#aeb5b0' }}>{formatTime(item.created_at)}</p></button>)}</div></div>}</div><div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden text-xs font-bold" style={{ backgroundColor: COLORS.leaf, color: COLORS.moss }}>{user?.profile_picture ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" /> : (user?.full_name || '?').charAt(0).toUpperCase()}</div></div></div><main className="p-4 md:p-6 lg:p-8"><PageTransition>{children}</PageTransition></main></div>
    </div>
  </div>;
}
