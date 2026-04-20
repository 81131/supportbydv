import { useEffect } from 'react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <h1 className="text-title brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem' }}>Privacy Policy</h1>
      
      <div className="card" style={{ padding: '2rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
        <p className="text-desc" style={{ marginBottom: '1.5rem' }}>
          Welcome to <strong>SupportByDV (The Citadel)</strong>. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>1. Information We Collect</h2>
        <p>
          We collect information that you provide directly to us, including:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Account Information:</strong> Name, email address, and password when you register.</li>
          <li><strong>Profile Information:</strong> University year, semester, and preferences.</li>
          <li><strong>Activity Data:</strong> Quiz scores, study progress, and interactions with modules.</li>
          <li><strong>Google Data:</strong> If you use Google Login, we receive your name, email, and profile picture URL.</li>
        </ul>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>2. How We Use Your Information</h2>
        <p>
          We use your data to:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Provide and maintain our study services.</li>
          <li>Personalize your dashboard and module recommendations.</li>
          <li>Track your progress and display rankings on the leaderboard.</li>
          <li>Send important notifications (Ravens) regarding your account or academic updates.</li>
        </ul>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>3. Data Storage and Security</h2>
        <p>
          Your data is stored securely on our encrypted servers. We implement industry-standard security measures to prevent unauthorized access, alteration, or disclosure of your personal information.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>4. Third-Party Services</h2>
        <p>
          We use third-party services like <strong>Google OAuth</strong> for authentication and <strong>Cloudflare/R2</strong> for asset storage. These services have their own privacy policies. We do not sell your personal data to third parties.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>5. Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data at any time through your profile settings or by contacting the Small Council (Admin Support).
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>6. Changes to This Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
        </p>

        <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
