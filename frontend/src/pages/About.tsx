import React from 'react';
import {
  Shield,
  Swords,
  Crown,
  ScrollText,
  Github,
  Linkedin,
  Youtube,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="page-container">
      {/* Hero Header equivalent */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', padding: '2rem 0', borderBottom: '1px solid var(--border-dark)' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0 }}>
          The Maester's Log
        </h1>
        <p className="text-desc" style={{ fontSize: '1.2rem', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto 0' }}>
          "Knowledge is a weapon. Arm yourself well before you ride into battle."
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* --- SECTION 1: Purpose --- */}
        <section className="module-section" style={{ marginBottom: '3rem' }}>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={28} /> Purpose of the Citadel
          </h2>
          <p className="text-desc" style={{ fontSize: '1.1rem', lineHeight: '1.8', marginTop: '1.5rem' }}>
            <strong style={{ color: 'var(--text-main)' }}>Support by DV</strong> was forged in the fires of necessity. Designed exclusively for the scholars facing the rigorous trials of university modules, this platform serves as a collaborative proving ground. Here, students can forge their own exam preparations, test their mettle against strictly timed quizzes, and rise through the ranks to prove their mastery over the curriculum.
          </p>
        </section>

        {/* --- SECTION 2: Features --- */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Swords size={28} /> Features & Arsenal
          </h2>
          
          <div className="grid-view">
            <div className="item-card column">
              <ScrollText color="var(--accent-gold)" size={32} style={{ marginBottom: '1rem' }} />
              <h3 className="text-title" style={{ marginBottom: '0.5rem' }}>Scroll Forging</h3>
              <p className="text-desc">Create dynamic quizzes with timed constraints, negative marking, and multiple question types to simulate real exams.</p>
            </div>

            <div className="item-card column">
              <Crown color="var(--accent-gold)" size={32} style={{ marginBottom: '1rem' }} />
              <h3 className="text-title" style={{ marginBottom: '0.5rem' }}>The Throne Room</h3>
              <p className="text-desc">A fiercely competitive leaderboard that tracks the highest scores and fastest completion times across the realm.</p>
            </div>

            <div className="item-card column">
              <Shield color="var(--accent-gold)" size={32} style={{ marginBottom: '1rem' }} />
              <h3 className="text-title" style={{ marginBottom: '0.5rem' }}>The Small Council</h3>
              <p className="text-desc">A strict governance hierarchy ensuring only high-quality, verified scrolls reach the scholars, actively monitored by the Maesters.</p>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: Allies & Peers --- */}
        <section className="module-section" style={{ marginBottom: '3rem' }}>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LinkIcon size={28} /> Allies of the House
          </h2>
          <p className="text-desc" style={{ marginBottom: '1.5rem' }}>Excellent resources forged by peers to aid in your survival.</p>

          <div className="list-view">
            <a href="https://crowdquiz.vercel.app/" target="_blank" rel="noopener noreferrer" className="item-card row" style={{ textDecoration: 'none' }}>
              <div>
                <strong className="text-title" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.2rem' }}>CrowdQuiz</strong>
                <span className="text-desc" style={{ fontSize: '0.9rem' }}>By Heshan Thenura</span>
              </div>
              <ExternalLink size={20} color="var(--accent-gold)" />
            </a>

            <a href="https://www.youtube.com/@heshanthenura" target="_blank" rel="noopener noreferrer" className="item-card row" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Youtube size={28} color="#ff0000" />
                <div>
                  <strong className="text-title" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.2rem' }}>Heshan Thenura Archives</strong>
                  <span className="text-desc" style={{ fontSize: '0.9rem' }}>YouTube Channel</span>
                </div>
              </div>
              <ExternalLink size={20} color="var(--accent-gold)" />
            </a>
          </div>
        </section>

        {/* --- SECTION 4: The Creator --- */}
        <section>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Crown size={28} /> Forged By
          </h2>

          <div className="module-section" style={{ border: '1px dashed var(--accent-gold)', textAlign: 'center', marginTop: '1.5rem' }}>
            <h3 className="brand-font" style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Dinindu Vishwajith</h3>
            <p className="text-desc" style={{ margin: '0 0 2rem 0' }}>Software Engineer & Student at SLIIT</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <a href="https://github.com/81131" target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                <Github size={20} /> GitHub
              </a>
              <a href="https://www.linkedin.com/in/sgdinindu/" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0077b5', border: '1px solid #0077b5', color: '#fff', textDecoration: 'none' }}>
                <Linkedin size={20} /> LinkedIn
              </a>
              <a href="https://www.youtube.com/@SupportByDV" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ff0000', border: '1px solid #ff0000', color: '#fff', textDecoration: 'none' }}>
                <Youtube size={20} /> YouTube
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default About;