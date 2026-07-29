import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ordersAPI } from '../utils/api';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import ReviewModal from '../components/ReviewModal';
import CollabHub from '../components/CollabHub';
import { PageTransition } from '../components/ScrollReveal';
import {
  Package, CheckCircle, RefreshCw, XCircle, Scale,
  Clock, User, Loader2, ArrowLeft, FileText,
  Upload, Download, AlertTriangle,
  Lock, Send, Eye, ShoppingCart, Star,
  Image, Film, Music, File, Archive
} from 'lucide-react';
import OrderStatusChip from '../components/ui/OrderStatusChip';

const statusConfig = {
  pending: { label: 'Pending', color: '#777b86', bg: '#f2f2f3', icon: Clock },
  pending_payment: { label: 'Pending Payment', color: '#b45309', bg: 'rgba(251,225,209,0.3)', icon: ShoppingCart },
  accepted: { label: 'Accepted', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: RefreshCw },
  delivered: { label: 'Delivered', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: Package },
  completed: { label: 'Completed', color: '#5d2a1a', bg: 'rgba(251,225,209,0.3)', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#777b86', bg: '#f2f2f3', icon: XCircle },
  disputed: { label: 'Disputed', color: '#777b86', bg: '#f2f2f3', icon: Scale },
};

const statusIconMap = {
  pending: Clock,
  pending_payment: ShoppingCart,
  accepted: CheckCircle,
  in_progress: RefreshCw,
  delivered: Package,
  completed: CheckCircle,
  cancelled: XCircle,
  disputed: Scale,
};

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

const ALLOWED_TYPES = '*/*';

// ====== DELIVERY UPLOAD MODAL ======
function DeliveryUploadModal({ isOpen, onClose, orderId, onDelivered }) {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const maxSize = 100 * 1024 * 1024; // 100MB per file
    const valid = selected.filter(f => f.size <= maxSize);
    const oversized = selected.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      setError(`${oversized.length} file(s) exceed 100MB limit`);
    }
    setFiles(prev => [...prev, ...valid].slice(0, 10)); // max 10 files
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
      // Convert files to base64 for delivery with progress tracking
      const total = files.length;
      const fileData = await Promise.all(files.map((file, idx) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadProgress(Math.round(((idx + 1) / total) * 70)); // 0-70% for reading
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
      setUploadProgress(80); // Uploading to server

      await ordersAPI.deliver(orderId, {
        message: message || 'Delivered files',
        files: fileData,
      });
      setUploadProgress(100);

      // Brief pause so user sees 100% before closing
      await new Promise(r => setTimeout(r, 400));
      onDelivered();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deliver files');
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
          <h3 className="text-lg font-semibold" style={{ color: '#17191c' }}>Deliver Project Files</h3>
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
          <p className="font-medium mb-1" style={{ color: '#17191c' }}>Click to upload files</p>
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
function FileViewerModal({ delivery, onClose }) {
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

// ====== ORDER CARD ======
function OrderCard({ order, user, onAction, onViewFiles, onReview, reviewedOrders }) {
  const isClient = user?.id === order.client_id;
  const otherName = isClient ? order.freelancer_name : order.client_name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-5 transition-all"
      style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-2">
            <OrderStatusChip status={order.status} size="sm" />
            {order.gig_category && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
                {order.gig_category}
              </span>
            )}
          </div>

          {/* Title */}
          <Link to={`/orders/${order.id}`}
            className="font-semibold text-base transition-colors"
            style={{ color: '#17191c' }}>
            {order.title || 'Order'}
          </Link>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#777b86' }}>
            <span className="flex items-center gap-1">
              <User size={12} /> {otherName}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}
            </span>
            {order.gig_delivery_time && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {order.gig_delivery_time} day delivery
              </span>
            )}
          </div>

          {/* Show delivered files if present */}
          {order.delivery && (
            <button onClick={() => onViewFiles(order.delivery)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition-all px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
              <Eye size={12} /> View Delivered Files
            </button>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0 ml-4">
          <p className="text-lg font-bold" style={{ color: '#5d2a1a' }}>
            ETB {Number(order.price).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid #f2f2f3' }}>
        {/* Client: waiting for accept */}
        {isClient && order.status === 'pending' && (
          <span className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5" style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
            <Clock size={12} /> Waiting for freelancer to accept...
          </span>
        )}

        {/* Client: approve delivery */}
        {isClient && order.status === 'delivered' && (
          <>
            <button onClick={() => onAction(order.id, 'complete')}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              <CheckCircle size={14} /> Approve & Complete
            </button>
            <button onClick={() => onAction(order.id, 'dispute')}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all"
              style={{ border: '1px solid #777b86', color: '#777b86' }}>
              <Scale size={14} /> Dispute
            </button>
          </>
        )}

        {/* Freelancer: accept order */}
        {!isClient && order.status === 'pending' && (
          <button onClick={() => onAction(order.id, 'accept')}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
            style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
            <CheckCircle size={14} /> Accept Project
          </button>
        )}

        {/* Freelancer: deliver files */}
        {!isClient && order.status === 'accepted' && (
          <>
            {(!order.transaction || order.transaction.txn_status === 'confirmed' || order.transaction?.txn_status === 'released') && (
              <button onClick={() => onAction(order.id, 'deliver')}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
                style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                <Upload size={14} /> Deliver Finished Work
              </button>
            )}
            {order.transaction && order.transaction.txn_status === 'escrow' && (
              <span className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5"
                style={{ color: '#5d2a1a', backgroundColor: 'rgba(251,225,209,0.3)' }}>
                <Lock size={12} /> Payment in Escrow — Awaiting Confirmation
              </span>
            )}
          </>
        )}

        {/* Cancel (pending only) */}
        {order.status === 'pending' && (
          <button onClick={() => onAction(order.id, 'cancel')}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all"
            style={{ border: '1px solid #ececec', color: '#777b86' }}>
            <XCircle size={14} /> Cancel
          </button>
        )}

        {/* Dispute */}
        {(order.status === 'accepted' || order.status === 'delivered') && (
          <button onClick={() => onAction(order.id, 'dispute')}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all"
            style={{ border: '1px solid #ececec', color: '#777b86' }}>
            <Scale size={14} /> Dispute
          </button>
        )}

        {/* Status badges */}
        {order.status === 'completed' && (
          <>
            <span className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5 font-medium"
              style={{ color: '#5d2a1a', backgroundColor: 'rgba(251,225,209,0.3)' }}>
              <CheckCircle size={12} /> Payment Released
            </span>
            {!reviewedOrders.includes(order.id) && (
              <button onClick={() => onReview(order)}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
                style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                <Star size={12} /> Leave a Review
              </button>
            )}
            {reviewedOrders.includes(order.id) && (
              <span className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5"
                style={{ color: '#5d2a1a', backgroundColor: 'rgba(93,42,26,0.08)' }}>
                <Star size={12} /> Reviewed
              </span>
            )}
          </>
        )}
        {order.status === 'cancelled' && (
          <span className="text-xs py-1.5 px-3 rounded-full" style={{ color: '#777b86' }}>
            Cancelled
          </span>
        )}
        {order.status === 'disputed' && (
          <span className="text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5"
            style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
            <Scale size={12} /> Under Review
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ====== MAIN PAGE ======
export default function MyOrders() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [singleOrder, setSingleOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [activeOrderForConfirm, setActiveOrderForConfirm] = useState(null);
  const [paymentConfirmedOrders, setPaymentConfirmedOrders] = useState([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveringOrderId, setDeliveringOrderId] = useState(null);
  const [viewingDelivery, setViewingDelivery] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  // Review modal state
  const [reviewModal, setReviewModal] = useState({ open: false, jobId: '', revieweeId: '', revieweeName: '', role: '' });
  const [reviewedOrders, setReviewedOrders] = useState([]);
  const [fetchError, setFetchError] = useState('');

  const loadOrders = useCallback(async () => {
    setFetchError('');
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      setOrders(res.data.orders || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load orders';
      setFetchError(msg);
      console.error('Order list fetch error:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSingleOrder = useCallback(async () => {
    setFetchError('');
    setLoading(true);
    try {
      const res = await ordersAPI.get(id);
      setSingleOrder(res.data.order);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load order';
      setFetchError(msg);
      console.error('Single order fetch error:', msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Ref to prevent stacking fetches during auto-poll
  const loadingRef = useRef(false);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (id) {
      loadSingleOrder();
    } else {
      loadOrders();
    }
  }, [id, loadOrders, loadSingleOrder]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (loadingRef.current) return;
      if (id) {
        const controller = new AbortController();
        ordersAPI.get(id).then(res => {
          setSingleOrder(res.data.order);
        }).catch(() => {});
      } else {
        ordersAPI.list().then(res => {
          setOrders(res.data.orders || []);
        }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (orderId, action) => {
    try {
      if (action === 'accept') {
        await ordersAPI.accept(orderId);
      } else if (action === 'deliver') {
        setDeliveringOrderId(orderId);
        setShowDeliveryModal(true);
        return;
      } else if (action === 'complete') {
        await ordersAPI.complete(orderId);
        const completedOrder = orders.find(o => o.id === orderId);
        if (completedOrder) {
          setReviewModal({
            open: true,
            jobId: completedOrder.id,
            revieweeId: completedOrder.freelancer_id,
            revieweeName: completedOrder.freelancer_name,
            role: 'client',
          });
        }
      } else if (action === 'cancel') {
        if (!confirm('Cancel this order?')) return;
        await ordersAPI.cancel(orderId);
      } else if (action === 'dispute') {
        if (!confirm('Raise a dispute? An admin will review.')) return;
        await ordersAPI.dispute(orderId);
      }
      if (id) {
        await loadSingleOrder();
      } else {
        loadOrders();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const handleDelivered = () => {
    loadOrders();
  };

  const handleViewFiles = (delivery) => {
    setViewingDelivery(delivery);
    setShowFileViewer(true);
  };

  const handleReviewComplete = (orderId) => {
    setReviewedOrders(prev => [...prev, orderId]);
  };

  const openReviewForOrder = (order, isClient) => {
    setReviewModal({
      open: true,
      jobId: order.id,
      revieweeId: isClient ? order.freelancer_id : order.client_id,
      revieweeName: isClient ? order.freelancer_name : order.client_name,
      role: isClient ? 'client' : 'freelancer',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#777b86' }} />
      </div>
    );
  }

  // ====== SINGLE ORDER VIEW ======
  if (id && singleOrder) {
    const isClient = user?.id === singleOrder.client_id;
    const otherName = isClient ? singleOrder.freelancer_name : singleOrder.client_name;
    const otherPicture = isClient ? singleOrder.freelancer_picture : singleOrder.client_picture;

    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto">
          <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-all"
            style={{ color: '#777b86' }}>
            <ArrowLeft size={16} /> Back to Orders
          </Link>

          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-5">
              <div className="rounded-3xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <OrderStatusChip status={singleOrder.status} size="sm" />
                      {singleOrder.gig_category && (
                        <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
                          {singleOrder.gig_category}
                        </span>
                      )}
                    </div>
                    <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-2"
                      style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c' }}>
                      {singleOrder.title}
                    </h1>
                    {singleOrder.description && (
                      <p style={{ color: '#777b86', fontSize: '15px', lineHeight: 1.5 }}>{singleOrder.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-2xl font-bold" style={{ color: '#5d2a1a' }}>
                      ETB {Number(singleOrder.price).toLocaleString()}
                    </p>
                    {singleOrder.gig_delivery_time && (
                      <p className="text-xs mt-1 flex items-center gap-1 justify-end" style={{ color: '#777b86' }}>
                        <Clock size={12} /> {singleOrder.gig_delivery_time} day delivery
                      </p>
                    )}
                  </div>
                </div>

                {singleOrder.requirements && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f2f2f3' }}>
                    <h3 className="font-semibold mb-2 text-sm" style={{ color: '#17191c' }}>
                      <FileText size={14} className="inline mr-1.5" /> Requirements
                    </h3>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#777b86' }}>{singleOrder.requirements}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 text-sm" style={{ borderTop: '1px solid #f2f2f3', color: '#777b86' }}>
                  <span className="flex items-center gap-1"><User size={14} /> {otherName}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {new Date(singleOrder.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="rounded-3xl p-6 space-y-3" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                <h3 className="font-semibold text-sm" style={{ color: '#17191c' }}>Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {isClient && singleOrder.status === 'pending' && (
                    <span className="text-sm py-2 px-4 rounded-full flex items-center gap-1.5" style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
                      <Clock size={14} /> Waiting for freelancer to accept...
                    </span>
                  )}
                  {isClient && singleOrder.status === 'delivered' && (
                    <button onClick={() => handleAction(singleOrder.id, 'complete')}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                      <CheckCircle size={16} /> Approve & Complete
                    </button>
                  )}
                  {!isClient && singleOrder.status === 'pending' && (
                    <button onClick={() => handleAction(singleOrder.id, 'accept')}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                      <CheckCircle size={16} /> Accept Project
                    </button>
                  )}
                  {!isClient && singleOrder.status === 'accepted' && (singleOrder.transaction?.txn_status === 'confirmed' || singleOrder.transaction?.txn_status === 'released' || paymentConfirmedOrders.includes(singleOrder.id)) && (
                    <button onClick={() => handleAction(singleOrder.id, 'deliver')}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                      <Upload size={16} /> Deliver Finished Work
                    </button>
                  )}
                  {singleOrder.status === 'pending' && (
                    <button onClick={() => handleAction(singleOrder.id, 'cancel')}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-medium transition-all"
                      style={{ border: '1px solid #ececec', color: '#777b86' }}>
                      <XCircle size={16} /> Cancel
                    </button>
                  )}
                  {(singleOrder.status === 'accepted' || singleOrder.status === 'delivered') && (
                    <button onClick={() => handleAction(singleOrder.id, 'dispute')}
                      className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-medium transition-all"
                      style={{ border: '1px solid #ececec', color: '#777b86' }}>
                      <Scale size={16} /> Dispute
                    </button>
                  )}
                  {singleOrder.status === 'completed' && (
                    <div className="p-4 rounded-2xl w-full" style={{ backgroundColor: 'rgba(251,225,209,0.3)' }}>
                      <p className="font-semibold flex items-center justify-center gap-2 mb-3" style={{ color: '#5d2a1a' }}>
                        <CheckCircle size={18} />
                        Payment of ETB {Number(singleOrder.price).toLocaleString()} released!
                      </p>
                      {!reviewedOrders.includes(singleOrder.id) && (
                        <button onClick={() => openReviewForOrder(singleOrder, isClient)}
                          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-semibold transition-all"
                          style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                          <Star size={16} /> Leave a Review
                        </button>
                      )}
                      {reviewedOrders.includes(singleOrder.id) && (
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#5d2a1a' }}>
                          <Star size={14} /> You reviewed this order
                        </span>
                      )}
                    </div>
                  )}
                  {singleOrder.status === 'disputed' && (
                    <div className="p-4 rounded-2xl w-full text-center" style={{ backgroundColor: '#f2f2f3' }}>
                      <p className="font-semibold flex items-center justify-center gap-2" style={{ color: '#777b86' }}>
                        <Scale size={18} /> Under dispute review
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Deliveries section */}
              {singleOrder.deliveries && singleOrder.deliveries.length > 0 && (
                <div className="rounded-3xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: '#17191c' }}>
                    <Package size={16} /> Deliveries
                  </h3>
                  <div className="space-y-3">
                    {singleOrder.deliveries.map((del, i) => {
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
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <CollabHub order={singleOrder} user={user} partnerName={otherName} />

              <div className="rounded-3xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: '#17191c' }}>{isClient ? 'Freelancer' : 'Client'}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0"
                    style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
                    {otherPicture ? <img src={otherPicture} alt="" className="w-full h-full object-cover" /> : otherName?.charAt(0)}
                  </div>
                  <p className="font-medium" style={{ color: '#17191c' }}>{otherName}</p>
                </div>
              </div>

              {/* Payment Status */}
              {!isClient && singleOrder.status === 'accepted' && singleOrder.transaction && (
                <div className="rounded-3xl p-5" style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #f2f2f3',
                }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: (paymentConfirmedOrders.includes(singleOrder.id) || singleOrder.transaction?.txn_status === 'confirmed') ? 'rgba(93,42,26,0.08)' : 'rgba(251,225,209,0.3)' }}>
                      {paymentConfirmedOrders.includes(singleOrder.id) || singleOrder.transaction?.txn_status === 'confirmed' ? (
                        <CheckCircle size={18} style={{ color: '#5d2a1a' }} />
                      ) : (
                        <Lock size={18} style={{ color: '#5d2a1a' }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: '#17191c' }}>
                        {paymentConfirmedOrders.includes(singleOrder.id) || singleOrder.transaction?.txn_status === 'confirmed' ? 'Payment Confirmed' : 'Payment in Escrow'}
                      </h3>
                      <p style={{ color: '#777b86', fontSize: '11px' }}>
                        {paymentConfirmedOrders.includes(singleOrder.id) || singleOrder.transaction?.txn_status === 'confirmed'
                          ? 'Ready to deliver'
                          : 'Awaiting biometric confirmation'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: '#f2f2f3' }}>
                    <div className="flex justify-between items-center text-sm">
                      <span style={{ color: '#777b86' }}>Amount in Escrow</span>
                      <span className="font-bold text-lg" style={{ color: '#5d2a1a' }}>
                        ETB {(singleOrder.transaction.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {(paymentConfirmedOrders.includes(singleOrder.id) || singleOrder.transaction?.txn_status === 'confirmed') ? (
                    <div className="flex items-center gap-2 text-xs p-3 rounded-xl"
                      style={{ color: '#5d2a1a', backgroundColor: 'rgba(251,225,209,0.3)' }}>
                      <CheckCircle size={14} />
                      <span>Payment confirmed. You can now deliver your work.</span>
                    </div>
                  ) : singleOrder.transaction?.txn_status === 'escrow' && (
                    <button
                      onClick={() => {
                        setActiveTransaction(singleOrder.transaction);
                        setActiveOrderForConfirm(singleOrder);
                        setShowPaymentConfirm(true);
                      }}
                      className="w-full py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#17191c', color: '#ffffff' }}
                    >
                      <Lock size={16} />
                      Confirm Payment — Biometric — ETB {(singleOrder.transaction.amount || 0).toLocaleString()}
                    </button>
                  )}
                </div>
              )}

              <div className="rounded-3xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: '#17191c' }}>Order Info</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Status', value: singleOrder.status.replace('_', ' ') },
                    { label: 'Price', value: `ETB ${Number(singleOrder.price).toLocaleString()}`, bold: true },
                    { label: 'Delivery', value: `${singleOrder.gig_delivery_time || 'N/A'} days` },
                    { label: 'Ordered', value: new Date(singleOrder.created_at).toLocaleDateString() },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span style={{ color: '#777b86' }}>{item.label}</span>
                      <span className={item.bold ? 'font-semibold' : ''} style={{ color: '#17191c' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          <PaymentConfirmationModal
            isOpen={showPaymentConfirm}
            onClose={() => {
              setShowPaymentConfirm(false);
              setActiveTransaction(null);
              setActiveOrderForConfirm(null);
            }}
            transaction={activeTransaction}
            onConfirmed={() => {
              setShowPaymentConfirm(false);
              if (activeOrderForConfirm) {
                setPaymentConfirmedOrders(prev => [...prev, activeOrderForConfirm.id]);
                ordersAPI.get(id).then(res => setSingleOrder(res.data.order));
              }
              setActiveTransaction(null);
              setActiveOrderForConfirm(null);
            }}
          />

          <DeliveryUploadModal
            isOpen={showDeliveryModal}
            onClose={() => {
              setShowDeliveryModal(false);
              setDeliveringOrderId(null);
            }}
            orderId={id}
            onDelivered={() => {
              handleDelivered();
              ordersAPI.get(id).then(res => setSingleOrder(res.data.order));
            }}
          />

          {/* Review Modal */}
          <ReviewModal
            open={reviewModal.open}
            onClose={() => setReviewModal(prev => ({ ...prev, open: false }))}
            jobId={id}
            revieweeId={reviewModal.revieweeId}
            revieweeName={reviewModal.revieweeName}
            role={reviewModal.role}
            onSubmitted={() => handleReviewComplete(id)}
          />

          <AnimatePresence>
            {showFileViewer && (
              <FileViewerModal
                delivery={viewingDelivery}
                onClose={() => { setShowFileViewer(false); setViewingDelivery(null); }}
              />
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    );
  }

  // ====== LIST VIEW ======
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-2"
              style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c' }}>
              My Orders
            </h1>
            <p style={{ color: '#777b86', fontSize: '17px' }}>
              {user?.role === 'freelancer' ? 'Manage your sales and deliveries' : 'Track your purchases'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadOrders}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full text-sm font-medium transition-all hover:opacity-70"
              style={{ border: '1px solid #ececec', color: '#777b86' }}
              title="Refresh orders">
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link to="/marketplace"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              <ShoppingCart size={16} /> Browse Gigs
            </Link>
          </div>
        </div>

        {fetchError ? (
          <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#fafafb', border: '1px solid #fbe1d1' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#fbe1d1' }}>
              <AlertTriangle size={32} style={{ color: '#5d2a1a' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#17191c' }}>Could not load orders</h3>
            <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-6 max-w-md mx-auto">{fetchError}</p>
            <button onClick={loadOrders}
              className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl p-16 text-center" style={{ backgroundColor: '#fafafb' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
              <Package size={32} style={{ color: '#979799' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#17191c' }}>No orders yet</h3>
            <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-6">
              {user?.role === 'freelancer'
                ? 'When clients order your gigs, they will appear here.'
                : 'Browse gigs and place your first order!'}
            </p>
            <Link to="/marketplace"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              <ShoppingCart size={16} /> Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                user={user}
                onAction={handleAction}
                onViewFiles={handleViewFiles}
                onReview={(order) => openReviewForOrder(order, user?.id === order.client_id)}
                reviewedOrders={reviewedOrders}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delivery Upload Modal (list view) */}
      <DeliveryUploadModal
        isOpen={showDeliveryModal}
        onClose={() => {
          setShowDeliveryModal(false);
          setDeliveringOrderId(null);
        }}
        orderId={deliveringOrderId}
        onDelivered={handleDelivered}
      />

      {/* File Viewer Modal */}
      <AnimatePresence>
        {showFileViewer && (
          <FileViewerModal
            delivery={viewingDelivery}
            onClose={() => { setShowFileViewer(false); setViewingDelivery(null); }}
          />
        )}
      </AnimatePresence>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentConfirm}
        onClose={() => {
          setShowPaymentConfirm(false);
          setActiveTransaction(null);
          setActiveOrderForConfirm(null);
        }}
        transaction={activeTransaction}
        onConfirmed={() => {
          setShowPaymentConfirm(false);
          if (activeOrderForConfirm) {
            setPaymentConfirmedOrders(prev => [...prev, activeOrderForConfirm.id]);
            ordersAPI.list().then(res => setOrders(res.data.orders || []));
          }
          setActiveTransaction(null);
          setActiveOrderForConfirm(null);
        }}
      />

      {/* Review Modal */}
      <ReviewModal
        open={reviewModal.open}
        onClose={() => setReviewModal(prev => ({ ...prev, open: false }))}
        jobId={reviewModal.jobId || ''}
        revieweeId={reviewModal.revieweeId}
        revieweeName={reviewModal.revieweeName}
        role={reviewModal.role}
        onSubmitted={() => {
          if (reviewModal.jobId) {
            handleReviewComplete(reviewModal.jobId);
          }
        }}
      />
    </PageTransition>
  );
}
