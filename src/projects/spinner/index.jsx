import { useState } from 'react'

const POSITIONS = [
  'Lotus', 'Cowgirl', 'Missionary', 'Doggy Style', 'Spooning',
  'Reverse Cowgirl', 'Standing', 'The Bridge', 'The Eagle', 'The Lap Dance',
  'The Lotus Blossom', 'The Butterfly', 'The Pretzel', 'The Splitting Bamboo',
  'The Wheelbarrow', 'The Crouching Tiger', 'Suspended Congress', 'The Peg',
  'The Yawning', 'The Plough',
]

export default function Spinner() {
  const [pos, setPos] = useState('Press spin')
  const spin = () => setPos(POSITIONS[Math.floor(Math.random() * POSITIONS.length)])

  return (
    <div style={{ textAlign: 'center', padding: '15vh 16px' }}>
      <h1 style={{ marginBottom: 8 }}>Kama Sutra Spinner</h1>
      <div style={{ fontSize: '2.4rem', margin: '32px 0', minHeight: 48 }}>{pos}</div>
      <button
        onClick={spin}
        style={{ fontSize: '1.2rem', padding: '10px 28px', cursor: 'pointer', borderRadius: 10 }}
      >
        Spin
      </button>
    </div>
  )
}
