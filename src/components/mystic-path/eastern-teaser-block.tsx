"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { createPaymentIntent, unlockPremiumDev } from "@/actions/premium";
import { shouldSkipPaymentInDev } from "@/lib/payment-mode";
import { PremiumPaymentModal } from "@/components/premium/premium-payment-modal";
import { SagePerspectivePanel } from "@/components/mystic-path/sage-perspective-panel";
import { mysticEase, mysticTheme } from "./mystic-theme";

const VISIBLE_SENTENCES = 1;

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type EasternTeaserBlockProps = {
  sessionId: string;
  easternTeaser: string;
  isPremium: boolean;
  premiumReading: string | null;
  onUnlocked: (premiumReading: string) => void;
};

export function EasternTeaserBlock({
  sessionId,
  easternTeaser,
  isPremium,
  premiumReading,
  onUnlocked,
}: EasternTeaserBlockProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPremium && premiumReading) {
    return <SagePerspectivePanel premiumReading={premiumReading} />;
  }

  const sentences = splitSentences(easternTeaser);
  const visible = sentences.slice(0, VISIBLE_SENTENCES).join(" ");
  const hidden =
    sentences.slice(VISIBLE_SENTENCES).join(" ") ||
    "The five elements whisper of paths not yet written. Yin and yang await their balance upon your scroll. The stars hold counsel reserved for those who seek the complete vision.";

  const handleUnlock = async () => {
    setError(null);
    setLoading(true);

    try {
      if (shouldSkipPaymentInDev()) {
        const result = await unlockPremiumDev(sessionId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        onUnlocked(result.data.premiumReading);
        return;
      }

      const result = await createPaymentIntent(sessionId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setClientSecret(result.data.clientSecret);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: mysticEase, delay: 0.2 }}
        className="mt-8"
      >
        <div className="mb-4 text-center">
          <p
            className="font-serif text-[10px] uppercase tracking-[0.42em]"
            style={{ color: mysticTheme.goldDim }}
          >
            Invite the Sage
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
          style={{
            background: `linear-gradient(165deg, ${mysticTheme.navy}, ${mysticTheme.charcoal})`,
            border: `1px solid ${mysticTheme.goldDim}`,
          }}
        >
          <p
            className="font-serif text-sm leading-relaxed"
            style={{ color: mysticTheme.offWhite }}
          >
            {visible}
          </p>

          <div className="relative mt-4">
              <p
                className="pointer-events-none select-none font-serif text-sm leading-relaxed"
                style={{ filter: "blur(6px)", color: mysticTheme.offWhiteMuted }}
                aria-hidden
              >
                {hidden}
              </p>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4"
                style={{ background: "rgba(10, 14, 26, 0.55)", backdropFilter: "blur(2px)" }}
              >
                <Lock size={18} style={{ color: mysticTheme.gold }} strokeWidth={1.5} />
                {error && (
                  <p className="text-center text-xs text-red-400/90">{error}</p>
                )}
                <motion.button
                  type="button"
                  onClick={handleUnlock}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full border px-6 py-2.5 text-xs tracking-wide disabled:opacity-60"
                  style={{
                    color: mysticTheme.offWhite,
                    borderColor: mysticTheme.goldDim,
                    background: mysticTheme.glass,
                    backdropFilter: "blur(14px)",
                    boxShadow: `0 0 24px ${mysticTheme.goldGlow}`,
                  }}
                >
                  {loading ? "Preparing..." : "The Sage's Perspective (+$0.99)"}
                </motion.button>
              </div>
            </div>
        </div>
      </motion.div>

      {clientSecret && (
        <PremiumPaymentModal
          open={modalOpen}
          clientSecret={clientSecret}
          sessionId={sessionId}
          onClose={() => {
            setModalOpen(false);
            setClientSecret(null);
          }}
          onSuccess={(reading) => {
            onUnlocked(reading);
            setModalOpen(false);
            setClientSecret(null);
          }}
        />
      )}
    </>
  );
}
