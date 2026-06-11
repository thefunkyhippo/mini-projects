// The game itself is a standalone static HTML5 canvas app living in
// public/games/test-rpg/. We embed it in an iframe so it runs as-is,
// fully isolated from the React app.

export default function TestRpg() {
  return (
    <div className="rpg-embed">
      <iframe
        src="/games/test-rpg/index.html"
        title="test rpg"
        loading="lazy"
        style={{
          width: '100%',
          maxWidth: 860,
          aspectRatio: '4 / 3',
          minHeight: 640,
          border: 'none',
          borderRadius: 12,
          background: '#0b0a10',
          display: 'block',
          margin: '0 auto',
        }}
      />
      <p style={{ textAlign: 'center', color: 'var(--muted, #888)', fontSize: 14, marginTop: 12 }}>
        Click the game, then step tile-by-tile with WASD or the arrow keys.
      </p>
    </div>
  )
}
