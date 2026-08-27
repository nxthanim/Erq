import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usersAPI, featuresAPI } from '../utils/api';
import AppAvatar from '../components/ui/avatar';

export default function FreelancerProfile() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [tips, setTips] = useState({ tips: [], total: 0, count: 0 });
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(50);
  const [tipMessage, setTipMessage] = useState('');
  const [tipSending, setTipSending] = useState(false);
  const [tipError, setTipError] = useState('');
  const [tipDone, setTipDone] = useState(false);

  useEffect(() => {
    usersAPI.getUser(id)
      .then(res => setFreelancer(res.data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
    featuresAPI.getUserBadges(id)
      .then(res => setBadges(res.data.badges))
      .catch(() => {});
    featuresAPI.getTips(id)
      .then(res => setTips(res.data))
      .catch(() => {});
  }, [id]);

  const sendTip = async () => {
    setTipError('');
    setTipSending(true);
    try {
      await featuresAPI.sendTip({ receiver_id: id, amount: tipAmount, message: tipMessage });
      setTipDone(true);
      setTimeout(() => {
        setTipOpen(false);
        setTipDone(false);
        setTipMessage('');
      }, 1800);
    } catch (err) {
      setTipError(err?.response?.data?.error || 'Failed to send tip');
    } finally {
      setTipSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">👤</span>
          <h3 className="text-xl font-semibold text-ice-900">Freelancer not found</h3>
        </div>
      </div>
    );
  }

  const skills = freelancer.skills?.split(',').map(s => s.trim()).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-clay-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        <Link to="/marketplace" className="text-ice-500 hover:text-ice-700 text-sm flex items-center gap-1 mb-6">
          ← {t('common.back')}
        </Link>

        {/* Profile Header */}
        <div className="card p-8 mb-6">
          <div className="flex items-start gap-6">
            <AppAvatar src={freelancer.profile_picture} name={freelancer.full_name} size="xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-ice-900">{freelancer.full_name}</h1>
                {freelancer.verified ? (
                  <span className="badge-green">{t('profile.verified')} ✓</span>
                ) : (
                  <span className="badge-gray">{t('profile.not.verified')}</span>
                )}
                {/* Skill Badges */}
                {badges.map(badge => {
                  const badgeConfig = {
                    verified: { label: '✓ Verified', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    pro: { label: '⭐ Pro', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                    top_rated: { label: '🏆 Top Rated', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    rising_talent: { label: '🌱 Rising Talent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  };
                  const cfg = badgeConfig[badge.badge_type] || { label: badge.badge_type, color: 'bg-clay-100 text-ice-700 border-clay-200' };
                  return (
                    <span key={badge.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.color} shadow-sm`}
                      title={`${badge.badge_type.replace('_', ' ').toUpperCase()} — ${badge.skill}`}>
                      {cfg.label}
                      <span className="text-ice-400 font-normal">·</span>
                      <span className="font-normal">{badge.skill}</span>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-sm text-ice-500">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="font-semibold text-ice-900">{freelancer.rating?.toFixed(1) || '0.0'}</span>
                  <span>({freelancer.review_count || 0} {t('profile.reviews')})</span>
                </div>
                {freelancer.city && <span>📍 {freelancer.city}</span>}
              </div>
              {freelancer.bio && (
                <p className="text-ice-600 mt-4 leading-relaxed">{freelancer.bio}</p>
              )}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {skills.map(skill => (
                    <span key={skill} className="badge-blue">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Row: Tip + Portfolio */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            to={`/portfolio/${freelancer.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gebeya-600 text-white rounded-xl hover:bg-gebeya-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
          >
            <span>🖼️</span>
            View Portfolio Gallery
            <span>→</span>
          </Link>

          {/* Tip (Buy a coffee) */}
          <div className="relative">
            <button
              onClick={() => setTipOpen(!tipOpen)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium text-sm shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#173a32', color: '#e7f5ef' }}
            >
              <span>☕</span>
              Buy a Coffee
              {tips.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(251,225,209,0.2)' }}>{tips.count}</span>
              )}
            </button>

            {tipOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 z-20 p-5 rounded-2xl bg-white shadow-2xl" style={{ border: '1px solid #ececec' }}>
                {tipDone ? (
                  <div className="text-center py-6">
                    <span className="text-4xl block mb-2">🎉</span>
                    <p className="font-semibold text-ice-900">Tip sent! Thank you for supporting {freelancer.full_name?.split(' ')[0]}.</p>
                  </div>
                ) : (
                  <>
                    <h4 className="font-semibold text-ice-900 mb-1">Send a tip ☕</h4>
                    <p className="text-xs text-ice-500 mb-4">Show your appreciation — tips support Ethiopian freelancers directly.</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {[25, 50, 100, 200, 500].map(amt => (
                        <button key={amt} onClick={() => setTipAmount(amt)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: tipAmount === amt ? '#173a32' : '#f2f2f3',
                            color: tipAmount === amt ? '#e7f5ef' : '#777b86',
                          }}>
                          ETB {amt}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="1"
                      value={tipAmount}
                      onChange={e => setTipAmount(Number(e.target.value))}
                      className="w-full mb-3 px-3 py-2 rounded-xl border text-sm"
                      style={{ borderColor: '#ececec', outline: 'none' }}
                      placeholder="Custom amount"
                    />
                    <input
                      type="text"
                      value={tipMessage}
                      onChange={e => setTipMessage(e.target.value)}
                      className="w-full mb-3 px-3 py-2 rounded-xl border text-sm"
                      style={{ borderColor: '#ececec', outline: 'none' }}
                      placeholder="Say something nice (optional)"
                      maxLength={140}
                    />

                    {tipError && <p className="text-xs mb-2" style={{ color: '#b91c1c' }}>{tipError}</p>}

                    {user ? (
                      <button onClick={sendTip} disabled={tipSending || tipAmount <= 0}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{ backgroundColor: '#173a32', color: '#ffffff', opacity: tipSending ? 0.6 : 1 }}>
                        {tipSending ? 'Sending...' : `Send ETB ${tipAmount}`}
                      </button>
                    ) : (
                      <Link to="/login"
                        className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold"
                        style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
                        Sign in to send a tip
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tips received */}
        {tips.tips?.length > 0 && (
          <div className="mb-6 card p-5">
            <h3 className="font-semibold text-ice-900 mb-1">☕ Tips received</h3>
            <p className="text-xs text-ice-500 mb-3">ETB {tips.total.toLocaleString()} from {tips.count} supporter{tips.count === 1 ? '' : 's'}</p>
            <div className="space-y-2">
              {tips.tips.slice(0, 5).map(tip => (
                <div key={tip.id} className="flex items-center gap-3 p-2 rounded-xl" style={{ backgroundColor: '#fafafb' }}>
                  <AppAvatar src={tip.sender_picture} name={tip.sender_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ice-900">{tip.sender_name}</p>
                    {tip.message && <p className="text-xs text-ice-500 truncate">"{tip.message}"</p>}
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#1f6f5c' }}>+ETB {Number(tip.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gigs */}
        {freelancer.gigs?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-ice-900 mb-4">{t('gig.my')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {freelancer.gigs.map(gig => (
                <Link key={gig.id} to={`/gigs/${gig.id}`} className="card p-5 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="badge-green text-xs">{gig.category}</span>
                    <span className="text-lg font-bold text-gebeya-600">ETB {gig.price?.toLocaleString()}</span>
                  </div>
                  <h3 className="font-semibold text-ice-900 mb-1">{gig.title}</h3>
                  <p className="text-xs text-ice-400">⏱ {gig.delivery_time} {t('marketplace.days')}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {freelancer.reviews?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-ice-900 mb-4">{t('profile.reviews')}</h2>
            <div className="space-y-3">
              {freelancer.reviews.map(review => (
                <div key={review.id} className="card p-5">
                  <div className="flex items-start gap-3">
                    <AppAvatar src={review.reviewer_picture} name={review.reviewer_name} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ice-900 text-sm">{review.reviewer_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(star => (
                            <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-ice-600 text-sm mt-1">{review.comment}</p>}
                      <p className="text-xs text-ice-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
