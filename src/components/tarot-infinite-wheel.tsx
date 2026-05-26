"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import type { TarotCard } from "@/lib/tarot-data";
import {
  pauseCosmicBackground,
  resumeCosmicBackground,
} from "@/lib/cosmic-bg-pause";

// ─── visual constants ──────────────────────────────────────────────────────────
const CARD_WIDTH = 140;
const CARD_HEIGHT = 196;
const CENTER_SCALE = 1.28;
const SIDE_SCALE = 0.78;
const SIDE_OPACITY = 0.62;
const SIDE_HALF = 7; // 양쪽 버퍼 확보 — 긴 스와이프에도 검은 공간 차단

// All cards show a uniform hidden-back style (no major/minor distinction until revealed)
const HIDDEN_BORDER = "1px solid oklch(0.6 0.1 240 / 0.35)";
const HIDDEN_GLOW = "0 8px 28px rgba(0,0,0,0.45)";
// 단순 drop-shadow 1개 — 이중 glow 제거
const CARD_SHADOW = "0 4px 20px rgba(0,0,0,0.6)";

const SNAP_EASE = [0.22, 1, 0.36, 1] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────
function modIndex(i: number, n: number): number {
  return ((i % n) + n) % n;
}

// ─── types ────────────────────────────────────────────────────────────────────
export type { TarotCard };

/** Viewport-relative rect of the card that was tapped */
export type SourceRect = { x: number; y: number; width: number; height: number };

export type TarotInfiniteWheelProps = {
  cards: TarotCard[];
  onCenterCardChange: (card: TarotCard, deckIndex: number) => void;
  onSelectCard: (card: TarotCard, sourceRect: SourceRect | null) => void;
  disabled?: boolean;
  /** How many more picks remain (shown as hint above the wheel) */
  remainingPicks?: number;
};

// ─── WheelSlot ────────────────────────────────────────────────────────────────
// memo: cx/slotGap이 바뀌지 않는 한 리렌더 차단
const WheelSlot = memo(function WheelSlot({
  slotIndex,
  minSlot,
  slotGap,
  translateX,
  cx,
}: {
  slotIndex: number;
  minSlot: number;
  slotGap: number;
  translateX: ReturnType<typeof useMotionValue<number>>;
  cx: number;
}) {
  // 2D 전용: dist → scale / opacity / z만 계산 (rotateY·perspective 제거)
  const dist = useTransform(translateX, (tx) => {
    const cardCenterWorld = slotIndex * slotGap + tx;
    return Math.abs(cardCenterWorld - cx);
  });

  const scale = useTransform(dist, (d) => {
    const t = Math.min(d / slotGap, 1);
    return CENTER_SCALE + (SIDE_SCALE - CENTER_SCALE) * t;
  });

  const opacity = useTransform(dist, (d) => {
    const t = Math.min(d / slotGap, 1);
    return 1 + (SIDE_OPACITY - 1) * t;
  });

  const glowOpacity = useTransform(dist, (d) =>
    Math.max(0.4, 1 - d / (slotGap * 1.2)),
  );

  const z = useTransform(scale, (s) => Math.round(s * 80));

  return (
    <div
      className="pointer-events-none absolute top-1/2"
      style={{
        left: (slotIndex - minSlot) * slotGap,
        width: 0,
        height: 0,
      }}
    >
      {/* 2D motion: scale + opacity만, transformStyle·rotateY 제거 */}
      <motion.div
        className="absolute flex items-center justify-center rounded-2xl"
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          marginLeft: -CARD_WIDTH / 2,
          marginTop: -CARD_HEIGHT / 2,
          scale,
          opacity,
          zIndex: z,
        }}
      >
        {/* ── Hidden card back — 정적 div, 매 프레임 motion 불필요 ── */}
        <div
          className="relative h-full w-full overflow-hidden rounded-2xl"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.14 0.06 255), oklch(0.09 0.04 265))",
            border: HIDDEN_BORDER,
            boxShadow: CARD_SHADOW,
          }}
        >
          {/* subtle top shimmer */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.6 0.1 240 / 0.08), transparent)",
            }}
          />

          {/* inner decorative border */}
          <div
            className="pointer-events-none absolute inset-3 rounded-xl border"
            style={{ borderColor: "oklch(0.55 0.1 240 / 0.2)" }}
          />
          <div
            className="pointer-events-none absolute inset-5 rounded-lg border"
            style={{ borderColor: "oklch(0.5 0.08 240 / 0.12)" }}
          />

          {/* corner ornaments */}
          <span
            className="pointer-events-none absolute left-[6px] top-[6px] text-[7px] leading-none"
            style={{ color: "oklch(0.5 0.1 240 / 0.55)" }}
            aria-hidden
          >
            ✦
          </span>
          <span
            className="pointer-events-none absolute right-[6px] top-[6px] text-[7px] leading-none"
            style={{ color: "oklch(0.5 0.1 240 / 0.55)" }}
            aria-hidden
          >
            ✦
          </span>
          <span
            className="pointer-events-none absolute bottom-[6px] left-[6px] text-[7px] leading-none"
            style={{ color: "oklch(0.5 0.1 240 / 0.55)" }}
            aria-hidden
          >
            ✦
          </span>
          <span
            className="pointer-events-none absolute bottom-[6px] right-[6px] text-[7px] leading-none"
            style={{ color: "oklch(0.5 0.1 240 / 0.55)" }}
            aria-hidden
          >
            ✦
          </span>

          {/* center orb */}
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: glowOpacity }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border"
              style={{
                borderColor: "oklch(0.55 0.12 240 / 0.5)",
                boxShadow: "0 0 14px oklch(0.5 0.12 240 / 0.28)",
              }}
            >
              <div
                className="h-6 w-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.55 0.14 240 / 0.6) 0%, oklch(0.3 0.08 255 / 0.2) 100%)",
                }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

