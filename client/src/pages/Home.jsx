import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import { gigsAPI } from '../utils/api';
import ScrollReveal, { StaggerContainer, StaggerItem, PageTransition } from '../components/ScrollReveal';
import ThreeScene from '../components/ThreeScene';
import AppShowcase from '../components/AppShowcase';
import LiveActivityFeed from '../components/LiveActivityFeed';
import FreelancerLeaderboard from '../components/FreelancerLeaderboard';
import AIImageGenerator from '../components/AIImageGenerator';
import LiveChatWidget from '../components/LiveChatWidget';
import {
  Palette, TrendingUp, FileText, Film, Music, Laptop,
  Bot, Briefcase, BarChart3, Camera, DollarSign, Sprout, Handshake, Smartphone, Globe,
  Lock, Pen, Search,
  Building2, Rocket, Trophy, Eye, Timer, Flame, Flag,
  FolderOpen, Sun, Moon, Sparkles, ArrowRight,
  Users, CheckCircle, TrendingUp as TrendingIcon,
  ClipboardList, MessageCircle, Store,
} from 'lucide-react';

const categories = [
  { name: 'Graphics & Design', icon: <Palette size={20} />, count: '128 gigs' },
  { name: 'Digital Marketing', icon: <TrendingUp size={20} />, count: '96 gigs' },
  { name: 'Writing & Translation', icon: <FileText size={20} />, count: '72 gigs' },
  { name: 'Video & Animation', icon: <Film size={20} />, count: '64 gigs' },
  { name: 'Music & Audio', icon: <Music size={20} />, count: '48 gigs' },
  { name: 'Programming & Tech', icon: <Laptop size={20} />, count: '156 gigs' },
  { name: 'AI Services', icon: <Bot size={20} />, count: '42 gigs' },
  { name: 'Consulting', icon: <Briefcase size={20} />, count: '36 gigs' },
  { name: 'Data & Analytics', icon: <BarChart3 size={20} />, count: '28 gigs' },
  { name: 'Photography', icon: <Camera size={20} />, count: '24 gigs' },
  { name: 'Finance', icon: <DollarSign size={20} />, count: '18 gigs' },
  { name: 'Virtual Assistant', icon: <Handshake size={20} />, count: '32 gigs' },
];

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [featuredGigs, setFeaturedGigs] = useState([]);
  const [trendingGigs, setTrendingGigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  useEffect(() => {
    Promise.all([
      gigsAPI.list({ sort: 'newest' }),
      gigsAPI.trending()
    ]).then(([featuredRes, trendingRes]) => {
      setFeaturedGigs(featuredRes.data.gigs?.slice(0, 6) || []);
      setTrendingGigs(trendingRes.data.gigs?.slice(0, 4) || []);
    }).catch(() => {});
  }, []);

  const [popularGigs, setPopularGigs] = useState([]);
  useEffect(() => {
    gigsAPI.popular().then(res => setPopularGigs(res.data.gigs?.slice(0, 6) || [])).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* ========== TOP NAV — Steep whisper-quiet transparent bar ========== */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-page mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
                  <img src="/high-resolution-color-logo.png" alt="Erq" className="h-7 w-auto no-grayscale" />
                </div>
                <span className="text-lg" style={{ fontFamily: 'var(--font-signifier)', color: '#17191c', fontWeight: 400, letterSpacing: '-0.5px' }}>Erq</span>
              </Link>

              {/* Nav links — whisper-quiet */}
              <div className="hidden lg:flex items-center gap-6">
                {/* Categories Dropdown */}
                <div className="relative" onMouseEnter={() => setShowCategories(true)} onMouseLeave={() => setShowCategories(false)}>
                  <button className="nav-link flex items-center gap-1.5 text-sm" style={{ color: '#777b86' }}>
                    Categories
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showCategories && (
                    <div className="absolute top-full left-0 mt-3 w-[520px] animate-fade-in p-3" style={{ backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: 'oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 8px 40px 0px' }}>
                      <div className="grid grid-cols-3 gap-1">
                        {categories.map((cat) => (
                          <Link
                            key={cat.name}
                            to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                            className="flex items-center gap-3 p-3 rounded-[16px] transition-all hover:bg-[#f2f2f3]"
                          >
                            <span style={{ color: '#777b86' }}>{cat.icon}</span>
                            <div>
                              <p className="text-sm" style={{ color: '#17191c', fontWeight: 400 }}>{cat.name}</p>
                              <p className="text-xs" style={{ color: '#979799' }}>{cat.count}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Link to="/marketplace" className="nav-link text-sm" style={{ color: '#777b86' }}>{t('nav.marketplace')}</Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* AI Generator */}
              <button onClick={() => setShowAIGenerator(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-sm transition-all"
                style={{ color: '#777b86' }}
              >
                <Sparkles size={15} />
                <span>AI Image</span>
              </button>

              {/* Theme Toggle */}
              <button onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-[12px] transition-all hover:bg-[#f2f2f3]"
                style={{ color: '#777b86' }}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <Link to={user.role === 'freelancer' ? '/my-gigs' : user.role === 'admin' ? '/admin' : '/my-jobs'}
                    className="text-sm" style={{ color: '#777b86' }}>Dashboard</Link>
                  <Link to="/profile" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: '#17191c' }}>
                      {user.full_name?.charAt(0)}
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-sm" style={{ color: '#777b86' }}>{t('nav.login')}</Link>
                  <Link to="/signup" className="btn-primary text-sm" style={{ height: '36px', lineHeight: '36px', padding: '0 20px', fontSize: '14px' }}>
                    {t('nav.signup')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO — Steep editorial: serif headline + floating artifacts ========== */}
      <section className="relative overflow-hidden" style={{ padding: '80px 0 100px' }}>
        {/* Subtle background texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(251,225,209,0.15) 0%, transparent 60%)' }} />
        
        <div className="max-w-page mx-auto px-6 relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Text Column */}
            <div className="flex-1 max-w-2xl text-center lg:text-left relative z-10">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5" style={{ backgroundColor: '#f2f2f3', borderRadius: '9999px' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#17191c' }}></span>
                <span className="text-sm" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>Ethiopia's #1 Freelance Marketplace</span>
              </div>

              {/* Headline — Playfair Display (Signifier stand-in), 400 weight, tight tracking */}
              <h1 className="font-signifier" style={{
                fontSize: 'clamp(44px, 7vw, 90px)',
                lineHeight: '1.15',
                fontWeight: 400,
                letterSpacing: '-2.25px',
                color: '#17191c',
                marginBottom: '24px',
              }}>
                Find Expert<br />
                <span style={{ fontStyle: 'italic' }}>Freelancers</span><br />
                in Ethiopia
              </h1>

              {/* Subhead */}
              <p className="max-w-lg mx-auto lg:mx-0 mb-8" style={{
                fontSize: '17px',
                lineHeight: '1.5',
                color: '#777b86',
                fontFamily: 'var(--font-sohne)',
                fontWeight: 400,
              }}>
                Connect with top Ethiopian talent for Translation, Design, Development, 
                and more. Secure payments with <strong style={{ color: '#17191c' }}>TeleBirr escrow</strong>.
              </p>

              {/* Search + Pill Button Pair */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto lg:mx-0 mb-10">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#a3a6af' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for any service..."
                    style={{
                      width: '100%',
                      padding: '8px 16px 8px 44px',
                      borderRadius: '9999px',
                      border: '1px solid #ececec',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#17191c',
                      fontFamily: 'var(--font-sohne)',
                      fontSize: '15px',
                      height: '48px',
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ height: '48px', lineHeight: '48px', padding: '0 28px', fontSize: '15px' }}>
                  {t('common.search')}
                </button>
              </form>

              {/* Stats */}
              <div className="flex gap-8 justify-center lg:justify-start">
                {[
                  { value: '500+', label: 'Freelancers', icon: <Users size={16} /> },
                  { value: '1,000+', label: 'Jobs Done', icon: <CheckCircle size={16} /> },
                  { value: 'ETB 2M+', label: 'Paid Out', icon: <TrendingIcon size={16} /> },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
                      <span style={{ color: '#777b86' }}>{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>{stat.value}</p>
                      <p className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Product Artifacts — the signature Steep hero composition */}
            <div className="hidden lg:block w-[420px] shrink-0 relative" style={{ minHeight: '520px' }}>
              {/* Top-left: Region Table Card */}
              <div className="card-white absolute" style={{ top: '0', left: '-20px', width: '200px' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>Top Regions</span>
                  <TrendingUp size={14} style={{ color: '#5d2a1a' }} />
                </div>
                <div className="space-y-2">
                  {[{ region: 'Addis Ababa', count: '245' }, { region: 'Bahir Dar', count: '89' }, { region: 'Adama', count: '76' }].map(r => (
                    <div key={r.region} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#17191c' }}>{r.region}</span>
                      <span className="text-xs font-medium" style={{ color: '#777b86' }}>{r.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f2f2f3' }}>
                  <span className="text-xs" style={{ color: '#979799' }}>+12% this month</span>
                </div>
              </div>

              {/* Top-right: Avatar Bubbles Card */}
              <div className="card-white absolute" style={{ top: '40px', right: '-10px', width: '180px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>Active now</span>
                </div>
                <div className="flex -space-x-2">
                  {['JB', 'AF', 'KM', 'TS'].map((initials, i) => (
                    <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: i === 0 ? '#5d2a1a' : i === 1 ? '#777b86' : i === 2 ? '#a3a6af' : '#979799', border: '2px solid white' }}>
                      {initials}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: '#f2f2f3', color: '#777b86', border: '2px solid white' }}>
                    +4
                  </div>
                </div>
              </div>

              {/* Center: Registration Stat Card */}
              <div className="card-white absolute" style={{ top: '180px', right: '30px', width: '160px' }}>
                <p className="text-xs mb-1" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>Registrations</p>
                <p className="text-2xl font-semibold" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>2.4k</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs" style={{ color: '#5d2a1a' }}>↑ 5.5x</span>
                  <span className="text-xs" style={{ color: '#979799' }}>vs last week</span>
                </div>
                {/* Minimal line chart bar */}
                <div className="flex items-end gap-1 mt-3" style={{ height: '24px' }}>
                  {[20, 35, 25, 45, 30, 55, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-full" style={{ height: `${h}%`, backgroundColor: '#5d2a1a', opacity: 0.6 }} />
                  ))}
                </div>
              </div>

              {/* Bottom: AI Composer Input Card */}
              <div className="card-white absolute" style={{ bottom: '0', left: '10px', width: '340px', padding: '16px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} style={{ color: '#5d2a1a' }} />
                  <span className="text-xs" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>AI Assistant</span>
                </div>
                <div className="flex items-center gap-2" style={{
                  border: '1px solid #ececec',
                  borderRadius: '9999px',
                  padding: '6px 6px 6px 16px',
                  backgroundColor: '#ffffff',
                }}>
                  <span className="text-xs" style={{ color: '#a3a6af', fontFamily: 'var(--font-sohne)' }}>Ask anything…</span>
                  <div className="ml-auto w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#17191c' }}>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Bottom-right: 3D Scene */}
              <div className="absolute" style={{ bottom: '80px', right: '-40px', width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden' }}>
                <ThreeScene className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== BUSINESS SOLUTIONS + LIVE ACTIVITY ========== */}
      <section className="max-w-page mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <div className="card" style={{ borderRadius: '24px', padding: '28px 32px', backgroundColor: '#f2f2f3' }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[16px] flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                    <Building2 size={24} style={{ color: '#17191c' }} />
                  </div>
                  <div>
                    <h3 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', color: '#17191c' }}>Business Solutions</h3>
                    <p className="text-sm" style={{ color: '#777b86' }}>Project Management & Expert Sourcing Services</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Link to="/post-job" className="btn-primary text-sm" style={{ height: '38px', lineHeight: '38px', padding: '0 20px', fontSize: '14px' }}>{t('job.create')}</Link>
                  <Link to="/marketplace" className="btn-secondary text-sm" style={{ height: '38px', lineHeight: '38px', padding: '0 20px', fontSize: '14px' }}>{t('nav.browse.gigs')}</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <LiveActivityFeed />
          </div>
        </div>
      </section>

      {/* ========== CATEGORIES — Neutral cards grid ========== */}
      <ScrollReveal variant="fadeUp">
      <section style={{ padding: '100px 0' }}>
        <div className="max-w-page mx-auto px-6">
          <ScrollReveal variant="fadeDown" delay={0.1}>
            <div className="text-center mb-16">
              <span className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>CATEGORIES</span>
              <h2 style={{
                fontSize: 'clamp(32px, 4vw, 64px)',
                fontFamily: 'var(--font-signifier)',
                fontWeight: 400,
                color: '#17191c',
                letterSpacing: '-0.96px',
                lineHeight: '1.2',
                marginTop: '12px',
                marginBottom: '12px',
              }}>Browse by <span style={{ fontStyle: 'italic' }}>Category</span></h2>
              <p className="text-lg mx-auto max-w-lg" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>Find the right talent for any project</p>
            </div>
          </ScrollReveal>

          <StaggerContainer stagger={0.04}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <StaggerItem key={cat.name} variant="scaleUp">
                  <Link to={`/marketplace?category=${encodeURIComponent(cat.name)}`}
                    className="block p-5 text-center group transition-all"
                    style={{
                      backgroundColor: '#f2f2f3',
                      borderRadius: '24px',
                    }}>
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: '#ffffff' }}>
                      <span style={{ color: '#777b86' }}>{cat.icon}</span>
                    </div>
                    <h3 className="text-sm mb-1" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{cat.name}</h3>
                    <p className="text-xs" style={{ color: '#979799' }}>{cat.count}</p>
                  </Link>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>
      </ScrollReveal>

      {/* ========== ACCENT PEACH CARD — Editorial highlight (use once per page) ========== */}
      <ScrollReveal variant="scaleIn">
      <section className="max-w-page mx-auto px-6" style={{ paddingBottom: '80px' }}>
        <div className="card-accent p-10 md:p-16 text-center" style={{ backgroundColor: '#fbe1d1', borderRadius: '24px' }}>
          <Sparkles size={32} style={{ color: '#5d2a1a', marginBottom: '20px' }} />
          <h3 style={{
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            fontFamily: 'var(--font-signifier)',
            fontWeight: 400,
            color: '#5d2a1a',
            lineHeight: '1.3',
            maxWidth: '600px',
            margin: '0 auto 16px',
          }}>Ethiopia's largest freelance network</h3>
          <p className="text-lg mb-8" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', opacity: 0.8, maxWidth: '500px', margin: '0 auto' }}>
            Join thousands of freelancers and businesses already connected on Erq.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/signup" className="btn-primary" style={{ backgroundColor: '#5d2a1a', borderColor: '#5d2a1a', color: '#fbe1d1', height: '44px', lineHeight: '44px' }}>
              Get Started
            </Link>
            <Link to="/marketplace" className="btn-secondary" style={{ borderColor: '#5d2a1a', color: '#5d2a1a', height: '44px', lineHeight: '44px' }}>
              Browse Gigs
            </Link>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ========== FEATURED GIGS ========== */}
      {featuredGigs.length > 0 && (
        <ScrollReveal variant="fadeUp">
        <section className="max-w-page mx-auto px-6" style={{ paddingBottom: '100px' }}>
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>LATEST</span>
              <h2 style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                fontFamily: 'var(--font-signifier)',
                fontWeight: 400,
                color: '#17191c',
                letterSpacing: '-0.66px',
                marginTop: '8px',
              }}>Featured <span style={{ fontStyle: 'italic' }}>Gigs</span></h2>
              <p className="mt-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>Fresh opportunities from top freelancers</p>
            </div>
            <Link to="/marketplace" className="text-link text-sm">
              View All <span className="arrow">→</span>
            </Link>
          </div>
          <StaggerContainer stagger={0.08}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredGigs.map(gig => (
                <StaggerItem key={gig.id} variant="bounceIn">
                  <Link to={`/gigs/${gig.id}`} className="card-white block overflow-hidden group">
                    <div style={{ padding: '20px' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden"
                          style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                          {gig.freelancer_picture ? (
                            <img src={gig.freelancer_picture} alt="" className="w-full h-full object-cover" />
                          ) : gig.freelancer_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{gig.freelancer_name}</p>
                          <div className="flex items-center gap-1">
                            <span style={{ color: '#5d2a1a', fontSize: '12px' }}>★</span>
                            <span className="text-xs" style={{ color: '#777b86' }}>{gig.freelancer_rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg mb-2 transition-colors group-hover:opacity-60" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c' }}>{gig.title}</h3>
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{gig.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="badge">{gig.category}</span>
                        <span className="font-medium" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>ETB {gig.price?.toLocaleString()}</span>
                      </div>
                      <div className="mt-3 pt-3 flex items-center gap-1 text-xs" style={{ borderTop: '1px solid #f2f2f3', color: '#979799' }}>
                        <Timer size={12} /> {gig.delivery_time} {t('marketplace.days')}
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </section>
        </ScrollReveal>
      )}

      {/* ========== TRENDING & POPULAR ========== */}
      {(trendingGigs.length > 0 || popularGigs.length > 0) && (
        <section style={{ paddingBottom: '100px' }}>
          <div className="max-w-page mx-auto px-6">
            {/* Trending Section */}
            {trendingGigs.length > 0 && (
              <>
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <span className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>
                      <Flame size={14} className="inline" style={{ color: '#5d2a1a' }} /> TRENDING
                    </span>
                    <h2 style={{
                      fontSize: 'clamp(24px, 3vw, 44px)',
                      fontFamily: 'var(--font-signifier)',
                      fontWeight: 400,
                      color: '#17191c',
                      letterSpacing: '-0.66px',
                      marginTop: '8px',
                    }}>Most Viewed <span style={{ fontStyle: 'italic' }}>This Week</span></h2>
                    <p className="mt-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>Hot services getting attention right now</p>
                  </div>
                  <Link to="/marketplace?sort=views" className="text-link text-sm">
                    View All <span className="arrow">→</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                  {trendingGigs.map((gig) => (
                    <Link key={gig.id} to={`/gigs/${gig.id}`}
                      className="block p-5 transition-all group relative overflow-hidden"
                      style={{ backgroundColor: '#f2f2f3', borderRadius: '24px' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden"
                          style={{ backgroundColor: '#ffffff', color: '#777b86' }}>
                          {gig.freelancer_picture ? <img src={gig.freelancer_picture} alt="" className="w-full h-full object-cover" /> : gig.freelancer_name?.charAt(0)}
                        </div>
                        <span className="text-xs" style={{ color: '#777b86' }}>{gig.freelancer_name}</span>
                      </div>
                      <h3 className="font-medium text-sm mb-2 line-clamp-1" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{gig.title}</h3>
                      <p className="text-xs mb-3" style={{ color: '#979799' }}>{gig.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>ETB {gig.price?.toLocaleString()}</span>
                        {gig.weekly_views > 0 && (
                          <span className="text-xs flex items-center gap-1" style={{ color: '#979799' }}>
                            <Eye size={12} /> {gig.weekly_views}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Popular Section */}
            {popularGigs.length > 0 && (
              <>
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <span className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>
                      <Trophy size={14} className="inline" style={{ color: '#5d2a1a' }} /> POPULAR
                    </span>
                    <h2 style={{
                      fontSize: 'clamp(24px, 3vw, 44px)',
                      fontFamily: 'var(--font-signifier)',
                      fontWeight: 400,
                      color: '#17191c',
                      letterSpacing: '-0.66px',
                      marginTop: '8px',
                    }}>All-Time <span style={{ fontStyle: 'italic' }}>Favorites</span></h2>
                    <p className="mt-2" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>The most viewed gigs on Erq</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {popularGigs.map((gig) => (
                    <Link key={gig.id} to={`/gigs/${gig.id}`}
                      className="block p-4 text-center transition-all group"
                      style={{ backgroundColor: '#f2f2f3', borderRadius: '24px' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-2 overflow-hidden"
                        style={{ backgroundColor: '#ffffff', color: '#777b86' }}>
                        {gig.freelancer_picture ? <img src={gig.freelancer_picture} alt="" className="w-full h-full object-cover" /> : gig.freelancer_name?.charAt(0)}
                      </div>
                      <h3 className="text-xs font-medium mb-1 line-clamp-1" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{gig.title}</h3>
                      <span className="text-xs" style={{ color: '#979799' }}>ETB {gig.price?.toLocaleString()}</span>
                      {gig.view_count > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#a3a6af' }}><Eye size={10} className="inline" /> {gig.view_count}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ========== FREELANCER LEADERBOARD + QUICK ACTIONS ========== */}
      <section className="max-w-page mx-auto px-6" style={{ paddingBottom: '100px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FreelancerLeaderboard />
          </div>
          <div className="lg:col-span-2">
            <div className="card" style={{ backgroundColor: '#f2f2f3', borderRadius: '24px', padding: '32px' }}>
              <h3 className="text-lg mb-6" style={{ fontFamily: 'var(--font-signifier)', color: '#17191c' }}>Quick Actions</h3>              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: <ClipboardList size={20} />, label: 'Post a Job', link: '/post-job' },
                    { icon: <Briefcase size={20} />, label: 'Create a Gig', link: '/create-gig' },
                    { icon: <Bot size={20} />, label: 'AI Store Builder', link: '/ai-store' },
                    { icon: <BarChart3 size={20} />, label: 'Analytics', link: '/analytics' },
                    { icon: <MessageCircle size={20} />, label: 'Messages', link: '/messages' },
                    { icon: <Store size={20} />, label: 'Marketplace', link: '/marketplace' },
                  ].map(action => (
                    <Link key={action.label} to={action.link}
                      className="flex items-center gap-4 p-4 transition-all group"
                      style={{ backgroundColor: '#ffffff', borderRadius: '16px' }}>
                      <span style={{ color: '#777b86' }}>{action.icon}</span>
                      <span className="text-sm font-medium" style={{ color: '#17191c' }}>{action.label}</span>
                    </Link>
                  ))}
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== APP SHOWCASE ========== */}
      <AppShowcase />

      {/* ========== HOW IT WORKS ========== */}
      <ScrollReveal variant="fadeUp">
      <section style={{ padding: '100px 0', backgroundColor: '#fafafb' }}>
        <div className="max-w-page mx-auto px-6">
          <ScrollReveal variant="fadeDown">
            <div className="text-center mb-16">
              <span className="text-sm" style={{ color: '#979799', fontFamily: 'var(--font-sohne)' }}>PROCESS</span>
              <h2 style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                fontFamily: 'var(--font-signifier)',
                fontWeight: 400,
                color: '#17191c',
                letterSpacing: '-0.66px',
                marginTop: '12px',
                marginBottom: '12px',
              }}>How It <span style={{ fontStyle: 'italic' }}>Works</span></h2>
              <p className="text-lg" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>Simple steps to get started on Erq</p>
            </div>
          </ScrollReveal>
          <StaggerContainer stagger={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Create Account', desc: 'Sign up as a Client or Freelancer in seconds', icon: <Pen size={24} /> },
                { step: '02', title: 'Post or Browse', desc: 'Post a job or browse gigs from talented freelancers', icon: <Search size={24} /> },
                { step: '03', title: 'Pay Securely', desc: 'Use TeleBirr escrow for safe, hassle-free payments', icon: <Lock size={24} /> },
              ].map((item) => (
                <StaggerItem key={item.step} variant="bounceIn">
                  <div className="card" style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px', textAlign: 'center', boxShadow: 'var(--shadow-subtle)' }}>
                    <div className="inline-flex items-center justify-center mb-2 px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#f2f2f3', color: '#979799' }}>
                      Step {item.step}
                    </div>
                    <div className="w-16 h-16 rounded-[16px] flex items-center justify-center mx-auto mb-5"
                      style={{ backgroundColor: '#f2f2f3' }}>
                      <span style={{ color: '#17191c' }}>{item.icon}</span>
                    </div>
                    <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c' }}>{item.title}</h3>
                    <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>{item.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>
      </ScrollReveal>

      {/* ========== CTA ========== */}
      {!user && (
        <ScrollReveal variant="scaleIn">
        <section style={{ padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(251,225,209,0.2) 0%, transparent 60%)' }} />
          <div className="max-w-page mx-auto px-6 text-center relative">
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              fontFamily: 'var(--font-signifier)',
              fontWeight: 400,
              color: '#17191c',
              letterSpacing: '-0.66px',
              marginBottom: '16px',
            }}>Ready to Get <span style={{ fontStyle: 'italic' }}>Started</span>?</h2>
            <p className="text-lg mb-10 max-w-md mx-auto" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
              Join Erq today and connect with Ethiopia's best talent.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/signup" className="btn-primary" style={{ height: '44px', lineHeight: '44px', padding: '0 28px' }}>
                Get Started
              </Link>
              <Link to="/marketplace" className="btn-secondary" style={{ height: '44px', lineHeight: '44px', padding: '0 28px' }}>
                Browse Gigs
              </Link>
            </div>
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ========== FOOTER — Steep minimal dark footer ========== */}
      <footer style={{ backgroundColor: '#17191c' }}>
        <div className="max-w-page mx-auto px-6" style={{ padding: '64px 24px 32px' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <img src="/high-resolution-color-logo.png" alt="Erq" className="h-8 w-auto no-grayscale" />
                </div>
                <span style={{ fontFamily: 'var(--font-signifier)', fontSize: '20px', color: '#ffffff', letterSpacing: '-0.5px' }}>Erq</span>
              </div>
              <p className="text-sm mb-4" style={{ color: '#777b86' }}>Ethiopia's premier freelance marketplace.</p>
              <div className="flex items-center gap-2">
                <Flag size={16} style={{ color: '#777b86' }} />
                <span className="text-sm" style={{ color: '#777b86' }}>Made in Ethiopia</span>
              </div>
            </div>

            {[
              {
                title: 'Categories',
                links: [
                  { label: 'Graphics & Design', path: '/marketplace?category=Graphics+%26+Design' },
                  { label: 'Digital Marketing', path: '/marketplace?category=Digital+Marketing' },
                  { label: 'Writing & Translation', path: '/marketplace?category=Writing+%26+Translation' },
                  { label: 'Video & Animation', path: '/marketplace?category=Video+%26+Animation' },
                  { label: 'Programming & Tech', path: '/marketplace?category=Programming+%26+Tech' },
                  { label: 'AI Services', path: '/marketplace?category=AI+Services' },
                ]
              },
              {
                title: 'For Clients',
                links: [
                  { label: 'How It Works', path: '/how-it-works' },
                  { label: 'Customer Success', path: '/community' },
                  { label: 'Quality Guide', path: '/quality-guide' },
                  { label: 'Marketplace', path: '/marketplace' },
                  { label: 'End-to-End Projects', path: '/enterprise' },
                ]
              },
              {
                title: 'For Freelancers',
                links: [
                  { label: 'Become a Freelancer', path: '/signup' },
                  { label: 'Erq Pro', path: '/pro' },
                  { label: 'Community Hub', path: '/community' },
                  { label: 'Browse by Skill', path: '/marketplace' },
                ]
              },
              {
                title: 'Company',
                links: [
                  { label: 'About Erq', path: '/about' },
                  { label: 'Help Center', path: '/help' },
                  { label: 'Trust & Safety', path: '/trust-safety' },
                  { label: 'Careers', path: '/careers' },
                  { label: 'Press & News', path: '/press' },
                ]
              },
              {
                title: 'Business',
                links: [
                  { label: 'Project Management', path: '/enterprise' },
                  { label: 'Expert Sourcing', path: '/enterprise' },
                  { label: 'Enterprise', path: '/enterprise' },
                  { label: 'AI Store Builder', path: '/marketplace?category=AI+Services' },
                ]
              },
            ].map(section => (
              <div key={section.title}>
                <h4 className="text-sm font-medium mb-4" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{section.title}</h4>
                <ul className="space-y-2.5">
                  {section.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.path} className="text-sm transition-colors" style={{ color: '#777b86' }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
            <div className="flex flex-col md:flex-row items-center justify-between text-sm gap-4">
              <p style={{ color: '#777b86' }}>© 2024 Erq Marketplace. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <Link to="/terms" className="text-sm" style={{ color: '#777b86' }}>Terms of Service</Link>
                <Link to="/privacy" className="text-sm" style={{ color: '#777b86' }}>Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Image Generator Modal */}
      <AIImageGenerator isOpen={showAIGenerator} onClose={() => setShowAIGenerator(false)} />
      
      {/* Floating Live Chat Widget */}
      <LiveChatWidget />
    </div>
    </PageTransition>
  );
}
