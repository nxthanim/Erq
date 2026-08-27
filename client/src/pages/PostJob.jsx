import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { jobsAPI } from '../utils/api';
import { MARKETPLACE_CATEGORIES } from '../categories';
import { Plus, X, AlertCircle, Image as ImageIcon } from 'lucide-react';

export default function PostJob() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const [form, setForm] = useState({
    title: '', description: '', budgetMin: '', budgetMax: '', category: '', customCategory: '', deadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(form.budgetMin) > parseFloat(form.budgetMax)) {
      setError('Minimum budget cannot exceed maximum budget');
      return;
    }
    setLoading(true);
    try {
      // The backend expects a JSON body (JobCreateRequest); attachments are
      // not persisted server-side yet, so always send the plain JSON payload.
      const res = await jobsAPI.create({
        ...form,
        category: form.category === 'Custom Category' ? form.customCategory.trim() : form.category,
        budgetMin: parseFloat(form.budgetMin),
        budgetMax: parseFloat(form.budgetMax),
      });
      navigate(`/jobs/${res.data.job.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  const previewImages = attachments.filter(f => f.type?.startsWith('image/'));

  // Generate preview URLs once to avoid memory leaks
  const previewUrls = useMemo(() => {
    return previewImages.map(img => ({
      file: img,
      url: URL.createObjectURL(img)
    }));
  }, [attachments]);

  // Cleanup preview URLs when component unmounts or attachments change
  useEffect(() => {
    return () => {
      previewUrls.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previewUrls]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ice-900">{t('job.create')}</h1>
        <p className="text-ice-500 text-sm mt-1">Describe your project and find the right freelancer</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.title')}</label>
          <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            className="input-field" placeholder="e.g., Need a website for my coffee export business" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.description')}</label>
          <textarea required rows={6} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            className="input-field" placeholder="Describe your project requirements in detail..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.category')}</label>
            <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
              <option value="">Select...</option>
              {MARKETPLACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {form.category === 'Custom Category' && <input required value={form.customCategory} onChange={e => setForm({...form, customCategory: e.target.value})} className="input-field mt-2" placeholder="Enter your category" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.budget.min')}</label>
            <input type="number" required min={1} value={form.budgetMin} onChange={e => setForm({...form, budgetMin: e.target.value})}
              className="input-field" placeholder="1000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.budget.max')}</label>
            <input type="number" required min={1} value={form.budgetMax} onChange={e => setForm({...form, budgetMax: e.target.value})}
              className="input-field" placeholder="5000" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('job.deadline')}</label>
          <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
            className="input-field" />
        </div>

        {/* Reference Images — include at least 4 preview photos like Fiverr */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#173a32' }}>
            Preview Photos <span style={{ color: '#1f6f5c' }}>*</span>
          </label>
          <p style={{ color: '#777b86', fontSize: '13px' }} className="mb-3">
            Add at least <strong>4 photos</strong> so freelancers can see what you need. Listings with visuals get more bids.
          </p>
          <p style={{ color: '#979799', fontSize: '12px' }} className="mb-3">
            Note: photos are shown in the live preview only — file upload isn't wired to the backend yet, so your job will post without attachments.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(idx => {
              const file = attachments[idx];
              const isImage = file?.type?.startsWith('image/');
              const url = isImage && file ? URL.createObjectURL(file) : null;
              return (
                <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ backgroundColor: '#f2f2f3', border: file ? '2px solid #1f6f5c' : '2px dashed #ececec' }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        setAttachments(prev => {
                          const next = [...prev];
                          next[idx] = selectedFile;
                          return next;
                        });
                      }
                    };
                    input.click();
                  }}
                >
                  {url ? (
                    <>
                      <img src={url} alt={`Reference ${idx + 1}`}
                        className="w-full h-full object-cover" />
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setAttachments(prev => prev.filter((_, i) => i !== idx));
                      }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <ImageIcon size={24} style={{ color: '#979799' }} />
                      <span className="text-xs" style={{ color: '#979799' }}>Photo {idx + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {attachments.filter(f => f?.type?.startsWith('image/')).length < 4 && (
            <p className="mt-2 text-xs flex items-center gap-1" style={{ color: '#1f6f5c' }}>
              <AlertCircle size={12} /> Add {4 - attachments.filter(f => f?.type?.startsWith('image/')).length} more photo(s)
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => {
            if (!form.title || !form.description || !form.budgetMin || !form.budgetMax || !form.category) {
              setError('Please fill in all required fields before previewing');
              return;
            }
            if (parseFloat(form.budgetMin) > parseFloat(form.budgetMax)) {
              setError('Minimum budget cannot exceed maximum budget');
              return;
            }
            setShowPreview(true);
            setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }} className="bg-gradient-to-r from-gebeya-600 to-gebeya-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg flex items-center gap-2">
            👁️ Preview Listing
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('common.loading') : `🚀 ${t('job.create')}`}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">{t('common.cancel')}</button>
        </div>
      </form>

      {/* Preview Section */}
      {showPreview && (
        <div ref={previewRef} className="mt-8 card overflow-hidden border-2 border-gebeya-200">
          <div className="bg-gradient-to-r from-gebeya-600 to-gebeya-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">👁️</span>
                <h2 className="text-white font-bold text-lg">Job Preview</h2>
              </div>
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">This is how your job will look</span>
            </div>
          </div>

          <div className="p-6">
            {/* Preview Job Card */}
            <div className="bg-white rounded-2xl border border-clay-100 overflow-hidden shadow-sm">
              {/* Image Gallery */}
              {previewImages.length > 0 && (
                <div className="grid grid-cols-4 gap-1 p-1 bg-clay-50">
                  {previewUrls.slice(0, 4).map((p, i) => (
                    <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-white">
                      <img
                        src={p.url}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6">
                {/* Category + Status */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-green text-xs">{form.category}</span>
                  <span className="badge-green text-xs">Open for bids</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-ice-900 mb-3">{form.title}</h3>

                {/* Description */}
                <p className="text-ice-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{form.description}</p>

                {/* Budget Range */}
                <div className="mt-4 pt-4 border-t border-clay-100 flex items-center justify-between">
                  <span className="text-sm text-ice-500">Budget range</span>
                  <span className="text-2xl font-bold text-gebeya-600">
                    ETB {Number(form.budgetMin).toLocaleString()} — {Number(form.budgetMax).toLocaleString()}
                  </span>
                </div>

                {/* Deadline + Attachments */}
                <div className="mt-3 flex items-center gap-4 text-xs text-ice-400">
                  {form.deadline && <span>📅 Due: {new Date(form.deadline).toLocaleDateString()}</span>}
                  <span>📎 {attachments.length} attachment(s)</span>
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="mt-6 flex items-center justify-between p-4 bg-gebeya-50 rounded-xl border border-gebeya-100">
              <div className="flex items-center gap-2 text-sm text-ice-600">
                <span>🔍</span>
                <span>Review your job details above. Click <strong>Confirm & Post</strong> to make it live.</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPreview(false)} className="btn-secondary text-sm px-4 py-2">
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => {
                    const form = e.target.closest('form') || document.querySelector('form');
                    if (form) form.requestSubmit();
                  }}
                  disabled={loading}
                  className="bg-gradient-to-r from-gebeya-600 to-gebeya-700 text-white px-6 py-2 rounded-xl font-semibold text-sm transition-all hover:shadow-lg flex items-center gap-2"
                >
                  {loading ? 'Posting...' : '🚀 Confirm & Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
