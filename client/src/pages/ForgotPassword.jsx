import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { authAPI } from '../utils/api';
import { Mail, ArrowLeft, CheckCircle, AlertTriangle, Loader, Shield } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email });
      setSent(true);
      if (res.data.resetLink) {
        setResetLink(res.data.resetLink);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {sent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="w-16 h-16 bg-gebeya-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={28} className="text-gebeya-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-ice-900 mb-2">Check Your Email</h2>
              <p className="text-ice-500 text-sm mb-4">
                If an account exists for <strong className="text-ice-900">{email}</strong>, a password reset link has been sent.
              </p>

              {resetLink && (
                <div className="bg-gebeya-50 border border-gebeya-200 rounded-xl p-4 mb-4 text-left">
                  <p className="text-xs text-gebeya-600 font-medium mb-1.5 uppercase tracking-wider">🔗 Development Mode</p>
                  <a
                    href={resetLink}
                    className="text-xs text-gebeya-700 underline break-all hover:text-gebeya-800"
                  >
                    {resetLink}
                  </a>
                  <p className="text-[10px] text-gebeya-500 mt-1">Click the link above to reset your password (visible in dev mode only)</p>
                </div>
              )}

              <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gebeya-500 to-gebeya-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Shield size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-ice-900">Forgot Password?</h1>
                <p className="text-ice-500 text-sm mt-1">Enter your email and we'll send you a reset link</p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ice-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all text-sm"
                      style={{
                        backgroundColor: '#f5efe6',
                        color: '#433930',
                        boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)',
                      }}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: '#1a1a1a',
                    boxShadow: '6px 6px 18px rgba(0,0,0,0.30), inset -4px -4px 12px rgba(0,0,0,0.25), inset 4px 4px 12px rgba(255,255,255,0.25)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={16} className="animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-gebeya-600 hover:text-gebeya-700 font-medium inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
