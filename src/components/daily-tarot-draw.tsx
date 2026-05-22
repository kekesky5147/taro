"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TarotInfiniteWheel } from "@/components/tarot-infinite-wheel";
import { TAROT_DECK } from "@/lib/tarot-data";
import type { TarotCard } from "@/lib/tarot-data";

const DAILY_DECK = TAROT_DECK.slice(0, 7);

function WheelSpinHint() {
  return (
    <div className="pointer-events-none relative mt-1 flex flex-col items-center gap-2 pb-1">
      <motion.div
        className="h-px w-[min(12rem,55vw)] overflow-hidden rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
        initial={{ scaleX: 0.4, opacity: 0 }}
        animate={{ scaleX: [0.45, 1, 0.45], opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="flex items-center gap-0.5"
        animate={{ x: [-2, 2, -2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span className="h-1 w-1.5 rounded-full bg-white/35" />
        <span className="h-1 w-1 rounded-full bg-white/25" />
      </motion.div>
      <p
        className="max-w-[16rem] bg-gradient-to-r from-muted-foreground/35 via-muted-foreground/55 to-muted-foreground/35 bg-clip-text text-center text-[9px] font-medium uppercase leading-snug tracking-[0.22em] text-transparent sm:text-[10px] sm:tracking-[0.26em]"
        style={{ WebkitBackgroundClip: "text" }}
      >
        Drag or swipe to spin the wheel
      </p>
    </div>
  );
}

type DailyTarotDrawProps = {
  wheelKey: number;
  /** User taps to save / unlock full reading after flip. */
  onRequestAccount?: () => void;
};

export function DailyTarotDraw({ wheelKey, onRequestAccount }: DailyTarotDrawProps) {
  const [focusedLabel, setFocusedLabel] = useState(DAILY_DECK[0].name);
  const [revealed, setRevealed] = useState<TarotCard | null>(null);
  const [flipDone, setFlipDone] = useState(false);

  const handleCenter = useCallback((card: TarotCard) => {
    setFocusedLabel(card.name);
  }, []);

  const handleSelect = useCallback((card: TarotCard) => {
    setFlipDone(false);
    setRevealed(card);
  }, []);

  return (
    <section className="relative mt-8 w-full max-w-3xl px-2 sm:mt-10 sm:px-5">
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/50">
        Daily tarot draw
      </p>

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/15 shadow-[0_0_0_1px_oklch(1_0_0/0.03)_inset] backdrop-blur-md"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.75_0.12_55/0.25)] to-transparent" />
        <TarotInfiniteWheel
          key={wheelKey}
          cards={DAILY_DECK}
          onCenterCardChange={(c) => handleCenter(c)}
          onSelectCard={handleSelect}
          disabled={!!revealed}
        />
        <WheelSpinHint />
        <p className="pointer-events-none pb-3 pt-0.5 text-center font-serif text-sm text-muted-foreground/70">
          {focusedLabel}
        </p>
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (flipDone) setRevealed(null);
            }}
          >
            <motion.div
              className="relative w-[min(92vw,280px)] perspective-[1200px]"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-90"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: [0, 1, 0.75] }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 45%, oklch(0.82 0.18 55 / 0.45) 0%, oklch(0.55 0.2 300 / 0.2) 42%, transparent 68%)",
                  filter: "blur(18px)",
                }}
              />

              <motion.div
                className="relative aspect-[140/196] w-full"
                style={{ transformStyle: "preserve-3d" }}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 180 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => {
                  setFlipDone(true);
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(0deg)",
                    background:
                      "linear-gradient(155deg, oklch(0.14 0.04 280), oklch(0.07 0.02 260))",
                  }}
                >
                  <div className="absolute inset-3 rounded-xl border border-white/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full border border-[oklch(0.75_0.15_55/0.35)]" />
                  </div>
                </div>

                <div
                  className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[oklch(0.78_0.16_55/0.65)] p-6 text-center shadow-[0_0_60px_oklch(0.72_0.18_55/0.35)]"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background:
                      "linear-gradient(160deg, oklch(0.18 0.06 280), oklch(0.1 0.04 260))",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[oklch(0.78_0.14_55/0.85)]">
                    Today&apos;s pull
                  </p>
                  <p className="mt-3 font-serif text-2xl tracking-wide text-foreground">
                    {revealed.name}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
                    Energy is lining up around this archetype. Save your reading to see the full
                    spread and daily log.
                  </p>
                  {flipDone && (
                    <div className="mt-5 flex w-full flex-col gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealed(null);
                          onRequestAccount?.();
                        }}
                        className="w-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.16_55)] to-[oklch(0.62_0.14_45)] py-2.5 text-xs font-medium tracking-wide text-[oklch(0.12_0.02_55)] shadow-[0_0_24px_oklch(0.7_0.16_55/0.35)] transition-transform active:scale-[0.98]"
                      >
                        Save &amp; unlock full reading
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealed(null);
                        }}
                        className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-foreground/80 hover:underline"
                      >
                        Maybe later
                      </button>
                    </div>
                  )}
                  {!flipDone && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.45 }}
                      className="mt-6 text-[10px] text-muted-foreground"
                    >
                      Revealing…
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
