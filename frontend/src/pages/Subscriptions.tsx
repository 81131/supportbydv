import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { UploadCloud, Check, Shield } from 'lucide-react';

export default function Subscriptions() {
  const navigate = useNavigate();
  const [activeSubs, setActiveSubs] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  
  // Form State
  const [tier, setTier] = useState('beginner');
  const [months, setMonths] = useState(1);
  const [slip, setSlip] = useState<File | null>(null);
  const [moduleId, setModuleId] = useState('');
  const [semesterKey, setSemesterKey] = useState('');
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/me').then(res => setActiveSubs(res.data)).catch(() => {});
    api.get('/modules').then(res => setModules(res.data)).catch(() => {});
  }, []);

  // Determine user's active tiers
  const userHasAdvanced = activeSubs.some(s => s.tier === 'advanced');
  const userHasIntermediate = activeSubs.some(s => s.tier === 'intermediate');
  const userHasBeginner = activeSubs.some(s => s.tier === 'beginner');

  const handleSelectTier = (t: string) => {
    setSelectedTier(t);
    setTier(t);
    // If they have ANY active sub and pick a diff plan, we flag it as an upgrade request
    if (activeSubs.length > 0) setIsUpgrade(true);
    else setIsUpgrade(false);
    
    // Smooth scroll to form
    setTimeout(() => {
      document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slip) { toast.error('Please attach a payment slip (Image or PDF).'); return; }
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('tier', tier);
    formData.append('requested_duration', String(months));
    formData.append('is_upgrade', String(isUpgrade));
    formData.append('slip', slip);
    if (tier === 'beginner' && moduleId) formData.append('module_id', moduleId);
    if (tier === 'intermediate' && semesterKey) formData.append('semester_key', semesterKey);

    try {
      await api.post('/subscriptions/request', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.error('Proof of Payment submitted! Redirecting to history...');
      navigate('/profile#billing');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group modules for selectors
  const uniqueSemesters = Array.from(new Set(modules.map(m => `Y${m.year}S${m.semester}`)));

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="brand-font" style={{ fontSize: '3rem', margin: 0, color: 'var(--text-main)' }}>Choose Your Path</h1>
        <p className="text-desc" style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Gain unlimited access to premium notes, quizzes, and collections.</p>
      </div>

      {activeSubs.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1rem 2rem', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Shield color="var(--accent-gold)" />
          <span>You currently have active subscriptions! Purchasing a new plan will submit an <strong>UPGRADE</strong> request to the Small Council.</span>
        </div>
      )}

      {/* Pricing Cards (W3Schools Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Beginner */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontWeight: 'normal' }}>Beginner</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rs. 500</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>or 10$ Azure Credits / mo</div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Access to 1 specific Module</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Zero Advertisements</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Take Premium Quizzes</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Read Premium Notes</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Track progress efficiently</li>
          </ul>
          
          <button 
            className="btn-ghost" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', border: '1px solid var(--text-main)', color: 'var(--text-main)' }}
            onClick={() => handleSelectTier('beginner')}
            disabled={userHasAdvanced || userHasIntermediate} // Can't go backwards
          >
            {userHasBeginner && !userHasIntermediate && !userHasAdvanced ? "Add Another Module" : (userHasAdvanced || userHasIntermediate ? "Included in your current plan" : "Select Beginner")}
          </button>
        </div>

        {/* Intermediate (Highlighted) */}
        <div style={{ background: 'var(--bg-deep)', border: '2px solid var(--accent-gold)', borderRadius: 12, padding: '2.5rem', display: 'flex', flexDirection: 'column', position: 'relative', transform: 'scale(1.05)', boxShadow: '0 8px 30px rgba(212,175,55,0.15)' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: 'black', padding: '0.2rem 1rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 'bold' }}>
            MOST POPULAR
          </div>
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)', fontWeight: 'normal' }}>Intermediate</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rs. 1500</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>or 15$ Azure Credits / mo</div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> <strong>Everything in Beginner</strong></li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Access to ALL Modules in 1 Semester</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Custom Collections Unlocked</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Generate Vaults efficiently</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Ad-Free viewing across Citadel</li>
          </ul>
          
          <button 
            className="btn-solid-gold" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            onClick={() => handleSelectTier('intermediate')}
            disabled={userHasAdvanced}
          >
           {userHasAdvanced ? "Included in Master" : userHasBeginner ? "Upgrade to Intermediate" : "Select Intermediate"}
          </button>
        </div>

        {/* Master */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontWeight: 'normal' }}>Master</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rs. 2000</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>or 20$ Azure Credits / mo</div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> <strong>Everything in Intermediate</strong></li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Unlimited access to ALL Semesters</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Complete freedom across the Citadel</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Priority support from Maesters</li>
            <li style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><Check color="#4caf50" size={20} /> Infinite premium Quizzes</li>
          </ul>
          
          <button 
            className="btn-ghost" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', border: '1px solid var(--text-main)', color: 'var(--text-main)' }}
            onClick={() => handleSelectTier('advanced')}
            disabled={userHasAdvanced}
          >
            {userHasAdvanced ? "Current Active Plan" : (userHasBeginner || userHasIntermediate) ? "Upgrade to Master" : "Select Master"}
          </button>
        </div>
        
      </div>

      {/* Checkout Form */}
      {selectedTier && (
        <section id="checkout-form" className="subscription-checkout-section" style={{ background: 'var(--bg-surface)', padding: '3rem', borderRadius: 12, border: '1px solid var(--border-dark)', marginTop: '2rem' }}>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem' }}>Complete your transaction: {selectedTier.toUpperCase()}</h2>
          <form onSubmit={submitRequest} className="subscription-checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '2rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Configuration Details</h4>
              
              {selectedTier === 'beginner' && (
                <div>
                  <label className="text-desc">Select Targeted Module</label>
                  <select className="auth-input" style={{ width: '100%' }} value={moduleId} onChange={e => setModuleId(e.target.value)} required>
                    <option value="">-- Choose Module --</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                  </select>
                </div>
              )}
              
              {selectedTier === 'intermediate' && (
                <div>
                  <label className="text-desc">Select Target Semester</label>
                  <select className="auth-input" style={{ width: '100%' }} value={semesterKey} onChange={e => setSemesterKey(e.target.value)} required>
                    <option value="">-- Choose Semester --</option>
                    {uniqueSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-desc">Duration (Months)</label>
                <input type="number" min={1} max={12} className="auth-input" style={{ width: '100%' }} placeholder="E.g., 6" value={months} onChange={e => setMonths(Number(e.target.value))} required />
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Payment Mode</h4>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    1. Bank Transfer (Account: 12345678, Branch: Citadel) <br/>
                    2. Azure Credits (Upload standard transfer proof).
                  </div>
              </div>
            </div>
            
            {/* Upload Area */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed var(--border-dark)', borderRadius: 8, background: 'var(--bg-deep)' }}>
               <UploadCloud size={48} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
               <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>Upload Payment Proof</p>
               <input type="file" onChange={e => e.target.files && setSlip(e.target.files[0])} accept="image/png, image/jpeg, application/pdf" required style={{ width: '100%', maxWidth: '250px' }} />
               <span className="text-desc" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Accepted: .png, .jpg, .pdf max 5MB</span>
               
               <button type="submit" className="btn-solid-gold" style={{ width: '100%', padding: '1rem', marginTop: '2rem' }} disabled={isSubmitting}>
                 {isSubmitting ? 'Securing Transaction...' : `Purchase ${selectedTier.toUpperCase()}`}
               </button>
            </div>

          </form>
        </section>
      )}
    </div>
  );
}
