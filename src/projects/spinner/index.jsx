import { useState } from 'react'

// Each pose = [figureA, figureB]; figure = [x, y, rotation, legs, arms].
// legs: s=straight  p=spread  b=bent  u=up  x=split(one up,one down)
// arms: d=down/out  u=raised
const POSES = {
  // Modern main positions
  'Missionary':              [[60, 100, 90, 'p', 'd'], [72, 80, 90, 's', 'd']],
  'Cowgirl':                 [[60, 104, 90, 'p', 'd'], [78, 80, 0, 'b', 'd']],
  'Reverse Cowgirl':         [[60, 104, 90, 'p', 'd'], [78, 80, 0, 'b', 'u']],
  'Doggy Style':             [[58, 100, 90, 'b', 'd'], [92, 90, 0, 'b', 'd']],
  'Spooning':                [[62, 96, 90, 'b', 'd'], [80, 88, 90, 'b', 'd']],
  'The Lotus':               [[80, 96, 0, 'b', 'd'], [80, 82, 0, 'u', 'u']],
  'Standing':                [[68, 80, 0, 's', 'd'], [94, 80, 0, 's', 'u']],
  'The Bridge':              [[74, 100, 180, 's', 'u'], [86, 80, 0, 'b', 'd']],
  'Spread Eagle':            [[68, 100, 90, 'p', 'u'], [80, 80, 90, 's', 'd']],
  'The Wheelbarrow':         [[58, 96, 90, 'u', 'd'], [96, 80, 0, 's', 'd']],
  'The Butterfly':           [[58, 100, 90, 'u', 'd'], [92, 84, 0, 's', 'd']],
  'The Scissors':            [[64, 96, 90, 's', 'd'], [82, 96, 65, 's', 'd']],
  'The Pile Driver':         [[70, 96, 180, 'u', 'd'], [80, 72, 0, 'b', 'd']],
  'The Cradle':              [[78, 96, 0, 'b', 'd'], [82, 80, 0, 'u', 'u']],
  'The Anvil':               [[60, 100, 90, 'u', 'd'], [88, 82, 0, 'b', 'd']],
  'The Amazon':              [[60, 102, 90, 'b', 'd'], [80, 78, 0, 'b', 'd']],
  'The Deck Chair':          [[58, 98, 70, 'u', 'd'], [90, 84, 0, 'b', 'd']],
  'The Padlock':             [[66, 92, 0, 's', 'd'], [88, 82, 0, 's', 'd']],
  // The Joy of Sex
  'The X Position':          [[58, 96, 55, 's', 'd'], [92, 96, 125, 's', 'd']],
  'The Croupade':            [[60, 98, 90, 'b', 'd'], [80, 94, 90, 's', 'd']],
  'The Cuissade':            [[60, 98, 90, 's', 'd'], [82, 88, 68, 's', 'd']],
  'The Flanquette':          [[60, 98, 90, 'p', 'd'], [80, 92, 78, 's', 'd']],
  'The Viennese Oyster':     [[72, 100, 90, 'u', 'u'], [80, 78, 90, 's', 'd']],
  'The Magic Mountain':      [[58, 96, 68, 'b', 'd'], [88, 82, 0, 'b', 'd']],
  // Pop culture
  'The 69':                  [[80, 70, 0, 's', 'u'], [80, 102, 180, 's', 'u']],
  'The Rocking Horse':       [[78, 98, 0, 'b', 'd'], [80, 80, 0, 'b', 'u']],
  'The Stand and Carry':     [[74, 84, 0, 's', 'd'], [82, 72, 0, 'u', 'u']],
  'The Glowing Triangle':    [[58, 96, 72, 's', 'd'], [88, 86, 28, 's', 'd']],
  // Kama Sutra positions
  'Suspended Congress':      [[70, 82, 0, 's', 'd'], [82, 74, 0, 'u', 'u']],
  'The Yawning Position':    [[66, 100, 90, 'p', 'u'], [80, 80, 90, 's', 'd']],
  'The Widely Opened Position': [[66, 100, 90, 'p', 'd'], [82, 82, 0, 'b', 'd']],
  'The Position of Indrani': [[68, 100, 90, 'u', 'd'], [80, 78, 0, 'b', 'd']],
  'Splitting of a Bamboo':   [[64, 98, 90, 'x', 'u'], [84, 80, 0, 'b', 'd']],
  'Fixing of a Nail':        [[64, 98, 90, 'x', 'd'], [84, 80, 0, 'b', 'd']],
  'The Crab':                [[68, 100, 90, 'b', 'd'], [80, 82, 90, 'b', 'd']],
  'The Pressing Position':   [[68, 100, 90, 'u', 'd'], [80, 82, 90, 's', 'd']],
  'The Half-Pressed Position': [[66, 100, 90, 'x', 'd'], [82, 82, 90, 's', 'd']],
  'The Clasping Position':   [[64, 96, 90, 's', 'd'], [80, 90, 90, 's', 'd']],
  'The Rising Position':     [[66, 100, 90, 'u', 'd'], [80, 80, 0, 'b', 'd']],
  'The Lotus-Like Position': [[68, 98, 90, 'b', 'u'], [82, 82, 90, 's', 'd']],
  // Original embraces (lying)
  'Twining of a Creeper':    [[72, 82, 0, 's', 'd'], [86, 82, 0, 's', 'u']],
  'Climbing a Tree':         [[74, 82, 0, 's', 'd'], [88, 82, 0, 'x', 'u']],
  'Milk and Water Embrace':  [[78, 82, 0, 's', 'd'], [85, 82, 0, 's', 'd']],
  'Mixture of Sesame and Rice': [[70, 92, 90, 'b', 'd'], [78, 90, 90, 'b', 'd']],
}

