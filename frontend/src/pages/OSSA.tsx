import React, { useState } from 'react';
import QuizDisplayer from '../components/QuizDisplayer';
import NoteDisplayer from '../components/NoteDisplayer';
import CollectionDisplayer from '../components/CollectionDisplayer';
import { Swords, ScrollText, Library } from 'lucide-react';
import bgImage from '../assets/Ned_Stark_OSSA-bg.jpg'; 

const OSSA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'notes' | 'collections'>('quizzes');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)' }}>
      
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.5), var(--bg-deep)), url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center', padding: '6rem 2rem 4rem', textAlign: 'center',
        transition: 'background 0.4s ease'
      }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          OSSA
        </h1>
        <p style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontFamily: 'var(--font-reading)' }}>
          Operating System & System Administration
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-surface)', transition: 'background-color 0.4s ease, border-color 0.4s ease' }}>
        <button 
          onClick={() => setActiveTab('quizzes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'quizzes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'quizzes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s', fontFamily: 'var(--font-reading)' }}
        >
          <Swords size={20} /> Trials (Quizzes)
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'notes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'notes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s', fontFamily: 'var(--font-reading)' }}
        >
          <ScrollText size={20} /> Scrolls (Notes)
        </button>
        <button 
          onClick={() => setActiveTab('collections')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'collections' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'collections' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'all 0.3s', fontFamily: 'var(--font-reading)' }}
        >
          <Library size={20} /> Archives (Collections)
        </button>
      </div>
      
      <div style={{ flex: 1 }}>
        {activeTab === 'quizzes' && <QuizDisplayer moduleId={1} moduleShortName="OSSA" />}
        {activeTab === 'notes' && <NoteDisplayer moduleId={1} />}
        {activeTab === 'collections' && <CollectionDisplayer />}
      </div>
    </div>
  );
};

export default OSSA;