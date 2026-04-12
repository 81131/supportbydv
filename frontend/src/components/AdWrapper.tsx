import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

const EXEMPT_ROUTES = ['/', '/quiz-maker', '/take-quiz', '/upload-note'];

export const AdWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    // Fetch active ads from backend
    api.get('/ads/active').then(res => setAds(res.data)).catch(() => {});
  }, []);

  // Check if current route is exempt from ads
  const isExempt = EXEMPT_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));

  if (isExempt) {
    return <>{children}</>;
  }

  // Organize ads by placement
  const getAd = (placement: string) => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const ad = ads.find(a => a.placement === placement);
    if (!ad) return null;
    
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
