/**
 * Glimwood sprite atlas — programmatic pixel art.
 *
 * Every sprite is built by writing pixel data to a tiny offscreen canvas.
 * Each glyph is described as a string-array where each character is a color
 * lookup into a small palette. This keeps sprites version-controlled, hot-
 * swappable, and bundle-free (no PNG assets).
 */

type PaletteMap = Record<string, string>;

function paintGlyph(
  glyph: string[],
  palette: PaletteMap,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < glyph.length; y++) {
    const row = glyph[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function flipHorizontal(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

// ─── Hero (16x24) ──────────────────────────────────────────────────────────
// Palette:
//   . transparent
//   o outline / dark
//   s skin
//   h hair / hood (glim green)
//   t tunic mid
//   T tunic dark
//   b boots
//   w white sparkle / eye
//   g glow (light green)

const HERO_PALETTE_LIGHT: PaletteMap = {
  o: "#0a0d0c",
  s: "#ffd5a8",
  h: "#4ade80",
  t: "#22c55e",
  T: "#166534",
  b: "#3f2a14",
  w: "#ffffff",
  g: "#bbf7d0",
};

// Each glyph is 16 wide, 24 tall.
const HERO_IDLE_1 = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssssoo...",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTttthog..",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....osssso.....",
  ".....osssso.....",
  ".....obbbbo.....",
  "....obbbbbbo....",
  "....obbbbbbo....",
  "....oooooooo....",
  "................",
  "................",
];

const HERO_IDLE_2 = [
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssssoo...",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....osssso.....",
  ".....osssso.....",
  ".....obbbbo.....",
  "....obbbbbbo....",
  "....obbbbbbo....",
  "....oooooooo....",
  "................",
];

const HERO_RUN_1 = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssss.....",
  "....oTtTtTto....",
  "...ohtTtTtTho...",
  "...ohttTttth....",
  "....htttTttth...",
  "....ohtTtthoo...",
  ".....ohttho.....",
  ".....ossso......",
  ".....osssoo.....",
  ".....obbbbbo....",
  "....obbboboo....",
  "....obboo.......",
  "....oooo........",
  "................",
  "................",
];

const HERO_RUN_2 = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssssoo...",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....ossso......",
  "....oossso......",
  "....obbbbbo.....",
  "...obbbobboo....",
  "...oobo..obbo...",
  "...oo....oboo...",
  ".........oo.....",
  "................",
];

const HERO_RUN_3 = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssssoo...",
  "...ooTtTtTto....",
  "..ohhtTtTtTho...",
  "..ohhttTttth....",
  "...ohttTtttho...",
  "....ohtTttho....",
  ".....ohttho.....",
  ".....osssso.....",
  "....oossssoo....",
  "....obbbbbbo....",
  "...obboboobbo...",
  "..obboo..oobbo..",
  "..oboo....oboo..",
  "..oo......oo....",
  "................",
];

const HERO_JUMP = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "..oohsowoswhoo..",
  ".oosssssssssoo..",
  "oohossssssshhoo.",
  ".oohhTtTtTtho...",
  "..oghtTtTtTgo...",
  "...ohttTttth....",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  "....obssssbo....",
  "...obbbbbbbbo...",
  "...obbb..bbbo...",
  "...obb....bbo...",
  "...obb....bbo...",
  "...oo......oo...",
  "................",
  "................",
];

const HERO_FALL = [
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "....ossssssoo...",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....osssso.....",
  "....oossssoo....",
  "....obbbbbbo....",
  "...obbboobboo...",
  "..obbo....obbo..",
  "..ooo......oo...",
  "................",
  "................",
];

const HERO_LAND = [
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhggghho...",
  "...oghhhhhhgo...",
  "...oghsssshgo...",
  "...ohsowoswho...",
  "...osssssssso...",
  "...oossssssoo...",
  "...oTtTtTtTto...",
  "..ohtTtTtTtho...",
  "..ohttTtttth....",
  "..ohttTttttho...",
  "..ohtTttttho....",
  "..ohttttho......",
  "..ossssso.......",
  ".ossssssoo......",
  ".obbbbbbbbo.....",
  ".obbbboobbbo....",
  ".obbo....obbo...",
  ".oo......oo.....",
  "................",
];

const HERO_CELEBRATE_1 = [
  "...o............",
  "..oho...........",
  ".oghho..........",
  ".oggho.oooooo...",
  ".oghhoohhhhhho..",
  "..ohhohhhggghho.",
  "...oooghhhhhhgo.",
  "....oghsssshgo..",
  "....ohsowoswho..",
  "....osssssssso..",
  "....oossssssoo..",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....osssso.....",
  ".....osssso.....",
  "....obbbbbbo....",
  "....obbbobboo...",
  "....oboo.oboo...",
  "....oo...oo.....",
  "................",
];

