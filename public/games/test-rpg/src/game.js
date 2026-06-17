// test-rpg — a tiny top-down RPG demo built around the SVG sprite set.
// The world is procedurally generated fresh on every page load. A camera
// follows the player (kept centered) and stops scrolling at the world edges.
// No build step, no dependencies. Open index.html and explore.

const TILE = 48;
const PIXEL = TILE / 16; // legacy 16px sprites upscale by this
// Sprites listed here are authored at 32px and scale at half (so they stay the
// same on-screen size while carrying twice the detail). Lets sprites be upgraded
// to hi-res one at a time without breaking layout. Tiles auto-scale to TILE, so
// they don't need to be listed.
const HIRES = new Set();
const spriteScale = name => (HIRES.has(name) ? TILE / 32 : PIXEL);

// Viewport (what's on screen) in tiles — the world is much larger and scrolls.
const VIEW_COLS = 16;
const VIEW_ROWS = 12;
const VIEW_W = VIEW_COLS * TILE;
const VIEW_H = VIEW_ROWS * TILE;

// World dimensions are mutable — the overworld and the cave are different sizes.
const OVER_COLS = 400, OVER_ROWS = 240; // overworld
let WORLD_COLS = OVER_COLS, WORLD_ROWS = OVER_ROWS;
let WORLD_W = WORLD_COLS * TILE, WORLD_H = WORLD_ROWS * TILE;
function setDims(cols, rows) {
  WORLD_COLS = cols; WORLD_ROWS = rows;
  WORLD_W = cols * TILE; WORLD_H = rows * TILE;
}

const TILE_SPRITE = {
  G: 'tile-grass', P: 'tile-path', W: 'tile-water', '#': 'tile-wall',
  H: 'tile-highland', M: 'tile-mire', B: 'tile-blight',
  S: 'tile-sand', N: 'tile-snow',     // desert / snow biomes
  c: 'tile-cave', X: 'tile-cavewall', // underground
};

const isWall = ch => ch === 'W' || ch === '#' || ch === 'X'; // blocks movement
const isFloor = ch => !!ch && ch !== 'W' && !isWall(ch);     // walkable ground of any biome

// Several texture variants per ground type, chosen by tile position, so the
// landscape doesn't read as one design tiled over and over.
const TILE_VARIANTS = {
  G: ['tile-grass', 'tile-grass2', 'tile-grass3', 'tile-grass4'],
  W: ['tile-water', 'tile-water2', 'tile-water3'],
  H: ['tile-highland', 'tile-highland2', 'tile-highland3'],
  M: ['tile-mire', 'tile-mire2', 'tile-mire3'],
  B: ['tile-blight', 'tile-blight2', 'tile-blight3'],
  S: ['tile-sand', 'tile-sand2', 'tile-sand3'],
  N: ['tile-snow', 'tile-snow2', 'tile-snow3'],
  c: ['tile-cave', 'tile-cave2', 'tile-cave3'],
  X: ['tile-cavewall', 'tile-cavewall2'],
};
function tileSprite(ch, c, r) {
  const v = TILE_VARIANTS[ch];
  if (!v) return TILE_SPRITE[ch];
  const h = (Math.imul(c, 92837111) ^ Math.imul(r, 689287499)) >>> 0;
  return v[h % v.length];
}

// Biomes: ground tile + how much water, how wooded/rocky/brambly, and which mobs.
// water: noise threshold (higher = wetter). treeBase: noise cutoff (lower = more
// trees). treeProb/rock/bush scale density. mob: weighted spawn pool.
const BIOMES = {
  meadow:   { ground: 'G', water: 0.30, treeBase: 0.78, treeProb: 0.16, rock: 0.4, bush: 0.8, label: 'Meadow',   mob: ['slime', 'slime', 'skeleton', 'wisp'] },
  forest:   { ground: 'G', water: 0.26, treeBase: 0.58, treeProb: 0.5,  rock: 0.3, bush: 1.0, label: 'Forest',   mob: ['slime', 'slime', 'wisp'] },
  highland: { ground: 'H', water: 0.18, treeBase: 0.86, treeProb: 0.10, rock: 1.8, bush: 0.3, label: 'Highland', mob: ['skeleton', 'skeleton', 'cultist'] },
  marsh:    { ground: 'M', water: 0.48, treeBase: 0.80, treeProb: 0.14, rock: 0.2, bush: 1.2, label: 'Marsh',    mob: ['slime', 'slime', 'wisp'] },
  blight:   { ground: 'B', water: 0.22, treeBase: 0.84, treeProb: 0.13, rock: 0.7, bush: 0.2, label: 'Blight',   mob: ['skeleton', 'cultist', 'cultist'] },
  desert:   { ground: 'S', water: 0.06, treeBase: 0.90, treeProb: 0.06, rock: 0.9, bush: 0.1, label: 'Desert',   mob: ['scorpion', 'scorpion', 'skeleton'] },
  snow:     { ground: 'N', water: 0.16, treeBase: 0.74, treeProb: 0.22, rock: 0.6, bush: 0.2, label: 'Snowfield', mob: ['wolf', 'wolf', 'wisp'] },
};

const DIRS = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};
const DIR4 = Object.values(DIRS);

const PLAYER_STEP = 100; // ms per tile (snappy)
let maxHp = 5;           // hearts (raised by heart containers)
const HP_CAP = 12;
const IFRAMES = 1000;    // ms of invulnerability after a hit
// ── weapons ─────────────────────────────────────────────────────────────────
// Melee weapons (swung with Space). dur=swing ms, cd=cooldown ms, reach in tiles,
// kb=knockback tiles, scale/arc tune the swing visual.
const MELEE = {
  dagger:     { label: 'Dagger',     dmg: 1, dur: 95,  cd: 90,  reach: 0.78, kb: 1, sprite: 'dagger',     scale: 1.7, arc: 0.7 },
  sword:      { label: 'Sword',      dmg: 2, dur: 160, cd: 170, reach: 0.95, kb: 2, sprite: 'sword',      scale: 2.5, arc: 0.95 },
  waraxe:     { label: 'War Axe',    dmg: 3, dur: 210, cd: 250, reach: 1.0,  kb: 3, sprite: 'waraxe',     scale: 2.6, arc: 1.05 },
  greatsword: { label: 'Greatsword', dmg: 4, dur: 300, cd: 340, reach: 1.25, kb: 3, sprite: 'greatsword', scale: 3.1, arc: 1.25 },
};
// Ranged weapons (fired with F). staff casts the magic spell (uses mana); the
// rest loose physical projectiles (no mana, just a cooldown).
const RANGED = {
  staff:    { label: 'Staff', staff: true },
  bow:      { label: 'Bow',      dmg: 2, cd: 240, speed: 0.42, life: 900,  size: 1.0, color: '#caa46a' },
  crossbow: { label: 'Crossbow', dmg: 3, cd: 560, speed: 0.5,  life: 1100, size: 1.1, color: '#c2cad6', pierce: true },
  sling:    { label: 'Sling',    dmg: 1, cd: 150, speed: 0.4,  life: 700,  size: 0.8, color: '#9a93a6' },
};
const WEAPON_DESC = {
  dagger: 'fast, light, short reach', sword: 'balanced all-rounder',
  waraxe: 'slow, heavy, strong knockback', greatsword: 'slowest, huge damage + reach',
  staff: 'casts your equipped spell (mana)', bow: 'quick arrows, no mana',
  crossbow: 'slow, piercing bolts', sling: 'rapid weak shots',
};
const WEAPON_LOOT = ['dagger', 'waraxe', 'greatsword', 'bow', 'crossbow', 'sling']; // findable in chests
const ENEMY_HP = { slime: 2, skeleton: 3, bat: 1, cultist: 3, wisp: 2, golem: 6, wraith: 4, scorpion: 3, wolf: 3 };
// ranged enemies: fire a bolt at the player from afar
const SHOOTERS = {
  cultist: { range: 7, cd: 1700, speed: 0.18, color: '#a3303f' }, // dark-red hex
  wisp:    { range: 8, cd: 1400, speed: 0.22, color: '#8a4aa0' }, // arcane bolt
  wraith:  { range: 9, cd: 1200, speed: 0.26, color: '#b06ad0' }, // cave specter, faster
};
const monStep = t => t === 'slime' ? 280 : t === 'golem' ? 360 : t === 'wraith' ? 300 : t === 'wolf' ? 175 : t === 'scorpion' ? 230 : 230;
// contact damage in hearts (default 1) — cave brutes hit harder
const CONTACT_DMG = { golem: 2 };
const KB_TILES = 2;         // tiles an enemy is shoved back when hit
const HURT_FLASH = 240;     // ms an enemy blinks after taking damage
const DEATH_DUR = 520;      // ms a slain enemy spends dying (knocked back, fading)
// magic
const START_MAX_MP = 4;     // starting mana orbs
const MP_CAP = 10;          // hard ceiling (tomes raise max toward this)
const SPELL_COST = 2;       // mana per cast
const SPELL_DMG = 2;        // damage per magic bolt
const SPELL_CD = 240;       // ms between casts
const SPELL_LIFE = 720;     // ms a bolt lives
const SPELL_SPEED = 0.34;   // px/ms
const MANA_REGEN = 3500;    // ms to regen 1 mana

