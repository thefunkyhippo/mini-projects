// test-rpg — a tiny top-down RPG demo built around the SVG sprite set.
// The world is procedurally generated fresh on every page load. A camera
// follows the player (kept centered) and stops scrolling at the world edges.
// No build step, no dependencies. Open index.html and explore.

const TILE = 48;
const PIXEL = TILE / 16; // sprites are authored at 16px; upscale crisply

// Viewport (what's on screen) in tiles — the world is much larger and scrolls.
const VIEW_COLS = 16;
const VIEW_ROWS = 12;
const VIEW_W = VIEW_COLS * TILE;
const VIEW_H = VIEW_ROWS * TILE;

// World size: ~20x the old 16x12 map (80 * 48 = 3840 = 20 * 192 tiles).
const WORLD_COLS = 400;
const WORLD_ROWS = 240;
const WORLD_W = WORLD_COLS * TILE;
const WORLD_H = WORLD_ROWS * TILE;

const TILE_SPRITE = {
  G: 'tile-grass', P: 'tile-path', W: 'tile-water', '#': 'tile-wall',
  H: 'tile-highland', M: 'tile-mire', B: 'tile-blight',
};

// Natural ground tiles that props (trees/rocks/etc.) may sit on.
const GROUND = 'GHMB';
const isGround = ch => GROUND.indexOf(ch) >= 0;

// Biomes: ground tile + how much water, how wooded/rocky/brambly, and which mobs.
// water: noise threshold (higher = wetter). treeBase: noise cutoff (lower = more
// trees). treeProb/rock/bush scale density. mob: weighted spawn pool.
const BIOMES = {
  meadow:   { ground: 'G', water: 0.30, treeBase: 0.78, treeProb: 0.16, rock: 0.4, bush: 0.8, mob: ['slime', 'slime', 'skeleton'] },
  forest:   { ground: 'G', water: 0.26, treeBase: 0.62, treeProb: 0.45, rock: 0.3, bush: 1.0, mob: ['slime', 'slime'] },
  highland: { ground: 'H', water: 0.20, treeBase: 0.86, treeProb: 0.10, rock: 1.6, bush: 0.3, mob: ['skeleton', 'skeleton', 'slime'] },
  marsh:    { ground: 'M', water: 0.46, treeBase: 0.80, treeProb: 0.14, rock: 0.2, bush: 1.1, mob: ['slime', 'slime'] },
  blight:   { ground: 'B', water: 0.24, treeBase: 0.84, treeProb: 0.13, rock: 0.7, bush: 0.2, mob: ['skeleton', 'skeleton', 'slime'] },
};
const BIOME_LIST = Object.keys(BIOMES);

const DIRS = {
  up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
};
const DIR4 = Object.values(DIRS);

const PLAYER_STEP = 110; // ms per tile (snappy)
const MAX_HP = 5;        // hearts
const IFRAMES = 1000;    // ms of invulnerability after a hit
const ATTACK_DUR = 160;     // ms for a full sword swing (snappy)
const SWING_COOLDOWN = 170; // ms you must wait after a swing before the next
const ENEMY_HP = { slime: 2, skeleton: 3, bat: 1 };
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
let grid, props, items, monsters, bats, solidTiles, decals, effects, projectiles, player;
let camX = 0, camY = 0;
let coins = 0, potions = 0;
let mp = START_MAX_MP, maxMp = START_MAX_MP, manaTimer = MANA_REGEN;

// ── procedural generation ───────────────────────────────────────────────────
// Smooth value-noise field in [0,1], bilinearly interpolated from a coarse grid.
function valueNoise(scale) {
  const gw = Math.ceil(WORLD_COLS / scale) + 2, gh = Math.ceil(WORLD_ROWS / scale) + 2;
  const g = [];
  for (let y = 0; y < gh; y++) { const row = []; for (let x = 0; x < gw; x++) row.push(Math.random()); g.push(row); }
  const sm = t => t * t * (3 - 2 * t);
  const field = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < WORLD_COLS; c++) {
      const fx = c / scale, fy = r / scale;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = sm(fx - x0), ty = sm(fy - y0);
      const top = g[y0][x0] + (g[y0][x0 + 1] - g[y0][x0]) * tx;
      const bot = g[y0 + 1][x0] + (g[y0 + 1][x0 + 1] - g[y0 + 1][x0]) * tx;
      row.push(top + (bot - top) * ty);
    }
    field.push(row);
  }
  return field;
}

