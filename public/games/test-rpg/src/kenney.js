// Full re-skin layer. Slices several pixel-art spritesheets into named canvases
// that drop into the game's IMG table, so EVERY sprite uses pack art (no
// original SVG fallback). Sources, all 16px pixel art:
//   - Kenney "Roguelike" (base/char/dungeon/city) — terrain, foliage, objects,
//     player/villager/cultist, weapons. 16x16 tiles on a 17px stride.
//   - ExtendedMonster (mon1/2/3) — enemies. 16px, no gap (stride 16).
//   - Pixel Fantasy Icons (pf) — potions/scrolls/books/heart/plants. stride 16.
// Toggle with window.USE_KENNEY (default true).
(function (global) {
  const RL = 'assets/kenney-roguelike/2D assets/';
  // sheet key -> { src, stride }
  const SHEETS = {
    base: { src: RL + 'Roguelike Base Pack/Spritesheet/roguelikeSheet_transparent.png', stride: 17 },
    char: { src: RL + 'Roguelike Characters Pack/Spritesheet/roguelikeChar_transparent.png', stride: 17 },
    dung: { src: RL + 'Roguelike Dungeon Pack/Spritesheet/roguelikeDungeon_transparent.png', stride: 17 },
    mon1: { src: 'assets/reskin/mon1.png', stride: 16 },
    mon2: { src: 'assets/reskin/mon2.png', stride: 16 },
    mon3: { src: 'assets/reskin/mon3.png', stride: 16 },
    pf:   { src: 'assets/reskin/pf16.png', stride: 16 },
  };

  // name -> [sheet, col, row] or [sheet, col, row, opts]
  // opts: { w, h } multi-cell span; { rot } degrees CW; { grey } desaturate.
  const MAP = {
    // ── terrain ──
    'tile-grass': ['base',5,0], 'tile-grass2': ['base',5,1], 'tile-grass3': ['base',5,1], 'tile-grass4': ['base',5,0],
    'tile-water': ['base',0,0], 'tile-water2': ['base',0,1], 'tile-water3': ['base',0,3],
    'tile-path': ['base',6,4],
    'tile-sand': ['base',7,3], 'tile-sand2': ['base',8,3], 'tile-sand3': ['base',7,4],
    'tile-highland': ['base',5,4], 'tile-highland2': ['base',6,4], 'tile-highland3': ['base',7,4],
    'tile-mire': ['base',5,5], 'tile-mire2': ['base',6,5], 'tile-mire3': ['base',7,5],
    'tile-blight': ['base',7,0], 'tile-blight2': ['base',8,0], 'tile-blight3': ['base',7,0],
    'tile-snow': ['base',8,2], 'tile-snow2': ['base',7,2], 'tile-snow3': ['base',8,2],
    'tile-cave': ['base',6,2], 'tile-cave2': ['base',5,2], 'tile-cave3': ['base',7,1],
    'tile-cavewall': ['base',7,0], 'tile-cavewall2': ['base',8,0], 'tile-wall': ['base',7,0],

    // ── foliage / props ──
    'tree': ['base',13,10], 'bush': ['base',13,9],
    'cactus': ['base',21,9],
    'rock': ['dung',14,15],
    'house': ['base',10,0,{w:2,h:2}],          // assembled market-stall / hut
    'chest': ['base',15,7], 'chest-open': ['base',14,7],
    'cave-entrance': ['dung',24,5], 'cave-exit': ['dung',24,13],

    // ── characters (front-facing only; same sprite for all facings) ──
    'player-down': ['char',0,7], 'player-up': ['char',0,7], 'player-left': ['char',0,7], 'player-right': ['char',0,7],
    'villager': ['char',0,5], 'cultist': ['char',1,11],

    // ── enemies (ExtendedMonster) ──
    'slime': ['mon1',1,0], 'skeleton': ['mon1',2,1], 'bat': ['mon1',1,2], 'wisp': ['mon1',2,3],
    'scorpion': ['mon2',3,3], 'golem': ['mon3',2,1], 'wraith': ['mon2',3,2], 'wolf': ['mon3',2,2],

    // ── weapons (Kenney char sheet; rotated so the blade points right) ──
    'dagger': ['char',42,6,{rot:90}], 'sword': ['char',43,7,{rot:90}],
    'waraxe': ['char',44,5,{rot:90}], 'greatsword': ['char',44,8,{rot:90}],

    // ── items (Pixel Fantasy Icons + Kenney) ──
    'potion': ['pf',2,0], 'scroll': ['pf',14,0], 'tome': ['pf',12,0],
    'crystal': ['mon1',2,2], 'coin': ['base',12,4],
    'heart': ['pf',2,2], 'heart-full': ['pf',2,2], 'heart-empty': ['pf',2,2,{grey:true}],

    // ── ground-cover decals ──
    'deco-flowers': ['pf',8,0], 'deco-flowers-y': ['pf',7,0], 'deco-mushroom': ['pf',6,0],
    'deco-grass': ['base',24,10], 'deco-reeds': ['base',20,10], 'deco-pebbles': ['dung',12,16],
  };

  const SIZE = 16;

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('failed to load ' + src));
      img.src = encodeURI(src);
    });
  }

  function slice(sheet, stride, col, row, opts) {
    opts = opts || {};
    const w = opts.w || 1, h = opts.h || 1;
    let cv = document.createElement('canvas');
    cv.width = w * SIZE; cv.height = h * SIZE;
    let cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        cx.drawImage(sheet, (col + dc) * stride, (row + dr) * stride, SIZE, SIZE,
          dc * SIZE, dr * SIZE, SIZE, SIZE);
      }
    }
    if (opts.grey) {
      const d = cx.getImageData(0, 0, cv.width, cv.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const g = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 0.5; // darken too
        p[i] = p[i + 1] = p[i + 2] = g;
      }
      cx.putImageData(d, 0, 0);
    }
    if (opts.rot) {
      const r = document.createElement('canvas');
      r.width = cv.height; r.height = cv.width;
      const rx = r.getContext('2d');
      rx.imageSmoothingEnabled = false;
      rx.translate(r.width / 2, r.height / 2);
      rx.rotate(opts.rot * Math.PI / 180);
      rx.drawImage(cv, -cv.width / 2, -cv.height / 2);
      cv = r;
    }
    return cv;
  }

  async function build() {
    // load only the sheets actually referenced
    const used = new Set(Object.values(MAP).map(m => m[0]));
    const sheets = {};
    await Promise.all([...used].map(async k => { sheets[k] = await loadImage(SHEETS[k].src); }));
    const out = {};
    for (const [name, m] of Object.entries(MAP)) {
      const [k, col, row, opts] = m;
      out[name] = slice(sheets[k], SHEETS[k].stride, col, row, opts);
    }
    return out;
  }

  global.KENNEY = { build, MAP };
})(window);
