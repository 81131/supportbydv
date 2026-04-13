import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api';
import { Send } from 'lucide-react';

export default function SubmitAd() {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_number: '',
    duration_months: 1,
    target_semester: '', // '' means Global
    additional_details: '',
  });
  
  const [placeholders, setPlaceholders] = useState({
    left_nav: false,
    right_nav: false,
    top_banner: false,
    middle_banner: false,
    bottom_banner: false,
    mobile_banner: false
  });

  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    
    const desired = Object.entries(placeholders)
        .filter(([_, v]) => v)
        .map(([k, _]) => k)
        .join(',');

    if (!desired) {
        alert("Please select at least one desired placement.");
        setIsSubmitting(false);
        return;
    }

    try {
      await api.post('/ads/request', {
          ...formData,
          target_semester: formData.target_semester || null,
          desired_placeholders: desired
      });
      setStatus('Your campaign proposal has been dispatched. The Maesters will contact you shortly!');
      setFormData({ contact_name: '', contact_number: '', duration_months: 1, target_semester: '', additional_details: '' });
      setPlaceholders({ left_nav: false, right_nav: false, top_banner: false, middle_banner: false, bottom_banner: false, mobile_banner: false });
    } catch (e: any) {
      console.error(e);
      setStatus('Failed to dispatch. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '4rem' }}>
      <h1>Submit Advertisement Proposal</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Propose an ad campaign to the Citadel. If approved, you will be contacted to finalize assets and billing.
      </p>

      {status && (
          <div style={{ background: 'var(--bg-deep)', border: '2px solid var(--accent-gold)', padding: '1.5rem', borderRadius: 8, color: 'var(--accent-gold)', marginBottom: '2rem' }}>
            {status}
          </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contact Name</label>
              <input required type="text" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contact Number</label>
              <input required type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Desired Duration (Months)</label>
                <input required type="number" min="1" max="24" value={formData.duration_months} onChange={e => setFormData({...formData, duration_months: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Target Demographic</label>
                <select value={formData.target_semester} onChange={e => setFormData({...formData, target_semester: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }}>
                    <option value="">Global (All Semesters)</option>
                    <option value="Y1S1">Year 1 Semester 1</option>
                    <option value="Y1S2">Year 1 Semester 2</option>
                    <option value="Y2S1">Year 2 Semester 1</option>
                    <option value="Y2S2">Year 2 Semester 2</option>
                    <option value="Y3S1">Year 3 Semester 1</option>
                    <option value="Y3S2">Year 3 Semester 2</option>
                    <option value="Y4S1">Year 4 Semester 1</option>
                    <option value="Y4S2">Year 4 Semester 2</option>
                </select>
            </div>
        </div>

        <div>
            <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-muted)' }}>Desired Placements</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {Object.keys(placeholders).map((key) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(placeholders as any)[key]} onChange={e => setPlaceholders({...placeholders, [key]: e.target.checked})} />
                        {key.replace('_', ' ').toUpperCase()}
                    </label>
                ))}
            </div>
        </div>

        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Additional Details (Optional)</label>
            <textarea rows={4} value={formData.additional_details} onChange={e => setFormData({...formData, additional_details: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8, resize: 'vertical' }} />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-solid-gold" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} /> {isSubmitting ? 'Dispatching...' : 'Dispatch Proposal'}
        </button>

      </form>
    </div>
  );
}