// Place a prop on natural ground only (keeps props off water, walls, dupes).
function placeProp(name, c, r) {
  if (!inb(c, r) || !isGround(grid[r][c]) || solidTiles.has(key(c, r))) return false;
  solidTiles.add(key(c, r));
  props.push({ name, c, r });
  return true;
}

// Voronoi biome regions with noise-warped borders so they read organically.
function buildBiomeMap() {
  const seeds = [];
  const k = 14 + rint(12); // more regions so the larger world stays varied
  for (let i = 0; i < k; i++) {
    seeds.push({ c: rint(WORLD_COLS), r: rint(WORLD_ROWS), b: BIOME_LIST[rint(BIOME_LIST.length)] });
  }
  const warpX = valueNoise(7), warpY = valueNoise(7);
  const map = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < WORLD_COLS; c++) {
      const wx = c + (warpX[r][c] - 0.5) * 16;
      const wy = r + (warpY[r][c] - 0.5) * 16;
      let best = seeds[0], bd = Infinity;
      for (const s of seeds) {
        const dc = wx - s.c, dr = wy - s.r, d = dc * dc + dr * dr;
        if (d < bd) { bd = d; best = s; }
      }
      row.push(best.b);
    }
    map.push(row);
  }
  return map;
}

// Generic boolean cellular-automata smoothing (majority of 3x3 incl. self).
function smoothMask(mask, iters) {
  for (let k = 0; k < iters; k++) {
    const next = mask.map(row => row.slice());
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (inb(c + dc, r + dr) && mask[r + dr][c + dc]) n++;
        next[r][c] = n >= 5;
      }
    }
    for (let r = 0; r < WORLD_ROWS; r++) for (let c = 0; c < WORLD_COLS; c++) mask[r][c] = next[r][c];
  }
}

// A clustered patch of one prop type via a short random walk from a seed.
function cluster(name, size) {
  let c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
  for (let i = 0; i < size; i++) {
    placeProp(name, c, r);
    const d = DIR4[rint(4)];
    c = clampi(c + d.dx, 0, WORLD_COLS - 1);
    r = clampi(r + d.dy, 0, WORLD_ROWS - 1);
  }
}

function placeRuin() {
  const w = 4 + rint(6), h = 4 + rint(6);
  const c0 = 2 + rint(WORLD_COLS - w - 4), r0 = 2 + rint(WORLD_ROWS - h - 4);
  for (let r = r0; r < r0 + h; r++) {
    for (let c = c0; c < c0 + w; c++) {
      if (grid[r][c] === 'W') continue;
      const edge = r === r0 || r === r0 + h - 1 || c === c0 || c === c0 + w - 1;
      if (edge && chance(0.82)) grid[r][c] = '#'; // crumbling walls, open interior
    }
  }
}

const walkableBase = (c, r) => inb(c, r) && grid[r][c] !== 'W' && grid[r][c] !== '#';

function makeActor(type, c, r, step) {
  return { type, tx: c, ty: r, x: footX(c), y: footY(r), facing: 'down', moving: false, t: 0, timer: rint(2200), step, hp: ENEMY_HP[type] || 1, kx: 0, ky: 0, hurt: 0, dying: 0 };
}

