import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from "motion/react";
import { Globe, Lock, ArrowRight, Users, CheckCircle, TrendingUp } from 'lucide-react';

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#ffffff' }}>
      
      {/* Left — Brand Panel (Steep editorial) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full md:w-1/2 relative flex items-center justify-center p-8 md:p-16"
        style={{ backgroundColor: '#fbe1d1' }}
      >
        <div className="relative text-center max-w-md">
          {/* Logo mark */}
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: '#5d2a1a' }}>
            <span style={{ fontFamily: 'var(--font-signifier)', color: '#fbe1d1', fontSize: '28px', lineHeight: 1 }}>E</span>
          </div>
          
          {/* Headline — Playfair Display (Signifier stand-in) */}
          <h2 style={{
            fontFamily: 'var(--font-signifier)',
            fontWeight: 400,
            fontSize: 'clamp(32px, 4vw, 44px)',
            color: '#5d2a1a',
            letterSpacing: '-0.66px',
            lineHeight: '1.2',
            marginBottom: '16px',
          }}>
            Welcome <span style={{ fontStyle: 'italic' }}>Back</span>
          </h2>
          
          <p className="text-lg mb-10" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', opacity: 0.75 }}>
            Connect with talented freelancers and find amazing work opportunities across Ethiopia.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-6">
            {[
              { value: '500+', label: 'Freelancers' },
              { value: '1K+', label: 'Jobs Done' },
              { value: '2M+', label: 'Paid' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-medium" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', fontWeight: 500 }}>{stat.value}</p>
                <p className="text-sm" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', opacity: 0.6 }}>{stat.label}</p>
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
            <h1 style={{
              fontFamily: 'var(--font-signifier)',
              fontWeight: 400,
              fontSize: '36px',
              color: '#17191c',
              letterSpacing: '-0.66px',
              marginBottom: '8px',
            }}>{t('auth.login')}</h1>
            <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
              {t('auth.no.account')}{' '}
              <Link to="/signup" style={{ color: '#5d2a1a', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.signup.btn')}</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 text-sm animate-fade-in" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '16px' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.email')}</label>
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
                  color: '#17191c',
                  fontFamily: 'var(--font-sohne)',
                  fontSize: '15px',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.password')}</label>
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
                  color: '#17191c',
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
