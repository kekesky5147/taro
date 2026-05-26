/**
 * Groq (OpenAI-compatible) 타로 해석 Server Action
 *
 * generateTarotReading:
 *   - 사용자의 intention(고민)과 선택된 카드 3장을 받아
 *   - Groq API로 타로 리딩을 생성하고
 *   - reading_sessions 테이블에 결과를 저장합니다.
 */
"use server";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
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

// ── Groq 클라이언트 (OpenAI-compatible) ───────────────────────────────────────

const AI_MODEL = "llama-3.3-70b-versatile" as const;

const POSITION_LABELS = ["Past", "Present", "Future"] as const;

/** 무료 리딩 1회 = API 1회 (표준 해석 + Sage 초대 티저 동시 생성) */
const COMBINED_MAX_OUTPUT_TOKENS = 1200;
const PREMIUM_MAX_OUTPUT_TOKENS = 4096;

const GROQ_RETRY_ATTEMPTS = 3;
const GROQ_RETRY_BASE_MS = 900;

function getGroqClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    return `${err.status ?? ""} ${err.message}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function mapGroqError(err: unknown): ActionResult<never> {
  const msg = errorMessage(err).toLowerCase();

  if (
    err instanceof OpenAI.APIError &&
    (err.status === 429 || err.code === "rate_limit_exceeded")
  ) {
    return {
      success: false,
      error: "429: Too many requests. Please try again in a moment.",
    };
  }
  if (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("too many requests")
  ) {
    return {
      success: false,
      error: "429: Too many requests. Please try again in a moment.",
    };
  }
  if (
    (err instanceof OpenAI.APIError && err.status === 401) ||
    msg.includes("401") ||
    msg.includes("invalid api key") ||
    msg.includes("api key")
  ) {
    return {
      success: false,
      error: "Authentication failed. Please contact the administrator.",
    };
  }
  if (
    (err instanceof OpenAI.APIError && err.status !== undefined && err.status >= 500) ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("internal server error") ||
    msg.includes("service unavailable")
  ) {
    return {
      success: false,
      error: "The AI service is temporarily unavailable. Please try again in a moment.",
    };
  }
  if (msg.includes("groq_api_key is not configured")) {
    return {
      success: false,
      error: "AI service is not configured. Please contact the administrator.",
    };
  }
  return {
    success: false,
    error: "An error occurred while generating your reading. Please try again.",
  };
}

function isRetryableGroqError(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 429) return true;
    if (err.status !== undefined && err.status >= 500) return true;
  }
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("rate limit") ||
    msg.includes("unavailable") ||
    msg.includes("timeout") ||
    msg.includes("deadline")
  );
}

async function createGroqCompletion(
  maxOutputTokens: number,
  messages: ChatCompletionMessageParam[],
): Promise<string> {
  const openai = getGroqClient();
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature: 0.75,
    max_tokens: maxOutputTokens,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq response is empty.");
  }
  return text;
}

async function generateGroqTextWithRetry(
  maxOutputTokens: number,
  messages: ChatCompletionMessageParam[],
  options?: {
    validate?: (text: string) => boolean;
    logLabel?: string;
  },
): Promise<string> {
  const label = options?.logLabel ?? "Groq";
  let lastErr: unknown;

  for (let attempt = 0; attempt < GROQ_RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, GROQ_RETRY_BASE_MS * attempt),
        );
      }

      const text = await createGroqCompletion(maxOutputTokens, messages);

      if (options?.validate && !options.validate(text)) {
        throw new Error("Groq response incomplete.");
      }

      return text;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableGroqError(err);
      const incomplete =
        err instanceof Error && err.message === "Groq response incomplete.";

      if (attempt < GROQ_RETRY_ATTEMPTS - 1 && (retryable || incomplete)) {
        console.warn(
          `[${label}] ${retryable ? "API" : "incomplete"} error — retry ${attempt + 2}/${GROQ_RETRY_ATTEMPTS}`,
          errorMessage(err),
        );
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
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
  const raw = await generateGroqTextWithRetry(
    COMBINED_MAX_OUTPUT_TOKENS,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
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
    throw new Error("Groq returned an empty reading.");
  }
  return { reading: parsed.reading, easternTeaser: parsed.easternTeaser };
}

// ── Language (forced) ─────────────────────────────────────────────────────────
/**
 * 비용 최소 + 일관성 최대를 위해 리딩 출력 언어를 영어로 고정합니다.
 * (언어 감지/번역/추가 호출 없음)
 */
const FORCED_READING_LANGUAGE = "English" as const;

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
      const language = FORCED_READING_LANGUAGE;

      const userPrompt = `IMPORTANT: Write your ENTIRE response in ${language} only. Do not mix languages.
ABSOLUTE: Do not output ANY non-English words or non-Latin scripts (e.g. Korean/Hangul, Japanese, Chinese, Cyrillic, Arabic). Not even a single character.
If you accidentally include any non-English text, rewrite the entire response in English only before answering.

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
    return mapGroqError(err);
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

    const language = FORCED_READING_LANGUAGE;
    const zodiacLine = session.zodiacSign
      ? `The seeker's zodiac sign is ${session.zodiacSign}. Weave it subtly into the preview.`
      : "No zodiac sign was provided — focus on yin-yang and the five elements only.";

    const teaserPrompt = `You are a tarot reader. Write in ${language} only.

User's concern: "${session.intention}"
Cards: ${cardDescriptions}
${zodiacLine}

An Eastern philosopher beside you is curious about this seeker's fate. Write exactly 2 short sentences in the tarot reader's voice, hinting that inviting the Sage could deepen the reading through yin-yang and the five elements. Warm, inviting — not a full reading. No headers.`;

    const easternTeaser = await generateGroqTextWithRetry(
      200,
      [{ role: "user", content: teaserPrompt }],
      { logLabel: "generateEasternTeaser" },
    );

    await db
      .update(readingSessions)
      .set({ easternTeaser, updatedAt: new Date() })
      .where(eq(readingSessions.id, sessionId));

    return { success: true, data: { easternTeaser } };
  } catch (err) {
    console.error("[generateEasternTeaser] Error:", err);
    const mapped = mapGroqError(err);
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

    const language = FORCED_READING_LANGUAGE;

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
ABSOLUTE: Do not output ANY non-English words or non-Latin scripts (e.g. Korean/Hangul, Japanese, Chinese, Cyrillic, Arabic). Not even a single character.
If you accidentally include any non-English text, rewrite the entire response in English only before answering.

User's concern: "${session.intention}"

Selected cards:
${cardDescriptions}
${zodiacNote}
${standardReading}

Provide "The Sage's Perspective" — a long, saju-style narrative reading (tarot reader + Sage). Use headers ### Past / ### Present / ### Future / ### Message. Complete ALL 4 sections with the required length. Address the seeker's concern throughout.`;

      premiumReading = await generateGroqTextWithRetry(
        PREMIUM_MAX_OUTPUT_TOKENS,
        [
          { role: "system", content: PREMIUM_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
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

    const mapped = mapGroqError(err);
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