const HERO_CELEBRATE_2 = [
  "................",
  "...o.......o....",
  "..oho.....oho...",
  ".oghho...oghho..",
  ".oggho...oggho..",
  ".oghhoo.oohhho..",
  "..ohhoohhhggho..",
  "...oooghhhhhgo..",
  "....oghsssshgo..",
  "....ohwowowoho..",
  "....osssssssso..",
  "....oossssssoo..",
  "....oTtTtTtoo...",
  "...ohtTtTtTho...",
  "...ohttTtttho...",
  "...ohttTtttho...",
  "....ohtTttho....",
  "....ohtttho.....",
  ".....osssso.....",
  ".....osssso.....",
  "....obbbbbbo....",
  "....obbbbbbo....",
  "....oooooooo....",
  "................",
];

// ─── Enemy: Spiky Mushroom (16x16) ──────────────────────────────────────────
// Palette:
//   . transparent
//   o outline
//   r red cap
//   R dark red cap
//   w white spots
//   s stem
//   S stem dark

const ENEMY_PALETTE: PaletteMap = {
  o: "#0a0a0f",
  r: "#ef4444",
  R: "#991b1b",
  w: "#fef3c7",
  s: "#fef9c3",
  S: "#a16207",
  e: "#0a0a0f", // eye
};

const ENEMY_1 = [
  "................",
  "....oooooo......",
  "...orrrrrroo....",
  "..orRrwrRrrroo..",
  ".orrrwrRrRrrro..",
  ".orrrwwwrRrrro..",
  ".orRrrrrrRrrro..",
  "..orrrwrrrwro...",
  "...oooooooooo...",
  "....osesssseo...",
  "....osseSeso....",
  "....osseSeso....",
  "....oosSssoo....",
  "....ooooooo.....",
  "................",
  "................",
];

const ENEMY_2 = [
  "................",
  "....oooooo......",
  "...orrrrrroo....",
  "..orRrwrRrrroo..",
  ".orrrwrRrRrrro..",
  ".orrrwwwrRrrro..",
  ".orRrrrrrRrrro..",
  "..orrrwrrrwro...",
  "...oooooooooo...",
  "....osseesseo...",
  "....osseSeso....",
  "....osssSsso....",
  "....oosSssoo....",
  "....ooooooo.....",
  "................",
  "................",
];

// ─── Coin (8x8, 4 frames rotating) ─────────────────────────────────────────
const COIN_PALETTE: PaletteMap = {
  o: "#92400e",
  g: "#fbbf24",
  G: "#fde68a",
  w: "#ffffff",
};

const COIN_1 = [
  "..oooo..",
  ".ogGGgo.",
  "ogGGGGgo",
  "oGGwGGgo",
  "ogGGGGgo",
  "ogGGGgGo",
  ".ogGgo..",
  "..oooo..",
];

const COIN_2 = [
  "..oo....",
  ".ogo....",
  "ogGo....",
  "ogGo....",
  "ogGo....",
  "ogGo....",
  ".ogo....",
  "..oo....",
];

const COIN_3 = [
  "..oo....",
  ".oo.....",
  "oo......",
  "oo......",
  "oo......",
  "oo......",
  ".oo.....",
  "..oo....",
];

const COIN_4 = [
  "..oo....",
  ".ogo....",
  "ogGo....",
  "ogGo....",
  "ogGo....",
  "ogGo....",
  ".ogo....",
  "..oo....",
];

// ─── Gem (12x12) ───────────────────────────────────────────────────────────
const GEM_PALETTE: PaletteMap = {
  o: "#083344",
  c: "#22d3ee",
  C: "#67e8f9",
  w: "#ffffff",
};

const GEM_1 = [
  "....oooo....",
  "...oCCCCo...",
  "..oCwCCCCo..",
  ".oCCCCCCCCo.",
  "oCCwCCCCCCco",
  "oCCCCCCCCCCo",
  ".oCCCCCCCCo.",
  "..oCCCCCCo..",
  "...oCCCCo...",
  "....oCCo....",
  ".....oo.....",
  "............",
];

const GEM_2 = [
  "....oooo....",
  "...oCCCCo...",
  "..oCCCCwCo..",
  ".oCCCCCCCCo.",
  "oCCCCCCwCCo",
  "oCCCCCCCCCCo",
  ".oCCCCCCCCo.",
  "..oCCCCCCo..",
  "...oCCCCo...",
  "....oCCo....",
  ".....oo.....",
  "............",
];

