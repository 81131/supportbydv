import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <main className="hero not-found-bg" style={{
      background: "linear-gradient(to bottom, rgba(5, 5, 5, 0.6), rgba(18, 18, 18, 0.9)), url('/Forbidden.avif') no-repeat center center",
      backgroundSize: "cover",
      minHeight: "calc(100vh - 70px)",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center"
    }}>
      <h1 className="hero-title" style={{ fontSize: '3.5rem', color: 'var(--accent-red)' }}>
        You cannot pass ser!
      </h1>
      <h2 className="brand-font" style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        Prepare to wars to come
      </h2>
      <p className="hero-subtitle" style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
        Error 403 - Forbidden
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none', padding: '1rem 2rem' }}>
        Return Home
      </Link>
    </main>
  );
}