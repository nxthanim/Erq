import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from "motion/react";
import EmailVerification from '../components/EmailVerification';
import { BadgeCheck, Shield, Mail, Globe, Briefcase, Handshake, Users, Zap } from 'lucide-react';

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function Signup() {
  const { signup } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', city: '', password: '', role: 'freelancer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const cities = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Bahir Dar', 'Gondar', 'Hawassa', 'Adama', 'Jimma'];

  // Post-login navigation is owned by the AuthContext bridge (ClerkAuthBridge),
  // which uses useNavigate so it never fights React Router.

  if (CLERK_ENABLED) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="min-h-screen flex" style={{ backgroundColor: '#ffffff' }}>
        {/* Left — Brand Panel */}
        <div className="hidden md:flex w-1/2 relative overflow-hidden items-center justify-center p-16" style={{ backgroundColor: '#173a32' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 15%, rgba(251,225,209,0.14) 0%, transparent 55%)' }} />
          <div className="relative text-center max-w-sm">
            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-8 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
              <img src="/high-resolution-color-logo.png" alt="Erq" className="h-9 w-auto no-grayscale" />
            </div>
            <h2 className="text-balance" style={{ fontFamily: 'var(--font-sohne)', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 42px)', color: '#ffffff', letterSpacing: '-1px', lineHeight: '1.15', marginBottom: '16px' }}>
              Join <span className="accent-word" style={{ color: '#e7f5ef' }}>Erq</span> Today
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sohne)' }}>
              Start your journey — whether you're looking for talent or offering your skills.
            </p>
          </div>
        </div>
        {/* Right — Clerk SignUp */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-16">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="text-balance" style={{ fontFamily: 'var(--font-sohne)', fontWeight: 600, fontSize: 'clamp(28px, 3vw, 36px)', color: '#173a32', letterSpacing: '-0.8px', marginBottom: '8px' }}>{t('auth.signup')}</h1>
              <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
                {t('auth.have.account')}{' '}
                <Link to="/login" style={{ color: '#1f6f5c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.login.btn')}</Link>
              </p>
            </div>
            <SignUp
              signInUrl="/login"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen flex" style={{ backgroundColor: '#ffffff' }}>
      
      {/* Left — Brand Panel (Fiverr-style dark ink) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden md:flex w-1/2 relative overflow-hidden flex-col items-center justify-center p-16"
        style={{ backgroundColor: '#173a32' }}
      >
        {/* Warm glow + subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 15%, rgba(251,225,209,0.14) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative text-center max-w-sm">
          {/* Logo */}
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-8 overflow-hidden" style={{ backgroundColor: '#ffffff', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
            <img src="/high-resolution-color-logo.png" alt="Erq" className="h-9 w-auto no-grayscale" />
          </div>

          <h2 className="text-balance" style={{
            fontFamily: 'var(--font-sohne)',
            fontWeight: 600,
            fontSize: 'clamp(30px, 3.6vw, 42px)',
            color: '#ffffff',
            letterSpacing: '-1px',
            lineHeight: '1.15',
            marginBottom: '16px',
          }}>
            Join <span className="accent-word" style={{ color: '#e7f5ef' }}>Erq</span> Today
          </h2>
          
          <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sohne)' }}>
            Start your journey — whether you're looking for talent or offering your skills.
          </p>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              { 
                title: 'For Freelancers', 
                desc: 'Showcase your skills and find work',
                icon: <Briefcase size={20} style={{ color: '#e7f5ef' }} /> 
              },
              { 
                title: 'For Clients', 
                desc: 'Post jobs and hire top talent',
                icon: <Handshake size={20} style={{ color: '#e7f5ef' }} /> 
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(251,225,209,0.12)' }}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>{item.title}</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sohne)' }}>{item.desc}</p>
                </div>
              </div>
            ))}

            {/* Trust chips */}
            <div className="flex justify-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Shield size={13} style={{ color: '#e7f5ef' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sohne)' }}>TeleBirr escrow</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Users size={13} style={{ color: '#e7f5ef' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sohne)' }}>500+ freelancers</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Zap size={13} style={{ color: '#e7f5ef' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sohne)' }}>Fast matching</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right — Form Panel */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-16"
      >
        <div className="w-full max-w-md">
          {/* Language toggle */}
          <div className="flex justify-end mb-8">
            <button onClick={toggleLanguage}
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
              style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
              <Globe size={14} />
              {language === 'en' ? 'አማርኛ' : 'English'}
            </button>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-balance" style={{
              fontFamily: 'var(--font-sohne)',
              fontWeight: 600,
              fontSize: 'clamp(28px, 3vw, 36px)',
              color: '#173a32',
              letterSpacing: '-0.8px',
              marginBottom: '8px',
            }}>{t('auth.signup')}</h1>
            <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
              {t('auth.have.account')}{' '}
              <Link to="/login" style={{ color: '#1f6f5c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.login.btn')}</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 text-sm animate-fade-in" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '16px' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="signup-fullname" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.fullname')}</label>
              <input
                id="signup-fullname"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
                style={{
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid #ececec',
                  backgroundColor: '#ffffff',
                  color: '#173a32',
                  fontFamily: 'var(--font-sohne)',
                  fontSize: '15px',
                  width: '100%',
                  outline: 'none',
                }}
                placeholder="Abebe Kebede"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>
                <span className="flex items-center gap-1.5">
                  {t('auth.email')}
                  {emailVerified && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(93,42,26,0.1)', color: '#1f6f5c' }}
                    >
                      <BadgeCheck size={10} />
                      Verified
                    </motion.span>
                  )}
                </span>
              </label>
              <div className="relative">
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => {
                    setForm({...form, email: e.target.value});
                    if (emailVerified) setEmailVerified(false);
                  }}
                  style={{
                    borderRadius: '16px',
                    padding: '14px 40px 14px 16px',
                    border: emailVerified ? '1px solid #1f6f5c' : '1px solid #ececec',
                    backgroundColor: emailVerified ? 'rgba(251,225,209,0.15)' : '#ffffff',
                    color: '#173a32',
                    fontFamily: 'var(--font-sohne)',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none',
                  }}
                  placeholder="abebe@example.com"
                />
                {emailVerified && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#1f6f5c' }}>
                    <Shield size={16} />
                  </div>
                )}
              </div>
              <AnimatePresence mode="wait">
                {form.email && !emailVerified && (
                  <EmailVerification
                    email={form.email}
                    onVerified={() => setEmailVerified(true)}
                    onError={() => setEmailVerified(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-phone" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.phone')}</label>
                <input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  style={{
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #ececec',
                    backgroundColor: '#ffffff',
                    color: '#173a32',
                    fontFamily: 'var(--font-sohne)',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none',
                  }}
                  placeholder="+251 91..."
                />
              </div>
              <div>
                <label htmlFor="signup-city" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.city')}</label>
                <select
                  id="signup-city"
                  name="city"
                  value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                  style={{
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #ececec',
                    backgroundColor: '#ffffff',
                    color: '#173a32',
                    fontFamily: 'var(--font-sohne)',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23777b86\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    paddingRight: '40px',
                  }}>
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.password')}</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                style={{
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid #ececec',
                  backgroundColor: '#ffffff',
                  color: '#173a32',
                  fontFamily: 'var(--font-sohne)',
                  fontSize: '15px',
                  width: '100%',
                  outline: 'none',
                }}
                placeholder="Min. 6 characters"
              />
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.role')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({...form, role: 'freelancer'})}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: form.role === 'freelancer' ? '2px solid #1f6f5c' : '2px solid #ececec',
                    backgroundColor: form.role === 'freelancer' ? 'rgba(251,225,209,0.2)' : '#ffffff',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}>
                  <Briefcase size={22} className="block mx-auto mb-1" style={{ color: form.role === 'freelancer' ? '#1f6f5c' : '#979799' }} />
                  <span className="text-sm font-medium" style={{ color: form.role === 'freelancer' ? '#1f6f5c' : '#777b86' }}>{t('auth.freelancer')}</span>
                </button>
                <button type="button" onClick={() => setForm({...form, role: 'client'})}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: form.role === 'client' ? '2px solid #1f6f5c' : '2px solid #ececec',
                    backgroundColor: form.role === 'client' ? 'rgba(251,225,209,0.2)' : '#ffffff',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}>
                  <Handshake size={22} className="block mx-auto mb-1" style={{ color: form.role === 'client' ? '#1f6f5c' : '#979799' }} />
                  <span className="text-sm font-medium" style={{ color: form.role === 'client' ? '#1f6f5c' : '#777b86' }}>{t('auth.client')}</span>
                </button>
              </div>
            </div>

            {!emailVerified && form.email && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-4 py-3 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(251,225,209,0.3)', color: '#1f6f5c', borderRadius: '16px' }}
              >
                <Shield size={14} className="mt-0.5 flex-shrink-0" />
                <span>Please verify your email address above before signing up.</span>
              </motion.div>
            )}

            <button
              id="signup-submit"
              type="submit"
              disabled={loading || !emailVerified}
              className="btn-primary w-full"
              style={{
                height: '48px',
                lineHeight: '48px',
                fontSize: '15px',
                borderRadius: '9999px',
                opacity: !emailVerified ? 0.5 : 1,
                cursor: !emailVerified ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t('common.loading')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {emailVerified ? <BadgeCheck size={16} /> : <Mail size={16} />}
                  {t('auth.signup.btn')}
                </span>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
