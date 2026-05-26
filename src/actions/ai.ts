/**
 * Gemini 타로 해석 Server Action
 *
 * generateTarotReading:
 *   - 사용자의 intention(고민)과 선택된 카드 3장을 받아
 *   - Gemini API로 동양철학적 관점의 타로 리딩을 생성하고
 *   - reading_sessions 테이블에 결과를 저장합니다.
 */
"use server";

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { db } from "@/lib/db";
import { readingSessions, sessionCards, tarotCards } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "@/types/session";
import {
  buildCardComboCacheKey,
  getMockPremiumReading,
  getMockReading,
  isDevelopmentReadingMode,
  resolveCachedOrMockPremiumReading,
  resolveCachedOrMockReading,
  setCachedPremiumReading,
  setCachedReading,
  type CachedReadingPayload,
  type ReadingResolveSource,
} from "@/lib/reading-response-cache";
import {
  isCompletePremiumReading,
  isCompleteStandardReading,
} from "@/lib/reading-sections";

// ── Gemini 클라이언트 ─────────────────────────────────────────────────────────

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ── 상수 ─────────────────────────────────────────────────────────────────────

const AI_MODEL = "gemini-2.5-flash" as const;

const POSITION_LABELS = ["Past", "Present", "Future"] as const;

/** 무료 리딩 1회 = API 1회 (표준 해석 + Sage 초대 티저 동시 생성) */
const COMBINED_MAX_OUTPUT_TOKENS = 1200;
const PREMIUM_MAX_OUTPUT_TOKENS = 4096;

const geminiSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
] as const;

function mapGeminiError(err: unknown): ActionResult<never> {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
    return { success: false, error: "429: Too many requests. Please try again in a moment." };
  }
  if (msg.includes("401") || msg.toLowerCase().includes("api key")) {
    return { success: false, error: "Authentication failed. Please contact the administrator." };
  }
  if (
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("Internal Server Error")
  ) {
    return {
      success: false,
      error: "The AI service is temporarily unavailable. Please try again in a moment.",
    };
  }
  return { success: false, error: "An error occurred while generating your reading. Please try again." };
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("Internal Server Error") ||
    msg.toLowerCase().includes("unavailable") ||
    msg.toLowerCase().includes("deadline")
  );
}

const GEMINI_RETRY_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 900;

async function generateGeminiTextWithRetry(
  maxOutputTokens: number,
  prompt: string,
  options?: {
    validate?: (text: string) => boolean;
    logLabel?: string;
  },
): Promise<string> {
  const model = getGeminiModel(maxOutputTokens);
  const label = options?.logLabel ?? "Gemini";
  let lastErr: unknown;

  for (let attempt = 0; attempt < GEMINI_RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, GEMINI_RETRY_BASE_MS * attempt),
        );
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (!text) {
        throw new Error("Gemini response is empty.");
      }

      if (options?.validate && !options.validate(text)) {
        throw new Error("Gemini response incomplete.");
      }

      return text;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableGeminiError(err);
      const incomplete =
        err instanceof Error && err.message === "Gemini response incomplete.";

      if (attempt < GEMINI_RETRY_ATTEMPTS - 1 && (retryable || incomplete)) {
        console.warn(
          `[${label}] ${retryable ? "API" : "incomplete"} error — retry ${attempt + 2}/${GEMINI_RETRY_ATTEMPTS}`,
        );
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}

function getGeminiModel(maxOutputTokens: number) {
  return genai.getGenerativeModel(
    {
      model: AI_MODEL,
      generationConfig: { temperature: 0.75, maxOutputTokens },
      safetySettings: [...geminiSafetySettings],
    },
    { apiVersion: "v1beta" },
  );
}

/** ### Sage Invitation 이하를 티저로 분리 */
async function persistReadingToSession(
  sessionId: string,
  { reading, easternTeaser }: CachedReadingPayload,
  aiModel: string = AI_MODEL,
): Promise<void> {
  await db
    .update(readingSessions)
    .set({
      aiReading: reading,
      easternTeaser,
      aiModel,
      status: "revealed",
      updatedAt: new Date(),
    })
    .where(eq(readingSessions.id, sessionId));
}

