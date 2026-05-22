/**
 * submitReading Server Action 입출력 타입 정의
 */

/** 카드 한 장의 선택 정보 */
export interface ReadingCardInput {
  /** tarot-data.ts의 slug (DB lookup 키) */
  slug: string;
  /** 포지션: 0=과거, 1=현재, 2=미래 */
  position: 0 | 1 | 2;
  /** 역방향 여부 */
  isReversed: boolean;
}

/** submitReading 입력 페이로드 */
export interface SubmitReadingInput {
  intention: string;
  cards: [ReadingCardInput, ReadingCardInput, ReadingCardInput];
  /** 선택적 별자리 (있으면 동양/프리미엄 해석에 반영) */
  zodiacSign?: string;
}

/** submitReading 성공 시 반환 데이터 */
export interface SubmitReadingResult {
  sessionId: string;
  /** 서양식 타로 리딩 (무료) */
  reading: string;
  /** 동양철학 맛보기 텍스트 */
  easternTeaser: string | null;
  isPremium: boolean;
  premiumReading: string | null;
}

export type MysticPathChoice = "free" | "premium";
