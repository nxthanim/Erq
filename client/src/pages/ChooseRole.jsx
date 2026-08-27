import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../utils/api';
import { motion } from 'motion/react';
import { Briefcase, Handshake, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function ChooseRole() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await authAPI.updateRole(selected);
      updateUser(res.data.user);
      localStorage.setItem('erq_role_selected', 'true');
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      // Fallback: update locally even if backend fails
      updateUser({ role: selected });
      localStorage.setItem('erq_role_selected', 'true');
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#ffffff' }}>
      <div className="w-full max-w-2xl text-center">
        {/* Logo */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-[18px] flex items-center justify-center mx-auto mb-8 overflow-hidden"
          style={{ backgroundColor: '#173a32', boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
          <img src="/high-resolution-color-logo.png" alt="Erq" className="h-10 w-auto no-grayscale" />
        </motion.div>

        {done ? (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#d1fae5' }}>
              <CheckCircle size={40} style={{ color: '#047857' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#173a32' }}>
              You're all set!
            </h1>
            <p className="text-base" style={{ color: '#777b86' }}>
              Welcome to Erq, {user?.full_name?.split(' ')[0]}. Taking you to your dashboard...
            </p>
          </motion.div>
        ) : (
          <>
            <motion.h1 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="text-3xl font-bold mb-2" style={{ color: '#173a32', letterSpacing: '-0.5px' }}>
              Welcome to <span style={{ fontFamily: 'var(--font-signifier)', fontStyle: 'italic', color: '#1f6f5c' }}>Erq</span>
            </motion.h1>
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-base mb-10" style={{ color: '#777b86' }}>
              Tell us how you'd like to use the platform
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-5 mb-10">
              {/* Freelancer */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                onClick={() => setSelected('freelancer')}
                className="relative text-left p-8 rounded-3xl transition-all duration-200 group"
                style={{
                  backgroundColor: selected === 'freelancer' ? '#173a32' : '#fafafb',
                  border: selected === 'freelancer' ? '2px solid #1f6f5c' : '2px solid transparent',
                  boxShadow: selected === 'freelancer' ? '0 12px 40px rgba(23,25,28,0.2)' : '0 0 0 1px rgba(0,0,0,0.04)',
                }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all"
                  style={{
                    backgroundColor: selected === 'freelancer' ? 'rgba(251,225,209,0.2)' : '#e7f5ef',
                    color: selected === 'freelancer' ? '#e7f5ef' : '#1f6f5c',
                  }}>
                  <Briefcase size={28} />
                </div>
                <h2 className="text-xl font-bold mb-2 transition-colors" style={{ color: selected === 'freelancer' ? '#ffffff' : '#173a32' }}>
                  I'm a Freelancer
                </h2>
                <p className="text-sm transition-colors" style={{ color: selected === 'freelancer' ? 'rgba(255,255,255,0.7)' : '#777b86' }}>
                  I want to offer my services, create gigs, and earn money doing what I love.
                </p>
                {selected === 'freelancer' && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
                    <CheckCircle size={14} style={{ color: '#1f6f5c' }} />
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  {['Sell services', 'Get tips', 'Build portfolio', 'ETB payouts'].map(tag => (
                    <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: selected === 'freelancer' ? 'rgba(255,255,255,0.1)' : '#f2f2f3',
                        color: selected === 'freelancer' ? 'rgba(255,255,255,0.8)' : '#777b86',
                      }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.button>

              {/* Client */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                onClick={() => setSelected('client')}
                className="relative text-left p-8 rounded-3xl transition-all duration-200 group"
                style={{
                  backgroundColor: selected === 'client' ? '#173a32' : '#fafafb',
                  border: selected === 'client' ? '2px solid #1f6f5c' : '2px solid transparent',
                  boxShadow: selected === 'client' ? '0 12px 40px rgba(23,25,28,0.2)' : '0 0 0 1px rgba(0,0,0,0.04)',
                }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all"
                  style={{
                    backgroundColor: selected === 'client' ? 'rgba(251,225,209,0.2)' : '#e7f5ef',
                    color: selected === 'client' ? '#e7f5ef' : '#1f6f5c',
                  }}>
                  <Handshake size={28} />
                </div>
                <h2 className="text-xl font-bold mb-2 transition-colors" style={{ color: selected === 'client' ? '#ffffff' : '#173a32' }}>
                  I'm a Client
                </h2>
                <p className="text-sm transition-colors" style={{ color: selected === 'client' ? 'rgba(255,255,255,0.7)' : '#777b86' }}>
                  I want to hire freelancers, post jobs, and get work done for my business.
                </p>
                {selected === 'client' && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
                    <CheckCircle size={14} style={{ color: '#1f6f5c' }} />
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  {['Post jobs', 'Hire talent', 'Escrow protection', 'ETB payments'].map(tag => (
                    <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: selected === 'client' ? 'rgba(255,255,255,0.1)' : '#f2f2f3',
                        color: selected === 'client' ? 'rgba(255,255,255,0.8)' : '#777b86',
                      }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.button>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={handleConfirm}
              disabled={!selected || saving}
              className="inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-base font-semibold transition-all"
              style={{
                backgroundColor: selected ? '#173a32' : '#f2f2f3',
                color: selected ? '#ffffff' : '#a3a6af',
                opacity: saving ? 0.6 : 1,
                cursor: selected ? 'pointer' : 'not-allowed',
              }}>
              {saving ? 'Setting up...' : selected ? `Continue as ${selected}` : 'Select a role'}
              {selected && !saving && <ArrowRight size={18} />}
            </motion.button>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-xs mt-6" style={{ color: '#a3a6af' }}>
              <Sparkles size={12} className="inline" /> You can change your role later in settings
            </motion.p>
          </>
        )}
      </div>
    </motion.div>
  );
}