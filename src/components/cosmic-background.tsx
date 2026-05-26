export function CosmicBackground() {
  return (
    <div
      className="cosmic-bg-root pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-[oklch(0.06_0.03_280)] to-[oklch(0.04_0.02_260)]" />

      {/* Nebula — blur is costly on mobile; show from md up only */}
      <div
        className="cosmic-nebula absolute top-1/4 -left-32 z-[1] hidden h-96 w-96 animate-nebula-breathe rounded-full bg-[oklch(0.3_0.15_280/0.15)] blur-[100px] md:block"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="cosmic-nebula absolute bottom-1/4 -right-32 z-[1] hidden h-80 w-80 animate-nebula-breathe rounded-full bg-[oklch(0.35_0.18_190/0.1)] blur-[80px] md:block"
        style={{ animationDelay: "-7s" }}
      />
      <div className="absolute top-1/2 left-1/2 z-[1] hidden -translate-x-1/2 -translate-y-1/2 md:block">
        <div
          className="cosmic-nebula h-[600px] w-[600px] animate-nebula-breathe rounded-full bg-[oklch(0.25_0.12_330/0.08)] blur-[120px]"
          style={{ animationDelay: "-14s" }}
        />
      </div>
    </div>
  );
}
