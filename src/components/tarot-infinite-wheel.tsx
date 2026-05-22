"use client";

import {
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

// ─── visual constants ──────────────────────────────────────────────────────────
const CARD_WIDTH = 140;
const CARD_HEIGHT = 196;
const CENTER_SCALE = 1.28;
const SIDE_SCALE = 0.78;
const SIDE_OPACITY = 0.62;
const SIDE_HALF = 8;

// All cards show a uniform hidden-back style (no major/minor distinction until revealed)
const HIDDEN_BORDER = "1px solid oklch(0.6 0.1 240 / 0.35)";
const HIDDEN_GLOW   = "0 8px 28px rgba(0,0,0,0.45)";

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
function WheelSlot({
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
  const dist = useTransform(translateX, (tx) => {
    const cardCenterWorld = slotIndex * slotGap + tx;
    return Math.abs(cardCenterWorld - cx);
  });

  const scale = useTransform(dist, (d) => {
    const t = Math.min(d / slotGap, 1);
    return CENTER_SCALE + (SIDE_SCALE - CENTER_SCALE) * t;
  });

  const rotateY = useTransform(translateX, (tx) => {
    const offsetWorld = slotIndex * slotGap + tx - cx;
    const t = Math.max(-1, Math.min(1, offsetWorld / (slotGap * 1.15)));
    return -t * 15;
  });

  const opacity = useTransform(dist, (d) => {
    const t = Math.min(d / slotGap, 1);
    return 1 + (SIDE_OPACITY - 1) * t;
  });

  const glowOpacity = useTransform(dist, (d) =>
    Math.max(0.4, 1 - d / (slotGap * 1.2)),
  );

  const boxShadow = useTransform(dist, (d) => {
    const g = Math.max(0.36, 1 - d / (slotGap * 0.92));
    return `0 0 ${6 + g * 18}px oklch(0.55 0.12 240 / ${0.15 + g * 0.25}), ${HIDDEN_GLOW}`;
  });

  const shadeOpacity = useTransform(dist, (d) => {
    const t = Math.min(1, d / (slotGap * 1.05));
    return t * 0.22;
  });

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
      <motion.div
        className="absolute flex items-center justify-center rounded-2xl"
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          marginLeft: -CARD_WIDTH / 2,
          marginTop: -CARD_HEIGHT / 2,
          scale,
          opacity,
          rotateY,
          transformStyle: "preserve-3d",
          zIndex: z,
          willChange: "transform, opacity",
        }}
      >
        {/* ── Hidden card back (uniform for all cards before reveal) ── */}
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-2xl"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.14 0.06 255), oklch(0.09 0.04 265))",
            border: HIDDEN_BORDER,
            boxShadow,
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

          {/* distance-based darkening vignette */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-black"
            style={{ opacity: shadeOpacity }}
            aria-hidden
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

          {/* center orb (uniform, no card info) */}
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: glowOpacity }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border"
              style={{
                borderColor: "oklch(0.55 0.12 240 / 0.5)",
                boxShadow: "0 0 16px oklch(0.5 0.12 240 / 0.3)",
              }}
            >
              <div
                className="h-6 w-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.55 0.14 240 / 0.6) 0%, oklch(0.3 0.08 255 / 0.2) 100%)",
                  boxShadow: "0 0 12px oklch(0.5 0.14 240 / 0.4)",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── TarotInfiniteWheel ───────────────────────────────────────────────────────
export function TarotInfiniteWheel({
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
  const [mid, setMid] = useState(0);

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
      const duration = Math.min(0.4, Math.max(0.15, dist / 480));
      snapAnimRef.current = animate(translateX, targetTx, {
        type: "tween",
        ease: SNAP_EASE,
        duration,
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
    const m = draggingRef.current
      ? Math.round((cx - tx) / slotGap)
      : normalizeTranslate(tx);
    if (m !== midRef.current) {
      midRef.current = m;
      setMid(m);
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
      const dx = clientX - st.startClientX;
      const dtx = translateX.get() - st.startTx;
      const isTap = Math.abs(dx) < 14 && Math.abs(dtx) < 10;
      st.down = false;
      st.id = null;
      draggingRef.current = false;
      normalizeTranslate(translateX.get());

      if (isTap && !disabled) {
        const slot = Math.round((cx - translateX.get()) / slotGap);

        // Compute viewport rect of the center card
        let sourceRect: SourceRect | null = null;
        if (wrapRef.current) {
          const cr = wrapRef.current.getBoundingClientRect();
          const containerH = CARD_HEIGHT * CENTER_SCALE + 80;
          const vW = CARD_WIDTH * CENTER_SCALE;
          const vH = CARD_HEIGHT * CENTER_SCALE;
          sourceRect = {
            x: cr.left + cx - vW / 2,
            y: cr.top + containerH / 2 - vH / 2,
            width: vW,
            height: vH,
          };
        }

        onSelectCard(cards[modIndex(slot, n)], sourceRect);
        // Snap to the next card so the gap visually "closes"
        runSnapTo(cx - (slot + 1) * slotGap);
        return;
      }

      const v = Math.max(-3800, Math.min(3800, st.vxEma));
      const projected = translateX.get() + v * 0.16;
      const slot = Math.round((cx - projected) / slotGap);
      runSnapTo(cx - slot * slotGap);
    },
    [cards, cx, disabled, n, normalizeTranslate, onSelectCard, slotGap, translateX, runSnapTo],
  );

  const onHitPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      stopSnapAnim();
      if (wheelIdleTimer.current) { clearTimeout(wheelIdleTimer.current); wheelIdleTimer.current = null; }
      const tx = translateX.get();
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

  const slots: number[] = [];
  for (let s = mid - SIDE_HALF; s <= mid + SIDE_HALF; s++) slots.push(s);

  const minS = mid - SIDE_HALF;
  const maxS = mid + SIDE_HALF;
  const stripPad = CARD_WIDTH * 2;
  const stripWidth = (maxS - minS) * slotGap + stripPad;

  return (
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
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 backdrop-blur-sm">
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

      {/* disabled overlay */}
      {disabled && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-black/30 backdrop-blur-[2px]" />
      )}

      {/* floor shadow */}
      <div
        className="pointer-events-none absolute bottom-[10%] left-1/2 z-0 h-[4.5rem] w-[min(78%,20rem)] -translate-x-1/2 rounded-[100%]"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, oklch(0.08 0.06 290 / 0.55) 0%, oklch(0.12 0.08 300 / 0.35) 35%, transparent 72%)",
          filter: "blur(28px)",
          opacity: 0.5,
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
            willChange: "transform",
            pointerEvents: "none",
          }}
        >
          <div
            className="relative h-full"
            style={{ perspective: 1100, transformStyle: "preserve-3d" }}
          >
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
  );
}
