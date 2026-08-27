import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from "motion/react";
import { Globe, Lock, Sparkles, Star, ShieldCheck } from 'lucide-react';

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function Login() {
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
              Welcome <span className="accent-word" style={{ color: '#e7f5ef' }}>Back</span>
            </h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sohne)' }}>
              Connect with talented freelancers and find amazing work opportunities across Ethiopia.
            </p>
          </div>
        </div>
        {/* Right — Clerk SignIn */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-16">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h1 className="text-balance" style={{ fontFamily: 'var(--font-sohne)', fontWeight: 600, fontSize: 'clamp(28px, 3vw, 36px)', color: '#173a32', letterSpacing: '-0.8px', marginBottom: '8px' }}>{t('auth.login')}</h1>
              <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
                {t('auth.no.account')}{' '}
                <Link to="/signup" style={{ color: '#1f6f5c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.signup.btn')}</Link>
              </p>
            </div>
            <SignIn
              signUpUrl="/signup"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#ffffff' }}>
      
      {/* Left — Brand Panel (Fiverr-style dark ink) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full md:w-1/2 relative overflow-hidden flex items-center justify-center p-8 md:p-16"
        style={{ backgroundColor: '#173a32' }}
      >
        {/* Warm glow + subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 15%, rgba(251,225,209,0.14) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative text-center max-w-md">
          {/* Logo */}
          <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-8 overflow-hidden" style={{ backgroundColor: '#ffffff', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
            <img src="/high-resolution-color-logo.png" alt="Erq" className="h-9 w-auto no-grayscale" />
          </div>
          
          {/* Headline — sans-serif bold with serif italic accent (Fiverr-style) */}
          <h2 className="text-balance" style={{
            fontFamily: 'var(--font-sohne)',
            fontWeight: 600,
            fontSize: 'clamp(30px, 3.6vw, 42px)',
            color: '#ffffff',
            letterSpacing: '-1px',
            lineHeight: '1.15',
            marginBottom: '16px',
          }}>
            Welcome <span className="accent-word" style={{ color: '#e7f5ef' }}>Back</span>
          </h2>
          
          <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sohne)' }}>
            Connect with talented freelancers and find amazing work opportunities across Ethiopia.
          </p>

          {/* Floating trust cards */}
          <div className="relative hidden sm:block h-[120px] mb-8">
            <div className="absolute left-0 top-0 flex items-center gap-2 px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', animation: 'float 6s ease-in-out infinite' }}>
              <ShieldCheck size={14} style={{ color: '#e7f5ef' }} />
              <span className="text-xs" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)' }}>TeleBirr escrow protected</span>
            </div>
            <div className="absolute right-0 top-8 flex items-center gap-2 px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', animation: 'float 6s ease-in-out 2s infinite' }}>
              <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={10} fill="#e7f5ef" style={{ color: '#e7f5ef' }} />)}</div>
              <span className="text-xs" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)' }}>4.9 avg rating</span>
            </div>
            <div className="absolute left-6 bottom-0 flex items-center gap-2 px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', animation: 'float 6s ease-in-out 4s infinite' }}>
              <Sparkles size={14} style={{ color: '#e7f5ef' }} />
              <span className="text-xs" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)' }}>AI-powered matching</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6">
            {[
              { value: '500+', label: 'Freelancers' },
              { value: '1K+', label: 'Jobs Done' },
              { value: 'ETB 2M+', label: 'Paid Out' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl" style={{ color: '#ffffff', fontFamily: 'var(--font-sohne)', fontWeight: 600 }}>{stat.value}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sohne)' }}>{stat.label}</p>
              </div>
            ))}
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
            }}>{t('auth.login')}</h1>
            <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
              {t('auth.no.account')}{' '}
              <Link to="/signup" style={{ color: '#1f6f5c', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.signup.btn')}</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 text-sm animate-fade-in" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '16px' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.email')}</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="you@example.com"
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
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm mb-1.5" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.password')}</label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="••••••••"
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
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ height: '48px', lineHeight: '48px', fontSize: '15px', borderRadius: '9999px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t('common.loading')}
                </span>
              ) : t('auth.login.btn')}
            </button>

            <div className="text-center mt-4">
              <Link to="/forgot-password" className="text-sm" style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
                Forgot password?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: '#a3a6af', fontFamily: 'var(--font-sohne)' }}>
              <Lock size={10} className="inline" /> Secure login with JWT encryption
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
