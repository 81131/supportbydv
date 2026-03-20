import React, { useEffect, useState } from 'react';
import api from '../api';
import { Crown, Swords, Shield, Medal, Clock, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  total_score: number;
  total_time: number;
}

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user to highlight them on the board!
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/leaderboard/')
      .then(res => {
        setLeaders(res.data);
      })
      .catch(err => {
        console.error("Failed to load Throne Room rankings", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={28} color="#FFD700" />; // Gold
      case 2: return <Swords size={26} color="#C0C0C0" />; // Silver
      case 3: return <Shield size={26} color="#CD7F32" />; // Bronze
      default: return <Medal size={20} color="var(--text-muted)" />;
    }
  };

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    let style: React.CSSProperties = {
      backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.1)' : 'var(--bg-deep)',
      border: isCurrentUser ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)',
      borderRadius: '8px',
      padding: '1.2rem',
      display: 'grid',
      gridTemplateColumns: '60px 1fr 100px 120px',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem',
      transition: 'transform 0.2s ease',
    };

    if (rank === 1) style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.2)';
    return style;
  };

  return (
    <div style={{ padding: '4rem 1rem', maxWidth: '900px', margin: '0 auto', color: 'var(--text-main)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Crown size={40} /> The Throne Room
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Only the sharpest minds of the Citadel earn their place here. Scores reflect the highest marks achieved across all archived scrolls.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--accent-gold)', padding: '3rem' }}>
          Consulting the Grand Maesters...
        </div>
      ) : leaders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px dashed var(--border-dark)' }}>
          <Shield size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-muted)', margin: 0 }}>The realm is quiet. No trials have been completed yet.</h3>
        </div>
      ) : (
        <div>
          {/* Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 120px', gap: '1rem', padding: '0 1.2rem 1rem', color: 'var(--text-muted)', fontWeight: 'bold', borderBottom: '1px solid var(--border-dark)', marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <div style={{ textAlign: 'center' }}>Rank</div>
            <div>Scholar</div>
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
              <TrendingUp size={16}/> Score
            </div>
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
              <Clock size={16}/> Time
            </div>
          </div>

          {/* Leaderboard Rows */}
          {leaders.map((leader) => {
            const isMe = currentUser?.id === leader.user_id;
            
            return (
              <div key={leader.user_id} style={getRankStyle(leader.rank, isMe)}>
                
                {/* Rank & Icon */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {getRankIcon(leader.rank)}
                  {leader.rank > 3 && <span style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.2rem', color: 'var(--text-muted)' }}>#{leader.rank}</span>}
                </div>

                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isMe ? 'var(--accent-gold)' : 'var(--text-main)' }}>
                    {leader.name} {isMe && <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', verticalAlign: 'middle' }}>YOU</span>}
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right', fontWeight: '900', fontSize: '1.3rem', color: 'var(--accent-gold)' }}>
                  {leader.total_score.toFixed(1)}
                </div>

                {/* Time */}
                <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                  {formatTime(leader.total_time)}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;