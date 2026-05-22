"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { unlockPremium } from "@/actions/premium";
import { cinematicEase, easternTheme } from "./premium-eastern-theme";

const stripePromise =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("your_key_here")
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

function CheckoutForm({
  sessionId,
  onSuccess,
  onClose,
}: {
  sessionId: string;
  onSuccess: (reading: string) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setProcessing(false);
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setError("Payment was not completed.");
      setProcessing(false);
      return;
    }

    const result = await unlockPremium(sessionId, paymentIntent.id);
    if (!result.success) {
      setError(result.error);
      setProcessing(false);
      return;
    }

    onSuccess(result.data.premiumReading);
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p className="text-center text-xs" style={{ color: "oklch(0.65 0.12 25 / 0.9)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="flex-1 rounded-full border px-4 py-2.5 text-xs tracking-wide disabled:opacity-50"
          style={{
            borderColor: easternTheme.goldDim,
            color: easternTheme.offWhiteMuted,
            background: "oklch(0.08 0.02 45 / 0.5)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium tracking-wide disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, oklch(0.55 0.12 70), oklch(0.45 0.1 55))`,
            color: easternTheme.offWhite,
            boxShadow: `0 0 20px ${easternTheme.goldGlow}`,
            border: `1px solid ${easternTheme.goldDim}`,
          }}
        >
          {processing ? "Processing..." : "Pay $0.99"}
        </button>
      </div>
    </form>
  );
}

function PaymentElementsWrapper({
  clientSecret,
  sessionId,
  onClose,
  onSuccess,
}: {
  clientSecret: string;
  sessionId: string;
  onClose: () => void;
  onSuccess: (reading: string) => void;
}) {
  if (!stripePromise) {
    return (
      <p className="text-center text-sm" style={{ color: easternTheme.offWhiteMuted }}>
        Stripe is not configured. Add your API keys to .env.local.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: easternTheme.gold,
            colorBackground: easternTheme.ink,
            colorText: easternTheme.offWhite,
            borderRadius: "12px",
          },
        },
      }}
    >
      <CheckoutForm sessionId={sessionId} onSuccess={onSuccess} onClose={onClose} />
    </Elements>
  );
}

export type PremiumPaymentModalProps = {
  open: boolean;
  clientSecret: string;
  sessionId: string;
  onClose: () => void;
  onSuccess: (reading: string) => void;
};

export function PremiumPaymentModal({
  open,
  clientSecret,
  sessionId,
  onClose,
  onSuccess,
}: PremiumPaymentModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-300 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0.03 0.01 40 / 0.92)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.28, ease: cinematicEase }}
            className="relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-8"
            style={{
              background: easternTheme.parchment,
              border: `1px solid ${easternTheme.goldDim}`,
              boxShadow: `0 0 60px ${easternTheme.goldGlow}, 0 24px 48px rgba(0,0,0,0.55)`,
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-1 text-center font-serif text-lg"
              style={{ color: easternTheme.gold }}
            >
              Eastern Wisdom
            </h3>
            <p
              className="mb-6 text-center text-xs tracking-wide"
              style={{ color: easternTheme.offWhiteMuted }}
            >
              Unlock the scroll · $0.99
            </p>
            <PaymentElementsWrapper
              clientSecret={clientSecret}
              sessionId={sessionId}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
