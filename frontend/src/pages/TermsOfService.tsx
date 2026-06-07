import { useEffect } from 'react';

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <h1 className="text-title brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem' }}>Terms of Service</h1>
      
      <div className="card" style={{ padding: '2rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
        <p className="text-desc" style={{ marginBottom: '1.5rem' }}>
          Welcome to <strong>SupportByDV (The Citadel)</strong>. By accessing or using our website, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using our platform, you agree to comply with and be legally bound by these terms. If you do not agree to these terms, you may not access or use the service.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>2. Use of the Service</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>You must provide accurate and complete information when creating an account.</li>
          <li>You are responsible for safeguarding your password and any activities under your account.</li>
          <li>You agree not to use the service for any illegal, unauthorized, or disruptive purposes.</li>
        </ul>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>3. User Content</h2>
        <p>
          Our platform allows users to upload, share, and interact with study materials (scrolls). You retain ownership of your content, but you grant SupportByDV a license to use, store, and display your content to provide the service. You agree not to upload copyrighted materials without permission.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>4. Analytics & Tracking</h2>
        <p>
          We utilize third-party analytics tools, including Google Analytics, to track and report website traffic. By using our service, you acknowledge and consent to the collection and processing of your data by these third-party tools as outlined in our Privacy Policy.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>5. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the service, us, or third parties, or for any other reason.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>6. Limitation of Liability</h2>
        <p>
          SupportByDV is provided "as is" and "as available". We make no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the service. We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the platform.
        </p>

        <h2 style={{ color: 'var(--accent-gold)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.4rem' }}>7. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms of Service at any time. Your continued use of the service following any changes constitutes your acceptance of the new terms.
        </p>

        <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