// ── helpers ─────────────────────────────────────────────────────────────────
const rint = n => Math.floor(Math.random() * n);
const chance = p => Math.random() < p;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clampi = (v, lo, hi) => clamp(v, lo, hi);
const inb = (c, r) => c >= 0 && r >= 0 && c < WORLD_COLS && r < WORLD_ROWS;
const footX = c => c * TILE + TILE / 2;
const footY = r => (r + 1) * TILE;
const key = (c, r) => c + ',' + r;

// ── world state (assigned by generate()) ────────────────────────────────────
let grid = null;            // only used underground (finite cave); overworld is chunk-streamed
let props = [], items = [], monsters = [], bats = [], npcs = [];
let solidTiles = new Set(), chestAt = new Map(), npcAt = new Map();
let effects = [], projectiles = [], enemyShots = [];
let player;
let portal = null;          // {c, r, kind:'enter'|'exit'} — cave mouth / stairs up
let overworldPortal = null; // the cave entrance, remembered while underground
let caveReturn = null;      // overworld tile to return to on exit
let inCave = false;
let camX = 0, camY = 0;
let coins = 0, potions = 0;
let mp = START_MAX_MP, maxMp = START_MAX_MP, manaTimer = MANA_REGEN;

// ── infinite world: deterministic noise + chunk streaming ───────────────────
let worldSeed = 1;
const CHUNK = 16;           // tiles per chunk
const STREAM_RAD = 3;       // chunks loaded around the player each way
const chunks = new Map();   // ck -> stored entities for unloaded chunks
const loaded = new Set();   // ck currently merged into the active arrays
let lastPcx = null, lastPcy = null;

// ── infinite procedural world (deterministic noise + chunk streaming) ────────
// Smooth value-noise sampled directly from world coords (no stored grid).
function hash2i(ix, iy, seed) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
const hash2 = (x, y, seed) => hash2i(x, y, seed) / 4294967295;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function vnoise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const tx = x - x0, ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed);
  const c2 = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * sx, bot = c2 + (d - c2) * sx;
  return top + (bot - top) * sy;
}

function biomeAt(c, r) {
  const e = vnoise(c * 0.022, r * 0.022, worldSeed + 1); // elevation
  const t = vnoise(c * 0.018, r * 0.018, worldSeed + 2); // temperature
  const m = vnoise(c * 0.020, r * 0.020, worldSeed + 3); // moisture
  if (t < 0.30) return 'snow';
  if (t > 0.70 && m < 0.42) return 'desert';
  if (e > 0.72) return 'highland';
  if (m > 0.70) return 'forest';
  if (m < 0.34 && t > 0.55) return 'blight';
  if (e < 0.30 && m > 0.50) return 'marsh';
  return 'meadow';
}
function groundAt(c, r) {
  const b = BIOMES[biomeAt(c, r)];
  return vnoise(c * 0.05, r * 0.05, worldSeed + 9) < b.water ? 'W' : b.ground;
}
function tileAt(c, r) {
  if (inCave) return (c < 0 || r < 0 || c >= WORLD_COLS || r >= WORLD_ROWS) ? 'X' : grid[r][c];
  return groundAt(c, r);
}
const blendAt = (c, r) => vnoise(c * 0.28, r * 0.28, worldSeed + 5);
const walkableBase = (c, r) => !isWall(tileAt(c, r));

function decalAt(c, r) {
  if (inCave) return null;
  const ch = tileAt(c, r), h = hash2(c, r, worldSeed + 71);
  if (ch === 'G') {
    if (h < 0.04) return 'deco-flowers';
    if (h < 0.08) return 'deco-flowers-y';
    if (h < 0.11) return 'deco-mushroom';
    if (h < 0.13) return 'deco-pebbles';
    if (h < 0.30) return 'deco-grass';
  } else if (ch === 'M') { if (h < 0.18) return 'deco-reeds'; }
  else if (ch === 'H') { if (h < 0.09) return 'deco-pebbles'; }
  else if (ch === 'B') { if (h < 0.06) return 'deco-pebbles'; }
  else if (ch === 'S' || ch === 'N') { if (h < 0.05) return 'deco-pebbles'; }
  return null;
}

function makeBat(x, y) {
  return { type: 'bat', hp: 1, kx: 0, ky: 0, hurt: 0, dying: 0, x, y,
    vx: (Math.random() * 2 - 1) * 0.045, vy: (Math.random() * 2 - 1) * 0.03, ph: Math.random() * 6 };
}

const VILLAGE_LINES = [
  "Welcome, traveler. The wilds grow restless.",
  "They say a cave hides relics of great power.",
  "Rest a moment — the roads are dangerous.",
  "Mind the scorpions out in the dunes, friend.",
  "Wolves hunt the snowfields. Keep your blade close.",
  "Crystals restore your magic — gather what you can.",
  "Some chests hold the strength to grow your heart.",
  "Press I to check what you carry.",
];

