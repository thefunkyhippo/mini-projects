import { useState, useRef, useCallback, useEffect } from 'react'

// States: idle → waiting (red) → ready (green) → result | tooSoon
export default function ReactionGame() {
  const [state, setState] = useState('idle')
  const [time, setTime] = useState(0)
  const [best, setBest] = useState(() => {
    const saved = localStorage.getItem('reaction-best')
    return saved ? Number(saved) : null
  })
  const timeoutRef = useRef(null)
  const startRef = useRef(0)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const start = useCallback(() => {
    setState('waiting')
    const delay = 1000 + Math.random() * 3000
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setState('ready')
    }, delay)
  }, [])

  const handleClick = useCallback(() => {
    if (state === 'idle' || state === 'result' || state === 'tooSoon') {
      start()
    } else if (state === 'waiting') {
      clearTimeout(timeoutRef.current)
      setState('tooSoon')
    } else if (state === 'ready') {
      const ms = Math.round(performance.now() - startRef.current)
      setTime(ms)
      setState('result')
      if (best === null || ms < best) {
        setBest(ms)
        localStorage.setItem('reaction-best', String(ms))
      }
    }
  }, [state, start, best])

  const config = {
    idle: { bg: '#1f232e', title: 'Reaction Time', sub: 'Click to start.' },
    waiting: { bg: '#b91c1c', title: 'Wait for green…', sub: 'Don’t click yet!' },
    ready: { bg: '#16a34a', title: 'CLICK!', sub: 'Go go go!' },
    result: {
      bg: '#1f232e',
      title: `${time} ms`,
      sub: 'Click to try again.',
    },
    tooSoon: {
      bg: '#1f232e',
      title: 'Too soon! 😅',
      sub: 'Click to try again.',
    },
  }[state]

  return (
    <div>
      <h1 className="project-title">⚡ Reaction Time</h1>
      <p className="project-sub">
        Wait for the box to turn green, then click as fast as you can.
        {best !== null && <> · Best: <strong>{best} ms</strong></>}
      </p>

      <button
        onClick={handleClick}
        style={{
          width: '100%',
          minHeight: 320,
          border: 'none',
          borderRadius: 16,
          cursor: 'pointer',
          background: config.bg,
          color: '#fff',
          transition: 'background 0.1s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 700 }}>{config.title}</span>
        <span style={{ fontSize: 16, opacity: 0.85 }}>{config.sub}</span>
      </button>
    </div>
  )
}
