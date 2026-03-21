import React, { useEffect, useState } from 'react';
import { Library, DownloadCloud, Pin, Award, VenetianMask, BadgeCheck, Filter, Heart, Lock, Globe } from 'lucide-react';
import api from '../api';

const CollectionDisplayer: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTER & SORT STATE ---
  const [sortOrder, setSortOrder] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [filterNoOne, setFilterNoOne] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await api.get(`/library/collections`);
      setCollections(res.data);
    } catch (error) { console.error("Failed to load archives", error); } 
    finally { setIsLoading(false); }
  };

  // --- ACTIONS ---
  const handleZipDownload = async (collectionId: string | number, title: string) => {
    try {
      const res = await api.get(`/library/collections/${collectionId}/zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Archive.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { alert("Failed to compile the archive. It may be empty."); }
  };

  const handleVisibilityChange = async (collectionId: number, newVis: string) => {
    try {
      await api.put(`/library/collections/${collectionId}/visibility`, { visibility: newVis });
      setCollections(collections.map(c => c.id === collectionId ? { ...c, visibility: newVis } : c));
    } catch (error) { alert("Failed to update visibility."); }
  };

  // --- GOVERNANCE ---
  const handlePinToggle = async (collectionId: number, currentStatus: boolean) => {
    try {
      await api.put(`/library/collections/${collectionId}/governance`, { is_pinned: !currentStatus });
      setCollections(collections.map(c => c.id === collectionId ? { ...c, is_pinned: !currentStatus } : c));
    } catch (error) { alert("Only No One can pin an archive."); }
  };

  const handleRecommendToggle = async (collectionId: number, currentStatus: boolean) => {
    try {
      await api.put(`/library/collections/${collectionId}/governance`, { is_recommended: !currentStatus });
      setCollections(collections.map(c => c.id === collectionId ? { ...c, is_recommended: !currentStatus } : c));
    } catch (error) { alert("Only No One can bestow this honor."); }
  };

  // --- FILTER & SORT ENGINE ---
  const processedCollections = collections.filter(col => {
    const role = String(col.creator_role).replace('UserRole.', '');
    const isNoOne = role === 'noOne' || role === 'NO_ONE';
    const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

    // Visibility Filter (Favorites are always visible unless specifically filtering for Public)
    if (visibilityFilter === 'public' && col.visibility !== 'public' && !col.is_special) return false;
    if (visibilityFilter === 'private' && col.visibility !== 'private') return false;

    // Badge Filters
    if (filterVerified && !isVerified && !col.is_special) return false;
    if (filterRecommended && !col.is_recommended && !col.is_special) return false;
    if (filterNoOne && !isNoOne && !col.is_special) return false;
    
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'nameAsc') return a.title.localeCompare(b.title);
    if (sortOrder === 'nameDesc') return b.title.localeCompare(a.title);
    return (b.id === 'favorites' ? 999999 : b.id) - (a.id === 'favorites' ? 999999 : a.id); 
  }).sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false))
    .sort((a, b) => Number(b.is_special || false) - Number(a.is_special || false)); // ✨ Favorites ALWAYS stay at the top!

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      {/* --- CONTROL BAR --- */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
          <Filter size={20} /> <strong style={{ marginRight: '1rem' }}>Filter Archives</strong>
        </div>
        
        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0 }}>
          <option value="all">All Access</option>
          <option value="public">Public Only</option>
          <option value="private">Private Only</option>
        </select>

        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0 }}>
          <option value="newest">Last Updated</option>
          <option value="nameAsc">Name (A-Z)</option>
          <option value="nameDesc">Name (Z-A)</option>
        </select>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterVerified} onChange={e => setFilterVerified(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <BadgeCheck size={16} color="#4caf50" /> Verified
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterRecommended} onChange={e => setFilterRecommended(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <Award size={16} color="var(--accent-gold)" /> Recommended
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterNoOne} onChange={e => setFilterNoOne(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <VenetianMask size={16} color="#b39ddb" /> By No One
          </label>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Opening the vaults...</p>
      ) : processedCollections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <Library size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No archives match your current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {processedCollections.map((col) => {
            const role = String(col.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

            return (
              <div key={col.id} style={{ 
                border: col.is_special ? '2px solid #ff4d4d' : (col.is_pinned ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)'), 
                padding: '1.5rem', borderRadius: '8px', 
                backgroundColor: col.is_special ? 'rgba(255, 77, 77, 0.05)' : (col.is_recommended ? 'rgba(255, 215, 0, 0.05)' : 'rgba(15, 15, 15, 0.8)'),
                display: 'flex', flexDirection: 'column',
                boxShadow: col.is_special ? '0 0 15px rgba(255, 77, 77, 0.1)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {col.is_special ? <Heart size={24} color="#ff4d4d" fill="#ff4d4d" /> : <Library size={24} color="var(--accent-gold)" />}
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{col.title}</h3>
                  </div>
                </div>

                {!col.is_special && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '1rem' }}>
                    {col.is_recommended && <span title="Recommended"><Award size={16} color="var(--accent-gold)" /></span>}
                    {isNoOne && <span title="Forged by No One"><VenetianMask size={16} color="#b39ddb" /></span>}
                    {isVerified && <span title="Verified Scholar"><BadgeCheck size={16} color="#4caf50" /></span>}
                    {col.is_pinned && <span title="Pinned"><Pin size={16} color="#ff4d4d" fill="#ff4d4d" style={{ transform: 'rotate(45deg)' }} /></span>}
                  </div>
                )}
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px', flex: 1 }}>
                  {col.description || "A curated collection of scrolls."}
                </p>
                
                {/* --- PRIVACY TOGGLE (For Owners) --- */}
                {currentUser?.id === col.creator_id && !col.is_special && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    {col.visibility === 'private' ? <Lock size={14} color="var(--text-muted)" /> : <Globe size={14} color="var(--text-muted)" />}
                    <select 
                      value={col.visibility} 
                      onChange={(e) => handleVisibilityChange(col.id, e.target.value)}
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-dark)', borderRadius: '4px', padding: '0.2rem', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      <option value="private">Private Archive</option>
                      <option value="public">Public Archive</option>
                    </select>
                  </div>
                )}

                {/* --- NO ONE GOVERNANCE --- */}
                {currentUser?.role === 'noOne' && !col.is_special && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem' }}>
                    <button onClick={() => handleRecommendToggle(col.id, col.is_recommended)} style={{ flex: 1, background: 'transparent', border: `1px solid ${col.is_recommended ? 'var(--accent-gold)' : 'var(--border-dark)'}`, color: col.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <Award size={14} /> {col.is_recommended ? 'Revoke' : 'Recommend'}
                    </button>
                    <button onClick={() => handlePinToggle(col.id, col.is_pinned)} style={{ flex: 1, background: 'transparent', border: `1px solid ${col.is_pinned ? '#ff4d4d' : 'var(--border-dark)'}`, color: col.is_pinned ? '#ff4d4d' : 'var(--text-muted)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <Pin size={14} style={{ transform: col.is_pinned ? 'rotate(45deg)' : 'none' }} /> {col.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{col.note_count} Scrolls</span>
                  <button onClick={() => handleZipDownload(col.id, col.title)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <DownloadCloud size={16} /> Get ZIP
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollectionDisplayer;