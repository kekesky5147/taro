/** 카드 드래그·비행 중 CosmicBackground CSS 애니메이션 일시 정지 (refcount) */

const CLASS = "cosmic-bg-paused";

let pauseCount = 0;

export function pauseCosmicBackground(): void {
  pauseCount += 1;
  if (pauseCount === 1 && typeof document !== "undefined") {
    document.documentElement.classList.add(CLASS);
  }
}

export function resumeCosmicBackground(): void {
  pauseCount = Math.max(0, pauseCount - 1);
  if (pauseCount === 0 && typeof document !== "undefined") {
    document.documentElement.classList.remove(CLASS);
  }
}
