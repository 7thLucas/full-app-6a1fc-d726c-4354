/**
 * Glimwood Game Engine
 *
 * - Fixed-timestep update (60Hz logic) with variable rendering.
 * - Tight Mario-style physics: gravity, variable jump, coyote time, jump buffer.
 * - Tile-based collision with separate axis resolution to avoid sticky edges.
 * - Parallax backgrounds rendered procedurally.
 * - Particle system for sparkles, dust, leaves.
 * - Camera follows player with smooth lerp + level bounds clamping.
 */

import { buildSpriteAtlas, type SpriteAtlas, type SpriteThemeOverrides } from "./sprites";
import {
  parseLevel,
  isSolid,
  isOneWay,
  tileAt,
  TILE_SIZE,
  type LevelMeta,
} from "./level";
import { GlimwoodAudio } from "./audio";

// ─── Constants ────────────────────────────────────────────────────────────
const BASE_WIDTH = 320;
const BASE_HEIGHT = 180;
const GRAVITY = 0.45; // px per frame²
const MAX_FALL = 7;
const MOVE_ACCEL = 0.6;
const AIR_ACCEL = 0.35;
const MOVE_FRICTION = 0.78;
const AIR_FRICTION = 0.92;
const MAX_RUN_SPEED = 2.3;
const JUMP_VELOCITY = -7.4;
const JUMP_CUT_VELOCITY = -2.5;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER_FRAMES = 6;
const HERO_W = 10; // collision width (sprite is 16 wide but body is narrower)
const HERO_H = 22;
const HERO_OFFSET_X = 3; // sprite x offset from collision box
const HERO_OFFSET_Y = 2;

const ENEMY_W = 12;
const ENEMY_H = 12;
const ENEMY_SPEED = 0.5;

const COIN_W = 8;
const COIN_H = 8;
const GEM_W = 12;
const GEM_H = 12;

const CHECKPOINT_W = 14;
const CHECKPOINT_H = 30;

// Particle types
type ParticleKind = "sparkle" | "dust" | "leaf" | "coinBurst" | "gemBurst";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: ParticleKind;
  color?: string;
  size?: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

interface Gem {
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  rangeStart: number;
  rangeEnd: number;
  alive: boolean;
  squashTimer: number;
}

interface Checkpoint {
  x: number;
  y: number;
  active: boolean;
}

type GameState = "title" | "playing" | "win" | "dead";

export interface GameConfig {
  spriteTheme?: SpriteThemeOverrides;
  skyColor?: string;
  midBackgroundColor?: string;
  enableMusic?: boolean;
  enableSfx?: boolean;
  title?: string;
  tagline?: string;
  startPrompt?: string;
  controlsHint?: string;
  winMessage?: string;
  creditsText?: string;
}