// ── chunk generation + streaming ────────────────────────────────────────────
function addProp(ch, occ, name, c, r) {
  const k = key(c, r);
  if (occ.has(k) || !isFloor(tileAt(c, r))) return;
  occ.add(k); ch.props.push({ name, c, r });
}
function makeVillage(ch, x0, y0, rng, occ) {
  const huts = 4 + (rng() * 5 | 0);
  for (let i = 0; i < huts; i++) addProp(ch, occ, 'house', x0 + 2 + (rng() * 12 | 0), y0 + 2 + (rng() * 12 | 0));
  const npcN = 2 + (rng() * 3 | 0);
  for (let i = 0; i < npcN; i++) {
    const c = x0 + 2 + (rng() * 12 | 0), r = y0 + 2 + (rng() * 12 | 0), k = key(c, r);
    if (!occ.has(k) && isFloor(tileAt(c, r))) {
      occ.add(k);
      ch.npcs.push({ type: 'npc', tx: c, ty: r, x: footX(c), y: footY(r), line: VILLAGE_LINES[rng() * VILLAGE_LINES.length | 0] });
    }
  }
}
function chunkGen(cx, cy) {
  const rng = mulberry32(hash2i(cx, cy, worldSeed + 777) || 1);
  const ch = { props: [], items: [], monsters: [], bats: [], npcs: [] };
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const occ = new Set();
  const here = biomeAt(x0 + 8, y0 + 8);

  if (rng() < 0.03 && (here === 'meadow' || here === 'forest')) {
    makeVillage(ch, x0, y0, rng, occ);
  }

  // trees (forest noise) — cactus in desert
  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const c = x0 + lx, r = y0 + ly;
      if (!isFloor(tileAt(c, r))) continue;
      const bn = biomeAt(c, r), b = BIOMES[bn];
      const f = vnoise(c * 0.16, r * 0.16, worldSeed + 6);
      if (f > b.treeBase && rng() < Math.min(0.42, (f - b.treeBase) * 3 * b.treeProb)) {
        addProp(ch, occ, bn === 'desert' ? 'cactus' : 'tree', c, r);
      }
    }
  }
  // rock / bramble clusters
  const clusters = rng() < 0.75 ? 1 + (rng() < 0.4 ? 1 : 0) : 0;
  for (let i = 0; i < clusters; i++) {
    let c = x0 + (rng() * CHUNK | 0), r = y0 + (rng() * CHUNK | 0);
    const b = BIOMES[biomeAt(c, r)];
    const name = rng() < b.rock / (b.rock + b.bush + 0.01) ? 'rock' : 'bush';
    const size = 2 + (rng() * 4 | 0);
    for (let s = 0; s < size; s++) { addProp(ch, occ, name, c, r); const d = DIR4[rng() * 4 | 0]; c += d.dx; r += d.dy; }
  }
  // a rock-ringed treasure cache
  if (rng() < 0.05) {
    const c = x0 + 4 + (rng() * 8 | 0), r = y0 + 4 + (rng() * 8 | 0);
    if (isFloor(tileAt(c, r)) && !occ.has(key(c, r))) {
      for (const d of DIR4) addProp(ch, occ, 'rock', c + d.dx, r + d.dy);
      const roll = rng();
      let loot = 'crystal', spell;
      if (roll < 0.34) { loot = 'scroll'; spell = RELICS[rng() * RELICS.length | 0]; }
      else if (roll < 0.58) { loot = 'weapon'; spell = WEAPON_LOOT[rng() * WEAPON_LOOT.length | 0]; }
      else if (roll < 0.78) loot = 'tome';
      else if (roll < 0.9) loot = 'heart';
      occ.add(key(c, r));
      ch.props.push({ name: 'chest', c, r, loot, spell, opened: false });
    }
  }
  // pickups
  const nItems = rng() < 0.6 ? 1 + (rng() * 2 | 0) : 0;
  for (let i = 0; i < nItems; i++) {
    const c = x0 + (rng() * CHUNK | 0), r = y0 + (rng() * CHUNK | 0);
    if (isFloor(tileAt(c, r)) && !occ.has(key(c, r))) {
      const roll = rng();
      ch.items.push({ name: roll < 0.6 ? 'coin' : roll < 0.82 ? 'crystal' : 'potion', c, r });
    }
  }
  // wandering monsters (biome pool)
  const nMon = rng() < 0.7 ? 1 + (rng() * 2 | 0) : 0;
  for (let i = 0; i < nMon; i++) {
    const c = x0 + (rng() * CHUNK | 0), r = y0 + (rng() * CHUNK | 0);
    if (isFloor(tileAt(c, r)) && !occ.has(key(c, r))) {
      const pool = BIOMES[biomeAt(c, r)].mob, type = pool[rng() * pool.length | 0];
      ch.monsters.push(makeActor(type, c, r, monStep(type)));
    }
  }
  if (rng() < 0.45) ch.bats.push(makeBat(footX(x0 + (rng() * CHUNK | 0)), footY(y0 + (rng() * CHUNK | 0))));
  return ch;
}
function getChunk(cx, cy) {
  const ck = cx + ',' + cy;
  let ch = chunks.get(ck);
  if (!ch) { ch = chunkGen(cx, cy); chunks.set(ck, ch); }
  return ch;
}
function loadChunk(cx, cy) {
  const ck = cx + ',' + cy;
  if (loaded.has(ck)) return;
  const ch = getChunk(cx, cy);
  for (const e of ch.props) { e._ck = ck; props.push(e); }
  for (const e of ch.items) { e._ck = ck; items.push(e); }
  for (const e of ch.monsters) { e._ck = ck; monsters.push(e); }
  for (const e of ch.bats) { e._ck = ck; bats.push(e); }
  for (const e of ch.npcs) { e._ck = ck; npcs.push(e); }
  loaded.add(ck);
}
function unloadChunk(ck) {
  const ch = chunks.get(ck);
  ch.props = props.filter(e => e._ck === ck); props = props.filter(e => e._ck !== ck);
  ch.items = items.filter(e => e._ck === ck); items = items.filter(e => e._ck !== ck);
  ch.monsters = monsters.filter(e => e._ck === ck); monsters = monsters.filter(e => e._ck !== ck);
  ch.bats = bats.filter(e => e._ck === ck); bats = bats.filter(e => e._ck !== ck);
  ch.npcs = npcs.filter(e => e._ck === ck); npcs = npcs.filter(e => e._ck !== ck);
  loaded.delete(ck);
}
function rebuildIndexes() {
  solidTiles = new Set(); chestAt = new Map(); npcAt = new Map();
  for (const p of props) { solidTiles.add(key(p.c, p.r)); if (p.name === 'chest') chestAt.set(key(p.c, p.r), p); }
  for (const n of npcs) { solidTiles.add(key(n.tx, n.ty)); npcAt.set(key(n.tx, n.ty), n); }
}
function streamChunks(force) {
  if (inCave) return;
  const pcx = Math.floor(player.tx / CHUNK), pcy = Math.floor(player.ty / CHUNK);
  if (!force && pcx === lastPcx && pcy === lastPcy) return;
  lastPcx = pcx; lastPcy = pcy;
  const want = new Set();
  for (let dy = -STREAM_RAD; dy <= STREAM_RAD; dy++) for (let dx = -STREAM_RAD; dx <= STREAM_RAD; dx++) want.add((pcx + dx) + ',' + (pcy + dy));
  for (const ck of [...loaded]) if (!want.has(ck)) unloadChunk(ck);
  for (let dy = -STREAM_RAD; dy <= STREAM_RAD; dy++) for (let dx = -STREAM_RAD; dx <= STREAM_RAD; dx++) loadChunk(pcx + dx, pcy + dy);
  rebuildIndexes();
}

function makeActor(type, c, r, step) {
  return { type, tx: c, ty: r, x: footX(c), y: footY(r), facing: 'down', moving: false, t: 0, timer: rint(2200), step, hp: ENEMY_HP[type] || 1, kx: 0, ky: 0, hurt: 0, dying: 0, shootTimer: rint(2000) };
}

// Spiral out from (oc,or) to the first walkable tile (entities not yet streamed).
function findOpen(oc, or) {
  for (let rad = 0; rad < 400; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = oc + dc, r = or + dr;
        if (walkableBase(c, r)) return { c, r };
      }
    }
  }
  return { c: oc, r: or };
}

function generate() {
  worldSeed = (Math.random() * 2147483647) | 0;
  inCave = false; grid = null;
  chunks.clear(); loaded.clear(); lastPcx = lastPcy = null;
  props = []; items = []; monsters = []; bats = []; npcs = [];
  solidTiles = new Set(); chestAt = new Map(); npcAt = new Map();
  effects = []; projectiles = []; enemyShots = [];

  const start = findOpen(0, 0);
  player = { tx: start.c, ty: start.r, x: footX(start.c), y: footY(start.r), facing: 'down', moving: false, t: 0, hp: maxHp, invuln: 0, castCd: 0, spell: 'bolt',
    melee: ['sword', 'dagger'], meleeId: 'sword',       // owned + equipped melee
    ranged: ['staff', 'bow'], rangedId: 'staff',        // owned + equipped ranged
    attack: { active: false, t: 0, dir: 'down', cd: 0, hit: null, w: null } };
  mp = maxMp = START_MAX_MP; manaTimer = MANA_REGEN;

  // a cave entrance a fair walk away (search outward for highland, then any land)
  portal = null;
  for (let rad = 14; rad < 90 && !portal; rad += 3) {
    for (let a = 0; a < 8 && !portal; a++) {
      const ang = a / 8 * Math.PI * 2;
      const c = start.c + Math.round(Math.cos(ang) * rad), r = start.r + Math.round(Math.sin(ang) * rad);
      if (walkableBase(c, r) && (rad > 50 || biomeAt(c, r) === 'highland')) portal = { c, r, kind: 'enter' };
    }
  }
  if (!portal) { const p = findOpen(start.c + 30, start.r + 20); portal = { c: p.c, r: p.r, kind: 'enter' }; }
  overworldPortal = portal;

  streamChunks(true);
}

// ── cave / underground level ────────────────────────────────────────────────
function enterCave() {
  caveReturn = { c: player.tx, r: player.ty };
  for (const ck of [...loaded]) unloadChunk(ck); // flush overworld entities to cache
  loaded.clear(); lastPcx = lastPcy = null;
  inCave = true;
  generateCave();
  say("You descend into the burrows...");
}
function exitCave() {
  inCave = false;
  grid = null;
  setDims(OVER_COLS, OVER_ROWS);
  props = []; items = []; monsters = []; bats = []; npcs = [];
  solidTiles = new Set(); chestAt = new Map(); npcAt = new Map();
  projectiles = []; enemyShots = []; effects = [];
  portal = overworldPortal;
  player.tx = caveReturn.c; player.ty = caveReturn.r;
  player.x = footX(player.tx); player.y = footY(player.ty);
  player.moving = false; player.attack.active = false;
  streamChunks(true);
  updateCamera();
}
// Walking onto a portal tile transitions levels.
function tryPortal() {
  if (!portal || player.tx !== portal.c || player.ty !== portal.r) return false;
  if (portal.kind === 'enter') enterCave(); else exitCave();
  return true;
}

