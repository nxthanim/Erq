import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { featuresAPI, usersAPI } from '../utils/api';
import { PageTransition } from '../components/ScrollReveal';

export default function PortfolioGallery() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', tags: '', category: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTag, setSelectedTag] = useState('all');

  const targetUserId = userId || user?.id;
  const isOwner = user && targetUserId === user.id;

  const fetchPortfolio = useCallback(async () => {
    try {
      const [portRes, userRes] = await Promise.all([
        featuresAPI.getPortfolio(targetUserId),
        usersAPI.getUser(targetUserId)
      ]);
      setPortfolio(portRes.data.portfolio || []);
      setProfile(userRes.data.user);
    } catch {
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, navigate]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.imageUrl) return;
    setSubmitting(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await featuresAPI.addPortfolioItem({ ...form, tags });
      setForm({ title: '', description: '', imageUrl: '', tags: '', category: '' });
      setShowAddModal(false);
      fetchPortfolio();
    } catch (err) {
      console.error('Failed to add portfolio item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this portfolio item?')) return;
    try {
      await featuresAPI.deletePortfolioItem(itemId);
      fetchPortfolio();
    } catch (err) {
      console.error('Failed to delete portfolio item:', err);
    }
  };

  // Extract all unique tags
  const allTags = [...new Set(portfolio.flatMap(item => item.tags || []))];
  const filteredPortfolio = selectedTag === 'all'
    ? portfolio
    : portfolio.filter(item => (item.tags || []).includes(selectedTag));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-ice-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to={`/freelancers/${targetUserId}`} className="text-ice-500 hover:text-ice-700 text-sm flex items-center gap-1 mb-3">
              ← {profile?.full_name || 'Freelancer'}'s Profile
            </Link>
            <h1 className="text-3xl font-bold text-ice-900 flex items-center gap-3">
              🖼️ Portfolio Gallery
              {profile && (
                <span className="text-lg font-normal text-ice-400">— {profile.full_name}</span>
              )}
            </h1>
            <p className="text-ice-500 mt-1">Showcasing creative work and projects</p>
          </div>
          {isOwner && (
            <button onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2">
              <span>➕</span> Add Work
            </button>
          )}
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <button onClick={() => setSelectedTag('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTag === 'all' ? 'bg-gebeya-600 text-white' : 'bg-white text-ice-500 border border-ice-200 hover:border-gebeya-300'
              }`}>
              All
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(tag)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTag === tag ? 'bg-gebeya-600 text-white' : 'bg-white text-ice-500 border border-ice-200 hover:border-gebeya-300'
                }`}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Portfolio Grid */}
        {filteredPortfolio.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🖼️</span>
            <h3 className="text-xl font-semibold text-ice-900 mb-2">No portfolio items yet</h3>
            <p className="text-ice-500">
              {isOwner ? 'Add your first work sample to showcase your skills!' : 'This freelancer hasn\'t added any portfolio items yet.'}
            </p>
            {isOwner && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
                Add Your First Work
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-3 gap-6">
            {filteredPortfolio.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-ice-100 overflow-hidden group hover:shadow-lg transition-all"
              >
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img src={item.image_url} alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/e2e8f0/94a3b8?text=Image'; }} />
                  {isOwner && (
                    <button onClick={() => handleDelete(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                      title="Delete">
                      🗑️
                    </button>
                  )}
                  {item.category && (
                    <span className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] rounded-full">
                      {item.category}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-ice-900 mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-ice-500 mb-3 line-clamp-2">{item.description}</p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gebeya-50 text-gebeya-700 text-[10px] rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ice-900">Add Portfolio Work</h2>
              <button onClick={() => setShowAddModal(false)} className="text-ice-400 hover:text-ice-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Title *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="e.g., Brand Identity Design for ABC Corp"
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe this project..."
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Image URL *</label>
                <input type="url" required value={form.imageUrl}
                  onChange={e => setForm({...form, imageUrl: e.target.value})}
                  placeholder="https://example.com/my-work.jpg"
                  className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ice-700 mb-1">Tags (comma separated)</label>
                  <input type="text" value={form.tags}
                    onChange={e => setForm({...form, tags: e.target.value})}
                    placeholder="branding, logo, design"
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ice-700 mb-1">Category</label>
                  <input type="text" value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    placeholder="Graphic Design"
                    className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Adding...' : 'Add to Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
