import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, paymentsAPI } from '../utils/api';

// Ethiopian banks & payment providers
// Note: URLs are homepage/placeholder links. In production, replace with actual payment gateway redirect endpoints.
const ETHIOPIAN_BANKS = [
  {
    id: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    logo: '🏦',
    bg: 'bg-blue-50 border-blue-200',
    url: 'https://www.combanketh.et',
    description: 'Largest bank in Ethiopia',
  },
  {
    id: 'dashen',
    name: 'Dashen Bank',
    logo: '🏛️',
    bg: 'bg-green-50 border-green-200',
    url: 'https://www.dashenbank.com.et',
    description: 'Private commercial bank',
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    logo: '🌊',
    bg: 'bg-cyan-50 border-cyan-200',
    url: 'https://www.awashbank.com',
    description: 'First private bank in Ethiopia',
  },
  {
    id: 'abyssinia',
    name: 'Bank of Abyssinia',
    logo: '🏰',
    bg: 'bg-amber-50 border-amber-200',
    url: 'https://www.bankofabyssinia.com',
    description: 'Full-service commercial bank',
  },
  {
    id: 'wegagen',
    name: 'Wegagen Bank',
    logo: '🛡️',
    bg: 'bg-red-50 border-red-200',
    url: 'https://www.wegagen.com',
    description: 'Private commercial bank',
  },
  {
    id: 'united',
    name: 'United Bank',
    logo: '🤝',
    bg: 'bg-purple-50 border-purple-200',
    url: 'https://www.unitedbank.com.et',
    description: 'Private commercial bank',
  },
  {
    id: 'nib',
    name: 'Nib International Bank',
    logo: '💎',
    bg: 'bg-indigo-50 border-indigo-200',
    url: 'https://www.nibbanksc.com',
    description: 'Private commercial bank',
  },
  {
    id: 'telebirr',
    name: 'TeleBirr',
    logo: '📱',
    bg: 'bg-emerald-50 border-emerald-200',
    url: 'https://www.telebirr.et',
    description: 'Mobile money service by Ethio Telecom',
  },
  {
    id: 'chapa',
    name: 'Chapa',
    logo: '⚡',
    bg: 'bg-orange-50 border-orange-200',
    url: 'https://chapa.co',
    description: 'Digital payment gateway',
  },
  {
    id: 'amole',
    name: 'Amole',
    logo: '💳',
    bg: 'bg-rose-50 border-rose-200',
    url: 'https://amole.dashenbanksc.com',
    description: 'Digital wallet by Dashen Bank',
  },
];

