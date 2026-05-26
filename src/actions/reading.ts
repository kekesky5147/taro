/**
 * 타로 리딩 통합 Server Action
 *
 * submitReading:
 *   intention + 선택된 카드 3장(slug, position, isReversed)을 받아
 *   세션 생성 → 카드 저장 → OpenAI 리딩 생성 → 결과 반환을 한 번에 처리합니다.
 */
"use server";

import { db } from "@/lib/db";
import { readingSessions, sessionCards, tarotCards } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { generateTarotReading } from "./ai";
import type { ActionResult } from "@/types/session";
import type { SubmitReadingInput, SubmitReadingResult } from "@/types/reading";

// ── 입력값 검증 스키마 ────────────────────────────────────────────────────────

const cardInputSchema = z.object({
  slug: z.string().min(1),
  position: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  isReversed: z.boolean(),
});

const submitReadingSchema = z.object({
  intention: z
    .string()
    .min(2, "Please enter at least 2 characters.")
    .max(1000, "Your question must be 1000 characters or fewer.")
    .trim(),
  cards: z
    .array(cardInputSchema)
    .length(3, "Please select all 3 cards."),
  zodiacSign: z.string().max(30).optional(),
});

// ── 메인 액션 ─────────────────────────────────────────────────────────────────

/**
 * 카드 3장 선택 완료 후 "결과보기" 버튼 클릭 시 호출됩니다.
 *
 * 1. slug 배열로 DB의 card_id 일괄 조회
 * 2. reading_sessions 테이블에 세션 생성 (status: 'completed')
 * 3. session_cards 테이블에 카드 3장 일괄 저장
 * 4. generateTarotReading으로 OpenAI 리딩 생성 및 DB 업데이트
 * 5. { sessionId, reading } 반환
 */
export async function submitReading(
  input: SubmitReadingInput,
): Promise<ActionResult<SubmitReadingResult>> {
  // 1. 입력값 검증
  const parsed = submitReadingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { intention, cards, zodiacSign } = parsed.data;

  try {
    // 2. slug → DB card_id 일괄 조회
    const slugs = cards.map((c) => c.slug);
    const dbCards = await db
      .select({ id: tarotCards.id, slug: tarotCards.slug })
      .from(tarotCards)
      .where(inArray(tarotCards.slug, slugs));

    // slug가 DB에 없는 경우 (시드가 아직 실행되지 않았거나 오타)
    const missingSlug = slugs.find(
      (s) => !dbCards.find((d) => d.slug === s),
    );
    if (missingSlug) {
      return {
        success: false,
        error: `Card data not found (slug: ${missingSlug}). Please ensure the database seed has been run.`,
      };
    }

    // 3. reading_sessions 생성 (status: 'completed')
    const [session] = await db
      .insert(readingSessions)
      .values({
        intention,
        status: "completed",
        zodiacSign: zodiacSign?.trim() || null,
      })
      .returning({ id: readingSessions.id });

    if (!session) {
      throw new Error("Failed to create session.");
    }

    // 4. session_cards 일괄 삽입
    await db.insert(sessionCards).values(
      cards.map((c) => ({
        sessionId: session.id,
        cardId: dbCards.find((d) => d.slug === c.slug)!.id,
        position: c.position,
        isReversed: c.isReversed,
      })),
    );

    // 5. Gemini 리딩 생성 (ai.ts의 generateTarotReading 재사용)
    // Gemini 1회: 표준 리딩 + Sage 초대 티저 동시 생성
    const aiResult = await generateTarotReading(session.id);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error };
    }

    const [saved] = await db
      .select({
        isPremium: readingSessions.isPremium,
        premiumReading: readingSessions.premiumReading,
        easternTeaser: readingSessions.easternTeaser,
      })
      .from(readingSessions)
      .where(eq(readingSessions.id, session.id))
      .limit(1);

    return {
      success: true,
      data: {
        sessionId: session.id,
        reading: aiResult.data.reading,
        easternTeaser: saved?.easternTeaser ?? aiResult.data.easternTeaser,
        isPremium: saved?.isPremium ?? false,
        premiumReading: saved?.premiumReading ?? null,
      },
    };
  } catch (err) {
    console.error("[submitReading] Error:", err);
    return {
      success: false,
      error: "An error occurred while generating your reading. Please try again.",
    };
  }
}