function parseCombinedReading(raw: string): { reading: string; easternTeaser: string | null } {
  const marker = /###\s*Sage Invitation\s*/i;
  const idx = raw.search(marker);
  if (idx === -1) {
    return { reading: raw.trim(), easternTeaser: null };
  }
  const reading = raw.slice(0, idx).trim();
  const easternTeaser = raw.slice(idx).replace(marker, "").trim() || null;
  return { reading, easternTeaser };
}

async function generateCombinedReadingFromApi(
  systemPrompt: string,
  userPrompt: string,
): Promise<CachedReadingPayload> {
  const raw = await generateGeminiTextWithRetry(
    COMBINED_MAX_OUTPUT_TOKENS,
    `${systemPrompt}\n\n${userPrompt}`,
    {
      logLabel: "generateTarotReading",
      validate: (text) => {
        const parsed = parseCombinedReading(text);
        return isCompleteStandardReading(parsed.reading, parsed.easternTeaser);
      },
    },
  );

  const parsed = parseCombinedReading(raw);
  if (!parsed.reading) {
    throw new Error("Gemini returned an empty reading.");
  }
  return { reading: parsed.reading, easternTeaser: parsed.easternTeaser };
}

// ── 언어 감지 ─────────────────────────────────────────────────────────────────

function detectLanguage(text: string): string {
  if (/[\uAC00-\uD7A3]/.test(text)) return "Korean";
  if (/[\u3040-\u30FF\u31F0-\u31FF]/.test(text)) return "Japanese";
  if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese";
  if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
  if (/[\u0400-\u04FF]/.test(text)) return "Russian";
  return "English";
}

// ── 시스템 프롬프트 ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional tarot reader giving a standard three-card reading (Past, Present, Future).

[Your Role]
- In ### Past through ### Message: tarot reader only. Clear, warm tarot symbolism. No Eastern philosopher yet.
- In ### Sage Invitation only: the reader notices an Eastern philosopher nearby and invites a deeper reading.

[Language Rule]
- The user prompt will tell you which language to use. Write every word in that language only.

[Absolute Rules]
- Complete ALL 5 sections without stopping.
- Past/Present/Future: 1~2 sentences each. Message: 1 sentence. Sage Invitation: exactly 2 short sentences.

[Output Format — use these exact headers in order]
### Past
### Present
### Future
### Message
### Sage Invitation`;

// ── 입력값 검증 스키마 ────────────────────────────────────────────────────────

const generateReadingSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID."),
});

// ── 메인 액션 ─────────────────────────────────────────────────────────────────

/**
 * 타로 리딩을 생성하고 DB에 저장합니다.
 *
 * @param sessionId - 카드 3장이 선택 완료된 세션 ID
 * @returns 생성된 리딩 텍스트
 */
