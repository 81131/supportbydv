import QuizDisplayer from '../components/QuizDisplayer';
import bgImage from '../assets/dragonglass_cave-WMT-bg.avif'; 

const WMT = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)' }}>
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.4), var(--bg-deep)), url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'top center', padding: '6rem 2rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-dark)'
      }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Web and Mobile Technologies</h1>
        <p style={{ color: '#e0e0e0', fontSize: '1.2rem', marginTop: '1rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>"Fire cannot kill a dragon."</p>
      </div>
      
      <QuizDisplayer moduleId={2} moduleShortName="WMT" />
    </div>
  );
};

export default WMT;