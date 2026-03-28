import React, { useEffect, useState } from 'react';

const ThemeToggle: React.FC = () => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLight(true);
      document.body.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
    setIsLight(!isLight);
  };

  return (
    <div 
      onClick={toggleTheme}
      title="Flip the Coin of Braavos"
      style={{ width: '40px', height: '40px', perspective: '1000px', cursor: 'pointer', display: 'inline-block' }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative', transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)', transformStyle: 'preserve-3d', transform: isLight ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        <img src="/Coin_Of_Braavoos_Head.png" alt="Dark Mode" style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', borderRadius: '50%', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
        <img src="/Coin_Of_Braavoos_Trail.png" alt="Light Mode" style={{ width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '50%', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
};

export default ThemeToggle;