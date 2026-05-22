"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { mysticEase, mysticTheme, SAGE_LINE_STAGGER, SAGE_LINE_DURATION } from "./mystic-theme";

const SAGE_LINES = [
  "The scroll of your fate has been unrolled before me...",
  "I have walked between heaven and earth for countless seasons.",
  "The West has shown you symbols — clear, familiar, and true.",
  "Yet the East holds another mirror: yin and yang, the five elements, and the stars.",
  "Two paths lie before you now. Choose how deeply you wish to see.",
] as const;

type SagePersonaCinematicProps = {
  onComplete: () => void;
};

export function SagePersonaCinematic({ onComplete }: SagePersonaCinematicProps) {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const lastDelay = (SAGE_LINES.length - 1) * SAGE_LINE_STAGGER + SAGE_LINE_DURATION;
    const t = setTimeout(() => setReady(true), lastDelay * 1000 + 200);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    if (!ready || exiting) return;
    setExiting(true);
    setTimeout(onComplete, 450);
  };

  return (
    <motion.button
      type="button"
      onClick={handleContinue}
      disabled={!ready || exiting}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: exiting ? 0 : 1, y: exiting ? -12 : 0 }}
      transition={{ duration: exiting ? 0.45 : 0.55, ease: mysticEase }}
      className="relative mx-auto block w-full max-w-xl overflow-hidden rounded-2xl px-6 py-14 text-left transition-opacity sm:px-10 sm:py-16 disabled:cursor-default"
      style={{
        background: `linear-gradient(165deg, ${mysticTheme.navy} 0%, ${mysticTheme.charcoal} 50%, ${mysticTheme.navyMid} 100%)`,
        boxShadow: `inset 0 1px 0 ${mysticTheme.goldDim}, 0 0 40px ${mysticTheme.goldGlow}`,
        border: `1px solid ${mysticTheme.goldDim}`,
        cursor: ready ? "pointer" : "default",
      }}
      aria-label={ready ? "Continue to choose your path" : "The Eastern Sage is speaking"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${mysticTheme.goldGlow}, transparent 70%)`,
        }}
      />
      <p
        className="relative z-10 mb-8 text-center font-serif text-[10px] uppercase tracking-[0.45em]"
        style={{ color: mysticTheme.gold }}
      >
        The Eastern Sage
      </p>
      <div className="relative z-10 flex flex-col items-center gap-1 text-center">
        {SAGE_LINES.map((line, index) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: SAGE_LINE_DURATION,
              delay: index * SAGE_LINE_STAGGER,
              ease: mysticEase,
            }}
            className="font-serif text-[clamp(0.9rem,2.8vw,1.05rem)] leading-[1.9] tracking-wide"
            style={{
              color: index === SAGE_LINES.length - 1 ? mysticTheme.gold : mysticTheme.offWhite,
              fontStyle: index === SAGE_LINES.length - 1 ? "italic" : "normal",
            }}
          >
            {line}
          </motion.p>
        ))}
      </div>

      {ready && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: mysticEase }}
          className="relative z-10 mt-10 flex flex-col items-center gap-3"
        >
          <div
            className="h-px w-16"
            style={{
              background: `linear-gradient(to right, transparent, ${mysticTheme.gold}, transparent)`,
            }}
          />
          <p
            className="font-serif text-[10px] uppercase tracking-[0.35em]"
            style={{ color: mysticTheme.gold }}
          >
            Tap to continue
          </p>
          <motion.p
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-[9px] tracking-widest"
            style={{ color: mysticTheme.offWhiteMuted }}
          >
            ✦
          </motion.p>
        </motion.div>
      )}
    </motion.button>
  );
}
