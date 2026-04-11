import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Medal, ArrowLeft, BookOpen, Clock, Activity, Calendar, Linkedin, Github, Instagram, Facebook, Mail } from 'lucide-react';
import api from '../api';

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/users/${id}/public`);
        setProfileData(res.data);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.detail || "Could not fetch the scroll. The records might be lost.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--accent-gold)' }}>Seeking the Maester's records...</div>;
  }

  if (errorMsg || !profileData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>{errorMsg || "Profile not found"}</h2>
        <button className="btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Return to previous hall</button>
      </div>
    );
  }

  const { user, stats, achievements } = profileData;

  const roleBadge: Record<string, { label: string; color: string }> = {
    noOne: { label: 'No One', color: '#9b59b6' },
    admin: { label: 'Maester', color: '#e74c3c' },
    verified: { label: 'Verified', color: '#2ecc71' },
    user: { label: 'Scholar', color: 'var(--accent-gold)' },
    student: { label: 'Student', color: '#3498db' },
    faceless: { label: 'Faceless', color: '#7f8c8d' },
  };
  const badge = roleBadge[user.role] || { label: user.role, color: 'var(--accent-gold)' };
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : null;

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* ── Banner & Identity ── */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
        borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem'
      }}>
        {/* Abstract Banner generated dynamically based on ID */}
        <div style={{ 
          height: '140px', 
          background: `linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-surface) 100%)`,
          borderBottom: '1px solid var(--border-dark)'
        }}></div>

        <div style={{ padding: '0 2.5rem 2.5rem 2.5rem', position: 'relative', marginTop: '-50px' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="avatar-wrapper">
              {user.picture ? (
                <img src={user.picture} alt="avatar" referrerPolicy="no-referrer" style={{ display: 'block', width: 110, height: 110, borderRadius: '50%', border: '4px solid var(--bg-surface)', backgroundColor: 'var(--bg-deep)' }} />
              ) : (
                <div style={{
                  width: 110, height: 110, borderRadius: '50%', background: 'var(--bg-deep)',
                  border: '4px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <User size={50} color="var(--accent-gold)" />
                </div>
              )}
            </div>

            <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
              <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
                {user.first_name} {user.last_name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: badge.color + '22', color: badge.color,
                  border: `1px solid ${badge.color}55`, borderRadius: '20px',
                  padding: '0.25rem 0.8rem', fontSize: '0.8rem', fontWeight: 600
                }}>{badge.label}</span>
                {memberSince && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14}/> Joined {memberSince}
                  </span>
                )}
                {stats.global_rank > 0 && (
                  <span style={{ color: '#f1c40f', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <Medal size={14}/> Rank #{stats.global_rank}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(user.bio || user.linkedin_url || user.github_url || user.instagram_url || user.facebook_url || user.public_email) && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-dark)', paddingTop: '1.5rem' }}>
              {user.bio && <p style={{ color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {user.linkedin_url && <a href={user.linkedin_url.startsWith('http') ? user.linkedin_url : `https://${user.linkedin_url}`} target="_blank" rel="noreferrer" style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Linkedin size={16}/> LinkedIn</a>}
                {user.github_url && <a href={user.github_url.startsWith('http') ? user.github_url : `https://${user.github_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Github size={16}/> GitHub</a>}
                {user.instagram_url && <a href={user.instagram_url.startsWith('http') ? user.instagram_url : `https://${user.instagram_url}`} target="_blank" rel="noreferrer" style={{ color: '#e1306c', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Instagram size={16}/> Instagram</a>}
                {user.facebook_url && <a href={user.facebook_url.startsWith('http') ? user.facebook_url : `https://${user.facebook_url}`} target="_blank" rel="noreferrer" style={{ color: '#1877f2', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Facebook size={16}/> Facebook</a>}
                {user.public_email && <a href={`mailto:${user.public_email}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-deep)' }}><Mail size={16}/> Email</a>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        
        {/* ── Stats ── */}
        <div>
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} /> Combat Metrics
          </h3>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--border-dark)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Global Points</span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-aesthetic)' }}>{stats.total_score}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--border-dark)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14}/> Time Spent</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{Math.floor(stats.total_time / 60)} mins</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={14}/> Crafted Scrolls</span>
              <span style={{ fontWeight: 600, color: '#3498db' }}>{stats.quizzes_created}</span>
            </div>
          </div>
        </div>

        {/* ── Achievements ── */}
        <div style={{ gridColumn: '1 / -1' }}>
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Medal size={20} /> Honors & Badges
          </h3>
          {achievements.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic'
            }}>
              This scholar is forging their legacy. No badges claimed yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {achievements.map((ack: any, index: number) => (
                <div key={index} style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden'
                }}>
                  {/* Priority accent bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-gold)', opacity: ack.priority === 1 ? 1 : 0.4 }}></div>
                  
                  {/* Badge image with frame animation */}
                  <div className={`avatar-wrapper ${ack.frame_name || ''}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
                    {ack.badge_image_url ? (
                      <img src={ack.badge_image_url} alt={ack.name} style={{ display: 'block', width: '70px', height: '70px', objectFit: 'contain', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Medal size={44} color={ack.priority === 1 ? '#f1c40f' : 'var(--accent-gold)'} />
                      </div>
                    )}
                  </div>
                  
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>{ack.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{ack.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;