export class GlimwoodEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private level!: LevelMeta;
  private atlas!: SpriteAtlas;
  private audio: GlimwoodAudio;
  private config: GameConfig = {};

  // Game state
  private state: GameState = "title";
  private titleAlpha = 1;

  // Hero
  private heroX = 0;
  private heroY = 0;
  private heroVx = 0;
  private heroVy = 0;
  private heroFacing: 1 | -1 = 1;
  private heroOnGround = false;
  private heroCoyote = 0;
  private heroJumpBuffer = 0;
  private heroJumpHeld = false;
  private heroAnimTimer = 0;
  private heroAnimFrame = 0;
  private heroLandTimer = 0;
  private heroState: "idle" | "run" | "jump" | "fall" | "land" | "celebrate" = "idle";
  private heroSquash = 0; // stretch on jump, squash on land
  private heroInvuln = 0;

  // Camera
  private cameraX = 0;
  private cameraY = 0;
  private cameraTargetX = 0;
  private cameraTargetY = 0;

  // Entities
  private coins: Coin[] = [];
  private gems: Gem[] = [];
  private enemies: Enemy[] = [];
  private checkpoints: Checkpoint[] = [];
  private particles: Particle[] = [];

  // Progress
  private coinsCollected = 0;
  private gemsCollected = 0;
  private totalCoins = 0;
  private totalGems = 0;
  private timeFrames = 0;
  private deaths = 0;
  private lastCheckpoint = { x: 0, y: 0 };
  private secretFound = false;

  // Input
  private keys = new Set<string>();
  private jumpJustPressed = false;
  private startJustPressed = false;
  private restartJustPressed = false;
  private muteJustPressed = false;
  private musicMuteJustPressed = false;
  private musicMuted = false;
  private sfxMuted = false;

  // Background stars
  private stars: { x: number; y: number; tw: number }[] = [];
  // Drifting leaves on title and ambient
  private ambientLeaves: { x: number; y: number; vx: number; vy: number; rot: number }[] = [];

  // Animation tick for ambient & enemy
  private globalTick = 0;

  private rafId: number | null = null;
  private lastFrameTime = 0;
  private accumulator = 0;
  private readonly STEP = 1000 / 60;

  // Bound listeners (for removal)
  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
  private boundResize = () => this.handleResize();

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    this.canvas = canvas;
    this.config = config;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot acquire 2D context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.offscreen = document.createElement("canvas");
    this.offscreen.width = BASE_WIDTH;
    this.offscreen.height = BASE_HEIGHT;
    const offCtx = this.offscreen.getContext("2d");
    if (!offCtx) throw new Error("Cannot acquire offscreen context");
    this.offCtx = offCtx;
    this.offCtx.imageSmoothingEnabled = false;

    this.audio = new GlimwoodAudio();
    this.musicMuted = config.enableMusic === false;
    this.sfxMuted = config.enableSfx === false;
    this.audio.setMusicEnabled(!this.musicMuted);
    this.audio.setSfxEnabled(!this.sfxMuted);
  }

  /** Initialize game data & start the loop. */
  start() {
    this.atlas = buildSpriteAtlas(this.config.spriteTheme);
    this.level = parseLevel();
    this.resetWorld();
    this.handleResize();
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("resize", this.boundResize);

    // Initialize ambient stars
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * (BASE_HEIGHT * 0.6),
        tw: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.ambientLeaves.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        vx: -0.3 - Math.random() * 0.4,
        vy: 0.2 + Math.random() * 0.4,
        rot: Math.random() * Math.PI * 2,
      });
    }

    this.lastFrameTime = performance.now();
    this.loop();
  }

  /** Tear down listeners and stop the loop. */
  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("resize", this.boundResize);
    this.audio.dispose();
  }

  /** Apply new config (e.g. when ConfigurablesProvider updates). */
  applyConfig(config: GameConfig) {
    this.config = config;
    if (this.atlas) {
      this.atlas = buildSpriteAtlas(config.spriteTheme);
    }
    this.musicMuted = config.enableMusic === false;
    this.sfxMuted = config.enableSfx === false;
    this.audio.setMusicEnabled(!this.musicMuted);
    this.audio.setSfxEnabled(!this.sfxMuted);
  }

  // ─── Input ────────────────────────────────────────────────────────────
  private handleKeyDown(e: KeyboardEvent) {
    // Prevent scrolling on arrow keys / space
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"].includes(
        e.key,
      )
    ) {
      e.preventDefault();
    }

    const k = e.key.toLowerCase();
    if (!this.keys.has(k)) {
      // Just pressed (edge trigger)
      if (k === " " || k === "spacebar" || k === "z" || k === "w" || k === "arrowup") {
        this.jumpJustPressed = true;
        this.heroJumpHeld = true;
      }
      if (k === "r") {
        this.restartJustPressed = true;
      }
      if (k === "m") {
        this.muteJustPressed = true;
      }
      if (k === "n") {
        this.musicMuteJustPressed = true;
      }
      if (this.state === "title" || this.state === "win") {
        if (k === " " || k === "enter") {
          this.startJustPressed = true;
        }
      }
    }
    this.keys.add(k);
  }

  private handleKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === " " || k === "spacebar" || k === "z" || k === "w" || k === "arrowup") {
      this.heroJumpHeld = false;
    }
  }

  private isHeld(...names: string[]) {
    return names.some((n) => this.keys.has(n));
  }

  // ─── Lifecycle / loop ─────────────────────────────────────────────────
  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    if (delta > 100) delta = 100;
    this.accumulator += delta;
    while (this.accumulator >= this.STEP) {
      this.update();
      this.accumulator -= this.STEP;
    }
    this.render();
  };

  // ─── Reset / spawn ────────────────────────────────────────────────────
  private resetWorld() {
    this.coins = this.level.coinSpawns.map((p) => ({
      x: p.x,
      y: p.y,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    }));
    this.gems = this.level.gemSpawns.map((p) => ({
      x: p.x,
      y: p.y,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    }));
    this.enemies = this.level.enemySpawns.map((p) => ({
      x: p.x + 2,
      y: p.y + 4,
      vx: -ENEMY_SPEED,
      rangeStart: p.rangeStart,
      rangeEnd: p.rangeEnd,
      alive: true,
      squashTimer: 0,
    }));
    this.checkpoints = this.level.checkpoints.map((p) => ({
      x: p.x,
      y: p.y - TILE_SIZE,
      active: false,
    }));
    this.coinsCollected = 0;
    this.gemsCollected = 0;
    this.totalCoins = this.coins.length;
    this.totalGems = this.gems.length;
    this.particles = [];
    this.timeFrames = 0;
    this.deaths = 0;
    this.secretFound = false;
    this.heroX = this.level.playerSpawn.x;
    this.heroY = this.level.playerSpawn.y;
    this.heroVx = 0;
    this.heroVy = 0;
    this.heroFacing = 1;
    this.heroState = "idle";
    this.heroAnimFrame = 0;
    this.heroAnimTimer = 0;
    this.heroLandTimer = 0;
    this.heroInvuln = 0;
    this.lastCheckpoint = { x: this.heroX, y: this.heroY };
    this.cameraTargetX = this.heroX - BASE_WIDTH / 2;
    this.cameraTargetY = this.heroY - BASE_HEIGHT / 2;
    this.cameraX = this.cameraTargetX;
    this.cameraY = this.cameraTargetY;
  }

  private respawnAtCheckpoint() {
    this.heroX = this.lastCheckpoint.x;
    this.heroY = this.lastCheckpoint.y;
    this.heroVx = 0;
    this.heroVy = 0;
    this.heroState = "idle";
    this.heroInvuln = 60;
  }

  // ─── Update ───────────────────────────────────────────────────────────
  private update() {
    this.globalTick++;

    if (this.muteJustPressed) {
      this.muteJustPressed = false;
      this.sfxMuted = !this.sfxMuted;
      this.audio.setSfxEnabled(!this.sfxMuted);
    }
    if (this.musicMuteJustPressed) {
      this.musicMuteJustPressed = false;
      this.musicMuted = !this.musicMuted;
      this.audio.setMusicEnabled(!this.musicMuted);
    }

    // Ambient leaves drift across the screen continuously.
    for (const leaf of this.ambientLeaves) {
      leaf.x += leaf.vx;
      leaf.y += leaf.vy;
      leaf.rot += 0.02;
      if (leaf.x < -10) {
        leaf.x = BASE_WIDTH + 10;
        leaf.y = Math.random() * BASE_HEIGHT * 0.6;
      }
      if (leaf.y > BASE_HEIGHT + 10) {
        leaf.y = -10;
        leaf.x = Math.random() * BASE_WIDTH;
      }
    }
    // Twinkle stars
    for (const s of this.stars) {
      s.tw += 0.04;
    }

    if (this.state === "title") {
      if (this.startJustPressed) {
        this.startJustPressed = false;
        this.audio.ensureStarted();
        if (!this.musicMuted) this.audio.startMusic();
        this.state = "playing";
        this.titleAlpha = 0;
      }
      this.jumpJustPressed = false;
      return;
    }

    if (this.state === "win") {
      if (this.startJustPressed || this.restartJustPressed) {
        this.startJustPressed = false;
        this.restartJustPressed = false;
        this.resetWorld();
        this.state = "playing";
        this.audio.ensureStarted();
        if (!this.musicMuted) this.audio.startMusic();
      }
      this.jumpJustPressed = false;

      // Continue ambient particle effects
      this.updateParticles();
      return;
    }

    if (this.state === "playing") {
      this.timeFrames++;

      if (this.restartJustPressed) {
        this.restartJustPressed = false;
        this.respawnAtCheckpoint();
      }

      this.updateHero();
      this.updateEnemies();
      this.updateCoinsAndGems();
      this.updateCheckpoints();
      this.updateCamera();
      this.checkFinish();
      this.checkOutOfBounds();
      this.updateParticles();
    }

    this.jumpJustPressed = false;
  }

  private updateHero() {
    if (this.heroInvuln > 0) this.heroInvuln--;

    // Horizontal input
    const left = this.isHeld("arrowleft", "a");
    const right = this.isHeld("arrowright", "d");

    const accel = this.heroOnGround ? MOVE_ACCEL : AIR_ACCEL;
    const friction = this.heroOnGround ? MOVE_FRICTION : AIR_FRICTION;

    if (left && !right) {
      this.heroVx -= accel;
      this.heroFacing = -1;
    } else if (right && !left) {
      this.heroVx += accel;
      this.heroFacing = 1;
    } else {
      this.heroVx *= friction;
      if (Math.abs(this.heroVx) < 0.05) this.heroVx = 0;
    }
    this.heroVx = Math.max(-MAX_RUN_SPEED, Math.min(MAX_RUN_SPEED, this.heroVx));

    // Jump buffering & coyote
    if (this.jumpJustPressed) {
      this.heroJumpBuffer = JUMP_BUFFER_FRAMES;
    }
    if (this.heroJumpBuffer > 0) this.heroJumpBuffer--;
    if (this.heroOnGround) {
      this.heroCoyote = COYOTE_FRAMES;
    } else if (this.heroCoyote > 0) {
      this.heroCoyote--;
    }

    // Trigger jump
    if (this.heroJumpBuffer > 0 && this.heroCoyote > 0) {
      this.heroVy = JUMP_VELOCITY;
      this.heroJumpBuffer = 0;
      this.heroCoyote = 0;
      this.heroOnGround = false;
      this.heroSquash = -2; // stretch
      this.audio.jump();
    }

    // Variable jump cut
    if (!this.heroJumpHeld && this.heroVy < JUMP_CUT_VELOCITY) {
      this.heroVy = JUMP_CUT_VELOCITY;
    }

    // Gravity
    this.heroVy += GRAVITY;
    if (this.heroVy > MAX_FALL) this.heroVy = MAX_FALL;

    // Move & collide (X axis first, then Y)
    const wasOnGround = this.heroOnGround;
    this.moveHero();

    // Landing detection (squash)
    if (!wasOnGround && this.heroOnGround) {
      this.heroSquash = 3; // squash
      this.heroLandTimer = 6;
      this.audio.land();
      // Dust particles
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: this.heroX + HERO_W / 2,
          y: this.heroY + HERO_H,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 0.5,
          life: 18,
          maxLife: 18,
          kind: "dust",
        });
      }
    }
    if (this.heroLandTimer > 0) this.heroLandTimer--;

    // Squash decay
    if (this.heroSquash > 0) this.heroSquash -= 0.5;
    else if (this.heroSquash < 0) this.heroSquash += 0.5;

    // Determine animation state
    if (!this.heroOnGround) {
      this.heroState = this.heroVy < 0 ? "jump" : "fall";
    } else if (this.heroLandTimer > 0) {
      this.heroState = "land";
    } else if (Math.abs(this.heroVx) > 0.3) {
      this.heroState = "run";
    } else {
      this.heroState = "idle";
    }

    // Advance animation
    this.heroAnimTimer++;
    const animSpeed =
      this.heroState === "run" ? 5 : this.heroState === "idle" ? 24 : 99;
    if (this.heroAnimTimer >= animSpeed) {
      this.heroAnimTimer = 0;
      this.heroAnimFrame++;
    }
  }

  /** Axis-separated tile collision. */
  private moveHero() {
    // X axis
    this.heroX += this.heroVx;
    this.collideHero("x");

    // Y axis
    this.heroY += this.heroVy;
    this.heroOnGround = false;
    this.collideHero("y");
  }

  private collideHero(axis: "x" | "y") {
    const x0 = Math.floor(this.heroX / TILE_SIZE);
    const x1 = Math.floor((this.heroX + HERO_W - 1) / TILE_SIZE);
    const y0 = Math.floor(this.heroY / TILE_SIZE);
    const y1 = Math.floor((this.heroY + HERO_H - 1) / TILE_SIZE);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(this.level, tx, ty)) {
          if (axis === "x") {
            if (this.heroVx > 0) {
              this.heroX = tx * TILE_SIZE - HERO_W;
            } else if (this.heroVx < 0) {
              this.heroX = (tx + 1) * TILE_SIZE;
            }
            this.heroVx = 0;
          } else {
            if (this.heroVy > 0) {
              this.heroY = ty * TILE_SIZE - HERO_H;
              this.heroVy = 0;
              this.heroOnGround = true;
            } else if (this.heroVy < 0) {
              this.heroY = (ty + 1) * TILE_SIZE;
              this.heroVy = 0;
            }
          }
        } else if (axis === "y" && this.heroVy >= 0 && isOneWay(this.level, tx, ty)) {
          // One-way platform: only collide if hero's feet were above this tile
          // last frame (i.e. previous y + HERO_H <= ty*TILE_SIZE).
          const prevFootY = this.heroY - this.heroVy + HERO_H;
          if (prevFootY <= ty * TILE_SIZE + 0.5) {
            this.heroY = ty * TILE_SIZE - HERO_H;
            this.heroVy = 0;
            this.heroOnGround = true;
          }
        }
      }
    }
  }

  private updateEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        enemy.squashTimer--;
        continue;
      }

      enemy.x += enemy.vx;
      if (enemy.x < enemy.rangeStart) {
        enemy.x = enemy.rangeStart;
        enemy.vx = ENEMY_SPEED;
      } else if (enemy.x + ENEMY_W > enemy.rangeEnd) {
        enemy.x = enemy.rangeEnd - ENEMY_W;
        enemy.vx = -ENEMY_SPEED;
      }

      // Edge detection: if next floor tile is missing, reverse
      const lookAheadX = enemy.vx > 0 ? enemy.x + ENEMY_W + 1 : enemy.x - 1;
      const floorTileX = Math.floor(lookAheadX / TILE_SIZE);
      const floorTileY = Math.floor((enemy.y + ENEMY_H + 1) / TILE_SIZE);
      if (!isSolid(this.level, floorTileX, floorTileY) && !isOneWay(this.level, floorTileX, floorTileY)) {
        enemy.vx = -enemy.vx;
      }

      // Collide with hero
      if (
        this.heroInvuln === 0 &&
        this.heroX < enemy.x + ENEMY_W &&
        this.heroX + HERO_W > enemy.x &&
        this.heroY < enemy.y + ENEMY_H &&
        this.heroY + HERO_H > enemy.y
      ) {
        // Stomp if falling
        if (this.heroVy > 1) {
          enemy.alive = false;
          enemy.squashTimer = 18;
          this.heroVy = JUMP_VELOCITY * 0.7;
          this.audio.enemyDefeat();
          // Sparkle burst
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: enemy.x + ENEMY_W / 2,
              y: enemy.y + ENEMY_H / 2,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2,
              life: 24,
              maxLife: 24,
              kind: "sparkle",
              color: "#ffffff",
            });
          }
        } else {
          this.hurtHero();
        }
      }
    }
  }

  private updateCoinsAndGems() {
    for (const coin of this.coins) {
      if (coin.collected) continue;
      coin.bobOffset += 0.05;
      if (
        this.heroX < coin.x + COIN_W &&
        this.heroX + HERO_W > coin.x &&
        this.heroY < coin.y + COIN_H &&
        this.heroY + HERO_H > coin.y
      ) {
        coin.collected = true;
        this.coinsCollected++;
        this.audio.coin();
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: coin.x + COIN_W / 2,
            y: coin.y + COIN_H / 2,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -Math.random() * 2 - 0.5,
            life: 20,
            maxLife: 20,
            kind: "coinBurst",
            color: this.config.spriteTheme?.coinColor ?? "#fbbf24",
          });
        }
      }
    }

    for (const gem of this.gems) {
      if (gem.collected) continue;
      gem.bobOffset += 0.04;
      if (
        this.heroX < gem.x + GEM_W &&
        this.heroX + HERO_W > gem.x &&
        this.heroY < gem.y + GEM_H &&
        this.heroY + HERO_H > gem.y
      ) {
        gem.collected = true;
        this.gemsCollected++;
        this.audio.gem();
        // Check if this is the secret gem (in the hidden tunnel area)
        if (gem.x > 95 * TILE_SIZE && gem.y < 8 * TILE_SIZE) {
          this.secretFound = true;
        }
        for (let i = 0; i < 12; i++) {
          this.particles.push({
            x: gem.x + GEM_W / 2,
            y: gem.y + GEM_H / 2,
            vx: (Math.random() - 0.5) * 3.5,
            vy: -Math.random() * 2.5 - 0.5,
            life: 30,
            maxLife: 30,
            kind: "gemBurst",
            color: this.config.spriteTheme?.gemColor ?? "#22d3ee",
          });
        }
      }
    }
  }

  private updateCheckpoints() {
    for (const cp of this.checkpoints) {
      if (cp.active) continue;
      if (
        this.heroX < cp.x + CHECKPOINT_W &&
        this.heroX + HERO_W > cp.x &&
        this.heroY < cp.y + CHECKPOINT_H &&
        this.heroY + HERO_H > cp.y
      ) {
        cp.active = true;
        this.lastCheckpoint = { x: cp.x, y: cp.y - 4 };
        this.audio.checkpoint();
        for (let i = 0; i < 14; i++) {
          this.particles.push({
            x: cp.x + CHECKPOINT_W / 2,
            y: cp.y + 4,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            life: 36,
            maxLife: 36,
            kind: "sparkle",
            color: "#bbf7d0",
          });
        }
      }
    }
  }

  private updateCamera() {
    this.cameraTargetX = this.heroX - BASE_WIDTH / 2;
    this.cameraTargetY = this.heroY - BASE_HEIGHT / 2 - 10;
    this.cameraX += (this.cameraTargetX - this.cameraX) * 0.12;
    this.cameraY += (this.cameraTargetY - this.cameraY) * 0.1;

    // Clamp to level bounds
    this.cameraX = Math.max(
      0,
      Math.min(this.level.widthPx - BASE_WIDTH, this.cameraX),
    );
    this.cameraY = Math.max(
      0,
      Math.min(this.level.heightPx - BASE_HEIGHT, this.cameraY),
    );
  }

  private checkFinish() {
    if (
      this.heroX < this.level.finish.x + TILE_SIZE * 2 &&
      this.heroX + HERO_W > this.level.finish.x &&
      this.heroY < this.level.finish.y + TILE_SIZE * 4 &&
      this.heroY + HERO_H > this.level.finish.y
    ) {
      this.state = "win";
      this.heroState = "celebrate";
      this.heroVx = 0;
      this.heroAnimFrame = 0;
      this.heroAnimTimer = 0;
      this.audio.win();
      this.audio.stopMusic();
      // Celebration sparkles
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: this.heroX + HERO_W / 2 + (Math.random() - 0.5) * 30,
          y: this.heroY + HERO_H / 2 + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3,
          life: 60,
          maxLife: 60,
          kind: "sparkle",
          color: Math.random() < 0.5 ? "#fbbf24" : "#bbf7d0",
        });
      }
    }
  }

  private checkOutOfBounds() {
    if (this.heroY > this.level.heightPx + 50) {
      this.hurtHero();
    }
  }

  private hurtHero() {
    if (this.heroInvuln > 0) return;
    this.audio.hurt();
    this.deaths++;
    this.respawnAtCheckpoint();
    // Particles
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: this.heroX + HERO_W / 2,
        y: this.heroY + HERO_H / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 24,
        maxLife: 24,
        kind: "sparkle",
        color: "#fca5a5",
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === "dust") {
        p.vy += 0.02;
      } else if (p.kind === "leaf") {
        p.vy += 0.005;
        p.vx += Math.sin(p.life * 0.1) * 0.05;
      } else {
        p.vy += 0.12;
      }
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  private render() {
    const ctx = this.offCtx;
    ctx.imageSmoothingEnabled = false;

    this.renderSkyAndStars(ctx);
    this.renderParallaxFar(ctx);
    this.renderParallaxMid(ctx);
    this.renderLevel(ctx);
    this.renderGems(ctx);
    this.renderCoins(ctx);
    this.renderCheckpoints(ctx);
    this.renderEnemies(ctx);
    this.renderFinishFlag(ctx);
    this.renderSignsAndDecor(ctx);
    this.renderHero(ctx);
    this.renderParticles(ctx);
    this.renderForegroundLeaves(ctx);
    this.renderHUD(ctx);

    if (this.state === "title") this.renderTitle(ctx);
    if (this.state === "win") this.renderWin(ctx);

    // Blit offscreen to main canvas at integer scale
    this.blitToCanvas();
  }

  private renderSkyAndStars(ctx: CanvasRenderingContext2D) {
    const skyTop = this.config.skyColor ?? "#1a1432";
    const skyMid = this.config.midBackgroundColor ?? "#3b2a5c";
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(0.6, skyMid);
    grad.addColorStop(1, "#1f1042");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Stars (parallax 0.1x)
    const offsetX = (this.cameraX * 0.1) % BASE_WIDTH;
    for (const s of this.stars) {
      const alpha = 0.5 + Math.sin(s.tw) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      let x = s.x - offsetX;
      if (x < 0) x += BASE_WIDTH;
      ctx.fillRect(Math.floor(x), Math.floor(s.y), 1, 1);
    }

    // Moon
    const moonX = BASE_WIDTH - 40 - (this.cameraX * 0.05) % 20;
    const moonY = 24;
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b2a5c";
    ctx.beginPath();
    ctx.arc(moonX + 3, moonY - 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderParallaxFar(ctx: CanvasRenderingContext2D) {
    // Silhouetted distant tree line in deep purple.
    const scrollX = this.cameraX * 0.3;
    const baseY = BASE_HEIGHT - 70;
    ctx.fillStyle = "#2a1f4a";
    for (let i = -1; i < 12; i++) {
      const x = i * 40 - (scrollX % 40);
      // Triangle tree silhouette
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 12, baseY - 30);
      ctx.lineTo(x + 24, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 20, baseY);
      ctx.lineTo(x + 32, baseY - 38);
      ctx.lineTo(x + 44, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderParallaxMid(ctx: CanvasRenderingContext2D) {
    // Mid tree band — slightly greener, larger.
    const scrollX = this.cameraX * 0.6;
    const baseY = BASE_HEIGHT - 45;
    ctx.fillStyle = "#1e4036";
    for (let i = -1; i < 16; i++) {
      const x = i * 32 - (scrollX % 32);
      // Cluster of mid trees
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 8, baseY - 38);
      ctx.lineTo(x + 16, baseY);
      ctx.closePath();
      ctx.fill();
    }
    // Mushrooms along mid line
    ctx.fillStyle = "#7c2d12";
    for (let i = -1; i < 12; i++) {
      const x = i * 44 - (scrollX % 44) + 18;
      ctx.fillRect(x, baseY - 5, 6, 5);
      ctx.beginPath();
      ctx.arc(x + 3, baseY - 6, 4, 0, Math.PI, true);
      ctx.fill();
    }
  }

  private renderLevel(ctx: CanvasRenderingContext2D) {
    const startCol = Math.max(0, Math.floor(this.cameraX / TILE_SIZE) - 1);
    const endCol = Math.min(
      this.level.rows[0].length - 1,
      Math.ceil((this.cameraX + BASE_WIDTH) / TILE_SIZE) + 1,
    );
    const startRow = Math.max(0, Math.floor(this.cameraY / TILE_SIZE) - 1);
    const endRow = Math.min(
      this.level.rows.length - 1,
      Math.ceil((this.cameraY + BASE_HEIGHT) / TILE_SIZE) + 1,
    );

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const t = tileAt(this.level, c, r);
        const sx = Math.floor(c * TILE_SIZE - this.cameraX);
        const sy = Math.floor(r * TILE_SIZE - this.cameraY);
        if (t === "#") {
          // Hide if hidden tile (secret passage shouldn't render solid)
          if (this.level.hiddenTiles.has(`${c},${r}`)) continue;
          ctx.drawImage(this.atlas.tileGround, sx, sy);
        } else if (t === "=") {
          // One-way: render top half only
          ctx.drawImage(
            this.atlas.tilePlatform,
            0,
            0,
            TILE_SIZE,
            6,
            sx,
            sy,
            TILE_SIZE,
            6,
          );
        }
      }
    }
  }

  private renderCoins(ctx: CanvasRenderingContext2D) {
    const frameIdx = Math.floor(this.globalTick / 6) % this.atlas.coin.length;
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const bob = Math.sin(coin.bobOffset) * 1.2;
      const sx = Math.floor(coin.x - this.cameraX);
      const sy = Math.floor(coin.y - this.cameraY + bob);
      ctx.drawImage(this.atlas.coin[frameIdx], sx, sy);
    }
  }

  private renderGems(ctx: CanvasRenderingContext2D) {
    const frameIdx = Math.floor(this.globalTick / 14) % this.atlas.gem.length;
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const bob = Math.sin(gem.bobOffset) * 1.4;
      const sx = Math.floor(gem.x - this.cameraX);
      const sy = Math.floor(gem.y - this.cameraY + bob);
      // Subtle glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = this.config.spriteTheme?.gemColor ?? "#22d3ee";
      ctx.beginPath();
      ctx.arc(sx + 6, sy + 6, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.drawImage(this.atlas.gem[frameIdx], sx, sy);
    }
  }

  private renderCheckpoints(ctx: CanvasRenderingContext2D) {
    for (const cp of this.checkpoints) {
      const sx = Math.floor(cp.x - this.cameraX);
      const sy = Math.floor(cp.y - this.cameraY);
      const img = cp.active ? this.atlas.checkpointActive : this.atlas.checkpointInactive;
      if (cp.active) {
        // pulse glow
        const pulse = 0.4 + Math.sin(this.globalTick * 0.15) * 0.2;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(sx + 8, sy + 16, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(img, sx, sy);
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    const frameIdx = Math.floor(this.globalTick / 10) % this.atlas.enemy.length;
    for (const enemy of this.enemies) {
      const sx = Math.floor(enemy.x - 2 - this.cameraX);
      const sy = Math.floor(enemy.y - 4 - this.cameraY);
      if (!enemy.alive) {
        if (enemy.squashTimer > 0) {
          ctx.save();
          ctx.translate(sx + 8, sy + 14);
          ctx.scale(1.2, 0.3);
          ctx.drawImage(this.atlas.enemy[0], -8, -8);
          ctx.restore();
        }
        continue;
      }
      ctx.drawImage(this.atlas.enemy[frameIdx], sx, sy);
    }
  }

  private renderFinishFlag(ctx: CanvasRenderingContext2D) {
    const sx = Math.floor(this.level.finish.x - this.cameraX);
    const sy = Math.floor(this.level.finish.y - this.cameraY);
    // Pole
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(sx + 6, sy - 32, 2, 64);
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(sx + 5, sy - 33, 4, 2);
    // Animated flag
    const wave = Math.sin(this.globalTick * 0.15) * 2;
    ctx.fillStyle = this.config.spriteTheme?.heroPrimary ?? "#4ade80";
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy - 30);
    ctx.lineTo(sx + 22 + wave, sy - 24);
    ctx.lineTo(sx + 8, sy - 18);
    ctx.closePath();
    ctx.fill();
    // Star on flag
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(sx + 13, sy - 25, 2, 2);
  }

  private renderSignsAndDecor(ctx: CanvasRenderingContext2D) {
    for (const sign of this.level.signs) {
      const sx = Math.floor(sign.x - this.cameraX);
      const sy = Math.floor(sign.y - this.cameraY);
      ctx.drawImage(this.atlas.sign, sx, sy);
      // Floating hint text above sign if hero is nearby
      const dist = Math.abs(this.heroX - sign.x);
      if (dist < 60) {
        const alpha = 1 - dist / 60;
        ctx.globalAlpha = alpha;
        this.drawPixelText(ctx, sign.text, sx - 30, sy - 12, "#fef3c7");
        ctx.globalAlpha = 1;
      }
    }
  }

  private renderHero(ctx: CanvasRenderingContext2D) {
    let frame: HTMLCanvasElement;
    const atlas = this.heroFacing >= 0 ? this.atlas.hero : this.atlas.heroFlipped;

    if (this.heroState === "idle") {
      frame = atlas.idle[this.heroAnimFrame % atlas.idle.length];
    } else if (this.heroState === "run") {
      frame = atlas.run[this.heroAnimFrame % atlas.run.length];
    } else if (this.heroState === "jump") {
      frame = atlas.jump;
    } else if (this.heroState === "fall") {
      frame = atlas.fall;
    } else if (this.heroState === "land") {
      frame = atlas.land;
    } else {
      frame = atlas.celebrate[Math.floor(this.globalTick / 8) % atlas.celebrate.length];
    }

    const sx = Math.floor(this.heroX - HERO_OFFSET_X - this.cameraX);
    const sy = Math.floor(this.heroY - HERO_OFFSET_Y - this.cameraY);

    // Flash if invulnerable
    if (this.heroInvuln > 0 && this.heroInvuln % 6 < 3) return;

    // Apply squash/stretch transform
    if (Math.abs(this.heroSquash) > 0.2) {
      ctx.save();
      const cx = sx + 8;
      const cy = sy + 24;
      const sxScale = 1 + this.heroSquash * 0.05;
      const syScale = 1 - this.heroSquash * 0.05;
      ctx.translate(cx, cy);
      ctx.scale(sxScale, syScale);
      ctx.drawImage(frame, -8, -24);
      ctx.restore();
    } else {
      ctx.drawImage(frame, sx, sy);
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const sx = Math.floor(p.x - this.cameraX);
      const sy = Math.floor(p.y - this.cameraY);
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      if (p.kind === "sparkle" || p.kind === "coinBurst" || p.kind === "gemBurst") {
        ctx.fillStyle = p.color ?? "#ffffff";
        ctx.fillRect(sx - 1, sy, 3, 1);
        ctx.fillRect(sx, sy - 1, 1, 3);
      } else if (p.kind === "dust") {
        ctx.fillStyle = "#bbf7d0";
        ctx.fillRect(sx, sy, 2, 2);
      } else if (p.kind === "leaf") {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(sx, sy, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderForegroundLeaves(ctx: CanvasRenderingContext2D) {
    for (const leaf of this.ambientLeaves) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(Math.floor(leaf.x), Math.floor(leaf.y), 2, 2);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(Math.floor(leaf.x + 1), Math.floor(leaf.y + 1), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  private renderHUD(ctx: CanvasRenderingContext2D) {
    // Background strip
    ctx.fillStyle = "rgba(10, 10, 15, 0.7)";
    ctx.fillRect(0, 0, BASE_WIDTH, 12);

    // Coin counter
    const coinFrame = this.atlas.coin[0];
    ctx.drawImage(coinFrame, 4, 2);
    this.drawPixelText(ctx, `${this.coinsCollected}/${this.totalCoins}`, 14, 3, "#fef3c7");

    // Gem counter
    const gemFrame = this.atlas.gem[0];
    ctx.drawImage(gemFrame, 60, 0);
    this.drawPixelText(ctx, `${this.gemsCollected}/${this.totalGems}`, 74, 3, "#fef3c7");

    // Timer
    const seconds = Math.floor(this.timeFrames / 60);
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    const timeStr = `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
    this.drawPixelText(ctx, timeStr, BASE_WIDTH - 38, 3, "#fef3c7");

    // Mute indicator (bottom right)
    if (this.sfxMuted || this.musicMuted) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(BASE_WIDTH - 36, BASE_HEIGHT - 10, 34, 8);
      const label = this.musicMuted && this.sfxMuted ? "MUTED" : this.musicMuted ? "M:OFF" : "S:OFF";
      this.drawPixelText(ctx, label, BASE_WIDTH - 34, BASE_HEIGHT - 9, "#fca5a5");
    }
  }

  private renderTitle(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(10, 10, 15, 0.55)";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const title = this.config.title ?? "Glimwood";
    const tagline = this.config.tagline ?? "A pixel-art platformer through the glimmering forest.";
    const startPrompt = this.config.startPrompt ?? "Press SPACE to Start";
    const controlsHint = this.config.controlsHint ?? "Arrows / WASD to move  -  SPACE to jump  -  R to restart";
    const credits = this.config.creditsText ?? "A Glimwood demo - Made with pixels and love";

    // Title with glow
    const titleY = 56;
    this.drawPixelText(ctx, title.toUpperCase(), BASE_WIDTH / 2 - title.length * 5, titleY, "#4ade80", 2);
    this.drawPixelText(ctx, title.toUpperCase(), BASE_WIDTH / 2 - title.length * 5 + 1, titleY + 1, "#16a34a", 2);
    this.drawPixelText(ctx, title.toUpperCase(), BASE_WIDTH / 2 - title.length * 5, titleY, "#bbf7d0", 2);

    this.drawPixelText(ctx, tagline, BASE_WIDTH / 2 - tagline.length * 2, titleY + 22, "#fef3c7");

    // Blinking start prompt
    if (Math.floor(this.globalTick / 30) % 2 === 0) {
      this.drawPixelText(
        ctx,
        startPrompt,
        BASE_WIDTH / 2 - startPrompt.length * 2,
        BASE_HEIGHT - 50,
        "#ffffff",
      );
    }

    this.drawPixelText(
      ctx,
      controlsHint,
      BASE_WIDTH / 2 - controlsHint.length * 2,
      BASE_HEIGHT - 30,
      "#a3a3a3",
    );

    this.drawPixelText(
      ctx,
      credits,
      BASE_WIDTH / 2 - credits.length * 2,
      BASE_HEIGHT - 16,
      "#6b7280",
    );
  }

  private renderWin(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const message = this.config.winMessage ?? "Level Complete!";
    this.drawPixelText(ctx, message.toUpperCase(), BASE_WIDTH / 2 - message.length * 5, 40, "#fbbf24", 2);

    const seconds = Math.floor(this.timeFrames / 60);
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    const timeStr = `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;

    const lines = [
      `COINS  ${this.coinsCollected} / ${this.totalCoins}`,
      `GEMS   ${this.gemsCollected} / ${this.totalGems}`,
      `TIME   ${timeStr}`,
      `DEATHS ${this.deaths}`,
      this.secretFound ? "SECRET FOUND!" : "",
    ];

    let y = 80;
    for (const line of lines) {
      if (!line) continue;
      const color = line.startsWith("SECRET") ? "#22d3ee" : "#fef3c7";
      this.drawPixelText(ctx, line, BASE_WIDTH / 2 - line.length * 2, y, color);
      y += 10;
    }

    if (Math.floor(this.globalTick / 30) % 2 === 0) {
      this.drawPixelText(ctx, "PRESS SPACE OR R TO PLAY AGAIN", BASE_WIDTH / 2 - 60, BASE_HEIGHT - 24, "#ffffff");
    }
  }

  // Tiny pixel font (5x7) for HUD/UI. Each glyph is encoded as a 5-bit row.
  private static FONT: Record<string, number[]> = {
    A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
    B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
    C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
    D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
    E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
    F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
    G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
    H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
    I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
    J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
    K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
    M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
    N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
    P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
    Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
    R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
    S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
    T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
    V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
    W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
    X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
    Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
    Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
    "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
    "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
    "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
    "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
    "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
    "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
    "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
    "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
    "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
    "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
    "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
    ".": [0, 0, 0, 0, 0, 0, 0x04],
    ",": [0, 0, 0, 0, 0, 0x04, 0x08],
    ":": [0, 0x04, 0, 0, 0, 0x04, 0],
    "-": [0, 0, 0, 0x0e, 0, 0, 0],
    "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    " ": [0, 0, 0, 0, 0, 0, 0],
  };

  private drawPixelText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    scale = 1,
  ) {
    ctx.fillStyle = color;
    const upper = text.toUpperCase();
    let cursor = x;
    for (const raw of upper) {
      const glyph = GlimwoodEngine.FONT[raw] ?? GlimwoodEngine.FONT[" "];
      for (let row = 0; row < glyph.length; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            ctx.fillRect(cursor + col * scale, y + row * scale, scale, scale);
          }
        }
      }
      cursor += 6 * scale;
    }
  }

  // ─── Blit ─────────────────────────────────────────────────────────────
  private blitToCanvas() {
    const dstW = this.canvas.width;
    const dstH = this.canvas.height;
    const scale = Math.max(
      1,
      Math.min(
        Math.floor(dstW / BASE_WIDTH),
        Math.floor(dstH / BASE_HEIGHT),
      ),
    );
    const scaledW = BASE_WIDTH * scale;
    const scaledH = BASE_HEIGHT * scale;
    const offsetX = Math.floor((dstW - scaledW) / 2);
    const offsetY = Math.floor((dstH - scaledH) / 2);

    // Letterbox black
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, dstW, dstH);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.offscreen,
      0,
      0,
      BASE_WIDTH,
      BASE_HEIGHT,
      offsetX,
      offsetY,
      scaledW,
      scaledH,
    );
  }

  private handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.imageSmoothingEnabled = false;
  }
}
