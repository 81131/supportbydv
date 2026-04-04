import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, BookOpen, ScrollText, Library, Swords, Trophy, Star, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import api from '../api';

// ──────────────────────────────────────────
// Stat Card component
// ──────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number | null; icon: React.ReactNode; color?: string }> = ({
  label, value, icon, color = 'var(--accent-gold)'
}) => (
  <div style={{
    background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
    borderRadius: '12px', padding: '1.5rem', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${color}22`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dark)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
  >
    <div style={{ color, opacity: 0.8 }}>{icon}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: 'var(--font-aesthetic)' }}>
      {value !== null && value !== undefined ? value : '—'}
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</div>
  </div>
);

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    api.get('/auth/profile/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      document.title = `${user.first_name}'s Profile | Citadel`;
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstName.trim()) { alert('First name cannot be empty.'); return; }
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch('/auth/profile', { first_name: firstName, last_name: lastName });
      // Update localStorage so navbar and other places reflect new name immediately
      const updated = { ...user, first_name: res.data.first_name, last_name: res.data.last_name };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setIsEditing(false);
      setSaveMsg('✓ Name saved. It will persist across Google re-logins.');
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--accent-gold)' }}>
      Consulting the records…
    </div>
  );

  const memberSince = stats?.member_since 
    ? new Date(stats.member_since).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : null;

  const roleBadge: Record<string, { label: string; color: string }> = {
    noOne: { label: 'No One', color: '#9b59b6' },
    admin: { label: 'Maester', color: '#e74c3c' },
    verified: { label: 'Verified', color: '#2ecc71' },
    user: { label: 'Scholar', color: 'var(--accent-gold)' },
    student: { label: 'Student', color: '#3498db' },
    faceless: { label: 'Faceless', color: '#7f8c8d' },
  };
  const badge = roleBadge[user.role] || { label: user.role, color: 'var(--accent-gold)' };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* ── Hero Card ── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
        borderRadius: '16px', padding: '2.5rem', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {user.picture ? (
            <img src={user.picture} alt="avatar" style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--accent-gold)' }} />
          ) : (
            <div style={{
              width: 90, height: 90, borderRadius: '50%', background: 'var(--bg-deep)',
              border: '3px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={40} color="var(--accent-gold)" />
            </div>
          )}
        </div>

        {/* Identity */}
        <div style={{ flex: 1 }}>
          {!isEditing ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.8rem' }}>
                  {user.first_name} {user.last_name}
                </h1>
                <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setIsEditing(true)}>
                  <Edit2 size={14} /> Edit Name
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0', fontSize: '0.95rem' }}>{user.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: badge.color + '22', color: badge.color,
                  border: `1px solid ${badge.color}55`, borderRadius: '20px',
                  padding: '0.25rem 0.8rem', fontSize: '0.8rem', fontWeight: 600
                }}>{badge.label}</span>
                {memberSince && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Member since {memberSince}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-desc" style={{ marginBottom: '0.75rem' }}>Update your display name</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="auth-input" style={{ margin: 0 }} placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
                <input className="auth-input" style={{ margin: 0 }} placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-solid-gold" onClick={handleSave} disabled={isSaving} style={{ opacity: isSaving ? 0.5 : 1 }}>
                  <Save size={16} /> {isSaving ? 'Saving…' : 'Save Name'}
                </button>
                <button className="btn-ghost" onClick={() => { setIsEditing(false); setFirstName(user.first_name || ''); setLastName(user.last_name || ''); }}>
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          )}
          {saveMsg && (
            <p style={{ color: '#4caf50', marginTop: '0.5rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={14} /> {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* ── Performance Summary ── */}
      <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        Chronicle of Deeds
      </h2>

      {!stats ? (
        <p className="text-desc" style={{ textAlign: 'center', padding: '2rem' }}>Consulting the Grand Maester's records…</p>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <StatCard label="Quizzes Taken" value={stats.quizzes_taken} icon={<Swords size={28} />} />
            <StatCard label="Quizzes Created" value={stats.quizzes_made} icon={<BookOpen size={28} />} color="#3498db" />
            <StatCard label="Notes Uploaded" value={stats.notes_uploaded} icon={<ScrollText size={28} />} color="#2ecc71" />
            <StatCard label="Collections Made" value={stats.collections_made} icon={<Library size={28} />} color="#e67e22" />
          </div>

          {(stats.avg_score_pct !== null || stats.best_score_pct !== null) && (
            <>
              <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                Battle Honours
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard
                  label="Average Score"
                  value={stats.avg_score_pct !== null ? `${stats.avg_score_pct}%` : null}
                  icon={<Star size={28} />}
                  color="#9b59b6"
                />
                <StatCard
                  label="Best Score"
                  value={stats.best_score_pct !== null ? `${stats.best_score_pct}%` : null}
                  icon={<Trophy size={28} />}
                  color="#f1c40f"
                />
              </div>
            </>
          )}

          {stats.quizzes_taken === 0 && stats.quizzes_made === 0 && stats.notes_uploaded === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              "A Maester's journey begins with the first scroll." — Start taking or creating quizzes to fill your Chronicle.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyProfile;
