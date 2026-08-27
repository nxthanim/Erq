import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { adsAPI } from '../utils/api';
import {
  Megaphone, Plus, Target, Eye, MousePointerClick, DollarSign,
  BarChart3, RefreshCw, Trash2, Play, Pause, Globe, X, TrendingUp,
  Clock, CheckCircle, AlertCircle, ExternalLink, ChevronRight,
  Image, Sparkles, Zap, Users,
} from 'lucide-react';

const STATUS_META = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7', icon: <Clock size={12} /> },
  active: { label: 'Active', color: '#047857', bg: '#d1fae5', icon: <Play size={12} /> },
  paused: { label: 'Paused', color: '#1d4ed8', bg: '#dbeafe', icon: <Pause size={12} /> },
  completed: { label: 'Completed', color: '#6b7280', bg: '#f3f4f6', icon: <CheckCircle size={12} /> },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2', icon: <AlertCircle size={12} /> },
};

function StatCard({ title, value, icon, sub, loading }) {
  return (
    <div className="rounded-3xl bg-white p-5 relative overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)' }}>
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: 'linear-gradient(90deg, #173a32, #e7f5ef)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3', color: '#173a32' }}>
          {icon}
        </div>
        {sub && <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>{sub}</span>}
      </div>
      {loading ? (
        <div className="h-8 w-20 rounded animate-pulse" style={{ backgroundColor: '#f2f2f3' }} />
      ) : (
        <p className="text-2xl font-bold" style={{ color: '#173a32' }}>{value}</p>
      )}
      <p className="text-sm mt-0.5" style={{ color: '#777b86' }}>{title}</p>
    </div>
  );
}

