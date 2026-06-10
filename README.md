# Mini Projects

A hub for little games, quizzes, and experiments — built with React + Vite, deployed on Vercel.

## Run locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Add a new mini project

1. Create a folder: `src/projects/<your-slug>/index.jsx`
2. Default-export a React component from it.
3. Register it in [`src/projects/registry.js`](src/projects/registry.js):

   ```js
   {
     slug: 'your-slug',          // becomes the URL: /your-slug
     title: 'Your Project',
     description: 'One-line pitch shown on the card.',
     emoji: '🎮',
     tag: 'Game',                // shown as a label on the card
     accent: '#6366f1',          // card accent color
     component: lazy(() => import('./your-slug/index.jsx')),
   }
   ```

The homepage card and the route are generated automatically — no other wiring needed.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects Vite. Click **Deploy**. Done.

Every `git push` after that redeploys automatically. The included `vercel.json`
makes client-side routing work for deep links (e.g. visiting `/reaction-game` directly).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```
