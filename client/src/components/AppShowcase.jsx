import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { StaggerContainer, StaggerItem } from './ScrollReveal';
import { AnimeReveal, AnimeCounter } from './AnimeAnimations';
import { Home, Store, MessageCircle, Briefcase, BarChart3, Target, Lock, Globe, CreditCard, Bot, Zap, Star, Search, Palette, TrendingUp, Edit, Smartphone, Palette as PaletteIcon, User, Film, Laptop } from 'lucide-react';

// ====== LAPTOP MOCKUP ======
function LaptopMockup({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Screen */}
      <div className="relative rounded-t-2xl border-4 border-[#433930] rounded-b-lg overflow-hidden"
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.1)',
          background: '#faf7f2',
        }}>
        {/* Webcam notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#433930] z-20" />
        <div className="w-full aspect-[16/10] overflow-hidden relative">
          {children}
        </div>
      </div>
      {/* Base */}
      <div className="mx-auto w-[102%] -ml-[1%] h-3 rounded-b-xl bg-gradient-to-b from-[#433930] to-[#2d281f]"
        style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }} />
    </div>
  );
}

// ====== PHONE MOCKUP ======
function PhoneMockup({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Phone body */}
      <div className="relative rounded-[2rem] border-[3px] border-[#433930] overflow-hidden"
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.1)',
          background: '#faf7f2',
          maxWidth: 260,
        }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#433930] rounded-b-xl z-20 flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
          <div className="w-6 h-1.5 rounded-full bg-[#1a1a1a]" />
        </div>
        <div className="w-full aspect-[9/19] overflow-hidden relative pt-5">
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full bg-[#433930]/30" />
      </div>
    </div>
  );
}

