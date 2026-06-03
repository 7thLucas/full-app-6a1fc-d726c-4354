# Glimwood - Design Guidelines

## Design Philosophy
Glimwood's design embraces pixel-perfect craftsmanship with a magical forest aesthetic. Every visual element should feel hand-placed and intentional — like a love letter to 16-bit platformers with modern polish.

## Color Palette

### Primary Colors (Forest Magic)
- **Glim Green**: `#4ade80` — Hero's signature glow, UI highlights
- **Deep Moss**: `#16352d` — Foreground platforms, ground tiles
- **Twilight Purple**: `#3b2a5c` — Mid-background, mystical atmosphere
- **Dusk Sky**: `#1a1432` — Far background, night atmosphere

### Accent Colors
- **Coin Gold**: `#fbbf24` — Collectibles, sparkle effects
- **Gem Cyan**: `#22d3ee` — Special collectibles, secret indicators
- **Danger Red**: `#ef4444` — Enemies, hazards
- **Pure White**: `#ffffff` — Sparkles, flash effects, text

### UI Colors
- **HUD Black**: `#0a0a0f` — UI backgrounds with 80% opacity
- **Pixel Cream**: `#fef3c7` — Score/HUD text
- **Shadow**: `#000000` at 60% opacity — Drop shadows

## Typography
- **Pixel Font**: "Press Start 2P" (Google Fonts) — Scores, HUD, titles
- **Body Font**: "VT323" (Google Fonts) — Hints, dialogue, instructions
- **Sizes**:
  - HUD score: 16px (pixel-perfect)
  - Title: 32px
  - Hints: 14px
  - Body: 16px

## Pixel Art Rendering Rules
- **image-rendering**: `pixelated` (CSS) for crisp pixels
- **Canvas**: Use HTML5 Canvas with `imageSmoothingEnabled = false`
- **Scale**: Render base resolution (e.g., 320x180 or 480x270) and scale up integer multiples
- **No anti-aliasing** on sprites, tiles, or text

## Animation Principles
- **Frame rate**: 60 FPS for game logic, 8-12 FPS for sprite animations (chunky pixel feel)
- **Easing**: Snappy ease-out for UI; linear for sprite frames
- **Squash & stretch**: Subtle on jump/land for "juice"
- **Particle effects**: Sparkles on pickups, dust on landing, leaves drifting

## Layout & Composition

### Game Viewport
- **Aspect ratio**: 16:9 (e.g., 960x540 scaled from 320x180)
- **Letterboxing**: Black bars if window doesn't match
- **HUD position**: Top-left for score/coins, top-right for lives/timer

### Parallax Layers (back to front)
1. **Sky/Stars** (0.1x scroll) — Deep purple gradient with twinkling stars
2. **Far Trees** (0.3x scroll) — Silhouetted tree line in deep purple
3. **Mid Trees** (0.6x scroll) — Slightly detailed trees with hints of green
4. **Foreground Detail** (1.0x scroll) — Grass, mushrooms, vines, animated sparkles
5. **Gameplay Layer** (1.0x scroll) — Platforms, enemies, hero, collectibles

## Components

### Hero Sprite
- **Size**: 16x24 pixels (base resolution)
- **Animations**:
  - Idle: 4 frames, gentle bobbing
  - Run: 6 frames, energetic stride
  - Jump: 2 frames (rising, peak)
  - Fall: 2 frames
  - Land: 1 frame with squash
  - Celebrate: 4 frames, fist pump or twirl

### Enemy
- **Type**: Forest creature (e.g., spiky mushroom or shadow wisp)
- **Size**: 16x16 pixels
- **Behavior**: Patrol pattern, defeatable by jumping on top
- **Animation**: 2-4 frames

### Collectibles
- **Coin**: 8x8 sparkling gold, rotating 4-frame animation
- **Gem**: 12x12 cyan crystal with subtle glow pulse
- **Pickup effect**: Burst of sparkles + satisfying "ping" sound

### Platforms
- **Style**: Mossy stone with grass tops
- **Tile size**: 16x16
- **Variations**: Solid, one-way (jump-through), moving (optional)

### Checkpoint
- **Visual**: Glowing crystal pillar
- **States**: Inactive (dim) → Active (bright green pulse)
- **Activation**: Sparkle burst + chime

## Audio Design
- **Music**: Chiptune-style loop (8-bit synthesizer feel) — upbeat, magical
- **SFX**:
  - Jump: Short "boing" or chiptune blip
  - Land: Soft thump
  - Coin pickup: Bright "ping"
  - Gem pickup: Crystalline chime
  - Enemy defeat: Satisfying squish
  - Hero hurt: Brief stinger
  - Checkpoint: Ascending chime
  - Level complete: Triumphant fanfare

## Controls
- **Keyboard**:
  - Arrow keys or WASD: Move
  - Space or Z: Jump (variable height based on hold)
  - X: Optional dash/attack
  - R: Restart from last checkpoint
- **Responsive feel**:
  - Coyote time (~6 frames after leaving platform)
  - Jump buffer (~6 frames before landing)
  - Variable jump height

## Page Structure

### Landing Screen
- Game title "Glimwood" in large pixel font with subtle glow
- "Press SPACE to Start" prompt
- Decorative background using the parallax forest
- Subtle particle effects (drifting leaves)

### Game Screen
- Full-bleed canvas with letterboxing
- Minimal HUD (coins collected, lives)
- Pause menu accessible via Escape

### Win Screen
- "Level Complete!" with stats (coins, gems, time)
- Hero celebrate animation
- "Press R to Replay" option

## Accessibility
- Clear visual contrast (no critical info conveyed by color alone)
- Sound toggle in pause menu
- Keyboard-only playable (no mouse required for gameplay)

## Inspiration References
- **Celeste**: Tight controls, pixel art polish
- **Hollow Knight**: Atmospheric depth (in pixel form)
- **Shovel Knight**: Color palette discipline
- **Owlboy**: Background detail and parallax
