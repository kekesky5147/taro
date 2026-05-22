/** Eastern minimalism palette — deep ink, calm gold, off-white */
export const easternTheme = {
  ink: "oklch(0.07 0.015 45)",
  inkDeep: "oklch(0.05 0.012 40)",
  parchment: "oklch(0.11 0.025 55)",
  gold: "oklch(0.78 0.12 75)",
  goldDim: "oklch(0.65 0.1 70 / 0.6)",
  goldGlow: "oklch(0.72 0.14 72 / 0.35)",
  offWhite: "oklch(0.93 0.02 90)",
  offWhiteMuted: "oklch(0.82 0.03 85 / 0.75)",
  pearl: "oklch(0.88 0.04 95 / 0.08)",
} as const;

export const cinematicEase = [0.22, 1, 0.36, 1] as const;

export const CINEMATIC_LINES = [
  "Ancient wisdom from the mystic East,",
  "Secrets of the Orient, unveiled.",
  "Through the lens of Eastern philosophy,",
  "Your cards hold a fate yet to be seen.",
  "What does your destiny whisper?",
] as const;

/** Seconds between each line fade-in */
export const LINE_STAGGER_SEC = 0.8;

export const LINE_FADE_DURATION = 0.9;

/** Button appears after all lines finish */
export const UNLOCK_BUTTON_DELAY_SEC =
  CINEMATIC_LINES.length * LINE_STAGGER_SEC + 0.5;
