/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  tagline?: string;
  startPrompt?: string;
  controlsHint?: string;
  skyColor?: string;
  midBackgroundColor?: string;
  groundColor?: string;
  coinColor?: string;
  gemColor?: string;
  enemyColor?: string;
  enableMusic?: boolean;
  enableSfx?: boolean;
  winMessage?: string;
  creditsText?: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "Glimwood",
  logoUrl: "FILL_LOGO_URL_HERE",
  brandColor: {
    primary: "#4ade80",
    secondary: "#16352d",
    accent: "#fbbf24",
  },
  tagline: "A pixel-art platformer through the glimmering forest.",
  startPrompt: "Press SPACE to Start",
  controlsHint: "Arrows / WASD to move  •  SPACE to jump  •  R to restart",
  skyColor: "#1a1432",
  midBackgroundColor: "#3b2a5c",
  groundColor: "#16352d",
  coinColor: "#fbbf24",
  gemColor: "#22d3ee",
  enemyColor: "#ef4444",
  enableMusic: true,
  enableSfx: true,
  winMessage: "Level Complete!",
  creditsText: "A Glimwood demo  •  Made with pixels and love",
};
