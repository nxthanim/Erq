import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Heart, Menu, Search, ShieldCheck, Sparkles, Star, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { gigsAPI } from '../utils/api';
import { formatETB } from '../utils/currency';

const categories = [
  { label: 'Graphics & Design', description: 'Logos, brand identity, illustrations', tone: 'sand' },
  { label: 'Programming & Tech', description: 'Websites, apps, automation', tone: 'mint' },
  { label: 'Digital Marketing', description: 'SEO, social media, campaigns', tone: 'lavender' },
  { label: 'Writing & Translation', description: 'Copy, content, localization', tone: 'sky' },
  { label: 'Video & Animation', description: 'Editing, motion, explainers', tone: 'peach' },
  { label: 'Business', description: 'Research, consulting, operations', tone: 'rose' },
];

const popularSearches = ['website design', 'logo design', 'social media', 'video editing'];
const trustedTeams = [
  { name: 'Chapa', mark: 'C', kind: 'chapa' },
  { name: 'Awash Bank', mark: 'A', kind: 'awash' },
  { name: 'Ethiopian Airlines', mark: '✦', kind: 'airlines' },
  { name: 'Safaricom', mark: 'S', kind: 'safaricom' },
  { name: 'Dashen Bank', mark: 'D', kind: 'dashen' },
  { name: 'Impact Hub', mark: 'I', kind: 'impact' },
];

