import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="hero not-found-bg" style={{
      background: "linear-gradient(to bottom, rgba(5, 5, 5, 0.6), rgba(18, 18, 18, 0.9)), url('/Error404Image.png') no-repeat center center",
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
        No one here by that name!
      </h1>
      <h2 className="brand-font" style={{ color: 'var(--text-main)', marginBottom: '2rem' }}>
        Error 404 - Page Not Found
      </h2>
      <p className="hero-subtitle" style={{ marginBottom: '2rem' }}>
        A man has lost his way in the Citadel. Return to the safety of the Great Hall.
      </p>
      <Link to="/" className="btn-primary" style={{ textDecoration: 'none', padding: '1rem 2rem' }}>
        Return Home
      </Link>
    </main>
  );
}