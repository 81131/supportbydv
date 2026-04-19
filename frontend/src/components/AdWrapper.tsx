import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

// Roles that should never see ads or placeholders
const AD_EXEMPT_ROLES = ['noOne', 'admin', 'premium_user', "faceless"];

export const AdWrapper: React.FC<{ children: React.ReactNode, semesterKey?: string }> = ({ children, semesterKey }) => {
  const [ads, setAds] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isDark, setIsDark] = useState(!document.body.classList.contains('light-theme'));

  // Determine if the current user is exempt from ads
  const isAdExempt = currentUser && AD_EXEMPT_ROLES.includes(currentUser.role);

  useEffect(() => {
    const handleUserUpdate = () => setCurrentUser(JSON.parse(localStorage.getItem('user') || 'null'));
    const handleThemeUpdate = () => setIsDark(!document.body.classList.contains('light-theme'));
    
    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('theme-updated', handleThemeUpdate);
    
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('theme-updated', handleThemeUpdate);
    };
  }, []);

  useEffect(() => {
    // Don't fetch ads at all for exempt users
    if (isAdExempt) return;
    const params = semesterKey ? { semester_key: semesterKey } : {};
    api.get('/ads/active', { params }).then(res => setAds(res.data)).catch(() => { });
  }, [semesterKey, isAdExempt]);

  // If exempt, render children directly with no ad layout overhead
  if (isAdExempt) {
    return <>{children}</>;
  }

  // Organize ads by placement
  const getAd = (placement: string) => {
    const ad = ads.find(a => a.placement === placement);
    if (!ad) {
      return (
        <Link to="/submit-ad" className={`ad-container ad-${placement} empty-ad`} style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'var(--bg-deep)', border: '1px dashed var(--border-dark)',
          color: 'var(--text-muted)', textDecoration: 'none', padding: '1rem',
          textAlign: 'center', minHeight: placement.includes('nav') ? '400px' : '90px',
          width: '100%',
          borderRadius: '8px', transition: 'all 0.3s'
        }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-dark)'}>
          <div>Advertise Here<br /><span style={{ fontSize: '0.8rem' }}>Place your business ad</span></div>
        </Link>
      );
    }

    // Choose image based on theme (fallback to light if dark is missing)
    const imgUrl = (isDark && ad.dark_image_url) ? ad.dark_image_url : ad.light_image_url;

    // Enforce size limits dynamically based on placement
    const getSizingStyle = () => {
      if (placement.includes('banner')) {
        return { 
          maxHeight: '200px', 
          width: '100%', 
          maxWidth: '1000px',
          margin: '0 auto',
          objectFit: 'contain' as const,
          background: 'rgba(0,0,0,0.2)'
        };
      }
      if (placement.includes('nav')) {
        return { 
          maxWidth: '180px', 
          height: '100%', 
          maxHeight: '600px',
          width: '100%', 
          objectFit: 'contain' as const,
          background: 'rgba(0,0,0,0.2)'
        };
      }
      return { width: '100%', height: '100%', objectFit: 'contain' as const };
    };

    return (
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className={`ad-container ad-${placement}`} style={{ display: 'block', width: '100%', textAlign: 'center' }}>
        <img src={imgUrl || ''} alt={ad.title} style={{ borderRadius: '8px', ...getSizingStyle() }} />
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
