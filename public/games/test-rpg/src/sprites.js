// Sprite definitions for test-rpg — 16-bit pixel art, dark-fantasy palette.
// Each sprite is authored as a grid of characters; px() turns it into an SVG
// of 1x1 rects (run-length merged per row). Sprites render at native pixel
// resolution and are upscaled crisply by the game (imageSmoothing off).
//
// Used two ways:
//   - browser: turned into <img> data URIs by the game (see game.js loadSprites)
//   - node:    written out to assets/sprites/*.svg by scripts/export-svgs.mjs

(function (global) {
  // Dark-fantasy palette. '.' / ' ' = transparent.
  const PAL = {
    ';': '#0a0710aa', // ground shadow (semi-transparent)
    'k': '#0c0a12',   // outline / near-black
    'c': '#2a2238', 'C': '#43375a', // cloak purple
    'f': '#9c7b6b', 'F': '#6e5346', // pallid skin
    'y': '#b7c24a',   // sickly glowing eye
    'i': '#cf3a2a',   // red glowing eye
    'g': '#8a6d28', 'G': '#c4a23c', // dull gold
    'u': '#241a13', 'U': '#3e2e1f', // dark wood / leather
    'a': '#4a525e', 'A': '#737d8c', 'b': '#2f363f', // cold steel
    'o': '#c3bca3', 'O': '#8f8a72', // bone
    'e': '#3a5230', 'E': '#587544', 'n': '#23341d', 'j': '#6d9450', // mossy grass + bright blade
    'w': '#16263c', 'W': '#274058', 'x': '#3c587a', // murky water
    'p': '#46285a', 'P': '#7b46a0', // corrupt magic
    'r': '#641d28', 'R': '#a3303f', // blood
    't': '#3a2c1e', 'T': '#54402b', 's': '#241a11', // dirt path
    'm': '#5a5f6a', 'M': '#787e8b', 'D': '#34383f', // dungeon stone
    'h': '#463f33', // highland dirt
    'q': '#27331f', 'Q': '#33422a', // marsh mire
    'z': '#2b2533', 'Z': '#3a3346', // blighted ash
    'v': '#2a5fb0', 'V': '#5a9be8', 'l': '#a8e4ff', // arcane blue
    '1': '#15121c', '2': '#272232', // cave wall (dark)
    '3': '#403a4a', '4': '#534c5e', // cave floor (dim stone)
    '5': '#7c7488', '6': '#9a93a6', // golem stone
    '7': '#c9a86a', '8': '#b08a4e', '9': '#dcc185', // desert sand
    '0': '#e8eff7', 'd': '#c2cdda', 'I': '#acc6da', // snow + ice
  };

  function px(rows) {
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    let body = '';
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') { x++; continue; }
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        const fill = PAL[ch] || '#ff00ff';
        body += "<rect x='" + x + "' y='" + y + "' width='" + run +
          "' height='1' fill='" + fill + "' shape-rendering='crispEdges'/>";
        x += run;
      }
    }
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h +
      "' viewBox='0 0 " + w + " " + h + "' shape-rendering='crispEdges'>" + body + "</svg>";
  }

  const rev = a => a.map(s => s.split('').reverse().join(''));

  // ── procedural 32×32 terrain tiles (detailed, reliable, always full-width) ──
  function tnoise(seed, scale) {
    const G = 32, gw = Math.ceil(G / scale) + 2, lat = [];
    let s = (seed >>> 0) || 1;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let y = 0; y < gw; y++) { const row = []; for (let x = 0; x < gw; x++) row.push(rnd()); lat.push(row); }
    const sm = t => t * t * (3 - 2 * t), out = [];
    for (let y = 0; y < G; y++) {
      const row = [];
      for (let x = 0; x < G; x++) {
        const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = sm(fx - x0), ty = sm(fy - y0);
        const a = lat[y0][x0], b = lat[y0][x0 + 1], c2 = lat[y0 + 1][x0], d = lat[y0 + 1][x0 + 1];
        const top = a + (b - a) * tx;
        row.push(top + ((c2 + (d - c2) * tx) - top) * ty);
      }
      out.push(row);
    }
    return out;
  }
  function cellHash(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 362437);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  // spec: { seed, scale, base, tones:[[threshold,char]...], grain:[[rate,char]...] }
  function genTile(spec) {
    const n = tnoise(spec.seed || 7, spec.scale || 6), rows = [];
    for (let y = 0; y < 32; y++) {
      let row = '';
      for (let x = 0; x < 32; x++) {
        const v = n[y][x];
        let ch = spec.base;
        if (spec.tones) for (const [t, c] of spec.tones) { if (v < t) { ch = c; break; } }
        if (spec.grain) { const g = cellHash(x, y, (spec.seed || 7) + 131); for (const [rt, c] of spec.grain) { if (g < rt) { ch = c; break; } } }
        row += ch;
      }
      rows.push(row);
    }
    return rows;
  }
  // dungeon brick wall (32×32) with mortar lines + top highlights
  function brickTile() {
    const rows = [], bh = 8, bw = 16;
    for (let y = 0; y < 32; y++) {
      let row = '';
      const off = (Math.floor(y / bh) % 2) * (bw / 2);
      for (let x = 0; x < 32; x++) {
        const bx = (x + off) % bw;
        if (y % bh === 0 || bx === 0) row += 'D';        // mortar
        else if (y % bh === 1) row += 'M';               // top highlight
        else row += 'm';                                 // brick face
      }
      rows.push(row);
    }
    return rows;
  }

  // ---- player: shared body + per-direction heads ----
  const pBody = [
    ".kCCCCCCCCCCCCk.",
    ".kCccccccccccCk.",
    ".kCcccCCCCcccCk.",
    ".kCccccccccccCk.",
    ".kCcgggGGgggcCk.",
    ".kCccccccccccCk.",
    ".kCccccccccccCk.",
    "..kCccccccccCk..",
    "..kCccc..cccCk..",
    "...uuuu..uuuu...",
    "...uuuu..uuuu...",
    "...kkkk..kkkk...",
    "...;;;;;;;;;;...",
  ];
  const pHeadDown = [
    "......kkkk......",
    "....kkCCCCCCkk..",
    "...kCCCCCCCCCCk.",
    "..kCCCCCCCCCCCCk",
    "..kCCccccccCCk..",
    "..kCcffffffcCk..",
    "..kCcfyffyfcCk..",
    "..kCcffffffcCk..",
    "..kCCcffffcCCk..",
  ];
  const pHeadUp = [
    "......kkkk......",
    "....kkCCCCCCkk..",
    "...kCCCCCCCCCCk.",
    "..kCCCCCCCCCCCCk",
    "..kCCCCCCCCCCk..",
    "..kCCCcCCcCCCk..",
    "..kCCCCCCCCCCk..",
    "..kCCCCCCCCCCk..",
    "..kCCCCCCCCCCk..",
  ];
  const pHeadLeft = [
    ".....kkkk.......",
    "...kkCCCCkk.....",
    "..kCCCCCCCCk....",
    ".kCCCCCCCCCCk...",
    "kCfffCCCCCCk....",
    "kfffyfCCCCCk....",
    "kCfffCCCCCCk....",
    "kCCffCCCCCCk....",
    ".kCCCCCCCCk.....",
  ];
  const playerDown = pHeadDown.concat(pBody);
  const playerUp = pHeadUp.concat(pBody);
  const playerLeft = pHeadLeft.concat(pBody);
  const playerRight = rev(playerLeft);

  // villager = recolored down-facing player (brown peasant, weary dark eyes)
  const recolor = row => row
    .replace(/C/g, 'U').replace(/c/g, 'u')
    .replace(/G/g, 'U').replace(/g/g, 'u')
    .replace(/y/g, 'k');
  const villager = playerDown.map(recolor);

  // cultist: a hooded caster in a blood-red robe with glowing eyes (recolored player)
  const cultist = playerDown.map(row =>
    row.replace(/C/g, 'R').replace(/c/g, 'r').replace(/y/g, 'i'));

  // wisp: a floating arcane orb with a single eye and a wispy tail
  const wisp = [
    "................",
    "................",
    ".....pPPp.......",
    "....pPVVPp......",
    "...pPVllVPp.....",
    "...pVloolVp.....",
    "...pVlkklVp.....",
    "...pPVllVPp.....",
    "....pPVVPp......",
    ".....pPPp.......",
    "......pp........",
    ".....p..p.......",
    "......pp........",
    "................",
    "................",
    "................",
  ];

  const slime = [
    "................",
    "......kkkk......",
    "....kkppppkk....",
    "...kppppppppk...",
    "..kpppppppppppk.",
    ".kpppppppppppppk",
    ".kpppyypppyyppk.",
    ".kpppppppppppppk",
    ".kppppkkkkkppppk",
    ".kpppppppppppppk",
    "..kppPPppPPpppk.",
    "..kpppppppppppk.",
    "...kppppppppk...",
    "....kkppppkk....",
    "..;;;;;;;;;;;;..",
    "................",
  ];

  const skeleton = [
    "................",
    "....kkkkkk......",
    "...koooooooook..",
    "..kooooooooook..",
    "..kooiiooiiook..",
    "..kooookkooook..",
    "..koookkkkoook..",
    "...koooooooook..",
    ".....kkkk.......",
    "..koooooooook...",
    "..koooooooook...",
    "..koOoOoOoOoOk..",
    "..koooooooook...",
    "..koOoOoOoOoOk..",
    "...koooooook....",
    "...koo....ook...",
    "...koo....ook...",
    "...koo....ook...",
    "...koo....ook...",
    "...koo....ook...",
    "...kkk..kkk.....",
    "..;;;;;;;;;;;;..",
  ];

  const bat = [
    "kk............kk",
    "kppk........kppk",
    "kpppk......kpppk",
    ".kppk.kcck.kppk.",
    ".kppkkciickkppk.",
    "..kpkkccckkpk...",
    "...kk.kcck.kk...",
    "......kcck......",
    ".......kk.......",
  ];

  const tileGrass = genTile({ seed: 12, scale: 6, base: 'e',
    tones: [[0.30, 'n'], [0.60, 'e'], [0.85, 'E'], [2, 'j']],
    grain: [[0.05, 'E'], [0.085, 'j']] });
  const tileWater = genTile({ seed: 21, scale: 7, base: 'w',
    tones: [[0.42, 'w'], [0.78, 'W'], [2, 'x']],
    grain: [[0.03, 'x']] });
  const tilePath = genTile({ seed: 5, scale: 6, base: 't',
    tones: [[0.45, 's'], [0.8, 't'], [2, 'T']],
    grain: [[0.06, 'T'], [0.1, 's']] });
  const tileWall = brickTile();
  const tileHighland = genTile({ seed: 33, scale: 5, base: 'h',
    tones: [[0.5, 'h'], [0.72, 'm'], [0.9, 'M'], [2, 'D']],
    grain: [[0.05, 'D'], [0.09, 'M'], [0.13, 'm']] });
  const tileMire = genTile({ seed: 44, scale: 6, base: 'q',
    tones: [[0.42, 'q'], [0.74, 'Q'], [0.9, 'w'], [2, 'W']],
    grain: [[0.05, 'W'], [0.09, 'Q']] });
  const tileBlight = genTile({ seed: 55, scale: 5, base: 'z',
    tones: [[0.55, 'z'], [0.85, 'Z'], [2, 'p']],
    grain: [[0.03, 'p'], [0.06, 'k'], [0.1, 'Z']] });

  // Mana crystal (pickup) — restores mana.
  const crystal = [
    "................",
    "................",
    ".......k........",
    "......klk.......",
    ".....klVlk......",
    "....klVVVlk.....",
    "....kVVlVVk.....",
    "....kVlllVk.....",
    "....kVVlVVk.....",
    ".....kVVVk......",
    "......klk.......",
    "......kk........",
    "................",
    "................",
    "................",
    "................",
  ];

  // Spell tome (rare pickup) — raises max mana.
  const tome = [
    "................",
    "................",
    "................",
    "..kkkkkkkkk.....",
    ".kPPPPPPPPPk....",
    ".kPooooooopk....",
    ".kPoGGppGGok....",
    ".kPoGppppGok....",
    ".kPoGGppGGok....",
    ".kPooooooopk....",
    ".kPPPPPPPPPk....",
    "..kkkkkkkkk.....",
    "................",
    "................",
    "................",
    "................",
  ];

  // Spell scroll (rare pickup) — swaps your equipped spell.
  const scroll = [
    "................",
    "................",
    "...kUUUUUUUk....",
    "...koooooook....",
    "...koooooook....",
    "...kooRRRook....",
    "...koRRPRRok....",
    "...kooRRRook....",
    "...koooooook....",
    "...koooooook....",
    "...kUUUUUUUk....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];

  // Sword for the swing effect — points right (blade +x, hilt at the left pivot).
  const sword = [
    "................",
    "................",
    "................",
    "................",
    "................",
    ".....G..........",
    ".ggUUGoooooooA..",
    ".ggUUGAAAAAAAk..",
    ".....G..........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];
  const dagger = [
    "................", "................", "................",
    "................", "................", "................",
    ".gUUAAok........",
    ".gUUAAk.........",
    "................", "................", "................",
    "................", "................", "................",
    "................", "................",
  ];
  const waraxe = [
    "................", "................", "................",
    "................",
    "........AAA.....",
    ".gUUUUUAAAAA....",
    ".gUUUUUAAAAAk...",
    ".gUUUUUAAAAA....",
    "........AAA.....",
    "................", "................", "................",
    "................", "................", "................", "................",
  ];
  const greatsword = [
    "................", "................", "................",
    "................", "................",
    "...GG...........",
    ".gUGGoooooooooA.",
    ".gUGGAAAAAAAAAk.",
    "...GG...........",
    "................", "................", "................",
    "................", "................", "................", "................",
  ];

  // HUD hearts (full + an "empty container" variant).
  const heartFull = [
    "................",
    "...kk....kk.....",
    "..kRRk..kRRk....",
    ".kRRRRkkRRRRk...",
    ".kRRRRRRRRRRk...",
    ".kRRRRRRRRRRk...",
    "..kRRRRRRRRk....",
    "...kRRRRRRk.....",
    "....kRRRRk......",
    ".....kRRk.......",
    "......kk........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];
  const heartEmpty = heartFull.map(row => row.replace(/R/g, 'D'));

  // Walk-over ground cover (decorative overlays, no collision).
  const decoGrass = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    ".......e........",
    ".....e.e.e......",
    ".....eEeEe......",
    "....eEeEeEe.....",
    "...eEeEeEeEe....",
    "...eeeeeeeee....",
    "................",
    "................",
  ];

  const decoFlowers = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "....r.....p.....",
    "...rRr...pPp....",
    "....e.....e.....",
    "....e..g..e.....",
    "....e.gGg.e.....",
    "..e.e..g..e.e...",
    "..eEeEeEeEeEe...",
    "...eeeeeeeee....",
    "................",
    "................",
  ];

  const decoReeds = [
    "................",
    "................",
    "................",
    ".....u...u......",
    ".....U...U......",
    ".....q...q......",
    ".....q.q.q......",
    "...q.q.q.q.q....",
    "...q.q.q.q.q....",
    "...q.q.q.q.q....",
    "...Q.q.Q.q.Q....",
    "...qqqqqqqqq....",
    "................",
    "................",
    "................",
    "................",
  ];

  const decoFlowersY = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "....G.....o.....",
    "...GGG...ooo....",
    "....e.....e.....",
    "....e..V..e.....",
    "....e.VVV.e.....",
    "..e.e..V..e.e...",
    "..eEeEeEeEeEe...",
    "...eeeeeeeee....",
    "................",
    "................",
  ];

  const decoMushroom = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    ".....rrrr.......",
    "....rRRRRr......",
    "....RRooRR......",
    ".....oOOo.......",
    ".....oOOo....rr..",
    "...........rRRr.",
    "...........RooR.",
    "............OO..",
    "................",
  ];

  const decoPebbles = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "......mm........",
    ".....mMMm...mm..",
    ".....mDDm..mMMm.",
    "......mm....mDm.",
    "................",
    "................",
  ];

  // full leafy tree — round green canopy over a short trunk
  const tree = [
    "......nnnn......",
    "....nnEEEEnn....",
    "...nEEEEEEEEn...",
    "..nEEEjjEEEEEn..",
    ".nEEEjjEEEEEEEn.",
    ".nEEEEEEEEEEEen.",
    "nEEEEEEEEEEEeeen",
    "nEEEEEEEEEEEeeen",
    "nEEEEEEEEEEEeeen",
    ".nEEEEEEEEEeeen.",
    ".nEEEEEEEEEeen..",
    "..nEEEEEEEeen...",
    "...nnEEEeenn....",
    ".....nnnn.......",
    ".......uu.......",
    ".......uu.......",
    "......uUUu......",
    ".....;;;;;;.....",
    "................",
    "................",
  ];

  const chest = [
    "................",
    "...aaaaaaaaaa...",
    "..auUUUUUUUUua..",
    "..aUuuuuuuuuUa..",
    "..aaaaaaaaaaaa..",
    "..auUUUUUUUUua..",
    "..auUUUGGUUUua..",
    "..auUUUGGUUUua..",
    "..aUuuuuuuuuUa..",
    "..aaaaaaaaaaaa..",
    "..auuuuuuuuuua..",
    "...kkkkkkkkkk...",
    "..;;;;;;;;;;;;..",
    "................",
  ];

  // open chest — raised lid + glowing interior (shown after looting)
  const chestOpen = [
    "...UUUUUUUUUU...",
    "..aGGGGGGGGGGa..",
    "..akkkkkkkkkka..",
    "..aklVVVVVVlka..",
    "..aklVllllVlka..",
    "..auUUUUUUUUua..",
    "..auUUUUUUUUua..",
    "..aUuuuuuuuuUa..",
    "..aaaaaaaaaaaa..",
    "..auuuuuuuuuua..",
    "...kkkkkkkkkk...",
    "..;;;;;;;;;;;;..",
    "................",
    "................",
  ];

  const potion = [
    "................",
    ".......uu.......",
    ".......uu.......",
    "......aAAa......",
    "......a..a......",
    ".....aA..Aa.....",
    ".....a.pp.a.....",
    ".....apPPpa.....",
    ".....appppa.....",
    ".....aPppPa.....",
    ".....appPpa.....",
    ".....apppPa.....",
    ".....appppa.....",
    ".....aAppAa.....",
    "......aAAa......",
    ".......aa.......",
    ".....;;;;;;.....",
    "................",
  ];

  const coin = [
    "................",
    ".....kkkkkk.....",
    "...kkggggggkk...",
    "..kgggGGGGgggk..",
    ".kggGGGGGGGGggk.",
    ".kgGGGGGGGGGGgk.",
    ".kgGkGGGGGGkGgk.",
    ".kgGGkGGGGkGGgk.",
    ".kgGGGkGGkGGGgk.",
    ".kgGGGGkkGGGGgk.",
    ".kggGGGGGGGGggk.",
    "..kgggGGGGgggk..",
    "...kkggggggkk...",
    ".....kkkkkk.....",
    "................",
    "................",
  ];

  const rock = [
    "................",
    "................",
    ".....mmmm.......",
    "...mmMMMMmm.....",
    "..mMMmmmmmMm....",
    ".mMMmmmmmmmDm...",
    ".mmmmmmmmmmDD...",
    ".DmmmmmmmmmmD...",
    "..DmmmmmmmmD....",
    "...DDmmmmDD.....",
    ".....DDDD.......",
    "..;;;;;;;;;;....",
    "................",
    "................",
  ];

  const bush = [
    "................",
    ".....nnnn.......",
    "...nnneennnn....",
    "..nneennReenn...",
    ".neenneeenneenn.",
    ".neRenneeeneRen.",
    ".neenneeenneenn.",
    ".eenneeRneennne.",
    "..neenneennen...",
    "...nneennenn....",
    "....nknknkn.....",
    "..;;;;;;;;;;....",
    "................",
    "................",
  ];

  // ── cave / underground ──
  const tileCave = genTile({ seed: 66, scale: 6, base: '3',
    tones: [[0.45, '2'], [0.82, '3'], [2, '4']],
    grain: [[0.05, '1'], [0.1, '4']] });
  const tileCaveWall = genTile({ seed: 77, scale: 4, base: '1',
    tones: [[0.6, '1'], [0.9, '2'], [2, 'k']],
    grain: [[0.07, '2']] });
  // overworld cave mouth (walk into it to go underground)
  const caveEntrance = [
    "................",
    "................",
    "....mMMMMMMm....",
    "...mMMMMMMMMm...",
    "..mMMMMMMMMMMm..",
    "..mMM111111MMm..",
    ".mMM11111111MMm.",
    ".mM1111111111Mm.",
    ".mM1111111111Mm.",
    ".mMM11111111MMm.",
    ".mMMM111111MMMm.",
    ".mMMMMMMMMMMMMm.",
    "..mMMMMMMMMMMm..",
    "...;;;;;;;;;;...",
    "................",
    "................",
  ];
  // underground exit back to the surface (glowing way up)
  const caveExit = [
    "................",
    "...1mmmmmmm1....",
    "..1mM444444Mm...",
    "..mM4oOOOO4Mm...",
    "..mM4OllllO4m...",
    "..mM4OllllO4m...",
    "..mM4OOOOOO4m...",
    "..mM44444444m...",
    "..1mMMMMMMMm1...",
    "....1111111.....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];
  // golem — bulky stone brute (cave)
  const golem = [
    "................",
    "....555555......",
    "...56666665.....",
    "...56i668865....",
    "...56666665.....",
    "..5566666655....",
    ".556666666655...",
    ".566666666665...",
    ".566655566665...",
    ".566666666665...",
    ".566666666665...",
    "..56666666665...",
    "..5566...5566...",
    "..5566...5566...",
    "..1115...5111...",
    "..;;;;;;;;;;;...",
    "................",
    "................",
  ];
  // wraith — dark hovering specter with glowing eyes (cave)
  const wraith = [
    "................",
    "......kkkk......",
    ".....kCCCCk.....",
    "....kCCCCCCk....",
    "....kCyCCyCk....",
    "....kCCCCCCk....",
    "...kCCCCCCCCk...",
    "...kCCCCCCCCk...",
    "...kCCCCCCCCk...",
    "...kCCCCCCCCk...",
    "....kCCCCCCk....",
    "....kC.CC.Ck....",
    "...k.C.  .C.k...",
    "....k. .. .k....",
    "................",
    "................",
  ];

  // ── desert + snow biomes ──
  const tileSand = genTile({ seed: 88, scale: 7, base: '7',
    tones: [[0.4, '8'], [0.78, '7'], [2, '9']],
    grain: [[0.05, '9'], [0.09, '8']] });
  const tileSnow = genTile({ seed: 99, scale: 7, base: '0',
    tones: [[0.5, '0'], [0.82, 'd'], [2, 'I']],
    grain: [[0.03, 'I'], [0.07, 'd']] });
  const cactus = [
    "................",
    "................",
    ".......nn.......",
    "..nn...ee.......",
    "..ee...ee...nn..",
    "..ee.n.ee...ee..",
    "..eeneeee.neee..",
    "..eeeeeeeeeeee..",
    "...neeeeeeeen...",
    ".....neeeen.....",
    ".......ee.......",
    ".......ee.......",
    ".......ee.......",
    ".....;;;;;;.....",
    "................",
    "................",
  ];
  // village hut — solid one-tile building with a roof + door
  const house = [
    "................",
    "....rrrrrrrr....",
    "...rRRRRRRRRr...",
    "..rRRRRRRRRRRr..",
    ".rRRRRRRRRRRRRr.",
    "rkkkkkkkkkkkkkkr",
    ".UUUUUUUUUUUUUU.",
    ".UUUoooUUUUUUUu.",
    ".UUUoooUUUkkUUu.",
    ".UUUoooUUUkkUUu.",
    ".UUUUUUUUUkkUUu.",
    ".UUUUUUUUUkkUUu.",
    ".kkkkkkkkkkkkkk.",
    "...;;;;;;;;;;...",
    "................",
    "................",
  ];
  // scorpion — desert melee
  const scorpion = [
    "................",
    "................",
    "..k..........k..",
    "..rk........kr..",
    "...rk..rr..kr...",
    "....rkrRRrkr....",
    "..rrrRRRRRRrrr..",
    ".rRRRRRRRRRRRRr.",
    "..rrRRRRRRRRrr..",
    "....rr.rr.rr....",
    "...r..r..r..r...",
    "................",
    "................",
    "................",
    "................",
    "................",
  ];
  // wolf — snow predator
  const wolf = [
    "................",
    "................",
    "..mm........mm..",
    ".mMMm......mMMm.",
    ".mMMMmmmmmmMMMm.",
    ".mMMMMMMMMMMMMm.",
    "mMMyMMMMMMMMyMMm",
    "mMMMMMMMMMMMMMMm",
    "mMMMMMMMMMMMMMMm",
    ".mMMMMMMMMMMMMm.",
    ".mMM.mMMMMm.MMm.",
    ".mm..mMMMMm..mm.",
    ".....mm..mm.....",
    "................",
    "................",
    "................",
  ];
  // heart container — raises max HP
  const heartItem = [
    "................",
    "................",
    "...RR....RR.....",
    "..RRRR..RRRR....",
    ".RRRRRRRRRRRR...",
    ".RRRRRRRRRRRR...",
    ".RRoRRRRRRRRR...",
    "..RRRRRRRRRR....",
    "...RRRRRRRR.....",
    "....RRRRRR......",
    ".....RRRR.......",
    "......RR........",
    "................",
    "................",
    "................",
    "................",
  ];

  const SPRITES = {
    'player-down': px(playerDown),
    'player-up': px(playerUp),
    'player-left': px(playerLeft),
    'player-right': px(playerRight),
    'villager': px(villager),
    'cultist': px(cultist),
    'wisp': px(wisp),
    'slime': px(slime),
    'skeleton': px(skeleton),
    'bat': px(bat),
    'golem': px(golem),
    'wraith': px(wraith),
    'scorpion': px(scorpion),
    'wolf': px(wolf),
    'tile-path': px(tilePath),
    'tile-wall': px(tileWall),
    'cave-entrance': px(caveEntrance),
    'cave-exit': px(caveExit),
    // ── ground tiles + per-type variants (picked by position so the world isn't repetitive) ──
    'tile-grass': px(tileGrass),
    'tile-grass2': px(genTile({ seed: 212, scale: 5, base: 'e', tones: [[0.28, 'n'], [0.58, 'e'], [0.82, 'E'], [2, 'j']], grain: [[0.02, 'G'], [0.05, 'j'], [0.09, 'E']] })),
    'tile-grass3': px(genTile({ seed: 313, scale: 8, base: 'e', tones: [[0.36, 'n'], [0.7, 'e'], [0.9, 'E'], [2, 'j']], grain: [[0.06, 'n'], [0.1, 'E']] })),
    'tile-grass4': px(genTile({ seed: 414, scale: 6, base: 'e', tones: [[0.32, 'E'], [0.66, 'e'], [2, 'j']], grain: [[0.015, 'R'], [0.03, 'G'], [0.07, 'j']] })),
    'tile-water': px(tileWater),
    'tile-water2': px(genTile({ seed: 222, scale: 5, base: 'w', tones: [[0.5, 'w'], [0.85, 'W'], [2, 'x']], grain: [[0.04, 'x']] })),
    'tile-water3': px(genTile({ seed: 323, scale: 9, base: 'w', tones: [[0.38, 'w'], [0.72, 'W'], [2, 'x']], grain: [[0.02, 'x']] })),
    'tile-highland': px(tileHighland),
    'tile-highland2': px(genTile({ seed: 233, scale: 4, base: 'h', tones: [[0.45, 'h'], [0.7, 'm'], [0.88, 'M'], [2, 'D']], grain: [[0.07, 'D'], [0.12, 'm']] })),
    'tile-highland3': px(genTile({ seed: 334, scale: 6, base: 'h', tones: [[0.55, 'h'], [0.78, 'm'], [2, 'M']], grain: [[0.03, 'D'], [0.06, 'M']] })),
    'tile-mire': px(tileMire),
    'tile-mire2': px(genTile({ seed: 244, scale: 5, base: 'q', tones: [[0.38, 'q'], [0.7, 'Q'], [0.88, 'w'], [2, 'W']], grain: [[0.06, 'W'], [0.1, 'n']] })),
    'tile-mire3': px(genTile({ seed: 345, scale: 7, base: 'q', tones: [[0.46, 'q'], [0.8, 'Q'], [2, 'w']], grain: [[0.04, 'Q']] })),
    'tile-blight': px(tileBlight),
    'tile-blight2': px(genTile({ seed: 255, scale: 4, base: 'z', tones: [[0.5, 'z'], [0.82, 'Z'], [2, 'p']], grain: [[0.04, 'p'], [0.08, 'k']] })),
    'tile-blight3': px(genTile({ seed: 356, scale: 6, base: 'z', tones: [[0.6, 'z'], [0.88, 'Z'], [2, 'p']], grain: [[0.02, 'P'], [0.06, 'Z']] })),
    'tile-cave': px(tileCave),
    'tile-cave2': px(genTile({ seed: 266, scale: 5, base: '3', tones: [[0.5, '2'], [0.85, '3'], [2, '4']], grain: [[0.06, '1'], [0.11, '4']] })),
    'tile-cave3': px(genTile({ seed: 367, scale: 7, base: '3', tones: [[0.4, '2'], [0.8, '3'], [2, '4']], grain: [[0.04, '1']] })),
    'tile-cavewall': px(tileCaveWall),
    'tile-cavewall2': px(genTile({ seed: 277, scale: 5, base: '1', tones: [[0.55, '1'], [0.88, '2'], [2, 'k']], grain: [[0.06, '2']] })),
    'tile-sand': px(tileSand),
    'tile-sand2': px(genTile({ seed: 288, scale: 5, base: '7', tones: [[0.42, '8'], [0.8, '7'], [2, '9']], grain: [[0.06, '9'], [0.1, '8']] })),
    'tile-sand3': px(genTile({ seed: 389, scale: 9, base: '7', tones: [[0.36, '8'], [0.74, '7'], [2, '9']], grain: [[0.03, '9']] })),
    'tile-snow': px(tileSnow),
    'tile-snow2': px(genTile({ seed: 299, scale: 5, base: '0', tones: [[0.48, '0'], [0.8, 'd'], [2, 'I']], grain: [[0.04, 'I'], [0.08, 'd']] })),
    'tile-snow3': px(genTile({ seed: 390, scale: 8, base: '0', tones: [[0.55, '0'], [0.85, 'd'], [2, 'I']], grain: [[0.02, 'I']] })),
    'cactus': px(cactus),
    'house': px(house),
    'heart': px(heartItem),
    'deco-grass': px(decoGrass),
    'deco-flowers': px(decoFlowers),
    'deco-flowers-y': px(decoFlowersY),
    'deco-reeds': px(decoReeds),
    'deco-mushroom': px(decoMushroom),
    'deco-pebbles': px(decoPebbles),
    'heart-full': px(heartFull),
    'heart-empty': px(heartEmpty),
    'sword': px(sword),
    'crystal': px(crystal),
    'tome': px(tome),
    'scroll': px(scroll),
    'dagger': px(dagger),
    'waraxe': px(waraxe),
    'greatsword': px(greatsword),
    'tree': px(tree),
    'chest': px(chest),
    'chest-open': px(chestOpen),
    'potion': px(potion),
    'coin': px(coin),
    'rock': px(rock),
    'bush': px(bush),
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { SPRITES };
  if (global) global.SPRITES = SPRITES;
})(typeof globalThis !== 'undefined' ? globalThis : null);
