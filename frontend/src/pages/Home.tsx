export default function Home({ openModal }: { openModal: (mode: 'login' | 'register') => void }) {
  return (
    <main className="hero" style={{
      background: "linear-gradient(to bottom, rgba(5, 5, 5, 0.7), rgba(18, 18, 18, 0.95)), url('/hall-of-faces.webp') no-repeat center center",
      backgroundSize: "cover",
      minHeight: "calc(100vh - 70px)",
      width: "100%"
    }}>
      <h1 className="hero-title">Valar Morghulis</h1>
      <p className="hero-subtitle">
        All men should die. But before that, all students must pass. Access your exam preparations, conquer the quizzes, and rise through the leaderboard ranks.
      </p>
      <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.2rem' }} onClick={() => openModal('login')}>
        Valar Dohaeris!
      </button>
    </main>
  );
}