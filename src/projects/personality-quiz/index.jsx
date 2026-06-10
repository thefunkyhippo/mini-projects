import { useState } from 'react'

const QUESTIONS = [
  {
    q: 'It’s 3pm. What’s your energy?',
    options: [
      { text: 'Cozy and a little sleepy', type: 'cookie' },
      { text: 'Sharp and ready to go', type: 'chip' },
      { text: 'Chill, just vibing', type: 'fruit' },
      { text: 'Chaotic, honestly', type: 'gummy' },
    ],
  },
  {
    q: 'Pick a weekend plan:',
    options: [
      { text: 'Baking something warm', type: 'cookie' },
      { text: 'Movie night marathon', type: 'chip' },
      { text: 'Picnic in the park', type: 'fruit' },
      { text: 'Spontaneous road trip', type: 'gummy' },
    ],
  },
  {
    q: 'Your friends describe you as…',
    options: [
      { text: 'Comforting', type: 'cookie' },
      { text: 'Bold', type: 'chip' },
      { text: 'Refreshing', type: 'fruit' },
      { text: 'Unpredictable', type: 'gummy' },
    ],
  },
  {
    q: 'Choose a color:',
    options: [
      { text: 'Warm brown', type: 'cookie' },
      { text: 'Golden yellow', type: 'chip' },
      { text: 'Bright red', type: 'fruit' },
      { text: 'Neon green', type: 'gummy' },
    ],
  },
  {
    q: 'Your ideal superpower:',
    options: [
      { text: 'Make anyone feel at home', type: 'cookie' },
      { text: 'Never run out of energy', type: 'chip' },
      { text: 'Heal with a smile', type: 'fruit' },
      { text: 'Teleport anywhere', type: 'gummy' },
    ],
  },
]

const RESULTS = {
  cookie: {
    emoji: '🍪',
    title: 'You’re a Warm Cookie',
    desc: 'Comforting, a little soft, and everyone’s favorite. You make people feel safe and cared for.',
  },
  chip: {
    emoji: '🥔',
    title: 'You’re a Potato Chip',
    desc: 'Bold, crispy, impossible to stop at just one. You bring the crunch and the energy.',
  },
  fruit: {
    emoji: '🍓',
    title: 'You’re a Fresh Strawberry',
    desc: 'Refreshing, sweet, and naturally bright. You lift the mood wherever you go.',
  },
  gummy: {
    emoji: '🐻',
    title: 'You’re a Gummy Bear',
    desc: 'Playful, colorful, and a little chaotic. Life with you is never boring.',
  },
}

export default function PersonalityQuiz() {
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState({})

  const answer = (type) => {
    const next = { ...scores, [type]: (scores[type] || 0) + 1 }
    setScores(next)
    setStep(step + 1)
  }

  const reset = () => {
    setScores({})
    setStep(0)
  }

  const finished = step >= QUESTIONS.length

  if (finished) {
    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
    const result = RESULTS[winner]
    return (
      <div>
        <h1 className="project-title">🍪 Which Snack Are You?</h1>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72 }}>{result.emoji}</div>
          <h2 style={{ fontSize: 26, margin: '12px 0 8px' }}>{result.title}</h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 420, margin: '0 auto 24px' }}>
            {result.desc}
          </p>
          <button className="btn" onClick={reset}>
            Take it again
          </button>
        </div>
      </div>
    )
  }

  const current = QUESTIONS[step]
  return (
    <div>
      <h1 className="project-title">🍪 Which Snack Are You?</h1>
      <p className="project-sub">
        Question {step + 1} of {QUESTIONS.length}
      </p>

      <div
        style={{
          height: 6,
          background: 'var(--border)',
          borderRadius: 99,
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(step / QUESTIONS.length) * 100}%`,
            background: '#ec4899',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0, fontSize: 22 }}>{current.q}</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {current.options.map((opt) => (
            <button
              key={opt.text}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => answer(opt.type)}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
