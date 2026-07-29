import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { adminAPI, categoriesAPI } from '../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Users, Briefcase, FileText, DollarSign, Scale, FolderOpen, Shield,
  Search, RefreshCw, CheckCircle, XCircle, Clock,
  Eye, Music, Star, Trash2, MessageCircle,
} from 'lucide-react';

// ====== STAT CARD ======
function StatCard({ label, value, icon, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-white p-5"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}12` }}
        >
          <div style={{ color: accent }}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#17191c' }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: '#777b86' }}>{label}</p>
    </motion.div>
  );
}

// ====== AUDIT TAB ======
function AuditTab({ loginAudits, paymentAudits, auditLoading, adminAPI }) {
  return (
    <div className="space-y-6">
      {/* Login Audit */}
      <div className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-4 border-b border-[#ececec] flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#17191c' }}>
            <Shield size={14} /> Login & Signup Activity
          </h4>
          <span className="text-xs" style={{ color: '#777b86' }}>{loginAudits.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                {['Time', 'Action', 'Email', 'User', 'IP Address', 'User Agent'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#777b86' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loginAudits.slice(0, 30).map(audit => (
                <tr key={audit.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: '#777b86' }}>
                    {new Date(audit.created_at + 'Z').toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={audit.action === 'login' ? { backgroundColor: '#fbe1d1', color: '#5d2a1a' } :
                             audit.action === 'signup' ? { backgroundColor: '#f2f2f3', color: '#17191c' } :
                             { backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                      {audit.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#17191c' }}>{audit.email}</td>
                  <td className="px-4 py-2.5" style={{ color: '#777b86' }}>{audit.full_name || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: '#777b86' }}>{audit.ip_address}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#979799' }} title={audit.user_agent}>
                    {audit.user_agent?.slice(0, 60) || '-'}
                  </td>
                </tr>
              ))}
              {loginAudits.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#979799' }}>No login activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Audit */}
      <div className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-4 border-b border-[#ececec] flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#17191c' }}>
            <DollarSign size={14} /> Payment Security Activity
          </h4>
          <span className="text-xs" style={{ color: '#777b86' }}>{paymentAudits.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                {['Time', 'Action', 'User', 'IP Address', 'Txn ID', 'Details'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#777b86' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paymentAudits.slice(0, 30).map(audit => {
                let details = {};
                try { details = JSON.parse(audit.details); } catch {}
                return (
                  <tr key={audit.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: '#777b86' }}>
                      {new Date(audit.created_at + 'Z').toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={audit.action.includes('success') ? { backgroundColor: '#fbe1d1', color: '#5d2a1a' } :
                               audit.action.includes('attempt') ? { backgroundColor: '#f2f2f3', color: '#17191c' } :
                               { backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                        {audit.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#17191c' }}>{audit.full_name || 'Unknown'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: '#777b86' }}>{audit.ip_address}</td>
                    <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: '#979799' }}>
                      {audit.transaction_id ? audit.transaction_id.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: '#979799' }} title={JSON.stringify(details)}>
                      {Object.keys(details).length > 0 ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}
                    </td>
                  </tr>
                );
              })}
              {paymentAudits.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#979799' }}>No payment activity recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ====== EVIDENCE TAB ======
function EvidenceTab({ evidence, evidenceLoading, selectedEvidence, setSelectedEvidence, adminAPI }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {evidenceLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#17191c]/20 border-t-[#17191c]"></div>
          </div>
        ) : evidence.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
            <Shield size={48} className="mx-auto mb-4" style={{ color: '#979799' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#17191c' }}>No Biometric Confirmations Yet</h3>
            <p style={{ color: '#777b86' }}>Payment confirmations with biometric evidence will appear here.</p>
          </div>
        ) : evidence.map(item => (
          <motion.div
            key={item.transaction_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white p-6 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base truncate" style={{ color: '#17191c' }}>{item.job_title}</h4>
                <p className="text-xs mt-0.5" style={{ color: '#979799' }}>Transaction: {item.transaction_id.slice(0, 8)}...</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-3"
                style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                Confirmed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#f2f2f3' }}>
                <div className="flex items-center gap-2.5 mb-2">
                  {item.freelancer_picture ? (
                    <img src={item.freelancer_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                      {item.freelancer_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#17191c' }}>{item.freelancer_name}</p>
                    <p className="text-[10px]" style={{ color: '#979799' }}>Freelancer</p>
                  </div>
                </div>
                <p className="text-xs truncate" style={{ color: '#777b86' }}>{item.freelancer_email}</p>
              </div>

              <div className="rounded-2xl p-4" style={{ backgroundColor: '#f2f2f3' }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#5d2a1a' }}>Client</p>
                <p className="text-sm font-semibold" style={{ color: '#17191c' }}>{item.client_name}</p>
                <p className="text-xs truncate" style={{ color: '#777b86' }}>{item.client_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3" style={{ backgroundColor: '#f2f2f3' }}>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#979799' }}>Amount</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: '#5d2a1a' }}>ETB {item.amount?.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl p-3" style={{ backgroundColor: '#f2f2f3' }}>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#979799' }}>Confirmed</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#17191c' }}>
                  {item.confirmed_at ? new Date(item.confirmed_at + 'Z').toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </p>
              </div>
              <div className="rounded-2xl p-3" style={{ backgroundColor: '#f2f2f3' }}>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#979799' }}>Job Status</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={item.job_status === 'completed' ? { backgroundColor: '#fbe1d1', color: '#5d2a1a' } : { backgroundColor: '#f2f2f3', color: '#777b86' }}>
                  {item.job_status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div onClick={() => setSelectedEvidence(selectedEvidence?.transaction_id === item.transaction_id ? null : item)}
                className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-transparent hover:border-[#5d2a1a]/30 transition-all"
                style={{ backgroundColor: '#17191c' }}>
                {item.confirmation_selfie ? (
                  <>
                    <img src={item.confirmation_selfie} alt="Confirmation selfie"
                      className={`w-full h-36 object-cover transition-all duration-300 ${selectedEvidence?.transaction_id === item.transaction_id ? 'object-contain h-64' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-white text-xs font-medium flex items-center gap-1">
                        <Eye size={12} />
                        {selectedEvidence?.transaction_id === item.transaction_id ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-36 flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
                    <span style={{ color: '#979799' }}>No selfie</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-4 flex flex-col items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
                <Music size={24} className="mb-2" style={{ color: '#777b86' }} />
                <p className="text-xs font-medium mb-2" style={{ color: '#777b86' }}>Voice Confirmation</p>
                {item.confirmation_audio ? (
                  <audio controls className="w-full max-w-[200px] h-8" preload="metadata">
                    <source src={item.confirmation_audio} type="audio/webm" />
                  </audio>
                ) : (
                  <p className="text-xs" style={{ color: '#979799' }}>No audio recording</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ====== CATEGORY MANAGER ======
function CategoryManager({ categories, setCategories }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    // icon field omitted intentionally — API uses a default
    const payload = { name: form.name, description: form.description, sortOrder: form.sortOrder };
    try {
      if (editId) await categoriesAPI.update(editId, payload);
      else await categoriesAPI.create(payload);
      const res = await categoriesAPI.listAll();
      setCategories(res.data.categories || []);
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', description: '', sortOrder: 0 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description, sortOrder: cat.sort_order });
    setEditId(cat.id);
    setShowForm(true);
  };

  const handleToggle = async (cat) => {
    try {
      await categoriesAPI.update(cat.id, { active: !cat.active });
      const res = await categoriesAPI.listAll();
      setCategories(res.data.categories || []);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#17191c' }}>Service Categories</h3>
          <p className="text-sm" style={{ color: '#777b86' }}>Manage gig and job categories across the platform</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '', sortOrder: 0 }); }}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all"
          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
          {showForm ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-6" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
          <h4 className="font-semibold mb-4" style={{ color: '#17191c' }}>{editId ? 'Edit Category' : 'New Category'}</h4>
          {error && <div className="mb-3 px-4 py-2.5 rounded-xl" style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a', border: '1px solid rgba(93,42,26,0.2)' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#17191c' }}>Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{ border: '1px solid #ececec', backgroundColor: '#ffffff', color: '#17191c' }}
                placeholder="e.g., Translation"
                onFocus={e => e.target.style.borderColor = '#17191c'}
                onBlur={e => e.target.style.borderColor = '#ececec'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#17191c' }}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{ border: '1px solid #ececec', backgroundColor: '#ffffff', color: '#17191c' }}
                placeholder="Brief description"
                onFocus={e => e.target.style.borderColor = '#17191c'}
                onBlur={e => e.target.style.borderColor = '#ececec'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#17191c' }}>Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                  style={{ border: '1px solid #ececec', backgroundColor: '#ffffff', color: '#17191c' }}
                  onFocus={e => e.target.style.borderColor = '#17191c'}
                  onBlur={e => e.target.style.borderColor = '#ececec'} />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-3 rounded-full text-sm font-medium transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              {saving ? 'Saving...' : editId ? 'Update Category' : 'Create Category'}
            </button>
          </form>
        </motion.div>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center" style={{ color: '#979799', boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
            No categories yet
          </div>
        ) : categories.map((cat, i) => (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-4 p-4 rounded-3xl bg-white transition-all hover:shadow-sm"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
            <FolderOpen size={24} style={{ color: '#777b86' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm" style={{ color: '#17191c' }}>{cat.name}</h4>
                <span className={`w-2 h-2 rounded-full ${cat.active ? '' : ''}`}
                  style={{ backgroundColor: cat.active ? '#5d2a1a' : '#d0d0d0' }} title={cat.active ? 'Active' : 'Inactive'} />
              </div>
              {cat.description && <p className="text-xs truncate" style={{ color: '#979799' }}>{cat.description}</p>}
              <p className="text-[10px]" style={{ color: '#d0d0d0' }}>Order: {cat.sort_order}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleToggle(cat)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: cat.active ? '#fbe1d1' : '#f2f2f3', color: cat.active ? '#5d2a1a' : '#777b86' }}>
                {cat.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleEdit(cat)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>
                Edit
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ====== REVIEWS TAB ======
function ReviewsTab({ reviews, reviewsLoading, reviewsStats, deleteConfirm, setDeleteConfirm, onDeleteReview, onRefresh }) {
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} fill={i < rating ? '#5d2a1a' : 'none'} style={{ color: i < rating ? '#5d2a1a' : '#ececec' }} />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {reviewsStats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#f2f2f3' }}>
            <p className="text-xs font-medium" style={{ color: '#979799' }}>Total Reviews</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#17191c' }}>{reviewsStats.total || 0}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#f2f2f3' }}>
            <p className="text-xs font-medium" style={{ color: '#979799' }}>Avg Rating</p>
            <p className="text-2xl font-bold mt-1 flex items-center gap-1" style={{ color: '#17191c' }}>
              {reviewsStats.avgRating || '0'} <Star size={14} fill="#5d2a1a" style={{ color: '#5d2a1a' }} />
            </p>
          </div>
          {reviewsStats.ratingDistribution?.map(d => (
            <div key={d.rating} className="rounded-2xl p-4" style={{ backgroundColor: '#f2f2f3' }}>
              <p className="text-xs font-medium" style={{ color: '#979799' }}>{d.rating} Star{d.rating !== 1 ? 's' : ''}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#5d2a1a' }}>{d.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reviews table */}
      <div className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
        <div className="px-6 py-4 border-b border-[#ececec] flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: '#17191c' }}>
            <MessageCircle size={14} /> All Reviews
          </h4>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#777b86' }}>{reviews.length} reviews</span>
            <button onClick={onRefresh}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
              <RefreshCw size={12} /> {reviewsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#17191c]/20 border-t-[#17191c]"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle size={40} className="mx-auto mb-3" style={{ color: '#979799' }} />
            <h3 className="text-lg font-semibold mb-1" style={{ color: '#17191c' }}>No Reviews Yet</h3>
            <p style={{ color: '#777b86', fontSize: '14px' }}>Reviews from users will appear here as the platform grows.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                  {['Date', 'Reviewer', 'Reviewee', 'Rating', 'Comment', 'Role', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#777b86' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: '#777b86' }}>
                      {new Date(review.created_at + 'Z').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                          style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                          {review.reviewer_picture ? (
                            <img src={review.reviewer_picture} alt="" className="w-full h-full object-cover" />
                          ) : review.reviewer_name?.charAt(0)}
                        </div>
                        <span className="font-medium" style={{ color: '#17191c' }}>{review.reviewer_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                          style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                          {review.reviewee_picture ? (
                            <img src={review.reviewee_picture} alt="" className="w-full h-full object-cover" />
                          ) : review.reviewee_name?.charAt(0)}
                        </div>
                        <span style={{ color: '#17191c' }}>{review.reviewee_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                        <span className="ml-1 text-[10px] font-medium" style={{ color: '#777b86' }}>{review.rating}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <p className="truncate" style={{ color: '#777b86' }} title={review.comment}>
                        {review.comment ? `"${review.comment}"` : <span style={{ color: '#979799', fontStyle: 'italic' }}>No comment</span>}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                        style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>
                        {review.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {deleteConfirm === review.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => onDeleteReview(review.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                            style={{ backgroundColor: '#5d2a1a', color: '#ffffff' }}>
                            Confirm Delete
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                            style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(review.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1"
                          style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
                          <Trash2 size={10} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== MAIN ADMIN DASHBOARD ======
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loginAudits, setLoginAudits] = useState([]);
  const [paymentAudits, setPaymentAudits] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsStats, setReviewsStats] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getUsers(),
      adminAPI.getGigs(),
      adminAPI.getJobs(),
      adminAPI.getTransactions()
    ])
    .then(([statsRes, usersRes, gigsRes, jobsRes, txnRes]) => {
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setGigs(gigsRes.data.gigs || []);
      setJobs(jobsRes.data.jobs || []);
      setTransactions(txnRes.data.transactions || []);
      categoriesAPI.listAll()
        .then(res => setCategories(res.data.categories || []))
        .catch(() => {});
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      setAuditLoading(true);
      Promise.all([
        adminAPI.get('/admin/audit/login'),
        adminAPI.get('/admin/audit/payment')
      ])
        .then(([loginRes, paymentRes]) => {
          setLoginAudits(loginRes.data.audits || []);
          setPaymentAudits(paymentRes.data.audits || []);
        })
        .catch(console.error)
        .finally(() => setAuditLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'evidence') {
      setEvidenceLoading(true);
      adminAPI.getBiometricEvidence()
        .then(res => setEvidence(res.data.evidence || []))
        .catch(console.error)
        .finally(() => setEvidenceLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab]);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await adminAPI.getReviews({ limit: 100 });
      setReviews(res.data.reviews || []);
      setReviewsStats({
        total: res.data.total,
        avgRating: res.data.avgRating,
        ratingDistribution: res.data.ratingDistribution,
      });
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await adminAPI.deleteReview(reviewId);
      setDeleteConfirm(null);
      // Reload reviews after deletion
      loadReviews();
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  const handleVerify = async (userId) => {
    try {
      await adminAPI.verifyUser(userId);
      const res = await adminAPI.getUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to verify user:', err);
    }
  };

  const handleResolveDispute = async (txnId, action) => {
    try {
      await adminAPI.resolveDispute(txnId, action);
      const res = await adminAPI.getTransactions();
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: t('admin.stats'), icon: <BarChart3 size={14} /> },
    { id: 'users', label: t('admin.users'), icon: <Users size={14} /> },
    { id: 'gigs', label: t('admin.gigs'), icon: <FileText size={14} /> },
    { id: 'jobs', label: t('admin.jobs'), icon: <Briefcase size={14} /> },
    { id: 'transactions', label: t('admin.transactions'), icon: <DollarSign size={14} /> },
    { id: 'disputes', label: t('admin.disputes'), icon: <Scale size={14} /> },
    { id: 'categories', label: 'Categories', icon: <FolderOpen size={14} /> },
    { id: 'evidence', label: 'Evidence', icon: <Shield size={14} /> },
    { id: 'audit', label: 'IP Audit', icon: <Search size={14} /> },
    { id: 'reviews', label: 'Reviews', icon: <Star size={14} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#17191c]/20 border-t-[#17191c]"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
        <Shield size={48} className="mb-6" style={{ color: '#979799' }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#17191c' }}>Admin Area</h2>
        <p className="mb-8" style={{ color: '#777b86' }}>This dashboard is for platform administrators.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/analytics')}
            className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            My Analytics Dashboard
          </button>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full text-sm font-medium transition-all border"
            style={{ borderColor: '#17191c', color: '#17191c' }}>
            Go Home
          </button>
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
            {t('admin.dashboard')}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#777b86' }}>Platform administration & oversight</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>
            <CheckCircle size={12} /> Live
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 p-1 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 rounded-2xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.id ? '' : 'hover:opacity-80'
            }`}
            style={{ color: activeTab === tab.id ? '#17191c' : '#777b86', backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {activeTab === 'overview' && stats && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-4 gap-5">
              <StatCard label={t('admin.total.users')} value={stats.totalUsers} icon={<Users size={18} />} accent="#17191c" />
              <StatCard label={t('admin.total.freelancers')} value={stats.totalFreelancers} icon={<Briefcase size={18} />} accent="#5d2a1a" />
              <StatCard label={t('admin.total.clients')} value={stats.totalClients} icon={<Users size={18} />} accent="#777b86" />
              <StatCard label={t('admin.total.gigs')} value={stats.totalGigs} icon={<FileText size={18} />} accent="#17191c" />
              <StatCard label={t('admin.total.jobs')} value={stats.totalJobs} icon={<Briefcase size={18} />} accent="#5d2a1a" />
              <StatCard label={t('admin.total.revenue')} value={`ETB ${stats.totalRevenue?.toLocaleString()}`} icon={<DollarSign size={18} />} accent="#17191c" />
              <StatCard label={t('admin.escrow')} value={`ETB ${stats.escrowBalance?.toLocaleString()}`} icon={<DollarSign size={18} />} accent="#777b86" />
              <StatCard label={t('admin.disputes.count')} value={stats.pendingDisputes} icon={<Scale size={18} />} accent="#5d2a1a" />
            </div>
          </motion.div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                  {['Name', 'Email', 'Role', 'City', 'Verified', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#777b86' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#17191c' }}>{user.full_name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium capitalize"
                        style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{user.city || '-'}</td>
                    <td className="px-4 py-3">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}><CheckCircle size={10} /> Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}><XCircle size={10} /> Not Verified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleVerify(user.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{ backgroundColor: '#f2f2f3', color: '#17191c' }}>
                        {user.verified ? t('admin.unverify') : t('admin.verify')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* GIGS */}
        {activeTab === 'gigs' && (
          <motion.div key="gigs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                  {['Title', 'Freelancer', 'Category', 'Price', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#777b86' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gigs.map(gig => (
                  <tr key={gig.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#17191c' }}>{gig.title}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{gig.freelancer_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>{gig.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#5d2a1a' }}>ETB {gig.price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: gig.active ? '#fbe1d1' : '#f2f2f3', color: gig.active ? '#5d2a1a' : '#777b86' }}>
                        {gig.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* JOBS */}
        {activeTab === 'jobs' && (
          <motion.div key="jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                  {['Title', 'Client', 'Freelancer', 'Budget', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#777b86' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#17191c' }}>{job.title}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{job.client_name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{job.freelancer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#5d2a1a' }}>ETB {job.budget_min} - {job.budget_max}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: job.status === 'open' ? '#fbe1d1' : job.status === 'in_progress' ? '#f2f2f3' : '#f2f2f3',
                          color: job.status === 'open' ? '#5d2a1a' : '#777b86'
                        }}>{job.status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ececec]" style={{ backgroundColor: '#fafafb' }}>
                  {['Job', 'Client', 'Freelancer', 'Amount', 'Status', 'Reference'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#777b86' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-[#f2f2f3] hover:bg-[#fafafb] transition-colors">
                    <td className="px-4 py-3 text-sm" style={{ color: '#17191c' }}>{txn.job_title}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{txn.client_name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#777b86' }}>{txn.freelancer_name}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: '#5d2a1a' }}>ETB {txn.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: txn.status === 'released' ? '#fbe1d1' : txn.status === 'escrow' ? '#f2f2f3' : txn.status === 'disputed' ? '#fbe1d1' : '#f2f2f3',
                          color: txn.status === 'released' ? '#5d2a1a' : txn.status === 'disputed' ? '#5d2a1a' : '#777b86'
                        }}>{txn.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#979799' }}>{txn.telebirr_reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* DISPUTES */}
        {activeTab === 'disputes' && (
          <motion.div key="disputes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {transactions.filter(t => t.status === 'disputed').length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
                <Scale size={48} className="mx-auto mb-4" style={{ color: '#979799' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#17191c' }}>No Active Disputes</h3>
                <p style={{ color: '#777b86' }}>All transactions are running smoothly</p>
              </div>
            ) : (
              transactions.filter(t => t.status === 'disputed').map(txn => (
                <div key={txn.id} className="rounded-3xl bg-white p-6" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold" style={{ color: '#17191c' }}>{txn.job_title}</h3>
                      <p className="text-sm mt-1" style={{ color: '#777b86' }}>
                        {txn.client_name} vs {txn.freelancer_name} · ETB {txn.amount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResolveDispute(txn.id, 'release')}
                        className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                        style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                        {t('admin.release')}
                      </button>
                      <button onClick={() => handleResolveDispute(txn.id, 'refund')}
                        className="px-5 py-2 rounded-full text-sm font-medium transition-all border"
                        style={{ borderColor: '#5d2a1a', color: '#5d2a1a' }}>
                        {t('admin.refund')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* CATEGORIES */}
        {activeTab === 'categories' && (
          <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CategoryManager categories={categories} setCategories={setCategories} />
          </motion.div>
        )}

        {/* AUDIT */}
        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#17191c' }}>
                  <Search size={16} /> Security Audit Trail
                </h3>
                <p className="text-sm" style={{ color: '#777b86' }}>IP logs for logins, signups, and payment actions</p>
              </div>
              <button onClick={() => {
                setAuditLoading(true);
                Promise.all([
                  adminAPI.get('/admin/audit/login'),
                  adminAPI.get('/admin/audit/payment')
                ])
                  .then(([loginRes, paymentRes]) => {
                    setLoginAudits(loginRes.data.audits || []);
                    setPaymentAudits(paymentRes.data.audits || []);
                  })
                  .catch(console.error)
                  .finally(() => setAuditLoading(false));
              }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{ color: '#777b86' }}>
                <RefreshCw size={14} /> {auditLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#17191c]/20 border-t-[#17191c]"></div>
              </div>
            ) : (
              <AuditTab loginAudits={loginAudits} paymentAudits={paymentAudits} auditLoading={auditLoading} adminAPI={adminAPI} />
            )}
          </motion.div>
        )}

        {/* EVIDENCE */}
        {activeTab === 'evidence' && (
          <motion.div key="evidence" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#17191c' }}>
                  <Shield size={16} /> Biometric Payment Evidence
                </h3>
                <p className="text-sm" style={{ color: '#777b86' }}>Audit trail of biometric payment confirmations</p>
              </div>
              <button onClick={() => {
                setEvidenceLoading(true);
                adminAPI.getBiometricEvidence()
                  .then(res => setEvidence(res.data.evidence || []))
                  .catch(console.error)
                  .finally(() => setEvidenceLoading(false));
              }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{ color: '#777b86' }}>
                <RefreshCw size={14} /> {evidenceLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <EvidenceTab evidence={evidence} evidenceLoading={evidenceLoading} selectedEvidence={selectedEvidence} setSelectedEvidence={setSelectedEvidence} adminAPI={adminAPI} />
          </motion.div>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#17191c' }}>
                  <Star size={16} /> Review Management
                </h3>
                <p className="text-sm" style={{ color: '#777b86' }}>View and manage user reviews. Delete fake or inappropriate reviews.</p>
              </div>
            </div>
            <ReviewsTab
              reviews={reviews}
              reviewsLoading={reviewsLoading}
              reviewsStats={reviewsStats}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
              onDeleteReview={handleDeleteReview}
              onRefresh={loadReviews}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