function generate() {
  // 1. biome regions (Voronoi with warped borders)
  const biome = buildBiomeMap();
  const at = (r, c) => BIOMES[biome[r][c]];

  // 2. ground + water — per-biome water level, smoothed into lake shapes
  const elevation = valueNoise(9);
  const waterMask = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < WORLD_COLS; c++) row.push(elevation[r][c] < at(r, c).water);
    waterMask.push(row);
  }
  smoothMask(waterMask, 2);
  grid = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < WORLD_COLS; c++) row.push(waterMask[r][c] ? 'W' : at(r, c).ground);
    grid.push(row);
  }

  // 3. ruined walls with open interiors, kept off the water (very rare)
  const ruins = rint(2); // 0–1
  for (let i = 0; i < ruins; i++) placeRuin();

  // 4. props start fresh — wilderness only, no roads
  solidTiles = new Set();
  props = [];

  // 5. forests — per-biome tree density, dense at the core, never on paths
  const forest = valueNoise(6);
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (!isGround(grid[r][c])) continue;
      const b = at(r, c), f = forest[r][c];
      if (f > b.treeBase && chance(Math.min(0.4, (f - b.treeBase) * 3 * b.treeProb))) placeProp('tree', c, r);
    }
  }

  // 6. rock formations and bramble patches — clustered, weighted by biome
  // (scaled to world area so density stays consistent as the world grows)
  const seeds = Math.round(WORLD_COLS * WORLD_ROWS / 130);
  for (let i = 0; i < seeds; i++) {
    const c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
    if (!isGround(grid[r][c])) continue;
    const b = at(r, c);
    if (chance(0.18 * b.rock)) cluster('rock', 2 + rint(2 + Math.round(b.rock * 2)));
    else if (chance(0.18 * b.bush)) cluster('bush', 2 + rint(3));
  }

  // 7. rare chests (scaled to world area)
  const chests = Math.round(WORLD_COLS * WORLD_ROWS / 9000);
  for (let i = 0; i < chests; i++) placeProp('chest', rint(WORLD_COLS), rint(WORLD_ROWS));

  // 8. ground cover — walk-over flowers / grass / mushrooms / pebbles (decor)
  decals = new Map();
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (solidTiles.has(key(c, r))) continue;
      const ch = grid[r][c];
      let d = null;
      if (ch === 'G') {
        const roll = Math.random();
        if (roll < 0.04) d = 'deco-flowers';
        else if (roll < 0.08) d = 'deco-flowers-y';
        else if (roll < 0.11) d = 'deco-mushroom';
        else if (roll < 0.13) d = 'deco-pebbles';
        else if (roll < 0.32) d = 'deco-grass';
      } else if (ch === 'M') {
        if (chance(0.18)) d = 'deco-reeds';
      } else if (ch === 'H') {
        const roll = Math.random();
        if (roll < 0.09) d = 'deco-pebbles';
        else if (roll < 0.11) d = 'deco-mushroom';
      } else if (ch === 'B') {
        if (chance(0.06)) d = 'deco-pebbles';
      }
      if (d) decals.set(key(c, r), d);
    }
  }

  // 9. pickups — sparse, but scaled to area: coins, potions, mana crystals
  items = [];
  const loot = Math.round(WORLD_COLS * WORLD_ROWS / 420);
  for (let i = 0; i < loot; i++) {
    const c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
    if (!walkableBase(c, r) || solidTiles.has(key(c, r))) continue;
    const roll = Math.random();
    const name = roll < 0.6 ? 'coin' : roll < 0.8 ? 'crystal' : 'potion';
    items.push({ name, c, r });
  }
  // rare spell tomes (raise max mana)
  const tomes = Math.round(WORLD_COLS * WORLD_ROWS / 14000);
  for (let i = 0; i < tomes; i++) {
    const c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
    if (walkableBase(c, r) && !solidTiles.has(key(c, r))) items.push({ name: 'tome', c, r });
  }
  // scattered spell scrolls — pick one up to swap your spell slot
  const scrollSpells = ['spread', 'nova', 'bolt'];
  const scrolls = Math.round(WORLD_COLS * WORLD_ROWS / 10000);
  for (let i = 0; i < scrolls; i++) {
    const c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
    if (walkableBase(c, r) && !solidTiles.has(key(c, r))) {
      items.push({ name: 'scroll', spell: scrollSpells[rint(scrollSpells.length)], c, r });
    }
  }

  // 10. wandering monsters — species drawn from the local biome's pool
  // (count scales with world area so density stays consistent; +15% mob rate)
  monsters = [];
  const mob = Math.round(WORLD_COLS * WORLD_ROWS / 700 * 1.15);
  effects = [];
  for (let i = 0; i < mob; i++) {
    const c = rint(WORLD_COLS), r = rint(WORLD_ROWS);
    if (!walkableBase(c, r) || solidTiles.has(key(c, r))) continue;
    const pool = at(r, c).mob;
    const type = pool[rint(pool.length)];
    monsters.push(makeActor(type, c, r, type === 'slime' ? 280 : 230));
  }

  // 11. flying bats — weak (1 hp) flying enemies that ignore terrain
  bats = [];
  const flock = Math.round(WORLD_COLS * WORLD_ROWS / 1500 * 1.15);
  for (let i = 0; i < flock; i++) {
    bats.push({
      type: 'bat', hp: 1, kx: 0, ky: 0, hurt: 0, dying: 0,
      x: rint(WORLD_W), y: rint(WORLD_H),
      vx: (Math.random() * 2 - 1) * 0.045, vy: (Math.random() * 2 - 1) * 0.03,
      ph: Math.random() * 6,
    });
  }

  // start the player on open ground near the world center
  const start = findStart();
  player = { tx: start.c, ty: start.r, x: footX(start.c), y: footY(start.r), facing: 'down', moving: false, t: 0, hp: MAX_HP, invuln: 0, castCd: 0, spell: 'bolt', attack: { active: false, t: 0, dir: 'down', cd: 0, hit: null } };
  projectiles = [];
  mp = maxMp = START_MAX_MP; manaTimer = MANA_REGEN;
}

