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

  const tileGrass = [
    "eeEEeeeeeneeeeee",
    "eEjEeeeeenneeeEe",
    "eEEeeeeeenneeeEe",
    "eeeeeeEeeeeeeeje",
    "neeeeEEeeeeeeeee",
    "nneeeEeeeeeeEEee",
    "eeeeeeeeeeeejEEe",
    "eeeeneeeeeeeeeee",
    "jeeenneeeeEeeeee",
    "eeeennneeeEjeeee",
    "eeeeeeneeeEEeeen",
    "eEeeeeeeeeeeeenn",
    "eEEeeeeejeeeeeee",
    "eeeeennneeeeeEEe",
    "neeeennneeeeEjEe",
    "nneeeeeeeeeeeEEe",
  ];

  const tileWater = [
    "wwwwwwwwwwwwwwww",
    "wwWWwwwwwwwWWwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwWWwwwwwwwww",
    "WWwwwwwwwwwwWWww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwwWWwwwwwww",
    "wwWWwwwwwwwwwwxx",
    "wwwwwwwwwwwwwwww",
    "wwwwwWWwwwwwWWww",
    "wwwwwwwwwwwwwwww",
    "WWwwwwwwxxwwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwWWwwwwwwWWww",
    "wwwwwwwwwwwwwwww",
    "wwWWwwwwWWwwwwww",
  ];

  const tilePath = [
    "tttttttttttttttt",
    "ttsttttttTtttttts",
    "tttttttttttttttt",
    "Ttttsttttttttttt",
    "ttttttttsttttTtt",
    "tttttttttttttttt",
    "tsttttttttttsttt",
    "ttttttTttttttttt",
    "tttttttttttttttt",
    "ttttsttttTtttttt",
    "tttttttttttttttt",
    "tTttttttttsttttt",
    "ttttttsttttttTtt",
    "tttttttttttttttt",
    "stttttttTttttttt",
    "tttttttttttttttt",
  ];

  const tileWall = [
    "MMMMMMMMMMMMMMMM",
    "mmmmmmmmmmmmmmmm",
    "mmmmmmmDmmmmmmmm",
    "mmmmmmmDmmmmmmmm",
    "DDDDDDDDDDDDDDDD",
    "MMMMMMMMMMMMMMMM",
    "mmmDmmmmmmmmDmmm",
    "mmmDmmmmmmmmDmmm",
    "DDDDDDDDDDDDDDDD",
    "MMMMMMMMMMMMMMMM",
    "mmmmmmmDmmmmmmmm",
    "mmmmmmmDmmmmmmmm",
    "DDDDDDDDDDDDDDDD",
    "MMMMMMMMMMMMMMMM",
    "mmmDmmmmmmmmDmmm",
    "mmmDmmmmmmmmDmmm",
  ];

  const tileHighland = [
    "hhhhhhhhhhhhhhhh",
    "hhhmMmhhhhhhDhhh",
    "hhmMMmhhhhmMhhhh",
    "hhhmmhhhhmMMmhDh",
    "hThhDhhhhhmmhhhh",
    "hhhhhhhhmMmhhhhh",
    "hDhhhhhmMMmhhhTh",
    "hhhhhhhhmmhhhhhh",
    "hhhhhhhhhhhhhhhh",
    "hhmMmhhhhhhhDhhh",
    "hMMmhhhhhhhhhThh",
    "hmmhhhDhhmMmhhhh",
    "hhhhhhhhhmMMmhhh",
    "hThhhhhhhhmmhhhh",
    "hhhhhDhhhhhhhhDh",
    "hhhhhhhhhhhhhThh",
  ];

  const tileMire = [
    "qqQqqqqqqqqqQqqq",
    "qqqqqqwwqqqqqqqq",
    "qQqqqqWwqqqqqQqq",
    "qqqqqqqqqqqqqqqq",
    "qqwwqqqqqqQqqqqq",
    "qqWwqqqqqqqqwwqq",
    "qqqqqqQqqqqqWwqq",
    "qQqqqqqqqqqqqqqq",
    "qqqqqqwwqqQqqqqq",
    "qqQqqqWwqqqqqqqq",
    "qqqqqqqqqqqqqQqq",
    "qwwqqqqqQqqqqqqq",
    "qWwqqqqqqqqqwwqq",
    "qqqqqqQqqqqqWwqq",
    "qqQqqqqqqqqqqqqq",
    "qqqqqwwqqQqqqqqq",
  ];

  const tileBlight = [
    "zzZzzzzpzzzzzzkz",
    "zzzzzzzPzzzzzzzz",
    "zZzzzkzzzzzzzZzz",
    "zzzzzzzzzzpzzzzz",
    "zkzzzzZzzzPzzzzz",
    "zzzzzzzzzzzzzkzz",
    "zzzZzzpzzzzZzzzz",
    "zpPzzzzzzzzzzzzz",
    "zzzzzzzzzkzzzzZz",
    "zzkzzzZzzzpzzzzz",
    "zzzZzzzzzzPzzzzz",
    "zzzzzzzzzzzzzZzz",
    "zkzzzpzzzzzzzkzz",
    "zzzzzPzzzzzZzzzz",
    "zzZzzzzzkzzzzzzz",
    "zzzzzzzzzzzzZzpz",
  ];

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

  const tree = [
    "................",
    "......u..u......",
    ".....u.uu.u.....",
    "....u..uu..u....",
    "...nu.uuuu.un...",
    "..nnu.uuuu.unn..",
    "...n.uuuuuu.n...",
    ".....uuuuuu.....",
    ".....uUUUuu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    ".....uUuuUu.....",
    "....uuUuuUuu....",
    "...uu.uUUu.uu...",
    "..uu...uu...uu..",
    ".u.....uu.....u.",
    "...;;;;;;;;;;...",
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

  const SPRITES = {
    'player-down': px(playerDown),
    'player-up': px(playerUp),
    'player-left': px(playerLeft),
    'player-right': px(playerRight),
    'villager': px(villager),
    'slime': px(slime),
    'skeleton': px(skeleton),
    'bat': px(bat),
    'tile-grass': px(tileGrass),
    'tile-water': px(tileWater),
    'tile-path': px(tilePath),
    'tile-wall': px(tileWall),
    'tile-highland': px(tileHighland),
    'tile-mire': px(tileMire),
    'tile-blight': px(tileBlight),
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
    'tree': px(tree),
    'chest': px(chest),
    'potion': px(potion),
    'coin': px(coin),
    'rock': px(rock),
    'bush': px(bush),
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { SPRITES };
  if (global) global.SPRITES = SPRITES;
})(typeof globalThis !== 'undefined' ? globalThis : null);
