import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ 
        background: 'var(--bg-deep)', 
        borderTop: '1px solid var(--border-dark)', 
        padding: '3rem 2rem',
        marginTop: 'auto'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'space-between' }}>
        
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             SupportByDV
          </h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The Citadel of Knowledge. Mastering academics one module at a time.
          </p>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <h4 style={{ marginBottom: '1rem', color: 'white' }}>Platform</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li><Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link></li>
            <li><Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About The Citadel</Link></li>
            <li><Link to="/subscriptions" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Subscriptions</Link></li>
            <li><Link to="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link></li>
          </ul>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <h4 style={{ marginBottom: '1rem', color: 'white' }}>Business & Support</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li><Link to="/submit-ad" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Submit Advertisement</Link></li>
            <li><Link to="/business-contact" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contact For Business</Link></li>
          </ul>
        </div>
        
      </div>
      <div style={{ maxWidth: '1200px', margin: '3rem auto 0 auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-dark)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} SupportByDV. All rights reserved.
      </div>
    </footer>
  );
}
