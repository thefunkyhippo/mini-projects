import { useState } from 'react'

const POSITIONS = [
  // Modern main positions
  'Missionary', 'Cowgirl', 'Reverse Cowgirl', 'Doggy Style', 'Spooning',
  'The Lotus', 'Standing', 'The Bridge', 'Spread Eagle', 'The Wheelbarrow',
  'The Butterfly', 'The Scissors', 'The Pile Driver', 'The Cradle',
  'The Anvil', 'The Amazon', 'The Deck Chair', 'The Padlock',
  // The Joy of Sex
  'The X Position', 'The Croupade', 'The Cuissade', 'The Flanquette',
  'The Viennese Oyster', 'The Magic Mountain',
  // Pop culture
  'The 69', 'The Rocking Horse', 'The Stand and Carry', 'The Glowing Triangle',
  // Kama Sutra positions
  'Suspended Congress', 'The Yawning Position', 'The Widely Opened Position',
  'The Position of Indrani', 'Splitting of a Bamboo', 'Fixing of a Nail',
  'The Crab', 'The Pressing Position', 'The Half-Pressed Position',
  'The Clasping Position', 'The Rising Position', 'The Lotus-Like Position',
  // Original embraces (lying)
  'Twining of a Creeper', 'Climbing a Tree', 'Milk and Water Embrace',
  'Mixture of Sesame and Rice',
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
