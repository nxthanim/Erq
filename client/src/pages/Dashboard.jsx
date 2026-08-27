import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { featuresAPI, walletAPI } from '../utils/api';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Bell, Bot, BriefcaseBusiness,
  CheckCircle2, ChevronRight, Clock3, Coffee, Compass, ImagePlus, LayoutDashboard,
  MessageCircle, Package, Plus, RefreshCw, Search, Settings2, ShoppingBag,
  Sparkles, Target, TrendingUp, WalletCards, XCircle,
} from 'lucide-react';

const COLORS = {
  ink: '#18221f',
  moss: '#1f6f5c',
  leaf: '#e8f5ee',
  cream: '#fbfaf7',
  line: '#ebe9e3',
  muted: '#7a817d',
  gold: '#c58b32',
  lilac: '#eeeafe',
};

const STATUS_META = {
  pending_payment: { label: 'Pending payment', color: '#a16207', bg: '#fef3c7' },
  pending: { label: 'Pending', color: '#a16207', bg: '#fef3c7' },
  in_progress: { label: 'In progress', color: '#1d4ed8', bg: '#dbeafe' },
  delivered: { label: 'Delivered', color: '#0f766e', bg: '#ccfbf1' },
  completed: { label: 'Completed', color: '#047857', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
  disputed: { label: 'Disputed', color: '#b91c1c', bg: '#fee2e2' },
};

function formatETB(value) {
  const amount = Number(value || 0);
  return `ETB ${Number.isFinite(amount) ? amount.toLocaleString('en-ET', { maximumFractionDigits: 2 }) : '0'}`;
}

function initials(name) {
  return (name || '?').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function Surface({ children, className = '', delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`rounded-[28px] border bg-white ${className}`}
      style={{ borderColor: COLORS.line, boxShadow: '0 16px 40px rgba(24,34,31,0.04)' }}
    >
      {children}
    </motion.section>
  );
}

function Metric({ label, value, note, icon: Icon, tone = 'moss', delay = 0 }) {
  const palette = tone === 'gold'
    ? { bg: '#fff7e8', fg: '#a16207', line: '#f2d39d' }
    : tone === 'lilac'
      ? { bg: COLORS.lilac, fg: '#6657a6', line: '#ddd7fb' }
      : { bg: COLORS.leaf, fg: COLORS.moss, line: '#d3eadc' };

  return (
    <Surface delay={delay} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: palette.bg, color: palette.fg }}>
          <Icon size={19} />
        </div>
        {note && <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: palette.fg, backgroundColor: palette.bg }}>{note}</span>}
      </div>
      <p className="mt-6 text-[26px] leading-none font-bold tracking-tight" style={{ color: COLORS.ink }}>{value}</p>
      <p className="mt-2 text-xs font-medium" style={{ color: COLORS.muted }}>{label}</p>
    </Surface>
  );
}

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: COLORS.moss }}>{eyebrow}</p>}
        <h2 className="mt-1 text-lg font-bold tracking-tight" style={{ color: COLORS.ink }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function OrderRow({ order, isSeller }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  return (
    <Link to={`/orders/${order.id}`} className="group flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: '#f1f0ed' }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: isSeller ? COLORS.leaf : '#f3f2ef', color: isSeller ? COLORS.moss : COLORS.ink }}>
        {isSeller ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: COLORS.ink }}>{order.title || order.gig_title || 'Marketplace order'}</p>
        <p className="truncate mt-1 text-[11px]" style={{ color: COLORS.muted }}>{isSeller ? 'Selling to' : 'Buying from'} {order.other_name || 'another member'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold" style={{ color: isSeller ? COLORS.moss : COLORS.ink }}>{formatETB(order.price)}</p>
        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>{meta.label}</span>
      </div>
      <ChevronRight size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: '#b3b8b4' }} />
    </Link>
  );
}