function findStart() {
  const cc = WORLD_COLS >> 1, cr = WORLD_ROWS >> 1;
  for (let rad = 0; rad < Math.max(WORLD_COLS, WORLD_ROWS); rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const c = cc + dc, r = cr + dr;
        if (walkableBase(c, r) && !solidTiles.has(key(c, r))) return { c, r };
      }
    }
  }
  return { c: cc, r: cr };
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
  if (k === ' ' || k === 'j' || k === 'enter') { e.preventDefault(); startAttack(); return; }
  if (k === 'f' || k === 'l') { e.preventDefault(); castSpell(); return; }
  if (!KEYDIR[k]) return;
  e.preventDefault();
  if (!heldKeys.has(k)) { heldKeys.add(k); pressOrder.push(k); }
});

function startAttack() {
  const a = player && player.attack;
  if (!a || a.active || a.cd > 0) return; // one swing at a time + cooldown
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
  if (!inb(c, r)) return true; // world edge — player bumps the border
  const ch = grid[r][c];
  return ch === 'W' || ch === '#' || solidTiles.has(key(c, r));
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
function knockback(e, d) {
  const oldX = e.x + e.kx, oldY = e.y + e.ky;
  if (e.type === 'bat') {
    e.x += d.dx * KB_TILES * TILE;
    e.y += d.dy * KB_TILES * TILE;
  } else {
    let n = 0;
    for (let i = 1; i <= KB_TILES; i++) {
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

function collectAt(c, r) {
  items = items.filter(it => {
    if (it.c === c && it.r === r) {
      if (it.name === 'coin') coins++;
      else if (it.name === 'potion') { potions++; player.hp = Math.min(MAX_HP, player.hp + 1); }
      else if (it.name === 'crystal') mp = Math.min(maxMp, mp + 3);
      else if (it.name === 'tome') { maxMp = Math.min(MP_CAP, maxMp + 1); mp = maxMp; }
      else if (it.name === 'scroll') { player.spell = it.spell; mp = Math.min(maxMp, mp + 2); }
      syncHud();
      return false;
    }
    return true;
  });
}

function updatePlayer(dt) {
  const dir = currentDir();
  // turn to face the pressed direction immediately — even mid-step — so a
  // direction change registers right away instead of after the tile finishes
  if (dir && !player.attack.active) player.facing = dir;

  if (player.moving) {
    if (advance(player, dt)) collectAt(player.tx, player.ty);
    else return;
  }
  if (player.attack.active || !dir) return; // rooted while swinging / no input
  const { dx, dy } = DIRS[dir];
  const nx = player.tx + dx, ny = player.ty + dy;
  // only terrain blocks the player now — you pass through monsters (and take a hit)
  if (!tileBlocked(nx, ny)) beginStep(player, nx, ny, PLAYER_STEP);
}

// Box swept by the sword, one tile in front of the player.
function attackHitbox() {
  const d = DIRS[player.attack.dir];
  const cx = player.x + d.dx * TILE * 0.9;
  const cy = (player.y - TILE * 0.5) + d.dy * TILE * 0.9;
  const w = TILE * 1.3, h = TILE * 1.3;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function updateAttack(dt) {
  const a = player.attack;
  if (a.cd > 0) a.cd -= dt;
  if (!a.active) return;
  a.t += dt / ATTACK_DUR;
  if (a.t >= 0.05 && a.t <= 0.8) {
    const hb = attackHitbox();
    const kd = DIRS[a.dir]; // shove enemies the way you're swinging
    for (const m of monsters) {
      if (m.dying || a.hit.has(m) || !rectsOverlap(hb, hitbox(m))) continue;
      a.hit.add(m);
      damageEnemy(m, 1, kd);
    }
    for (const b of bats) {
      if (b.dying || a.hit.has(b) || !rectsOverlap(hb, hitbox(b))) continue;
      a.hit.add(b);
      damageEnemy(b, 1, kd);
    }
  }
  if (a.t >= 1) { a.active = false; a.cd = SWING_COOLDOWN; }
}

// Apply damage to an enemy. On a killing blow it enters a `dying` state — it's
// still knocked back and then fades/shrinks (see updateMonsters/updateBats +
// render) so the player can watch it die, rather than vanishing instantly.
function damageEnemy(e, dmg, dir) {
  if (e.dying) return;
  knockback(e, dir); // shoved back on every hit, including the fatal one
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
function emit(angle, dmg) {
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const ox = player.x + nx * TILE * 0.5;
  const oy = player.y - TILE * 0.5 + ny * TILE * 0.5;
  projectiles.push({ x: ox, y: oy, vx: nx * SPELL_SPEED, vy: ny * SPELL_SPEED, kd: { dx: Math.round(nx), dy: Math.round(ny) }, life: SPELL_LIFE, dmg });
  spawnSpark(ox, oy);
}

// Spells the slot can hold. Scrolls scattered in the world swap the slot.
const SPELLS = {
  bolt:   { cost: 2, dmg: 2, label: 'Arcane Bolt', cast: (b, d) => emit(b, d) },
  spread: { cost: 3, dmg: 2, label: 'Scatter',     cast: (b, d) => { emit(b - 0.42, d); emit(b, d); emit(b + 0.42, d); } },
  nova:   { cost: 4, dmg: 2, label: 'Nova Burst',  cast: (b, d) => { for (let i = 0; i < 8; i++) emit(i * Math.PI / 4, d); } },
};
const SPELL_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

function castSpell() {
  if (!player) return;
  const s = SPELLS[player.spell] || SPELLS.bolt;
  if (mp < s.cost || player.castCd > 0) return;
  mp -= s.cost;
  player.castCd = SPELL_CD;
  s.cast(SPELL_ANGLE[player.facing], s.dmg);
}

function updateMana(dt) {
  if (player.castCd > 0) player.castCd -= dt;
  if (mp < maxMp) {
    manaTimer -= dt;
    if (manaTimer <= 0) { mp = Math.min(maxMp, mp + 1); manaTimer = MANA_REGEN; }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    const pb = { x: p.x - 9, y: p.y - 9, w: 18, h: 18 };
    let hit = false;
    for (const m of monsters) {
      if (!m.dying && rectsOverlap(pb, hitbox(m))) { damageEnemy(m, p.dmg, p.kd); hit = true; break; }
    }
    if (!hit) for (const b of bats) {
      if (!b.dying && rectsOverlap(pb, hitbox(b))) { damageEnemy(b, p.dmg, p.kd); hit = true; break; }
    }
    if (hit || p.life <= 0 || tileBlocked(Math.floor(p.x / TILE), Math.floor(p.y / TILE))) {
      spawnBoom(p.x, p.y, 'magic');
      projectiles.splice(i, 1);
    }
  }
}

function damagePlayer() {
  player.hp--;
  player.invuln = IFRAMES;
  if (player.hp <= 0) respawn();
}

function respawn() {
  const s = findStart();
  player.tx = s.c; player.ty = s.r;
  player.x = footX(s.c); player.y = footY(s.r);
  player.moving = false; player.t = 0;
  player.hp = MAX_HP; player.invuln = 1500;
  player.attack.active = false;
  mp = maxMp; // refill mana on respawn
}

// Enemy contact damage — overlapping hitboxes cost a heart (with i-frames).
function updateCombat(dt) {
  if (player.invuln > 0) { player.invuln -= dt; return; }
  const phb = hitbox(player);
  for (const m of monsters) {
    if (!m.dying && inViewPx(m.x, m.y) && rectsOverlap(phb, hitbox(m))) { damagePlayer(); return; }
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
    : type === 'magic' ? '#6aa8f0' : '#7b46a0';
  effects.push({ x, y, t: 0, dur: 360, color, ring: true, spread: 28, psize: 5, parts: ringParts(10, 1.9) });
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
    if (b.x < 0 || b.x > WORLD_W) b.vx *= -1;
    if (b.y < 0 || b.y > WORLD_H) b.vy *= -1;
  }
}

function updateCamera() {
  camX = clamp(player.x - VIEW_W / 2, 0, Math.max(0, WORLD_W - VIEW_W));
  camY = clamp((player.y - TILE / 2) - VIEW_H / 2, 0, Math.max(0, WORLD_H - VIEW_H));
}

// ── rendering ───────────────────────────────────────────────────────────────
let IMG = {};
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function drawSprite(name, fx, fy, mult = 1) {
  const img = IMG[name];
  if (!img) return;
  const s = PIXEL * mult;
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

const inViewPx = (x, y) =>
  x > camX - TILE * 2 && x < camX + VIEW_W + TILE * 2 &&
  y > camY - TILE * 3 && y < camY + VIEW_H + TILE * 2;

function render(time) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  // visible ground tiles only
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(WORLD_COLS - 1, Math.floor((camX + VIEW_W) / TILE));
  const r0 = Math.max(0, Math.floor(camY / TILE));
  const r1 = Math.min(WORLD_ROWS - 1, Math.floor((camY + VIEW_H) / TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ch = grid[r][c];
      const img = IMG[TILE_SPRITE[ch]];
      if (img) {
        if (isGround(ch)) drawTileVaried(img, c, r); // flip per-tile to break up repetition
        else ctx.drawImage(img, c * TILE, r * TILE, TILE, TILE);
      }
      const deco = decals.get(key(c, r));
      if (deco && IMG[deco]) ctx.drawImage(IMG[deco], c * TILE, r * TILE, TILE, TILE);
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
    if (inViewPx(footX(p.c), fy)) drawList.push({ y: fy, fn: () => drawSprite(p.name, footX(p.c), fy) });
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

  // sword swing — the blade sweeps an arc across the facing direction
  if (player.attack.active) {
    const a = player.attack;
    const base = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[a.dir];
    const arc = 0.95;
    const cur = base - arc + 2 * arc * a.t; // current blade angle
    ctx.save();
    ctx.translate(player.x, player.y - TILE * 0.5);
    // faint motion trail behind the blade
    ctx.strokeStyle = 'rgba(210,218,232,0.30)';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, TILE * 0.9, base - arc, cur);
    ctx.stroke();
    // the sword sprite, hilt at the pivot, blade pointing along the swing
    const img = IMG.sword;
    if (img) {
      ctx.rotate(cur);
      const S = TILE * 2.5; // longer-looking blade (visual only; hitbox unchanged)
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, -3.5 / 16 * S, -7.5 / 16 * S, S, S);
      ctx.imageSmoothingEnabled = false;
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

  // magic bolts
  for (const p of projectiles) {
    if (!inViewPx(p.x, p.y)) continue;
    const ux = p.vx / SPELL_SPEED, uy = p.vy / SPELL_SPEED;
    ctx.fillStyle = 'rgba(106,168,240,0.28)';
    ctx.beginPath(); ctx.arc(p.x - ux * 9, p.y - uy * 9, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(110,180,245,0.95)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,245,255,0.95)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
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
  for (let i = 0; i < MAX_HP; i++) {
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
  const sp = document.getElementById('spell');
  if (sp && player) sp.textContent = (SPELLS[player.spell] || SPELLS.bolt).label;
}

let last = 0;
function frame(time) {
  const dt = Math.min(50, time - last);
  last = time;
  updatePlayer(dt);
  updateMonsters(dt);
  updateAttack(dt);
  updateProjectiles(dt);
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
ctx.imageSmoothingEnabled = false;
loadSprites().then(imgs => {
  IMG = imgs;
  generate();
  updateCamera();
  syncHud();
  requestAnimationFrame(frame);
});
