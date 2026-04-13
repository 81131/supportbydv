import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export const AdWrapper: React.FC<{ children: React.ReactNode, semesterKey?: string }> = ({ children, semesterKey }) => {
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    // Fetch targeted ads from backend
    const params = semesterKey ? { semester_key: semesterKey } : {};
    api.get('/ads/active', { params }).then(res => setAds(res.data)).catch(() => {});
  }, [semesterKey]);

  // Organize ads by placement
  const getAd = (placement: string) => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const ad = ads.find(a => a.placement === placement);
    if (!ad) {
      return (
        <Link to="/submit-ad" className={`ad-container ad-${placement} empty-ad`} style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'var(--bg-deep)', border: '1px dashed var(--border-dark)',
            color: 'var(--text-muted)', textDecoration: 'none', padding: '1rem',
            textAlign: 'center', minHeight: placement.includes('nav') ? '400px' : '90px',
            borderRadius: '8px', transition: 'all 0.3s'
        }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-dark)'}>
          <div>Advertise Here<br/><span style={{fontSize: '0.8rem'}}>Place your business ad</span></div>
        </Link>
      );
    }
    
    // Choose image based on theme (fallback to light if dark is missing)
    const imgUrl = (isDark && ad.dark_image_url) ? ad.dark_image_url : ad.light_image_url;
    
    return (
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className={`ad-container ad-${placement}`}>
        <img src={imgUrl || ''} alt={ad.title} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
      </a>
    );
  };

  return (
    <div className="ad-page-layout">
      {/* Top Banner */}
      <div className="ad-banner-top">{getAd('top_banner')}</div>
      
      <div className="ad-main-cols">
        {/* Left Nav */}
        <div className="ad-sidebar ad-sidebar-left">{getAd('left_nav')}</div>
        
        {/* Main Content */}
        <div className="ad-content-center">
          {children}
        </div>
        
        {/* Right Nav */}
        <div className="ad-sidebar ad-sidebar-right">{getAd('right_nav')}</div>
      </div>
      
      {/* Bottom Banner */}
      <div className="ad-banner-bottom">{getAd('bottom_banner')}</div>
    </div>
  );
};