// ─── TarotInfiniteWheel ───────────────────────────────────────────────────────
function TarotInfiniteWheelBase({
  cards,
  onCenterCardChange,
  onSelectCard,
  disabled = false,
  remainingPicks,
}: TarotInfiniteWheelProps) {
  const n = cards.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const hitLayerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const translateX = useMotionValue(0);
  const midRef = useRef(0);
  const lastDeckIdx = useRef(-1);
  const draggingRef = useRef(false);
  const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const wheelBgPausedRef = useRef(false);
  // 마지막으로 setMid를 호출한 시점의 mid 값 — 드래그 중 슬롯 윈도우 이동 감지용
  const lastRenderedMidRef = useRef(0);
  const [mid, setMid] = useState(0);
  // isSettled: 카드가 정중앙에 완전히 멈췄을 때만 true → Pick 버튼 활성화
  const [isSettled, setIsSettled] = useState(true);

  const cx = width / 2;
  const slotGap = Math.max(92, Math.min(124, Math.round(width * 0.3)));

  const stopSnapAnim = useCallback(() => {
    snapAnimRef.current?.stop();
    snapAnimRef.current = null;
  }, []);

  const runSnapTo = useCallback(
    (targetTx: number) => {
      stopSnapAnim();
      const from = translateX.get();
      const dist = Math.abs(targetTx - from);
      const duration = Math.min(0.45, Math.max(0.15, dist / 520));
      snapAnimRef.current = animate(translateX, targetTx, {
        type: "tween",
        ease: SNAP_EASE,
        duration,
        onComplete: () => {
          wheelBgPausedRef.current = false;
          resumeCosmicBackground();
          setIsSettled(true);
        },
      });
    },
    [stopSnapAnim, translateX],
  );

  const snapTranslate = useCallback(
    (slotIndex: number) => cx - slotIndex * slotGap,
    [cx, slotGap],
  );

  const normalizeTranslate = useCallback(
    (tx: number) => {
      let m = Math.round((cx - tx) / slotGap);
      let t = tx;
      const span = n * slotGap;
      while (m > 28) { t += span; m -= n; }
      while (m < -28) { t -= span; m += n; }
      if (Math.abs(t - tx) > 0.5) translateX.set(t);
      return m;
    },
    [cx, n, slotGap, translateX],
  );

  const snapWheelIdle = useCallback(() => {
    draggingRef.current = false;
    normalizeTranslate(translateX.get());
    lastRenderedMidRef.current = midRef.current;
    setMid(midRef.current);
    const current = translateX.get();
    const slot = Math.round((cx - current) / slotGap);
    runSnapTo(cx - slot * slotGap);
  }, [normalizeTranslate, translateX, cx, slotGap, runSnapTo]);

  // measure container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 360;
      setWidth(Math.max(280, Math.round(w)));
    });
    ro.observe(el);
    setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    midRef.current = 0;
    lastDeckIdx.current = 0;
    onCenterCardChange(cards[0], 0);
  }, [cards, onCenterCardChange]);

  useLayoutEffect(() => {
    translateX.set(snapTranslate(midRef.current));
  }, [cx, snapTranslate, translateX]);

  useMotionValueEvent(translateX, "change", (tx) => {
    const isDragging = draggingRef.current;
    const m = isDragging
      ? Math.round((cx - tx) / slotGap)
      : normalizeTranslate(tx);
    if (m !== midRef.current) {
      midRef.current = m;
      // 드래그 중: 슬롯 창 경계까지 3슬롯 이내에 도달하면 React 리렌더 실행
      // (WheelSlot은 memo라 엣지 1~2개만 마운트/언마운트 — 비용 최소)
      const drift = Math.abs(m - lastRenderedMidRef.current);
      if (!isDragging || drift >= SIDE_HALF - 2) {
        lastRenderedMidRef.current = m;
        setMid(m);
      }
      const di = modIndex(m, n);
      if (di !== lastDeckIdx.current) {
        lastDeckIdx.current = di;
        onCenterCardChange(cards[di], di);
      }
    }
  });

  // ── pointer drag ──
  const pointerDrag = useRef<{
    down: boolean;
    id: number | null;
    startClientX: number;
    startTx: number;
    lastClientX: number;
    lastT: number;
    vx: number;
    vxEma: number;
  }>({ down: false, id: null, startClientX: 0, startTx: 0, lastClientX: 0, lastT: 0, vx: 0, vxEma: 0 });

  const finishPointer = useCallback(
    (clientX: number, el: HTMLElement) => {
      const st = pointerDrag.current;
      if (!st.down || st.id === null) return;
      try { el.releasePointerCapture(st.id); } catch { /* released */ }
      st.down = false;
      st.id = null;
      draggingRef.current = false;
      normalizeTranslate(translateX.get());
      // 드래그 종료 — 슬롯 창 최종 동기화
      lastRenderedMidRef.current = midRef.current;
      setMid(midRef.current);
      const v = Math.max(-3800, Math.min(3800, st.vxEma));
      // 0.22 — 모멘텀 확장으로 더 많은 카드 통과, 룰렛 느낌 강화
      const projected = translateX.get() + v * 0.22;
      const slot = Math.round((cx - projected) / slotGap);
      runSnapTo(cx - slot * slotGap);
    },
    [cx, normalizeTranslate, slotGap, translateX, runSnapTo],
  );

  const onHitPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      stopSnapAnim();
      if (wheelIdleTimer.current) { clearTimeout(wheelIdleTimer.current); wheelIdleTimer.current = null; }
      pauseCosmicBackground();
      setIsSettled(false);
      const tx = translateX.get();
      lastRenderedMidRef.current = midRef.current; // 드래그 시작점 기준 초기화
      pointerDrag.current = { down: true, id: e.pointerId, startClientX: e.clientX, startTx: tx, lastClientX: e.clientX, lastT: performance.now(), vx: 0, vxEma: 0 };
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled, stopSnapAnim, translateX],
  );

  const onHitPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const st = pointerDrag.current;
      if (!st.down || e.pointerId !== st.id) return;
      const now = performance.now();
      const dt = Math.max(4, now - st.lastT);
      const inst = ((e.clientX - st.lastClientX) / dt) * 1000;
      st.vx = inst;
      st.vxEma = st.vxEma === 0 ? inst : st.vxEma * 0.68 + inst * 0.32;
      st.lastClientX = e.clientX;
      st.lastT = now;
      translateX.set(st.startTx + (e.clientX - st.startClientX));
      e.preventDefault();
    },
    [translateX],
  );

  const onHitPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const st = pointerDrag.current;
      if (!st.down || e.pointerId !== st.id) return;
      finishPointer(e.clientX, e.currentTarget);
    },
    [finishPointer],
  );

  const onHitPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const st = pointerDrag.current;
      if (!st.down || e.pointerId !== st.id) return;
      finishPointer(e.clientX, e.currentTarget);
    },
    [finishPointer],
  );

  // ── wheel / trackpad ──
  useEffect(() => {
    const el = hitLayerRef.current;
    if (!el || disabled) return;
    const scheduleSnap = () => {
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => { wheelIdleTimer.current = null; snapWheelIdle(); }, 140);
    };
    const onWheel = (e: WheelEvent) => {
      let dx = e.deltaX;
      if (e.shiftKey) dx += e.deltaY;
      else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) + 2) return;
      if (Math.abs(dx) < 0.02) return;
      e.preventDefault();
      e.stopPropagation();
      stopSnapAnim();
      if (!wheelBgPausedRef.current) {
        wheelBgPausedRef.current = true;
        pauseCosmicBackground();
      }
      if (!draggingRef.current) {
        lastRenderedMidRef.current = midRef.current; // wheel 첫 이벤트 시 기준 초기화
      }
      setIsSettled(false);
      draggingRef.current = true;
      translateX.set(translateX.get() - dx * 0.72);
      scheduleSnap();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current); };
  }, [disabled, snapWheelIdle, stopSnapAnim, translateX]);

  // passive:false pointermove to allow preventDefault on mobile
  useEffect(() => {
    const el = hitLayerRef.current;
    if (!el || disabled) return;
    const pm = (ev: PointerEvent) => {
      if (!pointerDrag.current.down || ev.pointerId !== pointerDrag.current.id) return;
      ev.preventDefault();
    };
    el.addEventListener("pointermove", pm, { passive: false });
    return () => el.removeEventListener("pointermove", pm);
  }, [disabled]);

  // iOS: prevent vertical scroll hijack during horizontal drag
  useEffect(() => {
    const root = wrapRef.current;
    if (!root || disabled) return;
    const onTouchMove = (e: TouchEvent) => { if (draggingRef.current) e.preventDefault(); };
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => root.removeEventListener("touchmove", onTouchMove);
  }, [disabled]);

  // cleanup snap animation on unmount
  useEffect(() => () => { snapAnimRef.current?.stop(); }, []);


  // Pick 버튼 클릭 — 현재 중앙 카드를 확정 선택
  const handlePickCard = useCallback(() => {
    const slot = Math.round((cx - translateX.get()) / slotGap);
    const card = cards[modIndex(slot, n)];
    let sourceRect: SourceRect | null = null;
    if (wrapRef.current) {
      const cr = wrapRef.current.getBoundingClientRect();
      const vW = CARD_WIDTH * CENTER_SCALE;
      const vH = CARD_HEIGHT * CENTER_SCALE;
      sourceRect = {
        x: cr.left + cx - vW / 2,
        y: cr.top + (CARD_HEIGHT * CENTER_SCALE + 80) / 2 - vH / 2,
        width: vW,
        height: vH,
      };
    }
    onSelectCard(card, sourceRect);
  }, [cards, cx, n, onSelectCard, slotGap, translateX]);

  const slots: number[] = [];
  for (let s = mid - SIDE_HALF; s <= mid + SIDE_HALF; s++) slots.push(s);

  const minS = mid - SIDE_HALF;
  const maxS = mid + SIDE_HALF;
  const stripPad = CARD_WIDTH * 2;
  const stripWidth = (maxS - minS) * slotGap + stripPad;

  const cardFocusW = CARD_WIDTH * CENTER_SCALE + 12;
  const cardFocusH = CARD_HEIGHT * CENTER_SCALE + 12;

  return (
    <>
      {/* ── 카드 휠 영역 ── */}
      <div
        ref={wrapRef}
        className="relative w-full select-none"
        style={{
          height: CARD_HEIGHT * CENTER_SCALE + 80,
          touchAction: "none",
          overscrollBehavior: "none",
          overflow: "hidden",
        }}
      >
        {/* remaining picks hint */}
        {remainingPicks !== undefined && remainingPicks > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < 3 - remainingPicks
                        ? "oklch(0.85 0.18 60)"
                        : "oklch(1 0 0 / 0.2)",
                    boxShadow:
                      i < 3 - remainingPicks
                        ? "0 0 6px oklch(0.85 0.18 60 / 0.7)"
                        : "none",
                  }}
                />
              ))}
              <span className="ml-1 text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">
                {remainingPicks} left
              </span>
            </div>
          </div>
        )}

        {/* 중앙 포커스 테두리 — 정중앙 고정, 카드가 이 안으로 정렬됨 */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: cardFocusW,
            height: cardFocusH,
            borderRadius: 20,
            border: `1.5px solid oklch(0.78 0.18 190 / ${isSettled ? "0.7" : "0.25"})`,
            boxShadow: isSettled
              ? "0 0 20px oklch(0.75 0.18 190 / 0.38), 0 0 14px oklch(0.7 0.17 280 / 0.28), inset 0 0 12px oklch(0.75 0.18 190 / 0.05)"
              : "none",
            transition: "box-shadow 0.45s ease, border-color 0.35s ease",
          }}
          aria-hidden
        />

        {/* disabled overlay */}
        {disabled && (
          <div className="pointer-events-none absolute inset-0 z-30 bg-black/45" />
        )}

        {/* floor shadow */}
        <div
          className="pointer-events-none absolute bottom-[10%] left-1/2 z-0 h-[4.5rem] w-[min(78%,20rem)] -translate-x-1/2 rounded-[100%]"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, oklch(0.08 0.06 290 / 0.45) 0%, oklch(0.12 0.08 300 / 0.28) 40%, transparent 78%)",
            opacity: 0.55,
          }}
          aria-hidden
        />

        <div
          className="absolute inset-0 z-[1] overflow-hidden"
          style={{ touchAction: "none", overscrollBehavior: "none" }}
        >
          <motion.div
            style={{
              x: translateX,
              position: "absolute",
              left: minS * slotGap,
              top: 0,
              height: "100%",
              width: stripWidth,
              pointerEvents: "none",
            }}
          >
            <div className="relative h-full">
              {slots.map((slotIndex) => (
                <WheelSlot
                  key={slotIndex}
                  slotIndex={slotIndex}
                  minSlot={minS}
                  slotGap={slotGap}
                  translateX={translateX}
                  cx={cx}
                />
              ))}
            </div>
          </motion.div>

          <div
            ref={hitLayerRef}
            role="presentation"
            className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={onHitPointerDown}
            onPointerMove={onHitPointerMove}
            onPointerUp={onHitPointerUp}
            onPointerCancel={onHitPointerCancel}
          />
        </div>
      </div>

      {/* ── Pick Card 버튼 — 중앙 정렬 완료 시 활성화 ── */}
      <div className="flex flex-col items-center gap-1.5 pb-1 pt-3">
        <button
          type="button"
          disabled={!isSettled || disabled}
          onClick={handlePickCard}
          className="relative overflow-hidden rounded-full px-8 py-2.5 text-sm font-medium tracking-wide transition-all duration-300 active:scale-[0.96] disabled:cursor-not-allowed"
          style={{
            background:
              isSettled && !disabled
                ? "linear-gradient(135deg, oklch(0.72 0.18 190), oklch(0.64 0.17 265))"
                : "oklch(0.18 0.04 260 / 0.65)",
            color:
              isSettled && !disabled
                ? "oklch(0.96 0.02 210)"
                : "oklch(0.45 0.05 240)",
            border:
              isSettled && !disabled
                ? "1px solid oklch(0.78 0.18 190 / 0.5)"
                : "1px solid oklch(0.35 0.06 260 / 0.3)",
            boxShadow:
              isSettled && !disabled
                ? "0 0 24px oklch(0.72 0.18 190 / 0.4), 0 4px 14px rgba(0,0,0,0.3)"
                : "none",
            transition:
              "background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, color 0.25s ease",
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            {!isSettled && (
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
                style={{ animation: "spin 0.7s linear infinite" }}
                aria-hidden
              />
            )}
            {!disabled
              ? isSettled
                ? "Pick This Card"
                : "Spinning..."
              : "Card Chosen"}
          </span>
          {isSettled && !disabled && (
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(1 0 0 / 0.14) 0%, transparent 55%)",
              }}
              aria-hidden
            />
          )}
        </button>
        <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/25">
          Swipe to explore
        </p>
      </div>
    </>
  );
}

export const TarotInfiniteWheel = memo(TarotInfiniteWheelBase);