// ─── Checkpoint (16x32) — crystal pillar ───────────────────────────────────
const CHECKPOINT_PALETTE_INACTIVE: PaletteMap = {
  o: "#1f2937",
  c: "#475569",
  C: "#64748b",
  s: "#94a3b8",
};

const CHECKPOINT_PALETTE_ACTIVE: PaletteMap = {
  o: "#052e16",
  c: "#15803d",
  C: "#22c55e",
  s: "#bbf7d0",
  g: "#ffffff",
};

const CHECKPOINT_GLYPH = [
  "................",
  ".......oo.......",
  "......ocCo......",
  "......ocCo......",
  ".....ocsCco.....",
  ".....ocsCco.....",
  "....ocCsCCco....",
  "....ocCsCCco....",
  "...ocCCsCCCco...",
  "...ocCCsCCCco...",
  "....ocCsCCco....",
  "....ocCsCCco....",
  ".....ocsCco.....",
  ".....ocsCco.....",
  "......ocCo......",
  "......ocCo......",
  ".....ocsCco.....",
  ".....ocCCCo.....",
  "....ocCCCCCo....",
  "....ocCCCCCo....",
  "....ocCCCCCo....",
  ".....ocCCCo.....",
  "......ocCo......",
  "......ocCo......",
  ".....ocsCco.....",
  "....ocCCsCCo....",
  "...ocCCCsCCCo...",
  "...ocCCCsCCCo...",
  "....oocccoo.....",
  ".....oooo.......",
  "................",
  "................",
];

// ─── Sparkle particle (5x5) ────────────────────────────────────────────────
const SPARKLE_PALETTE: PaletteMap = {
  w: "#ffffff",
  g: "#fef3c7",
};

const SPARKLE = [
  "..w..",
  "..g..",
  "wgwgw",
  "..g..",
  "..w..",
];

// ─── Tile: grass-topped mossy stone (16x16) ────────────────────────────────
const TILE_PALETTE: PaletteMap = {
  G: "#4ade80",
  g: "#22c55e",
  d: "#166534",
  s: "#374151",
  S: "#1f2937",
  m: "#16352d",
  M: "#0a0a0f",
};

const TILE_GROUND = [
  "GgGgGgGgGgGgGgGg",
  "gGgGgGgGgGgGgGgG",
  "dgdgdgdgdgdgdgdg",
  "mmsmmsmmsmmsmmsm",
  "ssmssmssmssmssms",
  "mssmssmssmssmssm",
  "smsmsmsmsmsmsmsm",
  "msmsmsmsmsmsmsms",
  "SssSssSssSssSssS",
  "ssSssSssSssSssSs",
  "MssMssMssMssMssM",
  "ssMssMssMssMssMs",
  "MMSMMSMMSMMSMMSM",
  "SSMSSMSSMSSMSSMS",
  "MSMSMSMSMSMSMSMS",
  "SMSMSMSMSMSMSMSM",
];

const TILE_PLATFORM = [
  "GgGgGgGgGgGgGgGg",
  "gGgGgGgGgGgGgGgG",
  "dgdgdgdgdgdgdgdg",
  "mmsmmsmmsmmsmmsm",
  "ssmssmssmssmssms",
  "msmsmsmsmsmsmsms",
  "SssSssSssSssSssS",
  "ssSssSssSssSssSs",
  "MssMssMssMssMssM",
  "ssMssMssMssMssMs",
  "MMSMMSMMSMMSMMSM",
  "SSMSSMSSMSSMSSMS",
  "MSMSMSMSMSMSMSMS",
  "SMSMSMSMSMSMSMSM",
  "MSMSMSMSMSMSMSMS",
  "SMSMSMSMSMSMSMSM",
];

// ─── Sign (16x16) ──────────────────────────────────────────────────────────
const SIGN_PALETTE: PaletteMap = {
  o: "#0a0a0f",
  w: "#a16207",
  W: "#d97706",
  l: "#fef3c7",
  s: "#92400e",
};

const SIGN = [
  "................",
  ".oooooooooooo...",
  ".oWwWwWwWwWwo...",
  ".oWlllllllWo....",
  ".oWlWlWllWWo....",
  ".oWlllllllWo....",
  ".oWlWWlllWWo....",
  ".oWlllllllWo....",
  ".oWwWwWwWwWo....",
  ".oooosooooooo...",
  "....oso.........",
  "....oso.........",
  "....oso.........",
  "....oso.........",
  "....oso.........",
  "....ooo.........",
];

