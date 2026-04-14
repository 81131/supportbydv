import React, { useEffect, useState } from 'react';
import { PlayCircle, Lock, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface VideoDisplayerProps {
  moduleId: number;
  user?: any;
}

const VideoDisplayer: React.FC<VideoDisplayerProps> = ({ moduleId, user }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const navigate = useNavigate();

  const isPremium = user && ['noOne', 'admin', 'premium_user'].includes(user.role);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get(`/videos/module/${moduleId}`);
        setVideos(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVideos();
  }, [moduleId]);

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* NoOne-only: Forge New Video button */}
      {user?.role === 'noOne' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate('/forge-video')}
            className="btn-solid-gold"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> Forge New Video
          </button>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', margin: '2rem auto', maxWidth: '600px' }}>
          <PlayCircle size={48} style={{ color: 'var(--border-dark)', marginBottom: '1rem' }} />
          <h3 className="brand-font" style={{ color: 'var(--text-muted)' }}>No Archives Found</h3>
          <p className="text-desc">The Grand Maesters have not yet recorded any visual scrolls here.</p>
        </div>
      ) : (
        <div className="feed-grid">
          {videos.map((vid) => {
            const isLocked = vid.is_premium && !isPremium;
            return (
              <div
                key={vid.id}
                className="module-card"
                style={{ padding: '1.5rem', cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'left', position: 'relative', opacity: isLocked ? 0.75 : 1 }}
                onClick={() => {
                  if (isLocked) {
                    navigate('/subscriptions');
                  } else {
                    navigate(`/videos/watch/${vid.id}`);
                  }
                }}
              >
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  {isLocked
                    ? <Lock size={24} color="#f1c40f" />
                    : <PlayCircle size={28} color="var(--accent-gold)" />
                  }
                </div>

                <h3 className="brand-font" style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '0.5rem', paddingRight: '2.5rem' }}>
                  {vid.title}
                </h3>

                {vid.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {vid.description}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                  {isLocked
                    ? <span className="badge" style={{ background: 'rgba(241,196,15,0.15)', color: '#f1c40f', border: '1px solid rgba(241,196,15,0.4)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem' }}>🔒 Premium — Tap to Subscribe</span>
                    : <span className="badge badge-gold">Premium Scroll</span>
                  }
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(vid.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VideoDisplayer;
