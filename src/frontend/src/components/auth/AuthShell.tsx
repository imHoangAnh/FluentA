import { Link } from 'react-router-dom'
import { type ReactNode } from 'react'

export function AuthShell({ children, mode }: { children: ReactNode, mode: 'login' | 'register' }) {
  return (
    <>
      <style>{`
        .orbit-container {
          position: relative;
          width: 100%;
          height: 450px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-base {
          position: absolute;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        .center-card {
          z-index: 10;
          width: 180px;
          height: 110px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }
        .orbit-card {
          width: 120px;
          height: 80px;
          font-size: 0.85rem;
        }
        .pos-top { transform: translateY(-160px); }
        .pos-top-right { transform: translate(140px, -90px); }
        .pos-bottom-right { transform: translate(140px, 90px); }
        .pos-bottom { transform: translateY(160px); }
        .pos-bottom-left { transform: translate(-140px, 90px); }
        .pos-top-left { transform: translate(-140px, -90px); }

        .orbit-ring {
          position: absolute;
          border: 1px dashed #e2e8f0;
          border-radius: 50%;
        }
        .ring-1 { width: 320px; height: 320px; }
        .ring-2 { width: 440px; height: 440px; }
        
        .lang-label {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .phrase-text {
          font-weight: 700;
          color: #1e293b;
        }
        .center-card .phrase-text {
          font-size: 1.5rem;
          color: #0d9488;
        }
      `}</style>
      <main style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', fontFamily: '"Inter", "Geist", sans-serif', margin: 0, backgroundColor: '#ffffff' }}>
        <section style={{ width: '60%', backgroundColor: '#f7f9fb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px', zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <svg fill="none" height="40" viewBox="0 0 40 40" width="40" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10C10 10 15 8 22 12C29 16 30 25 30 25L25 32C25 32 24 24 18 20C12 16 10 18 10 18V10Z" fill="#0d9488"></path>
                <path d="M14 14C14 14 18 13 22 16C26 19 26 24 26 24L22 28C22 28 22 22 18 20C14 18 14 14 14 14Z" fill="#2dd4bf" fillOpacity="0.6"></path>
              </svg>
              <span style={{ fontSize: '30px', fontWeight: 700, color: '#1e293b' }}>FluentA</span>
            </div>
            <h1 style={{ fontSize: '20px', color: '#475569', lineHeight: 1.6, maxWidth: '384px', margin: '0 auto', fontWeight: 400 }}>
              Learn languages. Remember more.<br/>Use it in real life.
            </h1>
          </div>

          <div className="orbit-container">
            <div className="orbit-ring ring-1"></div>
            <div className="orbit-ring ring-2"></div>
            
            <div className="card-base orbit-card center-card">
              <span className="lang-label" style={{ color: '#94a3b8' }}>Vietnamese</span>
              <span className="phrase-text">Xin chào</span>
            </div>
            
            <div className="card-base orbit-card pos-top-left">
              <span className="lang-label" style={{ color: '#c084fc' }}>Japanese</span>
              <span className="phrase-text">こんにちは</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#c084fc' }}></div>
            </div>
            
            <div className="card-base orbit-card pos-top-right">
              <span className="lang-label" style={{ color: '#2dd4bf' }}>English</span>
              <span className="phrase-text">Hello</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' }}></div>
            </div>
            
            <div className="card-base orbit-card pos-bottom-right">
              <span className="lang-label" style={{ color: '#eab308' }}>Spanish</span>
              <span className="phrase-text">Hola</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
            </div>
            
            <div className="card-base orbit-card pos-bottom">
              <span className="lang-label" style={{ color: '#f472b6' }}>Chinese</span>
              <span className="phrase-text">你好</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f472b6' }}></div>
            </div>
            
            <div className="card-base orbit-card pos-bottom-left">
              <span className="lang-label" style={{ color: '#fb923c' }}>Korean</span>
              <span className="phrase-text">안녕하세요</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fb923c' }}></div>
            </div>
            
            <div className="card-base orbit-card pos-top">
              <span className="lang-label" style={{ color: '#60a5fa' }}>French</span>
              <span className="phrase-text">Bonjour</span>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#60a5fa' }}></div>
            </div>
          </div>

          <div style={{ marginTop: '48px', color: '#334155', fontWeight: 500, zIndex: 20 }}>
            Learn naturally. Speak confidently.
          </div>
        </section>
        
        <section style={{ width: '40%', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={{ width: '100%', maxWidth: '384px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', marginBottom: '32px' }}>
              <Link to="/login" style={{ flex: 1, paddingBottom: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, textDecoration: 'none', borderBottom: mode === 'login' ? '2px solid #0d9488' : '2px solid transparent', color: mode === 'login' ? '#0d9488' : '#94a3b8', transition: 'color 0.2s' }}>
                Login
              </Link>
              <Link to="/register" style={{ flex: 1, paddingBottom: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, textDecoration: 'none', borderBottom: mode === 'register' ? '2px solid #0d9488' : '2px solid transparent', color: mode === 'register' ? '#0d9488' : '#94a3b8', transition: 'color 0.2s' }}>
                Create account
              </Link>
            </div>
            {children}
          </div>
        </section>
      </main>
    </>
  )
}
