import { useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api';
import { Send, Briefcase } from 'lucide-react';

export default function BusinessContact() {
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    company: '',
    message: '',
  });

  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    
    try {
      await api.post('/support/business-contact', formData);
      setStatus('Message sent successfully! We will get back to you shortly.');
      setFormData({ contact_name: '', contact_email: '', company: '', message: '' });
    } catch (e: any) {
      console.error(e);
      setStatus('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '4rem', minHeight: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
         <Briefcase size={40} color="var(--accent-gold)" />
         <h1 style={{ margin: 0 }}>Contact For Business</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Looking to customize and deploy this platform for your own educational institution or use case? Reach out to our master artisans.
      </p>

      {status && (
          <div style={{ background: 'var(--bg-deep)', border: '2px solid var(--accent-gold)', padding: '1.5rem', borderRadius: 8, color: 'var(--accent-gold)', marginBottom: '2rem' }}>
            {status}
          </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contact Name</label>
              <input required type="text" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input required type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
            </div>
        </div>

        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Company / Institution (Optional)</label>
            <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8 }} />
        </div>

        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Your Requirements</label>
            <textarea required rows={6} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Describe your use case or customization needs..." style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', borderRadius: 8, resize: 'vertical' }} />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-solid-gold" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} /> {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>

      </form>
    </div>
  );
}
