import { motion } from 'motion/react';

/**
 * A badge/tooltip that marks features as "Coming Soon"
 */
export function ComingSoonBadge({ className = '' }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      Coming Soon
    </motion.span>
  );
}

/**
 * A full "Coming Soon" panel/banner for feature sections
 */
export function ComingSoonBanner({ title = 'Feature Coming Soon', description = 'We\'re working on this feature and it will be available soon. Stay tuned!' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center"
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-400 rounded-full blur-3xl" />
      </div>
      <motion.div
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl mb-4"
      >
        🚧
      </motion.div>
      <h3 className="text-lg font-bold text-amber-800 mb-2">{title}</h3>
      <p className="text-sm text-amber-600/80 max-w-md mx-auto">{description}</p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-[10px] text-amber-500 font-medium uppercase tracking-widest">In Development</span>
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
      </div>
    </motion.div>
  );
}

/**
 * A disabled button wrapper that shows "Coming Soon" on hover
 */
export function ComingSoonButton({ children, className = '' }) {
  return (
    <div className="relative group inline-block">
      <button
        disabled
        className={`opacity-60 cursor-not-allowed ${className}`}
      >
        {children}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-amber-500 text-white text-[9px] font-bold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50"
      >
        🔧 Coming Soon
      </motion.div>
    </div>
  );
}
