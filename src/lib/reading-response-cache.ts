import "server-only";

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type CachedReadingPayload = {
  reading: string;
  easternTeaser: string | null;
};

export type ReadingResolveSource = "mock" | "cache" | "api";

export type CardSlotForCache = {
  slug: string;
  position: number;
  isReversed: boolean;
};

const memoryCache = new Map<string, CachedReadingPayload>();

const DATA_DIR = path.join(process.cwd(), "src/data");
const CACHE_FILE = path.join(DATA_DIR, "cache.json");
const MOCK_FILE = path.join(DATA_DIR, "mock-reading.json");
const MOCK_PREMIUM_FILE = path.join(DATA_DIR, "mock-premium-reading.json");

const PREMIUM_CACHE_PREFIX = "premium:";

export type CachedPremiumPayload = {
  premiumReading: string;
};

/** 카드 3장 조합 → 안정적인 캐시 키 */
export function buildCardComboCacheKey(cards: CardSlotForCache[]): string {
  return cards
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((c) => `${c.position}:${c.slug}:${c.isReversed ? "R" : "U"}`)
    .join("|");
}

let fileCacheLoaded = false;
let fileCache: Record<string, CachedReadingPayload> = {};

async function ensureFileCacheLoaded(): Promise<void> {
  if (fileCacheLoaded) return;
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    fileCache = JSON.parse(raw) as Record<string, CachedReadingPayload>;
  } catch {
    fileCache = {};
  }
  fileCacheLoaded = true;
}

/** 2순위: 메모리 → cache.json */
export async function getCachedReading(
  key: string,
): Promise<CachedReadingPayload | null> {
  const mem = memoryCache.get(key);
  if (mem) return mem;

  await ensureFileCacheLoaded();
  const hit = fileCache[key];
  if (!hit?.reading) return null;

  memoryCache.set(key, hit);
  return hit;
}

export async function setCachedReading(
  key: string,
  payload: CachedReadingPayload,
): Promise<void> {
  memoryCache.set(key, payload);
  await ensureFileCacheLoaded();
  fileCache[key] = payload;

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(fileCache, null, 2), "utf8");
}

/** 1순위: 개발 환경 mock (READING_USE_LIVE_API=true 이면 스킵) */
export async function getMockReading(): Promise<CachedReadingPayload | null> {
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.READING_USE_LIVE_API === "true") return null;

  try {
    const raw = await readFile(MOCK_FILE, "utf8");
    const data = JSON.parse(raw) as CachedReadingPayload;
    if (!data.reading?.trim()) return null;
    return {
      reading: data.reading.trim(),
      easternTeaser: data.easternTeaser?.trim() || null,
    };
  } catch {
    return null;
  }
}

/**
 * Mock → Cache 순으로 조회. 둘 다 없으면 null (→ API 호출).
 */
export async function resolveCachedOrMockReading(
  cacheKey: string,
): Promise<{ payload: CachedReadingPayload; source: ReadingResolveSource } | null> {
  const mock = await getMockReading();
  if (mock) return { payload: mock, source: "mock" };

  const cached = await getCachedReading(cacheKey);
  if (cached) return { payload: cached, source: "cache" };

  return null;
}

export function isDevelopmentReadingMode(): boolean {
  return process.env.NODE_ENV === "development";
}

export function shouldUseLiveReadingApi(): boolean {
  return process.env.READING_USE_LIVE_API === "true";
}

/** 개발 환경: 결제 없이 프리미엄 UI 테스트 */
export function shouldSkipPaymentInDev(): boolean {
  return isDevelopmentReadingMode();
}

export async function getMockPremiumReading(): Promise<CachedPremiumPayload | null> {
  if (!isDevelopmentReadingMode()) return null;
  if (shouldUseLiveReadingApi()) return null;

  try {
    const raw = await readFile(MOCK_PREMIUM_FILE, "utf8");
    const data = JSON.parse(raw) as CachedPremiumPayload;
    if (!data.premiumReading?.trim()) return null;
    return { premiumReading: data.premiumReading.trim() };
  } catch {
    return null;
  }
}

export async function getCachedPremiumReading(
  cacheKey: string,
): Promise<CachedPremiumPayload | null> {
  const hit = await getCachedReading(PREMIUM_CACHE_PREFIX + cacheKey);
  if (!hit?.reading) return null;
  return { premiumReading: hit.reading };
}

export async function setCachedPremiumReading(
  cacheKey: string,
  payload: CachedPremiumPayload,
): Promise<void> {
  await setCachedReading(PREMIUM_CACHE_PREFIX + cacheKey, {
    reading: payload.premiumReading,
    easternTeaser: null,
  });
}

export async function resolveCachedOrMockPremiumReading(
  cacheKey: string,
): Promise<{ payload: CachedPremiumPayload; source: ReadingResolveSource } | null> {
  const mock = await getMockPremiumReading();
  if (mock) return { payload: mock, source: "mock" };

  const cached = await getCachedPremiumReading(cacheKey);
  if (cached) return { payload: cached, source: "cache" };

  return null;
}
