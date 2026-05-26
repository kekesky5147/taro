/** CosmicBackground 별 좌표 — 고정값 (SSR/CSR 동일, hydration 안전) */

export type CosmicStar = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
};

/** DOM·애니메이션 부담을 줄이기 위해 52개, 작은 크기·긴 주기 */
export const COSMIC_STARS: CosmicStar[] = Array.from({ length: 52 }, (_, id) => ({
  id,
  x: (id * 17 + 7) % 97 + (id % 3) * 0.31,
  y: (id * 23 + 11) % 93 + (id % 5) * 0.17,
  size: 0.75 + (id % 7) * 0.1 + (id % 3) * 0.06,
  delay: (id * 0.17) % 6,
  duration: 3.6 + (id % 6) * 0.45,
}));
