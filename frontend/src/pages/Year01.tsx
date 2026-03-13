import { openProtectedFile } from '../utils/fileUtils'; // Import the new tool

export default function Year01() {
  return (
    <div className="page-container">
      <h1 className="brand-font" style={{ color: 'var(--accent-gold)', textAlign: 'center', marginTop: '2rem' }}>
        Year 01 Archives
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--accent-red)', fontStyle: 'italic', marginBottom: '3rem', fontSize: '1.1rem' }}>
        "My watch has ended on these modules."
      </p>

      <div className="modules-grid">
        {/* ======================= SEMESTER 1 ======================= */}
        <section className="module-section">
          <h2 className="brand-font" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem' }}>Y1S1</h2>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Data Communication Networks (DCN)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              {/* External links remain the same */}
              <li><a href="https://forms.office.com/r/GPuaam76gR" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Quiz - Lecture 01</a></li>
              <li><a href="https://forms.office.com/r/GCbyidg4Mc" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Quiz - Lecture 02</a></li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Introduction to Programming (IP)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              <li><a href="https://forms.office.com/r/xNYBWf726C" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Quiz - Lecture 01</a></li>
              <li><a href="https://forms.office.com/r/s8BA8TtJ4t" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Quiz - Lecture 02</a></li>
            </ul>
          </div>
        </section>


        {/* ======================= SEMESTER 2 ======================= */}
        <section className="module-section">
          <h2 className="brand-font" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem' }}>Y1S2</h2>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Object Oriented Programming (OOP)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              {/* Using openProtectedFile to bypass the Gatekeeper with our token */}
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/oop/OOP Lecture 01.pdf'); }} className="nav-item">Lecture 01 Short Notes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/oop/OOP Lecture 02.pdf'); }} className="nav-item">Lecture 02 Short Notes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/oop/OOP Lecture 03.pdf'); }} className="nav-item">Lecture 03 Short Notes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/oop/finalPaper.pdf'); }} className="nav-item" style={{ color: 'var(--accent-red)' }}>Final Model Paper</a></li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Data Structures And Algorithms (DSA)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/dsa/Lecture 01.pdf'); }} className="nav-item">Lecture 01 Short Notes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/dsa/Lecture 03.pdf'); }} className="nav-item">Lecture 03 Short Notes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/dsa/Lecture 04.pdf'); }} className="nav-item">Lecture 04 Short Notes</a></li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Discrete Mathematics (DM)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              <li><a href="#" onClick={(e) => { e.preventDefault(); openProtectedFile('/archive/Y1S2/dm/Lecture 01.pdf'); }} className="nav-item">Lecture 01 Short Notes</a></li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Technical Writing (TR)</h3>
            <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
              <li><a href="https://forms.office.com/r/wBe63C5MQx" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Mid Mock MCQs - 1</a></li>
              <li><a href="https://forms.office.com/r/ScZTQK7fs0" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Mid Mock MCQs - 2</a></li>
              <li><a href="https://forms.office.com/r/nN9PJXQZSR" target="_blank" rel="noreferrer" className="nav-item" style={{ color: 'var(--accent-gold)' }}>Mid Mock Quiz - 3</a></li>
            </ul>
          </div>

        </section>
      </div>
    </div>
  );
}