import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { businessAPI } from '../utils/api';
import VideoCallModal from '../components/VideoCallModal';
import {
  BarChart3, TrendingUp, Users, Target, DollarSign, Calendar, UserPlus, FileText,
  Briefcase, Phone, Monitor, Plus, X, Edit2, Trash2, Check, Clock, Building2,
  Mail, Phone as PhoneIcon, MapPin, Search, ChevronLeft, ChevronRight, Download,
  Video, Mic, Activity, RefreshCw,
} from 'lucide-react';

// ====== KPI CARD ======
function KPICard({ title, value, icon, color = '#17191c', trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl bg-white p-5 relative overflow-hidden group hover:shadow-md transition-all cursor-default"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}12`, color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? '' : ''}`}
            style={{ color: trend >= 0 ? '#5d2a1a' : '#777b86' }}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: '#17191c' }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: '#777b86' }}>{title}</p>
    </motion.div>
  );
}

// ====== TAB BUTTON ======
function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`relative px-4 py-3 rounded-2xl text-sm font-medium transition-all flex items-center gap-2 ${
        active ? '' : 'hover:opacity-80'
      }`}
      style={{ color: active ? '#17191c' : '#777b86', backgroundColor: active ? '#ffffff' : 'transparent' }}>
      {icon} {label}
    </button>
  );
}

