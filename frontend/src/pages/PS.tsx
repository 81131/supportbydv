import { useState } from 'react';
import QuizDisplayer from '../components/QuizDisplayer';
import bgImage from '../assets/Tyrion_PS-bg.avif'; 
import { Swords, ScrollText, Library } from 'lucide-react';
import NoteDisplayer from '../components/NoteDisplayer';
import CollectionDisplayer from '../components/CollectionDisplayer';

const PS = () => {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'notes' | 'collections'>('quizzes');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)' }}>
      
      {/* Hero Section */}
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.4), var(--bg-deep)), url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'top center', padding: '6rem 2rem 4rem', textAlign: 'center'
      }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          Professional Skills
        </h1>
        <p style={{ color: '#e0e0e0', fontSize: '1.2rem', marginTop: '1rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
          "A mind needs books as a sword needs a whetstone."
        </p>
      </div>

      {/* The Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-surface)' }}>
        <button 
          onClick={() => setActiveTab('quizzes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'quizzes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'quizzes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s' }}
        >
          <Swords size={20} /> Trials (Quizzes)
        </button>
        
        <button 
          onClick={() => setActiveTab('notes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'notes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'notes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s' }}
        >
          <ScrollText size={20} /> Scrolls (Notes)
        </button>

        <button 
          onClick={() => setActiveTab('collections')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'collections' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'collections' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s' }}
        >
          <Library size={20} /> Archives (Collections)
        </button>
      </div>
      
      {/* The Content Area */}
      <div style={{ flex: 1 }}>
        {activeTab === 'quizzes' && <QuizDisplayer moduleId={3} moduleShortName="PS" />}
        {activeTab === 'notes' && <NoteDisplayer moduleId={3} />}
        {activeTab === 'collections' && <CollectionDisplayer />}
      </div>

    </div>
  );
};

export default PS;