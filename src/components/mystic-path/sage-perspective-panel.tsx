"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { PremiumReadingContent } from "@/components/premium/premium-reading-content";
import { mysticTheme } from "./mystic-theme";

const sageFont = "var(--font-playfair), 'Noto Serif KR', Georgia, 'Times New Roman', serif";

type SagePerspectivePanelProps = {
  premiumReading: string;
};

export function SagePerspectivePanel({ premiumReading }: SagePerspectivePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const markRevealed = () => setRevealed(true);

    if (reduceMotion) {
      markRevealed();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markRevealed();
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);

    // 이미 보이는 경우에도 스크롤 강제 이동 없이 등장만 처리
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const alreadyVisible = rect.top < vh * 0.92 && rect.bottom > vh * 0.08;
      if (alreadyVisible) markRevealed();
    });

    return () => observer.disconnect();
  }, [reduceMotion]);

  const showContent = revealed || reduceMotion === true;

  return (
    <div
      ref={ref}
      className="isolate mt-10 scroll-mt-24"
      style={{ contain: "layout style" }}
    >
      <header
        className="mb-6 text-center transition-opacity duration-500"
        style={{
          fontFamily: sageFont,
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.48em]"
          style={{ color: mysticTheme.gold }}
        >
          ✦ The Sage&apos;s Perspective ✦
        </p>
        <div
          className="mx-auto mt-3 h-px w-28"
          style={{
            background: `linear-gradient(to right, transparent, ${mysticTheme.gold}, transparent)`,
          }}
        />
        <p
          className="mt-3 text-xs tracking-wide"
          style={{ color: mysticTheme.offWhiteMuted }}
        >
          A scroll of wisdom beside your reading
        </p>
      </header>

      <div
        className="relative rounded-2xl transition-[opacity,transform] duration-700 ease-out"
        style={{
          fontFamily: sageFont,
          opacity: showContent ? 1 : 0,
          transform: showContent ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
        }}
      >
        {/* 정적 금빛 테두리 — 무한 motion 제거 */}
        <div
          className="pointer-events-none absolute -inset-px z-10 rounded-2xl border"
          style={{
            borderColor: "rgba(212, 175, 55, 0.45)",
            boxShadow: "0 0 28px rgba(212, 175, 55, 0.18)",
          }}
          aria-hidden
        />

        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 90% 55% at 50% -5%, rgba(212, 175, 55, 0.22) 0%, transparent 55%),
                radial-gradient(ellipse 70% 45% at 85% 100%, rgba(212, 175, 55, 0.1) 0%, transparent 50%)
              `,
            }}
            aria-hidden
          />

          <div
            className="relative border border-[#d4af37]/25"
            style={{
              background: `linear-gradient(168deg, rgba(18, 24, 42, 0.96) 0%, rgba(26, 31, 46, 0.94) 45%, rgba(10, 14, 26, 0.98) 100%)`,
            }}
          >
            <PremiumReadingContent
              text={premiumReading}
              variant="sage"
              animateIn={showContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
