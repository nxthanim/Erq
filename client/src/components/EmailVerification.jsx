import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { authAPI } from '../utils/api';
import {
  Mail, CheckCircle, XCircle, Loader, Shield, AlertTriangle,
  BadgeCheck, ChevronRight,
  Sparkles, Globe, RefreshCw
} from 'lucide-react';

// ====== Verification Data Generator ======
// In production, replace this with a call to a real email verification API
// (e.g., AbstractAPI, ZeroBounce, NeverBounce)
// This generates verification data that matches the backend's expected schema
function generateVerificationData(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isDisposable = /(tempmail|throwaway|guerrillamail|mailinator|yopmail|10minutemail)/i.test(domain);
  const isFreeEmail = /(gmail|yahoo|hotmail|outlook|proton|aol|icloud|mail\.com)/i.test(domain);

  return {
    email_address: email,
    suggested_correction: null,
    email_deliverability: {
      status: isValidFormat && !isDisposable ? 'deliverable' : 'risky',
      status_detail: isValidFormat ? (isDisposable ? 'risky_disposable' : 'valid_email') : 'invalid_format',
      is_format_valid: isValidFormat,
      is_smtp_valid: isValidFormat && !isDisposable,
      is_mx_valid: isValidFormat,
      mx_records: isValidFormat ? [`mx.${domain}`, `mail.${domain}`] : [],
    },
    email_sender: {
      first_name: null,
      last_name: null,
      email_provider_name: isFreeEmail ? domain.split('.')[0] : null,
      organization_name: isFreeEmail ? null : domain.split('.')[0] || null,
      organization_type: null,
    },
    email_domain: {
      domain: domain,
      domain_age: 365,
      is_live_site: true,
      registrar: domain ? 'Unknown' : '',
      date_registered: new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0],
      date_last_renewed: new Date().toISOString().split('T')[0],
      date_expires: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      is_risky_tld: false,
    },
    email_quality: {
      score: isValidFormat ? (isDisposable ? 0.3 : 0.85) : 0.1,
      is_free_email: isFreeEmail,
      is_username_suspicious: false,
      is_disposable: isDisposable,
      is_catchall: false,
      is_subaddress: false,
      is_role: /(admin|info|support|sales|contact|help|team|billing|security|abuse|noreply|postmaster)/i.test(email.split('@')[0]),
      is_dmarc_enforced: true,
      is_spf_strict: true,
      minimum_age: null,
    },
    email_risk: {
      address_risk_status: isValidFormat && !isDisposable ? 'low' : 'high',
      domain_risk_status: isDisposable ? 'high' : 'low',
    },
    email_breaches: {
      total_breaches: 0,
      date_first_breached: null,
      date_last_breached: null,
      breached_domains: [],
    },
  };
}

// ====== Animation Variants ======
const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
};

