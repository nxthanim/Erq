import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { featuresAPI } from '../utils/api';
import { Zap, Sparkles, TrendingUp, UserPlus, Star, Briefcase, Clock } from 'lucide-react';

const activityConfig = {
  new_gig: {
    icon: <Sparkles size={14} />,
    bg: '#f2f2f3',
    label: 'New Gig',
  },
  job_completed: {
    icon: <Star size={14} />,
    bg: '#f2f2f3',
    label: 'Completed',
  },
  new_job: {
    icon: <Briefcase size={14} />,
    bg: '#f2f2f3',
    label: 'New Job',
  },
  new_review: {
    icon: <Star size={14} />,
    bg: '#f2f2f3',
    label: 'Review',
  },
  new_user: {
    icon: <UserPlus size={14} />,
    bg: '#f2f2f3',
    label: 'New User',
  },
};

function ActivityItem({ activity, index }) {
  const cfg = activityConfig[activity.type] || activityConfig.new_gig;
  const linkTo = activity.type === 'new_gig'
    ? `/gigs/${activity.ref_id}`
    : activity.type === 'new_job'
    ? `/jobs/${activity.ref_id}`
    : activity.type === 'job_completed'
    ? `/jobs/${activity.ref_id}`
    : '#';

  const message = activity.type === 'new_gig'
    ? `listed a new gig: ${activity.title}`
    : activity.type === 'job_completed'
    ? `completed a job for ${activity.client_name}`
    : activity.type === 'new_job'
    ? `posted a new job: ${activity.title}`
    : activity.type === 'new_review'
    ? `received ${activity.rating}★ from ${activity.reviewer_name}`
    : activity.type === 'new_user'
    ? `joined as a ${activity.role || 'freelancer'}!`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
    >
      <Link to={linkTo} className="flex items-start gap-3 p-3 rounded-[16px] transition-all hover:bg-[#fafafb] -mx-1">
        <div className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: cfg.bg, color: '#777b86' }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: '#17191c' }}>
              {activity.user_name}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#777b86' }}>
            {message}
            {activity.price && (
              <span className="font-medium" style={{ color: '#17191c' }}> {activity.price}</span>
            )}
          </p>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#a3a6af' }}>
            <Clock size={10} />
            {activity.timeAgo}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
          style={{ backgroundColor: '#f2f2f3', color: '#777b86' }}>
          {activity.user_picture ? (
            <img src={activity.user_picture} alt="" className="w-full h-full object-cover" />
          ) : (
            activity.user_name?.charAt(0)?.toUpperCase()
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function pluralize(count, singular, plural) {
  const n = Number(count);
  if (isNaN(n)) return plural || singular + 's';
  return n === 1 ? singular : (plural || singular + 's');
}

function FeedStats({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: pluralize(stats.totalUsers, 'Active Member'), value: stats.totalUsers || '—' },
        { label: pluralize(stats.totalGigs, 'Gig Available'), value: stats.totalGigs || '—' },
        { label: pluralize(stats.completedJobs, 'Completed Job'), value: stats.completedJobs || '—' },
      ].map(s => (
        <div key={s.label} className="text-center p-2 rounded-[12px]" style={{ backgroundColor: '#f2f2f3' }}>
          <p className="text-xs font-medium" style={{ color: '#17191c' }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
          <p className="text-xs" style={{ color: '#979799', fontSize: '9px' }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stats, setStats] = useState(null);
  const containerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const [feedRes, statsRes] = await Promise.all([
          featuresAPI.getActivityFeed(),
          featuresAPI.getDashboardStats().catch(() => ({ data: { stats: null } })),
        ]);
        setActivities(feedRes.data.feed || []);
        setStats(statsRes.data.stats || null);
      } catch (err) {
        console.warn('Failed to fetch activity feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();

    pollRef.current = setInterval(async () => {
      try {
        const res = await featuresAPI.getActivityFeed();
        setActivities(res.data.feed || []);
      } catch {}
    }, 30000);

    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (!autoScroll || activities.length === 0 || !containerRef.current) return;
    const container = containerRef.current;
    let scrollInterval;

    const startScroll = () => {
      scrollInterval = setInterval(() => {
        if (!autoScroll) { clearInterval(scrollInterval); return; }
        container.scrollTop += 1;
        if (container.scrollTop >= container.scrollHeight - container.clientHeight - 10) {
          setTimeout(() => { container.scrollTop = 0; }, 2000);
        }
      }, 60);
    };

    const initTimeout = setTimeout(startScroll, 3000);
    return () => { clearTimeout(initTimeout); clearInterval(scrollInterval); };
  }, [autoScroll, activities.length]);

  const handleMouseEnter = () => setAutoScroll(false);
  const handleMouseLeave = () => setAutoScroll(true);

  if (loading) {
    return (
      <div className="rounded-[24px] p-5" style={{ backgroundColor: '#f2f2f3' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#17191c' }} />
          <span className="text-sm font-medium" style={{ color: '#17191c' }}>Live Activity</span>
          <span className="text-xs ml-auto" style={{ color: '#979799' }}>Loading...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-[12px]" style={{ backgroundColor: '#e5e5e7' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded" style={{ backgroundColor: '#e5e5e7', width: '66%' }} />
                <div className="h-2 rounded" style={{ backgroundColor: '#e5e5e7', width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ backgroundColor: '#f2f2f3' }}>
      <div className="px-5 pt-4 pb-2" style={{ borderBottom: '1px solid #e5e5e7' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#17191c' }} />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-25" style={{ backgroundColor: '#17191c' }} />
            </div>
            <h3 className="text-sm font-medium flex items-center gap-1.5" style={{ color: '#17191c' }}>
              Live Activity
            </h3>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#17191c', color: '#ffffff', fontSize: '9px' }}>LIVE</span>
          </div>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${autoScroll ? 'text-white' : ''}`}
            style={{ backgroundColor: autoScroll ? '#17191c' : '#e5e5e7', color: autoScroll ? '#fff' : '#777b86' }}>
            {autoScroll ? 'Auto' : 'Paused'}
          </button>
        </div>
        <p className="text-xs" style={{ color: '#979799' }}>Real-time platform activity</p>
      </div>

      <div className="px-5 pt-3">
        <FeedStats stats={stats} />
      </div>

      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="overflow-y-auto px-4 pb-4 pt-1"
        style={{ maxHeight: 420 }}
      >
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Zap size={24} className="mx-auto mb-2" style={{ color: '#a3a6af' }} />
            <p className="text-sm" style={{ color: '#979799' }}>No recent activity yet</p>
            <p className="text-xs mt-1" style={{ color: '#a3a6af' }}>Activity will appear here as things happen</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence mode="popLayout">
              {activities.map((activity, i) => (
                <ActivityItem key={`${activity.type}-${activity.ref_id}-${i}`} activity={activity} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {activities.length > 5 && (
          <div className="text-center mt-3 pt-2" style={{ borderTop: '1px solid #e5e5e7' }}>
            <Link to="/marketplace" className="text-xs font-medium" style={{ color: '#17191c' }}>
              View all on Marketplace →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
