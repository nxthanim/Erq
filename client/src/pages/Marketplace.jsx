import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { gigsAPI, jobsAPI, featuresAPI, ordersAPI, paymentsAPI } from '../utils/api';
import ChapaInlineCheckout from '../components/ChapaInlineCheckout';
import { PageTransition } from '../components/ScrollReveal';
import { GsapStagger } from '../components/GsapAnimations';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ShoppingCart, Eye, CheckCircle, MessageCircle, ExternalLink, Search, Package, ClipboardList, Heart, User, Clock, Calendar, Lock, AlertCircle, Timer, Star, ArrowLeft } from 'lucide-react';
import { Card, Button } from '@heroui/react';
import AppAvatar from '../components/ui/avatar';

const categories = ['All', 'Translation', 'Graphic Design', 'Video Editing', 'Web Development', 'Virtual Assistant', 'Social Media Management'];

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

  // Quick Order for Jobs modal state
  const [quickOrderJob, setQuickOrderJob] = useState(null);
  const [jobOrderAmount, setJobOrderAmount] = useState('');
  const [jobOrderProposal, setJobOrderProposal] = useState('');
  const [jobOrderLoading, setJobOrderLoading] = useState(false);
  const [jobOrderStep, setJobOrderStep] = useState('form'); // form | chapa_opened | verifying | done
  const [jobOrderError, setJobOrderError] = useState('');
  const [jobChapaTxRef, setJobChapaTxRef] = useState('');

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

  return (
    <PageTransition>
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #ececec' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, fontSize: 'clamp(24px, 3vw, 36px)', color: '#17191c', letterSpacing: '-0.66px', marginBottom: '4px' }}>{t('marketplace.title')}</h1>
              <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{t('marketplace.subtitle')}</p>
            </div>
            <Link to="/" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> {t('common.back')}
            </Link>
          </div>

          {/* Tabs: Gigs / Jobs */}
          <div className="flex gap-1 mb-4 p-1 w-fit" style={{ backgroundColor: '#f2f2f3', borderRadius: '16px' }}>
            <button
              onClick={() => switchType('gigs')}
              className={`px-5 py-2 rounded-[12px] text-sm font-medium transition-all ${
                type === 'gigs'
                  ? 'bg-white shadow-sm'
                  : ''
              }`}
              style={{ color: type === 'gigs' ? '#17191c' : '#777b86' }}
            >
              <Package size={14} className="inline mr-1.5" />
              {t('marketplace.gigs') || 'Gigs'}
            </button>
            <button
              onClick={() => switchType('jobs')}
              className={`px-5 py-2 rounded-[12px] text-sm font-medium transition-all ${
                type === 'jobs'
                  ? 'bg-white shadow-sm'
                  : ''
              }`}
              style={{ color: type === 'jobs' ? '#17191c' : '#777b86' }}
            >
              <ClipboardList size={14} className="inline mr-1.5" />
              {t('marketplace.jobs') || 'Jobs'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#a3a6af' }} />
              <input
                type="text"
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder={type === 'gigs' ? (t('common.search') + ' gigs...') : (t('common.search') + ' jobs...')}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '16px',
                  border: '1px solid #ececec',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#17191c',
                  fontFamily: 'var(--font-sohne)',
                  fontSize: '15px',
                }}
              />
            </div>
            <button onClick={type === 'gigs' ? fetchGigs : fetchJobs} className="btn-primary" style={{ height: '48px', lineHeight: '48px', padding: '0 24px' }}>{t('common.search')}</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Filters Sidebar */}
        <aside className="w-64 shrink-0">
          <div style={{ backgroundColor: '#f2f2f3', borderRadius: '24px', padding: '20px' }} className="sticky top-6 space-y-5">
            <h3 style={{ fontFamily: 'var(--font-sohne)', fontWeight: 450, color: '#17191c' }}>{t('common.filter')}</h3>

            {/* Category */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{t('common.category')}</label>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => updateFilter('category', cat)}
                    className={`w-full text-left px-3 py-2 rounded-[12px] text-sm transition-all`}
                    style={{
                      color: filters.category === cat ? '#17191c' : '#777b86',
                      backgroundColor: filters.category === cat ? '#ffffff' : 'transparent',
                      fontWeight: filters.category === cat ? 450 : 400,
                    }}
                  >
                    {cat === 'All' ? t('marketplace.all.categories') : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{t('marketplace.price.range')}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  style={{
                    width: '50%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #e5e5e7',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#17191c',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  style={{
                    width: '50%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #e5e5e7',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#17191c',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{t('common.sort')}</label>
              <select
                value={filters.sort}
                onChange={e => updateFilter('sort', e.target.value)}
                className="input-field text-sm"
              >
                <option value="newest">{t('marketplace.sort.newest')}</option>
                <option value="price_low">{type === 'gigs' ? t('marketplace.sort.price.low') : 'Budget: Low to High'}</option>
                <option value="price_high">{type === 'gigs' ? t('marketplace.sort.price.high') : 'Budget: High to Low'}</option>
                {type === 'gigs' && (
                  <option value="rating">{t('marketplace.sort.rating')}</option>
                )}
              </select>
            </div>

            <button onClick={type === 'gigs' ? fetchGigs : fetchJobs} className="btn-primary w-full text-sm" style={{ height: '40px', lineHeight: '40px', padding: '0 16px', fontSize: '13px' }}>{t('common.filter')}</button>
          </div>
        </aside>

        {/* Content: Gigs or Jobs */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-2" style={{ borderColor: '#e5e5e7', borderTopColor: '#17191c' }}></div>
            </div>
          ) : type === 'gigs' ? (
            /* === GIGS VIEW === */
            gigs.length === 0 ? (
              <div className="text-center py-20">
                <Search size={48} className="block mx-auto mb-4" style={{ color: '#a3a6af' }} />
                <h3 style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, fontSize: '24px', color: '#17191c', marginBottom: '8px' }}>{t('common.no.results')}</h3>
                <p style={{ color: '#777b86' }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <GsapStagger stagger={0.08} animation="fadeUp" className="flex flex-col gap-4">
                {gigs.map(gig => {
                  let portfolioImgs = [];
                  try { portfolioImgs = JSON.parse(gig.portfolio_images || '[]'); } catch {}
                  return (
                    <Card key={gig.id} className="w-full items-stretch md:flex-row group"
                      style={{ backgroundColor: '#f2f2f3', borderRadius: '24px', border: 'none', boxShadow: 'none' }}>
                      {/* Image / Avatar Section */}
                      {portfolioImgs.length > 0 ? (
                        <Link to={`/gigs/${gig.id}`} className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-full sm:w-[200px] md:rounded-l-[24px] md:rounded-r-none"
                          style={{ backgroundColor: '#ffffff' }}>
                          <img alt={gig.title}
                            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover select-none group-hover:scale-125 transition-transform duration-500"
                            loading="lazy" src={portfolioImgs[0]} />
                        </Link>
                      ) : (
                        <Link to={`/gigs/${gig.id}`} className="relative h-[100px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-full sm:w-[100px] flex items-center justify-center md:rounded-l-[24px] md:rounded-r-none"
                          style={{ backgroundColor: '#fbe1d1' }}>
                          <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="lg" />
                        </Link>
                      )}
                      <div className="flex flex-1 flex-col gap-2 p-5 relative">
                        {/* Save Button */}
                        <button onClick={(e) => handleToggleSave(gig.id, e)}
                          className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110 ${savedGigIds.has(gig.id) ? '' : 'opacity-0 group-hover:opacity-100'}`}
                          style={{ backgroundColor: savedGigIds.has(gig.id) ? 'rgba(93,42,26,0.1)' : '#ffffff', color: savedGigIds.has(gig.id) ? '#5d2a1a' : '#a3a6af' }}
                          title={savedGigIds.has(gig.id) ? 'Remove from saved' : 'Save gig'}>
                          <Heart size={16} fill={savedGigIds.has(gig.id) ? '#5d2a1a' : 'none'} />
                        </button>
                        {/* Category + Status */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>{gig.category}</span>
                          <span className="text-[10px] flex items-center gap-1" style={{ color: '#979799' }}>
                            <Timer size={10} /> {gig.delivery_time} {t('marketplace.days')}
                          </span>
                        </div>
                        {/* Title + Price */}
                        <div className="flex items-start justify-between gap-4">
                          <Link to={`/gigs/${gig.id}`} className="flex-1 min-w-0">
                            <h3 className="font-medium transition-opacity group-hover:opacity-60"
                              style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{gig.title}</h3>
                          </Link>
                          <span className="font-medium shrink-0" style={{ color: '#5d2a1a', fontWeight: 500, fontSize: '15px' }}>
                            ETB {gig.price?.toLocaleString()}
                          </span>
                        </div>
                        {/* Description */}
                        <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#777b86' }}>
                          {gig.description}
                        </p>
                        {/* Footer */}
                        <div className="mt-auto flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between pt-3"
                          style={{ borderTop: '1px solid #e5e5e7' }}>
                          <Link to={`/gigs/${gig.id}`} className="flex items-center gap-2 min-w-0 group/avatar">
                            <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate transition-colors group-hover/avatar:opacity-70"
                                style={{ color: '#17191c' }}>{gig.freelancer_name}</p>
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5">
                                  <Star size={9} style={{ color: '#5d2a1a', fill: '#5d2a1a' }} />
                                  <span className="text-[10px]" style={{ color: '#777b86' }}>{gig.freelancer_rating?.toFixed(1) || '0.0'}</span>
                                </div>
                                {gig.freelancer_verified && <span className="text-[9px]" style={{ color: '#5d2a1a' }}>✓</span>}
                              </div>
                            </div>
                          </Link>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              onClick={() => {
                                if (!user) { navigate('/login'); return; }
                                if (user.id === gig.freelancer_id) { alert('You cannot order your own gig'); return; }
                                setQuickOrderGig(gig);
                                setOrderRequirements('');
                                setOrderStep('form');
                                setOrderError('');
                              }}
                              className="w-full sm:w-auto h-9 px-4 text-xs rounded-full"
                              style={{ backgroundColor: '#17191c', color: '#ffffff', border: 'none', minWidth: 0 }}
                            >
                              <ShoppingCart size={12} />
                              Quick Order
                            </Button>
                            <Link to={`/gigs/${gig.id}`}
                              className="inline-flex items-center justify-center gap-1 h-9 px-4 text-xs rounded-full shrink-0"
                              style={{ backgroundColor: 'transparent', color: '#777b86', border: '1px solid #ececec' }}>
                              <Eye size={11} /> Details
                            </Link>
                          </div>
                    </div>
                  </div>
                </Card>                      );
                })}
              </GsapStagger>
            )
          ) : (
            /* === JOBS VIEW === */
            jobs.length === 0 ? (
              <div className="text-center py-20">
                <ClipboardList size={48} className="block mx-auto mb-4" style={{ color: '#a3a6af' }} />
                <h3 style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, fontSize: '24px', color: '#17191c', marginBottom: '8px' }}>{t('common.no.results')}</h3>
                <p style={{ color: '#777b86' }}>No open jobs match your filters</p>
              </div>
            ) : (
              <GsapStagger stagger={0.08} animation="fadeUp" className="flex flex-col gap-4">
                {jobs.map(job => (
                  <Card key={job.id} className="w-full items-stretch md:flex-row group"
                    style={{ backgroundColor: '#f2f2f3', borderRadius: '24px', border: 'none', boxShadow: 'none' }}>
                    {/* Avatar Section */}
                    <Link to={`/jobs/${job.id}`}
                      className="relative h-[100px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-full sm:w-[100px] flex items-center justify-center md:rounded-l-[24px] md:rounded-r-none"
                      style={{ backgroundColor: '#fbe1d1' }}>
                      <span className="text-2xl font-bold" style={{ color: '#5d2a1a' }}>
                        {job.client_name?.charAt(0) || '?'}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      {/* Tags Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: '#fbe1d1', color: '#5d2a1a' }}>{job.category}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: job.awarded_to ? 'rgba(93,42,26,0.1)' : '#ffffff', color: job.awarded_to ? '#5d2a1a' : '#979799' }}>
                          {job.awarded_to ? 'In Progress' : 'Open'}
                        </span>
                        <span className="text-[10px]" style={{ color: '#979799' }}>{job.bid_count || 0} interested</span>
                      </div>
                      {/* Title + Budget */}
                      <div className="flex items-start justify-between gap-4">
                        <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                          <h3 style={{ fontFamily: 'var(--font-sohne)', fontWeight: 450, color: '#17191c', transition: 'opacity 0.2s', fontSize: '15px' }}
                            className="group-hover:opacity-60">{job.title}</h3>
                        </Link>
                        <span className="font-medium shrink-0" style={{ color: '#5d2a1a', fontWeight: 500, fontSize: '14px' }}>
                          ETB {Number(job.budget_min).toLocaleString()} - {Number(job.budget_max).toLocaleString()}
                        </span>
                      </div>
                      {/* Description */}
                      <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: '#777b86' }}>
                        {job.description}
                      </p>
                      {/* Footer */}
                      <div className="mt-auto flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between pt-3"
                        style={{ borderTop: '1px solid #e5e5e7' }}>
                        <div className="flex items-center gap-3 text-xs" style={{ color: '#979799' }}>
                          <span className="flex items-center gap-1"><User size={10} /> {job.client_name}</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {new Date(job.created_at).toLocaleDateString()}</span>
                          {job.deadline && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(job.deadline).toLocaleDateString()}</span>}
                        </div>
                        {!job.awarded_to && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              onClick={() => {
                                if (!user) { navigate('/login'); return; }
                                navigate(`/messages?userId=${job.client_id}&userName=${encodeURIComponent(job.client_name)}`);
                              }}
                              className="w-full sm:w-auto h-9 px-4 text-xs rounded-full"
                              style={{ backgroundColor: 'transparent', color: '#17191c', border: '1px solid #17191c', minWidth: 0 }}
                            >
                              <MessageCircle size={12} />
                              Message
                            </Button>
                            <Button
                              onClick={() => {
                                if (!user) { navigate('/login'); return; }
                                setQuickOrderJob(job);
                                setJobOrderAmount('');
                                setJobOrderProposal('');
                                setJobOrderStep('form');
                                setJobOrderError('');
                              }}
                              className="w-full sm:w-auto h-9 px-4 text-xs rounded-full"
                              style={{ backgroundColor: '#17191c', color: '#ffffff', border: 'none', minWidth: 0 }}
                            >
                              <ShoppingCart size={12} />
                              Quick Order
                            </Button>
                            <Link to={`/jobs/${job.id}`}
                              className="inline-flex items-center justify-center gap-1 h-9 px-4 text-xs rounded-full shrink-0"
                              style={{ backgroundColor: 'transparent', color: '#777b86', border: '1px solid #ececec' }}>
                              <Eye size={11} /> Details
                            </Link>
                          </div>
                        )}
                    </div>
                  </div>
                </Card>
                ))}
              </GsapStagger>
            )
          )}
        </div>
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
                    <ShoppingCart size={18} style={{ color: '#17191c' }} />
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c', fontSize: '17px' }}>Quick Order</h3>
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
                    <p className="font-medium text-sm truncate" style={{ color: '#17191c', fontWeight: 450 }}>{quickOrderGig.freelancer_name}</p>
                    <div className="flex items-center gap-1">
                      <Star size={10} style={{ color: '#5d2a1a', fill: '#5d2a1a' }} />
                      <span className="text-xs" style={{ color: '#777b86' }}>{quickOrderGig.freelancer_rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1" style={{ color: '#17191c', fontWeight: 450 }}>{quickOrderGig.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="badge text-xs">{quickOrderGig.category}</span>
                  <span className="font-medium" style={{ color: '#17191c', fontWeight: 500 }}>ETB {quickOrderGig.price?.toLocaleString()}</span>
                </div>
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#979799' }}><Timer size={10} /> {quickOrderGig.delivery_time} days delivery</p>
              </div>

              {/* ===== GIG QUICK ORDER FLOW: Form → Inline Checkout → Verify → Done ===== */}
              {orderStep === 'done' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(93,42,26,0.1)', borderRadius: '9999px' }}>
                    <CheckCircle size={32} style={{ color: '#5d2a1a' }} />
                  </div>
                  <h4 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c', marginBottom: '4px' }}>Order Placed!</h4>
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
                  <div className="p-4 mb-4" style={{ backgroundColor: '#fbe1d1', borderRadius: '16px' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#5d2a1a' }}>
                        <Lock size={16} style={{ color: '#fbe1d1' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: '#5d2a1a', fontWeight: 450 }}>Complete Your Payment</h4>
                        <p className="text-xs mt-0.5" style={{ color: '#5d2a1a', opacity: 0.8 }}>Pay <strong>ETB {quickOrderGig.price?.toLocaleString()}</strong> using the inline widget below.</p>
                      </div>
                    </div>
                  </div>

                  {orderError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{orderError}</span>
                    </div>
                  )}

                  <ChapaInlineCheckout
                    publicKey="CHAPUBK_TEST-HgtwLy9cPhdQXVu7mPz16aJGeYE39Tok"
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
                        setOrderStep('checkout');
                      } catch (err) {
                        setOrderError(err.response?.data?.error || 'Failed to initiate payment.');
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                    disabled={orderLoading}
                    style={{ backgroundColor: '#17191c', color: '#ffffff' }}
                    className="w-full py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {orderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Initiating Payment...</>
                    ) : (
                      <><ShoppingCart size={16} /> Pay with Chapa — ETB {quickOrderGig.price?.toLocaleString()}</>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1" style={{ height: '1px', backgroundColor: '#ececec' }} />
                    <span style={{ color: '#979799', fontSize: '12px' }}>or</span>
                    <div className="flex-1" style={{ height: '1px', backgroundColor: '#ececec' }} />
                  </div>

                  {/* Test Order Button */}
                  <button
                    onClick={async () => {
                      setOrderLoading(true);
                      setOrderError('');
                      try {
                        const orderRes = await ordersAPI.create({
                          gigId: quickOrderGig.id,
                          requirements: orderRequirements || 'Test order — created via Quick Order on Marketplace.',
                        });
                        const newOrderId = orderRes.data?.order?.id;
                        if (newOrderId) {
                          navigate(`/orders/${newOrderId}`);
                        } else {
                          setOrderStep('done');
                        }
                      } catch (err) {
                        setOrderError(err.response?.data?.error || 'Failed to create test order. Please log in first.');
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                    disabled={orderLoading}
                    style={{ border: '1px solid #ececec', color: '#777b86', backgroundColor: '#fafafb' }}
                    className="w-full py-3 rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {orderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Creating Test Order...</>
                    ) : (
                      <><Package size={16} /> Test Order (Skip Payment)</>
                    )}
                  </button>

                  <div                      className="mt-3 p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: '#fbe1d1', borderRadius: '16px', color: '#5d2a1a' }}>
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
                    <CheckCircle size={32} style={{ color: '#5d2a1a' }} />
                  </div>
                  <h4 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c', marginBottom: '4px' }}>Order Placed!</h4>
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
                  <div className="p-4 mb-4" style={{ backgroundColor: '#fbe1d1', borderRadius: '16px' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#5d2a1a' }}>
                        <Lock size={16} style={{ color: '#fbe1d1' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: '#5d2a1a', fontWeight: 450 }}>Complete Your Payment</h4>
                        <p className="text-xs mt-0.5" style={{ color: '#5d2a1a', opacity: 0.8 }}>Pay <strong>ETB {parseFloat(jobOrderAmount || 0).toLocaleString()}</strong> using the inline widget below.</p>
                      </div>
                    </div>
                  </div>

                  {jobOrderError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{jobOrderError}</span>
                    </div>
                  )}

                  <ChapaInlineCheckout
                    publicKey="CHAPUBK_TEST-HgtwLy9cPhdQXVu7mPz16aJGeYE39Tok"
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
                        setJobOrderStep('checkout');
                      } catch (err) {
                        setJobOrderError(err.response?.data?.error || 'Failed to initiate payment.');
                      } finally {
                        setJobOrderLoading(false);
                      }
                    }}
                    disabled={jobOrderLoading || !jobOrderAmount}
                    style={{ backgroundColor: '#17191c', color: '#ffffff' }}
                    className="w-full py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {jobOrderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Initiating Payment...</>
                    ) : (
                      <><ShoppingCart size={16} /> Pay with Chapa — ETB {parseFloat(jobOrderAmount || 0).toLocaleString()}</>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1" style={{ height: '1px', backgroundColor: '#ececec' }} />
                    <span style={{ color: '#979799', fontSize: '12px' }}>or</span>
                    <div className="flex-1" style={{ height: '1px', backgroundColor: '#ececec' }} />
                  </div>

                  {/* Test Order Button */}
                  <button
                    onClick={async () => {
                      if (!jobOrderAmount || parseFloat(jobOrderAmount) <= 0) {
                        setJobOrderError('Please enter a valid amount');
                        return;
                      }
                      setJobOrderLoading(true);
                      setJobOrderError('');
                      try {
                        // Create the order directly (bypass Chapa)
                        const jobRes = await jobsAPI.quickOrder(quickOrderJob.id, {
                          amount: parseFloat(jobOrderAmount),
                          proposal: jobOrderProposal || 'Test order — created via Quick Order on Marketplace.',
                        });
                        const txnId = jobRes.data?.transactionId;
                        if (txnId) {
                          // Navigate to the marketplace's orders view for this job
                          navigate(`/my-jobs`);
                        } else {
                          setJobOrderStep('done');
                        }
                        setJobs(prev => prev.map(j =>
                          j.id === quickOrderJob.id
                            ? { ...j, awarded_to: user?.id, status: 'in_progress' }
                            : j
                        ));
                      } catch (err) {
                        setJobOrderError(err.response?.data?.error || 'Failed to create test order. Please log in first.');
                      } finally {
                        setJobOrderLoading(false);
                      }
                    }}
                    disabled={jobOrderLoading || !jobOrderAmount}
                    style={{ border: '1px solid #ececec', color: '#777b86', backgroundColor: '#fafafb' }}
                    className="w-full py-3 rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {jobOrderLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Creating Test Order...</>
                    ) : (
                      <><Package size={16} /> Test Order (Skip Payment)</>
                    )}
                  </button>

                  <div                      className="mt-3 p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: '#fbe1d1', borderRadius: '16px', color: '#5d2a1a' }}>
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
    </div>
    </PageTransition>
  );
}
