import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { authAPI } from '../utils/api';
import { CheckCircle, AlertTriangle, Loader, Lock, Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, email, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ice-900 mb-2">Invalid Reset Link</h2>
          <p className="text-ice-500 text-sm mb-6">This reset link is invalid or missing required parameters.</p>
          <Link to="/forgot-password" className="btn-primary inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-clay-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {success ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="w-16 h-16 bg-gebeya-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={28} className="text-gebeya-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-ice-900 mb-2">Password Reset!</h2>
              <p className="text-ice-500 text-sm mb-6">Your password has been successfully changed. Redirecting to login...</p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm">
                <ArrowLeft size={16} /> Go to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gebeya-500 to-gebeya-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Lock size={24} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-ice-900">Reset Password</h1>
                <p className="text-ice-500 text-sm mt-1">Choose a new password for <strong className="text-ice-900">{email}</strong></p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ice-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-11 pr-10 py-3 rounded-xl outline-none transition-all text-sm"
                      style={{
                        backgroundColor: '#f5efe6',
                        color: '#433930',
                        boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ice-400 hover:text-ice-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ice-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Shield size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
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
                  disabled={loading || !password || !confirmPassword}
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
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
