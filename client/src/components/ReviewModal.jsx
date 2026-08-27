import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { reviewsAPI } from '../utils/api';
import { Star, X, Send, ThumbsUp, MessageCircle } from 'lucide-react';

// ====== Animated Rating Counter (same cubic ease-out as CountUp in BusinessDashboard) ======
function RatingCountUp({ value }) {
  const [display, setDisplay] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (!value) { setDisplay(0); return; }
    const target = Number(value);
    const startTime = Date.now();
    const duration = 0.8;
    const animate = () => {
      if (!mountedRef.current) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { mountedRef.current = false; };
  }, [value]);
  return display;
}

export default function ReviewModal({ open, onClose, jobId, revieweeId, revieweeName, role, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await reviewsAPI.create({
        jobId,
        revieweeId,
        rating,
        comment: comment.trim() || undefined,
        role
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setComment('');
      setSubmitted(false);
      setError('');
      onClose();
    }
  };

    const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const colors = ['#777b86', '#979799', '#1f6f5c', '#1f6f5c', '#173a32'];
  const starFillColors = ['#777b86', '#979799', '#1f6f5c', '#1f6f5c', '#173a32'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(23,25,28,0.3)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md rounded-3xl p-8 overflow-hidden"
            style={{ backgroundColor: '#ffffff' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ color: '#777b86' }}>
              <X size={18} />
            </button>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: '#173a32' }}
                >
                  <ThumbsUp size={28} style={{ color: '#ffffff' }} />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>Review Submitted!</h3>
                <p style={{ color: '#777b86', fontSize: '15px' }}>Thank you for your feedback</p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: '#e7f5ef' }}>
                    <MessageCircle size={24} style={{ color: '#1f6f5c' }} />
                  </div>
                  <h3 className="text-xl font-semibold"
                    style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>Rate Your Experience</h3>
                  <p style={{ color: '#777b86', fontSize: '15px' }} className="mt-1">
                    How was working with <strong style={{ color: '#1f6f5c' }}>{revieweeName || 'this user'}</strong>?
                  </p>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                    style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Star Rating */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110 active:scale-90"
                        >
                          <Star
                            size={32}
                            className="transition-all duration-150"
                            style={{
                              color: (hoverRating || rating) >= star
                                ? starFillColors[star - 1]
                                : '#ececec',
                              fill: (hoverRating || rating) >= star
                                ? starFillColors[star - 1]
                                : 'transparent',
                            }}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-medium" style={{ color: rating > 0 ? starFillColors[rating - 1] : '#979799' }}>
                      {rating > 0 ? labels[rating - 1] : 'Click a star to rate'}
                    </p>
                    {rating > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="flex items-center justify-center gap-1 mt-1.5"
                      >
                        <span className="text-3xl font-bold" style={{ color: starFillColors[rating - 1] }}>
                          <RatingCountUp value={rating} />
                        </span>
                        <span className="text-lg" style={{ color: '#979799' }}>/ 5</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#777b86' }}>
                      Comment <span style={{ color: '#979799', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Share your experience..."
                      rows={3}
                      className="w-full px-4 py-3 outline-none transition-all resize-none text-sm"
                      style={{
                        border: '1px solid #ececec',
                        borderRadius: '16px',
                        color: '#173a32',
                        backgroundColor: '#ffffff',
                      }}
                      onFocus={e => e.target.style.borderColor = '#173a32'}
                      onBlur={e => e.target.style.borderColor = '#ececec'}
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={rating === 0 || submitting}
                    className="w-full py-3.5 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: rating > 0 && !submitting ? '#173a32' : '#f2f2f3',
                      color: rating > 0 && !submitting ? '#ffffff' : '#979799',
                    }}
                    whileHover={rating > 0 ? { scale: 1.01 } : {}}
                    whileTap={rating > 0 ? { scale: 0.98 } : {}}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send size={16} />
                        Submit Review
                      </span>
                    )}
                  </motion.button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
