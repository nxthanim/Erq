import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI, walletAPI, ordersAPI, gigsAPI } from '../utils/api';
import SendMoneyForm from '../components/SendMoneyForm';
import ChapaInlineCheckout from '../components/ChapaInlineCheckout';
import { PageTransition } from '../components/ScrollReveal';
import {
  Wallet as WalletIcon, Lock, Eye, EyeOff, DollarSign,
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, AlertTriangle,
  Shield, ExternalLink, Copy,
  History, TrendingUp, CreditCard,
  ShieldCheck, AlertOctagon,
  LogIn, UserPlus,
  ShoppingCart, Loader2, ChevronLeft, RefreshCw,
  Download, FileText, Key, X, Send, Package
} from 'lucide-react';

// ====== PER-USER SECURE STORAGE HELPERS ======
function getPinKey(userId) { return `erq_wallet_pin_${userId}`; }
function getSessionKey(userId) { return `erq_wallet_session_${userId}`; }
function getLockoutKey(userId) { return `erq_wallet_lockout_${userId}`; }

// Legacy hash for backward compatibility
function hashPinLegacy(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h' + Math.abs(hash).toString(36);
}

// SHA-256 via Web Crypto API
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return 'sha256_' + hashHex;
}

async function verifyPin(pin, storedHash) {
  if (!storedHash) return { match: false };
  if (storedHash.startsWith('sha256_')) {
    const hashed = await hashPin(pin);
    return storedHash === hashed ? { match: true } : { match: false };
  }
  if (storedHash.startsWith('h')) {
    if (storedHash === hashPinLegacy(pin)) {
      const newHash = await hashPin(pin);
      return { match: true, needsUpgrade: true, newHash };
    }
    return { match: false };
  }
  return { match: false };
}

function isWalletSessionValid(userId) {
  if (!userId) return false;
  try {
    const session = JSON.parse(localStorage.getItem(getSessionKey(userId)) || '{}');
    return session.valid && Date.now() - session.time < 300000;
  } catch { return false; }
}

function setWalletSession(userId) {
  if (!userId) return;
  localStorage.setItem(getSessionKey(userId), JSON.stringify({ valid: true, time: Date.now() }));
}

function clearWalletSession(userId) {
  if (!userId) return;
  localStorage.removeItem(getSessionKey(userId));
}

function isLockedOut(userId) {
  try {
    const lockout = JSON.parse(localStorage.getItem(getLockoutKey(userId)) || '{}');
    if (lockout.until && Date.now() < lockout.until) {
      const remaining = Math.ceil((lockout.until - Date.now()) / 1000);
      return { locked: true, remaining };
    }
    return { locked: false };
  } catch { return { locked: false }; }
}

function setLockout(userId, attempts) {
  if (attempts >= 5) {
    localStorage.setItem(getLockoutKey(userId), JSON.stringify({
      attempts, until: Date.now() + 300000, started: Date.now()
    }));
    return true;
  }
  return false;
}

function clearLockout(userId) { localStorage.removeItem(getLockoutKey(userId)); }

const PIN_WINDOW_MINUTES = 15;

// ====== STATUS CONFIG ======
const statusConfig = {
  escrow: { label: 'In Escrow', color: '#b45309', bg: 'rgba(251,225,209,0.3)', icon: Lock },
  confirmed: { label: 'Confirmed', color: '#1f6f5c', bg: 'rgba(93,42,26,0.08)', icon: CheckCircle },
  released: { label: 'Released', color: '#1f6f5c', bg: 'rgba(93,42,26,0.08)', icon: CheckCircle },
  refunded: { label: 'Refunded', color: '#777b86', bg: '#f2f2f3', icon: AlertTriangle },
  disputed: { label: 'Disputed', color: '#777b86', bg: '#f2f2f3', icon: AlertTriangle },
};