function initials(name = 'Seller') {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function TrustLogo({ team }) {
  return <span className={`trust-logo trust-logo-${team.kind}`}><b>{team.mark}</b><span>{team.name}</span></span>;
}

function GigCard({ gig }) {
  return (
    <Link to={`/gigs/${gig.id}`} className="market-gig-card group">
      <div className="market-gig-art" aria-hidden="true"><Sparkles size={28} /></div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {gig.profile_picture ? <img src={gig.profile_picture} alt="" className="market-avatar" /> : <span className="market-avatar market-avatar-fallback">{initials(gig.seller_name || gig.full_name)}</span>}
          <div className="min-w-0"><p className="text-sm font-semibold truncate text-[#1f2933]">{gig.seller_name || gig.full_name || 'Verified seller'}</p><p className="text-xs text-[#6b7280]">Top seller</p></div>
        </div>
        <h3 className="market-gig-title">{gig.title}</h3>
        <div className="flex items-center gap-1 mt-3 text-sm"><Star size={14} fill="#f59e0b" color="#f59e0b" /><strong>{Number(gig.rating || 5).toFixed(1)}</strong><span className="text-[#6b7280]">({gig.review_count || 0})</span></div>
        <div className="flex items-end justify-between mt-4"><span className="text-xs uppercase tracking-wide text-[#6b7280]">Starting at</span><strong className="text-lg text-[#1f2933]">{formatETB(gig.price || gig.basic_price)}</strong></div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [gigs, setGigs] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    gigsAPI.list({ sort: 'newest', limit: 8 }).then(res => {
      setGigs(res.data?.gigs?.slice(0, 8) || []);
    }).catch(() => {});
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/marketplace${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
  };

  const realGigs = gigs.filter(gig => gig?.id && !String(gig.id).startsWith('sample'));

  return (
    <div className="market-home">
      <div className="market-topline">New on Erq: discover trusted Ethiopian talent for your next project <Link to="/marketplace">Explore services <ArrowRight size={14} /></Link></div>
      <header className="market-header">
        <Link to="/" className="market-brand"><img src="/high-resolution-color-logo.png" alt="Erq" /><span>Erq</span></Link>
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#374151]"><Link to="/marketplace">Find talent</Link><Link to="/marketplace">Find work</Link><Link to="/business">Business</Link><Link to="/how-it-works">How it works</Link></nav>
        <div className="flex items-center gap-3"><button onClick={toggleLanguage} className="hidden sm:block market-quiet-button">{language === 'en' ? 'English' : 'አማርኛ'}</button>{user ? <Link to="/dashboard" className="market-outline-button">Dashboard</Link> : <><Link to="/login" className="market-quiet-button hidden sm:block">Sign in</Link><Link to="/signup" className="market-primary-button">Join Erq</Link></>}<button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </header>
      {mobileOpen && <div className="market-mobile-nav"><Link to="/marketplace">Find talent</Link><Link to="/marketplace">Find work</Link><Link to="/business">Business</Link>{!user && <Link to="/login">Sign in</Link>}</div>}

      <main>
        <section className="market-hero"><div className="market-hero-copy"><span className="market-eyebrow"><Sparkles size={15} /> The marketplace for ambitious work</span><h1>Build your next big idea with <em>exceptional talent.</em></h1><p>Hire skilled freelancers for design, technology, marketing, and more—or turn your expertise into a career on your terms.</p><form className="market-search" onSubmit={submitSearch}><Search size={21} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="What service are you looking for?" aria-label="Search services" /><button type="submit">Search</button></form><div className="market-popular"><span>Popular:</span>{popularSearches.map(item => <button key={item} onClick={() => { setSearch(item); navigate(`/marketplace?search=${encodeURIComponent(item)}`); }}>{item}</button>)}</div></div><div className="market-hero-art"><div className="hero-art-card hero-art-card-main"><div className="hero-art-top"><span className="hero-art-dot" /><span className="hero-art-dot" /><span className="hero-art-dot" /></div><div className="hero-art-photo">GE</div><div className="hero-art-lines"><span /><span /><span /></div><div className="hero-art-pill"><Check size={14} /> Project delivered</div></div><div className="hero-floating hero-floating-rating"><Star size={16} fill="#f59e0b" color="#f59e0b" /><strong>4.9/5</strong><span>average rating</span></div><div className="hero-floating hero-floating-users"><Users size={16} /><strong>12k+</strong><span>local creatives</span></div></div></section>
        <section className="market-trust" aria-label="Trusted by teams"><div className="market-trust-label">Trusted by teams building the future</div><div className="trust-marquee"><div className="trust-marquee-track">{[...trustedTeams, ...trustedTeams].map((team, index) => <TrustLogo key={`${team.name}-${index}`} team={team} />)}</div></div></section>

        <section className="market-section"><div className="market-section-heading"><div><p className="market-kicker">Explore the marketplace</p><h2>Find the right talent for every task</h2></div><Link to="/marketplace" className="market-text-link">Browse all categories <ChevronRight size={17} /></Link></div><div className="market-category-grid">{categories.map(category => <Link key={category.label} to={`/marketplace?category=${encodeURIComponent(category.label)}`} className={`market-category-card ${category.tone}`}><div className="market-category-icon"><BriefcaseBusiness size={22} /></div><div><h3>{category.label}</h3><p>{category.description}</p></div><ArrowRight className="market-category-arrow" size={18} /></Link>)}</div></section>

        <section className="market-section market-section-muted"><div className="market-section-heading"><div><p className="market-kicker">Made for momentum</p><h2>Services that move your work forward</h2></div><Link to="/marketplace" className="market-text-link">See all services <ChevronRight size={17} /></Link></div>{realGigs.length > 0 ? <div className="market-gig-grid">{realGigs.slice(0, 4).map(gig => <GigCard key={gig.id} gig={gig} />)}</div> : <div className="market-empty-state"><Search size={22} /><span>New services are being added. Browse the marketplace to discover live listings.</span><Link to="/marketplace">Browse live services <ArrowRight size={16} /></Link></div>}</section>

        <section className="market-section market-split"><div><p className="market-kicker">For freelancers</p><h2>Turn your talent into opportunity.</h2><p className="market-large-copy">Create a profile, showcase your best work, and connect with clients who value what you do. Erq gives you the tools to work independently and grow sustainably.</p><Link to={user ? '/create-gig' : '/signup'} className="market-primary-button">Start selling <ArrowRight size={17} /></Link></div><div className="market-check-list"><div><Check size={18} /><span>Reach clients across Ethiopia and beyond</span></div><div><Check size={18} /><span>Set your own prices, schedule, and scope</span></div><div><Check size={18} /><span>Get paid securely with protected payments</span></div><div><Check size={18} /><span>Build credibility through verified reviews</span></div></div></section>

        <section className="market-cta"><div><p className="market-kicker">Ready when you are</p><h2>Great work starts with a conversation.</h2><p>Join a marketplace built around trust, clarity, and the ambition to do better work.</p></div><div className="flex gap-3 flex-wrap"><Link to="/marketplace" className="market-light-button">Explore talent</Link><Link to={user ? '/post-job' : '/signup'} className="market-outline-light-button">Post a project</Link></div></section>
      </main>
      <footer className="market-footer"><div className="market-brand"><img src="/high-resolution-color-logo.png" alt="" /><span>Erq</span></div><span>© 2026 Erq. Work made possible.</span><div className="flex gap-5"><Link to="/about">About</Link><Link to="/help">Help</Link><Link to="/privacy">Privacy</Link></div></footer>
    </div>
  );
}
