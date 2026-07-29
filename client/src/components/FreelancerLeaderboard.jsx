import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Award, Medal, Eye, Briefcase } from 'lucide-react';
import { usersAPI } from '../utils/api';

const TABS = [
  { id: 'rating', label: 'Top Rated', icon: <Star size={14} /> },
  { id: 'earnings', label: 'Highest Earners', icon: <TrendingUp size={14} /> },
  { id: 'jobs', label: 'Most Jobs', icon: <Briefcase size={14} /> },
];

function LeaderboardCard({ freelancer, rank }) {
  const medals = {
    1: <Trophy size={16} style={{ color: '#5d2a1a' }} />,
    2: <Medal size={16} style={{ color: '#979799' }} />,
    3: <Award size={16} style={{ color: '#a3a6af' }} />,
  };

  return (
    <Link to={`/freelancers/${freelancer.id}`}
      className="flex items-center gap-3 p-3 rounded-[16px] transition-all hover:bg-[#fafafb] group">
      <div className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 font-bold text-sm"
        style={{ color: rank <= 3 ? '#5d2a1a' : '#a3a6af' }}>
        {medals[rank] || <span>#{rank}</span>}
      </div>

      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
        style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
        {freelancer.profile_picture ? (
          <img src={freelancer.profile_picture} alt="" className="w-full h-full object-cover" />
        ) : (
          freelancer.full_name?.charAt(0) || '?'
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#17191c' }}>
          {freelancer.full_name}
        </p>
        <p className="text-xs truncate" style={{ color: '#979799' }}>
          {freelancer.city || 'Ethiopia'} • {freelancer.title || 'Freelancer'}
        </p>
      </div>

      <div className="text-right shrink-0">
        {freelancer.rating && (
          <p className="text-sm font-medium flex items-center gap-1 justify-end" style={{ color: '#17191c' }}>
            <Star size={12} style={{ color: '#5d2a1a' }} />
            {freelancer.rating.toFixed(1)}
          </p>
        )}
        <p className="text-xs" style={{ color: '#979799' }}>
          {freelancer.review_count || 0} reviews
        </p>
      </div>
    </Link>
  );
}

export default function FreelancerLeaderboard() {
  const [activeTab, setActiveTab] = useState('rating');
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    usersAPI.getTopFreelancers(activeTab)
      .then(res => setFreelancers(res.data.freelancers || []))
      .catch(() => setFreelancers([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="overflow-hidden" style={{ backgroundColor: '#f2f2f3', borderRadius: '24px' }}>
      <div className="p-5" style={{ borderBottom: '1px solid #e5e5e7' }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={20} style={{ color: '#5d2a1a' }} />
          <h3 className="text-lg" style={{ fontFamily: 'var(--font-signifier)', color: '#17191c', fontWeight: 400 }}>Top Freelancers</h3>
        </div>

        <div className="flex gap-1.5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-white'
                  : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? '#17191c' : '#e5e5e7',
                color: activeTab === tab.id ? '#ffffff' : '#777b86',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-8 h-8 rounded-[12px]" style={{ backgroundColor: '#e5e5e7' }} />
                <div className="w-10 h-10 rounded-full" style={{ backgroundColor: '#e5e5e7' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded" style={{ backgroundColor: '#e5e5e7', width: '50%' }} />
                  <div className="h-2 rounded" style={{ backgroundColor: '#e5e5e7', width: '33%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : freelancers.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: '#979799' }}>
            <p>No freelancers yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {freelancers.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LeaderboardCard freelancer={f} rank={i + 1} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
