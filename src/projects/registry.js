import { lazy } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// To add a new mini project:
//   1. Create a folder under src/projects/<your-slug>/ with an index.jsx
//      that default-exports a React component.
//   2. Add an entry to the array below.
// That's it — the homepage card and the route are generated automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const projects = [
  {
    slug: 'reaction-game',
    title: 'Reaction Time',
    description: 'Test your reflexes. Wait for green, then tap as fast as you can.',
    emoji: '⚡',
    tag: 'Game',
    accent: '#f59e0b',
    component: lazy(() => import('./reaction-game/index.jsx')),
  },
  {
    slug: 'personality-quiz',
    title: 'Which Snack Are You?',
    description: 'A totally scientific 5-question quiz to reveal your true snack identity.',
    emoji: '🍪',
    tag: 'Quiz',
    accent: '#ec4899',
    component: lazy(() => import('./personality-quiz/index.jsx')),
  },
]
