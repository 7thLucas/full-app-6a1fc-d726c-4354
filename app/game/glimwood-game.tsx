/**
 * GlimwoodGame — React wrapper around the canvas-based GlimwoodEngine.
 *
 * Reads configurables for branding/theme/audio settings and pipes them into
 * the engine. The engine handles all input, audio, rendering, and game loop.
 */

import { useEffect, useRef } from "react";
import { useConfigurables } from "~/modules/configurables";
import { GlimwoodEngine, type GameConfig } from "./engine";

export function GlimwoodGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GlimwoodEngine | null>(null);
  const { config, loading } = useConfigurables();

  // Initialize engine once
  useEffect(() => {
    if (loading) return;
    if (!canvasRef.current) return;
    if (engineRef.current) return;

    const initialConfig = buildEngineConfig(config);
    const engine = new GlimwoodEngine(canvasRef.current, initialConfig);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // We intentionally only run this when loading flips to false the first time.
    // Live config changes are propagated via the second effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Push live config updates into the running engine
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.applyConfig(buildEngineConfig(config));
  }, [config]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#000000",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "pixelated",
          outline: "none",
        }}
        onClick={(e) => e.currentTarget.focus()}
      />
    </div>
  );
}

function buildEngineConfig(
  config: ReturnType<typeof useConfigurables>["config"],
): GameConfig {
  const brand = config?.brandColor;
  const heroPrimary =
    brand?.primary && !brand.primary.startsWith("FILL_") ? brand.primary : undefined;
  const groundColor =
    brand?.secondary && !brand.secondary.startsWith("FILL_") ? brand.secondary : undefined;
  return {
    spriteTheme: {
      heroPrimary,
      groundColor: config?.groundColor ?? groundColor,
      coinColor: config?.coinColor,
      gemColor: config?.gemColor,
      enemyColor: config?.enemyColor,
    },
    skyColor: config?.skyColor,
    midBackgroundColor: config?.midBackgroundColor,
    enableMusic: config?.enableMusic !== false,
    enableSfx: config?.enableSfx !== false,
    title: config?.appName,
    tagline: config?.tagline,
    startPrompt: config?.startPrompt,
    controlsHint: config?.controlsHint,
    winMessage: config?.winMessage,
    creditsText: config?.creditsText,
  };
}
