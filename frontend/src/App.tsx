import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';
import api from './api'; 
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Year01 from './pages/Year01';
import Year2Sem2 from './pages/Year2Sem2';
import NotFound from './pages/NotFound';
import PS from './pages/PS';
import OSSA from './pages/OSSA';
import WMT from './pages/WMT';
import QuizMaker from './pages/QuizMaker';
import TakeQuiz from './pages/TakeQuiz';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import Forbidden from './pages/Forbidden'; // 👈 Make sure to import the new Forbidden page!
import About from './pages/About';
import NoteUploader from './pages/NoteUploader';
import MyVault from './pages/MyVault';

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
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

      const loggedInUser = response.data.user; 
      
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      
      setUser(loggedInUser);
      setIsModalOpen(false);
      
    } catch (error: any) {
      console.error("Authentication failed:", error);
      const message = error.response?.data?.detail || "Failed to log in.";
      alert(message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("The Maesters failed to clear the session:", error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      setIsMenuOpen(false);
    }
  };

  if (isLoading) {
    return <div style={{ color: 'var(--accent-gold)', textAlign: 'center', marginTop: '5rem' }}>Loading the Citadel... ⏳</div>; 
  }
  
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="logo brand-font">Support by DV</Link>
          
          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            {/* These links only show up for logged-in users */}
            {user && (
              <>
                <Link to="/year01" className="nav-item" onClick={() => setIsMenuOpen(false)}>Year 01</Link>
                <Link to="/y2s2" className="nav-item" onClick={() => setIsMenuOpen(false)}>Y2S2</Link>
                <Link to="/quiz-maker" className="nav-item" onClick={() => setIsMenuOpen(false)}>Quiz Maker</Link>
              </>
            )}
            <Link to="/about" className="nav-item" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/leaderboard" className="nav-item" onClick={() => setIsMenuOpen(false)}>Throne Room</Link>
            {user && (user.role === 'noOne' || user.role === 'admin') && (
              <Link 
                to="/admin-dashboard" 
                style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 'bold' }}
                onClick={() => setIsMenuOpen(false)}
              >
                Small Council
              </Link>
            )}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{user.first_name}</span>
                <button className="btn-primary" onClick={handleLogout} style={{ backgroundColor: 'var(--border-dark)' }}>Logout</button>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => openModal('login')}>Log In</button>
            )}

            {/* 👇 FIX: Using the `user` state variable to check the role */}

          </div>

          <button className="mobile-toggle" onClick={toggleMenu}>
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </nav>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home openModal={openModal} />} />
          
          {/* Wrap the sensitive routes */}
          <Route 
            path="/year01" 
            element={
              <ProtectedRoute user={user}>
                <Year01 />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/y2s2" 
            element={
              <ProtectedRoute user={user}>
                <Year2Sem2 />
              </ProtectedRoute>
            } 
          />
          <Route path="/y2s2/ps" element={<ProtectedRoute user={user}><PS /></ProtectedRoute>} />
          <Route path="/y2s2/ossa" element={<ProtectedRoute user={user}><OSSA /></ProtectedRoute>} />
          <Route path="/y2s2/wmt" element={<ProtectedRoute user={user}><WMT /></ProtectedRoute>} />
          <Route path="/quiz-maker" element={<ProtectedRoute user={user}><QuizMaker /></ProtectedRoute>} />
          <Route path="/edit-quiz/:id" element={<ProtectedRoute user={user}><QuizMaker /></ProtectedRoute>} />
          <Route path="/take-quiz/:id" element={<ProtectedRoute user={user}><TakeQuiz /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute user={user}><Leaderboard /></ProtectedRoute>} />
          <Route path="/upload-note" element={<ProtectedRoute user={user}><NoteUploader /></ProtectedRoute>} />
          <Route path="/my-vault" element={<ProtectedRoute user={user}><MyVault /></ProtectedRoute>} />
          <Route path="/about" element={<About />} />
        
          
          {/* Admin Dashboard is protected inside its own component, but we also wrap it here */}
          <Route path="/admin-dashboard" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />

          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
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