// ====== LOGIN GATE ======
function LoginGate() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center"
          style={{ backgroundColor: '#e7f5ef' }}>
          <WalletIcon size={48} style={{ color: '#1f6f5c' }} />
        </div>
        <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-3"
          style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>Your Wallet</h1>
        <p style={{ color: '#777b86', fontSize: '17px', lineHeight: 1.35 }} className="mb-8 max-w-sm mx-auto">
          Securely manage your earnings, payments, and transactions. Sign in to access your personal wallet.
        </p>
        <div className="space-y-3 max-w-xs mx-auto">
          <Link to="/login"
            className="w-full py-3.5 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
            <LogIn size={18} /> Sign In to Your Wallet
          </Link>
          <Link to="/signup"
            className="w-full py-3.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{ border: '1px solid #173a32', color: '#173a32', backgroundColor: 'transparent' }}>
            <UserPlus size={18} /> Create an Account
          </Link>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs" style={{ color: '#979799' }}>
          <span className="flex items-center gap-1"><Lock size={12} /> Encrypted</span>
          <span className="flex items-center gap-1"><Shield size={12} /> Secure</span>
          <span className="flex items-center gap-1"><ShieldCheck size={12} /> Protected</span>
        </div>
      </div>
    </motion.div>
  );
}

// ====== PIN ENTRY ======
function PinEntry({ userId, onCorrect, onBack, mode }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutInfo, setLockoutInfo] = useState({ locked: false, remaining: 0 });
  const inputRef = useRef(null);
  const verifying = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    const lock = isLockedOut(userId);
    setLockoutInfo(lock);
    walletAPI.getPinStatus().then(status => {
      if (status.blocked) {
        const remaining = Math.ceil((new Date(status.blockedUntil).getTime() - Date.now()) / 1000);
        setLockoutInfo({ locked: true, remaining: Math.max(0, remaining) });
        setError(`Wallet PIN locked on server. Try again in ${Math.ceil(remaining / 60)} minute(s).`);
      }
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!lockoutInfo.locked) return;
    const interval = setInterval(() => {
      const lock = isLockedOut(userId);
      setLockoutInfo(lock);
      if (!lock.locked) { setAttempts(0); setError(''); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutInfo.locked, userId]);

  const handleDigit = async (d) => {
    if (pin.length >= 4 || lockoutInfo.locked || verifying.current) return;
    setError('');
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      verifying.current = true;
      if (mode === 'setup') {
        const hashed = await hashPin(newPin);
        localStorage.setItem(getPinKey(userId), hashed);
        clearLockout(userId);
        setAttempts(0);
        setWalletSession(userId);
        verifying.current = false;
        onCorrect();
      } else {
        const stored = localStorage.getItem(getPinKey(userId));
        const result = await verifyPin(newPin, stored);
        if (result.match) {
          if (result.needsUpgrade && result.newHash) localStorage.setItem(getPinKey(userId), result.newHash);
          clearLockout(userId); setAttempts(0);
          setWalletSession(userId);
          walletAPI.recordPinAttempt('success').catch(() => {});
          verifying.current = false;
          onCorrect();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts); setPin('');
          verifying.current = false;
          walletAPI.recordPinAttempt('failed').then(serverRes => {
            if (serverRes.data?.blocked && serverRes.data?.blockedUntil) {
              const remaining = Math.ceil((new Date(serverRes.data.blockedUntil).getTime() - Date.now()) / 1000);
              setLockoutInfo({ locked: true, remaining: Math.max(0, remaining) });
              setError(`Too many failed attempts. Wallet locked for ${PIN_WINDOW_MINUTES} minutes.`);
            }
          }).catch(() => {});
          if (setLockout(userId, newAttempts)) {
            const lock = isLockedOut(userId);
            setLockoutInfo(lock);
            setError('Too many failed attempts. Wallet locked for 5 minutes.');
          } else {
            const remaining = 5 - newAttempts;
            setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
          }
        }
      }
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#e7f5ef' }}>
        <Lock size={36} style={{ color: '#1f6f5c' }} />
      </div>
      <h2 className="text-2xl font-semibold mb-2" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
        {mode === 'setup' ? 'Set Up Wallet PIN' : 'Enter Wallet PIN'}
      </h2>
      <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-8">
        {mode === 'setup' ? 'Create a 4-digit PIN to secure your wallet' : 'Enter your PIN to access your wallet'}
      </p>
      {onBack && (
        <button onClick={onBack} className="text-sm mb-6 flex items-center justify-center gap-1 mx-auto" style={{ color: '#777b86' }}>
          <ChevronLeft size={14} /> Try a different PIN
        </button>
      )}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${pin.length > i ? 'scale-110' : ''}`}
            style={{ backgroundColor: pin.length > i ? '#1f6f5c' : '#ececec' }} />
        ))}
      </div>
      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <p className="text-sm mb-3 flex items-center justify-center gap-1" style={{ color: '#777b86' }}>
            <AlertOctagon size={14} /> {error}
          </p>
          {error.includes('locked') && (
            <button onClick={() => {
              localStorage.removeItem(getPinKey(userId));
              clearLockout(userId);
              window.location.reload();
            }} className="text-xs py-2 px-3 rounded-xl transition-all"
              style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
              <Key size={12} className="inline mr-1" /> Reset Wallet PIN
            </button>
          )}
        </motion.div>
      )}
      <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button key={d} onClick={() => handleDigit(d.toString())}
            className="w-16 h-16 rounded-2xl text-xl font-bold active:scale-95 transition-all flex items-center justify-center"
            style={{ backgroundColor: '#f2f2f3', color: '#173a32', border: '1px solid #ececec' }}>{d}</button>
        ))}
        <div />
        <button onClick={() => handleDigit('0')}
          className="w-16 h-16 rounded-2xl text-xl font-bold active:scale-95 transition-all flex items-center justify-center"
          style={{ backgroundColor: '#f2f2f3', color: '#173a32', border: '1px solid #ececec' }}>0</button>
        <button onClick={handleDelete}
          className="w-16 h-16 rounded-2xl text-sm active:scale-95 transition-all flex items-center justify-center"
          style={{ backgroundColor: '#f2f2f3', color: '#979799', border: '1px solid #ececec' }}>
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}

// ====== CHAPA PAYMENT FORM (Steep styling) ======
function ChapaPaymentForm({ user }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txRef, setTxRef] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [step, setStep] = useState('form');
  const [testOrderLoading, setTestOrderLoading] = useState(false);
  const [testOrderSuccess, setTestOrderSuccess] = useState(null);
  const [testOrderError, setTestOrderError] = useState('');

  const handleInitiatePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError('Please enter a valid amount'); return; }
    setLoading(true); setError('');
    try {
      const res = await paymentsAPI.initiateChapa({
        amount: parseFloat(amount), currency: 'ETB',
        email: user?.email || 'customer@gebeya.et',
        first_name: user?.full_name?.split(' ')[0] || 'Customer',
        last_name: user?.full_name?.split(' ').slice(1).join(' ') || 'User',
        description: description || 'Wallet top-up via Erq Marketplace',
      });
      setTxRef(res.data.tx_ref);
      setPublicKey(res.data.public_key || '');
      setStep('checkout');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment.');
    } finally { setLoading(false); }
  };

  const handlePaymentSuccess = async () => {
    setStep('verifying');
    try {
      const res = await paymentsAPI.verifyChapa(txRef);
      if (res.data?.verified) { setStep('done'); }
      else { setError('Payment not yet confirmed.'); setStep('checkout'); }
    } catch { setError('Could not verify payment.'); setStep('checkout'); }
  };

  if (step === 'done') {
    return (
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(93,42,26,0.08)' }}>
          <CheckCircle size={42} style={{ color: '#1f6f5c' }} />
        </div>
        <h2 className="text-2xl font-semibold mb-2" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>Payment Verified</h2>
        <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-4 max-w-sm mx-auto">
          Your wallet top-up of <strong>ETB {amount}</strong> has been confirmed.
        </p>
        <div className="p-4 rounded-2xl max-w-sm mx-auto mb-4 text-left" style={{ backgroundColor: '#f2f2f3' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: '#1f6f5c' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f6f5c' }}>Transaction Ref</span>
          </div>
          <p className="text-sm font-mono" style={{ color: '#173a32' }}>{txRef}</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="py-3 px-8 rounded-full font-bold text-sm transition-all"
          style={{ backgroundColor: '#173a32', color: '#ffffff' }}>Done</button>
      </div>
    );
  }

  if (step === 'verifying') {
    return (
      <div className="text-center py-10">
        <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: '#1f6f5c' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#173a32' }}>Verifying Payment...</h3>
        <p style={{ color: '#777b86', fontSize: '15px' }}>Confirming your transaction with Chapa's secure API.</p>
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div>
        <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(251,225,209,0.3)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f6f5c' }}>
              <Lock size={18} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h4 className="font-semibold text-sm" style={{ color: '#173a32' }}>Complete Your Payment</h4>
              <p className="text-xs mt-0.5" style={{ color: '#777b86' }}>
                Pay <strong style={{ color: '#1f6f5c' }}>ETB {parseFloat(amount).toLocaleString()}</strong> using the widget below.
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
            <AlertOctagon size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}
        <ChapaInlineCheckout
          publicKey={publicKey}
          txRef={txRef} amount={amount} currency="ETB"
          onSuccess={handlePaymentSuccess}
          onFailure={(err) => { setError(err?.message || 'Payment was not completed.'); setStep('form'); }}
          onClose={() => { setError('Checkout was closed.'); setStep('form'); }}
        />
        <button onClick={() => { setStep('form'); setError(''); }}
          className="mt-3 text-xs block mx-auto transition-all" style={{ color: '#979799' }}>
          Cancel and start over
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(251,225,209,0.3)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f6f5c' }}>
            <CreditCard size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h4 className="font-semibold text-sm" style={{ color: '#173a32' }}>Chapa Secure Checkout</h4>
            <p className="text-xs mt-0.5" style={{ color: '#777b86' }}>
              Pay with <strong>Telebirr</strong>, <strong>CBE Birr</strong>, or other methods. No redirect needed.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
          <AlertOctagon size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#173a32' }}>Amount (ETB)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: '#777b86' }}>ETB</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" min="1"
              className="w-full pl-14 pr-4 py-3 text-lg font-bold outline-none transition-all"
              style={{ border: '1px solid #ececec', borderRadius: '16px', color: '#173a32' }}
              onFocus={e => e.target.style.borderColor = '#173a32'}
              onBlur={e => e.target.style.borderColor = '#ececec'} />
          </div>
        </div>
        <button onClick={handleInitiatePayment}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full py-3.5 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: loading || !amount || parseFloat(amount) <= 0 ? '#f2f2f3' : '#173a32', color: loading || !amount || parseFloat(amount) <= 0 ? '#979799' : '#ffffff' }}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Initiating...</>
            : <><ShoppingCart size={18} /> Pay ETB {amount || '0'} with Chapa</>}
        </button>
      </div>
    </div>
  );
}

// ====== MAIN WALLET PAGE ======
export default function Wallet() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinMode, setPinMode] = useState('unlock');
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [walletOverview, setWalletOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    if (!user) { setAuthenticated(false); setLoading(false); return; }
    const hasPin = localStorage.getItem(getPinKey(user.id));
    const sessionValid = isWalletSessionValid(user.id);
    if (sessionValid) setAuthenticated(true);
    else if (hasPin && !authenticated) { setPinMode('unlock'); setShowPinSetup(false); }
    else if (!hasPin && !authenticated) { setPinMode('setup'); setShowPinSetup(true); }
  }, [user, authenticated]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const txRef = searchParams.get('tx_ref');
    if (paymentStatus === 'success' && txRef && authenticated && user) {
      setVerificationStatus('verifying');
      paymentsAPI.verifyChapa(txRef)
        .then(res => {
          if (res.data.verified) {
            setVerificationStatus('success');
            setLastReceipt({
              tx_ref: txRef, amount: res.data.amount || '—',
              currency: res.data.currency || 'ETB',
              chapaId: res.data.chapa_transaction_id || '—',
              timestamp: new Date().toISOString(),
            });
            Promise.all([paymentsAPI.getTransactions(), walletAPI.getOverview()])
              .then(([txnRes, overviewRes]) => {
                setTransactions(txnRes.data.transactions || []);
                setWalletOverview(overviewRes.data);
              }).catch(() => {});
            setActiveTab('transactions');
          } else setVerificationStatus('failed');
        }).catch(() => setVerificationStatus('failed'))
        .finally(() => setSearchParams({}, { replace: true }));
    } else if (paymentStatus === 'failed' && txRef) {
      setVerificationStatus('failed');
      setTimeout(() => setSearchParams({}, { replace: true }), 5000);
    }
  }, [authenticated, user, searchParams, setSearchParams]);

  useEffect(() => {
    if (!authenticated || !user) return;
    Promise.all([paymentsAPI.getTransactions(), walletAPI.getOverview()])
      .then(([txnRes, overviewRes]) => {
        setTransactions(txnRes.data.transactions || []);
        setWalletOverview(overviewRes.data);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [authenticated, user]);

  const calculateStats = useCallback(() => {
    const stats = { balance: 0, earned: 0, spent: 0, escrow: 0, pending: 0, transactionCount: transactions.length };
    transactions.forEach(t => {
      if (t.freelancer_id === user?.id && t.status === 'released') { stats.earned += t.amount; stats.balance += t.amount; }
      if (t.client_id === user?.id && t.status === 'released') stats.spent += t.amount;
      if (t.status === 'escrow') { stats.escrow += t.amount; if (t.freelancer_id === user?.id || t.client_id === user?.id) stats.pending += t.amount; }
    });
    return stats;
  }, [transactions, user]);

  const stats = calculateStats();
  const handleCopy = () => {
    navigator.clipboard.writeText(user?.id?.slice(0, 12) || 'ERQ-WALLET');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return <LoginGate />;

  if (!authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <PinEntry userId={user.id} mode={pinMode}
            onCorrect={() => { setAuthenticated(true); setShowPinSetup(false); }} onBack={null} />
        </div>
      </div>
    );
  }

  const recentTxns = transactions.slice(0, 5);
  const isIncoming = (txn) => txn.freelancer_id === user?.id;

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-2"
              style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>
              <WalletIcon size={28} className="inline mr-3" style={{ color: '#1f6f5c' }} />Wallet
            </h1>
            <p style={{ color: '#777b86', fontSize: '17px' }}>Manage your earnings, payments, and banking</p>
          </div>
          <button onClick={() => { clearWalletSession(user?.id); setAuthenticated(false); }}
            className="px-3 py-2 rounded-full text-xs transition-all flex items-center gap-1"
            style={{ border: '1px solid #ececec', color: '#777b86' }}>
            <Lock size={12} /> Lock Wallet
          </button>
        </div>

        {/* Status Banners */}
        <AnimatePresence>
          {verificationStatus === 'success' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm"
              style={{ backgroundColor: 'rgba(93,42,26,0.08)' }}>
              <CheckCircle size={18} style={{ color: '#1f6f5c' }} className="shrink-0" />
              <span style={{ color: '#1f6f5c' }}>
                <strong>Payment Verified!</strong> Your Chapa payment has been confirmed.
              </span>
            </motion.div>
          )}
          {verificationStatus === 'failed' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm" style={{ backgroundColor: '#f2f2f3' }}>
              <AlertOctagon size={18} style={{ color: '#777b86' }} className="shrink-0" />
              <span style={{ color: '#777b86' }}>
                <strong>Payment verification pending.</strong> Your payment may still be processing.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Receipt */}
        <AnimatePresence>
          {lastReceipt && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mb-6 p-5 rounded-3xl" style={{ backgroundColor: '#f2f2f3' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1f6f5c' }}>
                    <CheckCircle size={24} style={{ color: '#ffffff' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: '#173a32' }}>Payment Successful</h3>
                    <p style={{ color: '#777b86', fontSize: '15px' }}>Your wallet has been topped up</p>
                  </div>
                </div>
                <button onClick={() => { setLastReceipt(null); setVerificationStatus(null); }}
                  className="p-1 rounded-lg transition-all" style={{ color: '#979799' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} style={{ color: '#1f6f5c' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f6f5c' }}>Payment Receipt</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Transaction Ref', value: lastReceipt.tx_ref },
                    { label: 'Amount', value: `ETB ${lastReceipt.amount}` },
                    { label: 'Currency', value: lastReceipt.currency },
                    { label: 'Chapa ID', value: lastReceipt.chapaId !== '—' ? lastReceipt.chapaId : 'Pending' },
                    { label: 'Date', value: new Date(lastReceipt.timestamp).toLocaleString() },
                    { label: 'Status', value: 'Verified', highlight: true },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between py-1.5 ${i < 5 ? 'border-b' : ''}`}
                      style={{ borderColor: '#f2f2f3' }}>
                      <span style={{ color: '#979799', fontSize: '13px' }}>{item.label}</span>
                      <span className={`text-xs font-mono font-medium ${item.highlight ? 'px-2 py-0.5 rounded-md' : ''}`}
                        style={item.highlight ? { color: '#1f6f5c', backgroundColor: 'rgba(93,42,26,0.08)' } : { color: '#173a32' }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setActiveTab('transactions')}
                  className="flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
                  <History size={14} /> View Transactions
                </button>
                <button onClick={() => window.print()}
                  className="py-2.5 px-4 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ border: '1px solid #ececec', color: '#777b86' }}>
                  <Download size={14} /> Print Receipt
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Banner */}
        <div className="mb-6 p-3 rounded-2xl flex items-center gap-3 text-sm" style={{ backgroundColor: '#fafafb' }}>
          <ShieldCheck size={18} style={{ color: '#1f6f5c' }} className="shrink-0" />
          <span style={{ color: '#777b86' }}>
            <strong style={{ color: '#173a32' }}>Secure Wallet</strong> — Your PIN is stored per-account. Session expires after 5 minutes of inactivity.
          </span>
        </div>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-6" style={{ backgroundColor: '#173a32' }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2"
            style={{ background: 'linear-gradient(135deg, rgba(93,42,26,0.2), transparent)' }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#979799' }}>Available Balance</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-bold" style={{ color: '#ffffff' }}>
                    {showBalance ? `ETB ${(stats.balance || 0).toLocaleString()}` : '••••••'}
                  </h2>
                  <button onClick={() => setShowBalance(!showBalance)} style={{ color: '#979799' }} className="hover:text-white transition-colors">
                    {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Shield size={16} style={{ color: '#1f6f5c' }} />
                <span style={{ color: '#1f6f5c', fontSize: '12px', fontWeight: 500 }}>Secured</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden"
                style={{ backgroundColor: 'rgba(93,42,26,0.3)', color: '#1f6f5c' }}>
                {user?.profile_picture ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                  : user?.full_name?.charAt(0)}
              </div>
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#979799', border: '1px solid rgba(255,255,255,0.1)' }}>
                {user?.email || 'user@gebeya.et'}
              </span>
              <button onClick={handleCopy} className="relative transition-all" style={{ color: '#979799' }}>
                <Copy size={14} />
                {copied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-lg whitespace-nowrap"
                    style={{ backgroundColor: '#173a32', color: '#ffffff' }}>Copied!</span>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Earned', value: stats.earned, icon: ArrowDownLeft },
                { label: 'Total Spent', value: stats.spent, icon: ArrowUpRight },
                { label: 'In Escrow', value: stats.escrow, icon: Lock },
                { label: 'Transactions', value: stats.transactionCount, icon: History, isCount: true },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={12} style={{ color: '#1f6f5c' }} />
                    <span style={{ color: '#979799', fontSize: '10px' }}>{s.label}</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#1f6f5c' }}>
                    {s.isCount ? s.value : `ETB ${(s.value || 0).toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-1 p-1 rounded-full" style={{ backgroundColor: '#f2f2f3' }}>
              {[
                { id: 'overview', label: 'Overview', icon: WalletIcon },
                { id: 'send', label: 'Send Money', icon: Send },
                { id: 'transactions', label: 'Transactions', icon: History },
                { id: 'chapa', label: 'Pay with Chapa', icon: ShoppingCart },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5 rounded-full`}
                  style={{
                    backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#173a32' : '#777b86',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  }}>
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: '#173a32' }}>
                  <TrendingUp size={16} style={{ color: '#1f6f5c' }} /> Recent Activity
                </h3>
                {recentTxns.length === 0 ? (
                  <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#fafafb' }}>
                    <WalletIcon size={40} className="mx-auto mb-4" style={{ color: '#979799' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#173a32' }}>No Activity Yet</h3>
                    <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-6">Your wallet transactions will appear here once you start working.</p>
                    <button onClick={() => setActiveTab('chapa')}
                      className="py-3 px-6 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-2"
                      style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
                      <ShoppingCart size={16} /> Top Up with Chapa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTxns.map((txn, i) => {
                      const cfg = statusConfig[txn.status] || statusConfig.escrow;
                      const incoming = isIncoming(txn);
                      const StatusIcon = cfg.icon;
                      return (
                        <motion.div key={txn.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="rounded-xl p-4 transition-all" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: incoming ? 'rgba(93,42,26,0.08)' : '#f2f2f3' }}>
                                {incoming ? <ArrowDownLeft size={18} style={{ color: '#1f6f5c' }} /> : <ArrowUpRight size={18} style={{ color: '#777b86' }} />}
                              </div>
                              <div>
                                <p className="font-medium text-sm" style={{ color: '#173a32' }}>{txn.job_title || 'Transaction'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                    <StatusIcon size={10} /> {cfg.label}
                                  </span>
                                  <span style={{ color: '#979799', fontSize: '10px' }}>
                                    {new Date(txn.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-bold" style={{ color: incoming ? '#1f6f5c' : '#777b86' }}>
                              {incoming ? '+' : '-'} ETB {(txn.amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 mb-4" style={{ color: '#173a32' }}>
                  <History size={16} style={{ color: '#1f6f5c' }} /> All Transactions
                </h3>
                {transactions.length === 0 ? (
                  <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#fafafb' }}>
                    <p style={{ color: '#979799' }}>No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((txn, i) => {
                    const cfg = statusConfig[txn.status] || statusConfig.escrow;
                    const incoming = isIncoming(txn);
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.div key={txn.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="rounded-xl p-4 transition-all" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: incoming ? 'rgba(93,42,26,0.08)' : '#f2f2f3' }}>
                              {incoming ? <ArrowDownLeft size={18} style={{ color: '#1f6f5c' }} /> : <ArrowUpRight size={18} style={{ color: '#777b86' }} />}
                            </div>
                            <div>
                              <p className="font-medium text-sm" style={{ color: '#173a32' }}>{txn.job_title || 'Transaction'}</p>
                              <p style={{ color: '#777b86', fontSize: '13px', marginTop: '2px' }}>
                                {incoming ? `From: ${txn.client_name || 'Client'}` : `To: ${txn.freelancer_name || 'Freelancer'}`}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                  style={{ backgroundColor: cfg.bg, color: cfg.color, border: '1px solid transparent' }}>
                                  <StatusIcon size={10} /> {cfg.label}
                                </span>
                                <span style={{ color: '#979799', fontSize: '10px' }} className="flex items-center gap-1">
                                  <Clock size={10} /> {new Date(txn.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-base font-bold" style={{ color: incoming ? '#1f6f5c' : '#777b86' }}>
                              {incoming ? '+' : '-'} ETB {(txn.amount || 0).toLocaleString()}
                            </p>
                            {txn.telebirr_reference && (
                              <p style={{ color: '#979799', fontSize: '9px', fontFamily: 'monospace', marginTop: '2px' }}>Ref: {txn.telebirr_reference.slice(0, 16)}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* Send Money Tab */}
            {activeTab === 'send' && (
              <SendMoneyForm user={user} onDone={() => {
                setActiveTab('transactions');
                Promise.all([paymentsAPI.getTransactions(), walletAPI.getOverview()])
                  .then(([txnRes, overviewRes]) => {
                    setTransactions(txnRes.data.transactions || []);
                    setWalletOverview(overviewRes.data);
                  }).catch(() => {});
              }} />
            )}

            {/* Pay with Chapa Tab */}
            {activeTab === 'chapa' && (
              <div className="rounded-3xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
                <h3 className="text-xl font-semibold mb-1 flex items-center gap-2" style={{ color: '#173a32', fontFamily: 'var(--font-signifier)', fontWeight: 400 }}>
                  <ShoppingCart size={20} style={{ color: '#1f6f5c' }} /> Pay with Chapa
                </h3>
                <p style={{ color: '#777b86', fontSize: '15px' }} className="mb-6">
                  Make secure payments using Chapa — supports TeleBirr, CBE Birr, and all Ethiopian bank cards.
                </p>
                <ChapaPaymentForm user={user} />

                {/* Test Order Button */}
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #ececec' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
                      <Package size={18} style={{ color: '#777b86' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: '#173a32' }}>Test the Order Flow</h4>
                      <p style={{ color: '#777b86', fontSize: '12px' }}>Create a test order to walk through the complete order lifecycle</p>
                    </div>
                  </div>

                  {/* Test order success banner */}
                  {testOrderSuccess && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-4 rounded-2xl flex items-start gap-3"
                      style={{ backgroundColor: 'rgba(93,42,26,0.08)' }}>
                      <CheckCircle size={18} style={{ color: '#1f6f5c' }} className="shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#173a32' }}>Test Order Created!</p>
                        <p className="text-xs mt-0.5" style={{ color: '#777b86' }}>
                          ETB {testOrderSuccess.price.toLocaleString()} for "{testOrderSuccess.title}".
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Link to={testOrderSuccess.id ? `/orders/${testOrderSuccess.id}` : '/orders'}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all"
                            style={{ backgroundColor: '#173a32', color: '#ffffff' }}>
                            View Order Detail
                          </Link>
                          <Link to="/orders"
                            className="text-xs font-medium transition-all"
                            style={{ color: '#777b86' }}>
                            All Orders
                          </Link>
                        </div>
                      </div>
                      <button onClick={() => setTestOrderSuccess(null)} className="shrink-0" style={{ color: '#979799' }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}

                  {/* Test order error banner */}
                  {testOrderError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-3 rounded-xl flex items-start gap-2 text-sm"
                      style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
                      <AlertOctagon size={14} className="shrink-0 mt-0.5" />
                      <span className="flex-1">{testOrderError}</span>
                      <button onClick={() => setTestOrderError('')} className="shrink-0" style={{ color: '#979799' }}>
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}


                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#173a32' }}>
                <DollarSign size={16} style={{ color: '#1f6f5c' }} /> Quick Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Available Balance', value: stats.balance },
                  { label: 'In Escrow', value: stats.escrow },
                  { label: 'Pending', value: stats.pending },
                  { label: 'Total Earned', value: stats.earned },
                  { label: 'Total Spent', value: stats.spent },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span style={{ color: '#777b86', fontSize: '13px' }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: '#173a32' }}>
                      ETB {(item.value || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#173a32' }}>
                <ShieldCheck size={16} style={{ color: '#1f6f5c' }} /> Security Status
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Account', status: user?.email || 'Signed In' },
                  { label: 'PIN Protected', status: 'Per-User' },
                  { label: 'Session', status: 'Live (5 min)' },
                  { label: 'Encryption', status: 'SHA-256' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ backgroundColor: '#fafafb' }}>
                    <span style={{ color: '#777b86', fontSize: '13px' }}>{item.label}</span>
                    <span className="text-xs font-medium" style={{ color: '#1f6f5c' }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#173a32' }}>Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setActiveTab('chapa')}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                  style={{ color: '#1f6f5c', backgroundColor: 'rgba(251,225,209,0.3)' }}>
                  <ShoppingCart size={16} /> Pay with Chapa
                </button>
                <button onClick={() => setActiveTab('transactions')}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                  style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
                  <History size={16} /> View All Transactions
                </button>
                <a href="https://chapa.co" target="_blank" rel="noopener noreferrer"
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                  style={{ color: '#777b86', backgroundColor: '#f2f2f3' }}>
                  <ExternalLink size={16} /> Chapa Website
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
