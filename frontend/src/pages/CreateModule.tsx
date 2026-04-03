import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Save, ArrowLeft } from 'lucide-react';
import api from '../api';

const CreateModule: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      alert('Please provide a module name and code.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/modules/', { name, code, year, semester });
      alert('Module successfully forged.');
      navigate('/');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to forge module.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={20} /> Back
        </button>

        <div className="module-section">
          <h1 className="brand-font" style={{ textAlign: 'center', color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <BookMarked size={32} /> Forge a New Module
          </h1>

          <p className="text-desc" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Only the Small Council (No One and Admins) possesses the power to decree new paths of study.
          </p>

          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Name</label>
              <input 
                type="text" 
                className="auth-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., Operating System & System Administration" 
                autoFocus
              />
            </div>

            <div>
              <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Module Code</label>
              <input 
                type="text" 
                className="auth-input" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="e.g., OSSA, WMT, PS" 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Year</label>
                <input 
                  type="number" 
                  className="auth-input" 
                  value={year} 
                  onChange={(e) => setYear(Number(e.target.value))} 
                  min="1" 
                  max="10" 
                />
              </div>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Semester</label>
                <input 
                  type="number" 
                  className="auth-input" 
                  value={semester} 
                  onChange={(e) => setSemester(Number(e.target.value))} 
                  min="1" 
                  max="10" 
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-solid-gold" style={{ padding: '1rem', fontSize: '1.1rem', justifyContent: 'center', opacity: isSubmitting ? 0.5 : 1, marginTop: '1rem' }}>
              <Save size={20} /> {isSubmitting ? 'Forging...' : 'Forge Module'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateModule;
