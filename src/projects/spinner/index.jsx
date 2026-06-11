import { useState } from 'react'

const POSITIONS = [
  'Lotus', 'Cowgirl', 'Missionary', 'Doggy Style', 'Spooning',
  'Reverse Cowgirl', 'Standing', 'The Bridge', 'The Eagle', 'The Lap Dance',
  'The Lotus Blossom', 'The Butterfly', 'The Pretzel', 'The Splitting Bamboo',
  'The Wheelbarrow', 'The Crouching Tiger', 'Suspended Congress', 'The Peg',
  'The Yawning', 'The Plough', 'The Clasping', 'The Twining', 'The Rising',
  'The Pressing', 'The Half-Pressed', 'The Mare', 'The Crab', 'The Packed',
  'The Lotus-Like', 'The Turning', 'The Swing', 'The Tripod', 'The Elephant',
  'The Tigress', 'The Deer', 'The Bull', 'The Hare', 'The Cat', 'The Serpent',
  'The Snake Trap', 'The Boat', 'The Cradle', 'The Throne', 'The Anvil',
  'The Hammock', 'The Ladle', 'The Spider', 'The Scissors', 'The Drawbridge',
  'The Lazy Man', 'The Catherine Wheel', 'The Frog', 'The Coital Alignment',
  'The Reclining Lotus', 'The Backbend', 'The Glowing Triangle', 'The Magic Mountain',
  'The Counter Balance', 'The Rocking Horse', 'The Stand and Carry', 'The Galley',
  'The Amazon', 'The Curled Angel', 'The Padlock',
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
