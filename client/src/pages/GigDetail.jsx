import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { gigsAPI, ordersAPI, messagesAPI, paymentsAPI } from '../utils/api';
import ChapaInlineCheckout from '../components/ChapaInlineCheckout';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ShoppingCart, FileText, MessageSquare, Code, PenTool, Camera, Music,
  BarChart, Globe, Smartphone, Palette, BookOpen, ChevronRight, CheckCircle,
  Lock, Info, AlertOctagon, ExternalLink, Loader2, Timer, Trash2, MapPin,
  MessageCircle, Star,
} from 'lucide-react';
import AppAvatar from '../components/ui/avatar';

export default function GigDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [projectType, setProjectType] = useState('');
  const [requirements, setRequirements] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderStep, setOrderStep] = useState('form');
  const [orderError, setOrderError] = useState('');
  const [chapaTxRef, setChapaTxRef] = useState('');
  const [chapaPublicKey, setChapaPublicKey] = useState('');
  
  const projectTypes = [
    { id: 'new', label: 'New Project', icon: FileText, desc: 'Create something from scratch' },
    { id: 'revision', label: 'Revision', icon: PenTool, desc: 'Modify or update existing work' },
    { id: 'consultation', label: 'Consultation', icon: MessageSquare, desc: 'Get advice or expertise' },
    { id: 'ongoing', label: 'Ongoing Work', icon: BarChart, desc: 'Long-term or recurring project' },
  ];

  useEffect(() => {
    gigsAPI.get(id)
      .then(res => setGig(res.data.gig))
      .catch(() => navigate('/marketplace'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleContact = async () => {
    if (!user) { navigate('/login'); return; }
    if (!message.trim()) return;
    setSending(true);
    try {
      await messagesAPI.send({
        receiverId: gig.freelancer_id,
        message: message.trim(),
        jobId: null
      });
      setMessage('');
      navigate('/messages');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#173a32]/20 border-t-[#173a32]"></div>
      </div>
    );
  }

  if (!gig) return null;

  const portfolioImages = JSON.parse(gig.portfolio_images || '[]');

  const SteepButton = ({ style: extraStyle, className = '', children, ...props }) => (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${className}`}
      {...props}
      style={{ backgroundColor: '#173a32', color: '#ffffff', ...extraStyle }}
    >
      {children}
    </button>
  );

  const GhostButton = ({ style: extraStyle, className = '', children, ...props }) => (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${className}`}
      {...props}
      style={{ backgroundColor: 'transparent', color: '#173a32', border: '1px solid #173a32', ...extraStyle }}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm mb-6 hover:underline" style={{ color: '#777b86' }}>
          <ChevronRight size={14} className="rotate-180" /> {t('common.back')} to Marketplace
        </Link>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            <div className="p-6 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-2"
                    style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>
                    {gig.category}
                  </span>
                  <h1 className="text-2xl" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>
                    {gig.title}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-medium" style={{ color: '#173a32' }}>ETB {gig.price?.toLocaleString()}</p>
                  <p className="text-sm" style={{ color: '#777b86' }}>{t('marketplace.per.project')}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 py-4" style={{ borderTop: '1px solid #e5e5e7', borderBottom: '1px solid #e5e5e7' }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: '#777b86' }}>
                  <Timer size={14} />
                  <span>{gig.delivery_time} {t('marketplace.days')} {t('marketplace.delivery')}</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-3" style={{ color: '#173a32' }}>Description</h3>
                <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#777b86' }}>{gig.description}</p>
              </div>
            </div>

            {/* Portfolio Images */}
            {portfolioImages.length > 0 && (
              <div className="p-6 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
                <h3 className="font-medium mb-4" style={{ color: '#173a32' }}>Portfolio</h3>
                <div className="grid grid-cols-2 gap-4">
                  {portfolioImages.map((img, i) => (
                    <img key={i} src={img} alt={`Portfolio ${i + 1}`}
                      className="w-full h-48 object-cover" style={{ borderRadius: '12px' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Contact Form */}
            {user && user.id !== gig.freelancer_id && (
              <div id="order-contact-section" className="p-6 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
                <h3 className="font-medium mb-4" style={{ color: '#173a32' }}>Contact Freelancer</h3>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Hi, I'm interested in your gig. Let's discuss..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all mb-3"
                  style={{ border: '1px solid #ececec', backgroundColor: '#ffffff', color: '#173a32', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#173a32'}
                  onBlur={e => e.target.style.borderColor = '#ececec'}
                />
                <SteepButton onClick={handleContact} disabled={sending || !message.trim()}
                  style={{ opacity: sending || !message.trim() ? 0.5 : 1 }}>
                  {sending ? t('common.loading') : t('common.send') + ' Message'}
                </SteepButton>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Order Card */}
            <div className="p-6 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
              <div className="text-center mb-4">
                <p className="text-3xl font-medium" style={{ color: '#173a32' }}>ETB {gig.price?.toLocaleString()}</p>
                <p className="text-sm" style={{ color: '#777b86' }}>{t('marketplace.per.project')}</p>
                <p className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: '#979799' }}>
                  <Timer size={12} /> {gig.delivery_time} {t('marketplace.days')} {t('marketplace.delivery')}
                </p>
              </div>
              {/* Portfolio Preview */}
              {portfolioImages.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
                  {portfolioImages.slice(0, 4).map((img, i) => (
                    <img key={i} src={img} alt={`Preview ${i + 1}`}
                      className="w-full h-24 object-cover" />
                  ))}
                </div>
              )}
              {user && user.id !== gig.freelancer_id && (
                <>
                  <SteepButton onClick={() => {
                    setShowOrderModal(true);
                    setProjectType('');
                    setRequirements('');
                    setOrderStep('form');
                    setOrderError('');
                  }} className="w-full mb-2" style={{ width: '100%', height: '44px' }}>
                    <ShoppingCart size={15} />
                    Checkout — ETB {gig.price?.toLocaleString()}
                  </SteepButton>
                  <GhostButton onClick={() => navigate(`/messages?userId=${gig.freelancer_id}&userName=${encodeURIComponent(gig.freelancer_name || 'Freelancer')}`)}
                    className="w-full mb-2" style={{ width: '100%', height: '44px' }}>
                    <MessageCircle size={15} />
                    Message {gig.freelancer_name?.split(' ')[0]}
                  </GhostButton>
                </>
              )}
              {!user && (
                <Link to="/login" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium w-full text-center"
                  style={{ backgroundColor: '#173a32', color: '#ffffff', height: '44px' }}>
                  <Lock size={15} /> Login to Order
                </Link>
              )}
              {user && user.id !== gig.freelancer_id && (
                <Link to={`/freelancers/${gig.freelancer_id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium w-full text-center mt-2"
                  style={{ backgroundColor: 'transparent', color: '#173a32', border: '1px solid #173a32', height: '44px' }}>
                  View Profile
                </Link>
              )}
              {user && user.id === gig.freelancer_id && (
                <div className="space-y-2 mt-2">
                  <button onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium w-full"
                    style={{ backgroundColor: 'transparent', color: '#1f6f5c', border: '1px solid #1f6f5c', height: '44px' }}>
                    <Trash2 size={15} /> Delete Gig
                  </button>
                </div>
              )}
            </div>

            {/* About the Freelancer */}
            <div className="p-6 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
              <h3 className="font-medium mb-4" style={{ color: '#173a32' }}>About the Freelancer</h3>
              <Link to={`/freelancers/${gig.freelancer_id}`} className="flex items-center gap-3 mb-4 group">
                <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="lg" />
                <div>
                  <p className="font-medium group-hover:opacity-70 transition-opacity" style={{ color: '#173a32' }}>{gig.freelancer_name}</p>
                  <div className="flex items-center gap-1">
                    <Star size={14} style={{ color: '#1f6f5c', fill: '#1f6f5c' }} />
                    <span className="text-sm" style={{ color: '#777b86' }}>{gig.freelancer_rating?.toFixed(1) || '0.0'}</span>
                    {gig.freelancer_verified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ml-1"
                        style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>Verified</span>
                    ) : null}
                  </div>
                  {gig.freelancer_city && (
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#979799' }}>
                      <MapPin size={10} /> {gig.freelancer_city}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ORDER MODAL ===== */}
      <AnimatePresence>
        {showOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(23,25,28,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget && !orderLoading) setShowOrderModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 20px 25px -5px rgba(0,0,0,0.1)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Done — Order Placed */}
              {orderStep === 'done' ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: '#e7f5ef' }}>
                    <CheckCircle size={40} style={{ color: '#1f6f5c' }} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
                    Order Placed!
                  </h2>
                  <p className="mb-4" style={{ color: '#777b86' }}>
                    Your order has been sent to <strong style={{ color: '#173a32' }}>{gig.freelancer_name}</strong>.
                    They will review it and respond shortly.
                  </p>
                  <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#f2f2f3' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: '#777b86' }}>Status</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c' }}>Pending</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#777b86' }}>Amount</span>
                      <span className="font-bold" style={{ color: '#1f6f5c' }}>ETB {gig.price?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <GhostButton onClick={() => { setShowOrderModal(false); setOrderStep('form'); }}>
                      Continue Browsing
                    </GhostButton>
                    <SteepButton onClick={() => navigate('/orders')}>
                      View My Orders
                    </SteepButton>
                  </div>
                </div>
              ) : orderStep === 'verifying' ? (
                /* Verifying */
                <div className="text-center py-10">
                  <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: '#1f6f5c' }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#173a32' }}>Verifying Payment...</h3>
                  <p className="text-sm" style={{ color: '#777b86' }}>Please wait while we confirm your payment with Chapa's secure API.</p>
                </div>
              ) : orderStep === 'checkout' ? (
                /* Checkout */
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
                        <ShoppingCart size={22} style={{ color: '#1f6f5c' }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: '#173a32' }}>Complete Payment</h2>
                        <p className="text-xs" style={{ color: '#979799' }}>{gig.title}</p>
                      </div>
                    </div>
                    <button onClick={() => { setOrderStep('form'); setOrderError(''); }}
                      className="text-xs hover:opacity-70 transition-all" style={{ color: '#979799' }}>
                      Back
                    </button>
                  </div>

                  <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#f2f2f3' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="sm" />
                        <div>
                          <p className="font-medium text-sm" style={{ color: '#173a32' }}>{gig.freelancer_name}</p>
                          <p className="text-xs" style={{ color: '#979799' }}>{gig.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: '#1f6f5c' }}>ETB {gig.price?.toLocaleString()}</p>
                        <p className="text-[10px]" style={{ color: '#979799' }}><Timer size={10} className="inline" /> {gig.delivery_time} days</p>
                      </div>
                    </div>
                  </div>

                  {orderError && (
                    <div className="mb-4 p-3 rounded-2xl text-sm flex items-start gap-2"
                      style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c', border: '1px solid rgba(93,42,26,0.2)' }}>
                      <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  <ChapaInlineCheckout
                    publicKey={chapaPublicKey}
                    txRef={chapaTxRef}
                    amount={gig.price}
                    currency="ETB"
                    onSuccess={async () => {
                      setOrderStep('verifying');
                      try {
                        const res = await paymentsAPI.verifyChapa(chapaTxRef);
                        if (res.data?.verified) {
                          setOrderStep('done');
                        } else {
                          setOrderError('Payment not yet confirmed. Please try again.');
                          setOrderStep('checkout');
                        }
                      } catch {
                        setOrderError('Could not verify payment. Please try again.');
                        setOrderStep('checkout');
                      }
                    }}
                    onFailure={(err) => {
                      setOrderError(err?.message || 'Payment was not completed. Please try again.');
                      setOrderStep('form');
                    }}
                    onClose={() => {
                      setOrderError('Checkout was closed. You can try again when ready.');
                      setOrderStep('form');
                    }}
                  />
                </>
              ) : (
                /* Form Step */
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
                        <ShoppingCart size={22} style={{ color: '#1f6f5c' }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: '#173a32' }}>Place Your Order</h2>
                        <p className="text-xs" style={{ color: '#979799' }}>{gig.title}</p>
                      </div>
                    </div>
                    <button onClick={() => !orderLoading && setShowOrderModal(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f2f2f3] transition-all">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Gig Summary */}
                  <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#f2f2f3' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AppAvatar src={gig.freelancer_picture} name={gig.freelancer_name} size="sm" />
                        <div>
                          <p className="font-medium text-sm" style={{ color: '#173a32' }}>{gig.freelancer_name}</p>
                          <p className="text-xs" style={{ color: '#979799' }}>{gig.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: '#1f6f5c' }}>ETB {gig.price?.toLocaleString()}</p>
                        <p className="text-[10px]" style={{ color: '#979799' }}><Timer size={10} className="inline" /> {gig.delivery_time} days</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Project Type */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold mb-3" style={{ color: '#173a32' }}>
                      What type of project is this? <span style={{ color: '#1f6f5c' }}>*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {projectTypes.map(type => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setProjectType(type.id)}
                            className="p-3 rounded-2xl text-left transition-all"
                            style={{
                              border: projectType === type.id ? '2px solid #1f6f5c' : '1px solid #ececec',
                              backgroundColor: projectType === type.id ? '#e7f5ef20' : 'transparent'
                            }}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                              style={{ backgroundColor: projectType === type.id ? '#1f6f5c' : '#f2f2f3', color: projectType === type.id ? '#ffffff' : '#777b86' }}>
                              <Icon size={16} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: projectType === type.id ? '#1f6f5c' : '#173a32' }}>
                              {type.label}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#979799' }}>{type.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Requirements */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#173a32' }}>
                      What do you need done? <span style={{ color: '#979799', fontWeight: 400 }}>(describe your requirements)</span>
                    </label>
                    <textarea
                      value={requirements}
                      onChange={e => setRequirements(e.target.value)}
                      placeholder={`Describe what you need:\n• What exactly should the freelancer create?\n• Any specific files, formats, or examples?\n• Deadline or timeline preferences?\n• Any reference materials or inspirations?`}
                      rows={5}
                      className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all"
                      style={{ border: '1px solid #ececec', color: '#173a32', backgroundColor: '#ffffff' }}
                      onFocus={e => e.target.style.borderColor = '#173a32'}
                      onBlur={e => e.target.style.borderColor = '#ececec'}
                    />
                    <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: '#979799' }}>
                      <Info size={10} /> Clear requirements help the freelancer understand your needs and deliver faster.
                    </p>
                  </div>

                  {/* Error */}
                  {orderError && (
                    <div className="mb-4 p-3 rounded-2xl text-sm flex items-start gap-2"
                      style={{ backgroundColor: '#e7f5ef', color: '#1f6f5c', border: '1px solid rgba(93,42,26,0.2)' }}>
                      <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => { setShowOrderModal(false); setOrderStep('form'); }}
                      disabled={orderLoading}
                      className="flex-1 py-3 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                      style={{ backgroundColor: 'transparent', color: '#777b86', border: '1px solid #ececec' }}>
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!projectType) { setOrderError('Please select a project type'); return; }
                        setOrderLoading(true);
                        setOrderError('');
                        try {
                          const fullRequirements = `[${projectTypes.find(t => t.id === projectType)?.label || projectType}]\n\n${requirements}`;
                          const res = await paymentsAPI.initiateChapa({
                            gigId: gig.id,
                            amount: gig.price,
                            currency: 'ETB',
                            email: user?.email || 'customer@erq.et',
                            first_name: user?.full_name?.split(' ')[0] || 'Customer',
                            last_name: user?.full_name?.split(' ').slice(1).join(' ') || 'User',
                            description: `Payment for ${gig.title}`,
                            requirements: fullRequirements,
                            itemTitle: projectTypes.find(t => t.id === projectType)?.label || 'Order',
                          });
                          setChapaTxRef(res.data.tx_ref);
                          setChapaPublicKey(res.data.public_key || '');
                          setOrderStep('checkout');
                        } catch (err) {
                          setOrderError(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
                        } finally { setOrderLoading(false); }
                      }}
                      disabled={orderLoading || !projectType}
                      className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2`}
                      style={{
                        backgroundColor: !projectType ? '#f2f2f3' : '#173a32',
                        color: !projectType ? '#979799' : '#ffffff',
                        opacity: orderLoading ? 0.7 : 1
                      }}>
                      {orderLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Initiating Payment...</>
                      ) : (
                        <><ShoppingCart size={16} /> Pay with Chapa — ETB {gig.price?.toLocaleString()}</>
                      )}
                    </button>
                  </div>

                  {/* Checkout Notice */}
                  <div className="mt-4 p-3 rounded-2xl text-[10px] flex items-start gap-2"
                    style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                    <Lock size={12} className="shrink-0 mt-0.5" />
                    <span>
                      <strong style={{ color: '#173a32' }}>Secure Inline Checkout:</strong> Pay directly on this page with Telebirr, CBE Birr, or other methods. No redirect.
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await gigsAPI.delete(id);
            navigate('/my-gigs');
          } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete gig');
          } finally { setDeleting(false); }
        }}
        title="Delete Gig"
        message="Are you sure you want to delete this gig? It will be hidden from the marketplace and cannot be undone."
        itemName={gig?.title}
        loading={deleting}
      />
    </div>
  );
}
