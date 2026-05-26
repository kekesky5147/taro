"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripePaymentElementOptions } from "@stripe/stripe-js";
import { generatePremiumReading } from "@/actions/ai";
import { unlockPremium } from "@/actions/premium";
import { cinematicEase, easternTheme } from "./premium-eastern-theme";

type CheckoutPhase = "idle" | "paying" | "generating";

/** 모바일 키보드 대응 — tabs + 최소 세로 높이 (이메일·영수증 필드 유지) */
const stripeAppearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: easternTheme.gold,
    colorBackground: easternTheme.ink,
    colorText: easternTheme.offWhite,
    colorTextSecondary: easternTheme.offWhiteMuted,
    borderRadius: "6px",
    fontSizeBase: "15px",
    fontSizeSm: "12px",
    fontSizeXs: "11px",
    spacingUnit: "2px",
    gridColumnSpacing: "6px",
    gridRowSpacing: "4px",
    tabSpacing: "2px",
    fontLineHeight: "1.25",
  },
  rules: {
    ".Input": {
      padding: "6px 8px",
      boxShadow: "none",
      fontSize: "15px",
      lineHeight: "1.25",
    },
    ".Label": {
      marginBottom: "1px",
      fontSize: "11px",
      lineHeight: "1.2",
    },
    ".Block": {
      padding: "4px 6px",
    },
    ".Tab": {
      padding: "4px 6px",
    },
    ".TabLabel": {
      fontSize: "11px",
      lineHeight: "1.2",
    },
    ".TabIcon": {
      width: "1.1rem",
    },
    ".Error": {
      fontSize: "11px",
      marginTop: "2px",
      lineHeight: "1.25",
    },
    ".Text": {
      fontSize: "11px",
      lineHeight: "1.25",
    },
  },
};

const paymentElementOptions: StripePaymentElementOptions = {
  layout: "tabs",
  fields: {
    billingDetails: {
      email: "auto",
      name: "never",
      phone: "never",
      address: "never",
    },
  },
};

const stripePromise =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes("your_key_here")
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, { locale: "en" })
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
  const [phase, setPhase] = useState<CheckoutPhase>("idle");

  const isBusy = phase !== "idle";
  const payLabel =
    phase === "paying"
      ? "Confirming payment..."
      : phase === "generating"
        ? "Generating reading..."
        : "Pay $0.99";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isBusy) return;

    setPhase("paying");
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Please check your payment details.");
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Payment failed.");
        return;
      }

      if (!paymentIntent) {
        setError("Payment was not completed.");
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setError("Payment was not completed. Please try again.");
        return;
      }

      setPhase("generating");

      const unlock = await unlockPremium(sessionId, paymentIntent.id);
      if (!unlock.success) {
        setError(unlock.error);
        return;
      }

      if (unlock.data.premiumReading) {
        onSuccess(unlock.data.premiumReading);
        return;
      }

      const generated = await generatePremiumReading(sessionId);
      if (!generated.success) {
        setError(generated.error);
        return;
      }

      onSuccess(generated.data.premiumReading);
    } catch (err) {
      console.error("[CheckoutForm] Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPhase("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:gap-3">
      <PaymentElement options={paymentElementOptions} />
      {error && (
        <p className="text-center text-xs" style={{ color: "oklch(0.65 0.12 25 / 0.9)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border px-3 py-2 text-xs tracking-wide sm:px-4 sm:py-2.5"
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
          disabled={!stripe || isBusy}
          className="flex-1 rounded-full px-3 py-2 text-xs font-medium tracking-wide disabled:opacity-50 sm:px-4 sm:py-2.5"
          style={{
            background: `linear-gradient(135deg, oklch(0.55 0.12 70), oklch(0.45 0.1 55))`,
            color: easternTheme.offWhite,
            boxShadow: `0 0 20px ${easternTheme.goldGlow}`,
            border: `1px solid ${easternTheme.goldDim}`,
          }}
        >
          {payLabel}
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

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: stripeAppearance,
    /** 브라우저가 ko여도 결제 UI는 앱과 같이 영어로 */
    locale: "en",
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
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
          className="fixed inset-0 z-300 flex items-end justify-center overflow-y-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:px-4 sm:py-8"
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
            className="relative z-10 my-auto w-full max-w-md max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl p-4 sm:max-h-[min(90dvh,40rem)] sm:p-6"
            style={{
              background: easternTheme.parchment,
              border: `1px solid ${easternTheme.goldDim}`,
              boxShadow: `0 0 60px ${easternTheme.goldGlow}, 0 24px 48px rgba(0,0,0,0.55)`,
              backdropFilter: "blur(20px)",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-0.5 text-center font-serif text-base sm:text-lg"
              style={{ color: easternTheme.gold }}
            >
              Eastern Wisdom
            </h3>
            <p
              className="mb-4 text-center text-[11px] tracking-wide sm:mb-5 sm:text-xs"
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
