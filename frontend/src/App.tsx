import { useState, useEffect } from 'react'; // Added useEffect
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';
import api from './api'; 

import Home from './pages/Home';
import Year01 from './pages/Year01';
import Year2Sem2 from './pages/Year2Sem2';

function App() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const openModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await api.post('/auth/google', {
        token: credentialResponse.credential
      });

      const { access_token, user: loggedInUser } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      
      setUser(loggedInUser);
      setIsModalOpen(false);
      
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Failed to log in.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="logo brand-font">Support by DV</Link>
          
          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <Link to="/year01" className="nav-item" onClick={() => setIsMenuOpen(false)}>Year 01</Link>
            <Link to="/y2s2" className="nav-item" onClick={() => setIsMenuOpen(false)}>Y2S2</Link>
            <Link to="/leaderboard" className="nav-item" onClick={() => setIsMenuOpen(false)}>Throne Room</Link>
            
            {/* Conditionally render Login or User Info */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{user.first_name}</span>
                <button className="btn-primary" onClick={handleLogout} style={{ backgroundColor: 'var(--border-dark)' }}>Logout</button>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => openModal('login')}>Log In</button>
            )}
          </div>

          <button className="mobile-toggle" onClick={toggleMenu}>
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home openModal={openModal} />} />
            <Route path="/year01" element={<Year01 />} />
            <Route path="/y2s2" element={<Year2Sem2 />} />
          </Routes>
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
              <h2 className="brand-font" style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
                {authMode === 'login' ? 'A man have an account' : 'A man needs an account'}
              </h2>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error("Google Login Failed")}
                  theme="filled_black"
                  shape="rectangular"
                  text={authMode === 'login' ? 'signin_with' : 'signup_with'}
                  width="300"
                />
              </div>
              
              <div style={{ margin: '1rem 0', color: 'var(--border-dark)' }}>──────── OR ────────</div>

              <form onSubmit={(e) => e.preventDefault()}>
                {authMode === 'register' && (
                  <>
                    <input type="text" placeholder="First Name" className="auth-input" required />
                    <input type="text" placeholder="Last Name" className="auth-input" required />
                  </>
                )}
                <input type="email" placeholder="Email Address" className="auth-input" required />
                <input type="password" placeholder="Password" className="auth-input" required />
                
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  {authMode === 'login' ? 'Enter the House' : 'Pledge Loyalty'}
                </button>
              </form>

              <div className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' 
                  ? "Don't have an account? A man needs an account." 
                  : "Already pledged? A man have an account."}
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;