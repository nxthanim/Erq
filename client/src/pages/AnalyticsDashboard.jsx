import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, userAnalyticsAPI } from '../utils/api';
import { LineChart, BarChart, DonutChart, ClayStatCard } from '../components/charts/Charts';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/card';
import { Badge, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/badge-progress-dialog';
import {
  BarChart3, TrendingUp, Users, DollarSign, MessageSquare, Lock, CheckCircle,
  Clock, Star, Download, FileText, RefreshCw, Activity, Target, Briefcase,
  Shield, FileBarChart, Upload, AlertTriangle, Scale,
} from 'lucide-react';

// ====== TIME RANGE SELECTOR ======
function TimeRangeSelector({ value, onChange }) {
  const ranges = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '12m', label: '12M' },
    { id: 'all', label: 'ALL' },
  ];
  return (
    <div className="inline-flex rounded-full p-0.5" style={{ backgroundColor: '#f2f2f3' }}>
      {ranges.map(r => (
        <button key={r.id} onClick={() => onChange(r.id)}
          className="relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={{ color: value === r.id ? '#173a32' : '#777b86' }}>
          {value === r.id && (
            <motion.div layoutId="analyticsTimeBg" className="absolute inset-0 rounded-full bg-white z-0"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
          )}
          <span className="relative z-10">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

// ====== EXPORT DIALOG ======
function ExportDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="secondary" size="sm" className="flex items-center gap-1 text-xs px-3 py-1.5">
          <Download size={12} /> Export Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Analytics Report</DialogTitle>
          <DialogDescription>Choose a format and time range for your report.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'PDF Report', icon: <FileText size={20} />, desc: 'Full analytics with charts' },
              { label: 'CSV Export', icon: <Upload size={20} />, desc: 'Raw data tables' },
              { label: 'Excel Sheet', icon: <FileBarChart size={20} />, desc: 'Formatted spreadsheet' },
              { label: 'JSON API', icon: <Upload size={20} />, desc: 'Machine-readable data' },
            ].map(opt => (
              <button key={opt.label} className="p-4 rounded-2xl text-left group transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#fafafb', border: '1px solid #ececec' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2"
                  style={{ backgroundColor: '#f2f2f3', color: '#173a32' }}>
                  {opt.icon}
                </div>
                <p className="text-sm font-semibold" style={{ color: '#173a32' }}>{opt.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#979799' }}>{opt.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#ececec]">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} style={{ borderRadius: '9999px' }}>Cancel</Button>
            <Button variant="default" size="sm" style={{ borderRadius: '9999px', backgroundColor: '#173a32', color: '#ffffff' }}>
              <Download size={14} /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ====== DATA HOOK ======
function useAnalyticsData(endpoint, range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadTimer = useRef(null);
  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;

  const fetchData = useCallback(async () => {
    const ep = endpointRef.current;
    if (!ep) { setData(null); setError(null); return; }
    const timerId = setTimeout(() => setLoading(true), 200);
    loadTimer.current = timerId;
    setError(null);
    try {
      const res = await ep(range);
      clearTimeout(timerId);
      setLoading(false);
      setData(res.data.analytics);
    } catch (err) {
      clearTimeout(timerId);
      setLoading(false);
      setError(err?.response?.data?.error || err?.message || 'Failed to load analytics');
      setData(null);
    }
  }, [range]);

  useEffect(() => {
    if (!endpointRef.current) { setLoading(false); setData(null); return; }
    fetchData();
    return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
  }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

// ====== MODERN STAT CARD ======
function ModernStatCard({ title, value, icon, trend, delay = 0, isMoney = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl bg-white p-5 relative overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: 'linear-gradient(90deg, #173a32, #1f6f5c)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
          <span style={{ color: '#173a32' }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? '' : ''}`}
            style={{ color: trend >= 0 ? '#1f6f5c' : '#777b86' }}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: '#173a32' }}>
        {typeof value === 'number' && isMoney ? `ETB ${value.toLocaleString()}` :
         typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm mt-0.5" style={{ color: '#777b86' }}>{title}</p>
    </motion.div>
  );
}

// ====== LOADING SPINNER ======
function LoadingSpinner({ text = 'Loading analytics...' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <motion.div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#f2f2f3' }}
          animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Activity size={24} style={{ color: '#777b86' }} />
        </motion.div>
        <p className="animate-pulse font-medium" style={{ color: '#777b86' }}>{text}</p>
      </div>
    </div>
  );
}

// ====== FREELANCER OVERVIEW ======
function FreelancerOverview({ data }) {
  if (!data) return null;
  const earningsChart = data.monthlyEarnings?.map(m => ({ label: m.month.slice(5), value: Math.round(m.amount) })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <ModernStatCard title="Total Earned" value={data.totalEarned} icon={<DollarSign size={18} />} trend={12.5} delay={0.1} isMoney />
        <ModernStatCard title="Active Gigs" value={data.activeGigs} icon={<FileText size={18} />} trend={8.3} delay={0.15} />
        <ModernStatCard title="Completed Jobs" value={data.completedJobs} icon={<CheckCircle size={18} />} trend={15.2} delay={0.2} />
        <ModernStatCard title="Escrow Held" value={data.escrowHeld} icon={<Lock size={18} />} trend={-2.1} delay={0.25} isMoney />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Monthly Earnings</CardTitle><CardDescription>Your earnings over time</CardDescription></CardHeader>
          <CardContent>
            <BarChart data={earningsChart} height={200} color="#173a32" formatter={v => `ETB ${v.toLocaleString()}`} />
          </CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Win Rate', value: `${data.winRate}%` },
              { label: 'Rating', value: `${data.avgRating}`, icon: <Star size={14} style={{ color: '#1f6f5c' }} /> },
              { label: 'Total Bids', value: data.totalBids?.toLocaleString() },
              { label: 'Reviews', value: data.totalReviews?.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: '#fafafb' }}>
                <span className="text-sm" style={{ color: '#777b86' }}>{s.label} {s.icon}</span>
                <span className="text-lg font-bold" style={{ color: '#173a32' }}>{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <CardHeader><CardTitle>Recent Jobs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.recentJobs || []).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#fafafb] transition-all">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: job.status === 'completed' ? '#1f6f5c' : job.status === 'in_progress' ? '#173a32' : '#979799' }} />
                <div className="flex-1 min-w-0">
                  <Link to={`/jobs/${job.id}`} className="text-xs font-semibold truncate block hover:underline"
                    style={{ color: '#173a32' }}>{job.title}</Link>
                  <p className="text-[9px]" style={{ color: '#979799' }}>{job.client_name} · ETB {job.budget_max?.toLocaleString()}</p>
                </div>
                <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'warning'} className="text-[8px] capitalize"
                  style={{ borderRadius: '9999px' }}>{job.status.replace('_', ' ')}</Badge>
              </div>
            ))}
            {(!data.recentJobs || data.recentJobs.length === 0) && (
              <p className="text-xs py-4 text-center" style={{ color: '#979799' }}>No jobs yet. Start bidding!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== CLIENT OVERVIEW ======
function ClientOverview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <ModernStatCard title="Total Spent" value={data.totalSpent} icon={<DollarSign size={18} />} trend={10.8} delay={0.1} isMoney />
        <ModernStatCard title="Open Jobs" value={data.openJobs} icon={<FileText size={18} />} trend={5.2} delay={0.15} />
        <ModernStatCard title="In Progress" value={data.inProgressJobs} icon={<Clock size={18} />} trend={-3.1} delay={0.2} />
        <ModernStatCard title="Completed" value={data.completedJobs} icon={<CheckCircle size={18} />} trend={18.5} delay={0.25} />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Job Status Overview</CardTitle><CardDescription>All your posted jobs</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total', value: data.totalJobs, color: '#173a32' },
                { label: 'Open', value: data.openJobs, color: '#1f6f5c' },
                { label: 'In Progress', value: data.inProgressJobs, color: '#777b86' },
                { label: 'Completed', value: data.completedJobs, color: '#173a32' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-2xl" style={{ backgroundColor: `${s.color}08` }}>
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#777b86' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: '#fafafb' }}>
              <span className="text-sm" style={{ color: '#777b86' }}>Avg Bids/Job</span>
              <span className="text-lg font-bold" style={{ color: '#173a32' }}>{data.avgBidsPerJob}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: '#fafafb' }}>
              <span className="text-sm" style={{ color: '#777b86' }}>Completion Rate</span>
              <span className="text-lg font-bold" style={{ color: '#173a32' }}>
                {data.totalJobs > 0 ? Math.round((data.completedJobs / data.totalJobs) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <CardHeader><CardTitle>Recent Jobs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.recentJobs || []).map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#fafafb] transition-all">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: job.status === 'completed' ? '#1f6f5c' : job.status === 'in_progress' ? '#173a32' : '#979799' }} />
                <div className="flex-1 min-w-0">
                  <Link to={`/jobs/${job.id}`} className="text-xs font-semibold truncate block hover:underline"
                    style={{ color: '#173a32' }}>{job.title}</Link>
                  <p className="text-[9px]" style={{ color: '#979799' }}>{job.bid_count} bids · ETB {job.budget_max?.toLocaleString()} max</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#173a32' }}>{job.freelancer_name || '—'}</span>
              </div>
            ))}
            {(!data.recentJobs || data.recentJobs.length === 0) && (
              <p className="text-xs py-4 text-center" style={{ color: '#979799' }}>No jobs posted yet. <Link to="/post-job" className="font-semibold underline" style={{ color: '#173a32' }}>Post your first job →</Link></p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== USER MESSAGES TAB ======
function UserMessagesTab({ data }) {
  if (!data) return null;
  const volumeChart = data.monthlyVolume?.map(m => ({ label: m.month.slice(5), value: m.count })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Messages', value: data.totalMessages, icon: <MessageSquare size={18} />, trend: 15.3 },
          { label: 'Sent', value: data.sentMessages, icon: <Upload size={18} />, trend: 8.7 },
          { label: 'Received', value: data.receivedMessages, icon: <Download size={18} />, trend: 5.2 },
          { label: 'Unread', value: data.unreadMessages, icon: <Clock size={18} />, trend: -3.2 },
        ].map((stat, i) => (
          <ModernStatCard key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} trend={stat.trend} delay={i * 0.1} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Message Volume</CardTitle><CardDescription>Your messages over time</CardDescription></CardHeader>
          <CardContent><LineChart data={volumeChart} height={200} color="#173a32" gradientId="userMsgG" formatter={v => `${v} msgs`} /></CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Top Conversations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.topConversations || []).map((conv, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-2xl hover:bg-[#fafafb]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: '#f2f2f3', color: '#173a32' }}>
                    {conv.peer_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: '#173a32' }}>{conv.peer_name}</p>
                    <p className="text-[9px]" style={{ color: '#979799' }}>{conv.msg_count} msgs</p>
                  </div>
                </div>
              ))}
              {(!data.topConversations || data.topConversations.length === 0) && <p className="text-xs py-4 text-center" style={{ color: '#979799' }}>No conversations yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====== ADMIN FINANCIAL TAB ======
function FinancialTab({ data, timeRange, chartView, setChartView, activeChart, setActiveChart }) {
  if (!data) return null;
  const monthlyChart = data.monthlyRevenue?.map(m => ({ label: m.month.slice(5), value: Math.round(Number(m.revenue)) })) || [];
  const totalRevenue = monthlyChart.reduce((s, d) => s + d.value, 0);
  const avgMonthly = monthlyChart.length > 0 ? Math.round(totalRevenue / monthlyChart.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <ModernStatCard title="Monthly Recurring Revenue" value={data.mrr} icon={<TrendingUp size={18} />} trend={data.growthRate} delay={0.1} isMoney />
        <ModernStatCard title="Annual Recurring Revenue" value={data.arr} icon={<BarChart3 size={18} />} trend={Math.round(data.growthRate * 0.8 * 10) / 10} delay={0.15} isMoney />
        <ModernStatCard title="Active Users (30d)" value={data.activeUsers} icon={<Users size={18} />} trend={8.2} delay={0.2} />
        <ModernStatCard title="Escrow Balance" value={data.escrowBalance} icon={<Lock size={18} />} trend={-3.1} delay={0.25} isMoney />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue trend ({timeRange})</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full p-0.5" style={{ backgroundColor: '#f2f2f3' }}>
                  {['line', 'bar'].map(v => (
                    <button key={v} onClick={() => setChartView(v)}
                      className="relative px-2.5 py-1 rounded-full text-[10px] font-medium capitalize"
                      style={{ color: chartView === v ? '#173a32' : '#777b86' }}>
                      {chartView === v && <motion.div layoutId="cv" className="absolute inset-0 rounded-full bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                      <span className="relative z-10">{v === 'line' ? <BarChart3 size={12} /> : <BarChart3 size={12} />}</span>
                    </button>
                  ))}
                </div>
                <div className="flex rounded-full p-0.5" style={{ backgroundColor: '#f2f2f3' }}>
                  {[{ id: 'revenue', label: 'Revenue' }, { id: 'growth', label: 'Growth' }].map(t => (
                    <button key={t.id} onClick={() => setActiveChart(t.id)}
                      className="relative px-3 py-1.5 rounded-full text-[10px] font-medium"
                      style={{ color: activeChart === t.id ? '#173a32' : '#777b86' }}>
                      {activeChart === t.id && <motion.div layoutId="ct" className="absolute inset-0 rounded-full bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeChart === 'revenue' ? (
              chartView === 'line' ? (
                <LineChart data={monthlyChart} height={230} color="#173a32" gradientId="revG" formatter={v => `ETB ${v.toLocaleString()}`} />
              ) : (
                <BarChart data={monthlyChart} height={230} color="#173a32" formatter={v => `ETB ${v.toLocaleString()}`} />
              )
            ) : (
              <div className="flex items-center justify-center h-[230px]">
                <div className="text-center">
                  <TrendingUp size={40} className="mx-auto mb-3" style={{ color: '#979799' }} />
                  <p className="text-3xl font-bold" style={{ color: '#173a32' }}>+{data.growthRate}%</p>
                  <p className="text-sm mt-1" style={{ color: '#777b86' }}>Month-over-Month Growth</p>
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-[#ececec] flex items-center justify-between text-xs" style={{ color: '#777b86' }}>
              <span>Total: <strong style={{ color: '#173a32' }}>ETB {totalRevenue.toLocaleString()}</strong></span>
              <span>Monthly avg: <strong style={{ color: '#173a32' }}>ETB {avgMonthly.toLocaleString()}</strong></span>
              <span>MoM: <strong style={{ color: data.growthRate >= 0 ? '#1f6f5c' : '#777b86' }}>{data.growthRate >= 0 ? '↑' : '↓'} {Math.abs(data.growthRate)}%</strong></span>
            </div>
          </CardContent>
        </Card>
        <div className="col-span-1">
          <div className="rounded-3xl bg-white p-6" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#173a32' }}>Platform Health</h3>
            <div className="space-y-3">
              {[
                { label: 'Avg. Job Value', value: monthlyChart.length > 0 ? `ETB ${avgMonthly.toLocaleString()}` : 'ETB 0', icon: <Briefcase size={16} /> },
                { label: 'Active Users', value: data.activeUsers?.toLocaleString(), icon: <Users size={16} /> },
                { label: 'Escrow Held', value: `ETB ${(data.escrowBalance || 0).toLocaleString()}`, icon: <Lock size={16} /> },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#fafafb' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3', color: '#173a32' }}>{m.icon}</div>
                  <div>
                    <p className="text-[10px] font-medium" style={{ color: '#979799' }}>{m.label}</p>
                    <p className="text-sm font-bold" style={{ color: '#173a32' }}>{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== ADMIN MESSAGES TAB ======
function AdminMessagesTab({ data }) {
  if (!data) return null;
  const volumeChart = data.monthlyVolume?.map(m => ({ label: m.month.slice(5), value: m.count })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Messages', value: data.totalMessages, icon: <MessageSquare size={18} />, trend: 15.3 },
          { label: 'Active Conversations', value: data.activeConversations, icon: <MessageSquare size={18} />, trend: 8.7 },
          { label: 'Unread Messages', value: data.unreadMessages, icon: <Clock size={18} />, trend: -3.2 },
          { label: 'Avg Response Time', value: '4.2 min', icon: <Clock size={18} />, trend: -12.5 },
        ].map((stat, i) => (
          <ModernStatCard key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} trend={stat.trend} delay={i * 0.1} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Message Volume</CardTitle><CardDescription>Monthly message count</CardDescription></CardHeader>
          <CardContent><LineChart data={volumeChart} height={200} color="#173a32" gradientId="msgG" formatter={v => `${v} msgs`} /></CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Top Conversations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.topConversations || []).map((conv, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-2xl hover:bg-[#fafafb]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: '#f2f2f3', color: '#173a32' }}>
                    {conv.user1?.[0]}{conv.user2?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: '#173a32' }}>{conv.user1} ↔ {conv.user2}</p>
                    <p className="text-[9px]" style={{ color: '#979799' }}>{conv.msg_count} msgs</p>
                  </div>
                  <Badge variant="success" className="text-[8px]" style={{ borderRadius: '9999px' }}>active</Badge>
                </div>
              ))}
              {(!data.topConversations || data.topConversations.length === 0) && <p className="text-xs py-4 text-center" style={{ color: '#979799' }}>No conversations yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====== PLATFORM TAB ======
function PlatformTab({ data }) {
  if (!data) return null;
  const userGrowthChart = data.userGrowth?.map(m => ({ label: m.month.slice(5), value: m.count })) || [];
  const gigGrowthChart = data.gigGrowth?.map(m => ({ label: m.month.slice(5), value: m.count })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <ModernStatCard title="Total Users" value={data.totalUsers} icon={<Users size={18} />} trend={15.2} delay={0.1} />
        <ModernStatCard title="Freelancers" value={data.totalFreelancers} icon={<Briefcase size={18} />} trend={12.8} delay={0.15} />
        <ModernStatCard title="Active Gigs" value={data.totalGigs} icon={<FileText size={18} />} trend={8.5} delay={0.2} />
        <ModernStatCard title="Total Jobs" value={data.totalJobs} icon={<Briefcase size={18} />} trend={5.3} delay={0.25} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>User Growth</CardTitle><CardDescription>New signups</CardDescription></CardHeader>
          <CardContent><LineChart data={userGrowthChart} height={200} color="#173a32" gradientId="userG" formatter={v => `${v} users`} /></CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Gig Growth</CardTitle><CardDescription>New gigs created</CardDescription></CardHeader>
          <CardContent><LineChart data={gigGrowthChart} height={200} color="#173a32" gradientId="gigG" formatter={v => `${v} gigs`} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====== PAYMENTS TAB ======
function PaymentsTab({ data }) {
  if (!data) return null;
  const monthlyVol = data.monthlyVolume?.map(m => ({ label: m.month.slice(5), value: Math.round(m.volume) })) || [];
  const statusData = data.statusBreakdown?.map(s => ({ label: s.status, value: s.count })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Volume', value: data.totalReleased + data.totalEscrow + data.totalRefunded, icon: <DollarSign size={18} />, trend: 0 },
          { label: 'In Escrow', value: data.totalEscrow, icon: <Lock size={18} />, trend: 0 },
          { label: 'Released', value: data.totalReleased, icon: <CheckCircle size={18} />, trend: 0 },
          { label: 'Refunded', value: data.totalRefunded, icon: <Upload size={18} />, trend: 0 },
        ].map((stat, i) => (
          <ModernStatCard key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} delay={i * 0.1} isMoney />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Monthly Payment Volume</CardTitle><CardDescription>Released + escrow per month</CardDescription></CardHeader>
          <CardContent><BarChart data={monthlyVol} height={200} color="#173a32" formatter={v => `ETB ${v.toLocaleString()}`} /></CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <DonutChart data={statusData} size={180} formatter={v => `${v} txns`} />
            <p className="text-xs text-center mt-2" style={{ color: '#979799' }}>Total: {data.transactionCount} transactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====== DISPUTES TAB ======
function DisputesTab({ data }) {
  if (!data) return null;
  const reviewsData = data.ratingDistribution?.map(r => ({ label: `${r.rating}`, value: r.count })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Total Disputes', value: data.totalDisputes, icon: <Scale size={18} />, trend: 0 },
          { label: 'Pending Review', value: data.pendingDisputes, icon: <Clock size={18} />, trend: 0 },
          { label: 'Avg Rating', value: data.avgRating || 0, icon: <Star size={18} />, trend: 0 },
          { label: 'Total Reviews', value: data.totalReviews, icon: <MessageSquare size={18} />, trend: 0 },
        ].map((stat, i) => (
          <ModernStatCard key={stat.label} title={stat.label}
            value={typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value}
            icon={stat.icon} delay={i * 0.1} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2" style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Dispute Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pending', count: data.pendingDisputes, color: '#1f6f5c' },
                { label: 'Resolved', count: data.resolvedDisputes, color: '#173a32' },
                { label: 'Total', count: data.totalDisputes, color: '#777b86' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-2xl" style={{ backgroundColor: `${s.color}08` }}>
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-xs mt-1" style={{ color: '#777b86' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: '24px', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <CardHeader><CardTitle>Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            <DonutChart data={reviewsData} size={180} formatter={v => `${v}`} />
            <p className="text-xs text-center mt-2" style={{ color: '#777b86' }}>
              {data.totalReviews > 0 ? `${data.avgRating} average` : 'No reviews yet'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====== MAIN ANALYTICS DASHBOARD ======
export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [activeChart, setActiveChart] = useState('revenue');
  const [chartView, setChartView] = useState('line');

  const isAdmin = user?.role === 'admin';
  const isFreelancer = user?.role === 'freelancer';
  const isClient = user?.role === 'client';

  const financial = useAnalyticsData(isAdmin ? range => adminAPI.getFinancialAnalytics(range) : null, timeRange);
  const messages = useAnalyticsData(isAdmin ? range => adminAPI.getMessagesAnalytics(range) : null, timeRange);
  const platform = useAnalyticsData(isAdmin ? range => adminAPI.getPlatformAnalytics(range) : null, timeRange);
  const payments = useAnalyticsData(isAdmin ? range => adminAPI.getPaymentsAnalytics(range) : null, timeRange);
  const disputes = useAnalyticsData(isAdmin ? range => adminAPI.getDisputesAnalytics(range) : null, timeRange);
  const userOverview = useAnalyticsData(!isAdmin ? range => userAnalyticsAPI.getOverview(range) : null, timeRange);
  const userMessages = useAnalyticsData(!isAdmin ? range => userAnalyticsAPI.getMessages(range) : null, timeRange);

  const adminTabs = [
    { id: 'financial', label: 'Financial', icon: <DollarSign size={14} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={14} /> },
    { id: 'platform', label: 'Platform', icon: <Activity size={14} /> },
    { id: 'payments', label: 'Payments', icon: <Shield size={14} /> },
    { id: 'disputes', label: 'Disputes', icon: <Scale size={14} /> },
  ];
  const freelancerTabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={14} /> },
  ];
  const clientTabs = [
    { id: 'overview', label: 'Overview', icon: <Briefcase size={14} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={14} /> },
  ];

  const activeTabs = isAdmin ? adminTabs : isFreelancer ? freelancerTabs : clientTabs;
  const tabIds = activeTabs.map(t => t.id);
  const safeMainTab = tabIds.includes(mainTab) ? mainTab : tabIds[0];

  const refetchMap = isAdmin
    ? { financial, messages, platform, payments, disputes }
    : { overview: userOverview, messages: userMessages };
  const handleRefresh = () => refetchMap[safeMainTab]?.refetch?.() || (() => {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2"
              style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
              {isAdmin ? 'Analytics Center' : 'My Analytics'}
            </h1>
            <Badge variant="success" className="text-[10px] px-2 py-0.5" style={{ borderRadius: '9999px' }}>Live</Badge>
            <Badge variant={isAdmin ? 'warning' : 'info'} className="text-[9px] px-2 py-0.5 capitalize" style={{ borderRadius: '9999px' }}>
              {isAdmin ? 'Admin' : isFreelancer ? 'Freelancer' : 'Client'}
            </Badge>
          </div>
          <p className="text-sm mt-1" style={{ color: '#777b86' }}>
            {isAdmin ? (
              safeMainTab === 'financial' ? 'MRR, ARR, daily balance & financial insights' :
              safeMainTab === 'messages' ? 'Platform-wide message volume & conversations' :
              safeMainTab === 'platform' ? 'Users, freelancers, gigs & marketplace health' :
              safeMainTab === 'payments' ? 'Payment volume, escrow tracking & transaction status' :
              'Dispute resolution & user review ratings'
            ) : (
              safeMainTab === 'overview' ? 'Your personal performance, earnings and activity' :
              'Your message volume & conversation stats'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <ExportDialog />
          <button onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ color: '#777b86' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ADMIN TABS */}
        {isAdmin && safeMainTab === 'financial' && (
          <motion.div key="financial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {financial.loading ? <LoadingSpinner text="Loading financial data..." /> :
             financial.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {financial.error}</div> :
             <FinancialTab data={financial.data} timeRange={timeRange} chartView={chartView} setChartView={setChartView} activeChart={activeChart} setActiveChart={setActiveChart} />}
          </motion.div>
        )}
        {isAdmin && safeMainTab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {messages.loading ? <LoadingSpinner text="Loading message data..." /> :
             messages.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {messages.error}</div> :
             <AdminMessagesTab data={messages.data} />}
          </motion.div>
        )}
        {isAdmin && safeMainTab === 'platform' && (
          <motion.div key="platform" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {platform.loading ? <LoadingSpinner text="Loading platform data..." /> :
             platform.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {platform.error}</div> :
             <PlatformTab data={platform.data} />}
          </motion.div>
        )}
        {isAdmin && safeMainTab === 'payments' && (
          <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {payments.loading ? <LoadingSpinner text="Loading payment data..." /> :
             payments.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {payments.error}</div> :
             <PaymentsTab data={payments.data} />}
          </motion.div>
        )}
        {isAdmin && safeMainTab === 'disputes' && (
          <motion.div key="disputes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {disputes.loading ? <LoadingSpinner text="Loading dispute data..." /> :
             disputes.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {disputes.error}</div> :
             <DisputesTab data={disputes.data} />}
          </motion.div>
        )}

        {/* FREELANCER TABS */}
        {isFreelancer && safeMainTab === 'overview' && (
          <motion.div key="f-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {userOverview.loading ? <LoadingSpinner text="Loading your analytics..." /> :
             userOverview.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {userOverview.error}</div> :
             <FreelancerOverview data={userOverview.data} />}
          </motion.div>
        )}
        {isFreelancer && safeMainTab === 'messages' && (
          <motion.div key="f-messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {userMessages.loading ? <LoadingSpinner text="Loading messages..." /> :
             userMessages.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {userMessages.error}</div> :
             <UserMessagesTab data={userMessages.data} />}
          </motion.div>
        )}

        {/* CLIENT TABS */}
        {isClient && safeMainTab === 'overview' && (
          <motion.div key="c-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {userOverview.loading ? <LoadingSpinner text="Loading your analytics..." /> :
             userOverview.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {userOverview.error}</div> :
             <ClientOverview data={userOverview.data} />}
          </motion.div>
        )}
        {isClient && safeMainTab === 'messages' && (
          <motion.div key="c-messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {userMessages.loading ? <LoadingSpinner text="Loading messages..." /> :
             userMessages.error ? <div className="text-center py-12" style={{ color: '#1f6f5c' }}><AlertTriangle size={24} className="mx-auto mb-2" /> {userMessages.error}</div> :
             <UserMessagesTab data={userMessages.data} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB NAVIGATION — BOTTOM */}
      <div className="flex gap-1 p-1 rounded-full sticky bottom-0" style={{ backgroundColor: '#f2f2f3', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
        {activeTabs.map(tab => (
          <button key={tab.id} onClick={() => setMainTab(tab.id)}
            className="relative flex-1 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 text-center"
            style={{ color: safeMainTab === tab.id ? '#173a32' : '#777b86' }}>
            {safeMainTab === tab.id && (
              <motion.div layoutId="analyticsMainTab" className="absolute inset-0 rounded-full bg-white z-0"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {tab.icon}
              <span className="text-sm font-semibold">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

    </motion.div>
  );
}
