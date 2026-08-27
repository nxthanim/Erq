import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gigsAPI } from '../utils/api';
import { MARKETPLACE_CATEGORIES } from '../categories';
import { Plus, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import AppAvatar from '../components/ui/avatar';

export default function CreateGig() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: '', customCategory: '', deliveryTime: ''
  });
  const [files, setFiles] = useState([]);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // The backend expects a JSON body (GigCreateRequest); file upload for
      // portfolio images is not yet supported server-side, so send JSON only.
      const res = await gigsAPI.create({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category === 'Custom Category' ? form.customCategory.trim() : form.category,
        deliveryTime: parseInt(form.deliveryTime, 10),
      });
      navigate(`/gigs/${res.data.gig.id}`);
    } catch (err) {
      const serverError = err.response?.data?.error || '';
      const status = err.response?.status;
      if (status === 401) {
        setError('🔒 Authentication expired. Please log in again and try again.');
      } else {
        setError(serverError || 'Failed to create gig. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const allPreviewImages = [...files].filter(f => f?.type?.startsWith('image/'));

  // Generate preview URLs once to avoid memory leaks
  const previewUrls = useMemo(() => {
    return allPreviewImages.map(img => ({
      file: img,
      url: URL.createObjectURL(img)
    }));
  }, [files, portfolioFiles]);

  // Cleanup preview URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      previewUrls.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previewUrls]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ice-900">{t('gig.create')}</h1>
        <p className="text-ice-500 text-sm mt-1">Showcase your skills and attract clients</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-clay-sm text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.title')}</label>
          <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            className="input-field" placeholder="e.g., Professional Amharic to English Translation" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.description')}</label>
          <textarea required rows={5} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            className="input-field" placeholder="Describe your service in detail..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.category')}</label>
            <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
              <option value="">Select...</option>
              {MARKETPLACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {form.category === 'Custom Category' && <input required value={form.customCategory} onChange={e => setForm({...form, customCategory: e.target.value})} className="input-field mt-2" placeholder="Enter your category" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.price')}</label>
            <input type="number" required min={1} value={form.price} onChange={e => setForm({...form, price: e.target.value})}
              className="input-field" placeholder="500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ice-700 mb-1.5">{t('gig.delivery')}</label>
            <input type="number" required min={1} value={form.deliveryTime} onChange={e => setForm({...form, deliveryTime: e.target.value})}
              className="input-field" placeholder="3" />
          </div>
        </div>

        {/* Portfolio Images — exactly 4 required like Fiverr */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#173a32' }}>
            Portfolio Images <span style={{ color: '#1f6f5c' }}>*</span>
          </label>
          <p style={{ color: '#777b86', fontSize: '13px' }} className="mb-3">
            Add exactly <strong>4 images</strong> to showcase your work — buyers expect to see previews before ordering.
          </p>
          <p style={{ color: '#979799', fontSize: '12px' }} className="mb-3">
            Note: images are shown in the live preview only — file upload isn't wired to the backend yet, so your gig will publish without attached files.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(idx => {
              const file = files[idx];
              const url = file ? URL.createObjectURL(file) : null;
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
                        setFiles(prev => {
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
                      <img src={url} alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover" />
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setFiles(prev => prev.filter((_, i) => i !== idx));
                      }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <ImageIcon size={24} style={{ color: '#979799' }} />
                      <span className="text-xs" style={{ color: '#979799' }}>Image {idx + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {files.length < 4 && files.length > 0 && (
            <p className="mt-2 text-xs flex items-center gap-1" style={{ color: '#1f6f5c' }}>
              <AlertCircle size={12} /> Add {4 - files.length} more image{files.length !== 3 ? 's' : ''} to meet the minimum requirement
            </p>
          )}
        </div>

        <FileUpload label="Portfolio Documents" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" multiple onChange={setDocs} value={docs} description="Documents, PDFs, spreadsheets, archives (optional)" />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => {
            if (!form.title || !form.description || !form.price || !form.category || !form.deliveryTime) {
              setError('Please fill in all required fields before previewing');
              return;
            }
            setShowPreview(true);
            setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }} className="bg-gradient-to-r from-gebeya-600 to-gebeya-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg flex items-center gap-2">
            👁️ Preview Listing
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('common.loading') : `🚀 ${t('gig.create')}`}
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
                <h2 className="text-white font-bold text-lg">Gig Preview</h2>
              </div>
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">This is how your gig will look</span>
            </div>
          </div>

          <div className="p-6">
            {/* Preview Gig Card */}
            <div className="bg-white rounded-2xl border border-clay-100 overflow-hidden shadow-sm">
              {/* Image Gallery */}
              {allPreviewImages.length > 0 && (
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
                  <span className="badge-green text-xs">⏱ {form.deliveryTime} day delivery</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-ice-900 mb-3">{form.title}</h3>

                {/* Description */}
                <p className="text-ice-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{form.description}</p>

                {/* Price */}
                <div className="mt-4 pt-4 border-t border-clay-100 flex items-center justify-between">
                  <span className="text-sm text-ice-500">Starting at</span>
                  <span className="text-2xl font-bold text-gebeya-600">ETB {Number(form.price).toLocaleString()}</span>
                </div>

                {/* File count */}
                <div className="mt-3 flex items-center gap-4 text-xs text-ice-400">
                  <span>📸 {allPreviewImages.length} image(s)</span>
                  <span>📄 {docs.length} document(s)</span>
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="mt-6 flex items-center justify-between p-4 bg-gebeya-50 rounded-xl border border-gebeya-100">
              <div className="flex items-center gap-2 text-sm text-ice-600">
                <span>🔍</span>
                <span>Review your gig details above. Click <strong>Confirm & Publish</strong> to make it live.</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPreview(false)} className="btn-secondary text-sm px-4 py-2">
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => {
                    // Trigger form submit programmatically
                    const form = e.target.closest('form') || document.querySelector('form');
                    if (form) form.requestSubmit();
                  }}
                  disabled={loading}
                  className="bg-gradient-to-r from-gebeya-600 to-gebeya-700 text-white px-6 py-2 rounded-xl font-semibold text-sm transition-all hover:shadow-lg flex items-center gap-2"
                >
                  {loading ? 'Publishing...' : '🚀 Confirm & Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
