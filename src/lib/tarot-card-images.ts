/**
 * 타로 카드 이미지 URL 해석
 * - DB `imageUrl` 우선
 * - 로컬 `/public/images/tarot/cards/{slug}.svg`
 * - Mock: Rider–Waite Azure CDN (ishtarcollective)
 */

const LOCAL_CARD_SLUGS = new Set([
  "the-fool",
  "the-magician",
  "the-emperor",
]);

const RIDER_WAITE_CDN =
  "https://ishtarcollective.blob.core.windows.net/rider-waite-tarot";

const MAJOR_SLUG_ORDER = [
  "the-fool",
  "the-magician",
  "the-high-priestess",
  "the-empress",
  "the-emperor",
  "the-hierophant",
  "the-lovers",
  "the-chariot",
  "strength",
  "the-hermit",
  "wheel-of-fortune",
  "justice",
  "the-hanged-man",
  "death",
  "temperance",
  "the-devil",
  "the-tower",
  "the-star",
  "the-moon",
  "the-sun",
  "judgement",
  "the-world",
] as const;

const MINOR_RANK_VALUE: Record<string, number> = {
  ace: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  page: 11,
  knight: 12,
  queen: 13,
  king: 14,
};

function mockCdnUrl(slug: string): string | null {
  const majorIndex = MAJOR_SLUG_ORDER.indexOf(
    slug as (typeof MAJOR_SLUG_ORDER)[number],
  );
  if (majorIndex >= 0) {
    return `${RIDER_WAITE_CDN}/major-${majorIndex}.jpg`;
  }

  const m = slug.match(
    /^(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)-of-(wands|cups|swords|pentacles)$/,
  );
  if (!m) return null;
  const [, rank, suit] = m;
  const value = MINOR_RANK_VALUE[rank];
  if (!value) return null;
  return `${RIDER_WAITE_CDN}/${suit}-${value}.jpg`;
}

export function getTarotCardImageUrl(card: {
  slug: string;
  imageUrl?: string | null;
}): string {
  if (card.imageUrl?.trim()) return card.imageUrl.trim();
  if (LOCAL_CARD_SLUGS.has(card.slug)) {
    return `/images/tarot/cards/${card.slug}.svg`;
  }
  return mockCdnUrl(card.slug) ?? `/images/tarot/cards/${card.slug}.svg`;
}
