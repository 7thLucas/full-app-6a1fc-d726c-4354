/**
 * Glimwood Level 1 — "Glimwood Glade"
 *
 * Level is a tile grid where each character is a tile type. The world is
 * rendered at base resolution (TILE_SIZE = 16 px per tile, scaled up by the
 * engine).
 *
 * Tile legend:
 *   .  empty / air
 *   #  solid ground tile (collidable)
 *   =  one-way platform (collidable from top only)
 *   ?  breakable / decorative pillar (collidable)
 *   c  coin spawn
 *   g  gem spawn
 *   e  enemy spawn (patrols on the row it's placed)
 *   P  player start
 *   C  checkpoint
 *   F  finish flag (level complete)
 *   s  sign post (decorative hint)
 *   H  hidden path marker (renders as a wall but is passable — secret!)
 *   T  tree decoration (front, no collision)
 */

export const TILE_SIZE = 16;

// Level grid: 24 rows tall, 120 columns wide.
// Visual reference: indices on the left are row numbers.
//   columns:        0         1         2         3         4         5         6         7         8         9        10        11
//                   0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890

export const LEVEL_ROWS: string[] = [
  // 0
  "........................................................................................................................",
  // 1
  "........................................................................................................................",
  // 2
  "........................................................................................................................",
  // 3
  ".......................c................................................c..............................................",
  // 4
  ".......................c.........................c............................c.......................................",
  // 5
  ".....................cccccc......................c.........................cccccc......................................",
  // 6
  "...........................................c.....c..............................................c.....................",
  // 7
  ".........s..........=====................cccccc..c..........................============........c.................F....",
  // 8
  "...........................................................................................................============",
  // 9
  ".................c.............c............................================.....g........................############",
  // 10
  "..............cccccc......c..ccccc.....c.................................................................cc...########",
  // 11
  "..........=======.....======.......======............c.....e..........============.......e.................c....######",
  // 12
  ".....c....................................c.................................................................cc...####",
  // 13
  "..ccccc.......g...e...........e.....g.........c.....c................e.................................cc............",
  // 14
  "P.....................================.........=====...===.=====................==========...............c............",
  // 15
  "##....c..c..c...c...c......c..........c..c...c.....c.....................e..............................cc.............",
  // 16
  "##..=======.======.======.======...===....=======.===.=====================...========================....##############",
  // 17
  "##.......c.....c..............c................c.................c.................................c......##############",
  // 18
  "##..s............................C.........................................C..........................T...##############",
  // 19
  "######....######....##########...##########.....######....################..############..#########..........############",
  // 20
  "##############......##########...##########.....######....################..############..#########..########.##########",
  // 21
  "########################........###############.######....################..############..#########..#####################",
  // 22
  "########################........###############.######....################..############..#########..#####################",
  // 23
  "########################........###############.######....################..############..#########..#####################",
];

// Hidden secret area: a passage to the upper-right that contains 1 gem.
// We embed it inside LEVEL_ROWS by marking certain "solid"-looking tiles with H.
// Implemented by post-processing below.

export interface LevelMeta {
  playerSpawn: { x: number; y: number };
  finish: { x: number; y: number };
  checkpoints: { x: number; y: number }[];
  signs: { x: number; y: number; text: string }[];
  coinSpawns: { x: number; y: number }[];
  gemSpawns: { x: number; y: number }[];
  enemySpawns: { x: number; y: number; rangeStart: number; rangeEnd: number }[];
  hiddenTiles: Set<string>; // "x,y" keys
  widthPx: number;
  heightPx: number;
  rows: string[];
}

const SIGN_TEXTS = ["Welcome to Glimwood!", "Try jumping while running."];

export function parseLevel(): LevelMeta {
  const rows = LEVEL_ROWS.map((r) => r.padEnd(120, "."));
  const meta: LevelMeta = {
    playerSpawn: { x: 16, y: 16 * 13 },
    finish: { x: 16 * 117, y: 16 * 6 },
    checkpoints: [],
    signs: [],
    coinSpawns: [],
    gemSpawns: [],
    enemySpawns: [],
    hiddenTiles: new Set(),
    widthPx: rows[0].length * TILE_SIZE,
    heightPx: rows.length * TILE_SIZE,
    rows,
  };

  let signIndex = 0;

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const worldX = x * TILE_SIZE;
      const worldY = y * TILE_SIZE;
      switch (ch) {
        case "P":
          meta.playerSpawn = { x: worldX, y: worldY };
          break;
        case "F":
          meta.finish = { x: worldX, y: worldY };
          break;
        case "C":
          meta.checkpoints.push({ x: worldX, y: worldY });
          break;
        case "s":
          meta.signs.push({
            x: worldX,
            y: worldY,
            text: SIGN_TEXTS[signIndex++] ?? "...",
          });
          break;
        case "c":
          meta.coinSpawns.push({ x: worldX + 4, y: worldY + 4 });
          break;
        case "g":
          meta.gemSpawns.push({ x: worldX + 2, y: worldY + 2 });
          break;
        case "e": {
          // patrol range = current tile +/- 3 tiles (constrained to solid floor)
          const rangeStart = Math.max(0, worldX - TILE_SIZE * 3);
          const rangeEnd = Math.min(meta.widthPx, worldX + TILE_SIZE * 3);
          meta.enemySpawns.push({
            x: worldX,
            y: worldY,
            rangeStart,
            rangeEnd,
          });
          break;
        }
        default:
          break;
      }
    }
  }

  // Mark a small hidden tunnel as a SECRET path. We pick a few tiles on the
  // upper-right "cliff" that look solid but are actually passable, leading to
  // a hidden gem. The hidden tiles are: top of column ~98 at rows 7-9.
  const hiddenCoords: [number, number][] = [
    [98, 7],
    [99, 7],
    [100, 7],
    [101, 7],
  ];
  hiddenCoords.forEach(([x, y]) => {
    meta.hiddenTiles.add(`${x},${y}`);
  });

  // Add a hidden gem inside the secret tunnel
  meta.gemSpawns.push({ x: 99 * TILE_SIZE + 2, y: 6 * TILE_SIZE + 2 });

  return meta;
}

/**
 * Return true if the tile at (col, row) is solid (collidable from all sides).
 */
export function isSolid(level: LevelMeta, col: number, row: number): boolean {
  if (col < 0 || row < 0 || row >= level.rows.length) return false;
  const r = level.rows[row];
  if (col >= r.length) return false;
  const ch = r[col];
  if (level.hiddenTiles.has(`${col},${row}`)) return false;
  return ch === "#" || ch === "?";
}

/**
 * Return true if the tile is a one-way platform (collidable from top only).
 */
export function isOneWay(level: LevelMeta, col: number, row: number): boolean {
  if (col < 0 || row < 0 || row >= level.rows.length) return false;
  const r = level.rows[row];
  if (col >= r.length) return false;
  return r[col] === "=";
}

export function tileAt(level: LevelMeta, col: number, row: number): string {
  if (col < 0 || row < 0 || row >= level.rows.length) return ".";
  const r = level.rows[row];
  if (col >= r.length) return ".";
  return r[col];
}
