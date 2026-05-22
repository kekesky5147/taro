"use client";

import { motion } from "framer-motion";
import { easternTheme } from "./premium-eastern-theme";

/** Mystic scroll / pearl shimmer background */
export function PremiumScrollBackdrop({
  children,
  isActivated = true,
}: {
  children: React.ReactNode;
  isActivated?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `
          linear-gradient(165deg,
            ${easternTheme.ink} 0%,
            ${easternTheme.inkDeep} 42%,
            oklch(0.09 0.02 50) 100%
          )`,
        boxShadow: `
          inset 0 1px 0 ${easternTheme.pearl},
          inset 0 -1px 0 oklch(0.04 0.01 40 / 0.8),
          0 0 48px oklch(0.5 0.08 70 / 0.08)
        `,
      }}
    >
      {/* Pearl gradient wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 15%, oklch(0.2 0.04 75 / 0.12), transparent 55%),
            radial-gradient(ellipse 60% 40% at 85% 75%, oklch(0.15 0.03 60 / 0.1), transparent 50%),
            radial-gradient(ellipse 100% 80% at 50% 100%, oklch(0.12 0.02 45 / 0.15), transparent 60%)
          `,
        }}
      />

      {/* Slow shimmer drift — only after section enters viewport */}
      <motion.div
        className="pointer-events-none absolute inset-[-40%] opacity-[0.35]"
        animate={
          isActivated
            ? { x: ["-5%", "5%", "-5%"], y: ["-3%", "3%", "-3%"] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 18, repeat: isActivated ? Infinity : 0, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.9 0.06 95 / 0.06) 0%, transparent 55%)",
        }}
      />

      {/* Top / bottom vignette — scroll edges */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{
          background: `linear-gradient(to bottom, ${easternTheme.inkDeep}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{
          background: `linear-gradient(to top, ${easternTheme.inkDeep}, transparent)`,
        }}
      />

      {/* Fine border — gold thread */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: `1px solid ${easternTheme.goldDim}`,
          boxShadow: `inset 0 0 32px ${easternTheme.goldGlow}`,
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
