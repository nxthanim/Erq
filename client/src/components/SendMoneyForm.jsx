import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usersAPI, paymentsAPI } from '../utils/api';
import ChapaInlineCheckout from '../components/ChapaInlineCheckout';
import {
  Send, Search, User, Mail, Phone, MapPin, Building2,
  CreditCard, FileText, DollarSign, Globe, Calendar,
  BookOpen, Tag, MessageSquare, AlertCircle, CheckCircle,
  ArrowLeft, Loader2, X, ChevronRight, Info, ShoppingCart,
  ShieldCheck, ExternalLink, AlertOctagon, Banknote
} from 'lucide-react';

// Steps for the send money flow
const STEPS = {
  SEARCH: 'search',
  RECIPIENT_INFO: 'recipient_info',
  REVIEW: 'review',
  PAYMENT: 'payment',
  CONFIRMED: 'confirmed',
};

// ====== RECIPIENT SEARCH ======
function RecipientSearch({ onSelect, onBack }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersAPI.searchUsers(query.trim(), 8);
        setResults(res.data.users || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (user) => {
    setSelectedUser(user);
    onSelect(user);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {onBack && (
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-all">
          <ArrowLeft size={14} /> Back
        </button>
      )}

      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <Send size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Send Money</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Search for the person you want to send money to
      </p>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email, or username..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          autoFocus
        />
        {searching && (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {results.length === 0 && query.trim().length >= 2 && !searching && (
          <div className="text-center py-8">
            <User size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No users found matching "{query}"</p>
            <p className="text-xs text-gray-300 mt-1">Try a different name or email address</p>
          </div>
        )}

        {results.map(user => (
          <button key={user.id} onClick={() => handleSelect(user)}
            className="w-full text-left p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all overflow-hidden">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                user.full_name?.charAt(0)?.toUpperCase() || <User size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {user.full_name || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              {user.skills && user.skills.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user.skills.slice(0, 2).map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ====== RECIPIENT DETAILS FORM (12+ fields) ======
function RecipientDetailsForm({ recipient, onSubmit, onBack }) {
  const [form, setForm] = useState({
    fullName: recipient?.full_name || '',
    email: recipient?.email || '',
    phone: '',
    bankName: '',
    accountNumber: '',
    city: '',
    region: '',
    relationship: '',
    purpose: '',
    referenceNote: '',
    expectedDate: '',
    additionalNotes: '',
  });
  const [errors, setErrors] = useState({});

  const relationships = [
    'Client', 'Freelancer', 'Vendor', 'Service Provider',
    'Business Partner', 'Friend', 'Family', 'Colleague', 'Other'
  ];

  const banks = [
    'Commercial Bank of Ethiopia (CBE)', 'Dashen Bank', 'Awash Bank',
    'Bank of Abyssinia', 'Wegagen Bank', 'United Bank', 'Nib International Bank',
    'Zemen Bank', 'Berhan Bank', 'Abay Bank', 'Omo Bank', 'Cooperative Bank of Oromia',
    'TeleBirr', 'CBE Birr', 'Amole', 'M-Pesa', 'Other'
  ];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    // Field 1
    if (!form.fullName.trim()) newErrors.fullName = 'Required';
    // Field 2
    if (!form.email.trim()) newErrors.email = 'Required';
    // Field 3
    if (!form.phone.trim()) newErrors.phone = 'Required';
    // Field 4
    if (!form.bankName) newErrors.bankName = 'Select a bank';
    // Field 5
    if (!form.accountNumber.trim()) newErrors.accountNumber = 'Required';
    // Field 6
    if (!form.city.trim()) newErrors.city = 'Required';
    // Field 7
    if (!form.region.trim()) newErrors.region = 'Required';
    // Field 8
    if (!form.relationship) newErrors.relationship = 'Select relationship';
    // Field 9
    if (!form.purpose.trim()) newErrors.purpose = 'Required';
    // Field 10
    if (!form.referenceNote.trim()) newErrors.referenceNote = 'Required';
    // Field 11
    if (!form.expectedDate) newErrors.expectedDate = 'Required';
    // Field 12
    if (!form.additionalNotes.trim()) newErrors.additionalNotes = 'Required (type "N/A" if none)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(form);
    }
  };

  const fieldClass = (field) =>
    `w-full px-4 py-2.5 rounded-xl border ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'} text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-all">
        <ArrowLeft size={14} /> Change recipient
      </button>

      <div className="flex items-center gap-3 mb-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
          {recipient?.profile_picture ? (
            <img src={recipient.profile_picture} alt="" className="w-full h-full object-cover" />
          ) : (
            recipient?.full_name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{recipient?.full_name || 'Recipient'}</p>
          <p className="text-xs text-gray-500">{recipient?.email}</p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">Recipient Information</h3>
      <p className="text-xs text-gray-400 mb-5">
        Please fill out all details about the person receiving the payment. All fields are required for security compliance.
      </p>

      <div className="space-y-3.5">
        {/* Field 1 - Full Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <User size={12} /> Full Name <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.fullName} onChange={e => handleChange('fullName', e.target.value)}
            placeholder="Recipient's full legal name" className={fieldClass('fullName')} />
          {errors.fullName && <p className="text-red-500 text-[10px] mt-1">{errors.fullName}</p>}
        </div>

        {/* Field 2 - Email Address */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Mail size={12} /> Email Address <span className="text-red-400">*</span>
          </label>
          <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)}
            placeholder="recipient@email.com" className={fieldClass('email')} />
          {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>}
        </div>

        {/* Field 3 - Phone Number */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Phone size={12} /> Phone Number <span className="text-red-400">*</span>
          </label>
          <input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)}
            placeholder="+251 9XX XXX XXX" className={fieldClass('phone')} />
          {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
        </div>

        {/* Field 4 - Bank / Payment Provider */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Building2 size={12} /> Bank / Payment Provider <span className="text-red-400">*</span>
          </label>
          <select value={form.bankName} onChange={e => handleChange('bankName', e.target.value)}
            className={fieldClass('bankName')}>
            <option value="">Select bank or provider...</option>
            {banks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {errors.bankName && <p className="text-red-500 text-[10px] mt-1">{errors.bankName}</p>}
        </div>

        {/* Field 5 - Account Number */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <CreditCard size={12} /> Account / Wallet Number <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)}
            placeholder="Recipient's account or wallet number" className={fieldClass('accountNumber')} />
          {errors.accountNumber && <p className="text-red-500 text-[10px] mt-1">{errors.accountNumber}</p>}
        </div>

        {/* Field 6 - City */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <MapPin size={12} /> City / Town <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.city} onChange={e => handleChange('city', e.target.value)}
            placeholder="e.g., Addis Ababa, Bahir Dar" className={fieldClass('city')} />
          {errors.city && <p className="text-red-500 text-[10px] mt-1">{errors.city}</p>}
        </div>

        {/* Field 7 - Region */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Globe size={12} /> Region / State <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.region} onChange={e => handleChange('region', e.target.value)}
            placeholder="e.g., Addis Ababa, Oromia, Amhara" className={fieldClass('region')} />
          {errors.region && <p className="text-red-500 text-[10px] mt-1">{errors.region}</p>}
        </div>

        {/* Field 8 - Relationship */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <BookOpen size={12} /> Relationship to Recipient <span className="text-red-400">*</span>
          </label>
          <select value={form.relationship} onChange={e => handleChange('relationship', e.target.value)}
            className={fieldClass('relationship')}>
            <option value="">Select relationship...</option>
            {relationships.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.relationship && <p className="text-red-500 text-[10px] mt-1">{errors.relationship}</p>}
        </div>

        {/* Field 9 - Purpose */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Tag size={12} /> Purpose of Payment <span className="text-red-400">*</span>
          </label>
          <select value={form.purpose} onChange={e => handleChange('purpose', e.target.value)}
            className={fieldClass('purpose')}>
            <option value="">Select purpose...</option>
            <option value="Freelance Payment">Freelance Payment</option>
            <option value="Service Fee">Service Fee</option>
            <option value="Deposit">Deposit</option>
            <option value="Loan Repayment">Loan Repayment</option>
            <option value="Gift">Gift / Donation</option>
            <option value="Salary">Salary / Wages</option>
            <option value="Invoice Payment">Invoice Payment</option>
            <option value="Family Support">Family Support</option>
            <option value="Business Transaction">Business Transaction</option>
            <option value="Project Funding">Project Funding</option>
            <option value="Other">Other</option>
          </select>
          {errors.purpose && <p className="text-red-500 text-[10px] mt-1">{errors.purpose}</p>}
        </div>

        {/* Field 10 - Reference Note */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <FileText size={12} /> Reference / Invoice Note <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.referenceNote} onChange={e => handleChange('referenceNote', e.target.value)}
            placeholder="Invoice #, project name, or reference" className={fieldClass('referenceNote')} />
          {errors.referenceNote && <p className="text-red-500 text-[10px] mt-1">{errors.referenceNote}</p>}
        </div>

        {/* Field 11 - Expected Date */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Calendar size={12} /> Expected Delivery / Service Date <span className="text-red-400">*</span>
          </label>
          <input type="date" value={form.expectedDate} onChange={e => handleChange('expectedDate', e.target.value)}
            className={fieldClass('expectedDate')} />
          {errors.expectedDate && <p className="text-red-500 text-[10px] mt-1">{errors.expectedDate}</p>}
        </div>

        {/* Field 12 - Additional Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <MessageSquare size={12} /> Additional Notes <span className="text-red-400">*</span>
          </label>
          <textarea value={form.additionalNotes} onChange={e => handleChange('additionalNotes', e.target.value)}
            placeholder="Any additional information about this payment. Type N/A if none."
            rows={2} className={fieldClass('additionalNotes') + ' resize-none'} />
          {errors.additionalNotes && <p className="text-red-500 text-[10px] mt-1">{errors.additionalNotes}</p>}
        </div>
      </div>

      <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex items-start gap-2">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>This information is required for security and compliance purposes. All details are encrypted and stored securely.</span>
      </div>

      <button onClick={handleSubmit}
        className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-200/50 hover:shadow-xl flex items-center justify-center gap-2">
        <ChevronRight size={18} /> Continue to Review
      </button>
    </motion.div>
  );
}

// ====== REVIEW & AMOUNT ======
function ReviewAndAmountStep({ recipient, recipientDetails, onSubmit, onBack }) {
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState('');

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrors('Please enter a valid amount');
      return;
    }
    if (parseFloat(amount) < 5) {
      setErrors('Minimum amount is ETB 5');
      return;
    }
    setErrors('');
    onSubmit(parseFloat(amount));
  };

  const detailsList = Object.entries(recipientDetails).map(([key, val]) => ({
    key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    value: val,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-all">
        <ArrowLeft size={14} /> Edit details
      </button>

      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <ShieldCheck size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Review & Confirm</h2>

      {/* Recipient Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
            {recipient?.profile_picture ? (
              <img src={recipient.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              recipient?.full_name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Sending to: {recipientDetails.fullName}</p>
            <p className="text-xs text-gray-500">{recipientDetails.email}</p>
          </div>
        </div>
      </div>

      {/* All 12 Fields Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 max-h-[280px] overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recipient Details</h3>
        <div className="space-y-2">
          {detailsList.map((item, i) => (
            <div key={i} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400">{item.label}</span>
              <span className="text-xs font-medium text-gray-800 text-right max-w-[60%] truncate" title={item.value}>
                {item.value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (ETB)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">ETB</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="5"
            className="w-full pl-14 pr-4 py-3.5 rounded-xl border border-gray-200 text-lg font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        {errors && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors}</p>}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 flex items-start gap-2">
        <Info size={12} className="shrink-0 mt-0.5" />
        <span>You will be redirected to Chapa's secure checkout to complete this payment. The recipient will be notified once the transfer is confirmed.</span>
      </div>

      <button onClick={handleSubmit}
        className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-200/50 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <DollarSign size={18} /> Send ETB {amount || '0'} via Chapa
      </button>
    </motion.div>
  );
}

// ====== CHAPA PAYMENT STEP — Inline embedded widget, no redirect ======
function PaymentStep({ paymentData, user, recipientDetails, onDone, onBack, onReset }) {
  const [chapaForm, setChapaForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState('init'); // 'init' | 'checkout' | 'verifying' | 'done'

  useEffect(() => {
    initiateChapaPayment();
  }, []);

  const initiateChapaPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.initiateChapa({
        amount: paymentData.amount,
        currency: 'ETB',
        email: user?.email || 'sender@gebeya.et',
        first_name: user?.full_name?.split(' ')[0] || 'Sender',
        last_name: user?.full_name?.split(' ').slice(1).join(' ') || 'User',
        description: `Send money to ${recipientDetails.fullName} — ${recipientDetails.purpose}`,
        recipient_id: paymentData.recipientId,
        recipient_email: recipientDetails.email,
        recipient_name: recipientDetails.fullName,
        recipient_bank: recipientDetails.bankName,
        recipient_account: recipientDetails.accountNumber,
        recipient_phone: recipientDetails.phone,
        recipient_city: recipientDetails.city,
        recipient_region: recipientDetails.region,
        recipient_relationship: recipientDetails.relationship,
        recipient_purpose: recipientDetails.purpose,
        recipient_reference: recipientDetails.referenceNote,
        recipient_expected_date: recipientDetails.expectedDate,
        recipient_notes: recipientDetails.additionalNotes,
        is_send_money: true,
      });
      setChapaForm(res.data);
      setStep('checkout');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setStep('verifying');
    try {
      const res = await paymentsAPI.verifyChapa(chapaForm.tx_ref);
      if (res.data?.verified) {
        setStep('done');
        setTimeout(() => onDone?.(), 2000);
      } else {
        setError('Payment not yet confirmed. Please try again.');
        setStep('checkout');
      }
    } catch {
      setError('Could not verify payment. Please try again.');
      setStep('checkout');
    }
  };

  // Done state
  if (step === 'done') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-300/50">
          <CheckCircle size={42} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verified! 🎉</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Your payment of <strong>ETB {paymentData.amount}</strong> to <strong>{recipientDetails.fullName}</strong> has been confirmed via Chapa.
        </p>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-6 max-w-sm mx-auto text-left">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Recipient</span><span className="font-medium text-gray-800">{recipientDetails.fullName}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Amount</span><span className="font-medium text-gray-800">ETB {paymentData.amount}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Transaction Ref</span><span className="font-mono text-[10px] text-gray-600">{chapaForm?.tx_ref}</span></div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={onReset}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-200/50">
            Send Another Payment
          </button>
          <button onClick={onDone}
            className="py-3 px-5 rounded-2xl border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-sm transition-all">
            Done
          </button>
        </div>
      </motion.div>
    );
  }

  // Verifying state
  if (step === 'verifying') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <Loader2 size={36} className="animate-spin text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Verifying Payment...</h3>
        <p className="text-sm text-gray-500">Confirming your transaction with Chapa's secure API.</p>
      </motion.div>
    );
  }

  // Error state before checkout
  if (error && step === 'init') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
        <AlertOctagon size={48} className="mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Initiation Failed</h3>
        <p className="text-sm text-red-500 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={initiateChapaPayment} className="py-3 px-6 rounded-xl bg-gebeya-600 hover:bg-gebeya-700 text-white font-semibold text-sm transition-all flex items-center gap-2">
            <Loader2 size={16} /> Try Again
          </button>
          <button onClick={onBack} className="py-3 px-6 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition-all">
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (loading || step === 'init') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <Loader2 size={40} className="mx-auto mb-4 text-blue-500 animate-spin" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Initiating Payment...</h3>
        <p className="text-sm text-gray-500">Connecting to Chapa secure gateway</p>
      </motion.div>
    );
  }

  // Checkout state — show inline widget
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 text-lg">
            🔒
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">Complete Your Payment</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Pay <strong>ETB {paymentData.amount}</strong> to <strong>{recipientDetails.fullName}</strong>.
              Select your preferred method and enter your phone number below.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {recipientDetails.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{recipientDetails.fullName}</p>
            <p className="text-xs text-gray-500">{recipientDetails.email}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-600">ETB {paymentData.amount}</p>
            <p className="text-[10px] text-gray-400">{recipientDetails.purpose}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
          <AlertOctagon size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <ChapaInlineCheckout
        publicKey="CHAPUBK_TEST-HgtwLy9cPhdQXVu7mPz16aJGeYE39Tok"
        txRef={chapaForm?.tx_ref}
        amount={paymentData.amount}
        currency="ETB"
        onSuccess={handlePaymentSuccess}
        onFailure={(err) => {
          setError(err?.message || 'Payment was not completed. Please try again.');
          setStep('init');
        }}
        onClose={() => {
          setError('Checkout was closed. You can try again when ready.');
          setStep('init');
        }}
      />

      <button onClick={() => { setStep('init'); setError(''); }}
        className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-all block mx-auto">
        Cancel and start over
      </button>
    </motion.div>
  );
}

// ====== MAIN SEND MONEY FORM ======
export default function SendMoneyForm({ user, onDone }) {
  const [step, setStep] = useState(STEPS.SEARCH);
  const [recipient, setRecipient] = useState(null);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  const handleRecipientSelect = (user) => {
    setRecipient(user);
    setStep(STEPS.RECIPIENT_INFO);
  };

  const handleDetailsSubmit = (details) => {
    setRecipientDetails(details);
    setStep(STEPS.REVIEW);
  };

  const handleAmountSubmit = (amount) => {
    setPaymentData({ amount, recipientId: recipient?.id });
    setStep(STEPS.PAYMENT);
  };

  const handlePaymentComplete = (txRef, verificationData) => {
    // Give user 2.5 seconds to see the verified confirmation before switching to transactions
    setTimeout(() => {
      onDone?.();
    }, 2500);
  };

  const resetFlow = () => {
    setStep(STEPS.SEARCH);
    setRecipient(null);
    setRecipientDetails(null);
    setPaymentData(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <AnimatePresence mode="wait">
        {step === STEPS.SEARCH && (
          <RecipientSearch
            key="search"
            onSelect={handleRecipientSelect}
          />
        )}

        {step === STEPS.RECIPIENT_INFO && (
          <RecipientDetailsForm
            key="details"
            recipient={recipient}
            onSubmit={handleDetailsSubmit}
            onBack={() => setStep(STEPS.SEARCH)}
          />
        )}

        {step === STEPS.REVIEW && (
          <ReviewAndAmountStep
            key="review"
            recipient={recipient}
            recipientDetails={recipientDetails}
            onSubmit={handleAmountSubmit}
            onBack={() => setStep(STEPS.RECIPIENT_INFO)}
          />
        )}

        {step === STEPS.PAYMENT && (
          <PaymentStep
            key="payment"
            paymentData={paymentData}
            user={user}
            recipientDetails={recipientDetails}
            onDone={handlePaymentComplete}
            onBack={() => setStep(STEPS.REVIEW)}
            onReset={resetFlow}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