function generateCave() {
  setDims(64, 44);
  const cols = WORLD_COLS, rows = WORLD_ROWS;
  // 1. cellular-automata cavern: random fill, then smooth into organic burrows
  let g = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const edge = c < 2 || r < 2 || c >= cols - 2 || r >= rows - 2;
      row.push(edge ? 'X' : (Math.random() < 0.46 ? 'X' : 'c'));
    }
    g.push(row);
  }
  for (let it = 0; it < 5; it++) {
    const ng = g.map(row => row.slice());
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        let w = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (g[r + dr][c + dc] === 'X') w++;
        ng[r][c] = w >= 5 ? 'X' : 'c';
      }
    }
    g = ng;
  }
  grid = g;
  setDims(cols, rows);

  // 2. keep only the largest connected floor cavern (fill the rest with rock)
  const seen = new Set();
  let bestRegion = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'c' || seen.has(key(c, r))) continue;
      const region = [], stack = [[c, r]];
      seen.add(key(c, r));
      while (stack.length) {
        const [x, y] = stack.pop();
        region.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && grid[ny][nx] === 'c' && !seen.has(key(nx, ny))) {
            seen.add(key(nx, ny)); stack.push([nx, ny]);
          }
        }
      }
      if (region.length > bestRegion.length) bestRegion = region;
    }
  }
  const keep = new Set(bestRegion.map(([x, y]) => key(x, y)));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === 'c' && !keep.has(key(c, r))) grid[r][c] = 'X';

  // 3. spawn point: the floor tile nearest the centre
  const cc = cols >> 1, cr = rows >> 1;
  let spawn = bestRegion[0];
  let bd = Infinity;
  for (const [x, y] of bestRegion) { const d = (x - cc) ** 2 + (y - cr) ** 2; if (d < bd) { bd = d; spawn = [x, y]; } }
  const [sc, sr] = spawn;

  // fresh level containers
  solidTiles = new Set(); props = []; items = []; chestAt = new Map(); npcAt = new Map(); npcs = [];
  monsters = []; bats = []; projectiles = []; enemyShots = []; effects = [];
  portal = { c: sc, r: sr, kind: 'exit' }; // stairs back up, at the spawn

  const free = bestRegion.filter(([x, y]) => Math.abs(x - sc) + Math.abs(y - sr) > 4); // not on top of spawn

  // 4. harder monsters (dense but not overwhelming)
  const mob = Math.round(bestRegion.length / 45);
  for (let i = 0; i < mob; i++) {
    const cell = free[rint(free.length)]; if (!cell) break;
    const [x, y] = cell;
    if (solidTiles.has(key(x, y))) continue;
    const roll = Math.random();
    const type = roll < 0.32 ? 'golem' : roll < 0.66 ? 'wraith' : 'skeleton';
    monsters.push(makeActor(type, x, y, type === 'golem' ? 360 : type === 'wraith' ? 300 : 230));
  }

  // 5. magic-item chests (relic-rich) + a few mana crystals
  const chestN = 3 + rint(3);
  for (let i = 0; i < chestN; i++) {
    const cell = free[rint(free.length)]; if (!cell) break;
    const [x, y] = cell;
    if (solidTiles.has(key(x, y))) continue;
    const roll = Math.random();
    let loot = 'tome', spell;
    if (roll < 0.5) { loot = 'scroll'; spell = RELICS[rint(RELICS.length)]; }
    else if (roll < 0.72) { loot = 'weapon'; spell = WEAPON_LOOT[rint(WEAPON_LOOT.length)]; }
    else if (roll < 0.88) loot = 'tome';
    else loot = 'heart';
    const ch = { name: 'chest', c: x, r: y, loot, spell, opened: false };
    props.push(ch); solidTiles.add(key(x, y)); chestAt.set(key(x, y), ch);
  }
  for (let i = 0; i < 8; i++) {
    const cell = free[rint(free.length)]; if (!cell) continue;
    const [x, y] = cell;
    if (!solidTiles.has(key(x, y))) items.push({ name: 'crystal', c: x, r: y });
  }

  // 6. drop the player at the entrance
  player.tx = sc; player.ty = sr; player.x = footX(sc); player.y = footY(sr);
  player.moving = false; player.attack.active = false;
}

// ── input (Pokémon-style: cardinal only, most-recent key wins) ──────────────
const KEYDIR = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
};
const heldKeys = new Set();
const pressOrder = [];
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  // a dialog box swallows the next key to dismiss it
  if (dialogOpen && (k === ' ' || k === 'enter' || k === 'f' || k === 'e' || KEYDIR[k])) { e.preventDefault(); hideDialog(); return; }
  if (k === 'i' || k === 'tab') { e.preventDefault(); toggleInventory(); return; }
  if (k === 'q') { e.preventDefault(); drinkPotion(); return; }
  if (k === 'z') { e.preventDefault(); cycleWeapon('melee'); return; }
  if (k === 'x') { e.preventDefault(); cycleWeapon('ranged'); return; }
  if (k === ' ' || k === 'j' || k === 'enter') { e.preventDefault(); startAttack(); return; }
  if (k === 'f' || k === 'l') { e.preventDefault(); useRanged(); return; }
  if (!KEYDIR[k]) return;
  e.preventDefault();
  if (!heldKeys.has(k)) { heldKeys.add(k); pressOrder.push(k); }
});

