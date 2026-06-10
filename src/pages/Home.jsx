import { Link } from 'react-router-dom'
import { projects } from '../projects/registry.js'

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1>Mini Projects</h1>
        <p>A growing collection of little games, quizzes, and experiments.</p>
      </section>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet — your first one will show up here.</p>
        </div>
      ) : (
        <section className="grid">
          {projects.map((p) => (
          <Link
            key={p.slug}
            to={`/${p.slug}`}
            className="card"
            style={{ '--accent': p.accent }}
          >
            <div className="card-emoji" aria-hidden="true">
              {p.emoji}
            </div>
            <div className="card-body">
              <span className="card-tag">{p.tag}</span>
              <h2 className="card-title">{p.title}</h2>
              <p className="card-desc">{p.description}</p>
            </div>
            <span className="card-arrow" aria-hidden="true">
              →
            </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
