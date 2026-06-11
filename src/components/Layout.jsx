import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">✓</span>
          <span>Mini Projects</span>
        </Link>
        {!isHome && (
          <Link to="/" className="back-link">
            ← All projects
          </Link>
        )}
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        <span>Built with React + Vite · Made with Claude Code</span>
      </footer>
      <Link
        to="/spin"
        aria-label="?"
        title=""
        style={{
          position: 'fixed',
          bottom: 6,
          left: 8,
          fontSize: 11,
          color: 'rgba(128,128,128,0.18)',
          textDecoration: 'none',
          userSelect: 'none',
        }}
      >
        ·
      </Link>
    </div>
  )
}