export default function PurchaseConfirmation() {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const freelancerId = searchParams.get('freelancerId');
  const amount = parseFloat(searchParams.get('amount')) || 0;
  const queryFreelancerName = searchParams.get('freelancerName') || '';
  const queryFreelancerRating = parseFloat(searchParams.get('freelancerRating')) || 0;
  const fromQuickOrder = searchParams.get('fromQuickOrder') === 'true';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState('');
  const hasRedirected = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await jobsAPI.get(jobId);
        const jobData = res.data.job;
        setJob(jobData);

        if (freelancerId) {
          // Try finding a bid first (traditional flow)
          const bid = (res.data.bids || []).find(b => b.freelancer_id === freelancerId);
          if (bid) {
            setFreelancer({
              id: bid.freelancer_id,
              name: bid.freelancer_name,
              picture: bid.freelancer_picture,
              rating: bid.freelancer_rating,
              verified: bid.freelancer_verified,
              city: bid.freelancer_city,
              amount: bid.amount,
              proposal: bid.proposal,
            });
          } else {
            // Fallback: quick order flow — use search params or transaction data
            const txn = (res.data.transactions || []).find(t => t.freelancer_id === freelancerId);
            setFreelancer({
              id: freelancerId,
              name: queryFreelancerName || txn?.freelancer_name || 'Freelancer',
              picture: txn?.freelancer_picture || '',
              rating: queryFreelancerRating || txn?.freelancer_rating || 0,
              verified: false,
              amount: amount,
            });
          }
        }
      } catch (err) {
        setError('Failed to load job details');
        navigate('/my-jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId, freelancerId, navigate]);

  // Auto-redirect countdown
  useEffect(() => {
    if (redirectUrl && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (redirectUrl && countdown === 0 && !hasRedirected.current) {
      hasRedirected.current = true;
      window.open(redirectUrl, '_blank');
    }
  }, [redirectUrl, countdown]);

  const handleConfirm = async () => {
    if (!selectedBank) {
      setError('Please select a payment method');
      return;
    }
    setConfirming(true);
    setError('');

    try {
      let transactionRef = '';

      if (fromQuickOrder) {
        // Quick order — job already awarded, just initiate payment
        const payRes = await paymentsAPI.initiate({ jobId });
        transactionRef = payRes.data?.transactionId || '';
      } else {
        // Traditional bid flow — award the job first
        const awardRes = await jobsAPI.award(jobId, { freelancerId });
        await paymentsAPI.initiate({ jobId });
        transactionRef = awardRes.data.transactionId || '';
      }

      // Set confirmed state and show redirect
      setConfirmed(true);
      const bank = ETHIOPIAN_BANKS.find(b => b.id === selectedBank);
      
      // Add the job/bid reference to the redirect URL
      const paymentUrl = new URL(bank.url);
      paymentUrl.searchParams.set('reference', transactionRef);
      paymentUrl.searchParams.set('amount', amount.toString());
      paymentUrl.searchParams.set('purpose', `Job: ${job?.title || ''}`);
      
      setRedirectUrl(paymentUrl.toString());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm purchase. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleRedirectNow = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-clay-50 to-ice-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gebeya-500 border-t-transparent"></div>
          <p className="text-ice-500 animate-pulse">Loading your purchase details...</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const displayAmount = freelancer?.amount || amount || job.budget_min;

  return (
    <div className="min-h-screen bg-gradient-to-br from-clay-50 via-ice-50 to-clay-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link to={`/jobs/${jobId}`} className="inline-flex items-center gap-2 text-ice-500 hover:text-ice-700 transition-colors mb-6 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Back to Job</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gebeya-100 rounded-full mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-ice-900 mb-2">
            {confirmed ? '✅ Purchase Confirmed!' : 'Confirm Your Purchase'}
          </h1>
          <p className="text-ice-500 text-lg">
            {confirmed
              ? 'Your payment is being processed. Choose your bank to complete the transaction.'
              : 'Review the details below before finalizing your purchase.'}
          </p>
        </div>

        {/* Confirmed Banner */}
        {confirmed && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-lg shadow-emerald-100/50 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-800 text-lg">Job Awarded Successfully!</h3>
                <p className="text-emerald-600 text-sm">
                  The freelancer has been notified. Complete payment via your chosen bank to start the project.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content - Job & Freelancer Summary */}
          <div className="lg:col-span-3 space-y-6">
            {/* Job Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-clay-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📋</span>
                <h2 className="font-semibold text-ice-900 text-lg">Job Summary</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-ice-400 mt-0.5">📌</span>
                  <div>
                    <p className="font-medium text-ice-900">{job.title}</p>
                    <p className="text-xs text-ice-400">{job.category}</p>
                  </div>
                </div>
                <p className="text-ice-600 text-sm leading-relaxed line-clamp-3 bg-clay-50 rounded-xl p-3">
                  {job.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-ice-400 pt-2 border-t border-clay-100">
                  <span>👤 {job.client_name}</span>
                  {job.deadline && <span>📅 Due: {new Date(job.deadline).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>

            {/* Freelancer Card */}
            {freelancer && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-clay-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🤝</span>
                  <h2 className="font-semibold text-ice-900 text-lg">Awarded Freelancer</h2>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gebeya-100 rounded-full flex items-center justify-center text-gebeya-700 font-bold text-xl overflow-hidden shrink-0">
                    {freelancer.picture ? (
                      <img src={freelancer.picture} alt="" className="w-full h-full object-cover" />
                    ) : freelancer.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-ice-900">{freelancer.name}</span>
                      {freelancer.verified && (
                        <span className="bg-gebeya-100 text-gebeya-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-yellow-500">
                      ★ <span className="text-ice-500">{freelancer.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    {freelancer.city && (
                      <p className="text-xs text-ice-400 mt-0.5">📍 {freelancer.city}</p>
                    )}
                    {freelancer.proposal && (
                      <div className="mt-3 bg-clay-50 rounded-xl p-3">
                        <p className="text-xs font-medium text-ice-400 mb-1">Proposal</p>
                        <p className="text-sm text-ice-600">{freelancer.proposal}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Payment Summary & Bank Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-clay-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💰</span>
                <h2 className="font-semibold text-ice-900 text-lg">Payment Summary</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-ice-500 text-sm">Job Budget</span>
                  <span className="font-medium text-ice-900">
                    ETB {job.budget_min?.toLocaleString()} - {job.budget_max?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-clay-100">
                  <span className="text-ice-500 text-sm">Bid Amount</span>
                  <span className="font-bold text-lg text-gebeya-600">
                    ETB {displayAmount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-clay-100">
                  <span className="text-ice-500 text-sm">Service Fee (5%)</span>
                  <span className="text-ice-500 text-sm">
                    - ETB {Math.round(displayAmount * 0.05).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-gebeya-200 bg-gebeya-50/50 rounded-xl px-3 -mx-3">
                  <span className="font-semibold text-ice-900">Total to Pay</span>
                  <span className="font-bold text-xl text-gebeya-600">
                    ETB {displayAmount?.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-ice-400 text-center mt-2">
                  🔒 Payment held in escrow until work is approved
                </p>
              </div>
            </div>

            {/* Bank Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-clay-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏦</span>
                <h2 className="font-semibold text-ice-900 text-lg">
                  {confirmed ? 'Complete Payment Via' : 'Choose Payment Method'}
                </h2>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2 animate-fade-in">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {!confirmed ? (
                <>
                  <p className="text-sm text-ice-400 mb-4">
                    Select your preferred bank or payment provider to complete the transaction securely.
                  </p>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {ETHIOPIAN_BANKS.map((bank) => (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                          selectedBank === bank.id
                            ? 'border-gebeya-500 bg-gebeya-50 shadow-md shadow-gebeya-100/50'
                            : 'border-clay-200 hover:border-clay-300 hover:bg-clay-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                          selectedBank === bank.id ? bank.bg : 'bg-clay-50'
                        }`}>
                          {bank.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm truncate ${
                              selectedBank === bank.id ? 'text-gebeya-700' : 'text-ice-900'
                            }`}>
                              {bank.name}
                            </span>
                            {selectedBank === bank.id && (
                              <span className="text-gebeya-500 shrink-0">✓</span>
                            )}
                          </div>
                          <p className="text-[10px] text-ice-400 truncate">{bank.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Selected bank display */}
                  <div className={`p-4 rounded-xl border-2 ${ETHIOPIAN_BANKS.find(b => b.id === selectedBank)?.bg || 'bg-clay-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{ETHIOPIAN_BANKS.find(b => b.id === selectedBank)?.logo}</div>
                      <div>
                        <p className="font-semibold text-ice-900">{ETHIOPIAN_BANKS.find(b => b.id === selectedBank)?.name}</p>
                        <p className="text-sm text-ice-500">Selected for payment</p>
                      </div>
                    </div>
                  </div>

                  {/* Redirect action */}
                  <div className="bg-gradient-to-br from-gebeya-50 to-clay-50 rounded-xl p-5 text-center border border-gebeya-200">
                    <p className="text-sm text-ice-600 mb-3">
                      You will be redirected to complete the payment on the bank's secure website.
                    </p>
                    <button
                      onClick={handleRedirectNow}
                      className="w-full py-3 bg-gebeya-600 hover:bg-gebeya-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-gebeya-200/50 flex items-center justify-center gap-2"
                    >
                      <span>🔗</span>
                      <span>Go to Bank Website {redirectUrl && `(${countdown}s)`}</span>
                    </button>
                    <p className="text-xs text-ice-400 mt-2">
                      Auto-redirecting in {countdown} seconds...
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <span>💡</span>
                    <span>
                      After completing payment on the bank's website, return here to verify. 
                      The funds will be held in escrow until you approve the work.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            {!confirmed && (
              <button
                onClick={handleConfirm}
                disabled={confirming || !selectedBank}
                className="w-full py-4 bg-gradient-to-r from-gebeya-600 to-gebeya-700 hover:from-gebeya-700 hover:to-gebeya-800 text-white font-bold text-lg rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gebeya-200/50 hover:shadow-xl hover:shadow-gebeya-200/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Confirm & Pay — ETB {displayAmount?.toLocaleString()}</span>
                  </>
                )}
              </button>
            )}

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-ice-400">
              <span className="flex items-center gap-1">🔒 Secure Payment</span>
              <span className="flex items-center gap-1">🛡️ Escrow Protection</span>
              <span className="flex items-center gap-1">✓ Verified</span>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
