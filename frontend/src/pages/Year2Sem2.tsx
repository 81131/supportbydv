import { Link } from 'react-router-dom';
import ossaBg from '../assets/OSSA-bg.webp';
import wmtBg from '../assets/WMT-bg.webp';
import psBg from '../assets/PS-bg.webp';

const Year2Sem2 = () => {
    return (
        <div className="page-container">
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', textAlign: 'center', marginTop: '2rem' }}>
                Year 02 Semester 02
            </h1>
            <p className="text-desc" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                The current battlefield. Prepare for the wars to come.
            </p>

            <div className="modules-grid">
                {/* OSSA Card */}
                <Link to="/y2s2/ossa" style={{ textDecoration: 'none' }}>
                    <div className="module-card" style={{ backgroundImage: `url(${ossaBg})` }}>
                        <h2 className="brand-font">OSSA</h2>
                        <p className="text-desc" style={{ margin: 0, color: 'var(--text-main)' }}>Operating System & System Administration</p>
                    </div>
                </Link>

                {/* WMT Card */}
                <Link to="/y2s2/wmt" style={{ textDecoration: 'none' }}>
                    <div className="module-card" style={{ backgroundImage: `url(${wmtBg})` }}>
                        <h2 className="brand-font">WMT</h2>
                        <p className="text-desc" style={{ margin: 0, color: 'var(--text-main)' }}>Web and Mobile Technologies</p>
                    </div>
                </Link>

                {/* PS Card */}
                <Link to="/y2s2/ps" style={{ textDecoration: 'none' }}>
                    <div className="module-card" style={{ backgroundImage: `url(${psBg})` }}>
                        <h2 className="brand-font">PS</h2>
                        <p className="text-desc" style={{ margin: 0, color: 'var(--text-main)' }}>Professional Skills</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Year2Sem2;