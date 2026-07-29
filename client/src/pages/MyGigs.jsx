import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { gigsAPI } from '../utils/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function MyGigs() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    gigsAPI.list({ freelancerId: user?.id })
      .then(res => setGigs(res.data.gigs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gigsAPI.delete(deleteTarget.id);
      setGigs(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete gig:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gebeya-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('gig.my')}</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your service offerings</p>
        </div>
        <Link to="/create-gig" className="btn-primary">{t('gig.create')}</Link>
      </div>

      {gigs.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="text-5xl block mb-4">📋</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('gig.no')}</h3>
          <p className="text-gray-500 mb-6">{t('gig.start')}</p>
          <Link to="/create-gig" className="btn-primary">{t('gig.create')}</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map(gig => (
            <div key={gig.id} className="card p-5 flex items-start gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-green text-xs">{gig.category}</span>
                  {gig.active ? (
                    <span className="badge-green text-xs">Active</span>
                  ) : (
                    <span className="badge-gray text-xs">Inactive</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{gig.title}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{gig.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <span>⏱ {gig.delivery_time} {t('marketplace.days')}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-gebeya-600">ETB {gig.price?.toLocaleString()}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate(`/gigs/${gig.id}`)} className="btn-ghost text-sm">
                    {t('common.view')}
                  </button>
                  <button onClick={() => navigate(`/edit-gig/${gig.id}`)} className="btn-ghost text-gebeya-600 hover:bg-gebeya-50 text-sm">
                    ✏️ Edit
                  </button>
                  <button onClick={() => setDeleteTarget(gig)} className="btn-ghost text-red-500 hover:bg-red-50 text-sm">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Gig"
        message="Are you sure you want to delete this gig? It will be hidden from the marketplace and cannot be undone."
        itemName={deleteTarget?.title}
        loading={deleting}
      />
    </div>
  );
}
