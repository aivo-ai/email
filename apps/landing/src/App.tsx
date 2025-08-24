import './App.css'

function App() {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="landing-logo">
          CEERION
        </div>
        
        <h1 className="landing-title">
          Enterprise Email Platform
        </h1>
        
        <p className="landing-subtitle">
          Secure, scalable, and professional email solutions for modern businesses
        </p>
        
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3 className="feature-title">Secure Communication</h3>
            <p className="feature-description">
              End-to-end encryption and advanced security features to protect your business communications
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3 className="feature-title">Admin Controls</h3>
            <p className="feature-description">
              Comprehensive administrative tools for user management and security policies
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3 className="feature-title">High Performance</h3>
            <p className="feature-description">
              Fast, reliable email delivery with enterprise-grade infrastructure
            </p>
          </div>
        </div>
        
        <div className="landing-cta">
          <a href="/webmail" className="cta-button">
            Access Webmail →
          </a>
        </div>
      </div>
    </div>
  )
}

export default App
