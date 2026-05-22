"use client";

import { motion } from "framer-motion";
import {
  CINEMATIC_LINES,
  cinematicEase,
  easternTheme,
  LINE_FADE_DURATION,
  LINE_STAGGER_SEC,
  UNLOCK_BUTTON_DELAY_SEC,
} from "./premium-eastern-theme";
import { PremiumUnlockButton } from "./premium-unlock-button";

type PremiumCinematicIntroProps = {
  /** true when section is in viewport — starts line sequence */
  isActivated: boolean;
  onUnlock: () => void;
  unlockLoading: boolean;
  unlockError: string | null;
};

export function PremiumCinematicIntro({
  isActivated,
  onUnlock,
  unlockLoading,
  unlockError,
}: PremiumCinematicIntroProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-14 sm:min-h-[360px] sm:px-10 sm:py-16">
      <div
        key={isActivated ? "cinematic-active" : "cinematic-idle"}
        className="flex w-full max-w-md flex-col items-center gap-0 text-center"
      >
        {CINEMATIC_LINES.map((line, index) => {
          const isLast = index === CINEMATIC_LINES.length - 1;

          return (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 10 }}
              animate={
                isActivated
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 10 }
              }
              transition={{
                duration: LINE_FADE_DURATION,
                delay: isActivated ? index * LINE_STAGGER_SEC : 0,
                ease: cinematicEase,
              }}
              aria-hidden={!isActivated}
              className="font-serif leading-[1.85] tracking-wide"
              style={{
                fontSize: isLast ? "clamp(1rem, 3.2vw, 1.15rem)" : "clamp(0.88rem, 2.8vw, 1rem)",
                color: isLast ? easternTheme.gold : easternTheme.offWhite,
                fontStyle: isLast ? "italic" : "normal",
                textShadow: isLast
                  ? `0 0 24px ${easternTheme.goldGlow}`
                  : `0 1px 12px oklch(0 0 0 / 0.4)`,
              }}
            >
              {line}
            </motion.p>
          );
        })}
      </div>

      {unlockError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 max-w-xs text-center text-xs"
          style={{ color: "oklch(0.65 0.12 25 / 0.9)" }}
        >
          {unlockError}
        </motion.p>
      )}

      <PremiumUnlockButton
        isActivated={isActivated}
        onClick={onUnlock}
        loading={unlockLoading}
        delay={UNLOCK_BUTTON_DELAY_SEC}
      />
    </div>
  );
}