// ====== SCREENSHOT CONTENT: MARKETPLACE GRID ======
function MarketplaceScreen() {
  const items = [
    { icon: <Palette size={10} />, name: 'Branding Pro', price: 'ETB 2,500', color: '#818cf8' },
    { icon: <Laptop size={10} />, name: 'Web Developer', price: 'ETB 5,000', color: '#34d399' },
    { icon: <Smartphone size={10} />, name: 'App Design', price: 'ETB 3,200', color: '#f472b6' },
    { icon: <Edit size={10} />, name: 'Content Writer', price: 'ETB 1,800', color: '#fbbf24' },
    { icon: <Film size={10} />, name: 'Video Editor', price: 'ETB 4,000', color: '#a78bfa' },
    { icon: <BarChart3 size={10} />, name: 'Data Analyst', price: 'ETB 6,000', color: '#60a5fa' },
  ];
  return (
    <div className="p-3 h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #f5efe6 0%, #faf7f2 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 bg-white/80 rounded-xl px-3 py-2" style={{ boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-[8px] font-bold">E</div>
          <span className="text-[9px] font-bold text-[#433930]">Erq</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] text-[#1a1a1a] bg-green-50 px-1.5 py-0.5 rounded-full font-semibold">• Live</span>
          <Search size={8} className="text-[#a6967e]" />
        </div>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {items.slice(0, 4).map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="rounded-xl p-2.5 bg-white flex flex-col"
            style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.04), inset -2px -2px 6px rgba(0,0,0,0.02), inset 2px 2px 6px rgba(255,255,255,0.6)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>{item.icon}</div>
              <span className="text-[7px] font-semibold text-[#433930] truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Star size={6} className="text-yellow-500 fill-yellow-500" />
              <span className="text-[6px] text-[#a6967e]">4.9</span>
            </div>
            <div className="mt-auto pt-1">
              <span className="text-[9px] font-bold text-[#1a1a1a]">{item.price}</span>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Bottom bar */}
      <div className="flex items-center gap-3 mt-2 bg-white/80 rounded-xl px-3 py-1.5" style={{ boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.03)' }}>
        {[<Home key="h" size={10} />, <Search key="s" size={10} />, <MessageCircle key="m" size={10} />, <User key="u" size={10} />].map((icon, i) => (
          <span key={i} className={`${i === 0 ? 'text-[#1a1a1a]' : 'text-[#a6967e]'}`}>{icon}</span>
        ))}
      </div>
    </div>
  );
}

// ====== SCREENSHOT CONTENT: ANALYTICS DASHBOARD ======
function AnalyticsScreen() {
  const bars = [45, 62, 58, 71, 83, 44, 32];
  const maxBar = Math.max(...bars);
  return (
    <div className="p-3 h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #e8e8e8 0%, #faf7f2 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[8px] font-bold text-[#433930] flex items-center gap-1">
            <BarChart3 size={8} /> Analytics
          </p>
          <p className="text-[6px] text-[#a6967e]">Last 7 days</p>
        </div>
        <div className="flex gap-1">
          {['7D', '30D'].map(l => (
            <span key={l} className={`text-[6px] px-1.5 py-0.5 rounded ${l === '7D' ? 'bg-white text-[#1a1a1a] font-bold' : 'text-[#a6967e]'}`}
              style={l === '7D' ? { boxShadow: '2px 2px 5px rgba(0,0,0,0.04)' } : {}}>{l}</span>
          ))}
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {[
          { label: 'MRR', value: 'ETB 48K', color: '#1a1a1a' },
          { label: 'Users', value: '1,245', color: '#3b82f6' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg p-2" style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.03)' }}>
            <p className="text-[6px] text-[#a6967e]">{k.label}</p>
            <p className="text-[10px] font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>
      {/* Mini Bar Chart */}
      <div className="bg-white rounded-lg p-2 flex-1 flex flex-col" style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.03)' }}>
        <p className="text-[6px] text-[#a6967e] mb-1">Revenue</p>
        <div className="flex items-end gap-1 flex-1">
          {bars.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(v / maxBar) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                className="w-full rounded-t"
                style={{ background: 'linear-gradient(180deg, #1a1a1a, #555555)', minHeight: 4 }}
              />
              <span className="text-[5px] text-[#a6967e]">{['M','T','W','T','F','S','S'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ====== SCREENSHOT CONTENT: GIG DETAIL ======
function GigDetailScreen() {
  return (
    <div className="p-3 h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #faf7f2 100%)' }}>
      {/* Back + Title */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px]">←</span>
        <span className="text-[8px] font-bold text-[#433930]">Logo Design Pro</span>
      </div>
      {/* Gig Image placeholder */}
      <div className="rounded-xl mb-2 aspect-[2/1] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}>
        <Palette size={24} className="text-white/60" />
      </div>
      {/* Seller info */}
      <div className="flex items-center gap-2 mb-2 bg-white rounded-xl p-2" style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.03)' }}>
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-[8px] font-bold">H</div>
        <div>
          <p className="text-[7px] font-semibold text-[#433930]">Hiwot A.</p>
          <div className="flex items-center gap-1">
            <span className="text-[6px] text-yellow-500">★★★★★</span>
            <span className="text-[5px] text-[#a6967e]">(89)</span>
          </div>
        </div>
        <span className="ml-auto bg-green-50 text-[#1a1a1a] text-[6px] px-1.5 py-0.5 rounded-full font-semibold">Verfied</span>
      </div>
      {/* Price + CTA */}
      <div className="flex items-center justify-between bg-white rounded-xl p-2 mt-auto" style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <p className="text-[6px] text-[#a6967e]">Starting at</p>
          <p className="text-[11px] font-bold text-[#1a1a1a]">ETB 2,500</p>
        </div>
        <div className="bg-[#1a1a1a] text-white text-[7px] font-bold px-3 py-1.5 rounded-full">Order Now</div>
      </div>
    </div>
  );
}

// ====== SCREENSHOT CONTENT: MOBILE MESSAGES ======
function MessagesScreen() {
  const chats = [
    { name: 'Abebe K.', msg: 'Hey, can you start next week?', time: '2m', online: true },
    { name: 'Selam M.', msg: 'Uploaded the files you requested', time: '15m', online: false },
    { name: 'Yonas D.', msg: 'Thanks for the quick delivery!', time: '1h', online: true },
    { name: 'Meron T.', msg: 'When is the deadline?', time: '3h', online: false },
    { name: 'Biruk A.', msg: 'Please review the contract', time: '5h', online: false },
  ];
  return (
    <div className="p-2 h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #faf7f2 100%)' }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[9px] font-bold text-[#433930] flex items-center gap-1">
          <MessageCircle size={9} /> Messages
        </span>
        <span className="relative">
          <Edit size={9} className="text-[#a6967e]" />
          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full text-white text-[5px] flex items-center justify-center font-bold">3</span>
        </span>
      </div>
      <div className="flex-1 space-y-1">
        {chats.map((chat, i) => (
          <motion.div
            key={chat.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center gap-2 bg-white rounded-xl p-2"
            style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.03)' }}
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[8px] font-bold"
                style={{ background: `linear-gradient(135deg, ${['#818cf8','#34d399','#f472b6','#fbbf24','#a78bfa'][i]}, ${['#6366f1','#666666','#ec4899','#f59e0b','#8b5cf6'][i]})` }}>
                {chat.name[0]}
              </div>
              {chat.online && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[7px] font-semibold text-[#433930]">{chat.name}</p>
                <span className="text-[5px] text-[#a6967e]">{chat.time}</span>
              </div>
              <p className="text-[6px] text-[#75644f] truncate">{chat.msg}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ====== SCREENSHOT CONTENT: HOME HERO ======
function HeroScreen() {
  return (
    <div className="p-3 h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #f5efe6 0%, #faf7f2 100%)' }}>
      {/* Search */}
      <div className="flex items-center gap-1.5 mb-2 bg-white rounded-full px-3 py-1.5 shadow-sm">
        <Search size={8} className="text-[#a6967e]" />
        <span className="text-[6px] text-[#a6967e] flex-1">Search freelancers...</span>
        <span className="bg-[#1a1a1a] text-white text-[5px] px-1.5 py-0.5 rounded-full font-bold">Go</span>
      </div>
      {/* Categories row */}
      <div className="flex gap-1.5 mb-2 overflow-hidden">
        {[
          <><Palette size={5} /> Design</>,
          <><Laptop size={5} /> Dev</>,
          <><TrendingUp size={5} /> Marketing</>,
          <><Edit size={5} /> Writing</>
        ].map((cat, i) => (
          <span key={i} className="text-[5px] bg-white px-2 py-1 rounded-full text-[#75644f] whitespace-nowrap shadow-sm inline-flex items-center gap-1">{cat}</span>
        ))}
      </div>
      {/* Featured card */}
      <div className="bg-white rounded-xl p-2.5 flex-1 flex flex-col shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-[7px]">T</div>
          <div>
            <p className="text-[6px] font-bold text-[#433930]">Top Freelancer</p>
            <p className="text-[5px] text-[#a6967e]">Web Development</p>
          </div>
        </div>
        <div className="flex-1 rounded-lg mb-1.5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #e8e8e8, #cccccc)' }}>
          <Globe size={20} className="text-[#1a1a1a]/40" />
        </div>
        <div className="text-[6px] text-[#75644f]">
          <p className="font-semibold text-[#433930] text-[7px]">Full Stack Development</p>
          <p>Starting at <strong className="text-[#1a1a1a]">ETB 5,000</strong></p>
        </div>
      </div>
    </div>
  );
}
// ====== STATS BAR: FAKE NUMBERS (powered by animejs) ======
function StatsBar() {
  return (
    <AnimeReveal animation="fadeUp" duration={500}>
      <div className="flex items-center justify-center gap-10 py-4 px-6 rounded-2xl bg-white/80 backdrop-blur-sm"
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
        {[
          { value: '2,500+', label: 'Freelancers', num: 2500, suffix: '+' },
          { value: '15,000+', label: 'Jobs Completed', num: 15000, suffix: '+' },
          { value: 'ETB 5M+', label: 'Paid Out', display: '5M+' },
          { value: '4.9★', label: 'Avg Rating', num: 49, suffix: '★', decimals: 1 },
        ].map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="text-center">
            <p className="text-lg font-bold text-[#1a1a1a]">
              {stat.display ? (
                <><AnimeCounter value={5} duration={2500} decimals={0} suffix="M+" prefix="ETB " /></>
              ) : stat.decimals ? (
                <><AnimeCounter value={stat.num / 10} duration={2500} decimals={1} />{stat.suffix}</>
              ) : (
                <><AnimeCounter value={stat.num} duration={2500} decimals={0} />{stat.suffix}</>
              )}
            </p>
            <p className="text-[10px] text-[#75644f]">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </AnimeReveal>
  );
}

// ====== LIGHTBOX MODAL ======
function LightboxModal({ slides, currentIndex, onClose, onPrev, onNext }) {
  const cbRef = useRef({ onClose, onPrev, onNext });
  cbRef.current = { onClose, onPrev, onNext };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') cbRef.current.onClose();
      if (e.key === 'ArrowLeft') cbRef.current.onPrev();
      if (e.key === 'ArrowRight') cbRef.current.onNext();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, []);

  const slide = slides[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-8"
      style={{ backgroundColor: 'rgba(67, 57, 48, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <button onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/10 transition-all z-10"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
        ✕
      </button>

      {slides.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-2xl hover:bg-white/20 transition-all z-10 border border-white/10"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          ←
        </button>
      )}

      {slides.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-2xl hover:bg-white/20 transition-all z-10 border border-white/10"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          →
        </button>
      )}

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold border border-white/10">
            <span className="text-white/80">{slide.icon}</span>
            {slide.label}
            <span className="text-white/50 text-xs">{currentIndex + 1} / {slides.length}</span>
          </span>
        </div>

        <div className="flex justify-center max-h-[70vh] overflow-hidden">
          {slide.type === 'laptop' ? (
            <div className="w-full max-w-4xl">
              <LaptopMockup>
                <slide.component />
              </LaptopMockup>
            </div>
          ) : slide.type === 'phone' ? (
            <div className="scale-[1.8] origin-top">
              <PhoneMockup>
                <slide.component />
              </PhoneMockup>
            </div>
          ) : (
            <div className="scale-[1.6] origin-top">
              {slide.custom || null}
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-white/60 text-sm max-w-lg mx-auto">
          {slide.desc}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ====== MAIN EXPORT ======
export default function AppShowcase() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const slides = [
    { icon: <Home size={18} />, label: 'Homepage', type: 'phone', component: HeroScreen, desc: 'The Erq homepage features a clean search bar, category filters, and top freelancer cards — all wrapped in warm claymorphism design.' },
    { icon: <Store size={18} />, label: 'Marketplace Browsing', type: 'laptop', component: MarketplaceScreen, desc: 'Browse thousands of gigs with our beautiful grid layout. Filter by category, price, and rating. Each card shows the freelancer, price, and reviews.' },
    { icon: <MessageCircle size={18} />, label: 'Messaging', type: 'phone', component: MessagesScreen, desc: 'Real-time messaging with online indicators, read receipts, and push notifications. Stay connected with your clients and freelancers.' },
    { icon: <Briefcase size={18} />, label: 'Gig Detail', type: 'phone', component: GigDetailScreen, desc: 'Detailed gig view with portfolio images, seller information, ratings, and a one-click order button. Secure escrow payment included.' },
    { icon: <BarChart3 size={18} />, label: 'Analytics Dashboard', type: 'laptop', component: AnalyticsScreen, desc: 'Real-time analytics dashboard with MRR tracking, user growth charts, and revenue insights. Available for all users with role-specific views.' },
    { icon: <Target size={18} />, label: 'Why Erq?', type: 'custom', custom: (
      <div className="rounded-[2rem] border-[3px] border-[#433930] p-5" style={{
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        background: 'linear-gradient(180deg, #e8e8e8 0%, #faf7f2 100%)',
        maxWidth: 300,
      }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-green-600 flex items-center justify-center text-white text-sm font-bold">E</div>
          <span className="text-sm font-bold text-[#433930]">Why Erq?</span>
        </div>
        <div className="space-y-2.5">
          {[
            { icon: <Lock size={14} />, title: 'Secure Escrow', desc: 'Payments held safely until work is approved' },
            { icon: <Globe size={14} />, title: 'Local Talent', desc: 'Connect with the best Ethiopian freelancers' },
            { icon: <CreditCard size={14} />, title: 'TeleBirr', desc: 'Pay and get paid with TeleBirr integration' },
            { icon: <Bot size={14} />, title: 'AI Powered', desc: 'Smart matching & AI store builder' },
            { icon: <Zap size={14} />, title: 'Fast Delivery', desc: 'Average 3-day delivery on most gigs' },
            { icon: <Star size={14} />, title: 'Top Rated', desc: '4.9★ average rating across all services' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-2 bg-white rounded-xl p-2.5"
              style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.03)' }}
            >
              <span className="text-[#433930]">{item.icon}</span>
              <div>
                <p className="text-[8px] font-semibold text-[#433930]">{item.title}</p>
                <p className="text-[7px] text-[#75644f]">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    ), desc: 'Erq combines secure escrow payments, local Ethiopian talent, TeleBirr integration, and AI-powered tools — all in one beautiful platform.' },
  ];

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const prevSlide = () => setLightboxIndex(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  const nextSlide = () => setLightboxIndex(prev => (prev === slides.length - 1 ? 0 : prev + 1));

  return (
    <>
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf7f2] via-white to-[#faf7f2] opacity-50" />
        <div className="absolute top-40 left-20 w-72 h-72 rounded-full bg-green-100/30 blur-3xl" />
        <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-purple-100/20 blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <span className="text-[#1a1a1a] font-semibold text-sm uppercase tracking-widest bg-green-50 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full animate-pulse" />
              Built with Pika AI
            </span>
            <AnimeReveal animation="spring" duration={600}>
              <h2 className="text-4xl font-bold text-[#433930] mt-5 mb-3">See Erq in Action</h2>
            </AnimeReveal>
            <AnimeReveal animation="fadeUp" delay={200} duration={600}>
              <p className="text-[#75644f] text-lg max-w-xl mx-auto">
                Click any screenshot to explore the full interface.
                Beautifully crafted for freelancers and clients.
              </p>
            </AnimeReveal>
          </div>

          <div className="mb-16">
            <StatsBar />
          </div>

          <StaggerContainer stagger={0.1}>
            <div className="grid grid-cols-12 gap-6">
              <StaggerItem variant="bounceIn" className="col-span-4">
                <button onClick={() => openLightbox(0)} className="w-full text-left group">
                  <div className="text-center mb-2">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <Home size={10} /> Homepage
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-[2rem]">
                    <PhoneMockup>
                      <HeroScreen />
                    </PhoneMockup>
                  </div>
                </button>
              </StaggerItem>

              <StaggerItem variant="bounceIn" className="col-span-5">
                <button onClick={() => openLightbox(1)} className="w-full text-left group">
                  <div className="text-center mb-2">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <Store size={10} /> Marketplace
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-t-2xl">
                    <LaptopMockup>
                      <MarketplaceScreen />
                    </LaptopMockup>
                  </div>
                </button>
              </StaggerItem>

              <StaggerItem variant="bounceIn" className="col-span-3">
                <button onClick={() => openLightbox(2)} className="w-full text-left group">
                  <div className="text-center mb-2">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <MessageCircle size={10} /> Messaging
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-[2rem]">
                    <PhoneMockup>
                      <MessagesScreen />
                    </PhoneMockup>
                  </div>
                </button>
              </StaggerItem>

              <StaggerItem variant="bounceIn" className="col-span-4">
                <button onClick={() => openLightbox(3)} className="w-full text-left group">
                  <div className="text-center mb-2 mt-6">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <Briefcase size={10} /> Gig Detail
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-[2rem]">
                    <PhoneMockup>
                      <GigDetailScreen />
                    </PhoneMockup>
                  </div>
                </button>
              </StaggerItem>

              <StaggerItem variant="bounceIn" className="col-span-5">
                <button onClick={() => openLightbox(4)} className="w-full text-left group">
                  <div className="text-center mb-2 mt-6">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <BarChart3 size={10} /> Analytics
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-t-2xl">
                    <LaptopMockup>
                      <AnalyticsScreen />
                    </LaptopMockup>
                  </div>
                </button>
              </StaggerItem>

              <StaggerItem variant="bounceIn" className="col-span-3">
                <button onClick={() => openLightbox(5)} className="w-full text-left group">
                  <div className="text-center mb-2 mt-6">
                    <span className="text-[10px] font-semibold text-[#433930] bg-white px-3 py-1 rounded-full shadow-sm group-hover:bg-[#1a1a1a] group-hover:text-white transition-all inline-flex items-center gap-1">
                      <Target size={10} /> Why Erq?
                    </span>
                  </div>
                  <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl rounded-[2rem]">
                    <div className="rounded-[2rem] border-[3px] border-[#433930] p-4" style={{
                      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                      background: 'linear-gradient(180deg, #e8e8e8 0%, #faf7f2 100%)',
                      maxWidth: 260,
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-green-600 flex items-center justify-center text-white text-[10px] font-bold">E</div>
                        <span className="text-[10px] font-bold text-[#433930]">Why Erq?</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { icon: <Lock size={12} />, title: 'Secure Escrow', desc: 'Payments held safely' },
                          { icon: <Globe size={12} />, title: 'Local Talent', desc: 'Best Ethiopian freelancers' },
                          { icon: <CreditCard size={12} />, title: 'TeleBirr', desc: 'Pay with TeleBirr' },
                          { icon: <Bot size={12} />, title: 'AI Powered', desc: 'Smart matching' },
                        ].map((item, i) => (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="flex items-center gap-2 bg-white rounded-xl p-2"
                            style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.03)' }}
                          >
                            <span className="text-[#433930]">{item.icon}</span>
                            <div>
                              <p className="text-[7px] font-semibold text-[#433930]">{item.title}</p>
                              <p className="text-[6px] text-[#75644f]">{item.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              </StaggerItem>
            </div>
          </StaggerContainer>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-sm text-[#a6967e] mb-4">
              Click any screenshot to explore — all interfaces powered by <strong className="text-[#433930]">Pika AI</strong>
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/marketplace" className="bg-[#1a1a1a] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#333333] transition-all shadow-md inline-flex items-center gap-2">
                Explore Marketplace
                <span>→</span>
              </Link>
              <Link to={typeof window !== 'undefined' && localStorage.getItem('erq_token') ? '/analytics' : '/signup'} className="bg-white text-[#433930] text-sm font-medium px-6 py-3 rounded-full border border-[#ebe0d0] hover:border-[#dcc8ae] transition-all shadow-sm inline-flex items-center gap-2">
                View Analytics
                <BarChart3 size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxOpen && (
          <LightboxModal
            slides={slides}
            currentIndex={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prevSlide}
            onNext={nextSlide}
          />
        )}
      </AnimatePresence>
    </>
  );
}
