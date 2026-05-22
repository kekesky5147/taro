"use client";

import { motion } from "framer-motion";
import { mysticEase, mysticTheme } from "./mystic-theme";

const SAGE_INVITE_COPY =
  "당신의 운명에 호기심을 보이는 동양 철학자가 있네요. 그를 불러 함께 이야기를 들어보시겠습니까? 그와 함께라면 저도 더 깊이 있는 탐구를 할 수 있을 것 같습니다.";

type CrossroadsChoiceProps = {
  zodiacSign?: string | null;
  onChooseFree: () => void;
  onChoosePremium: () => void;
  premiumLoading?: boolean;
};

/** Shared tarot card silhouette — base layer for both options */
function TarotCardBase({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        aspectRatio: "3/4",
        maxHeight: 88,
        width: "100%",
        maxWidth: 72,
        background: `linear-gradient(160deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="absolute inset-2 rounded-lg border"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-8 w-8 rounded-full border"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        />
      </div>
    </div>
  );
}

export function CrossroadsChoice({
  zodiacSign,
  onChooseFree,
  onChoosePremium,
  premiumLoading = false,
}: CrossroadsChoiceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: mysticEase }}
      className="mx-auto w-full max-w-lg px-2"
    >
      <div className="mb-8 text-center">
        <p
          className="font-serif text-[10px] uppercase tracking-[0.4em]"
          style={{ color: mysticTheme.offWhiteMuted }}
        >
          Your Tarot Reading
        </p>
        <h2
          className="mt-2 font-serif text-xl tracking-wide sm:text-2xl"
          style={{ color: mysticTheme.gold }}
        >
          Choose the depth of your reading
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Standard — base tarot reading */}
        <motion.button
          type="button"
          onClick={onChooseFree}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="group flex w-full items-center gap-5 rounded-2xl border p-5 text-left sm:p-6"
          style={{
            background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <TarotCardBase />
          <div className="min-w-0 flex-1">
            <span
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: mysticTheme.offWhiteMuted }}
            >
              Included
            </span>
            <h3
              className="mt-1 font-serif text-lg"
              style={{ color: mysticTheme.offWhite }}
            >
              The Standard Reading
            </h3>
            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: mysticTheme.offWhiteMuted }}
            >
              Your tarot reader&apos;s clear interpretation of Past, Present, and Future.
            </p>
          </div>
        </motion.button>

        {/* Sage layer — same card + gold aura overlay */}
        <motion.button
          type="button"
          onClick={onChoosePremium}
          disabled={premiumLoading}
          whileHover={{ scale: premiumLoading ? 1 : 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="group relative flex w-full items-start gap-5 overflow-hidden rounded-2xl border p-5 text-left sm:p-6"
          style={{
            background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
            borderColor: mysticTheme.goldDim,
            boxShadow: `0 0 32px ${mysticTheme.goldGlow}`,
          }}
        >
          {/* Gold aura veil over entire card */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: `linear-gradient(135deg, ${mysticTheme.goldGlow} 0%, transparent 50%, ${mysticTheme.goldGlow} 100%)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[#d4af37]/25" />

          <div className="relative shrink-0">
            <TarotCardBase />
            {/* Gold layer stacked on the card */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background: `linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 60%, transparent 100%)`,
                border: "1px solid rgba(212,175,55,0.35)",
                boxShadow: "inset 0 0 20px rgba(212,175,55,0.15)",
              }}
            />
            <motion.div
              className="pointer-events-none absolute -inset-1 rounded-xl"
              animate={{
                boxShadow: [
                  "0 0 12px rgba(212,175,55,0.2)",
                  "0 0 24px rgba(212,175,55,0.4)",
                  "0 0 12px rgba(212,175,55,0.2)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 min-w-0 flex-1">
            <span
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: mysticTheme.gold }}
            >
              Deeper layer
            </span>
            <h3
              className="mt-1 font-serif text-lg"
              style={{ color: mysticTheme.gold }}
            >
              The Sage&apos;s Perspective (+$0.99)
            </h3>
            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: mysticTheme.offWhiteMuted }}
            >
              Everything in the Standard Reading, with your reader consulting an Eastern
              philosopher beside them — yin-yang, the five elements
              {zodiacSign ? `, and your sign (${zodiacSign})` : ""}.
            </p>
            <p
              className="mt-4 border-t pt-3 font-serif text-[11px] leading-[1.75]"
              style={{
                borderColor: "rgba(212,175,55,0.2)",
                color: "rgba(220, 215, 205, 0.75)",
              }}
            >
              {SAGE_INVITE_COPY}
            </p>
            <span
              className="mt-4 inline-block rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider"
              style={{
                borderColor: mysticTheme.goldDim,
                color: mysticTheme.gold,
                background: mysticTheme.glass,
              }}
            >
              {premiumLoading ? "Summoning the Sage..." : "Invite the Sage"}
            </span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}
