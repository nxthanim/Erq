import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from "motion/react";
import EmailVerification from '../components/EmailVerification';
import { BadgeCheck, Shield, Mail, Globe, Briefcase, Handshake, Sparkles, ArrowRight } from 'lucide-react';

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen flex" style={{ backgroundColor: '#ffffff' }}>
      
      {/* Left — Brand Panel (Steep editorial peach) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden md:flex w-1/2 relative flex-col items-center justify-center p-16"
        style={{ backgroundColor: '#fbe1d1' }}
      >
        <div className="relative text-center max-w-sm">
          {/* Logo mark */}
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: '#5d2a1a' }}>
            <span style={{ fontFamily: 'var(--font-signifier)', color: '#fbe1d1', fontSize: '28px', lineHeight: 1 }}>E</span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-signifier)',
            fontWeight: 400,
            fontSize: 'clamp(32px, 4vw, 44px)',
            color: '#5d2a1a',
            letterSpacing: '-0.66px',
            lineHeight: '1.2',
            marginBottom: '16px',
          }}>
            Join <span style={{ fontStyle: 'italic' }}>Erq</span> Today
          </h2>
          
          <p className="text-lg mb-10" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', opacity: 0.75 }}>
            Start your journey — whether you're looking for talent or offering your skills.
          </p>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              { 
                title: 'For Freelancers', 
                desc: 'Showcase your skills and find work',
                icon: <Briefcase size={20} style={{ color: '#5d2a1a' }} /> 
              },
              { 
                title: 'For Clients', 
                desc: 'Post jobs and hire top talent',
                icon: <Handshake size={20} style={{ color: '#5d2a1a' }} /> 
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '20px' }}>
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(93,42,26,0.1)' }}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{item.title}</p>
                  <p className="text-sm" style={{ color: '#5d2a1a', fontFamily: 'var(--font-sohne)', opacity: 0.6 }}>{item.desc}</p>
                </div>
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
            }}>{t('auth.signup')}</h1>
            <p style={{ color: '#777b86', fontFamily: 'var(--font-sohne)' }}>
              {t('auth.have.account')}{' '}
              <Link to="/login" style={{ color: '#5d2a1a', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('auth.login.btn')}</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 text-sm animate-fade-in" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '16px' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="signup-fullname" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.fullname')}</label>
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
                  color: '#17191c',
                  fontFamily: 'var(--font-sohne)',
                  fontSize: '15px',
                  width: '100%',
                  outline: 'none',
                }}
                placeholder="Abebe Kebede"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>
                <span className="flex items-center gap-1.5">
                  {t('auth.email')}
                  {emailVerified && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(93,42,26,0.1)', color: '#5d2a1a' }}
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
                    border: emailVerified ? '1px solid #5d2a1a' : '1px solid #ececec',
                    backgroundColor: emailVerified ? 'rgba(251,225,209,0.15)' : '#ffffff',
                    color: '#17191c',
                    fontFamily: 'var(--font-sohne)',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none',
                  }}
                  placeholder="abebe@example.com"
                />
                {emailVerified && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#5d2a1a' }}>
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
                <label htmlFor="signup-phone" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.phone')}</label>
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
                    color: '#17191c',
                    fontFamily: 'var(--font-sohne)',
                    fontSize: '15px',
                    width: '100%',
                    outline: 'none',
                  }}
                  placeholder="+251 91..."
                />
              </div>
              <div>
                <label htmlFor="signup-city" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.city')}</label>
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
                    color: '#17191c',
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
              <label htmlFor="signup-password" className="block text-sm mb-1.5" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.password')}</label>
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
                  color: '#17191c',
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
              <label className="block text-sm mb-2" style={{ color: '#17191c', fontFamily: 'var(--font-sohne)', fontWeight: 450 }}>{t('auth.role')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({...form, role: 'freelancer'})}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: form.role === 'freelancer' ? '2px solid #5d2a1a' : '2px solid #ececec',
                    backgroundColor: form.role === 'freelancer' ? 'rgba(251,225,209,0.2)' : '#ffffff',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}>
                  <Briefcase size={22} className="block mx-auto mb-1" style={{ color: form.role === 'freelancer' ? '#5d2a1a' : '#979799' }} />
                  <span className="text-sm font-medium" style={{ color: form.role === 'freelancer' ? '#5d2a1a' : '#777b86' }}>{t('auth.freelancer')}</span>
                </button>
                <button type="button" onClick={() => setForm({...form, role: 'client'})}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: form.role === 'client' ? '2px solid #5d2a1a' : '2px solid #ececec',
                    backgroundColor: form.role === 'client' ? 'rgba(251,225,209,0.2)' : '#ffffff',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}>
                  <Handshake size={22} className="block mx-auto mb-1" style={{ color: form.role === 'client' ? '#5d2a1a' : '#979799' }} />
                  <span className="text-sm font-medium" style={{ color: form.role === 'client' ? '#5d2a1a' : '#777b86' }}>{t('auth.client')}</span>
                </button>
              </div>
            </div>

            {!emailVerified && form.email && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm px-4 py-3 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(251,225,209,0.3)', color: '#5d2a1a', borderRadius: '16px' }}
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