export default function AdManager() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    platform: 'facebook',
    title: '',
    description: '',
    target_url: '',
    target_audience: '',
    budget: '',
    daily_budget: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      adsAPI.list(),
      adsAPI.stats(),
    ]).then(([a, s]) => {
      setAds(a.data.ads || []);
      setStats(s.data.stats || null);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Give your ad a title'); return; }
    setSaving(true);
    try {
      await adsAPI.create({
        platform: form.platform,
        title: form.title.trim(),
        description: form.description.trim(),
        target_url: form.target_url.trim(),
        target_audience: form.target_audience.trim(),
        budget: Number(form.budget) || 0,
        daily_budget: Number(form.daily_budget) || 0,
      });
      setShowForm(false);
      setForm({ platform: 'facebook', title: '', description: '', target_url: '', target_audience: '', budget: '', daily_budget: '' });
      load();
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to create ad');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (ad) => {
    const newStatus = ad.status === 'active' ? 'paused' : 'active';
    try {
      await adsAPI.update(ad.id, { status: newStatus });
      load();
    } catch {}
  };

  const deleteAd = async (id) => {
    try {
      await adsAPI.delete(id);
      load();
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
              Ad Manager
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>
              Free
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: '#777b86' }}>
            Create and manage your ad campaigns. Pay in ETB. No fees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ color: '#777b86', border: '1px solid #ececec' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
            <Plus size={15} /> Create Ad
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Campaigns" value={stats?.total || 0} icon={<Megaphone size={18} />} sub="All time" loading={loading} />
        <StatCard title="Active Ads" value={stats?.active || 0} icon={<Play size={18} />} sub="Running" loading={loading} />
        <StatCard title="Total Impressions" value={(stats?.total_impressions || 0).toLocaleString()} icon={<Eye size={18} />} loading={loading} />
        <StatCard title="CTR" value={stats?.ctr ? `${stats.ctr}%` : '0%'} icon={<MousePointerClick size={18} />} sub="Click rate" loading={loading} />
      </div>

      {/* Create Ad Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }}
            className="rounded-3xl bg-white p-6 overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: '#173a32' }}>Create New Ad Campaign</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f2f2f3] transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="px-4 py-3 text-sm rounded-2xl" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                  {formError}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Platform</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'facebook', label: 'Facebook & Instagram', icon: <Globe size={16} /> },
                      { id: 'google', label: 'Google', icon: <Target size={16} /> },
                    ].map(p => (
                      <button key={p.id} type="button" onClick={() => setForm({...form, platform: p.id})}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          backgroundColor: form.platform === p.id ? '#173a32' : '#f2f2f3',
                          color: form.platform === p.id ? '#ffffff' : '#777b86',
                          border: form.platform === p.id ? 'none' : '1px solid transparent',
                        }}>
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Target Audience</label>
                  <input
                    type="text" value={form.target_audience}
                    onChange={e => setForm({...form, target_audience: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ borderColor: '#ececec', outline: 'none' }}
                    placeholder="e.g. Addis Ababa, 18-35, entrepreneurs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Ad Title *</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ borderColor: '#ececec', outline: 'none' }}
                  placeholder="e.g. Get 50% off logo design services"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border resize-none"
                  style={{ borderColor: '#ececec', outline: 'none', minHeight: '80px' }}
                  placeholder="Describe what you're promoting..."
                  maxLength={500}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Target URL (optional)</label>
                  <input
                    type="url" value={form.target_url}
                    onChange={e => setForm({...form, target_url: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ borderColor: '#ececec', outline: 'none' }}
                    placeholder="https://erq.et/your-gig"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Total Budget (ETB)</label>
                  <input
                    type="number" min="0" value={form.budget}
                    onChange={e => setForm({...form, budget: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ borderColor: '#ececec', outline: 'none' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Daily Budget (ETB)</label>
                  <input
                    type="number" min="0" value={form.daily_budget}
                    onChange={e => setForm({...form, daily_budget: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border"
                    style={{ borderColor: '#ececec', outline: 'none' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
                  style={{ backgroundColor: '#173a32', color: '#ffffff', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Creating...' : 'Create Ad Campaign'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ads list */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-3xl bg-white p-5 animate-pulse" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)' }}>
                <div className="h-5 w-48 rounded bg-[#f2f2f3] mb-3" />
                <div className="h-3 w-32 rounded bg-[#f2f2f3]" />
              </div>
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)' }}>
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f2f2f3' }}>
              <Megaphone size={28} style={{ color: '#777b86' }} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: '#173a32' }}>No campaigns yet</h3>
            <p className="text-sm mb-6" style={{ color: '#777b86' }}>
              Launch your first ad campaign to reach more customers. Pay in ETB, no fees.
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
              <Plus size={16} /> Create Your First Ad
            </button>
          </div>
        ) : (
          ads.map(ad => {
            const meta = STATUS_META[ad.status] || STATUS_META.pending;
            return (
              <motion.div key={ad.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-5" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold truncate" style={{ color: '#173a32' }}>{ad.title}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ color: meta.color, backgroundColor: meta.bg }}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    {ad.description && (
                      <p className="text-sm truncate mb-2" style={{ color: '#777b86' }}>{ad.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#979799' }}>
                      <span className="flex items-center gap-1 capitalize"><Globe size={12} /> {ad.platform}</span>
                      {ad.target_audience && <span className="flex items-center gap-1"><Users size={12} /> {ad.target_audience}</span>}
                      {ad.target_url && <span className="flex items-center gap-1"><ExternalLink size={12} /> {ad.target_url}</span>}
                      <span className="flex items-center gap-1"><DollarSign size={12} /> ETB {Number(ad.budget || 0).toLocaleString()}</span>
                      {Number(ad.daily_budget) > 0 && <span>· ETB {Number(ad.daily_budget).toLocaleString()}/day</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Impressions / clicks */}
                    <div className="text-right hidden sm:block mr-2">
                      <p className="text-xs font-medium" style={{ color: '#173a32' }}>{(ad.impressions || 0).toLocaleString()} views</p>
                      <p className="text-[10px]" style={{ color: '#979799' }}>{(ad.clicks || 0).toLocaleString()} clicks</p>
                    </div>
                    <button onClick={() => toggleStatus(ad)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#f2f2f3]"
                      title={ad.status === 'active' ? 'Pause' : 'Activate'}>
                      {ad.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button onClick={() => deleteAd(ad.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#fef2f2]"
                      style={{ color: '#b91c1c' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {/* Mini progress bar for impressions */}
                <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: '#f2f2f3' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, ((ad.clicks || 0) / Math.max(1, (ad.impressions || 1))) * 100)}%`,
                    backgroundColor: meta.color,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Bottom info */}
      {ads.length > 0 && (
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: '#a3a6af' }}>
            <Sparkles size={12} className="inline" /> Promote your services with ads. Pay in ETB via TeleBirr or Chapa. No platform fees.
          </p>
        </div>
      )}
    </motion.div>
  );
}