// ====== MODAL ======
function FormModal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(23,25,28,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 20px 25px -5px rgba(0,0,0,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#17191c' }}>{title}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f2f2f3] transition-all">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ====== ANIMATED COUNTER ======
function CountUp({ value, duration = 1.5 }) {
  const [display, setDisplay] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (!value) return;
    const target = Number(value);
    const startTime = Date.now();
    const animate = () => {
      if (!mountedRef.current) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { mountedRef.current = false; };
  }, [value, duration]);
  return <span>{Math.round(display).toLocaleString()}</span>;
}

// ====== OVERVIEW TAB ======
function OverviewTab({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard title="Total Customers" value={<CountUp value={data.totalCustomers} />} icon={<Users size={18} />} color="#17191c" delay={0.1} />
        <KPICard title="Total Invoiced" value={`ETB ${(data.totalInvoiced || 0).toLocaleString()}`} icon={<DollarSign size={18} />} color="#5d2a1a" delay={0.15} />
        <KPICard title="Pending Invoices" value={`ETB ${(data.pendingInvoices || 0).toLocaleString()}`} icon={<FileText size={18} />} color="#777b86" delay={0.2} />
        <KPICard title="Upcoming Meetings" value={<CountUp value={data.upcomingMeetings} />} icon={<Calendar size={18} />} color="#17191c" delay={0.25} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><Building2 size={16} /> Platform Overview</h3>
          <div className="space-y-3">
            {[
              { label: 'Total Users', value: data.platformTotalUsers, color: '#17191c' },
              { label: 'Freelancers', value: data.platformTotalFreelancers, color: '#5d2a1a' },
              { label: 'Clients', value: data.platformTotalClients, color: '#777b86' },
              { label: 'Total Transactions', value: data.platformTotalTransactions, color: '#17191c' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: `${s.color}08` }}>
                <span className="text-sm" style={{ color: '#777b86' }}>{s.label}</span>
                <span className="text-lg font-bold" style={{ color: s.color }}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><Target size={16} /> Business Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: '#777b86' }}>Customer Retention</span>
                <span className="font-bold" style={{ color: '#17191c' }}>{data.totalCustomers > 0 ? Math.round((data.activeCustomers / data.totalCustomers) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${data.totalCustomers > 0 ? (data.activeCustomers / data.totalCustomers) * 100 : 0}%` }}
                  className="h-full rounded-full" style={{ backgroundColor: '#17191c' }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: '#777b86' }}>Payment Collection</span>
                <span className="font-bold" style={{ color: '#17191c' }}>{data.totalInvoiced > 0 ? Math.round((data.totalPaid / data.totalInvoiced) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${data.totalInvoiced > 0 ? (data.totalPaid / data.totalInvoiced) * 100 : 0}%` }}
                  className="h-full rounded-full" style={{ backgroundColor: '#5d2a1a' }} transition={{ duration: 1, delay: 0.5 }} />
              </div>
            </div>
            <div className="pt-3 border-t border-[#ececec]">
              <p className="text-sm" style={{ color: '#777b86' }}>Platform Revenue <span className="font-bold" style={{ color: '#17191c' }}>ETB {(data.platformTotalRevenue || 0).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== COMPETITORS TAB ======
function CompetitorsTab({ data }) {
  if (!data) return null;
  const { topFreelancers, categoryDistribution, avgPrices, marketInsights } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <KPICard title="Active Gigs" value={marketInsights?.totalActiveGigs || 0} icon={<Briefcase size={18} />} color="#17191c" />
        <KPICard title="Avg Gig Price" value={`ETB ${(marketInsights?.avgGigPrice || 0).toLocaleString()}`} icon={<DollarSign size={18} />} color="#5d2a1a" />
        <KPICard title="Top Category" value={marketInsights?.highestDemandCategory || 'N/A'} icon={<Target size={18} />} color="#777b86" />
        <KPICard title="Top Freelancers" value={topFreelancers?.length || 0} icon={<Users size={18} />} color="#17191c" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="rounded-3xl bg-white p-5 col-span-2" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><BarChart3 size={16} /> Category Distribution</h3>
          <div className="space-y-3">
            {(categoryDistribution || []).slice(0, 8).map((cat, i) => {
              const maxCount = Math.max(...(categoryDistribution || []).map(c => c.count), 1);
              const colors = ['#17191c', '#5d2a1a', '#777b86', '#17191c', '#5d2a1a', '#777b86', '#17191c', '#5d2a1a'];
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: '#777b86' }}>{cat.category}</span>
                    <span className="font-bold" style={{ color: '#17191c' }}>{cat.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.count / maxCount) * 100}%` }}
                      className="h-full rounded-full" style={{ backgroundColor: colors[i % colors.length] }}
                      transition={{ duration: 0.8, delay: i * 0.05 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><Target size={16} /> Top Freelancers</h3>
          <div className="space-y-2">
            {(topFreelancers || []).slice(0, 5).map((f, i) => (
              <div key={f.full_name} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#fafafb] transition-all">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>
                  {f.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#17191c' }}>{f.full_name}</p>
                  <p className="text-[10px]" style={{ color: '#979799' }}>{f.city || '—'} · {f.rating?.toFixed(1)}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: f.verified ? '#fbe1d1' : '#f2f2f3', color: f.verified ? '#5d2a1a' : '#777b86' }}>
                  {f.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><TrendingUp size={16} /> Market Pricing by Category</h3>
        <div className="grid grid-cols-4 gap-4">
          {(avgPrices || []).slice(0, 8).map((cat, i) => {
            const colors = ['#17191c', '#5d2a1a', '#777b86', '#17191c', '#5d2a1a', '#777b86', '#17191c', '#5d2a1a'];
            return (
              <div key={cat.category} className="text-center p-3 rounded-2xl" style={{ backgroundColor: `${colors[i % 8]}08` }}>
                <p className="text-xs font-medium" style={{ color: '#777b86' }}>{cat.category}</p>
                <p className="text-lg font-bold mt-1" style={{ color: colors[i % 8] }}>
                  ETB {Math.round(cat.avg_price || 0).toLocaleString()}
                </p>
                <p className="text-[9px]" style={{ color: '#979799' }}>{cat.count} gigs</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ====== TRANSACTIONS TAB ======
function TransactionsTab({ data }) {
  const transactions = data?.transactions || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                {['Job', 'Client', 'Freelancer', 'Amount', 'Status', 'Reference', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#777b86' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#979799' }}>No transactions yet</td></tr>
              ) : transactions.map((txn, i) => (
                <motion.tr key={txn.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-all">
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#17191c' }}>{txn.job_title}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{txn.client_name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{txn.freelancer_name}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#5d2a1a' }}>ETB {txn.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: txn.status === 'released' ? '#fbe1d1' : txn.status === 'escrow' ? '#f2f2f3' : txn.status === 'disputed' ? '#fbe1d1' : '#f2f2f3',
                        color: txn.status === 'released' ? '#5d2a1a' : txn.status === 'disputed' ? '#5d2a1a' : '#777b86'
                      }}>{txn.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#979799' }}>{txn.telebirr_reference || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#979799' }}>{new Date(txn.created_at).toLocaleDateString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: '#777b86' }}>Page {pagination.page} of {pagination.pages}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-full border transition-all hover:bg-[#f2f2f3]" style={{ borderColor: '#ececec', color: '#777b86' }}><ChevronLeft size={14} /></button>
            <button className="px-3 py-1.5 rounded-full border transition-all hover:bg-[#f2f2f3]" style={{ borderColor: '#ececec', color: '#777b86' }}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== CUSTOMERS TAB ======
function CustomersTab({ data, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const customers = (data || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) await businessAPI.updateCustomer(editId, form);
      else await businessAPI.createCustomer(form);
      onRefresh();
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', email: '', phone: '', company: '', notes: '' });
    } catch {} finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', notes: c.notes || '' });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await businessAPI.deleteCustomer(id); onRefresh(); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#979799' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
        </div>
        <button onClick={() => { setEditId(null); setForm({ name: '', email: '', phone: '', company: '', notes: '' }); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
          <Plus size={14} /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {customers.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-3xl bg-white p-5 transition-all group"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>
                  {c.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#17191c' }}>{c.name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: c.status === 'active' ? '#fbe1d1' : c.status === 'lead' ? '#f2f2f3' : '#f2f2f3', color: c.status === 'active' ? '#5d2a1a' : '#777b86' }}>
                    {c.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f2f2f3]"><Edit2 size={12} /></button>
                <button onClick={() => handleDelete(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#fbe1d1]" style={{ color: '#5d2a1a' }}><Trash2 size={12} /></button>
              </div>
            </div>
            {c.company && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: '#777b86' }}><Building2 size={10} /> {c.company}</p>}
            {c.email && <p className="text-xs flex items-center gap-1" style={{ color: '#979799' }}><Mail size={10} /> {c.email}</p>}
            {c.phone && <p className="text-xs flex items-center gap-1" style={{ color: '#979799' }}><PhoneIcon size={10} /> {c.phone}</p>}
            <div className="mt-3 pt-3 border-t border-[#f2f2f3] flex items-center justify-between text-[10px]" style={{ color: '#979799' }}>
              <span>Spent: <strong className={c.total_spent > 0 ? '' : ''} style={{ color: c.total_spent > 0 ? '#17191c' : '#979799' }}>ETB {(c.total_spent || 0).toLocaleString()}</strong></span>
              <span>{c.projects_count || 0} projects</span>
            </div>
          </motion.div>
        ))}
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Customer Name *"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email"
              className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
              style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
              onFocus={e => e.target.style.borderColor = '#17191c'}
              onBlur={e => e.target.style.borderColor = '#ececec'} />
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone"
              className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
              style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
              onFocus={e => e.target.style.borderColor = '#17191c'}
              onBlur={e => e.target.style.borderColor = '#ececec'} />
          </div>
          <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" rows={2}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all resize-none"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            {saving ? 'Saving...' : editId ? 'Update Customer' : 'Add Customer'}
          </button>
        </form>
      </FormModal>
    </div>
  );
}

// ====== MEETINGS TAB ======
function MeetingsTab({ data, onRefresh, onStartCall }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', duration: 30, customerId: '', meetingType: 'video' });
  const meetings = data?.meetings || [];
  const upcoming = meetings.filter(m => m.status === 'scheduled' && new Date(m.date) > new Date());
  const past = meetings.filter(m => m.status !== 'scheduled' || new Date(m.date) <= new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    try {
      await businessAPI.createMeeting({ ...form, customerId: form.customerId || null });
      onRefresh();
      setShowForm(false);
      setForm({ title: '', description: '', date: '', duration: 30, customerId: '', meetingType: 'video' });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: '#17191c' }}>Upcoming Meetings ({upcoming.length})</h3>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>

      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
            <Calendar size={24} className="mx-auto mb-2" style={{ color: '#d0d0d0' }} />
            <p className="text-sm" style={{ color: '#979799' }}>No upcoming meetings</p>
          </div>
        ) : upcoming.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-3xl bg-white p-5 flex items-center justify-between group hover:shadow-sm transition-all"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: '#17191c' }}>
                <Calendar size={20} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: '#17191c' }}>{m.title}</p>
                <p className="text-xs" style={{ color: '#777b86' }}>
                  {new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {m.duration}min
                </p>
                {m.customer_name && <p className="text-[10px]" style={{ color: '#979799' }}>with {m.customer_name}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              {m.meeting_type === 'video' && (
                <button onClick={() => onStartCall(m.title, m.customer_name || 'Meeting Participant')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all"
                  style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                  <Video size={14} /> Join
                </button>
              )}
              <button className="px-3 py-2 rounded-full transition-all" style={{ backgroundColor: '#fafafb', color: '#777b86' }}>
                <Phone size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h3 className="font-semibold mt-6" style={{ color: '#17191c' }}>Past Meetings ({past.length})</h3>
          <div className="space-y-2">
            {past.slice(0, 5).map(m => (
              <div key={m.id} className="rounded-2xl p-3 flex items-center justify-between" style={{ backgroundColor: '#fafafb', border: '1px solid #ececec' }}>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.status === 'completed' ? '#5d2a1a' : '#979799' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#17191c' }}>{m.title}</p>
                    <p className="text-[10px]" style={{ color: '#979799' }}>{new Date(m.date).toLocaleDateString()} · {m.status}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{ backgroundColor: m.status === 'completed' ? '#fbe1d1' : '#f2f2f3', color: m.status === 'completed' ? '#5d2a1a' : '#777b86' }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Schedule Meeting">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Meeting Title *"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <input required type="datetime-local" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value) || 30})} placeholder="Duration (min)"
              className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
              style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
              onFocus={e => e.target.style.borderColor = '#17191c'}
              onBlur={e => e.target.style.borderColor = '#ececec'} />
            <select value={form.meetingType} onChange={e => setForm({...form, meetingType: e.target.value})}
              className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none bg-white"
              style={{ border: '1px solid #ececec', color: '#17191c' }}>
              <option value="video">Video Call</option>
              <option value="phone">Phone</option>
              <option value="in_person">In Person</option>
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all resize-none"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <button type="submit"
            className="w-full py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            Schedule Meeting
          </button>
        </form>
      </FormModal>
    </div>
  );
}

// ====== TEAM TAB ======
function TeamTab({ data, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberName: '', memberEmail: '', role: 'member' });
  const [editId, setEditId] = useState(null);
  const team = data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberName) return;
    try {
      if (editId) await businessAPI.updateTeamMember(editId, form);
      else await businessAPI.createTeamMember(form);
      onRefresh();
      setShowForm(false);
      setEditId(null);
      setForm({ memberName: '', memberEmail: '', role: 'member' });
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this team member?')) return;
    try { await businessAPI.deleteTeamMember(id); onRefresh(); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: '#17191c' }}>Team Members ({team.length})</h3>
        <button onClick={() => { setEditId(null); setForm({ memberName: '', memberEmail: '', role: 'member' }); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
          <UserPlus size={14} /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {team.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-3xl bg-white p-5 transition-all group"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                  {m.member_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#17191c' }}>{m.member_name}</p>
                  <p className="text-[10px] capitalize" style={{ color: '#979799' }}>{m.role}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setForm({ memberName: m.member_name, memberEmail: m.member_email || '', role: m.role }); setEditId(m.id); setShowForm(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f2f2f3]"><Edit2 size={12} /></button>
                <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#fbe1d1]" style={{ color: '#5d2a1a' }}><Trash2 size={12} /></button>
              </div>
            </div>
            {m.member_email && <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#979799' }}><Mail size={10} /> {m.member_email}</p>}
            <div className="mt-3 pt-3 border-t border-[#f2f2f3] flex items-center justify-between text-[10px]">
              <span className="px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: m.status === 'active' ? '#fbe1d1' : '#f2f2f3', color: m.status === 'active' ? '#5d2a1a' : '#777b86' }}>
                {m.status}
              </span>
              <span style={{ color: '#979799' }}>Joined {new Date(m.joined_at).toLocaleDateString()}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Member' : 'Add Team Member'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.memberName} onChange={e => setForm({...form, memberName: e.target.value})} placeholder="Member Name *"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <input type="email" value={form.memberEmail} onChange={e => setForm({...form, memberEmail: e.target.value})} placeholder="Email"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none bg-white"
            style={{ border: '1px solid #ececec', color: '#17191c' }}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit"
            className="w-full py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            {editId ? 'Update Member' : 'Add Member'}
          </button>
        </form>
      </FormModal>
    </div>
  );
}

// ====== INVOICES TAB ======
function InvoicesTab({ data, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: '', amount: '', dueDate: '', notes: '' });
  const invoices = data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    try {
      await businessAPI.createInvoice({ ...form, amount: parseFloat(form.amount), lineItems: [] });
      onRefresh();
      setShowForm(false);
      setForm({ customerId: '', amount: '', dueDate: '', notes: '' });
    } catch {}
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await businessAPI.updateInvoice(id, { status, paidDate: status === 'paid' ? new Date().toISOString() : null });
      onRefresh();
    } catch {}
  };

  const statusColors = {
    paid: { bg: '#fbe1d1', text: '#5d2a1a' },
    pending: { bg: '#f2f2f3', text: '#777b86' },
    overdue: { bg: '#fbe1d1', text: '#5d2a1a' },
    cancelled: { bg: '#f2f2f3', text: '#777b86' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: '#17191c' }}>Invoices ({invoices.length})</h3>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
          <Plus size={14} /> Create Invoice
        </button>
      </div>

      <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
              {['Invoice #', 'Customer', 'Amount', 'Status', 'Due Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase" style={{ color: '#777b86' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#979799' }}>No invoices yet</td></tr>
            ) : invoices.map((inv, i) => (
              <tr key={inv.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-all">
                <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: '#17191c' }}>{inv.invoice_number}</td>
                <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{inv.customer_name || '—'}</td>
                <td className="px-4 py-3 text-sm font-bold" style={{ color: '#5d2a1a' }}>ETB {(inv.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: (statusColors[inv.status] || statusColors.pending).bg, color: (statusColors[inv.status] || statusColors.pending).text }}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#979799' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {inv.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusUpdate(inv.id, 'paid')} className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-[#fbe1d1]" style={{ backgroundColor: '#f2f2f3', color: '#5d2a1a' }}><Check size={12} /></button>
                        <button onClick={() => handleStatusUpdate(inv.id, 'cancelled')} className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-[#fbe1d1]" style={{ backgroundColor: '#f2f2f3', color: '#5d2a1a' }}><X size={12} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Invoice">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Amount (ETB) *"
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" rows={2}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all resize-none"
            style={{ border: '1px solid #ececec', color: '#17191c', backgroundColor: '#ffffff' }}
            onFocus={e => e.target.style.borderColor = '#17191c'}
            onBlur={e => e.target.style.borderColor = '#ececec'} />
          <button type="submit"
            className="w-full py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            Create Invoice
          </button>
        </form>
      </FormModal>
    </div>
  );
}

// ====== REVENUE TAB ======
function RevenueTab({ data }) {
  if (!data) return null;
  const { monthly, categoryRevenue } = data;
  const maxRevenue = Math.max(...(monthly || []).map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-5">
        <KPICard title="Total Revenue (12mo)" value={`ETB ${(data.totalRevenue || 0).toLocaleString()}`} icon={<DollarSign size={18} />} color="#17191c" trend={12.5} />
        <KPICard title="Total Transactions" value={data.totalTransactions || 0} icon={<BarChart3 size={18} />} color="#5d2a1a" trend={8.3} />
        <KPICard title="Avg Monthly Revenue" value={`ETB ${monthly?.length > 0 ? Math.round(data.totalRevenue / monthly.length).toLocaleString() : 0}`} icon={<TrendingUp size={18} />} color="#777b86" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#17191c' }}><TrendingUp size={16} /> Monthly Revenue</h3>
          <div className="flex items-end gap-2" style={{ height: 200 }}>
            {(monthly || []).map((m, i) => {
              const height = (m.revenue / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px]" style={{ color: '#979799' }}>ETB {Math.round(m.revenue / 1000)}k</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="w-full rounded-t-lg" style={{ background: 'linear-gradient(180deg, #17191c, #5d2a1a)', minHeight: 4 }} />
                  <span className="text-[8px]" style={{ color: '#979799' }}>{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#17191c' }}>Revenue by Category</h3>
          <div className="space-y-3">
            {(categoryRevenue || []).slice(0, 6).map((cat, i) => {
              const maxCat = Math.max(...(categoryRevenue || []).map(c => c.total), 1);
              const colors = ['#17191c', '#5d2a1a', '#777b86', '#17191c', '#5d2a1a', '#777b86'];
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span style={{ color: '#777b86' }}>{cat.category}</span>
                    <span className="font-bold" style={{ color: '#17191c' }}>ETB {Math.round(cat.total / 1000)}k</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.total / maxCat) * 100}%` }}
                      className="h-full rounded-full" style={{ backgroundColor: colors[i % colors.length] }}
                      transition={{ duration: 0.8, delay: i * 0.05 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== VIDEO CALL TAB ======
function VideoCallTab({ onStartCall }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl mb-6"
        style={{ backgroundColor: '#17191c' }}>
        <Video size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#17191c', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>Live Video Meetings</h2>
      <p className="text-sm mb-8 max-w-md text-center" style={{ color: '#777b86' }}>
        Start a video call with screen sharing capabilities. Share your screen, collaborate in real-time, and conduct business meetings directly in your browser.
      </p>
      <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-lg">
        {[
          { icon: <Video size={18} />, label: 'HD Video Call', desc: 'Face-to-face meetings' },
          { icon: <Monitor size={18} />, label: 'Screen Sharing', desc: 'Share your entire screen' },
          { icon: <Mic size={18} />, label: 'Clear Audio', desc: 'Noise-cancelling mic' },
        ].map(f => (
          <div key={f.label} className="text-center p-4 rounded-3xl bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
            <span className="block mb-2" style={{ color: '#17191c' }}>{f.icon}</span>
            <p className="text-xs font-semibold" style={{ color: '#17191c' }}>{f.label}</p>
            <p className="text-[9px]" style={{ color: '#979799' }}>{f.desc}</p>
          </div>
        ))}
      </div>
      <button onClick={() => onStartCall('Instant Business Meeting', 'Business Partner')}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-base font-medium transition-all"
        style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
        <Video size={20} /> Start a Meeting
      </button>
    </div>
  );
}

// ====== MAIN BUSINESS DASHBOARD ======
export default function BusinessDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [team, setTeam] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoCall, setVideoCall] = useState({ open: false, title: '', participant: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, compRes, txnRes, custRes, meetRes, teamRes, invRes, revRes] = await Promise.all([
        businessAPI.getOverview(),
        businessAPI.getCompetitors(),
        businessAPI.getTransactions({ limit: 20 }),
        businessAPI.getCustomers(),
        businessAPI.getMeetings(),
        businessAPI.getTeam(),
        businessAPI.getInvoices(),
        businessAPI.getRevenue(),
      ]);
      setOverview(overviewRes.data.overview);
      setCompetitors(compRes.data.competitors);
      setTransactions(txnRes.data);
      setCustomers(custRes.data.customers || []);
      setMeetings(meetRes.data.meetings || []);
      setTeam(teamRes.data.team || []);
      setInvoices(invRes.data.invoices || []);
      setRevenue(revRes.data.revenue);
    } catch (err) {
      console.error('Failed to fetch business data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStartCall = (title, participant) => {
    setVideoCall({ open: true, title, participant });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'competitors', label: 'Competitors', icon: <Target size={14} /> },
    { id: 'transactions', label: 'Transactions', icon: <DollarSign size={14} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={14} /> },
    { id: 'meetings', label: 'Meetings', icon: <Calendar size={14} /> },
    { id: 'team', label: 'Team', icon: <UserPlus size={14} /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText size={14} /> },
    { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={14} /> },
    { id: 'videocall', label: 'Video Call', icon: <Monitor size={14} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <motion.div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#f2f2f3' }}
            animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Activity size={24} style={{ color: '#777b86' }} />
          </motion.div>
          <p className="animate-pulse font-medium" style={{ color: '#777b86' }}>Loading business dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#17191c', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
            Business Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#777b86' }}>Manage customers, track competitors, schedule meetings, and grow your business</p>
        </div>
        <button onClick={fetchAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:bg-[#f2f2f3]"
          style={{ color: '#777b86' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 p-1 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
        {tabs.map(tab => (
          <TabButton key={tab.id} {...tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview' && <OverviewTab data={overview} />}
          {activeTab === 'competitors' && <CompetitorsTab data={competitors} />}
          {activeTab === 'transactions' && <TransactionsTab data={transactions} />}
          {activeTab === 'customers' && <CustomersTab data={customers} onRefresh={fetchAll} />}
          {activeTab === 'meetings' && <MeetingsTab data={{ meetings }} onRefresh={fetchAll} onStartCall={handleStartCall} />}
          {activeTab === 'team' && <TeamTab data={team} onRefresh={fetchAll} />}
          {activeTab === 'invoices' && <InvoicesTab data={invoices} onRefresh={fetchAll} />}
          {activeTab === 'revenue' && <RevenueTab data={revenue} />}
          {activeTab === 'videocall' && <VideoCallTab onStartCall={handleStartCall} />}
        </motion.div>
      </AnimatePresence>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={videoCall.open}
        onClose={() => setVideoCall({ open: false, title: '', participant: '' })}
        meetingTitle={videoCall.title}
        participantName={videoCall.participant}
      />
    </motion.div>
  );
}
