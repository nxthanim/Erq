import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI } from '../utils/api';
import { PageTransition } from '../components/ScrollReveal';
import {
  DollarSign, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, AlertTriangle, Lock, Filter,
  Loader2, Wallet
} from 'lucide-react';

const statusConfig = {
  escrow: { label: 'In Escrow', color: '#b45309', bg: 'rgba(251,225,209,0.3)', icon: Lock },
  confirmed: { label: 'Confirmed', color: '#1f6f5c', bg: 'rgba(251,225,209,0.2)', icon: CheckCircle },
  released: { label: 'Released', color: '#1f6f5c', bg: 'rgba(93,42,26,0.08)', icon: CheckCircle },
  refunded: { label: 'Refunded', color: '#777b86', bg: '#f2f2f3', icon: AlertTriangle },
  disputed: { label: 'Disputed', color: '#777b86', bg: '#f2f2f3', icon: AlertTriangle },
};

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    paymentsAPI.getTransactions()
      .then(res => setTransactions(res.data.transactions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTxns = filter === 'all'
    ? transactions
    : transactions.filter(t => t.status === filter);

  const calculateTotals = () => {
    const totals = { earned: 0, spent: 0, escrow: 0, refunded: 0, count: transactions.length };
    transactions.forEach(t => {
      if (t.freelancer_id === user?.id && t.status === 'released') totals.earned += t.amount;
      if (t.client_id === user?.id && t.status === 'released') totals.spent += t.amount;
      if (t.status === 'escrow') totals.escrow += t.amount;
      if (t.status === 'refunded') totals.refunded += t.amount;
    });
    return totals;
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: '#777b86' }} />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Earned', value: totals.earned, icon: ArrowDownLeft, visible: user?.role !== 'client' },
    { label: 'Total Spent', value: totals.spent, icon: ArrowUpRight, visible: user?.role !== 'freelancer' },
    { label: 'In Escrow', value: totals.escrow, icon: Lock, visible: true },
    { label: 'Transactions', value: totals.count, icon: Wallet, isCount: true, visible: true },
  ].filter(s => s.visible);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[44px] leading-tight tracking-[-0.66px] mb-2" style={{ fontFamily: 'var(--font-signifier)', fontWeight: 400, color: '#173a32' }}>
            Transaction History
          </h1>
          <p style={{ color: '#777b86', fontSize: '17px', lineHeight: 1.35 }}>
            View all your payments, escrows, and releases
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl p-5"
              style={{ backgroundColor: '#f2f2f3' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                  <stat.icon size={18} style={{ color: '#173a32' }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#173a32', fontFamily: 'var(--font-sohne)' }}>
                {stat.isCount ? stat.value : `ETB ${(stat.value || 0).toLocaleString()}`}
              </p>
              <p style={{ color: '#777b86', fontSize: '14px' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span style={{ color: '#777b86', fontSize: '14px', marginRight: '4px' }}>
            <Filter size={14} style={{ display: 'inline' }} /> Filter:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'escrow', label: 'In Escrow' },
            { id: 'released', label: 'Released' },
            { id: 'refunded', label: 'Refunded' },
            { id: 'disputed', label: 'Disputed' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f.id ? '#173a32' : 'transparent',
                color: filter === f.id ? '#ffffff' : '#777b86',
                border: filter === f.id ? 'none' : '1px solid #ececec',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {filteredTxns.length === 0 ? (
          <div className="rounded-3xl p-16 text-center" style={{ backgroundColor: '#fafafb' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f2f2f3' }}>
              <Wallet size={32} style={{ color: '#979799' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#173a32' }}>No transactions found</h3>
            <p style={{ color: '#777b86', fontSize: '15px' }}>
              {filter === 'all' ? 'Your transactions will appear here once you start working.' : `No ${filter} transactions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTxns.map((txn, i) => {
              const cfg = statusConfig[txn.status] || statusConfig.escrow;
              const incoming = txn.freelancer_id === user?.id;
              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-3xl p-5 transition-all"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #f2f2f3' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
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
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            <cfg.icon size={10} /> {cfg.label}
                          </span>
                          <span style={{ color: '#979799', fontSize: '10px' }} className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(txn.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-base font-bold" style={{ color: incoming ? '#1f6f5c' : '#777b86' }}>
                        {incoming ? '+' : '-'} ETB {(txn.amount || 0).toLocaleString()}
                      </p>
                      {txn.telebirr_reference && (
                        <p style={{ color: '#979799', fontSize: '9px', fontFamily: 'monospace', marginTop: '2px' }}>
                          Ref: {txn.telebirr_reference.slice(0, 16)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