// ── text boxes + inventory + potion use ─────────────────────────────────────
let dialogOpen = false, invOpen = false;
function say(msg) {
  const box = document.getElementById('textbox');
  if (!box) return;
  box.textContent = msg;
  box.style.display = 'block';
  dialogOpen = true;
}
function hideDialog() {
  const box = document.getElementById('textbox');
  if (box) box.style.display = 'none';
  dialogOpen = false;
}
let toastTimer = null;
function toast(msg) { // brief, non-blocking message (doesn't pause movement)
  const box = document.getElementById('textbox');
  if (!box || dialogOpen) return;
  box.textContent = msg; box.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (!dialogOpen) box.style.display = 'none'; }, 1100);
}
function drinkPotion() {
  if (potions <= 0 || player.hp >= maxHp) return;
  potions--; player.hp = Math.min(maxHp, player.hp + 2);
  syncHud();
}
function toggleInventory() {
  invOpen = !invOpen;
  const panel = document.getElementById('inventory');
  if (!panel) return;
  if (invOpen) {
    const wpnRow = (id, reg, equipped, extra) => {
      const d = reg[id];
      return '<div class="inv-wpn' + (id === equipped ? ' eq' : '') + '">' +
        (id === equipped ? '▸ ' : '&nbsp;&nbsp;') + d.label +
        '<span>' + (WEAPON_DESC[id] || '') + (extra || '') + '</span></div>';
    };
    const meleeList = player.melee.map(id => wpnRow(id, MELEE, player.meleeId)).join('');
    const rangedList = player.ranged.map(id =>
      wpnRow(id, RANGED, player.rangedId, id === 'staff' ? ' (' + (SPELLS[player.spell] || SPELLS.bolt).label + ')' : '')).join('');
    panel.innerHTML =
      '<h2>Inventory</h2>' +
      '<div class="inv-row"><b>Health</b><span>' + player.hp + ' / ' + maxHp + ' hearts</span></div>' +
      '<div class="inv-row"><b>Mana</b><span>' + mp + ' / ' + maxMp + '</span></div>' +
      '<div class="inv-row"><b>Coins</b><span>' + coins + '</span></div>' +
      '<div class="inv-row"><b>Potions</b><span>' + potions + ' &nbsp;(Q to drink)</span></div>' +
      '<h3>Melee &nbsp;<small>(Z to swap)</small></h3>' + meleeList +
      '<h3>Ranged &nbsp;<small>(X to swap)</small></h3>' + rangedList +
      '<p class="inv-help">WASD/arrows move · Space melee · F ranged · Q potion · I close</p>';
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function startAttack() {
  const a = player && player.attack;
  if (!a || a.active || a.cd > 0) return; // one swing at a time + cooldown
  a.w = MELEE[player.meleeId] || MELEE.sword; // swing the equipped melee weapon
  a.active = true;
  a.t = 0;
  a.dir = player.facing;
  a.hit = new Set(); // each enemy takes at most one hit per swing
}
addEventListener('keyup', e => { heldKeys.delete(e.key.toLowerCase()); });

function currentDir() {
  for (let i = pressOrder.length - 1; i >= 0; i--) {
    const k = pressOrder[i];
    if (heldKeys.has(k)) return KEYDIR[k];
    pressOrder.splice(i, 1);
  }
  return null;
}

// ── movement / collision ────────────────────────────────────────────────────
function tileBlocked(c, r) {
  return isWall(tileAt(c, r)) || solidTiles.has(key(c, r));
}

const onTile = (ent, c, r) =>
  (ent.tx === c && ent.ty === r) || (ent.moving && ent.ntx === c && ent.nty === r);

// Only monsters block movement tiles. Monsters may step onto the player (to
// attack); the player is blocked by monsters, so you bump them rather than overlap.
function monsterAt(c, r, ignore) {
  for (const m of monsters) if (m !== ignore && onTile(m, c, r)) return true;
  return false;
}

// Combat hitboxes — a box around each actor's lower body, in world pixels.
const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function hitbox(ent) {
  const w = 30, h = 30;
  const ex = ent.x + (ent.kx || 0), ey = ent.y + (ent.ky || 0);
  return { x: ex - w / 2, y: ey - TILE * 0.5 - h / 2, w, h };
}

// Knockback + hurt-flash decay, called each frame for every enemy.
function decayHit(e, dt) {
  if (e.hurt > 0) e.hurt -= dt;
  const f = Math.min(1, dt * (e.dying ? 0.006 : 0.013)); // slower slide while dying
  e.kx -= e.kx * f; e.ky -= e.ky * f;
}

// Shove an enemy up to KB_TILES tiles in direction d, then slide it there
// visually. Ground monsters stop at walls/water/each other; bats fly free.
function knockback(e, d, tiles) {
  tiles = tiles || KB_TILES;
  const oldX = e.x + e.kx, oldY = e.y + e.ky;
  if (e.type === 'bat') {
    e.x += d.dx * tiles * TILE;
    e.y += d.dy * tiles * TILE;
  } else {
    let n = 0;
    for (let i = 1; i <= tiles; i++) {
      const c = e.tx + d.dx * i, r = e.ty + d.dy * i;
      if (tileBlocked(c, r) || monsterAt(c, r, e)) break;
      n = i;
    }
    e.tx += d.dx * n; e.ty += d.dy * n;
    e.x = footX(e.tx); e.y = footY(e.ty);
    e.moving = false; // cancel any in-progress step
  }
  e.kx = oldX - e.x; e.ky = oldY - e.y; // start at the old spot and slide in
  e.hurt = HURT_FLASH;
}

function beginStep(ent, nx, ny, dur) {
  ent.fromX = ent.x; ent.fromY = ent.y;
  ent.toX = footX(nx); ent.toY = footY(ny);
  ent.ntx = nx; ent.nty = ny;
  ent.t = 0; ent.moving = true; ent.dur = dur;
}

function advance(ent, dt) {
  ent.t += dt / ent.dur;
  if (ent.t >= 1) {
    ent.x = ent.toX; ent.y = ent.toY;
    ent.tx = ent.ntx; ent.ty = ent.nty;
    ent.moving = false;
    return true;
  }
  ent.x = ent.fromX + (ent.toX - ent.fromX) * ent.t;
  ent.y = ent.fromY + (ent.toY - ent.fromY) * ent.t;
  return false;
}

function grantItem(name, spell) {
  if (name === 'coin') coins++;
  else if (name === 'potion') potions++; // carried — drink with Q
  else if (name === 'crystal') mp = Math.min(maxMp, mp + 3);
  else if (name === 'tome') { maxMp = Math.min(MP_CAP, maxMp + 1); mp = maxMp; say('Tome of mana — max mana increased!'); }
  else if (name === 'scroll') { player.spell = spell; mp = Math.min(maxMp, mp + 2); say('Learned ' + (SPELLS[spell] || SPELLS.bolt).label + '!'); }
  else if (name === 'heart') { maxHp = Math.min(HP_CAP, maxHp + 1); player.hp = maxHp; say('Heart container — max health increased!'); }
  else if (name === 'weapon') {
    const m = MELEE[spell], list = m ? player.melee : player.ranged, idKey = m ? 'meleeId' : 'rangedId';
    const def = (m ? MELEE : RANGED)[spell];
    if (def) { if (!list.includes(spell)) list.push(spell); player[idKey] = spell; say('Found a ' + def.label + '! (' + (m ? 'Z' : 'X') + ' to swap)'); }
  }
  syncHud();
}

function collectAt(c, r) {
  items = items.filter(it => {
    if (it.c === c && it.r === r) { grantItem(it.name, it.spell); return false; }
    return true;
  });
}

function openChest(ch) {
  ch.opened = true; ch.name = 'chest-open';
  grantItem(ch.loot, ch.spell);
  const fx = footX(ch.c), fy = footY(ch.r) - TILE * 0.5;
  spawnBoom(fx, fy, 'magic');
  spawnBurst(fx, fy, '#c4a23c');
}

function updatePlayer(dt) {
  if (player.moving) {
    if (advance(player, dt)) {
      collectAt(player.tx, player.ty);
      if (tryPortal()) return; // entered/exited a cave — level swapped
    } else return; // finish the current tile-step before reacting to new input
  }
  if (player.attack.active) return; // rooted while swinging
  const dir = currentDir();
  if (!dir) return;
  // face and move together so a turn always means a direction change (no decoupling)
  player.facing = dir;
  const { dx, dy } = DIRS[dir];
  const nx = player.tx + dx, ny = player.ty + dy;
  const ck = key(nx, ny);
  if (chestAt.has(ck)) { const ch = chestAt.get(ck); if (!ch.opened) openChest(ch); return; } // bump to open
  if (npcAt.has(ck)) { say(npcAt.get(ck).line); return; } // bump a villager to talk
  // only terrain blocks the player now — you pass through monsters (and take a hit)
  if (!tileBlocked(nx, ny)) beginStep(player, nx, ny, PLAYER_STEP);
}

// Box swept by the sword, one tile in front of the player.
function attackHitbox(w) {
  const reach = w ? w.reach : 0.95;
  const d = DIRS[player.attack.dir];
  const cx = player.x + d.dx * TILE * reach;
  const cy = (player.y - TILE * 0.5) + d.dy * TILE * reach;
  const s = TILE * (0.9 + reach * 0.5); // heavier weapons sweep a wider arc
  return { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
}

function updateAttack(dt) {
  const a = player.attack;
  if (a.cd > 0) a.cd -= dt;
  if (!a.active) return;
  const w = a.w || MELEE.sword;
  a.t += dt / w.dur;
  if (a.t >= 0.05 && a.t <= 0.8) {
    const hb = attackHitbox(w);
    const kd = DIRS[a.dir]; // shove enemies the way you're swinging
    for (const m of monsters) {
      if (m.dying || a.hit.has(m) || !rectsOverlap(hb, hitbox(m))) continue;
      a.hit.add(m);
      damageEnemy(m, w.dmg, kd, w.kb);
    }
    for (const b of bats) {
      if (b.dying || a.hit.has(b) || !rectsOverlap(hb, hitbox(b))) continue;
      a.hit.add(b);
      damageEnemy(b, w.dmg, kd, w.kb);
    }
  }
  if (a.t >= 1) { a.active = false; a.cd = w.cd; }
}

// Apply damage to an enemy. On a killing blow it enters a `dying` state — it's
// still knocked back and then fades/shrinks (see updateMonsters/updateBats +
// render) so the player can watch it die, rather than vanishing instantly.
function damageEnemy(e, dmg, dir, kb) {
  if (e.dying) return;
  knockback(e, dir, kb); // shoved back on every hit, including the fatal one
  const oy = e.type === 'bat' ? TILE * 0.3 : TILE * 0.4;
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.dying = DEATH_DUR;
    e.hurt = 0;
    if (e.type !== 'bat' && chance(0.5)) items.push({ name: 'coin', c: e.tx, r: e.ty });
  }
  spawnSpark(e.x + e.kx, e.y + e.ky - oy);
}

// ── magic: a swappable spell slot, fueled by mana ───────────────────────────
function emit(angle, opt) {
  opt = opt || {};
  const speed = opt.speed || SPELL_SPEED;
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const ox = player.x + nx * TILE * 0.5;
  const oy = player.y - TILE * 0.5 + ny * TILE * 0.5;
  projectiles.push({
    x: ox, y: oy, vx: nx * speed, vy: ny * speed, speed,
    kd: { dx: Math.round(nx), dy: Math.round(ny) },
    life: opt.life || SPELL_LIFE, age: 0,
    dmg: opt.dmg || 2, size: opt.size || 1, color: opt.color || null, kind: opt.kind || null,
    pierce: !!opt.pierce, homing: !!opt.homing, aoe: opt.aoe || 0, returns: !!opt.returns,
    hitSet: (opt.pierce || opt.returns) ? new Set() : null,
  });
  if (!opt.quiet) spawnSpark(ox, oy);
}

// Fire the equipped ranged weapon (F). Staff casts the magic spell; the rest
// loose physical projectiles on a cooldown (no mana).
function useRanged() {
  const w = RANGED[player.rangedId];
  if (!w) return;
  if (w.staff) { castSpell(); return; }
  if (player.castCd > 0) return;
  player.castCd = w.cd;
  emit(SPELL_ANGLE[player.facing], { dmg: w.dmg, speed: w.speed, color: w.color, pierce: w.pierce, life: w.life, size: w.size, kind: 'arrow', quiet: true });
}

function cycleWeapon(slot) {
  const list = slot === 'melee' ? player.melee : player.ranged;
  if (!list || list.length < 2) return;
  const idKey = slot === 'melee' ? 'meleeId' : 'rangedId';
  const i = list.indexOf(player[idKey]);
  player[idKey] = list[(i + 1) % list.length];
  const def = (slot === 'melee' ? MELEE : RANGED)[player[idKey]];
  toast((slot === 'melee' ? '⚔ ' : '➹ ') + def.label);
  syncHud();
}

// Spells the F slot can hold. `bolt` is the start; everything else is found in
// ruin chests (you carry one at a time — picking a new one replaces it).
const SPELLS = {
  bolt:      { cost: 2, label: 'Arcane Bolt', cast: b => emit(b, { dmg: 2 }) },
  spread:    { cost: 3, label: 'Scatter',     cast: b => { emit(b - 0.42, { dmg: 2 }); emit(b, { dmg: 2 }); emit(b + 0.42, { dmg: 2 }); } },
  nova:      { cost: 4, label: 'Nova Burst',  cast: b => { for (let i = 0; i < 8; i++) emit(i * Math.PI / 4, { dmg: 2 }); } },
  comet:     { cost: 3, label: 'Comet',       cast: b => emit(b, { dmg: 4, size: 1.8, speed: SPELL_SPEED * 0.7 }) },
  // ── relics (chest-only) ──
  inferno:   { cost: 4, label: 'Inferno',        cast: b => { for (let i = -2; i <= 2; i++) emit(b + i * 0.26, { dmg: 2, color: '#e07b2f', life: 360, speed: SPELL_SPEED * 1.1 }); } },
  chain:     { cost: 3, label: 'Chain Lightning', cast: b => emit(b, { dmg: 2, pierce: true, color: '#bfe8ff', speed: SPELL_SPEED * 1.6, life: 900 }) },
  fireball:  { cost: 5, label: 'Fireball',        cast: b => emit(b, { dmg: 3, size: 1.7, speed: SPELL_SPEED * 0.8, aoe: TILE * 1.7, color: '#e0602f' }) },
  seeker:    { cost: 3, label: 'Seeker',          cast: b => emit(b, { dmg: 2, homing: true, color: '#7ad06e', speed: SPELL_SPEED * 0.9, life: 1500 }) },
  boomerang: { cost: 3, label: 'Boomerang',       cast: b => emit(b, { dmg: 2, pierce: true, returns: true, size: 1.2, color: '#b8c0cc', speed: SPELL_SPEED * 1.05, life: 1300 }) },
  tempest:   { cost: 6, label: 'Tempest',         cast: b => { for (let i = 0; i < 10; i++) emit(i * Math.PI / 5, { dmg: 2, pierce: true, color: '#9a6ad0', speed: SPELL_SPEED * 1.3, life: 700 }); } },
};
const RELICS = ['inferno', 'chain', 'fireball', 'seeker', 'boomerang', 'tempest'];
const SPELL_DESC = {
  bolt: 'a quick arcane shot',
  spread: 'three bolts in a fan',
  nova: 'a burst in all directions',
  comet: 'a heavy, slow blast',
  inferno: 'a short-range flame fan',
  chain: 'a bolt that pierces through foes',
  fireball: 'an explosive area blast',
  seeker: 'a bolt that homes in',
  boomerang: 'flies out and returns',
  tempest: 'a piercing radial storm',
};

function nearestEnemy(x, y) {
  let best = null, bd = Infinity;
  for (const arr of [monsters, bats]) for (const e of arr) {
    if (e.dying) continue;
    const dx = e.x - x, dy = (e.y - TILE * 0.5) - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function steerToward(p, tx, ty, dt, rate) {
  const dx = tx - p.x, dy = ty - p.y, len = Math.hypot(dx, dy) || 1;
  const f = Math.min(1, dt * rate);
  p.vx += (dx / len * p.speed - p.vx) * f;
  p.vy += (dy / len * p.speed - p.vy) * f;
  const vl = Math.hypot(p.vx, p.vy) || 1;
  p.vx = p.vx / vl * p.speed; p.vy = p.vy / vl * p.speed;
  p.kd = { dx: Math.round(p.vx / p.speed), dy: Math.round(p.vy / p.speed) };
}
function aoeBlast(x, y, radius, dmg) {
  spawnBurst(x, y, '#e0602f');
  for (const arr of [monsters, bats]) for (const e of arr) {
    if (e.dying) continue;
    const dx = (e.x + e.kx) - x, dy = (e.y + e.ky - TILE * 0.5) - y;
    if (dx * dx + dy * dy <= radius * radius) damageEnemy(e, dmg, { dx: 0, dy: 0 });
  }
}
const SPELL_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

function castSpell() {
  if (!player) return;
  const s = SPELLS[player.spell] || SPELLS.bolt;
  if (mp < s.cost || player.castCd > 0) return;
  mp -= s.cost;
  player.castCd = SPELL_CD;
  s.cast(SPELL_ANGLE[player.facing]);
}

function updateMana(dt) {
  if (player.castCd > 0) player.castCd -= dt;
  if (mp < maxMp) {
    manaTimer -= dt;
    if (manaTimer <= 0) { mp = Math.min(maxMp, mp + 1); manaTimer = MANA_REGEN; }
  }
}

// A ranged enemy fires a bolt aimed at the player's current position.
function fireEnemyShot(m, sh) {
  const sx = m.x + m.kx, sy = m.y + m.ky - TILE * 0.5;
  const dx = player.x - sx, dy = (player.y - TILE * 0.5) - sy, len = Math.hypot(dx, dy) || 1;
  enemyShots.push({ x: sx, y: sy, vx: dx / len * sh.speed, vy: dy / len * sh.speed, life: 2400, color: sh.color });
  spawnBurst(sx, sy, sh.color);
}

function updateEnemyShots(dt) {
  const phb = hitbox(player);
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const p = enemyShots[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    const pb = { x: p.x - 7, y: p.y - 7, w: 14, h: 14 };
    if (player.invuln <= 0 && rectsOverlap(pb, phb)) { damagePlayer(); spawnBurst(p.x, p.y, p.color); enemyShots.splice(i, 1); continue; }
    if (p.life <= 0 || tileBlocked(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) { spawnBurst(p.x, p.y, p.color); enemyShots.splice(i, 1); }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.age += dt;
    if (p.homing) { const e = nearestEnemy(p.x, p.y); if (e) steerToward(p, e.x, e.y - TILE * 0.5, dt, 0.006); }
    if (p.returns && p.age > p.life * 0.45) steerToward(p, player.x, player.y - TILE * 0.5, dt, 0.012);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    const s = 9 * (p.size || 1);
    const pb = { x: p.x - s, y: p.y - s, w: s * 2, h: s * 2 };
    let consumed = false;
    for (const arr of [monsters, bats]) {
      for (const e of arr) {
        if (e.dying || !rectsOverlap(pb, hitbox(e))) continue;
        if (p.hitSet) { if (p.hitSet.has(e)) continue; p.hitSet.add(e); damageEnemy(e, p.dmg, p.kd); } // pierce: hit each once
        else { damageEnemy(e, p.dmg, p.kd); consumed = true; break; }
      }
      if (consumed) break;
    }
    const hitWall = tileBlocked(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    if (consumed || p.life <= 0 || (hitWall && !p.returns)) {
      if (p.aoe) aoeBlast(p.x, p.y, p.aoe, p.dmg);
      spawnBurst(p.x, p.y, p.color || '#6aa8f0');
      projectiles.splice(i, 1);
    }
  }
}

function damagePlayer(amount = 1) {
  player.hp -= amount;
  player.invuln = IFRAMES;
  if (player.hp <= 0) respawn();
}

function respawn() {
  const s = findOpen(player.tx, player.ty);
  player.tx = s.c; player.ty = s.r;
  player.x = footX(s.c); player.y = footY(s.r);
  player.moving = false; player.t = 0;
  player.hp = maxHp; player.invuln = 1500;
  player.attack.active = false;
  mp = maxMp; // refill mana on respawn
  if (!inCave) streamChunks(true);
  say('You collapse... and awaken, somehow alive.');
}

// Enemy contact damage — overlapping hitboxes cost a heart (with i-frames).
function updateCombat(dt) {
  if (player.invuln > 0) { player.invuln -= dt; return; }
  const phb = hitbox(player);
  for (const m of monsters) {
    if (!m.dying && inViewPx(m.x, m.y) && rectsOverlap(phb, hitbox(m))) { damagePlayer(CONTACT_DMG[m.type] || 1); return; }
  }
  for (const b of bats) {
    if (!b.dying && inViewPx(b.x, b.y) && rectsOverlap(phb, hitbox(b))) { damagePlayer(); return; }
  }
}

// ── death effects: hit sparks (non-lethal) + explosions (on death) ───────────
function ringParts(n, speed) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const s = speed * (0.6 + Math.random() * 0.6);
    arr.push({ dx: Math.cos(ang) * s, dy: Math.sin(ang) * s });
  }
  return arr;
}
function spawnSpark(x, y) {
  effects.push({ x, y, t: 0, dur: 150, color: '#fff3cf', ring: false, spread: 14, psize: 3, parts: ringParts(5, 1.3) });
}
function spawnBoom(x, y, type) {
  const color = type === 'slime' ? '#6ec06e' : type === 'skeleton' ? '#c3bca3'
    : type === 'magic' ? '#6aa8f0' : type === 'cultist' ? '#a3303f' : type === 'wisp' ? '#8a4aa0' : '#7b46a0';
  effects.push({ x, y, t: 0, dur: 360, color, ring: true, spread: 28, psize: 5, parts: ringParts(10, 1.9) });
}
function spawnBurst(x, y, color) {
  effects.push({ x, y, t: 0, dur: 300, color, ring: true, spread: 20, psize: 4, parts: ringParts(8, 1.6) });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].t += dt;
    if (effects[i].t >= effects[i].dur) effects.splice(i, 1);
  }
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
}

function updateMonsters(dt) {
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    decayHit(m, dt);
    if (m.dying) {
      m.dying -= dt;
      if (m.dying <= 0) { spawnBoom(m.x + m.kx, m.y + m.ky - TILE * 0.4, m.type); monsters.splice(i, 1); }
      continue; // no AI while dying
    }
    // ranged enemies: fire a bolt at the player when in range
    const sh = SHOOTERS[m.type];
    if (sh) {
      m.shootTimer -= dt;
      if (m.shootTimer <= 0) {
        if (Math.abs(player.tx - m.tx) + Math.abs(player.ty - m.ty) <= sh.range) {
          fireEnemyShot(m, sh);
          m.shootTimer = sh.cd + Math.random() * 700;
        } else {
          m.shootTimer = 400; // re-check soon
        }
      }
    }
    if (m.moving) {
      if (advance(m, dt)) m.timer = 600 + Math.random() * 1800;
      continue;
    }
    m.timer -= dt;
    if (m.timer > 0) continue;
    // chase the player when close, otherwise wander
    let dir;
    const ddx = player.tx - m.tx, ddy = player.ty - m.ty;
    if (Math.abs(ddx) + Math.abs(ddy) <= 6 && chance(0.6)) {
      dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
    } else {
      dir = ['up', 'down', 'left', 'right'][rint(4)];
    }
    m.facing = dir;
    const { dx, dy } = DIRS[dir];
    const nx = m.tx + dx, ny = m.ty + dy;
    if (!tileBlocked(nx, ny) && !monsterAt(nx, ny, m)) beginStep(m, nx, ny, m.step);
    else m.timer = 300 + Math.random() * 700;
  }
}

function updateBats(dt) {
  for (let i = bats.length - 1; i >= 0; i--) {
    const b = bats[i];
    decayHit(b, dt);
    if (b.dying) {
      b.dying -= dt;
      if (b.dying <= 0) { spawnBoom(b.x + b.kx, b.y + b.ky - TILE * 0.3, 'bat'); bats.splice(i, 1); }
      continue;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (inCave) {
      if (b.x < 0 || b.x > WORLD_W) b.vx *= -1;
      if (b.y < 0 || b.y > WORLD_H) b.vy *= -1;
    } else { // keep flyers near the player in the infinite world
      if (Math.abs(b.x - player.x) > VIEW_W) b.vx *= -1;
      if (Math.abs(b.y - player.y) > VIEW_H) b.vy *= -1;
    }
  }
}

function updateCamera() {
  camX = player.x - VIEW_W / 2;
  camY = (player.y - TILE / 2) - VIEW_H / 2;
  if (inCave) { // the cave is finite — keep the camera inside it
    camX = clamp(camX, 0, Math.max(0, WORLD_W - VIEW_W));
    camY = clamp(camY, 0, Math.max(0, WORLD_H - VIEW_H));
  }
}

// ── rendering ───────────────────────────────────────────────────────────────
let IMG = {};
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function drawSprite(name, fx, fy, mult = 1) {
  const img = IMG[name];
  if (!img) return;
  const s = spriteScale(name) * mult;
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, Math.round(fx - w / 2), Math.round(fy - h), w, h);
}

// Draw a ground tile, mirrored by a per-tile hash so the field isn't repetitive.
function drawTileVaried(img, c, r) {
  const hsh = (c * 73856093) ^ (r * 19349663);
  const fx = (hsh & 1) ? -1 : 1, fy = (hsh & 2) ? -1 : 1;
  const x = c * TILE, y = r * TILE;
  if (fx === 1 && fy === 1) { ctx.drawImage(img, x, y, TILE, TILE); return; }
  ctx.save();
  ctx.translate(x + (fx < 0 ? TILE : 0), y + (fy < 0 ? TILE : 0));
  ctx.scale(fx, fy);
  ctx.drawImage(img, 0, 0, TILE, TILE);
  ctx.restore();
}

// Which tile to *draw* at (c,r): near a different land biome, a noise-clumped band
// renders the neighbouring biome's tile instead — so biomes interleave organically
// (a real texture bleed, not a flat colour stain). Water/walls never swap.
function displayChar(c, r) {
  const here = tileAt(c, r);
  if (isWall(here) || here === 'c') return here; // walls + cave floor never blend
  const n = blendAt(c, r);
  for (const [dist, thresh] of [[1, 0.42], [2, 0.16]]) {
    if (n >= thresh) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nch = tileAt(c + dx * dist, r + dy * dist);
      if (nch !== here && !isWall(nch)) return nch;
    }
  }
  return here;
}

