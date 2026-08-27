import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { gigsAPI, jobsAPI, featuresAPI, paymentsAPI } from '../utils/api';
import ChapaInlineCheckout from '../components/ChapaInlineCheckout';
import { PageTransition } from '../components/ScrollReveal';
import { GsapStagger } from '../components/GsapAnimations';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ShoppingCart, Eye, CheckCircle, MessageCircle, ExternalLink, Search, Package, ClipboardList, Heart, User, Clock, Calendar, Lock, AlertCircle, Timer, Star, ArrowLeft } from 'lucide-react';
import { Card, Button } from '@heroui/react';
import AppAvatar from '../components/ui/avatar';
import { MARKETPLACE_CATEGORIES } from '../data/categories';
import { formatETB } from '../utils/currency';

const categories = ['All', ...MARKETPLACE_CATEGORIES];

function parseGigMedia(raw) {
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return parsed.map(item => {
      const src = typeof item === 'string' ? item : (item?.url || item?.data || item?.src);
      const type = typeof item === 'string' ? '' : (item?.type || '');
      return src ? { src, type } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function GigMediaPreview({ media, title, avatar, name }) {
  if (!media?.src) return <div className="marketplace-media-empty"><AppAvatar src={avatar} name={name} size="lg" /></div>;
  const isVideo = media.type?.startsWith('video/') || /\\.(mp4|webm|mov|m4v)(\\?|$)/i.test(media.src);
  return isVideo ? <video src={media.src} title={title} className="marketplace-media-preview" muted loop autoPlay playsInline controls={false} /> : <img src={media.src} alt={title} className="marketplace-media-preview" loading="lazy" />;
}


const TOP_CATEGORY_NAV = [
  { label: 'Trending', value: 'All' },
  { label: 'Graphics & Design', value: 'Graphics & Design' },
  { label: 'Programming & Tech', value: 'Web Development' },
  { label: 'Digital Marketing', value: 'Digital Marketing' },
  { label: 'Video & Animation', value: 'Video & Animation' },
  { label: 'Writing & Translation', value: 'Writing & Translation' },
  { label: 'Music & Audio', value: 'Music & Audio' },
  { label: 'Business', value: 'Business' },
  { label: 'AI Services', value: 'AI Applications' },
  { label: 'Data', value: 'Data' },
];

const EXPLORE_CATEGORIES = [
  { label: 'Keep exploring', value: 'All' },
  { label: 'Graphics & Design', value: 'Graphics & Design' },
  { label: 'Web Development', value: 'Web Development' },
  { label: 'Digital Marketing', value: 'Digital Marketing' },
  { label: 'Video & Animation', value: 'Video & Animation' },
  { label: 'Writing & Translation', value: 'Writing & Translation' },
  { label: 'Music & Audio', value: 'Music & Audio' },
  { label: 'Business', value: 'Business' },
  { label: 'Lifestyle', value: 'Lifestyle' },
  { label: 'Data', value: 'Data' },
];

function MarketplaceGigCard({ gig, saved, onSave, onOrder }) {
  const media = parseGigMedia(gig.portfolio_images)[0];
  const rating = Number(gig.freelancer_rating || 0);

  return (
    <article className="marketplace-shelf-card group">
      <Link to={`/gigs/${gig.id}`} className="marketplace-shelf-media">
        <GigMediaPreview media={media} title={gig.title} avatar={gig.freelancer_picture} name={gig.freelancer_name} />
        {media?.type?.startsWith('video/') && <span className="marketplace-video-badge">Video</span>}
        <span className="marketplace-shelf-heart-wrap">
          <button
            type="button"
            aria-label={saved ? 'Remove saved gig' : 'Save gig'}
            onClick={(event) => onSave(gig.id, event)}
            className={`marketplace-shelf-heart ${saved ? 'is-saved' : ''}`}
          >
            <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </span>
      </Link>
      <div className="marketplace-shelf-body">
        <Link to={`/gigs/${gig.id}`} className="marketplace-shelf-seller">
          <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="sm" />
          <span className="marketplace-shelf-seller-name">{gig.freelancer_name || 'Otr Gebeya creator'}</span>
          {gig.freelancer_verified && <span className="marketplace-verified">✓</span>}
        </Link>
        <div className="marketplace-shelf-category-row">
          <span className="marketplace-shelf-category">{gig.category || 'Marketplace service'}</span>
          <span className="marketplace-shelf-media-type">{media ? (media.type?.startsWith('video/') ? 'Video preview' : 'Image preview') : 'No preview'}</span>
        </div>
        <Link to={`/gigs/${gig.id}`} className="marketplace-shelf-title">{gig.title}</Link>
        {gig.description && <p className="marketplace-shelf-description">{gig.description}</p>}
        <div className="marketplace-shelf-meta">
          <span className="marketplace-rating"><Star size={12} fill="currentColor" /> {rating.toFixed(1)}</span>
          <span className="marketplace-reviews">{gig.review_count ? `(${gig.review_count})` : ''}</span>
          <span className="marketplace-shelf-price">{formatETB(gig.price)}</span>
        </div>
        <div className="marketplace-shelf-footer">
          <span><Timer size={12} /> {gig.delivery_time || 'Flexible'} days</span>
          <button type="button" onClick={() => onOrder(gig)} className="marketplace-shelf-order">Quick order</button>
        </div>
      </div>
    </article>
  );
}

function MarketplaceSectionHeader({ eyebrow, title, onPrevious, onNext, canNavigate }) {
  return (
    <div className="marketplace-section-header">
      <div>
        {eyebrow && <p className="marketplace-section-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {canNavigate && (
        <div className="marketplace-shelf-controls">
          <button type="button" onClick={onPrevious} aria-label="Previous gigs">‹</button>
          <button type="button" onClick={onNext} aria-label="Next gigs">›</button>
        </div>
      )}
    </div>
  );
}

export default function Marketplace() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get('type') || 'gigs');
  const [gigs, setGigs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedGigIds, setSavedGigIds] = useState(new Set());
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'All',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
  });

  // Quick Order modal state
  const [quickOrderGig, setQuickOrderGig] = useState(null);
  const [orderRequirements, setOrderRequirements] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderStep, setOrderStep] = useState('form'); // form | chapa_opened | verifying | done
  const [orderError, setOrderError] = useState('');
  const [chapaTxRef, setChapaTxRef] = useState('');
  const [chapaPublicKey, setChapaPublicKey] = useState('');

  // Quick Order for Jobs modal state
  const [quickOrderJob, setQuickOrderJob] = useState(null);
  const [jobOrderAmount, setJobOrderAmount] = useState('');
  const [jobOrderProposal, setJobOrderProposal] = useState('');
  const [jobOrderLoading, setJobOrderLoading] = useState(false);
  const [jobOrderStep, setJobOrderStep] = useState('form'); // form | chapa_opened | verifying | done
  const [jobOrderError, setJobOrderError] = useState('');
  const [jobChapaTxRef, setJobChapaTxRef] = useState('');
  const [jobChapaPublicKey, setJobChapaPublicKey] = useState('');

  const fetchGigs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.sort) params.sort = filters.sort;
      
      const res = await gigsAPI.list(params);
      setGigs(res.data.gigs || []);
    } catch (err) {
      console.error('Failed to fetch gigs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.minPrice) params.minBudget = filters.minPrice;
      if (filters.maxPrice) params.maxBudget = filters.maxPrice;
      if (filters.sort === 'price_low') params.sort = 'budget_low';
      else if (filters.sort === 'price_high') params.sort = 'budget_high';
      else params.sort = filters.sort;
      params.status = 'open';
      
      const res = await jobsAPI.list(params);
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (type === 'gigs') {
      fetchGigs();
    } else {
      fetchJobs();
    }
  }, [type, fetchGigs, fetchJobs]);

  // Check saved state for all gigs
  const handleToggleSave = async (gigId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await featuresAPI.toggleSavedGig(gigId);
      setSavedGigIds(prev => {
        const next = new Set(prev);
        if (res.data.saved) next.add(gigId);
        else next.delete(gigId);
        return next;
      });
    } catch {}
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const switchType = (newType) => {
    setType(newType);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('type', newType);
      return next;
    });
  };

  const displayName = user?.full_name || user?.name || '';
  const openGigOrder = (gig) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === gig.freelancer_id) {
      alert('You cannot order your own gig');
      return;
    }
    setQuickOrderGig(gig);
    setOrderRequirements('');
    setOrderStep('form');
    setOrderError('');
  };

  const chooseCategory = (category) => {
    updateFilter('category', category);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (category === 'All') next.delete('category');
      else next.set('category', category);
      return next;
    });
  };

  const gigShelves = gigs.length > 5 ? [gigs.slice(0, 5), gigs.slice(5, 10)] : [gigs];
  const liveCategoryFilters = useMemo(() => {
    const discovered = gigs.map((gig) => gig.category).filter(Boolean);
    return ['All', ...Array.from(new Set(discovered))].slice(0, 12);
  }, [gigs]);

  return (
    <PageTransition>
      <div className="marketplace-reference-page">
        <nav className="marketplace-category-bar" aria-label="Marketplace categories">
          <div className="marketplace-category-track">
            {TOP_CATEGORY_NAV.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => chooseCategory(item.value)}
                className={filters.category === item.value ? 'is-active' : ''}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <header className="marketplace-reference-header">
          <div className="marketplace-reference-heading">
            <div>
              <p className="marketplace-kicker">Otr Gebeya marketplace</p>
              <h1>{displayName ? `Welcome back, ${displayName}` : 'Find your next great freelancer'}</h1>
            </div>
            <Link to="/" className="marketplace-back-link"><ArrowLeft size={14} /> Back</Link>
          </div>

          <div className="marketplace-mode-row">
            <div className="marketplace-mode-switch" role="tablist" aria-label="Marketplace mode">
              <button type="button" onClick={() => switchType('gigs')} className={type === 'gigs' ? 'is-active' : ''}>
                <Package size={14} /> marketplace gigs
              </button>
              <button type="button" onClick={() => switchType('jobs')} className={type === 'jobs' ? 'is-active' : ''}>
                <ClipboardList size={14} /> marketplace jobs
              </button>
            </div>
          </div>

          <div className="marketplace-reference-search">
            <Search size={17} />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') (type === 'gigs' ? fetchGigs : fetchJobs)(); }}
              placeholder={type === 'gigs' ? 'Search gigs...' : 'Search jobs...'}
              aria-label={type === 'gigs' ? 'Search gigs' : 'Search jobs'}
            />
            <button type="button" onClick={type === 'gigs' ? fetchGigs : fetchJobs}>Search</button>
          </div>
          {type === 'gigs' && liveCategoryFilters.length > 1 && (
            <div className="marketplace-inline-filters" aria-label="Live gig category filters">
              <span>Filter:</span>
              {liveCategoryFilters.map((category) => (
                <button key={category} type="button" onClick={() => chooseCategory(category)} className={filters.category === category ? 'is-active' : ''}>
                  {category === 'All' ? 'All live gigs' : category}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="marketplace-reference-content">
          <aside className="marketplace-explore-panel">
            <p className="marketplace-explore-label">Explore</p>
            <div className="marketplace-explore-list">
              {EXPLORE_CATEGORIES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => chooseCategory(item.value)}
                  className={filters.category === item.value ? 'is-active' : ''}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="marketplace-category-select-label" htmlFor="marketplace-category-select">All categories</label>
            <select id="marketplace-category-select" value={filters.category} onChange={(event) => chooseCategory(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}
            </select>
            <div className="marketplace-filter-box">
              <label htmlFor="marketplace-sort">Sort by</label>
              <select id="marketplace-sort" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
                {type === 'gigs' && <option value="rating">Top rated</option>}
              </select>
              <div className="marketplace-price-fields">
                <input type="number" min="0" placeholder="Min ETB" value={filters.minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} />
                <input type="number" min="0" placeholder="Max ETB" value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} />
              </div>
            </div>
          </aside>

          <section className="marketplace-reference-results">
            {loading ? (
              <div className="marketplace-reference-loading"><Loader2 size={28} className="animate-spin" /><span>Finding real work on Otr Gebeya...</span></div>
            ) : type === 'gigs' ? (
              gigs.length === 0 ? (
                <div className="market-empty-state"><Search size={20} /><span>No live gigs match these filters.</span><Link to="/create-gig">Create the first gig <ExternalLink size={13} /></Link></div>
              ) : (
                gigShelves.map((shelf, index) => (
                  <section className="marketplace-gig-shelf" key={index}>
                    <MarketplaceSectionHeader
                      eyebrow={index === 0 ? 'Based on what you might be looking for' : ''}
                      title={index === 0 ? 'Services from Ethiopian talent' : 'Gigs you may like'}
                      canNavigate={shelf.length > 4}
                      onPrevious={() => document.getElementById(`marketplace-shelf-${index}`)?.scrollBy({ left: -720, behavior: 'smooth' })}
                      onNext={() => document.getElementById(`marketplace-shelf-${index}`)?.scrollBy({ left: 720, behavior: 'smooth' })}
                    />
                    <div id={`marketplace-shelf-${index}`} className="marketplace-shelf-track">
                      {shelf.map((gig) => <MarketplaceGigCard key={gig.id} gig={gig} saved={savedGigIds.has(gig.id)} onSave={handleToggleSave} onOrder={openGigOrder} />)}
                    </div>
                  </section>
                ))
              )
            ) : (
              jobs.length === 0 ? (
                <div className="market-empty-state"><ClipboardList size={20} /><span>No open jobs match these filters.</span><Link to="/post-job">Post a job <ExternalLink size={13} /></Link></div>
              ) : (
                <section className="marketplace-jobs-shelf">
                  <MarketplaceSectionHeader eyebrow="Open opportunities" title="Jobs from Otr Gebeya clients" />
                  <div className="marketplace-jobs-grid">
                    {jobs.map((job) => (
                      <article key={job.id} className="marketplace-job-card">
                        <div className="marketplace-job-card-top"><span className="marketplace-job-avatar">{job.client_name?.charAt(0) || '?'}</span><span className="marketplace-job-status">Open</span></div>
                        <Link to={`/jobs/${job.id}`} className="marketplace-shelf-title">{job.title}</Link>
                        <p>{job.description}</p>
                        <div className="marketplace-job-budget">{formatETB(job.budget_min)} – {formatETB(job.budget_max)}</div>
                        <div className="marketplace-job-footer"><span><User size={12} /> {job.client_name || 'Client'}</span><span><Clock size={12} /> {job.bid_count || 0} interested</span></div>
                        <div className="marketplace-job-actions">
                          <button type="button" onClick={() => { if (!user) { navigate('/login'); return; } navigate(`/messages?userId=${job.client_id}&userName=${encodeURIComponent(job.client_name || '')}`); }} className="marketplace-job-message"><MessageCircle size={13} /> Message</button>
                          <button type="button" onClick={() => { if (!user) { navigate('/login'); return; } setQuickOrderJob(job); setJobOrderAmount(''); setJobOrderProposal(''); setJobOrderStep('form'); setJobOrderError(''); }} className="marketplace-shelf-order"><ShoppingCart size={13} /> Quick order</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            )}
          </section>
        </main>
      </div>
      {/* ===== QUICK ORDER MODAL ===== */}
      <AnimatePresence>
        {quickOrderGig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setQuickOrderGig(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10" style={{ backgroundColor: '#f2f2f3', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={18} style={{ color: '#173a32' }} />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32', fontSize: '17px' }}>Quick Order</h3>
                    <p className="text-xs" style={{ color: '#777b86' }}>Order this gig directly</p>
                  </div>
                </div>
                <button onClick={() => setQuickOrderGig(null)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all" style={{ color: '#777b86' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Gig Summary */}
              <div style={{ backgroundColor: '#f2f2f3', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>                  <div className="flex items-center gap-3 mb-2">
                  <AppAvatar src={quickOrderGig.freelancer_picture} name={quickOrderGig.freelancer_name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#173a32', fontWeight: 450 }}>{quickOrderGig.freelancer_name}</p>
                    <div className="flex items-center gap-1">
                      <Star size={10} style={{ color: '#1f6f5c', fill: '#1f6f5c' }} />
                      <span className="text-xs" style={{ color: '#777b86' }}>{quickOrderGig.freelancer_rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1" style={{ color: '#173a32', fontWeight: 450 }}>{quickOrderGig.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="badge text-xs">{quickOrderGig.category}</span>
                  <span className="font-medium" style={{ color: '#173a32', fontWeight: 500 }}>ETB {quickOrderGig.price?.toLocaleString()}</span>
                </div>
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#979799' }}><Timer size={10} /> {quickOrderGig.delivery_time} days delivery</p>
              </div>

              {/* ===== GIG QUICK ORDER FLOW: Form → Inline Checkout → Verify → Done ===== */}
              {orderStep === 'done' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(93,42,26,0.1)', borderRadius: '9999px' }}>
                    <CheckCircle size={32} style={{ color: '#1f6f5c' }} />
                  </div>
                  <h4 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32', marginBottom: '4px' }}>Order Placed!</h4>
                  <p className="text-sm text-gray-500 mb-4">Your order has been placed. The freelancer will review and accept it shortly.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/orders')} className="btn-primary text-sm">View My Orders</button>
                    <button onClick={() => { setQuickOrderGig(null); }} className="btn-secondary text-sm">Continue Browsing</button>
                  </div>
                </motion.div>
              ) : orderStep === 'verifying' ? (
                <div className="text-center py-6">
                  <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Verifying your payment with Chapa...</p>
                </div>
              ) : orderStep === 'checkout' ? (
                <>
                  <div className="p-4 mb-4" style={{ backgroundColor: '#e7f5ef', borderRadius: '16px' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f6f5c' }}>
                        <Lock size={16} style={{ color: '#e7f5ef' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: '#1f6f5c', fontWeight: 450 }}>Complete Your Payment</h4>
                        <p className="text-xs mt-0.5" style={{ color: '#1f6f5c', opacity: 0.8 }}>Pay <strong>ETB {quickOrderGig.price?.toLocaleString()}</strong> using the inline widget below.</p>
                      </div>
                    </div>
                  </div>

                  {orderError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{orderError}</span>
                    </div>
                  )}

                  <ChapaInlineCheckout
                    publicKey={chapaPublicKey}
                    txRef={chapaTxRef}
                    amount={quickOrderGig.price}
                    currency="ETB"
                    onSuccess={async () => {
                      setOrderStep('verifying');
                      try {
                        const res = await paymentsAPI.verifyChapa(chapaTxRef);
                        if (res.data?.verified) {
                          setOrderStep('done');
                        } else {
                          setOrderError('Payment not yet confirmed. Please try again.');
                          setOrderStep('checkout');
                        }
                      } catch {
                        setOrderError('Could not verify payment. Please try again.');
                        setOrderStep('checkout');
                      }
                    }}
                    onFailure={(err) => {
                      setOrderError(err?.message || 'Payment was not completed. Please try again.');
                      setOrderStep('form');
                    }}
                    onClose={() => {
                      setOrderError('Checkout was closed. You can try again when ready.');
                      setOrderStep('form');
                    }}
                  />

                  <button onClick={() => { setOrderStep('form'); setOrderError(''); }}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-all block mx-auto">
                    Cancel and start over
                  </button>
                </>
              ) : (
                /* Form Step */
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Requirements <span className="text-gray-400">(optional)</span></label>
                    <textarea
                      value={orderRequirements}
                      onChange={(e) => setOrderRequirements(e.target.value)}
                      placeholder="Any specific instructions for the freelancer..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-gebeya-400 focus:ring-2 focus:ring-gebeya-100 resize-none transition-all"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      setOrderLoading(true);
                      setOrderError('');
                      try {
                        const res = await paymentsAPI.initiateChapa({
                          gigId: quickOrderGig.id,
                          amount: quickOrderGig.price,
                          currency: 'ETB',
                          email: user?.email || 'customer@erq.et',
                          first_name: user?.full_name?.split(' ')[0] || 'Customer',
                          last_name: user?.full_name?.split(' ').slice(1).join(' ') || 'User',
                          description: `Payment for ${quickOrderGig.title}`,
                          requirements: orderRequirements,
                          itemTitle: 'Quick Order',
                        });
                        setChapaTxRef(res.data.tx_ref);
                        setChapaPublicKey(res.data.public_key || '');
                        setOrderStep('checkout');
                      } catch (err) {
                        setOrderError(err.response?.data?.error || 'Failed to initiate payment.');
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                    disabled={orderLoading}
                    style={{ backgroundColor: '#173a32', color: '#ffffff' }}
                    className="w-full py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {orderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Initiating Payment...</>
                    ) : (
                      <><ShoppingCart size={16} /> Pay with Chapa — ETB {quickOrderGig.price?.toLocaleString()}</>
                    )}
                  </button>

                  {/* Divider */}
                  <div                      className="mt-3 p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: '#e7f5ef', borderRadius: '16px', color: '#1f6f5c' }}>
                    <Lock size={12} className="shrink-0 mt-0.5" />
                    <span><strong>Inline Checkout:</strong> Pay directly on this page — no redirect needed.</span>
                  </div>

                  {orderError && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{orderError}</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== QUICK ORDER FOR JOBS MODAL ===== */}
      <AnimatePresence>
        {quickOrderJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setQuickOrderJob(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gebeya-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart size={18} className="text-gebeya-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Quick Order</h3>
                    <p className="text-xs text-gray-500">Order this job directly</p>
                  </div>
                </div>
                <button onClick={() => setQuickOrderJob(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all">
                  <X size={16} />
                </button>
              </div>

              {/* Job Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-green text-[10px]">{quickOrderJob.category}</span>
                  <span className="text-gray-400 text-[10px]">{quickOrderJob.bid_count || 0} interested</span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{quickOrderJob.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{quickOrderJob.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">👤 {quickOrderJob.client_name}</span>
                  <span className="font-bold text-gebeya-600 text-sm">
                    ETB {Number(quickOrderJob.budget_min).toLocaleString()} - {Number(quickOrderJob.budget_max).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ===== JOB QUICK ORDER FLOW: Form → Inline Checkout → Verify → Done ===== */}
              {jobOrderStep === 'done' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(93,42,26,0.1)', borderRadius: '9999px' }}>
                    <CheckCircle size={32} style={{ color: '#1f6f5c' }} />
                  </div>
                  <h4 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32', marginBottom: '4px' }}>Order Placed!</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Payment of <strong>ETB {parseFloat(jobOrderAmount || 0).toLocaleString()}</strong> has been confirmed.
                    The client <strong>{quickOrderJob.client_name}</strong> will be notified.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/orders')} className="btn-primary text-sm">View My Orders</button>
                    <button onClick={() => setQuickOrderJob(null)} className="btn-secondary text-sm">Continue Browsing</button>
                  </div>
                </motion.div>
              ) : jobOrderStep === 'verifying' ? (
                <div className="text-center py-6">
                  <Loader2 size={28} className="animate-spin text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Verifying your payment with Chapa...</p>
                </div>
              ) : jobOrderStep === 'checkout' ? (
                <>
                  <div className="p-4 mb-4" style={{ backgroundColor: '#e7f5ef', borderRadius: '16px' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f6f5c' }}>
                        <Lock size={16} style={{ color: '#e7f5ef' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: '#1f6f5c', fontWeight: 450 }}>Complete Your Payment</h4>
                        <p className="text-xs mt-0.5" style={{ color: '#1f6f5c', opacity: 0.8 }}>Pay <strong>ETB {parseFloat(jobOrderAmount || 0).toLocaleString()}</strong> using the inline widget below.</p>
                      </div>
                    </div>
                  </div>

                  {jobOrderError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{jobOrderError}</span>
                    </div>
                  )}

                  <ChapaInlineCheckout
                    publicKey={jobChapaPublicKey}
                    txRef={jobChapaTxRef}
                    amount={jobOrderAmount}
                    currency="ETB"
                    onSuccess={async () => {
                      setJobOrderStep('verifying');
                      try {
                        const res = await paymentsAPI.verifyChapa(jobChapaTxRef);
                        if (res.data?.verified) {
                          // Payment verified — now create the job order
                          await jobsAPI.quickOrder(quickOrderJob.id, {
                            amount: parseFloat(jobOrderAmount),
                            proposal: jobOrderProposal,
                          });
                          setJobOrderStep('done');
                          setJobs(prev => prev.map(j =>
                            j.id === quickOrderJob.id
                              ? { ...j, awarded_to: user?.id, status: 'in_progress' }
                              : j
                          ));
                        } else {
                          setJobOrderError('Payment not yet confirmed. Please try again.');
                          setJobOrderStep('checkout');
                        }
                      } catch (err) {
                        setJobOrderError(err.response?.data?.error || 'Could not verify payment. Please try again.');
                        setJobOrderStep('checkout');
                      }
                    }}
                    onFailure={(err) => {
                      setJobOrderError(err?.message || 'Payment was not completed. Please try again.');
                      setJobOrderStep('form');
                    }}
                    onClose={() => {
                      setJobOrderError('Checkout was closed. You can try again when ready.');
                      setJobOrderStep('form');
                    }}
                  />

                  <button onClick={() => { setJobOrderStep('form'); setJobOrderError(''); }}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-all block mx-auto">
                    Cancel and start over
                  </button>
                </>
              ) : (
                /* Form Step */
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Your Price (ETB) <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETB</span>
                      <input type="number" required min={1} value={jobOrderAmount}
                        onChange={(e) => setJobOrderAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-gebeya-400 focus:ring-2 focus:ring-gebeya-100 transition-all"
                        placeholder="Your price for this job" />
                    </div>
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      <button onClick={() => setJobOrderAmount(String(Number(quickOrderJob.budget_min) || 0))}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200">Min {Number(quickOrderJob.budget_min).toLocaleString()}</button>
                      <button onClick={() => setJobOrderAmount(String(Math.round((Number(quickOrderJob.budget_min) + Number(quickOrderJob.budget_max)) / 2)))}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200">Avg {Math.round((Number(quickOrderJob.budget_min) + Number(quickOrderJob.budget_max)) / 2).toLocaleString()}</button>
                      <button onClick={() => setJobOrderAmount(String(Number(quickOrderJob.budget_max) || 0))}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200">Max {Number(quickOrderJob.budget_max).toLocaleString()}</button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Message <span className="text-gray-400">(optional)</span></label>
                    <textarea value={jobOrderProposal} onChange={(e) => setJobOrderProposal(e.target.value)}
                      placeholder="Add a note about your offer..." rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-gebeya-400 focus:ring-2 focus:ring-gebeya-100 resize-none transition-all" />
                  </div>

                  <button
                    onClick={async () => {
                      if (!jobOrderAmount || parseFloat(jobOrderAmount) <= 0) {
                        setJobOrderError('Please enter a valid amount');
                        return;
                      }
                      setJobOrderLoading(true);
                      setJobOrderError('');
                      try {
                        const res = await paymentsAPI.initiateChapa({
                          amount: parseFloat(jobOrderAmount),
                          currency: 'ETB',
                          email: user?.email || 'customer@erq.et',
                          first_name: user?.full_name?.split(' ')[0] || 'Customer',
                          last_name: user?.full_name?.split(' ').slice(1).join(' ') || 'User',
                          description: `Quick order for job: ${quickOrderJob.title}`,
                        });
                        setJobChapaTxRef(res.data.tx_ref);
                        setJobChapaPublicKey(res.data.public_key || '');
                        setJobOrderStep('checkout');
                      } catch (err) {
                        setJobOrderError(err.response?.data?.error || 'Failed to initiate payment.');
                      } finally {
                        setJobOrderLoading(false);
                      }
                    }}
                    disabled={jobOrderLoading || !jobOrderAmount}
                    style={{ backgroundColor: '#173a32', color: '#ffffff' }}
                    className="w-full py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {jobOrderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Initiating Payment...</>
                    ) : (
                      <><ShoppingCart size={16} /> Pay with Chapa — ETB {parseFloat(jobOrderAmount || 0).toLocaleString()}</>
                    )}
                  </button>

                  {/* Divider */}
                  <div                      className="mt-3 p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: '#e7f5ef', borderRadius: '16px', color: '#1f6f5c' }}>
                    <Lock size={12} className="shrink-0 mt-0.5" />
                    <span><strong>Inline Checkout:</strong> Pay directly on this page — no redirect needed.</span>
                  </div>

                  {jobOrderError && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{jobOrderError}</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
