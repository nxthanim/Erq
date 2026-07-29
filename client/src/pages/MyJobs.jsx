import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Eye, Download, File, Image, Film, Music, FileText, Archive, XCircle, Package, Clock, User, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../utils/api';
import OrderStatusChip from '../components/ui/OrderStatusChip';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { PageTransition } from '../components/ScrollReveal';

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

const statusConfig = {
  open: { label: 'Open', color: '#5d2a1a', bg: 'rgba(251,225,209,0.3)', icon: Clock },
  in_progress: { label: 'In Progress', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: Clock },
  delivered: { label: 'Delivered', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: Package },
  completed: { label: 'Completed', color: '#5d2a1a', bg: 'rgba(93,42,26,0.08)', icon: Package },
  cancelled: { label: 'Cancelled', color: '#777b86', bg: '#f2f2f3', icon: AlertTriangle },
};
// statusConfig kept for backward compat - use OrderStatusChip for new code

// ====== FILE VIEWER MODAL ======
function JobFileViewerModal({ delivery, onClose }) {
  if (!delivery) return null;
  let files = [];
  try { files = JSON.parse(delivery.files || '[]'); } catch { files = []; }

  const renderPreview = (file) => {
    if (!file.data && !file.url) return <File size={48} style={{ color: '#979799' }} />;
    const src = file.data || file.url;
    if (file.type?.startsWith('image/')) return <img src={src} alt={file.name} className="w-full h-48 object-contain rounded-xl" />;
    if (file.type?.startsWith('video/')) return <video src={src} controls className="w-full rounded-xl max-h-48" />;
    if (file.type?.startsWith('audio/')) return <audio src={src} controls className="w-full" />;
    return <File size={48} style={{ color: '#979799' }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl p-6" style={{ backgroundColor: '#ffffff' }}
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
                    <a href={file.data || file.url} download={file.name}
                      className="p-2 rounded-xl transition-all" style={{ backgroundColor: '#ffffff' }}>
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

export default function MyJobs() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingDelivery, setViewingDelivery] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);

  const loadJobs = useCallback(() => {
    setLoading(true);
    jobsAPI.list({ clientId: user?.id })
      .then(res => setJobs(res.data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await jobsAPI.delete(deleteTarget.id);
      setJobs(prev => prev.filter(j => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete job:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewFiles = async (job) => {
    // Fetch full delivery data from job detail
    try {
      const res = await jobsAPI.get(job.id);
      const deliveries = res.data.deliveries || [];
      if (deliveries.length > 0) {
        setViewingDelivery(deliveries[0]);
        setShowFileViewer(true);
      }
    } catch (err) {
      console.error('Failed to fetch delivery details:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#17191c]/20 border-t-[#17191c]"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-2"
              style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#17191c' }}>
              My Jobs
            </h1>
            <p style={{ color: '#777b86', fontSize: '17px' }}>Manage your job postings</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadJobs}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full text-sm font-medium transition-all hover:opacity-70"
              style={{ border: '1px solid #ececec', color: '#777b86' }}
              title="Refresh jobs">
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link to="/post-job"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              Post a Job
            </Link>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-3xl p-16 text-center" style={{ backgroundColor: '#fafafb' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
              <Package size={32} style={{ color: '#979799' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#17191c' }}>No jobs yet</h3>
            <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-6">
              Post your first job and start receiving bids from freelancers.
            </p>
            <Link to="/post-job"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold transition-all"
              style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
              Post a Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => {
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-5 transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}
                >
                  <Link to={`/jobs/${job.id}`} className="block">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {job.category && (
                            <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
                              {job.category}
                            </span>
                          )}
                          <OrderStatusChip status={job.status} size="sm" />
                          <span style={{ color: '#979799', fontSize: '11px' }}>{job.bid_count} bids</span>
                        </div>
                        <h3 className="font-semibold" style={{ color: '#17191c' }}>{job.title}</h3>
                        <p className="text-sm mt-1 line-clamp-1" style={{ color: '#777b86' }}>{job.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#777b86' }}>
                          <span className="flex items-center gap-1"><Clock size={12} /> Posted {new Date(job.created_at).toLocaleDateString()}</span>
                          {job.deadline && (
                            <span className="flex items-center gap-1">📅 Due {new Date(job.deadline).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-lg font-bold" style={{ color: '#5d2a1a' }}>
                          ETB {job.budget_min?.toLocaleString()} - {job.budget_max?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid #f2f2f3' }}>
                    <Link to={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all"
                      style={{ border: '1px solid #ececec', color: '#777b86' }}>
                      View Details
                    </Link>

                    {/* View Delivered Files button */}
                    {job.status === 'delivered' && job.has_delivery && (
                      <button onClick={(e) => { e.preventDefault(); handleViewFiles(job); }}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'rgba(93,42,26,0.08)', color: '#5d2a1a' }}>
                        <Eye size={12} /> View Delivered Files ({job.delivery_file_count || 0})
                      </button>
                    )}

                    {job.status === 'delivered' && (
                      <Link to={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-semibold transition-all"
                        style={{ backgroundColor: '#17191c', color: '#ffffff' }}>
                        Approve & Complete
                      </Link>
                    )}

                    {(job.status === 'open' || job.status === 'cancelled') && (
                      <button onClick={() => setDeleteTarget(job)}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all"
                        style={{ border: '1px solid #ececec', color: '#777b86' }}>
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Job"
        message="Are you sure you want to cancel this job? It will be closed and no longer visible to freelancers."
        itemName={deleteTarget?.title}
        loading={deleting}
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
    </PageTransition>
  );
}
