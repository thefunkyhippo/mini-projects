import { lazy } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// To add a new mini project:
//   1. Create a folder under src/projects/<your-slug>/ with an index.jsx
//      that default-exports a React component.
//   2. Add an entry to the array below.
// That's it — the homepage card and the route are generated automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const projects = [
  // Your projects go here. Example shape:
  // {
  //   slug: 'tic-tac-toe',
  //   title: 'Tic-Tac-Toe',
  //   description: 'Classic 3-in-a-row against a friend.',
  //   emoji: '⭕',
  //   tag: 'Game',
  //   accent: '#6366f1',
  //   component: lazy(() => import('./tic-tac-toe/index.jsx')),
  // },
]
