/**
 * Premium Eastern Philosophy — Stripe 결제 및 잠금 해제 Server Actions
 */
"use server";

import Stripe from "stripe";
import { db } from "@/lib/db";
import { readingSessions } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generatePremiumReading } from "./ai";
import { shouldSkipPaymentInDev } from "@/lib/payment-mode";
import type { ActionResult } from "@/types/session";

const sessionIdSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
});

const unlockSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
  paymentIntentId: z.string().min(1, "Payment intent ID is required."),
});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("your_key_here")) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key);
}

function getPremiumPriceCents(): number {
  const cents = parseInt(process.env.STRIPE_PREMIUM_PRICE_CENTS ?? "99", 10);
  return Number.isFinite(cents) && cents > 0 ? cents : 99;
}

/**
 * 개발 환경 전용 — Stripe 없이 프리미엄 해석 생성·잠금 해제 (UI 테스트)
 */
export async function unlockPremiumDev(
  sessionId: string,
): Promise<ActionResult<{ premiumReading: string; isPremium: true }>> {
  if (!shouldSkipPaymentInDev()) {
    return { success: false, error: "Dev unlock is only available in development." };
  }

  const parsed = sessionIdSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session ID.",
    };
  }

  try {
    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    if (session.isPremium && session.premiumReading) {
      return {
        success: true,
        data: { premiumReading: session.premiumReading, isPremium: true },
      };
    }

    const aiResult = await generatePremiumReading(sessionId);
    if (!aiResult.success) {
      return { success: false, error: aiResult.error };
    }

    await db
      .update(readingSessions)
      .set({
        isPremium: true,
        stripePaymentIntentId: "dev_skip_payment",
        updatedAt: new Date(),
      })
      .where(eq(readingSessions.id, sessionId));

    return {
      success: true,
      data: { premiumReading: aiResult.data.premiumReading, isPremium: true },
    };
  } catch (err) {
    console.error("[unlockPremiumDev] Error:", err);
    return {
      success: false,
      error: "Failed to unlock premium in development mode.",
    };
  }
}

/**
 * Stripe Payment Intent 생성 — 클라이언트 모달용 clientSecret 반환
 */
export async function createPaymentIntent(
  sessionId: string,
): Promise<ActionResult<{ clientSecret: string }>> {
  const parsed = sessionIdSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    if (shouldSkipPaymentInDev()) {
      return {
        success: false,
        error: "Use unlockPremiumDev in development instead of payment.",
      };
    }

    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    if (session.status !== "revealed") {
      return {
        success: false,
        error: "Complete your free reading before unlocking premium.",
      };
    }

    if (session.isPremium && session.premiumReading) {
      return {
        success: false,
        error: "Premium reading is already unlocked for this session.",
      };
    }

    const stripe = getStripe();
    const amount = getPremiumPriceCents();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { sessionId },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    await db
      .update(readingSessions)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })
      .where(eq(readingSessions.id, sessionId));

    return {
      success: true,
      data: { clientSecret: paymentIntent.client_secret },
    };
  } catch (err) {
    console.error("[createPaymentIntent] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg.includes("STRIPE")
        ? "Payment is not configured. Please contact support."
        : "Could not start payment. Please try again.",
    };
  }
}

/**
 * 결제 검증 후 프리미엄 해석 생성 및 DB 업데이트
 */
export async function unlockPremium(
  sessionId: string,
  paymentIntentId: string,
): Promise<ActionResult<{ premiumReading: string; isPremium: true }>> {
  const parsed = unlockSchema.safeParse({ sessionId, paymentIntentId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    if (session.isPremium && session.premiumReading) {
      return {
        success: true,
        data: {
          premiumReading: session.premiumReading,
          isPremium: true,
        },
      };
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      return {
        success: false,
        error: "Payment was not completed. Please try again.",
      };
    }

    if (intent.metadata?.sessionId !== sessionId) {
      return {
        success: false,
        error: "Payment does not match this reading session.",
      };
    }

    const aiResult = await generatePremiumReading(sessionId);
    if (!aiResult.success) {
      return { success: false, error: aiResult.error };
    }

    await db
      .update(readingSessions)
      .set({
        isPremium: true,
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(readingSessions.id, sessionId));

    return {
      success: true,
      data: {
        premiumReading: aiResult.data.premiumReading,
        isPremium: true,
      },
    };
  } catch (err) {
    console.error("[unlockPremium] Error:", err);
    return {
      success: false,
      error: "Failed to unlock premium reading. Please try again.",
    };
  }
}

/**
 * 세션의 프리미엄 상태 조회 (페이지 새로고침 시)
 */
export async function getPremiumStatus(
  sessionId: string,
): Promise<
  ActionResult<{
    isPremium: boolean;
    premiumReading: string | null;
    easternTeaser: string | null;
  }>
> {
  const parsed = sessionIdSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session ID.",
    };
  }

  try {
    const session = await db
      .select({
        isPremium: readingSessions.isPremium,
        premiumReading: readingSessions.premiumReading,
        easternTeaser: readingSessions.easternTeaser,
      })
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      return { success: false, error: "Session not found." };
    }

    return {
      success: true,
      data: {
        isPremium: session[0].isPremium,
        premiumReading: session[0].premiumReading,
        easternTeaser: session[0].easternTeaser,
      },
    };
  } catch (err) {
    console.error("[getPremiumStatus] Error:", err);
    return { success: false, error: "Failed to load premium status." };
  }
}