// Subtle damp/shadow lip on a land tile's edge that meets water — a soft shoreline.
function drawShoreShadow(c, r) {
  const x = c * TILE, y = r * TILE, d = TILE * 0.32;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    if (tileAt(c + dx, r + dy) !== 'W') continue;
    let g, rx, ry, rw, rh;
    if (dy === -1) { g = ctx.createLinearGradient(0, y, 0, y + d); rx = x; ry = y; rw = TILE; rh = d; }
    else if (dy === 1) { g = ctx.createLinearGradient(0, y + TILE, 0, y + TILE - d); rx = x; ry = y + TILE - d; rw = TILE; rh = d; }
    else if (dx === -1) { g = ctx.createLinearGradient(x, 0, x + d, 0); rx = x; ry = y; rw = d; rh = TILE; }
    else { g = ctx.createLinearGradient(x + TILE, 0, x + TILE - d, 0); rx = x + TILE - d; ry = y; rw = d; rh = TILE; }
    g.addColorStop(0, 'rgba(18,28,20,0.34)');
    g.addColorStop(1, 'rgba(18,28,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  }
}

// Drifting highlight bands give the water a gentle shimmer/wave.
function drawWaterShimmer(c, r, time) {
  const x = c * TILE, y = r * TILE, ph = time * 0.0024;
  ctx.fillStyle = 'rgba(150,196,236,0.16)';
  ctx.fillRect(x + 3, Math.round(y + 8 + Math.sin(ph + c * 0.7 + r * 0.5) * 4), TILE - 6, 2);
  ctx.fillStyle = 'rgba(120,170,215,0.14)';
  ctx.fillRect(x + 7, Math.round(y + 30 + Math.sin(ph * 1.3 + c * 0.5 - r * 0.6) * 4), TILE - 12, 2);
}

const inViewPx = (x, y) =>
  x > camX - TILE * 2 && x < camX + VIEW_W + TILE * 2 &&
  y > camY - TILE * 3 && y < camY + VIEW_H + TILE * 2;

function render(time) {
  ctx.imageSmoothingEnabled = true; // soft, faded sprite edges (flat interiors stay flat)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  // visible tiles (the overworld is infinite; only clamp inside the finite cave)
  let c0 = Math.floor(camX / TILE), c1 = Math.floor((camX + VIEW_W) / TILE);
  let r0 = Math.floor(camY / TILE), r1 = Math.floor((camY + VIEW_H) / TILE);
  if (inCave) { c0 = Math.max(0, c0); c1 = Math.min(WORLD_COLS - 1, c1); r0 = Math.max(0, r0); r1 = Math.min(WORLD_ROWS - 1, r1); }
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const real = tileAt(c, r);
      const ch = displayChar(c, r); // may render a neighbouring biome's tile (border blend)
      const img = IMG[tileSprite(ch, c, r)];
      if (img) {
        if (isWall(ch)) ctx.drawImage(img, c * TILE, r * TILE, TILE, TILE);
        else drawTileVaried(img, c, r); // flip walkable tiles to break up repetition
      }
      if (ch === 'W') drawWaterShimmer(c, r, time);
      if (!isWall(real)) drawShoreShadow(c, r); // damp lip at the waterline
      if (ch === real && !solidTiles.has(key(c, r))) {
        const deco = decalAt(c, r);
        if (deco && IMG[deco]) ctx.drawImage(IMG[deco], c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  // ground items (gentle hover)
  for (const it of items) {
    const ix = footX(it.c), iy = it.r * TILE + TILE / 2;
    if (!inViewPx(ix, iy)) continue;
    const bob = Math.sin(time * 0.004 + it.c + it.r) * 2;
    drawSprite(it.name, ix, iy + 22 + bob, 0.8);
  }

  // depth-sorted props + monsters + player
  const drawList = [];
  for (const p of props) {
    const fy = footY(p.r);
    if (!inViewPx(footX(p.c), fy)) continue;
    const mult = p.name === 'tree' ? 1.5 : p.name === 'house' ? 1.7 : 1; // taller trees / huts
    drawList.push({ y: fy, fn: () => drawSprite(p.name, footX(p.c), fy, mult) });
  }
  for (const n of npcs) {
    const fy = footY(n.ty);
    if (inViewPx(footX(n.tx), fy)) drawList.push({ y: fy, fn: () => drawSprite('villager', footX(n.tx), fy) });
  }
  if (portal) {
    const fy = footY(portal.r);
    if (inViewPx(footX(portal.c), fy)) {
      const sprite = portal.kind === 'enter' ? 'cave-entrance' : 'cave-exit';
      drawList.push({ y: fy - 2, fn: () => drawSprite(sprite, footX(portal.c), fy) });
    }
  }
  for (const m of monsters) {
    if (!inViewPx(m.x, m.y)) continue;
    const mx = m.x + m.kx, my = m.y + m.ky;
    if (m.dying) {
      const p = m.dying / DEATH_DUR; // 1 → 0
      drawList.push({ y: my, fn: () => { ctx.globalAlpha = p; drawSprite(m.type, mx, my, 0.55 + 0.45 * p); ctx.globalAlpha = 1; } });
      continue;
    }
    if (m.hurt > 0 && Math.floor(time / 60) % 2 === 0) continue; // blink when hit
    const bob = Math.abs(Math.sin(time * 0.006 + m.tx)) * 3;
    drawList.push({ y: my, fn: () => drawSprite(m.type, mx, my + bob) });
  }
  const walkBob = player.moving ? -Math.abs(Math.sin(time * 0.012)) * 3 : 0;
  const blink = player.invuln > 0 && Math.floor(time / 90) % 2 === 0; // flash while hurt
  if (!blink) {
    drawList.push({ y: player.y, fn: () => drawSprite('player-' + player.facing, player.x, player.y + walkBob) });
  }
  drawList.sort((a, b) => a.y - b.y);
  for (const d of drawList) d.fn();

  // melee swing — the equipped weapon sweeps an arc across the facing direction
  if (player.attack.active) {
    const a = player.attack, w = a.w || MELEE.sword;
    const base = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[a.dir];
    const arc = w.arc;
    const cur = base - arc + 2 * arc * a.t; // current blade angle
    ctx.save();
    ctx.translate(player.x, player.y - TILE * 0.5);
    ctx.strokeStyle = 'rgba(210,218,232,0.30)'; // faint motion trail
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, TILE * 0.9, base - arc, cur);
    ctx.stroke();
    const img = IMG[w.sprite];
    if (img) {
      ctx.rotate(cur);
      const S = TILE * w.scale; // bigger weapons draw bigger
      ctx.drawImage(img, -3.5 / 16 * S, -7.5 / 16 * S, S, S);
    }
    ctx.restore();
  }

  // bats overhead
  for (const b of bats) {
    if (!inViewPx(b.x, b.y)) continue;
    const by = b.y + b.ky + Math.sin(time * 0.004 + b.ph) * 10, bx = b.x + b.kx;
    if (b.dying) {
      const p = b.dying / DEATH_DUR;
      ctx.globalAlpha = p; drawSprite('bat', bx, by, (0.55 + 0.45 * p) * 0.9); ctx.globalAlpha = 1;
      continue;
    }
    if (b.hurt > 0 && Math.floor(time / 60) % 2 === 0) continue; // blink when hit
    drawSprite('bat', bx, by, 0.9);
  }

  // player projectiles — arrows draw as streaks, magic bolts as glowing orbs
  for (const p of projectiles) {
    if (!inViewPx(p.x, p.y)) continue;
    const sz = p.size || 1;
    const ux = p.vx / (p.speed || SPELL_SPEED), uy = p.vy / (p.speed || SPELL_SPEED);
    const col = p.color || '#6eb4f5';
    if (p.kind === 'arrow') {
      const L = 15 * sz;
      ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 3 * sz; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - ux * L, p.y - uy * L); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = 'rgba(245,245,235,0.95)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 * sz, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.fillStyle = rgba(col, 0.28);
    ctx.beginPath(); ctx.arc(p.x - ux * 9, p.y - uy * 9, 5 * sz, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col, 0.95);
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5 * sz, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,250,255,0.95)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 * sz, 0, Math.PI * 2); ctx.fill();
  }

  // enemy bolts (warm/red)
  for (const p of enemyShots) {
    if (!inViewPx(p.x, p.y)) continue;
    ctx.fillStyle = rgba(p.color, 0.3);
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(p.color, 0.95);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,235,210,0.9)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
  }

  // hit sparks + death explosions
  for (const e of effects) {
    if (!inViewPx(e.x, e.y)) continue;
    const p = e.t / e.dur;
    if (e.ring) {
      ctx.strokeStyle = rgba(e.color, (1 - p) * 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + p * e.spread, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(e.color, 1 - p);
    const d = p * e.spread;
    for (const part of e.parts) {
      const s = e.psize * (1 - p) + 1;
      ctx.fillRect(Math.round(e.x + part.dx * d - s / 2), Math.round(e.y + part.dy * d - s / 2), s, s);
    }
  }

  ctx.restore();

  // HUD hearts (screen space — drawn after the camera transform is undone)
  const hs = 24, gap = 3;
  for (let i = 0; i < maxHp; i++) {
    const img = IMG[i < player.hp ? 'heart-full' : 'heart-empty'];
    if (img) ctx.drawImage(img, 8 + i * (hs + gap), 8, hs, hs);
  }

  // HUD mana orbs (below the hearts)
  const my = 8 + hs + 6, pr = 6;
  for (let i = 0; i < maxMp; i++) {
    const cx = 8 + pr + i * (pr * 2 + 4), cy = my + pr;
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.fillStyle = i < mp ? 'rgba(90,155,232,0.95)' : 'rgba(30,42,66,0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(168,228,255,0.7)'; ctx.stroke();
  }
}

function syncHud() {
  document.getElementById('coins').textContent = coins;
  document.getElementById('potions').textContent = potions;
  if (!player) return;
  const mel = document.getElementById('melee');
  if (mel) mel.textContent = (MELEE[player.meleeId] || MELEE.sword).label;
  const ran = document.getElementById('ranged');
  if (ran) { const w = RANGED[player.rangedId]; ran.textContent = w && w.staff ? (SPELLS[player.spell] || SPELLS.bolt).label : (w ? w.label : '—'); }
}

let last = 0;
function frame(time) {
  const dt = Math.min(50, time - last);
  last = time;
  streamChunks(false); // load/unload chunks around the player (infinite world)
  updatePlayer(dt);
  updateMonsters(dt);
  updateAttack(dt);
  updateProjectiles(dt);
  updateEnemyShots(dt);
  updateCombat(dt);
  updateBats(dt);
  updateMana(dt);
  updateEffects(dt);
  updateCamera();
  render(time);
  requestAnimationFrame(frame);
}

function loadSprites() {
  const entries = Object.entries(SPRITES);
  return Promise.all(entries.map(([name, svg]) => new Promise(res => {
    const img = new Image();
    img.onload = () => res([name, img]);
    img.onerror = () => res([name, null]);
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }))).then(arr => Object.fromEntries(arr));
}

canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false; // crisp upscaling for pixel-art tiles/sprites

// Load the SVG sprites, then overlay the Kenney Roguelike re-skin on top
// (mapped names win; everything else keeps the original art). Set
// window.USE_KENNEY = false to fall back to the all-SVG look.
const useKenney = (typeof window.USE_KENNEY === 'undefined') ? true : window.USE_KENNEY;
const boot = useKenney && window.KENNEY
  ? Promise.all([loadSprites(), window.KENNEY.build().catch(e => (console.warn('Kenney re-skin failed:', e), {}))])
      .then(([svg, kenney]) => ({ ...svg, ...kenney }))
  : loadSprites();
boot.then(imgs => {
  IMG = imgs;
  generate();
  updateCamera();
  syncHud();
  requestAnimationFrame(frame);
});
