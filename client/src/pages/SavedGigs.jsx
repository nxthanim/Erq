import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { featuresAPI } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function SavedGigs() {
  const { t } = useLanguage();
  const [savedGigs, setSavedGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    featuresAPI.getSavedGigs()
      .then(res => setSavedGigs(res.data.saved))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (gigId) => {
    setRemovingId(gigId);
    try {
      await featuresAPI.toggleSavedGig(gigId);
      setSavedGigs(prev => prev.filter(g => g.id !== gigId));
    } catch {}
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ice-900">💾 Saved Gigs</h1>
          <p className="text-sm text-ice-400 mt-1">{savedGigs.length} saved gig{savedGigs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {savedGigs.length === 0 ? (
        <div className="text-center py-20 card rounded-2xl">
          <span className="text-5xl block mb-4">💾</span>
          <h3 className="text-xl font-semibold text-ice-900 mb-2">No saved gigs yet</h3>
          <p className="text-ice-400 text-sm mb-6">Browse the marketplace and save gigs you're interested in.</p>
          <Link to="/marketplace" className="btn-primary inline-block">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {savedGigs.map(gig => (
            <div key={gig.id} className="card p-5 group relative overflow-hidden">
              <div className="flex items-start gap-4">
                <Link to={`/gigs/${gig.id}`} className="shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-gebeya-100 to-gebeya-200 rounded-full flex items-center justify-center text-gebeya-700 font-semibold overflow-hidden shadow-sm">
                    {gig.freelancer_picture ? (
                      <img src={gig.freelancer_picture} alt="" className="w-full h-full object-cover" />
                    ) : gig.freelancer_name?.charAt(0)}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/gigs/${gig.id}`}>
                    <h3 className="font-semibold text-ice-900 mb-1 group-hover:text-gebeya-600 transition-colors truncate">{gig.title}</h3>
                  </Link>
                  <p className="text-xs text-ice-400 mb-1">
                    {gig.freelancer_name}
                    <span className="mx-1.5">·</span>
                    <span className="text-yellow-500">★</span> {gig.freelancer_rating?.toFixed(1) || '0.0'}
                  </p>
                  <p className="text-sm text-ice-500 mb-3 line-clamp-2">{gig.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="badge-green text-[10px]">{gig.category}</span>
                    <span className="text-lg font-bold text-gebeya-600">ETB {gig.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleRemove(gig.id)} disabled={removingId === gig.id}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 text-xs"
                title="Remove from saved">
                {removingId === gig.id ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
