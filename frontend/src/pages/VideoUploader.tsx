import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShieldAlert } from 'lucide-react';
import { AdWrapper } from '../components/AdWrapper';

const VideoUploader: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '', description: '', bunny_video_id: '', module_id: '', year: '2', semester: '2', topic_ids: ''
  });
  const [modules, setModules] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    api.get('/modules').then(res => setModules(res.data)).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/videos/upload', {
        title: formData.title,
        description: formData.description,
        bunny_video_id: formData.bunny_video_id,
        module_id: parseInt(formData.module_id),
        year: parseInt(formData.year),
        semester: parseInt(formData.semester),
        topic_ids: formData.topic_ids
      });
      alert('Premium Video Linked Successfully!');
      setFormData({ title: '', description: '', bunny_video_id: '', module_id: '', year: '2', semester: '2', topic_ids: '' });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to link video.');
    }
  };

  if (!user || user.role !== 'noOne') {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <ShieldAlert size={64} color="var(--error)" />
        <h1 className="brand-font text-title" style={{ color: 'var(--error)' }}>Unworthy.</h1>
        <p className="text-desc">This chamber is sealed to all but No One.</p>
      </div>
    );
  }

  return (
    <AdWrapper>
      <div className="page-container">
        <h1 className="brand-font text-title" style={{ color: 'var(--accent-gold)' }}>Forge Premium Video (Bunny.net)</h1>
        <p className="text-desc" style={{ marginBottom: '2rem' }}>Link a Bunny Stream GUID to the Citadel.</p>

        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} required className="input" placeholder="e.g. Memory Management Lecture" />
          </div>
          <div>
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input" rows={3} placeholder="Brief summary..." />
          </div>
          <div>
            <label>Bunny Video GUID</label>
            <input name="bunny_video_id" value={formData.bunny_video_id} onChange={handleChange} required className="input" placeholder="e.g. 73045180-7e45-401a-9cc7-1077522ee4cb" />
          </div>
          <div>
            <label>Module</label>
            <select name="module_id" value={formData.module_id} onChange={handleChange} required className="input">
              <option value="">Select Module...</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Year</label>
              <input name="year" type="number" value={formData.year} onChange={handleChange} required className="input" min="1" max="4" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Semester</label>
              <input name="semester" type="number" value={formData.semester} onChange={handleChange} required className="input" min="1" max="2" />
            </div>
          </div>
          <button type="submit" className="btn-solid-gold" style={{ marginTop: '1rem' }}>Link Video Manifest</button>
        </form>
      </div>
    </AdWrapper>
  );
};
export default VideoUploader;