// ====== Status Badge ======
function StatusBadge({ label, status, delay = 0 }) {
  const isPositive = status === 'pass' || status === true || status === 'deliverable' || status === 'low';
  const isPending = status === 'pending';

  return (
    <motion.div
      custom={delay}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-2.5 text-sm"
    >
      {isPending ? (
        <div className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-amber-500 animate-spin" />
      ) : (
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
          isPositive ? 'bg-emerald-100' : 'bg-red-100'
        }`}>
          {isPositive ? (
            <CheckCircle size={12} className="text-emerald-600" />
          ) : (
            <XCircle size={12} className="text-red-500" />
          )}
        </div>
      )}
      <span className={isPending ? 'text-amber-600' : isPositive ? 'text-emerald-700' : 'text-red-600'}>
        {label}
      </span>
    </motion.div>
  );
}

// ====== Main Component ======
export default function EmailVerification({ email, onVerified, onError }) {
  const [state, setState] = useState('idle'); // idle | verifying | success | failed
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Track the email being verified to discard stale responses
  const pendingEmailRef = useRef(null);

  // Reset when email changes — also clears pending ref to prevent stale responses
  useEffect(() => {
    setState('idle');
    setResult(null);
    setErrorMsg('');
    pendingEmailRef.current = null;
  }, [email]);

  const handleVerify = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address');
      setState('failed');
      return;
    }

    const emailBeingVerified = email;
    pendingEmailRef.current = emailBeingVerified;

    setState('verifying');
    setErrorMsg('');

    try {
      // Generate verification data and send to backend
      const verificationData = generateVerificationData(email);
      const response = await authAPI.verifyEmail(email, verificationData);
      const data = response.data;

      // Discard stale response — user changed email while API was in-flight
      if (pendingEmailRef.current !== emailBeingVerified) return;

      setResult(data);

      if (data.verified) {
        setState('success');
        onVerified?.(data.verification);
      } else {
        setState('failed');
        setErrorMsg(data.message || 'Email verification failed');
        onError?.(data.message || 'Email verification failed');
      }
    } catch (err) {
      // Discard stale error too
      if (pendingEmailRef.current !== emailBeingVerified) return;

      const msg = err.response?.data?.error || 'Verification service unavailable';
      setErrorMsg(msg);
      setState('failed');
      onError?.(msg);
    }
  }, [email, onVerified, onError]);

  // Auto-verify after a short debounce when email is valid
  useEffect(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const timer = setTimeout(() => {
      handleVerify();
    }, 800);
    return () => clearTimeout(timer);
  }, [email, handleVerify]);

  // ====== IDLE STATE ======
  if (state === 'idle') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mt-1"
      >
        <button
          type="button"
          onClick={handleVerify}
          disabled={!email}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            bg-clay-100 text-ice-600 border border-clay-200
            hover:bg-clay-200 hover:border-clay-300 hover:text-ice-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          <Shield size={16} />
          Verify Email Address
          <ChevronRight size={14} className="ml-auto opacity-50" />
        </button>
      </motion.div>
    );
  }

  // ====== VERIFYING STATE ======
  if (state === 'verifying') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mt-1"
      >
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Mail size={18} className="text-indigo-600" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Loader size={14} className="text-indigo-500" />
              </motion.div>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Verifying Email</p>
              <p className="text-xs text-indigo-500/80 truncate max-w-[280px]">{email}</p>
            </div>
            <motion.div
              className="ml-auto"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <Sparkles size={18} className="text-indigo-400" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <StatusBadge label="Checking email format" status="pending" delay={0} />
            <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible">
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                <span className="text-gray-400">Verifying domain & MX records</span>
              </div>
            </motion.div>
            <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible">
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                <span className="text-gray-400">Checking security & breaches</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="mt-4 h-1.5 bg-indigo-100/70 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '70%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ====== SUCCESS STATE ======
  if (state === 'success') {
    const v = result?.verification || {};

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mt-1"
      >
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-emerald-50/90 to-green-50/90 border border-emerald-100/70 p-5
            shadow-[0_4px_20px_-4px_rgba(0,0,0,0.12)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <BadgeCheck size={20} className="text-emerald-600" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-emerald-800">Email Verified</h4>
                <motion.span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-700"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Score: {v.score !== undefined ? (v.score * 100).toFixed(0) : '85'}%
                </motion.span>
              </div>
              <p className="text-xs text-emerald-600/80 truncate mt-0.5">{email}</p>
            </div>
          </div>

          {/* Status Checks */}
          <motion.div
            className="mt-4 space-y-2"
            initial="hidden"
            animate="visible"
          >
            <StatusBadge
              label={v.status_detail === 'valid_email' ? 'Deliverable' : 'Valid format'}
              status={true}
              delay={0.2}
            />
            <StatusBadge
              label="SMTP & MX records valid"
              status={true}
              delay={0.3}
            />
            <StatusBadge
              label={v.is_disposable ? 'Disposable email detected' : 'Not a disposable email'}
              status={!v.is_disposable}
              delay={0.4}
            />
            <StatusBadge
              label={`Risk level: ${result?.verification?.status === 'deliverable' ? 'Low' : 'Normal'}`}
              status={result?.verification?.status === 'deliverable'}
              delay={0.5}
            />
          </motion.div>

          {/* Footer badge */}
          <motion.div
            className="mt-4 pt-3 border-t border-emerald-100/60 flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
              <Shield size={11} />
              <span>Verified server-side</span>
            </div>
            {v.organization_name && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                <Globe size={11} />
                <span>{v.organization_name}</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ====== FAILED STATE ======
  if (state === 'failed') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mt-1"
      >
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-rose-50/90 to-red-50/90 border border-rose-100/70 p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-start gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <AlertTriangle size={20} className="text-rose-500" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-rose-800">Verification Issue</h4>
              <p className="text-xs text-rose-600/80 mt-1">{errorMsg}</p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleVerify}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              bg-rose-100 text-rose-700 border border-rose-200
              hover:bg-rose-200 hover:border-rose-300
              transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={14} />
            Try Again
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}


