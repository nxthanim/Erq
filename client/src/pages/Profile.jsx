import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { authAPI, featuresAPI, reviewsAPI } from '../utils/api';
import ScrollReveal from '../components/ScrollReveal';
import {
  Camera, Link as LinkIcon, Star, Clipboard, Mail, Phone, MapPin,
  Gift, Users, ChevronRight, CheckCircle, XCircle, Copy, Loader2, Save, Share2,
  MessageCircle, Calendar, X,
} from 'lucide-react';
import AppAvatar from '../components/ui/avatar';

function SteepButton({ style: extraStyle, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${className}`}
      {...props}
      style={{ backgroundColor: '#173a32', color: '#ffffff', ...extraStyle }}
    >
      {children}
    </button>
  );
}

export default function Profile() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const { isUserOnline } = useSocket();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    bio: user?.bio || '',
    skills: user?.skills || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [message, setMessage] = useState('');
  const [referral, setReferral] = useState(null);
  const [referralSignups, setReferralSignups] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  // Reviews state
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setReferralLoading(true);
      featuresAPI.generateReferral()
        .then(res => {
          setReferral(res.data.referral);
          return featuresAPI.getReferralStats();
        })
        .then(res => {
          setReferral(res.data.referral);
          setReferralSignups(res.data.signups || []);
        })
        .catch(() => {})
        .finally(() => setReferralLoading(false));
    }
  }, [user]);

  const handleCopyReferralLink = () => {
    if (referral?.referral_code) {
      const link = `${window.location.origin}/signup?ref=${referral.referral_code}`;
      navigator.clipboard.writeText(link).then(() => {
        setMessage('Referral link copied to clipboard!');
      }).catch(() => {
        setMessage('Referral link: ' + link);
      });
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const blockExtensions = ['exe','msi','bat','cmd','sh','vbs','ps1','scr','com','pif','jar','dll','sys','app','dmg'];
    if (blockExtensions.includes(ext)) { alert('This file type is not allowed for security reasons.'); return; }

    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      const res = await authAPI.uploadProfilePicture(formData);
      const data = res.data;
      if (res.status >= 200 && res.status < 300) {
        updateUser({ ...user, profile_picture: data.profile_picture });
        setMessage('Profile picture updated!');
      } else {
        setMessage(data.error || 'Failed to upload picture');
      }
    } catch (err) {
      setMessage('Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data.user);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const cities = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Bahir Dar', 'Gondar', 'Hawassa', 'Adama', 'Jimma'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
          {t('profile.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#777b86' }}>Manage your account and public profile</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-3 gap-6">
        {/* Profile Summary */}
        <ScrollReveal variant="fadeLeft">
          <div className="col-span-1">
            <div className="rounded-3xl bg-white p-6 text-center sticky top-6"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="relative inline-block mb-4 group">
                <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AppAvatar src={user?.profile_picture} name={user?.full_name} size="xl" showStatus isOnline={isUserOnline(user?.id)} />
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                  style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
                  <Camera size={12} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
                {uploadingPic && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <Loader2 size={16} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-1 cursor-pointer hover:underline" style={{ color: '#777b86' }}
                onClick={() => fileInputRef.current?.click()}>
                Click to change photo
              </p>
              <h2 className="text-xl font-bold" style={{ color: '#173a32' }}>{user?.full_name}</h2>
              <p className="capitalize" style={{ color: '#777b86' }}>{user?.role}</p>
              <button onClick={() => {
                setShowReviews(true);
                setReviewsLoading(true);
                reviewsAPI.getUserReviews(user?.id)
                  .then(res => setReviews(res.data.reviews || []))
                  .catch(() => {})
                  .finally(() => setReviewsLoading(false));
              }}
                className="mt-4 flex items-center justify-center gap-1 mx-auto transition-all hover:opacity-80 group"
              >
                <Star size={16} style={{ color: '#1f6f5c', fill: '#1f6f5c' }} />
                <span className="font-semibold" style={{ color: '#173a32' }}>{user?.rating?.toFixed(1) || '0.0'}</span>
                <span className="text-sm" style={{ color: '#979799' }}>({user?.review_count || 0})</span>
                <ChevronRight size={12} style={{ color: '#979799' }} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              {user?.verified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mt-2"
                  style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>
                  <CheckCircle size={12} /> {t('profile.verified')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mt-2"
                  style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                  <XCircle size={12} /> {t('profile.not.verified')}
                </span>
              )}
              <div className="mt-4 pt-4 text-left space-y-2 text-sm" style={{ borderTop: '1px solid #ececec', color: '#777b86' }}>
                <p className="flex items-center gap-2"><Mail size={14} /> {user?.email}</p>
                {user?.phone && <p className="flex items-center gap-2"><Phone size={14} /> {user?.phone}</p>}
                {user?.city && <p className="flex items-center gap-2"><MapPin size={14} /> {user?.city}</p>}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Edit Form */}
        <ScrollReveal variant="fadeRight">
          <div className="col-span-2">
            <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 space-y-5"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
              {message && (
                <div className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: message.includes('successfully') || message.includes('updated') || message.includes('copied')
                      ? '#e7f5ef' : '#e7f5ef',
                    color: '#1f6f5c',
                    border: '1px solid rgba(93,42,26,0.2)'
                  }}>
                  <span>{message.includes('successfully') || message.includes('updated') ? <CheckCircle size={14} /> : <XCircle size={14} />}</span>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>{t('auth.fullname')}</label>
                  <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
                    style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                    onFocus={e => e.target.style.borderColor = '#173a32'}
                    onBlur={e => e.target.style.borderColor = '#ececec'} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>{t('auth.phone')}</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
                    style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                    placeholder="+251 91..."
                    onFocus={e => e.target.style.borderColor = '#173a32'}
                    onBlur={e => e.target.style.borderColor = '#ececec'} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>{t('auth.city')}</label>
                <select value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all bg-white"
                  style={{ border: '1px solid #ececec', color: '#173a32' }}
                  onFocus={e => e.target.style.borderColor = '#173a32'}
                  onBlur={e => e.target.style.borderColor = '#ececec'}>
                  <option value="">Select city</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {user?.role === 'freelancer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>{t('profile.bio')}</label>
                    <textarea rows={4} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all resize-none"
                      style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                      placeholder="Tell clients about yourself and your experience..."
                      onFocus={e => e.target.style.borderColor = '#173a32'}
                      onBlur={e => e.target.style.borderColor = '#ececec'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>{t('profile.skills')}</label>
                    <input type="text" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
                      style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                      placeholder="e.g., Translation, Web Design, Video Editing"
                      onFocus={e => e.target.style.borderColor = '#173a32'}
                      onBlur={e => e.target.style.borderColor = '#ececec'} />
                    <p className="text-xs mt-1" style={{ color: '#979799' }}>Separate skills with commas</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <SteepButton type="submit" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> {t('common.loading')}</> : <><Save size={14} /> {t('common.save')}</>}
                </SteepButton>
              </div>
            </form>

            {/* Referral Section */}
            <div className="rounded-3xl bg-white p-6 mt-6"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>
                  <Gift size={18} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: '#173a32' }}>Referral Program</h3>
                  <p className="text-sm" style={{ color: '#777b86' }}>Invite friends and grow the community</p>
                </div>
              </div>

              {referral && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-4"
                    style={{ backgroundColor: '#e7f5ef', border: '1px solid rgba(93,42,26,0.15)' }}>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#1f6f5c' }}>Your Referral Link</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-2xl text-sm font-mono truncate"
                        style={{ backgroundColor: '#ffffff', border: '1px solid rgba(93,42,26,0.15)', color: '#1f6f5c' }}>
                        {window.location.origin}/signup?ref={referral.referral_code}
                      </code>
                      <button onClick={handleCopyReferralLink}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                        style={{ backgroundColor: '#1f6f5c', color: '#ffffff' }}>
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#1f6f5c' }}>
                      Code: <strong>{referral.referral_code}</strong> — Share this link with friends to invite them!
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#f2f2f3' }}>
                      <p className="text-2xl font-bold" style={{ color: '#173a32' }}>{referralLoading ? '...' : referral.total_signups}</p>
                      <p className="text-xs" style={{ color: '#777b86' }}>Total Signups</p>
                    </div>
                    <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#f2f2f3' }}>
                      <p className="text-2xl font-bold" style={{ color: '#173a32' }}>{referralSignups.length}</p>
                      <p className="text-xs" style={{ color: '#777b86' }}>Active Referrals</p>
                    </div>
                    <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#e7f5ef' }}>
                      <Share2 size={24} className="mx-auto" style={{ color: '#1f6f5c' }} />
                      <p className="text-xs mt-1" style={{ color: '#1f6f5c' }}>Keep Sharing!</p>
                    </div>
                  </div>

                  {referralSignups.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: '#173a32' }}>Recent Referrals</p>
                      <div className="space-y-2">
                        {referralSignups.map(signup => (
                          <div key={signup.id} className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                            style={{ backgroundColor: '#f2f2f3' }}>
                            <AppAvatar src={signup.referred_picture} name={signup.referred_name} size="sm" />
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: '#173a32' }}>{signup.referred_name}</p>
                              <p className="text-xs" style={{ color: '#979799' }}>Joined {new Date(signup.joined_at).toLocaleDateString()}</p>
                            </div>
                            <CheckCircle size={14} style={{ color: '#1f6f5c' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </motion.div>
      {/* ====== Reviews Modal ====== */}
      <AnimatePresence>
        {showReviews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(23,25,28,0.3)' }}
            onClick={() => setShowReviews(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-3xl p-6 max-h-[80vh] flex flex-col"
              style={{ backgroundColor: '#ffffff' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
                    <MessageCircle size={20} style={{ color: '#1f6f5c' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>Reviews</h3>
                    <p style={{ color: '#777b86', fontSize: '13px' }}>
                      <span className="font-semibold" style={{ color: '#1f6f5c' }}>{user?.rating?.toFixed(1) || '0.0'}</span>
                      {' '}average from {user?.review_count || 0} review{(user?.review_count || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowReviews(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={{ color: '#777b86' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Rating Summary */}
              <div className="flex items-center gap-4 mb-5 p-4 rounded-2xl shrink-0" style={{ backgroundColor: '#fafafb' }}>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#173a32' }}>
                    {user?.rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14}
                        style={{
                          color: star <= Math.round(user?.rating || 0) ? '#1f6f5c' : '#ececec',
                          fill: star <= Math.round(user?.rating || 0) ? '#1f6f5c' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span style={{ color: '#777b86', width: '12px' }}>{star}</span>
                        <Star size={10} style={{ color: '#1f6f5c', fill: '#1f6f5c' }} />
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#ececec' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: (5 - star) * 0.05 }}
                            className="h-full rounded-full" style={{ backgroundColor: '#1f6f5c' }} />
                        </div>
                        <span style={{ color: '#979799', width: '24px', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin" style={{ color: '#777b86' }} />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#f2f2f3' }}>
                      <MessageCircle size={24} style={{ color: '#979799' }} />
                    </div>
                    <p className="font-medium" style={{ color: '#173a32' }}>No reviews yet</p>
                    <p style={{ color: '#777b86', fontSize: '14px' }} className="mt-1">Reviews from completed orders will appear here</p>
                  </div>
                ) : (
                  reviews.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-4 rounded-2xl"
                      style={{ backgroundColor: '#fafafb' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <AppAvatar src={review.reviewer_picture} name={review.reviewer_name} size="sm" />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#173a32' }}>{review.reviewer_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={10}
                                  style={{
                                    color: star <= review.rating ? '#1f6f5c' : '#ececec',
                                    fill: star <= review.rating ? '#1f6f5c' : 'transparent',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span style={{ color: '#979799', fontSize: '11px' }} className="flex items-center gap-1 shrink-0">
                          <Calendar size={10} />
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm mt-2 leading-relaxed" style={{ color: '#777b86' }}>
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Close button */}
              <button onClick={() => setShowReviews(false)}
                className="mt-4 w-full py-3 rounded-full text-sm font-semibold transition-all shrink-0"
                style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
