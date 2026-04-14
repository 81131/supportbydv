import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import ossaBg from '../assets/OSSA-bg.webp';
import wmtBg from '../assets/WMT-bg.webp';
import psBg from '../assets/PS-bg.webp';

// Inject our custom gallery scroll animation for the main feed
const scrollKeyframes = `
  @keyframes galleryScroll {
    0% { transform: translateX(0); }
    10% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .gallery-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .gallery-scroll::-webkit-scrollbar-thumb {
    background: var(--accent-gold);
    border-radius: 4px;
  }
  .gallery-scroll::-webkit-scrollbar-track {
    background: var(--bg-deep);
  }
`;

export default function Home({ openModal, user }: { openModal: (mode: 'login' | 'register') => void, user: any }) {
  const [feed, setFeed] = useState<any>(null);

  useEffect(() => {
    if (user) {
      api.get('/dashboard/feed').then(res => setFeed(res.data)).catch(console.error);
    } else {
      setFeed(null);
    }
  }, [user]);

  if (user) {
    return (
      <div className="page-container">
        <style>{scrollKeyframes}</style>
        <h1 className="brand-font text-title" style={{ color: 'var(--accent-gold)' }}>The Citadel Feed</h1>
        <p className="text-desc" style={{ marginBottom: '2rem' }}>
          Personalized scrolls and tests for Year {user.current_year || 2}, Semester {user.current_semester || 2}. 
          (Update your preferences in your Profile).
        </p>

        {!feed ? <p>Loading the ravens...</p> : (
          <>
            {feed.quizzes && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 className="brand-font" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-dark)', paddingBottom:'0.5rem' }}>Latest Quizzes</h2>
                {feed.quizzes.length === 0 ? <p className="text-muted">No quizzes available.</p> : (
                  <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0', scrollBehavior: 'smooth' }} className="gallery-scroll">
                    {feed.quizzes.map((q: any) => (
                      <Link key={q.id} to={`/take-quiz/${q.id}`} style={{ textDecoration: 'none', flex: '0 0 auto' }}>
                        <div className="module-card" style={q.card_image_url ? { backgroundImage: `url(${api.defaults.baseURL?.replace('/api', '')}${q.card_image_url})` } : (q.module_code === 'OSSA' ? { backgroundImage: `url(${ossaBg})` } : q.module_code === 'WMT' ? { backgroundImage: `url(${wmtBg})` } : q.module_code === 'PS' ? { backgroundImage: `url(${psBg})` } : {})}>
                          <h2 className="brand-font">{q.module_code}</h2>
                          <p>{q.title}</p>
                          {q.is_premium && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-gold)' }}>★ Premium Quiz</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {feed.notes && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 className="brand-font" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-dark)', paddingBottom:'0.5rem' }}>New Scrolls</h2>
                {feed.notes.length === 0 ? <p className="text-muted">No scrolls available.</p> : (
                  <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0', scrollBehavior: 'smooth' }} className="gallery-scroll">
                    {feed.notes.map((n: any) => (
                      <Link key={n.id} to={`/notes/view/${n.id}`} style={{ textDecoration: 'none', flex: '0 0 auto' }}>
                        <div className="module-card" style={n.card_image_url ? { backgroundImage: `url(${api.defaults.baseURL?.replace('/api', '')}${n.card_image_url})` } : (n.module_code === 'OSSA' ? { backgroundImage: `url(${ossaBg})` } : n.module_code === 'WMT' ? { backgroundImage: `url(${wmtBg})` } : n.module_code === 'PS' ? { backgroundImage: `url(${psBg})` } : {})}>
                          <h2 className="brand-font">{n.module_code}</h2>
                          <p>{n.title}</p>
                          <p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem', color: 'var(--text-muted)' }}>By: {n.uploader_name}</p>
                          {n.is_premium && <p style={{ fontSize: '0.8rem', marginTop: '0.3rem', color: 'var(--accent-gold)' }}>★ Premium Scroll</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {feed.collections && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 className="brand-font" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-dark)', paddingBottom:'0.5rem' }}>Public Archives</h2>
                {feed.collections.length === 0 ? <p className="text-muted">No archives available.</p> : (
                  <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0', scrollBehavior: 'smooth' }} className="gallery-scroll">
                    {feed.collections.map((c: any) => (
                      <Link key={c.id} to={`/collection/${c.id}`} style={{ textDecoration: 'none', flex: '0 0 auto' }}>
                        <div className="module-card" style={c.card_image_url ? { backgroundImage: `url(${api.defaults.baseURL?.replace('/api', '')}${c.card_image_url})` } : (c.module_code === 'OSSA' ? { backgroundImage: `url(${ossaBg})` } : c.module_code === 'WMT' ? { backgroundImage: `url(${wmtBg})` } : c.module_code === 'PS' ? { backgroundImage: `url(${psBg})` } : {})}>
                          <h2 className="brand-font">{c.module_code}</h2>
                          <p>{c.title}</p>
                          {c.is_premium && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-gold)' }}>★ Vaulted Archive</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  // Not logged in
  return (
    <main className="hero" style={{
      minHeight: "calc(100vh - 70px)",
      width: "100%"
    }}>
      <h1 className="hero-title brand-font">Valar Morghulis</h1>
      <p className="hero-subtitle">
        All men should die. But before that, all students must pass. Access your exam preparations, conquer the quizzes, and rise through the leaderboard ranks.
      </p>
      <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }} onClick={() => openModal('login')}>
        Valar Dohaeris!
      </button>
    </main>
  );
}