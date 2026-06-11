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
    slug: 'test-rpg',
    title: 'Test RPG',
    description: 'A dark-fantasy top-down RPG with 16-bit pixel art and Pokémon-style grid movement.',
    emoji: '🗡️',
    tag: 'Game',
    accent: '#7b46a0',
    component: lazy(() => import('./test-rpg/index.jsx')),
  },
]