export interface SpriteAtlas {
  hero: {
    idle: HTMLCanvasElement[];
    run: HTMLCanvasElement[];
    jump: HTMLCanvasElement;
    fall: HTMLCanvasElement;
    land: HTMLCanvasElement;
    celebrate: HTMLCanvasElement[];
  };
  heroFlipped: {
    idle: HTMLCanvasElement[];
    run: HTMLCanvasElement[];
    jump: HTMLCanvasElement;
    fall: HTMLCanvasElement;
    land: HTMLCanvasElement;
    celebrate: HTMLCanvasElement[];
  };
  enemy: HTMLCanvasElement[];
  coin: HTMLCanvasElement[];
  gem: HTMLCanvasElement[];
  checkpointInactive: HTMLCanvasElement;
  checkpointActive: HTMLCanvasElement;
  sparkle: HTMLCanvasElement;
  tileGround: HTMLCanvasElement;
  tilePlatform: HTMLCanvasElement;
  sign: HTMLCanvasElement;
}

export interface SpriteThemeOverrides {
  heroPrimary?: string;
  groundColor?: string;
  coinColor?: string;
  gemColor?: string;
  enemyColor?: string;
}

export function buildSpriteAtlas(
  overrides: SpriteThemeOverrides = {},
): SpriteAtlas {
  const heroPalette: PaletteMap = {
    ...HERO_PALETTE_LIGHT,
    h: overrides.heroPrimary ?? HERO_PALETTE_LIGHT.h,
    t: overrides.heroPrimary ?? HERO_PALETTE_LIGHT.t,
  };

  const tilePalette: PaletteMap = { ...TILE_PALETTE };
  if (overrides.groundColor) {
    tilePalette.m = overrides.groundColor;
  }

  const coinPalette: PaletteMap = { ...COIN_PALETTE };
  if (overrides.coinColor) {
    coinPalette.g = overrides.coinColor;
  }

  const gemPalette: PaletteMap = { ...GEM_PALETTE };
  if (overrides.gemColor) {
    gemPalette.c = overrides.gemColor;
  }

  const enemyPalette: PaletteMap = { ...ENEMY_PALETTE };
  if (overrides.enemyColor) {
    enemyPalette.r = overrides.enemyColor;
  }

  const heroIdle = [HERO_IDLE_1, HERO_IDLE_2].map((g) =>
    paintGlyph(g, heroPalette, 16, 24),
  );
  const heroRun = [HERO_RUN_1, HERO_RUN_2, HERO_RUN_3, HERO_RUN_2].map((g) =>
    paintGlyph(g, heroPalette, 16, 24),
  );
  const heroJump = paintGlyph(HERO_JUMP, heroPalette, 16, 24);
  const heroFall = paintGlyph(HERO_FALL, heroPalette, 16, 24);
  const heroLand = paintGlyph(HERO_LAND, heroPalette, 16, 24);
  const heroCelebrate = [HERO_CELEBRATE_1, HERO_CELEBRATE_2].map((g) =>
    paintGlyph(g, heroPalette, 16, 24),
  );

  return {
    hero: {
      idle: heroIdle,
      run: heroRun,
      jump: heroJump,
      fall: heroFall,
      land: heroLand,
      celebrate: heroCelebrate,
    },
    heroFlipped: {
      idle: heroIdle.map(flipHorizontal),
      run: heroRun.map(flipHorizontal),
      jump: flipHorizontal(heroJump),
      fall: flipHorizontal(heroFall),
      land: flipHorizontal(heroLand),
      celebrate: heroCelebrate.map(flipHorizontal),
    },
    enemy: [ENEMY_1, ENEMY_2].map((g) => paintGlyph(g, enemyPalette, 16, 16)),
    coin: [COIN_1, COIN_2, COIN_3, COIN_4].map((g) =>
      paintGlyph(g, coinPalette, 8, 8),
    ),
    gem: [GEM_1, GEM_2].map((g) => paintGlyph(g, gemPalette, 12, 12)),
    checkpointInactive: paintGlyph(
      CHECKPOINT_GLYPH,
      CHECKPOINT_PALETTE_INACTIVE,
      16,
      32,
    ),
    checkpointActive: paintGlyph(
      CHECKPOINT_GLYPH,
      CHECKPOINT_PALETTE_ACTIVE,
      16,
      32,
    ),
    sparkle: paintGlyph(SPARKLE, SPARKLE_PALETTE, 5, 5),
    tileGround: paintGlyph(TILE_GROUND, tilePalette, 16, 16),
    tilePlatform: paintGlyph(TILE_PLATFORM, tilePalette, 16, 16),
    sign: paintGlyph(SIGN, SIGN_PALETTE, 16, 16),
  };
}