export async function generateTarotReading(
  sessionId: string,
): Promise<ActionResult<{ reading: string; sessionId: string; easternTeaser: string | null }>> {
  // 1. 입력값 검증
  const parsed = generateReadingSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    // 2. 세션 조회
    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
      with: { cards: true },
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    // 3. 이미 생성된 완전한 리딩이 있으면 DB 캐시 반환 (API 호출 없음)
    if (
      session.status === "revealed" &&
      session.aiReading &&
      isCompleteStandardReading(session.aiReading, session.easternTeaser)
    ) {
      return {
        success: true,
        data: {
          reading: session.aiReading,
          sessionId,
          easternTeaser: session.easternTeaser ?? null,
        },
      };
    }

    // 4. 카드 3장 선택 여부 확인
    if (session.cards.length < 3) {
      return {
        success: false,
        error: `Only ${session.cards.length} card(s) selected. Please select all 3 cards.`,
      };
    }

    // 5. 선택된 카드 상세 정보 조회
    const cardIds = session.cards.map((c) => c.cardId);
    const cardDetails = await db
      .select()
      .from(tarotCards)
      .where(inArray(tarotCards.id, cardIds));

    // 6. position 순서로 카드 정렬 (0=과거, 1=현재, 2=미래)
    const orderedCards = session.cards
      .sort((a, b) => a.position - b.position)
      .map((sc) => {
        const detail = cardDetails.find((c) => c.id === sc.cardId);
        if (!detail) throw new Error(`Card not found for ID ${sc.cardId}.`);
        return { ...sc, detail };
      });

    // 7. 프롬프트 구성
    const cardDescriptions = orderedCards
      .map((sc, i) => {
        const isUpright = !sc.isReversed;
        const keywords = (
          isUpright ? sc.detail.uprightKeywords : sc.detail.reversedKeywords
        ) as string[];
        const lines = [
          `[${POSITION_LABELS[i]}] ${sc.detail.name} (${isUpright ? "upright" : "reversed"})`,
          `Keywords: ${keywords.join(", ")}`,
          `Meaning: ${isUpright ? sc.detail.uprightMeaning : sc.detail.reversedMeaning}`,
        ].filter(Boolean);

        return lines.join("\n");
      })
      .join("\n\n---\n\n");

    const cacheKey = buildCardComboCacheKey(
      orderedCards.map((sc) => ({
        slug: sc.detail.slug,
        position: sc.position,
        isReversed: sc.isReversed,
      })),
    );

    let reading: string;
    let easternTeaser: string | null;
    let source: ReadingResolveSource;

    const resolved = await resolveCachedOrMockReading(cacheKey);
    if (
      resolved &&
      isCompleteStandardReading(
        resolved.payload.reading,
        resolved.payload.easternTeaser,
      )
    ) {
      ({ reading, easternTeaser } = resolved.payload);
      source = resolved.source;
    } else {
      const language = detectLanguage(session.intention);

      const userPrompt = `IMPORTANT: Write your ENTIRE response in ${language} only. Do not mix languages.

User's concern: "${session.intention}"

Selected cards:
${cardDescriptions}

Write the full output: ### Past / ### Present / ### Future / ### Message / ### Sage Invitation. Complete ALL 5 sections. Every word must be in ${language}.`;

      const payload = await generateCombinedReadingFromApi(SYSTEM_PROMPT, userPrompt);
      reading = payload.reading;
      easternTeaser = payload.easternTeaser;

      await setCachedReading(cacheKey, { reading, easternTeaser });
      source = "api";
    }

    if (process.env.NODE_ENV === "development") {
      console.info(`[generateTarotReading] source=${source} cacheKey=${cacheKey}`);
    }

    await persistReadingToSession(sessionId, { reading, easternTeaser });

    return {
      success: true,
      data: { reading, sessionId, easternTeaser },
    };
  } catch (err) {
    console.error("[generateTarotReading] Error:", err);
    if (isDevelopmentReadingMode()) {
      const mock = await getMockReading();
      if (mock) {
        console.warn("[generateTarotReading] API failed — using mock fallback");
        await persistReadingToSession(sessionId, mock);
        return {
          success: true,
          data: { reading: mock.reading, sessionId, easternTeaser: mock.easternTeaser },
        };
      }
    }
    return mapGeminiError(err);
  }
}

// ── Sage 티저 (레거시·보조 — 신규 세션은 generateTarotReading에서 함께 생성) ───

/**
 * 티저만 없는 기존 세션용. 신규 리딩은 API 1회로 표준+티저를 함께 받습니다.
 */
export async function generateEasternTeaser(
  sessionId: string,
): Promise<ActionResult<{ easternTeaser: string }>> {
  const parsed = generateReadingSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid session ID." };
  }

  try {
    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
      with: { cards: true },
    });

    if (!session) return { success: false, error: "Session not found." };
    if (session.easternTeaser) {
      return { success: true, data: { easternTeaser: session.easternTeaser } };
    }
    if (session.cards.length < 3) {
      return { success: false, error: "All 3 cards must be selected." };
    }

    const cardIds = session.cards.map((c) => c.cardId);
    const cardDetails = await db
      .select()
      .from(tarotCards)
      .where(inArray(tarotCards.id, cardIds));

    const orderedCards = session.cards
      .sort((a, b) => a.position - b.position)
      .map((sc) => {
        const detail = cardDetails.find((c) => c.id === sc.cardId);
        if (!detail) throw new Error(`Card ID ${sc.cardId} not found.`);
        return { ...sc, detail };
      });

    const cardDescriptions = orderedCards
      .map((sc, i) => {
        const isUpright = !sc.isReversed;
        return `[${POSITION_LABELS[i]}] ${sc.detail.name} — ${isUpright ? sc.detail.uprightMeaning : sc.detail.reversedMeaning}`;
      })
      .join("\n");

    const language = detectLanguage(session.intention);
    const zodiacLine = session.zodiacSign
      ? `The seeker's zodiac sign is ${session.zodiacSign}. Weave it subtly into the preview.`
      : "No zodiac sign was provided — focus on yin-yang and the five elements only.";

    const teaserPrompt = `You are a tarot reader. Write in ${language} only.

User's concern: "${session.intention}"
Cards: ${cardDescriptions}
${zodiacLine}

An Eastern philosopher beside you is curious about this seeker's fate. Write exactly 2 short sentences in the tarot reader's voice, hinting that inviting the Sage could deepen the reading through yin-yang and the five elements. Warm, inviting — not a full reading. No headers.`;

    const model = getGeminiModel(200);
    const result = await model.generateContent(teaserPrompt);
    const easternTeaser = result.response.text()?.trim();
    if (!easternTeaser) throw new Error("Eastern teaser response is empty.");

    await db
      .update(readingSessions)
      .set({ easternTeaser, updatedAt: new Date() })
      .where(eq(readingSessions.id, sessionId));

    return { success: true, data: { easternTeaser } };
  } catch (err) {
    console.error("[generateEasternTeaser] Error:", err);
    const mapped = mapGeminiError(err);
    if (!mapped.success) return mapped;
    return { success: false, error: "Failed to generate Eastern preview." };
  }
}