const POSITIONS = Object.keys(POSES)

function legLines(legs) {
  switch (legs) {
    case 'p': return [[-14, 22], [14, 22]]
    case 'b': return [[-8, 24], [8, 24]] // knees handled separately
    case 'u': return [[-9, -4], [9, -4]]
    case 'x': return [[0, -6], [7, 24]]
    default:  return [[-6, 24], [6, 24]] // 's'
  }
}

function Figure({ cfg, color }) {
  const [x, y, rot, legs, arms] = cfg
  const ls = legLines(legs)
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`} stroke={color}
       strokeWidth="3" fill="none" strokeLinecap="round">
      <circle cx="0" cy="-18" r="6" fill={color} stroke="none" />
      <line x1="0" y1="-12" x2="0" y2="8" />
      {arms === 'u'
        ? <><line x1="0" y1="-6" x2="-9" y2="-15" /><line x1="0" y1="-6" x2="9" y2="-15" /></>
        : <line x1="-9" y1="-2" x2="9" y2="-2" />}
      {legs === 'b'
        ? <>
            <line x1="0" y1="8" x2="-8" y2="14" /><line x1="-8" y1="14" x2="-8" y2="24" />
            <line x1="0" y1="8" x2="8" y2="14" /><line x1="8" y1="14" x2="8" y2="24" />
          </>
        : <>
            <line x1="0" y1="8" x2={ls[0][0]} y2={ls[0][1]} />
            <line x1="0" y1="8" x2={ls[1][0]} y2={ls[1][1]} />
          </>}
    </g>
  )
}

function PoseArt({ name }) {
  const cfg = POSES[name]
  if (!cfg) return null
  return (
    <svg viewBox="0 0 160 130" width="220" height="178"
         style={{ background: '#faf7f2', borderRadius: 14, border: '1px solid #e7ddd0' }}>
      <line x1="14" y1="120" x2="146" y2="120" stroke="#e0d4c2" strokeWidth="2" />
      <Figure cfg={cfg[0]} color="#d05a7e" />
      <Figure cfg={cfg[1]} color="#4a78b0" />
    </svg>
  )
}

export default function Spinner() {
  const [pos, setPos] = useState(null)
  const spin = () => setPos(POSITIONS[Math.floor(Math.random() * POSITIONS.length)])

  return (
    <div style={{ textAlign: 'center', padding: '12vh 16px' }}>
      <h1 style={{ marginBottom: 8 }}>Kama Sutra Spinner</h1>
      <div style={{ minHeight: 178, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {pos ? <PoseArt name={pos} /> : <span style={{ color: '#aaa' }}>Press spin</span>}
      </div>
      <div style={{ fontSize: '2rem', margin: '20px 0', minHeight: 40 }}>{pos || ''}</div>
      <button
        onClick={spin}
        style={{ fontSize: '1.2rem', padding: '10px 28px', cursor: 'pointer', borderRadius: 10 }}
      >
        Spin
      </button>
    </div>
  )
}
