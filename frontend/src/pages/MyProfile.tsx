import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, BookOpen, ScrollText, Library, Swords, Trophy, Star, ArrowLeft, Edit2, Check, X, Linkedin, Github, Instagram, Facebook, Mail, Key } from 'lucide-react';
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
  const [achievements, setAchievements] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [linkedin_url, setLinkedin] = useState('');
  const [github_url, setGithub] = useState('');
  const [instagram_url, setInstagram] = useState('');
  const [facebook_url, setFacebook] = useState('');
  const [public_email, setPublicEmail] = useState('');
  const [currentYear, setCurrentYear] = useState<number>(2);
  const [currentSemester, setCurrentSemester] = useState<number>(2);
  
  // preferences
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [hiddenModules, setHiddenModules] = useState<number[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // API Keys Management
  const [personalKeys, setPersonalKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isKeyLoading, setIsKeyLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    api.get('/auth/profile/stats').then(res => setStats(res.data)).catch(console.error);
    api.get('/users/me/achievements').then(res => setAchievements(res.data)).catch(console.error);
    api.get('/subscriptions/history/me').then(res => setPaymentHistory(res.data)).catch(console.error);
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api-keys/me');
      setPersonalKeys(res.data);
    } catch { }
  };

  const handleAddKey = async () => {
    if (!newKeyValue.trim()) return;
    setIsKeyLoading(true);
    try {
      await api.post('/api-keys/me', { label: newKeyLabel || 'Primary Key', raw_key: newKeyValue });
      setNewKeyLabel('');
      setNewKeyValue('');
      fetchKeys();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add key.");
    } finally {
      setIsKeyLoading(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm("Are you sure? This will disable AI auto-grading and The Maester.")) return;
    setIsKeyLoading(true);
    try {
      await api.delete(`/api-keys/me/${id}`);
      fetchKeys();
    } catch { } finally {
      setIsKeyLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setBio(user.bio || '');
      setLinkedin(user.linkedin_url || '');
      setGithub(user.github_url || '');
      setInstagram(user.instagram_url || '');
      setFacebook(user.facebook_url || '');
      setPublicEmail(user.public_email || '');
      setCurrentYear(user.current_year ?? 2);
      setCurrentSemester(user.current_semester ?? 2);
      
      const prefs = user.preferences || {};
      setHiddenSections(prefs.hidden_sections || []);
      setHiddenModules(prefs.hidden_modules || []);
      
      document.title = `${user.first_name}'s Profile | Citadel`;
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstName.trim()) { toast.error('First name cannot be empty.'); return; }
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch('/auth/profile', { 
        first_name: firstName, 
        last_name: lastName,
        bio: bio,
        linkedin_url: linkedin_url,
        github_url: github_url,
        instagram_url: instagram_url,
        facebook_url: facebook_url,
        public_email: public_email,
        current_year: currentYear,
        current_semester: currentSemester,
        preferences: { hidden_sections: hiddenSections, hidden_modules: hiddenModules }
      });
      // Update localStorage so navbar and other places reflect new name immediately
      const updated = { 
        ...user, 
        first_name: res.data.first_name, 
        last_name: res.data.last_name,
        bio: res.data.bio,
        linkedin_url: res.data.linkedin_url,
        github_url: res.data.github_url,
        instagram_url: res.data.instagram_url,
        facebook_url: res.data.facebook_url,
        public_email: res.data.public_email,
        current_year: res.data.current_year,
        current_semester: res.data.current_semester,
        preferences: res.data.preferences
      };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new Event('user-updated'));
      setIsEditing(false);
      setSaveMsg('✓ Name saved. It will persist across Google re-logins.');
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save.');
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
            <img src={user.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid var(--accent-gold)' }} />
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
                  <Edit2 size={14} /> Edit Profile
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
                <button 
                  onClick={() => navigate('/api-keys')}
                  className="btn-ghost" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--accent-gold)', borderColor: 'rgba(255,215,0,0.3)' }}
                >
                  <Key size={14} style={{ marginRight: '0.3rem' }} /> Gemini Keys
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-desc" style={{ marginBottom: '0.75rem' }}>Update your display profile</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="auth-input" style={{ margin: 0 }} placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
                <input className="auth-input" style={{ margin: 0 }} placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <textarea 
                className="auth-input" 
                style={{ margin: '0 0 0.75rem 0', minHeight: '80px', resize: 'vertical' }} 
                placeholder="Biography..." 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input className="auth-input" style={{ margin: 0 }} placeholder="LinkedIn URL" value={linkedin_url} onChange={e => setLinkedin(e.target.value)} />
                <input className="auth-input" style={{ margin: 0 }} placeholder="GitHub URL" value={github_url} onChange={e => setGithub(e.target.value)} />
                <input className="auth-input" style={{ margin: 0 }} placeholder="Instagram URL" value={instagram_url} onChange={e => setInstagram(e.target.value)} />
                <input className="auth-input" style={{ margin: 0 }} placeholder="Facebook URL" value={facebook_url} onChange={e => setFacebook(e.target.value)} />
                <input className="auth-input" style={{ margin: 0, gridColumn: 'span 2' }} placeholder="Public Email Address" type="email" value={public_email} onChange={e => setPublicEmail(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                    <label className="text-desc" style={{display:'block', marginBottom:'0.3rem'}}>Current Year</label>
                    <select className="auth-input" style={{ margin: 0 }} value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))}>
                        <option value={1}>Year 1</option>
                        <option value={2}>Year 2</option>
                        <option value={3}>Year 3</option>
                        <option value={4}>Year 4</option>
                    </select>
                </div>
                <div>
                    <label className="text-desc" style={{display:'block', marginBottom:'0.3rem'}}>Current Semester</label>
                    <select className="auth-input" style={{ margin: 0 }} value={currentSemester} onChange={e => setCurrentSemester(Number(e.target.value))}>
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                    </select>
                </div>
              </div>

              {/* API Keys Section inside Edit Mode */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(212,175,55,0.05)', borderRadius: '12px', border: '1px solid var(--border-dark)' }}>
                <h3 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Key size={18}/> Gemini API Keys
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                  {personalKeys.map(k => (
                    <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{k.label} (AIza...****)</span>
                      <button onClick={() => handleDeleteKey(k.id)} style={{ color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14}/></button>
                    </div>
                  ))}
                  {personalKeys.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No keys configured. The Maester is disabled.</p>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="auth-input" 
                    placeholder="Key Label" 
                    value={newKeyLabel} 
                    onChange={e => setNewKeyLabel(e.target.value)}
                    style={{ margin: 0, flex: 1 }}
                  />
                  <input 
                    className="auth-input" 
                    type="password"
                    placeholder="AIza... key" 
                    value={newKeyValue} 
                    onChange={e => setNewKeyValue(e.target.value)}
                    style={{ margin: 0, flex: 2 }}
                  />
                  <button onClick={handleAddKey} disabled={isKeyLoading || !newKeyValue.trim()} className="btn-solid-gold" style={{ padding: '0 1rem', fontSize: '0.8rem' }}>
                    {isKeyLoading ? '...' : 'Add'}
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Keys are used for auto-grading your essay questions and powering The Maester.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-solid-gold" onClick={handleSave} disabled={isSaving} style={{ opacity: isSaving ? 0.5 : 1 }}>
                  <Save size={16} /> {isSaving ? 'Saving…' : 'Save Profile'}
                </button>
                <button className="btn-ghost" onClick={() => { 
                  setIsEditing(false); 
                  setFirstName(user.first_name || ''); 
                  setLastName(user.last_name || ''); 
                  setBio(user.bio || '');
                  setLinkedin(user.linkedin_url || '');
                  setGithub(user.github_url || '');
                  setInstagram(user.instagram_url || '');
                  setFacebook(user.facebook_url || '');
                  setPublicEmail(user.public_email || '');
                  setCurrentYear(user.current_year ?? 2);
                  setCurrentSemester(user.current_semester ?? 2);
                  const prefs = user.preferences || {};
                  setHiddenSections(prefs.hidden_sections || []);
                  setHiddenModules(prefs.hidden_modules || []);
                }}>
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

      {/* ── Bio & Links Panel (View Mode) ── */}
      {!isEditing && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
          borderRadius: '16px', padding: '2rem', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="brand-font" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.2rem' }}>About Scroll</h3>
            {!(user.bio || user.linkedin_url || user.github_url || user.instagram_url || user.facebook_url || user.public_email) && (
              <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setIsEditing(true)}>
                <Edit2 size={14} /> Add Bio & Links
              </button>
            )}
          </div>
          
          {user.bio ? (
            <p style={{ color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{user.bio}</p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem', fontSize: '0.9rem' }}>No biography written yet. Click 'Edit Profile' to establish your identity in the Citadel.</p>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {user.linkedin_url && <a href={user.linkedin_url.startsWith('http') ? user.linkedin_url : `https://${user.linkedin_url}`} target="_blank" rel="noreferrer" style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Linkedin size={16}/> LinkedIn</a>}
            {user.github_url && <a href={user.github_url.startsWith('http') ? user.github_url : `https://${user.github_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Github size={16}/> GitHub</a>}
            {user.instagram_url && <a href={user.instagram_url.startsWith('http') ? user.instagram_url : `https://${user.instagram_url}`} target="_blank" rel="noreferrer" style={{ color: '#e1306c', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Instagram size={16}/> Instagram</a>}
            {user.facebook_url && <a href={user.facebook_url.startsWith('http') ? user.facebook_url : `https://${user.facebook_url}`} target="_blank" rel="noreferrer" style={{ color: '#1877f2', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Facebook size={16}/> Facebook</a>}
            {user.public_email && <a href={`mailto:${user.public_email}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Mail size={16}/> Email</a>}
          </div>
        </div>
      )}

      {/* ── Performance Summary ── */}
      <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        Chronicle of Deeds
      </h2>

      {!stats ? (
        <p className="text-desc" style={{ textAlign: 'center', padding: '2rem' }}>Consulting the Grand Maester's records…</p>
      ) : (
        <>
          <div className="profile-stats-grid" style={{
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
              <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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

      {/* ── Payment History ── */}
      <section id="billing" style={{ scrollMarginTop: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.2rem' }}>
            Payment History
          </h2>
          <button className="btn-ghost" onClick={() => navigate('/subscriptions')} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
             Purchase / Upgrade Plan
          </button>
        </div>
        
        {paymentHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-dark)', marginBottom: '2rem' }}>
            No purchase records found in the Citadel ledger.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {paymentHistory.map(record => (
              <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1.2rem 1.5rem', borderRadius: 12, border: '1px solid var(--border-dark)' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    {record.tier.toUpperCase()} Plan (x{record.requested_duration} M)
                    {record.is_upgrade && <span style={{ background: 'var(--accent-gold)', color: 'black', padding: '0.1rem 0.5rem', borderRadius: 12, fontSize: '0.7rem' }}>UPGRADE</span>}
                  </div>
                  <div className="text-desc" style={{ fontSize: '0.85rem' }}>
                    Placed on {new Date(record.created_at).toLocaleDateString()} via {record.payment_method}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {record.status === 'pending' && <span style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '0.9rem' }}>Verification Pending</span>}
                  {record.status === 'approved' && <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' }}>Approved</span>}
                  {record.status === 'rejected' && <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '0.9rem' }}>Rejected</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Honours & Badges ── */}
      <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        Honours &amp; Badges
      </h2>
      {achievements.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
          borderRadius: '12px', padding: '2.5rem', textAlign: 'center',
          color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '2rem'
        }}>
          No badges earned yet. Complete quizzes and engage with the Citadel to earn honours.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {achievements.map((ack: any) => (
            <div key={ack.ua_id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
              borderRadius: '12px', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-gold)', opacity: ack.priority === 1 ? 1 : 0.4 }}></div>

              {/* Badge with frame animation */}
              <div className={`avatar-wrapper ${ack.frame_name || ''}`} style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
                {ack.badge_image_url ? (
                  <img src={ack.badge_image_url} alt={ack.name}
                    style={{ display: 'block', width: '64px', height: '64px', objectFit: 'contain', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={36} color={ack.priority === 1 ? '#f1c40f' : 'var(--accent-gold)'} />
                  </div>
                )}
              </div>

              <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>{ack.name}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.4 }}>{ack.description}</p>

              {/* Priority selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority:</label>
                <select
                  value={ack.priority}
                  onChange={async (e) => {
                    const newPriority = parseInt(e.target.value);
                    try {
                      await api.patch(`/users/me/achievements/${ack.ua_id}/priority`, { priority: newPriority });
                      setAchievements(prev =>
                        [...prev.map((a: any) => a.ua_id === ack.ua_id ? { ...a, priority: newPriority } : a)]
                          .sort((a: any, b: any) => {
                            const pa = a.priority === 0 ? 99999 : a.priority;
                            const pb = b.priority === 0 ? 99999 : b.priority;
                            return pa - pb;
                          })
                      );
                    } catch { toast.error('Could not update priority.'); }
                  }}
                  style={{
                    background: 'var(--bg-deep)', border: '1px solid var(--border-dark)',
                    color: 'var(--text-main)', borderRadius: '6px', padding: '0.2rem 0.4rem',
                    fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n === 0 ? '0 (lowest)' : n === 1 ? '1 (highest)' : n}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default MyProfile;
