"use client";

import { motion } from "framer-motion";
import { cinematicEase, easternTheme } from "./premium-eastern-theme";

type PremiumUnlockButtonProps = {
  isActivated: boolean;
  onClick: () => void;
  loading: boolean;
  /** Framer delay in seconds — appears after cinematic lines */
  delay: number;
};

export function PremiumUnlockButton({
  isActivated,
  onClick,
  loading,
  delay,
}: PremiumUnlockButtonProps) {
  return (
    <motion.div
      className="mt-10 sm:mt-12"
      initial={{ opacity: 0, y: 14 }}
      animate={
        isActivated
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 14 }
      }
      transition={{
        duration: 0.85,
        delay: isActivated ? delay : 0,
        ease: cinematicEase,
      }}
      style={{ pointerEvents: isActivated ? "auto" : "none" }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.03 }}
        whileTap={{ scale: loading ? 1 : 0.97 }}
        className="group relative overflow-hidden rounded-full px-7 py-3 text-xs font-medium tracking-[0.12em] transition-opacity disabled:cursor-wait disabled:opacity-70 sm:px-9 sm:text-sm"
        style={{
          color: easternTheme.offWhite,
          background: "oklch(0.1 0.02 50 / 0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${easternTheme.goldDim}`,
          boxShadow: `
            0 0 28px ${easternTheme.goldGlow},
            inset 0 1px 0 oklch(0.9 0.06 90 / 0.15),
            inset 0 -1px 0 oklch(0 0 0 / 0.2)
          `,
        }}
      >
        {/* Gold rim pulse */}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              `inset 0 0 0 1px oklch(0.75 0.14 72 / 0.25)`,
              `inset 0 0 0 1px oklch(0.82 0.16 78 / 0.55)`,
              `inset 0 0 0 1px oklch(0.75 0.14 72 / 0.25)`,
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Glass highlight sweep */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, oklch(0.95 0.04 95 / 0.12) 50%, transparent 65%)",
          }}
        />

        <span className="relative z-10">
          {loading ? "Preparing the scroll..." : "Unlock Eastern Wisdom ($0.99)"}
        </span>
      </motion.button>
    </motion.div>
  );
}
