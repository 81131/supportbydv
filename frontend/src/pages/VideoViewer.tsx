import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const VideoViewer: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [streamData, setStreamData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        const res = await api.get(`/videos/stream/${videoId}`);
        setStreamData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load visual archive.");
      }
    };
    fetchStream();
  }, [videoId]);

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 className="brand-font" style={{ color: 'var(--error)' }}>Access Denied</h2>
        <p className="text-desc">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primary" style={{ marginTop: '1rem' }}>Return</button>
      </div>
    );
  }

  if (!streamData) {
    return <div className="page-container">Consulting the Grand Library...</div>;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-deep)', minHeight: '100vh', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 1000, margin: '0 auto', padding: '1rem', background: '#000' }}>
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <iframe
            src={streamData.stream_url}
            loading="lazy"
            style={{
              border: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '100%'
            }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '1.5rem auto 0', color: 'var(--text-main)' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)' }}>{streamData.video_title}</h1>
        {streamData.description && (
          <p className="text-desc" style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
            {streamData.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default VideoViewer;
