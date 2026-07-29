import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, paymentsAPI, reviewsAPI } from '../utils/api';
import ReviewModal from '../components/ReviewModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import {
  Upload, Download, Eye, Package, XCircle, Loader2,
  Send, AlertTriangle, File, Image, Film, Music, FileText, Archive, CheckCircle
} from 'lucide-react';
import OrderStatusChip from '../components/ui/OrderStatusChip';

// ====== FILE TYPE HELPERS ======
function getFileIcon(type) {
  if (!type) return File;
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf') || type.includes('word') || type.includes('document')) return FileText;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive;
  return File;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ====== DELIVERY UPLOAD MODAL ======
function JobDeliveryUploadModal({ isOpen, onClose, jobId, onDelivered }) {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const maxSize = 100 * 1024 * 1024;
    const valid = selected.filter(f => f.size <= maxSize);
    const oversized = selected.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed 100MB limit`);
    }
    setFiles(prev => [...prev, ...valid].slice(0, 10));
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to deliver');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const total = files.length;
      const fileData = await Promise.all(files.map((file, idx) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadProgress(Math.round(((idx + 1) / total) * 70));
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            data: reader.result,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      setUploadProgress(80);

      await jobsAPI.deliver(jobId, {
        message: message || 'Delivered finished work',
        files: fileData,
      });
      setUploadProgress(100);

      await new Promise(r => setTimeout(r, 400));
      onDelivered();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deliver work');
      setUploadProgress(0);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-3xl p-6"
        style={{ backgroundColor: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: '#17191c' }}>Deliver Finished Work</h3>
          <button onClick={onClose} style={{ color: '#777b86' }} className="p-1 rounded-lg hover:bg-gray-50 transition-all">
            <XCircle size={20} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className="rounded-2xl p-8 text-center cursor-pointer transition-all mb-4"
          style={{ border: '2px dashed #ececec', backgroundColor: '#fafafb' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload size={32} style={{ color: '#777b86' }} className="mx-auto mb-3" />
          <p className="font-medium mb-1" style={{ color: '#17191c' }}>Click to upload finished files</p>
          <p style={{ color: '#979799', fontSize: '13px' }}>
            Any file type accepted — Max 100MB per file
          </p>
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {files.map((file, i) => {
              const Icon = getFileIcon(file.type);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#f2f2f3' }}>
                  <Icon size={18} style={{ color: '#5d2a1a' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#17191c' }}>{file.name}</p>
                    <p style={{ color: '#979799', fontSize: '12px' }}>{formatFileSize(file.size)}</p>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ color: '#777b86' }} className="hover:text-red-500 transition-all">
                    <XCircle size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Message */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a message about the delivery..."
          className="w-full rounded-2xl p-4 text-sm outline-none resize-none mb-4"
          style={{ border: '1px solid #ececec', color: '#17191c', minHeight: '80px' }}
        />

        {uploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: '#777b86' }}>
              <span>{uploadProgress < 80 ? 'Reading files...' : uploadProgress < 100 ? 'Uploading...' : 'Complete!'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#f2f2f3' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: '#5d2a1a' }}
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm"
            style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || uploading}
          className="w-full py-3.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: files.length > 0 && !uploading ? '#17191c' : '#f2f2f3',
            color: files.length > 0 && !uploading ? '#ffffff' : '#979799',
          }}
        >
          {uploading ? <><Loader2 size={18} className="animate-spin" /> {uploadProgress}%</> : <Send size={18} />}
          {uploading ? 'Uploading...' : `Deliver ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ====== FILE VIEWER MODAL ======
function JobFileViewerModal({ delivery, onClose }) {
  if (!delivery) return null;
  let files = [];
  try { files = JSON.parse(delivery.files || '[]'); } catch { files = []; }

  const renderPreview = (file) => {
    if (!file.data && !file.url) {
      return <File size={48} style={{ color: '#979799' }} />;
    }
    const src = file.data || file.url;
    if (file.type?.startsWith('image/')) {
      return <img src={src} alt={file.name} className="w-full h-48 object-contain rounded-xl" />;
    }
    if (file.type?.startsWith('video/')) {
      return <video src={src} controls className="w-full rounded-xl max-h-48" />;
    }
    if (file.type?.startsWith('audio/')) {
      return <audio src={src} controls className="w-full" />;
    }
    return <File size={48} style={{ color: '#979799' }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl p-6"
        style={{ backgroundColor: '#ffffff' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: '#17191c' }}>Delivered Files</h3>
          <button onClick={onClose} style={{ color: '#777b86' }} className="p-1 rounded-lg hover:bg-gray-50">
            <XCircle size={20} />
          </button>
        </div>

        {delivery.message && (
          <div className="mb-4 p-4 rounded-2xl" style={{ backgroundColor: '#fafafb' }}>
            <p style={{ color: '#17191c', fontSize: '14px' }}>{delivery.message}</p>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type);
            return (
              <div key={i} className="p-4 rounded-2xl" style={{ backgroundColor: '#f2f2f3' }}>
                <div className="flex items-start gap-3 mb-3">
                  <Icon size={20} style={{ color: '#5d2a1a' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#17191c' }}>{file.name}</p>
                    <p style={{ color: '#979799', fontSize: '12px' }}>{formatFileSize(file.size)}</p>
                  </div>
                  {(file.data || file.url) && (
                    <a href={file.data || file.url}
                      download={file.name}
                      className="p-2 rounded-xl transition-all"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <Download size={16} style={{ color: '#17191c' }} />
                    </a>
                  )}
                </div>
                {renderPreview(file)}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [bids, setBids] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [existingReviews, setExistingReviews] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  // Delivery modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [viewingDelivery, setViewingDelivery] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await jobsAPI.get(id);
        setJob(res.data.job);
        setBids(res.data.bids || []);
        setTransactions(res.data.transactions || []);
        setDeliveries(res.data.deliveries || []);
        setExistingReviews(res.data.reviews || []);
      } catch {
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  // Check if user has already reviewed this job
  useEffect(() => {
    if (user && job?.status === 'completed') {
      reviewsAPI.getUserReviews(user.id)
        .then(res => {
          const reviews = res.data.reviews || [];
          const reviewed = reviews.filter(r => r.job_id === id).map(r => r.job_id);
          setMyReviews(reviewed);
        })
        .catch(() => {});
    }
  }, [user, job?.status, id]);

  const handleBid = async (e) => {
    e.preventDefault();
    setBidLoading(true);
    try {
      await jobsAPI.bid(id, { amount: bidAmount, proposal: bidProposal });
      const res = await jobsAPI.get(id);
      setBids(res.data.bids || []);
      setBidAmount('');
      setBidProposal('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  const handleAward = (freelancerId, amount) => {
    navigate(`/confirm-purchase/${id}?freelancerId=${freelancerId}&amount=${amount}`);
  };

  const handleComplete = async () => {
    try {
      await paymentsAPI.release({ jobId: id });
      await jobsAPI.updateStatus(id, { status: 'completed' });
      const res = await jobsAPI.get(id);
      setJob(res.data.job);
      setShowReview(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete job');
    }
  };

  const handleDeliverClick = () => {
    setShowDeliveryModal(true);
  };

  const handleDelivered = () => {
    jobsAPI.get(id).then(res => {
      setJob(res.data.job);
      setDeliveries(res.data.deliveries || []);
    });
  };

  const handleViewFiles = (delivery) => {
    setViewingDelivery(delivery);
    setShowFileViewer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#777b86' }} />
      </div>
    );
  }

  if (!job) return null;

  const isClient = user?.id === job.client_id;
  const isFreelancer = user?.id === job.awarded_to;
  const canBid = user?.role === 'freelancer' && job.status === 'open';
  const canReview = job?.status === 'completed' && !myReviews.includes(job?.id);
  const paymentIsConfirmed = paymentConfirmed || (transactions[0]?.status === 'confirmed');

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/my-jobs" className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 mb-6">
        ← {t('common.back')}
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-green text-xs">{job.category}</span>
                  <OrderStatusChip status={job.status} size="sm" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gebeya-600">ETB {job.budget_min?.toLocaleString()} - {job.budget_max?.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400">
              <span>👤 {job.client_name}</span>
              {job.deadline && <span>📅 Due: {new Date(job.deadline).toLocaleDateString()}</span>}
              <span>📊 {bids.length} bid(s)</span>
            </div>
          </div>

          {/* ===== DELIVERIES SECTION ===== */}
          {deliveries.length > 0 && (
            <div className="rounded-3xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: '#17191c' }}>
                <Package size={16} /> Deliveries
              </h3>
              <div className="space-y-3">
                {deliveries.map((del, i) => {
                  let delFiles = [];
                  try { delFiles = JSON.parse(del.files || '[]'); } catch {}
                  return (
                    <div key={del.id} className="p-4 rounded-2xl" style={{ backgroundColor: '#f2f2f3' }}>
                      {del.message && <p className="text-sm mb-2" style={{ color: '#17191c' }}>{del.message}</p>}
                      <div className="flex flex-wrap gap-2">
                        {delFiles.slice(0, 5).map((f, fi) => {
                          const FIcon = getFileIcon(f.type);
                          return (
                            <div key={fi} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs"
                              style={{ backgroundColor: '#ffffff' }}>
                              <FIcon size={12} style={{ color: '#5d2a1a' }} />
                              <span className="truncate max-w-[120px]" style={{ color: '#777b86' }}>{f.name}</span>
                              {(f.data || f.url) && (
                                <a href={f.data || f.url}
                                  download={f.name}
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 rounded-lg hover:bg-gray-100 transition-all shrink-0"
                                  style={{ color: '#5d2a1a' }}
                                  title="Download">
                                  <Download size={10} />
                                </a>
                              )}
                            </div>
                          );
                        })}
                        {delFiles.length > 5 && (
                          <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: '#979799' }}>
                            +{delFiles.length - 5} more
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleViewFiles(del)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium transition-all"
                        style={{ color: '#5d2a1a' }}>
                        <Eye size={12} /> View All Files
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bid Form */}
          {canBid && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Place a Bid</h3>
              <form onSubmit={handleBid} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Your Bid (ETB)</label>
                    <input type="number" required min={1} value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                      className="input-field" placeholder="Amount" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Proposal</label>
                  <textarea rows={3} value={bidProposal} onChange={e => setBidProposal(e.target.value)}
                    className="input-field" placeholder="Why should they hire you?" />
                </div>
                <button type="submit" disabled={bidLoading} className="btn-primary">
                  {bidLoading ? t('common.loading') : 'Submit Bid'}
                </button>
              </form>
            </div>
          )}

          {/* Bids */}
          {bids.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t('job.bids')} ({bids.length})</h3>
              <div className="space-y-3">
                {bids.map(bid => (
                  <div key={bid.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gebeya-100 rounded-full flex items-center justify-center text-gebeya-700 font-semibold overflow-hidden shrink-0">
                        {bid.freelancer_picture ? (
                          <img src={bid.freelancer_picture} alt="" className="w-full h-full object-cover" />
                        ) : bid.freelancer_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{bid.freelancer_name}</span>
                          {bid.freelancer_verified && <span className="badge-green text-[10px]">✓</span>}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          ★ {bid.freelancer_rating?.toFixed(1) || '0.0'}
                        </div>
                        {bid.proposal && <p className="text-sm text-gray-600 mt-1">{bid.proposal}</p>}
                        <span className={`text-xs mt-1 inline-block ${
                          bid.status === 'accepted' ? 'text-green-600' :
                          bid.status === 'rejected' ? 'text-red-500' : 'text-yellow-600'
                        }`}>{bid.status}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gebeya-600">ETB {bid.amount?.toLocaleString()}</p>
                      {isClient && job.status === 'open' && bid.status === 'pending' && (
                        <button onClick={() => handleAward(bid.freelancer_id, bid.amount)} className="bg-gebeya-600 hover:bg-gebeya-700 text-white text-xs font-semibold mt-2 py-2 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5">
                          🛒 Proceed to Checkout — ETB {bid.amount?.toLocaleString()}
                        </button>
                      )}
                      {user?.id === bid.freelancer_id && job.status === 'open' && bid.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 mt-2 py-2 px-4 rounded-xl bg-gebeya-50 text-gebeya-700 text-xs font-semibold border border-gebeya-200">
                          ✓ Bid Submitted — Awaiting Client
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Client</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gebeya-100 rounded-full flex items-center justify-center text-gebeya-700 font-bold text-lg overflow-hidden">
                {job.client_picture ? (
                  <img src={job.client_picture} alt="" className="w-full h-full object-cover" />
                ) : job.client_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{job.client_name}</p>
                {job.client_city && <p className="text-xs text-gray-400">📍 {job.client_city}</p>}
              </div>
            </div>
          </div>

          {/* Review Section */}
          {job.status === 'completed' && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-yellow-500">★</span> Reviews
              </h3>
              {existingReviews.length > 0 && (
                <div className="space-y-2 mb-3">
                  {existingReviews.slice(0, 2).map(rev => (
                    <div key={rev.id} className="p-3 rounded-xl bg-clay-50">
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        {[1,2,3,4,5].map(s => <span key={s}>{s <= rev.rating ? '★' : '☆'}</span>)}
                      </div>
                      {rev.comment && <p className="text-xs text-ice-600 mt-1">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(canReview || (job.awarded_to === user?.id || job.client_id === user?.id)) && (
                <button
                  onClick={() => setShowReview(true)}
                  className="btn-secondary w-full text-xs py-2"
                >
                  {canReview ? 'Leave a Review ★' : 'View All Reviews'}
                </button>
              )}
            </div>
          )}

          {/* ===== CLIENT VIEW: Order Received ===== */}
          {isClient && job.status === 'in_progress' && transactions.length > 0 && (
            <div className="card p-5 border-2 border-gebeya-200 bg-gradient-to-br from-gebeya-50/50 to-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Order Received</h3>
                  <p className="text-[10px] text-gray-500">A freelancer placed a quick order on your job</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gebeya-100 rounded-full flex items-center justify-center text-gebeya-700 font-bold overflow-hidden shrink-0">
                    {transactions[0].freelancer_picture ? (
                      <img src={transactions[0].freelancer_picture} alt="" className="w-full h-full object-cover" />
                    ) : transactions[0].freelancer_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{transactions[0].freelancer_name || 'A freelancer'}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-gray-500 text-xs">{transactions[0].freelancer_rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gebeya-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Order Amount</span>
                  <span className="font-bold text-lg text-gebeya-600">
                    ETB {(transactions[0].amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                  <span>Status</span>
                  <span className="capitalize">{transactions[0].status === 'escrow' ? 'Awaiting Payment' : transactions[0].status}</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/confirm-purchase/${id}?freelancerId=${job.awarded_to}&amount=${transactions[0].amount}&freelancerName=${encodeURIComponent(transactions[0].freelancer_name || '')}&freelancerRating=${transactions[0].freelancer_rating || ''}&fromQuickOrder=true`)}
                className="w-full py-3 bg-gradient-to-r from-gebeya-600 to-gebeya-700 hover:from-gebeya-700 hover:to-gebeya-800 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                🛒 Proceed to Checkout — ETB {(transactions[0].amount || 0).toLocaleString()}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                🔒 Payment held in escrow until work is approved
              </p>
            </div>
          )}

          {/* ===== CLIENT VIEW: Work Delivered — Approve ===== */}
          {isClient && job.status === 'delivered' && (
            <div className="card p-5 border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Package size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Work Delivered!</h3>
                  <p className="text-[10px] text-gray-500">The freelancer has submitted their work</p>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 mb-3">
                {deliveries.length > 0 && (
                  <button onClick={() => handleViewFiles(deliveries[0])}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-white transition-all"
                    style={{ color: '#5d2a1a' }}>
                    <Eye size={14} /> View Delivered Files
                  </button>
                )}
              </div>
              <button onClick={handleComplete}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle size={16} /> Approve & Complete
              </button>
            </div>
          )}

          {/* ===== CLIENT VIEW: Actions (no quick order) ===== */}
          {isClient && job.status === 'in_progress' && transactions.length === 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Actions</h3>
              <button onClick={() => paymentsAPI.initiate({ jobId: id }).then(() => alert('Payment initiated!'))} className="btn-primary w-full text-sm">
                {t('payment.initiate')}
              </button>
              <button onClick={handleComplete} className="btn-primary w-full text-sm bg-blue-600 hover:bg-blue-700">
                {t('job.complete')}
              </button>
              <button onClick={() => paymentsAPI.dispute({ jobId: id, reason: prompt('Reason for dispute:') }).then(r => alert(r.data.message))} 
                className="btn-danger w-full text-sm">
                {t('payment.dispute')}
              </button>
            </div>
          )}

          {/* ===== FREELANCER VIEW: Biometric Confirmation ===== */}
          {isFreelancer && job.status === 'in_progress' && transactions.length > 0 && (
            <div className="card p-5 border-2 border-gebeya-200 bg-gradient-to-br from-gebeya-50/50 to-white">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentIsConfirmed ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {paymentIsConfirmed ? (
                    <span className="text-lg">✓</span>
                  ) : (
                    <span className="text-lg">🔐</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {paymentIsConfirmed ? 'Payment Confirmed ✓' : 'Payment Received?'}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    {paymentIsConfirmed
                      ? 'Biometric verification completed'
                      : 'Confirm receipt with biometric verification'}
                  </p>
                </div>
              </div>

              <div className="bg-gebeya-50 rounded-xl p-3 mb-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Amount in Escrow</span>
                  <span className="font-bold text-lg text-gebeya-600">
                    ETB {(transactions[0].amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {paymentIsConfirmed ? (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-xl p-3 mb-3">
                  <CheckCircle size={14} />
                  <span>Payment confirmed. You can now deliver your work.</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveTransaction(transactions[0]);
                    setShowPaymentConfirm(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-gebeya-600 to-gebeya-700 hover:from-gebeya-700 hover:to-gebeya-800 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <span>🔐</span>
                  Confirm Payment — Biometric — ETB {(transactions[0].amount || 0).toLocaleString()}
                </button>
              )}
            </div>
          )}

          {/* ===== FREELANCER VIEW: Deliver Finished Work ===== */}
          {isFreelancer && job.status === 'in_progress' && (
            <div className="card p-5">
              {paymentIsConfirmed ? (
                <button onClick={handleDeliverClick}
                  className="w-full py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                  <Upload size={16} /> Deliver Finished Work
                </button>
              ) : (
                <div className="p-3 rounded-xl flex items-start gap-2 text-xs"
                  style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Please confirm the payment first via biometric verification to deliver your work.</span>
                </div>
              )}
            </div>
          )}

          {/* Delete Job */}
          {isClient && (job.status === 'open' || job.status === 'cancelled') && (
            <div className="card p-5">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                🗑️ {job.status === 'open' ? 'Cancel & Delete Job' : 'Remove Job'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await jobsAPI.delete(id);
            navigate('/my-jobs');
          } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete job');
          } finally {
            setDeleting(false);
          }
        }}
        title="Delete Job"
        message="Are you sure you want to cancel this job? It will no longer be visible to freelancers."
        itemName={job?.title}
        loading={deleting}
      />

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        transaction={activeTransaction}
        onConfirmed={() => {
          setShowPaymentConfirm(false);
          setPaymentConfirmed(true);
          jobsAPI.get(id).then(res => {
            setJob(res.data.job);
            setTransactions(res.data.transactions || []);
          });
        }}
      />

      {/* Delivery Upload Modal */}
      <JobDeliveryUploadModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        jobId={id}
        onDelivered={handleDelivered}
      />

      {/* File Viewer Modal */}
      <AnimatePresence>
        {showFileViewer && (
          <JobFileViewerModal
            delivery={viewingDelivery}
            onClose={() => { setShowFileViewer(false); setViewingDelivery(null); }}
          />
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        jobId={id}
        revieweeId={isClient ? job.awarded_to : job.client_id}
        revieweeName={isClient ? job.awarded_name : job.client_name}
        role={user?.role}
        onSubmitted={() => {
          setMyReviews(prev => [...prev, id]);
          setShowReview(false);
        }}
      />
    </div>
  );
}
