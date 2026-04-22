import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Key, Plus, Trash2, Eye, EyeOff, Check, X, ArrowLeft, ToggleLeft, ToggleRight, AlertCircle, Shield } from 'lucide-react';

interface ApiKey {
  id: number;
  label: string;
  key_hint: string;
  is_active: boolean;
  created_at: string;
}

const ApiKeySettings: React.FC = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const showFlash = (message: string, type: 'success' | 'error') => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 3500);
  };

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api-keys/me');
      setKeys(res.data);
    } catch (e) {
      showFlash('Failed to load API keys.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    setAdding(true);
    try {
      const res = await api.post('/api-keys/me', { raw_key: newKey.trim(), label: newLabel.trim() || undefined });
      showFlash('API key saved securely to the vault!', 'success');
      setNewKey('');
      setNewLabel('');
      await fetchKeys();
    } catch (e: any) {
      showFlash(e?.response?.data?.detail || 'Failed to save key.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api-keys/me/${id}`);
      showFlash('Key removed from the vault.', 'success');
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (e) {
      showFlash('Failed to delete key.', 'error');
    }
  };

  const handleToggle = async (key: ApiKey) => {
    try {
      await api.put(`/api-keys/me/${key.id}`, { is_active: !key.is_active });
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, is_active: !k.is_active } : k));
    } catch (e) {
      showFlash('Failed to update key.', 'error');
    }
  };

  const handleEditSave = async (id: number) => {
    try {
      await api.put(`/api-keys/me/${id}`, { label: editLabel });
      setKeys(prev => prev.map(k => k.id === id ? { ...k, label: editLabel } : k));
      setEditingId(null);
      showFlash('Label updated.', 'success');
    } catch (e) {
      showFlash('Failed to update label.', 'error');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '760px', margin: '0 auto', paddingTop: '2rem' }}>

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          backgroundColor: flash.type === 'error' ? 'var(--accent-red)' : '#2e7d32',
          color: '#fff', padding: '0.9rem 2rem', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontWeight: 'bold', fontSize: '0.95rem'
        }}>
          {flash.type === 'error' ? <X size={18} /> : <Check size={18} />}
          {flash.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        <button className="btn-ghost" style={{ padding: '0.4rem 0.8rem' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '2rem' }}>
            Gemini API Keys
          </h1>
          <p className="text-desc" style={{ margin: '0.3rem 0 0 0' }}>
            Your personal AI keys — stored encrypted, never visible to others.
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div style={{
        background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)',
        borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '2rem',
        display: 'flex', gap: '0.8rem', alignItems: 'flex-start'
      }}>
        <Shield size={20} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p className="text-desc" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
            Keys are encrypted using AES-256 (Fernet) before storage. They are <strong>never</strong> returned in
            plaintext after saving. Only you can manage your keys. AI features (essay auto-grading & The Maester
            assistant) use your active keys automatically, rotating between them if rate limits are hit.
          </p>
        </div>
      </div>

      {/* Add new key form */}
      <div className="module-section" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginTop: 0, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add New Key
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <input
            className="auth-input"
            placeholder="Label (e.g. My Main Key)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            style={{ margin: 0 }}
          />
          <div style={{ position: 'relative' }}>
            <input
              className="auth-input"
              type={showNewKey ? 'text' : 'password'}
              placeholder="Paste Gemini API key (starts with AIza...)"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              style={{ margin: 0, paddingRight: '3rem', fontFamily: 'monospace' }}
            />
            <button
              onClick={() => setShowNewKey(v => !v)}
              style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showNewKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            className="btn-solid-gold"
            onClick={handleAdd}
            disabled={!newKey.trim() || adding}
            style={{ alignSelf: 'flex-start', opacity: (!newKey.trim() || adding) ? 0.5 : 1 }}
          >
            <Key size={16} style={{ marginRight: '0.4rem' }} />
            {adding ? 'Sealing in vault…' : 'Save Key'}
          </button>
        </div>
      </div>

      {/* Existing keys list */}
      <div>
        <h3 className="brand-font" style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Stored Keys ({keys.length}/5)
        </h3>

        {loading ? (
          <p className="text-desc">Consulting the vault...</p>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px dashed var(--border-dark)' }}>
            <Key size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
            <p className="text-desc">No keys stored yet. Add your first Gemini API key above.</p>
            <p className="text-desc" style={{ fontSize: '0.85rem' }}>
              Get a free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent-gold)' }}>
                Google AI Studio →
              </a>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {keys.map(key => (
              <div key={key.id} style={{
                background: 'var(--bg-surface)', border: `1px solid ${key.is_active ? 'var(--border-dark)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px', padding: '1rem 1.2rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                opacity: key.is_active ? 1 : 0.55, transition: 'all 0.2s'
              }}>
                <Key size={20} color={key.is_active ? 'var(--accent-gold)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === key.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        className="auth-input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        style={{ margin: 0, padding: '0.3rem 0.6rem', fontSize: '0.9rem', flex: 1 }}
                        autoFocus
                      />
                      <button className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleEditSave(key.id)}><Check size={16} color="#4caf50" /></button>
                      <button className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditingId(null)}><X size={16} color="var(--accent-red)" /></button>
                    </div>
                  ) : (
                    <div
                      className="text-title"
                      style={{ fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => { setEditingId(key.id); setEditLabel(key.label); }}
                    >
                      {key.label}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(click to rename)</span>
                    </div>
                  )}
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {key.key_hint}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Added {new Date(key.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    title={key.is_active ? 'Disable key' : 'Enable key'}
                    onClick={() => handleToggle(key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {key.is_active
                      ? <ToggleRight size={28} color="var(--accent-gold)" />
                      : <ToggleLeft size={28} color="var(--text-muted)" />}
                  </button>
                  <button
                    className="btn-ghost"
                    title="Delete key"
                    onClick={() => handleDelete(key.id)}
                    style={{ padding: '0.4rem', color: 'var(--accent-red)', borderColor: 'transparent' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA if no keys */}
      {!loading && keys.filter(k => k.is_active).length === 0 && keys.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
          <AlertCircle size={16} />
          All keys are disabled. Enable at least one key to use AI features.
        </div>
      )}
    </div>
  );
};

export default ApiKeySettings;
