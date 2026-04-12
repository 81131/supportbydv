import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Home({ openModal }: { openModal: (mode: 'login' | 'register') => void }) {
  const [user, setUser] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
      api.get('/dashboard/feed').then(res => setFeed(res.data)).catch(console.error);
    }
  }, []);

  if (user) {
    return (
      <div className="page-container">
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
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
                    {feed.quizzes.map((q: any) => (
                      <Link key={q.id} to={`/take-quiz/${q.id}`} className="card" style={{ minWidth: 200, padding: '1rem', border: q.is_premium ? '1px solid var(--accent-gold)' : '' }}>
                        <h4 style={{ margin: '0 0 0.5rem' }}>{q.title}</h4>
                        {q.is_premium && <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>★ Premium</span>}
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
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
                    {feed.notes.map((n: any) => (
                      <Link key={n.id} to={`/notes/view/${n.id}`} className="card" style={{ minWidth: 200, padding: '1rem', border: n.is_premium ? '1px solid var(--accent-gold)' : '' }}>
                        <h4 style={{ margin: '0 0 0.5rem' }}>{n.title}</h4>
                        {n.is_premium && <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>★ Premium</span>}
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
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
                    {feed.collections.map((c: any) => (
                      <Link key={c.id} to={`/collection/${c.id}`} className="card" style={{ minWidth: 200, padding: '1rem', border: c.is_premium ? '1px solid var(--accent-gold)' : '' }}>
                        <h4 style={{ margin: '0 0 0.5rem' }}>{c.title}</h4>
                        {c.is_premium && <span style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>★ Premium</span>}
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