function QuickAction({ to, icon: Icon, title, description, tone = 'moss' }) {
  const style = tone === 'gold'
    ? { bg: '#fff7e8', fg: '#a16207' }
    : tone === 'lilac'
      ? { bg: COLORS.lilac, fg: '#6657a6' }
      : { bg: COLORS.leaf, fg: COLORS.moss };
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm" style={{ backgroundColor: '#fafaf8' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}><Icon size={17} /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-bold" style={{ color: COLORS.ink }}>{title}</p><p className="mt-0.5 text-[10px] truncate" style={{ color: COLORS.muted }}>{description}</p></div>
      <ChevronRight size={14} style={{ color: '#b3b8b4' }} />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, walletRes, tipsRes] = await Promise.all([
        featuresAPI.getDashboardStats(),
        walletAPI.getOverview(),
        featuresAPI.getMyReceivedTips().catch(() => ({ data: { total: 0, count: 0 } })),
      ]);
      setStats(statsRes.data?.stats || {});
      setWallet(walletRes.data || {});
      setTips(tipsRes.data || {});
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s = stats || {};
  const isFreelancer = user?.role === 'freelancer';
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const recentOrders = Array.isArray(s.recent_orders) ? s.recent_orders : [];
  const transactions = Array.isArray(s.recent_transactions) ? s.recent_transactions : [];

  const checklist = useMemo(() => [
    { label: 'Complete your profile', done: Boolean(user?.bio && user?.profile_picture), to: '/profile' },
    { label: isFreelancer ? 'Publish your first gig' : 'Post your first job', done: isFreelancer ? Number(s.total_gigs || 0) > 0 : Number(s.total_jobs || 0) > 0, to: isFreelancer ? '/create-gig' : '/post-job' },
    { label: 'Explore the marketplace', done: Number(s.orders_bought || 0) > 0 || Number(s.orders_sold || 0) > 0, to: '/marketplace' },
  ], [isFreelancer, s.total_gigs, s.total_jobs, s.orders_bought, s.orders_sold, user?.bio, user?.profile_picture]);
  const completedChecklist = checklist.filter(item => item.done).length;

  if (loading && !stats) {
    return <div className="min-h-[65vh] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center animate-pulse" style={{ backgroundColor: COLORS.leaf, color: COLORS.moss }}><LayoutDashboard size={22} /></div><p className="mt-4 text-sm font-medium" style={{ color: COLORS.muted }}>Preparing your workspace…</p></div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: COLORS.moss }}>Workspace / Overview</p><h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-[-0.04em]" style={{ color: COLORS.ink }}>Good morning, {firstName}.</h1><p className="mt-2 text-sm" style={{ color: COLORS.muted }}>{today} · Your work, money, and marketplace activity in one place.</p></div>
        <div className="flex items-center gap-2"><button onClick={load} className="h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 hover:bg-white" style={{ borderColor: COLORS.line, color: COLORS.ink }}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button><Link to={isFreelancer ? '/create-gig' : '/post-job'} className="h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-2 hover:opacity-90" style={{ backgroundColor: COLORS.ink }}><Plus size={15} /> {isFreelancer ? 'Create gig' : 'Post a job'}</Link></div>
      </div>

      {error && <div className="rounded-2xl border px-4 py-3 flex items-center gap-2 text-xs" style={{ borderColor: '#fecaca', backgroundColor: '#fff1f2', color: '#b91c1c' }}><XCircle size={15} />{error}</div>}

      <Surface className="overflow-hidden" delay={0.03}>
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] min-h-[240px]" style={{ background: 'linear-gradient(120deg, #18221f 0%, #24463b 65%, #2d6552 100%)' }}>
          <div className="relative p-7 md:p-9 overflow-hidden"><div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border-[32px] border-white/5" /><div className="absolute -right-8 -bottom-28 w-64 h-64 rounded-full border-[22px] border-[#d9f4e4]/10" /><div className="relative max-w-xl"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#d9f4e4] bg-white/10"><Sparkles size={12} /> Otr Gebeya workspace</div><h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-[-0.04em] text-white">Turn your next idea into momentum.</h2><p className="mt-3 text-sm leading-6 text-white/70">{isFreelancer ? 'Build a stronger service business with better gigs, faster delivery, and a storefront that feels like you.' : 'Find the right talent, keep projects moving, and launch a professional storefront for your business.'}</p><div className="mt-6 flex flex-wrap gap-2"><Link to="/ai-store" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" style={{ backgroundColor: '#d9f4e4', color: COLORS.ink }}><Bot size={15} /> Open AI Store Builder</Link><Link to="/marketplace" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 hover:bg-white/10"><Compass size={15} /> Explore marketplace</Link></div></div></div>
          <div className="p-7 md:p-9 flex items-end justify-between gap-5 bg-white/[0.04] border-t lg:border-t-0 lg:border-l border-white/10"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Available balance</p><p className="mt-3 text-4xl font-bold text-white tracking-tight">{formatETB(wallet?.balance)}</p><Link to="/wallet" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#d9f4e4]">Manage wallet <ArrowUpRight size={13} /></Link></div><div className="w-20 h-20 rounded-[26px] flex items-center justify-center" style={{ backgroundColor: 'rgba(217,244,228,0.12)', color: '#d9f4e4' }}><WalletCards size={34} strokeWidth={1.5} /></div></div>
        </div>
      </Surface>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><Metric label={isFreelancer ? 'Total earned' : 'Total spent'} value={formatETB(isFreelancer ? s.total_earned : s.total_spent)} note={isFreelancer ? 'Selling' : 'Buying'} icon={isFreelancer ? TrendingUp : ShoppingBag} delay={0.06} /><Metric label="In escrow" value={formatETB(wallet?.in_escrow)} icon={Clock3} tone="gold" delay={0.1} /><Metric label={isFreelancer ? 'Active gigs' : 'Open jobs'} value={isFreelancer ? (s.total_gigs || 0).toLocaleString() : (s.total_jobs || 0).toLocaleString()} icon={BriefcaseBusiness} tone="lilac" delay={0.14} /><Metric label="Tips received" value={formatETB(tips?.total)} note={`${tips?.count || 0} tips`} icon={Coffee} delay={0.18} /></div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <Surface className="p-6" delay={0.22}><SectionHeading eyebrow="Keep moving" title="Quick actions" action={<Link to="/analytics" className="text-xs font-bold flex items-center gap-1" style={{ color: COLORS.moss }}>View analytics <ChevronRight size={13} /></Link>} /><div className="grid md:grid-cols-2 gap-3"><QuickAction to="/ai-store" icon={Bot} title="Build with AI" description="Draft your storefront in minutes" tone="lilac" /><QuickAction to="/marketplace" icon={Search} title="Find a service" description="Browse verified local talent" /><QuickAction to={isFreelancer ? '/my-gigs' : '/my-jobs'} icon={isFreelancer ? BriefcaseBusiness : Target} title={isFreelancer ? 'Manage your gigs' : 'Track your jobs'} description={isFreelancer ? `${s.total_gigs || 0} active listings` : `${s.total_jobs || 0} jobs posted`} /><QuickAction to="/messages" icon={MessageCircle} title="Open messages" description={`${s.unread_messages || 0} unread conversations`} tone="gold" /></div></Surface>

        <Surface className="p-6" delay={0.26}><SectionHeading eyebrow="Profile progress" title="Build trust faster" /><div className="flex items-center gap-5"><div className="relative w-24 h-24 shrink-0"><svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90"><path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="#edf0ec" strokeWidth="3" /><path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke={COLORS.moss} strokeWidth="3" strokeDasharray={`${(completedChecklist / checklist.length) * 100}, 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: COLORS.ink }}>{Math.round((completedChecklist / checklist.length) * 100)}%</span></div><div className="flex-1 space-y-2">{checklist.map(item => <Link key={item.label} to={item.to} className="flex items-center gap-2 text-xs" style={{ color: item.done ? COLORS.moss : COLORS.muted }}>{item.done ? <CheckCircle2 size={15} /> : <span className="w-[15px] h-[15px] rounded-full border" style={{ borderColor: COLORS.line }} />}<span className={item.done ? 'line-through opacity-70' : 'font-semibold'}>{item.label}</span></Link>)}</div></div><Link to="/profile" className="mt-5 w-full h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#fafaf8]" style={{ borderColor: COLORS.line, color: COLORS.ink }}>Edit profile <ChevronRight size={13} /></Link></Surface>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6"><Surface className="p-6" delay={0.3}><SectionHeading eyebrow="Live workspace" title="Recent orders" action={<Link to="/orders" className="text-xs font-bold flex items-center gap-1" style={{ color: COLORS.moss }}>View all <ChevronRight size={13} /></Link>} />{recentOrders.length > 0 ? recentOrders.slice(0, 5).map(order => <OrderRow key={order.id} order={order} isSeller={order.freelancer_id === user?.id} />) : <div className="py-10 text-center"><Package size={28} className="mx-auto" style={{ color: '#c9cfca' }} /><p className="mt-3 text-sm font-semibold" style={{ color: COLORS.ink }}>No orders yet</p><p className="mt-1 text-xs" style={{ color: COLORS.muted }}>Your first marketplace order will appear here.</p><Link to="/marketplace" className="inline-flex mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: COLORS.ink }}>Browse services</Link></div>}</Surface>
        <Surface className="p-6" delay={0.34}><SectionHeading eyebrow="Money trail" title="Recent activity" action={<Link to="/transactions" className="text-xs font-bold flex items-center gap-1" style={{ color: COLORS.moss }}>All activity <ChevronRight size={13} /></Link>} />{transactions.length > 0 ? <div className="space-y-2">{transactions.slice(0, 5).map(tx => { const incoming = tx.freelancer_id === user?.id; return <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#fafaf8' }}><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: incoming ? COLORS.moss : COLORS.ink, backgroundColor: incoming ? COLORS.leaf : '#f1f0ed' }}>{incoming ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</div><div className="flex-1 min-w-0"><p className="text-xs font-bold truncate" style={{ color: COLORS.ink }}>{tx.job_title || 'Transaction'}</p><p className="mt-1 text-[10px] capitalize" style={{ color: COLORS.muted }}>{tx.status || 'Recorded'}</p></div><p className="text-xs font-bold" style={{ color: incoming ? COLORS.moss : COLORS.ink }}>{incoming ? '+' : '−'}{formatETB(tx.amount)}</p></div>})}</div> : <div className="py-10 text-center"><WalletCards size={27} className="mx-auto" style={{ color: '#c9cfca' }} /><p className="mt-3 text-sm font-semibold" style={{ color: COLORS.ink }}>No transactions yet</p><p className="mt-1 text-xs" style={{ color: COLORS.muted }}>Payment activity will appear here as you work.</p></div>}</Surface></div>

      <Surface className="p-6" delay={0.38}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#fff7e8', color: COLORS.gold }}><Settings2 size={19} /></div><div><p className="text-sm font-bold" style={{ color: COLORS.ink }}>Your workspace is ready for the next move</p><p className="mt-1 text-xs" style={{ color: COLORS.muted }}>Use the AI Store Builder to turn your business details into a polished storefront draft.</p></div></div><Link to="/ai-store" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: COLORS.moss }}><Bot size={14} /> Launch builder <ArrowUpRight size={13} /></Link></div></Surface>
    </motion.div>
  );
}
