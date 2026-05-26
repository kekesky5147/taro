import { COSMIC_STARS } from "@/data/cosmic-stars";

const STAR_FILL = "oklch(0.92 0.04 250 / 0.9)";

export function CosmicBackground() {
  return (
    <div
      className="cosmic-bg-root pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep space gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-[oklch(0.06_0.03_280)] to-[oklch(0.04_0.02_260)]" />

      {/* Nebula orbs — blur는 정적, opacity만 호흡 */}
      <div
        className="absolute top-1/4 -left-32 z-[1] h-96 w-96 animate-nebula-breathe rounded-full bg-[oklch(0.3_0.15_280/0.15)] blur-[100px]"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute bottom-1/4 -right-32 z-[1] h-80 w-80 animate-nebula-breathe rounded-full bg-[oklch(0.35_0.18_190/0.1)] blur-[80px]"
        style={{ animationDelay: "-7s" }}
      />
      <div className="absolute top-1/2 left-1/2 z-[1] -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-[600px] w-[600px] animate-nebula-breathe rounded-full bg-[oklch(0.25_0.12_330/0.08)] blur-[120px]"
          style={{ animationDelay: "-14s" }}
        />
      </div>

      {/* Stars — 정적 렌더링 (twinkle 애니메이션 비활성화, 프레임 부담 제거) */}
      <div className="absolute inset-0 z-[2]">
        {COSMIC_STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: STAR_FILL,
              opacity: 0.55 + (star.id % 5) * 0.08,
            }}
          />
        ))}
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 z-[3] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.95 0.02 240 / 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.95 0.02 240 / 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}
