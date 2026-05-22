"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createPaymentIntent, getPremiumStatus } from "@/actions/premium";
import { PremiumCinematicIntro } from "@/components/premium/premium-cinematic-intro";
import { PremiumPaymentModal } from "@/components/premium/premium-payment-modal";
import { PremiumReadingContent } from "@/components/premium/premium-reading-content";
import { PremiumScrollBackdrop } from "@/components/premium/premium-scroll-backdrop";
import {
  cinematicEase,
  easternTheme,
} from "@/components/premium/premium-eastern-theme";
import { useViewportActivation } from "@/components/premium/use-viewport-activation";

export type PremiumSectionProps = {
  sessionId: string;
};

export function PremiumSection({ sessionId }: PremiumSectionProps) {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumReading, setPremiumReading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const { ref: viewportRef, isActivated: viewportActivated } = useViewportActivation({
    threshold: 0.1,
    rootMargin: "0px",
  });
  const isActivated =
    Boolean(isPremium && premiumReading) || viewportActivated;

  const loadStatus = useCallback(async () => {
    const result = await getPremiumStatus(sessionId);
    if (result.success) {
      setIsPremium(result.data.isPremium);
      setPremiumReading(result.data.premiumReading);
    }
    setStatusLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleUnlockClick = async () => {
    setUnlockError(null);
    setUnlockLoading(true);

    const result = await createPaymentIntent(sessionId);
    if (!result.success) {
      setUnlockError(result.error);
      setUnlockLoading(false);
      return;
    }

    setClientSecret(result.data.clientSecret);
    setModalOpen(true);
    setUnlockLoading(false);
  };

  const handlePaymentSuccess = (reading: string) => {
    setPremiumReading(reading);
    setIsPremium(true);
    setModalOpen(false);
    setClientSecret(null);
  };

  if (statusLoading) {
    return (
      <div className="flex justify-center py-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="h-5 w-5 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: easternTheme.gold,
            borderRightColor: "oklch(0.3 0.04 50 / 0.3)",
            borderBottomColor: "oklch(0.3 0.04 50 / 0.3)",
            borderLeftColor: "oklch(0.3 0.04 50 / 0.3)",
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div ref={viewportRef} className="mt-8 scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: cinematicEase }}
      >
        <div className="mb-5 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={isActivated ? { opacity: 1 } : { opacity: 0.35 }}
            transition={{ duration: 0.8, ease: cinematicEase }}
            className="font-serif text-[10px] uppercase tracking-[0.42em]"
            style={{ color: easternTheme.goldDim }}
          >
            Eastern Philosophy
          </motion.p>
          <motion.div
            className="mx-auto mt-2 h-px w-20"
            initial={{ scaleX: 0 }}
            animate={isActivated ? { scaleX: 1 } : { scaleX: 0.3 }}
            transition={{ duration: 0.9, ease: cinematicEase, delay: isActivated ? 0.15 : 0 }}
            style={{
              background: `linear-gradient(to right, transparent, ${easternTheme.gold}, transparent)`,
            }}
          />
        </div>

        <PremiumScrollBackdrop isActivated={isActivated}>
          {isPremium && premiumReading ? (
            <PremiumReadingContent text={premiumReading} />
          ) : (
            <PremiumCinematicIntro
              isActivated={isActivated}
              onUnlock={handleUnlockClick}
              unlockLoading={unlockLoading}
              unlockError={unlockError}
            />
          )}
        </PremiumScrollBackdrop>
      </motion.div>
      </div>

      {clientSecret && (
        <PremiumPaymentModal
          open={modalOpen}
          clientSecret={clientSecret}
          sessionId={sessionId}
          onClose={() => {
            setModalOpen(false);
            setClientSecret(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
