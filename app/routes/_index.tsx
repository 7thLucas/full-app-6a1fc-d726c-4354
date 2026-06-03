import { useConfigurables } from "~/modules/configurables";
import { GlimwoodGame } from "~/game/glimwood-game";

export default function IndexPage() {
  const { config, loading } = useConfigurables();
  const title = config?.appName ?? "Glimwood";

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0f",
        overflow: "hidden",
        fontFamily:
          '"Press Start 2P", "VT323", ui-monospace, SFMono-Regular, monospace',
      }}
    >
      {loading ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#bbf7d0",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 2,
          }}
        >
          LOADING {title.toUpperCase()}...
        </div>
      ) : (
        <GlimwoodGame />
      )}
    </main>
  );
}