// ── 프리미엄 동양철학 해석 ───────────────────────────────────────────────────

const PREMIUM_SYSTEM_PROMPT = `You are a tarot reader who has invited an Eastern philosopher (the Sage) to sit beside you. Together you offer "The Sage's Perspective" — a premium reading as long, rich, and narrative as a traditional Korean saju (사주) or fortune consultation: story-like, layered, and deeply personal.

[Your Role]
- Primary voice: the tarot reader. Weave in the Sage's voice regularly (yin-yang 陰陽, five elements 五行, seasonal energy, balance).
- Do NOT give a short summary. Expand. Use imagery, metaphor, and gentle guidance like a master telling the seeker's life-thread across time.

[Voice & Style — like 사주풀이]
- Flowing prose, not bullet points. Paragraphs that build on each other.
- Pattern within each section: open with the card's tarot meaning → the Sage's Eastern reading → how this connects to the seeker's concern → practical or emotional insight → a line that bridges to the next beat.
- Phrases such as "곁에 앉은 현자가 말하길..." / "The Sage beside me murmurs..." / "이 카드의 기운을 오행으로 보면..." are welcome.
- Warm, reverent, unhurried — the seeker paid for depth.

[Language Rule]
- Write entirely in the language specified in the user prompt.

[Length — mandatory]
- ### Past: at least 6~8 sentences (one rich paragraph or two).
- ### Present: at least 6~8 sentences.
- ### Future: at least 6~8 sentences.
- ### Message: at least 4~6 sentences — a closing blessing and clear counsel tying Past, Present, Future together.
- Total reading should feel substantially longer than the free standard reading.

[Output Format — use these exact headers in order]
### Past
### Present
### Future
### Message`;

/**
 * 프리미엄 결제 후 동양철학 심층 해석을 생성하고 DB에 저장합니다.
 */
