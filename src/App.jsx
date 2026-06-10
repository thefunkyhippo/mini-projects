import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import { projects } from './projects/registry.js'

function Loading() {
  return <div className="loading">Loading…</div>
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          {projects.map((p) => {
            const Component = p.component
            return <Route key={p.slug} path={`/${p.slug}`} element={<Component />} />
          })}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

function NotFound() {
  return (
    <div className="empty-state">
      <h2>404</h2>
      <p>That page doesn’t exist (yet).</p>
    </div>
  )
}
