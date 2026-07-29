import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { featuresAPI, paymentsAPI } from '../utils/api';
import { PageTransition } from '../components/ScrollReveal';
import { Gavel, FileText, Clock, Search, CheckCircle, Paperclip, Edit3, ArrowLeft, DollarSign, Scissors, X, AlertTriangle } from 'lucide-react';

export default function DisputeCenter() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ transactionId: '', reason: 'delivery_issue', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchData = async () => {
    try {
      const [discRes, txnRes] = await Promise.all([
        featuresAPI.getDisputes(),
        paymentsAPI.getTransactions()
      ]);
      setDisputes(discRes.data.disputes || []);
      setTransactions(txnRes.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch dispute data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await featuresAPI.createDispute(form);
      setShowCreateModal(false);
      setForm({ transactionId: '', reason: 'delivery_issue', description: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!evidenceInput.trim() || !selectedDispute) return;
    try {
      await featuresAPI.addDisputeEvidence(selectedDispute.id, { evidence: [evidenceInput.trim()] });
      setEvidenceInput('');
      setSelectedDispute(null);
      fetchData();
    } catch (err) {
      alert('Failed to add evidence');
    }
  };

  const handleResolveDispute = async (disputeId, status) => {
    try {
      await featuresAPI.updateDisputeStatus(disputeId, { status, adminNotes: adminNotes || undefined });
      setSelectedDispute(null);
      setAdminNotes('');
      fetchData();
    } catch (err) {
      alert('Failed to update dispute');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'badge-yellow';
      case 'under_review': return 'badge-blue';
      case 'resolved_client': return 'badge-red';
      case 'resolved_freelancer': return 'badge-green';
      case 'resolved_split': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  const getStatusLabel = (status) => status?.replace(/_/g, ' ') || 'unknown';

  const escrowTransactions = transactions.filter(t => t.status === 'escrow');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-ice-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ice-900 flex items-center gap-3">
              <Gavel size={28} className="text-gebeya-500" /> Dispute Center
            </h1>
            <p className="text-ice-500 mt-1">Manage and resolve transaction disputes</p>
          </div>
          {user?.role !== 'admin' && escrowTransactions.length > 0 && (
            <button onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2">
              <FileText size={16} /> Open Dispute
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Disputes', value: disputes.length, icon: <Gavel size={22} />, color: 'bg-orange-50 text-orange-600' },
            { label: 'Pending', value: disputes.filter(d => d.status === 'pending').length, icon: <Clock size={22} />, color: 'bg-yellow-50 text-yellow-600' },
            { label: 'Under Review', value: disputes.filter(d => d.status === 'under_review').length, icon: <Search size={22} />, color: 'bg-blue-50 text-blue-600' },
            { label: 'Resolved', value: disputes.filter(d => d.status.startsWith('resolved_')).length, icon: <CheckCircle size={22} />, color: 'bg-green-50 text-green-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-ice-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-ice-900">{stat.value}</p>
              <p className="text-sm text-ice-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-ice-100">
            <span className="text-5xl block mb-4 text-gebeya-500">
              <Gavel size={48} />
            </span>
            <h3 className="text-xl font-semibold text-ice-900 mb-2">No Disputes</h3>
            <p className="text-ice-500">All transactions are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map(dispute => (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-ice-100 p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedDispute(dispute)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-ice-900">{dispute.job_title}</h3>
                      <span className={`${getStatusColor(dispute.status)} text-xs`}>{getStatusLabel(dispute.status)}</span>
                    </div>
                    <p className="text-sm text-ice-500 mb-2">
                      <span className="font-medium text-ice-700">Reason:</span> {dispute.reason}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-ice-400">
                      <span>💰 ETB {dispute.amount?.toLocaleString()}</span>
                      <span>👤 Raised by: {dispute.raised_by_name}</span>
                      {dispute.description && <span className="line-clamp-1 max-w-xs">{dispute.description}</span>}
                    </div>
                  </div>
                  <span className="text-ice-300">›</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dispute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ice-900">Open a Dispute</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-ice-400 hover:text-ice-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Transaction</label>
                <select value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})}
                  className="input-field" required>
                  <option value="">Select an active transaction</option>
                  {escrowTransactions.map(txn => (
                    <option key={txn.id} value={txn.id}>
                      {txn.job_title} — ETB {txn.amount?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                  className="input-field">
                  <option value="delivery_issue">Delivery Issue (incomplete/poor quality)</option>
                  <option value="no_delivery">Work Not Delivered</option>
                  <option value="scope_dispute">Scope Dispute (work exceeded agreement)</option>
                  <option value="communication">Communication Breakdown</option>
                  <option value="payment_issue">Payment Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ice-700 mb-1">Description</label>
                <textarea rows={4} value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe the issue in detail. Include any relevant information..."
                  className="input-field" required />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" /> <span><strong>Note:</strong> Opening a dispute will freeze the payment in escrow until an admin reviews and resolves it.</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting || !form.transactionId} className="btn-primary flex-1">
                  {submitting ? 'Submitting...' : 'Open Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedDispute(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ice-900 flex items-center gap-2">
                <Gavel size={22} className="text-gebeya-500" /> Dispute Details
              </h2>
              <button onClick={() => setSelectedDispute(null)} className="text-ice-400 hover:text-ice-700"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-ice-50 rounded-xl p-4">
                  <p className="text-xs text-ice-400 uppercase tracking-wider">Job</p>
                  <p className="font-semibold text-ice-900 mt-1">{selectedDispute.job_title}</p>
                </div>
                <div className="bg-ice-50 rounded-xl p-4">
                  <p className="text-xs text-ice-400 uppercase tracking-wider">Amount</p>
                  <p className="font-semibold text-ice-900 mt-1">ETB {selectedDispute.amount?.toLocaleString()}</p>
                </div>
                <div className="bg-ice-50 rounded-xl p-4">
                  <p className="text-xs text-ice-400 uppercase tracking-wider">Status</p>
                  <p className={`${getStatusColor(selectedDispute.status)} mt-1 inline-block`}>{getStatusLabel(selectedDispute.status)}</p>
                </div>
                <div className="bg-ice-50 rounded-xl p-4">
                  <p className="text-xs text-ice-400 uppercase tracking-wider">Raised By</p>
                  <p className="font-semibold text-ice-900 mt-1">{selectedDispute.raised_by_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-ice-700 mb-1">Reason</p>
                <p className="text-ice-600 bg-ice-50 rounded-xl p-4">{selectedDispute.reason?.replace(/_/g, ' ')}</p>
              </div>

              {selectedDispute.description && (
                <div>
                  <p className="text-sm font-medium text-ice-700 mb-1">Description</p>
                  <p className="text-ice-600 bg-ice-50 rounded-xl p-4 whitespace-pre-wrap">{selectedDispute.description}</p>
                </div>
              )}

              {/* Evidence */}
              {selectedDispute.evidence && JSON.parse(selectedDispute.evidence || '[]').length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ice-700 mb-2">Evidence</p>
                  <div className="space-y-2">
                    {JSON.parse(selectedDispute.evidence).map((ev, i) => (
                      <div key={i} className="bg-ice-50 rounded-xl p-4 text-sm text-ice-600 flex items-start gap-2">
                        <Paperclip size={14} className="mt-0.5 shrink-0" /> {ev}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Evidence (only for dispute raiser while pending/review) */}
              {user?.id === selectedDispute.raised_by && !selectedDispute.status?.startsWith('resolved_') && (
                <div>
                  <p className="text-sm font-medium text-ice-700 mb-2">Add Evidence</p>
                  <div className="flex gap-2">
                    <input type="text" value={evidenceInput}
                      onChange={e => setEvidenceInput(e.target.value)}
                      placeholder="Describe your evidence or paste URLs..."
                      className="input-field flex-1" />
                    <button onClick={handleAddEvidence} disabled={!evidenceInput.trim()}
                      className="btn-primary text-sm">Add</button>
                  </div>
                </div>
              )}

              {selectedDispute.admin_notes && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-purple-700 mb-1 flex items-center gap-1.5"><Edit3 size={14} /> Admin Notes</p>
                  <p className="text-purple-600 text-sm">{selectedDispute.admin_notes}</p>
                </div>
              )}

              {/* Admin: Resolve */}
              {user?.role === 'admin' && !selectedDispute.status?.startsWith('resolved_') && (
                <div className="border-t border-ice-200 pt-4 mt-4">
                  <p className="text-sm font-medium text-ice-700 mb-3 flex items-center gap-1.5"><Gavel size={16} className="text-gebeya-500" /> Resolve Dispute (Admin)</p>
                  <div className="space-y-3">
                    <textarea rows={2} value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Admin notes about this resolution..."
                      className="input-field" />
                    <div className="flex gap-2">
                      <button onClick={() => handleResolveDispute(selectedDispute.id, 'resolved_client')}
                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-medium flex items-center justify-center gap-1.5">
                        <ArrowLeft size={14} /> Refund to Client
                      </button>
                      <button onClick={() => handleResolveDispute(selectedDispute.id, 'resolved_freelancer')}
                        className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all text-sm font-medium flex items-center justify-center gap-1.5">
                        <DollarSign size={14} /> Release to Freelancer
                      </button>
                      <button onClick={() => handleResolveDispute(selectedDispute.id, 'resolved_split')}
                        className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all text-sm font-medium flex items-center justify-center gap-1.5">
                        <Scissors size={14} /> Split 50/50
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