export async function generatePremiumReading(
  sessionId: string,
): Promise<ActionResult<{ premiumReading: string }>> {
  const parsed = generateReadingSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid session ID.",
    };
  }

  try {
    const session = await db.query.readingSessions.findFirst({
      where: eq(readingSessions.id, sessionId),
      with: { cards: true },
    });

    if (!session) {
      return { success: false, error: "Session not found." };
    }

    if (session.premiumReading) {
      return {
        success: true,
        data: { premiumReading: session.premiumReading },
      };
    }

    if (session.cards.length < 3) {
      return { success: false, error: "All 3 cards must be selected." };
    }

    const cardIds = session.cards.map((c) => c.cardId);
    const cardDetails = await db
      .select()
      .from(tarotCards)
      .where(inArray(tarotCards.id, cardIds));

    const orderedCards = session.cards
      .sort((a, b) => a.position - b.position)
      .map((sc) => {
        const detail = cardDetails.find((c) => c.id === sc.cardId);
        if (!detail) throw new Error(`Card ID ${sc.cardId} not found.`);
        return { ...sc, detail };
      });

    const cardDescriptions = orderedCards
      .map((sc, i) => {
        const isUpright = !sc.isReversed;
        const keywords = (
          isUpright ? sc.detail.uprightKeywords : sc.detail.reversedKeywords
        ) as string[];
        const lines = [
          `[${POSITION_LABELS[i]}] ${sc.detail.name} (${isUpright ? "upright" : "reversed"})`,
          `Element: ${sc.detail.element ?? "unknown"}`,
          `Keywords: ${keywords.join(", ")}`,
          sc.detail.easternInterpretation
            ? `Eastern meaning: ${sc.detail.easternInterpretation}`
            : null,
          `Meaning: ${isUpright ? sc.detail.uprightMeaning : sc.detail.reversedMeaning}`,
        ].filter(Boolean);

        return lines.join("\n");
      })
      .join("\n\n---\n\n");

    const language = detectLanguage(session.intention);

    const zodiacNote = session.zodiacSign
      ? `\nThe Sage may also reference the seeker's zodiac sign (${session.zodiacSign}) where it enriches the five-element reading.`
      : "";

    const standardReading = session.aiReading
      ? `\nStandard reading (summary — extend, do not contradict):\n${session.aiReading.slice(0, 1200)}\n\nBuild The Sage's Perspective as a deeper layer on this foundation.`
      : "";

    const cacheKey = buildCardComboCacheKey(
      orderedCards.map((sc) => ({
        slug: sc.detail.slug,
        position: sc.position,
        isReversed: sc.isReversed,
      })),
    );

    let premiumReading: string;
    let source: ReadingResolveSource;

    const resolved = await resolveCachedOrMockPremiumReading(cacheKey);
    if (resolved && isCompletePremiumReading(resolved.payload.premiumReading)) {
      premiumReading = resolved.payload.premiumReading;
      source = resolved.source;
    } else {
      const userPrompt = `IMPORTANT: Write your ENTIRE response in ${language} only.

User's concern: "${session.intention}"

Selected cards:
${cardDescriptions}
${zodiacNote}
${standardReading}

Provide "The Sage's Perspective" — a long, saju-style narrative reading (tarot reader + Sage). Use headers ### Past / ### Present / ### Future / ### Message. Complete ALL 4 sections with the required length. Address the seeker's concern throughout.`;

      premiumReading = await generateGeminiTextWithRetry(
        PREMIUM_MAX_OUTPUT_TOKENS,
        `${PREMIUM_SYSTEM_PROMPT}\n\n${userPrompt}`,
        {
          logLabel: "generatePremiumReading",
          validate: isCompletePremiumReading,
        },
      );

      await setCachedPremiumReading(cacheKey, { premiumReading });
      source = "api";
    }

    if (isDevelopmentReadingMode()) {
      console.info(`[generatePremiumReading] source=${source} cacheKey=${cacheKey}`);
    }

    await db
      .update(readingSessions)
      .set({
        premiumReading,
        isPremium: true,
        updatedAt: new Date(),
      })
      .where(eq(readingSessions.id, sessionId));

    return {
      success: true,
      data: { premiumReading },
    };
  } catch (err) {
    console.error("[generatePremiumReading] Error:", err);

    const allowMockFallback =
      isDevelopmentReadingMode() ||
      process.env.PREMIUM_MOCK_ON_FAILURE === "true";

    if (allowMockFallback) {
      const mock = await getMockPremiumReading();
      if (mock) {
        console.warn("[generatePremiumReading] API failed — using mock fallback");
        await db
          .update(readingSessions)
          .set({
            premiumReading: mock.premiumReading,
            isPremium: true,
            updatedAt: new Date(),
          })
          .where(eq(readingSessions.id, sessionId));
        return { success: true, data: { premiumReading: mock.premiumReading } };
      }
    }

    const mapped = mapGeminiError(err);
    if (!mapped.success) {
      return { success: false, error: mapped.error };
    }
    return { success: false, error: "Failed to generate premium reading. Please try again." };
  }
}

// ── 보조 액션: 세션 상태 확인 ─────────────────────────────────────────────────

/**
 * 세션의 리딩 상태를 폴링할 때 사용합니다.
 * 이미 생성된 리딩이 있으면 즉시 반환합니다.
 */
export async function getReadingStatus(
  sessionId: string,
): Promise<ActionResult<{ status: string; reading: string | null }>> {
  const parsed = generateReadingSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return { success: false, error: "Invalid session ID." };
  }

  try {
    const session = await db
      .select({
        status: readingSessions.status,
        aiReading: readingSessions.aiReading,
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
        status: session[0].status,
        reading: session[0].aiReading,
      },
    };
  } catch (err) {
    console.error("[getReadingStatus] Error:", err);
    return { success: false, error: "Failed to load reading status. Please try again." };
  }
}
