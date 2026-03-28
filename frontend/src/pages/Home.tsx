export default function Home({ openModal }: { openModal: (mode: 'login' | 'register') => void }) {
  return (
    <main className="hero" style={{
      /* Note: The exact background URLs and linear-gradients are managed by body.light-theme in App.css, 
         so we only need the structural requirements here. */
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