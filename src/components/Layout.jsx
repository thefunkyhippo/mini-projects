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
    </div>
  )
}
