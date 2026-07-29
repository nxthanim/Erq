import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gigsAPI } from '../utils/api';
import FileUpload from '../components/FileUpload';

const categories = ['Translation', 'Graphic Design', 'Video Editing', 'Web Development', 'Virtual Assistant', 'Social Media Management'];

export default function EditGig() {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', deliveryTime: '', active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    gigsAPI.get(id)
      .then(res => {
        const gig = res.data.gig;
        if (!gig) throw new Error('Gig not found');
        setForm({
          title: gig.title || '',
          description: gig.description || '',
          price: gig.price?.toString() || '',
          category: gig.category || '',
          deliveryTime: gig.delivery_time?.toString() || '',
          active: gig.active === 1
        });
      })
      .catch(err => {
        setError('Failed to load gig');
        navigate('/my-gigs');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await gigsAPI.update(id, {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        deliveryTime: parseInt(form.deliveryTime),
        active: form.active
      });
      setSuccess('Gig updated successfully!');
      setTimeout(() => navigate('/my-gigs'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update gig');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ice-900">Edit Gig</h1>
        <p className="text-ice-500 text-sm mt-1">Update your service offering</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-clay-sm text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-clay-sm text-sm flex items-center gap-2">
            <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.title')}</label>
          <input type="text" required value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="input-field" placeholder="e.g., Professional Amharic to English Translation" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.description')}</label>
          <textarea required rows={5} value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            className="input-field" placeholder="Describe your service in detail..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.category')}</label>
            <select required value={form.category}
              onChange={e => setForm({...form, category: e.target.value})} className="input-field">
              <option value="">Select...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.price')}</label>
            <input type="number" required min={1} value={form.price}
              onChange={e => setForm({...form, price: e.target.value})}
              className="input-field" placeholder="500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.delivery')}</label>
            <input type="number" required min={1} value={form.deliveryTime}
              onChange={e => setForm({...form, deliveryTime: e.target.value})}
              className="input-field" placeholder="3" />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#faf7f2', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
          <button
            type="button"
            onClick={() => setForm({...form, active: !form.active})}
            className={`relative w-12 h-7 rounded-full transition-all ${form.active ? 'bg-gebeya-500' : 'bg-clay-300'}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-medium text-ice-700">{form.active ? 'Active' : 'Inactive'}</p>
            <p className="text-xs text-ice-400">{form.active ? 'Gig is visible in marketplace' : 'Gig is hidden from search'}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate('/my-gigs')} className="btn-secondary">{t('common.cancel')}</button>
        </div>
      </form>
    </div>
  );
}
