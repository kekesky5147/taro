"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PremiumReadingContent } from "@/components/premium/premium-reading-content";
import { mysticEase, mysticTheme } from "./mystic-theme";

const sageFont = "var(--font-playfair), 'Noto Serif KR', Georgia, 'Times New Roman', serif";

const hidden = { opacity: 0, y: 48, scale: 0.9 };
const visible = { opacity: 1, y: 0, scale: 1 };

type SagePerspectivePanelProps = {
  premiumReading: string;
};

export function SagePerspectivePanel({ premiumReading }: SagePerspectivePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const markRevealed = () => setRevealed(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markRevealed();
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);

    // Unlock 직후 이미 뷰포트 안에 있어도 등장 연출 재생
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const alreadyVisible = rect.top < vh * 0.88 && rect.bottom > vh * 0.12;
      if (alreadyVisible) {
        window.setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          markRevealed();
        }, 150);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-10 scroll-mt-24">
      <motion.header
        initial={hidden}
        animate={revealed ? { opacity: 1, y: 0 } : hidden}
        transition={{ duration: 0.65, ease: mysticEase, delay: revealed ? 0.05 : 0 }}
        className="mb-6 text-center"
        style={{ fontFamily: sageFont }}
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
      </motion.header>

      <motion.div
        initial={hidden}
        animate={revealed ? visible : hidden}
        transition={{
          duration: 0.9,
          ease: mysticEase,
          delay: revealed ? 0.12 : 0,
        }}
        className="relative rounded-2xl"
        style={{ fontFamily: sageFont, transformOrigin: "center bottom" }}
      >
        {/* 등장 후 살짝 떠오르는 펄스 */}
        <motion.div
          className="relative rounded-2xl"
          animate={
            revealed
              ? {
                  scale: [1, 1.025, 1],
                  transition: { duration: 2.4, ease: "easeInOut", delay: 0.95 },
                }
              : { scale: 1 }
          }
        >
          {/* 금빛 테두리 반짝임 */}
          <motion.div
            className="pointer-events-none absolute -inset-[1px] z-20 rounded-2xl border-2"
            initial={{ borderColor: "rgba(212, 175, 55, 0.2)", opacity: 0 }}
            animate={
              revealed
                ? {
                    opacity: 1,
                    borderColor: [
                      "rgba(212, 175, 55, 0.35)",
                      "rgba(212, 175, 55, 0.95)",
                      "rgba(212, 175, 55, 0.35)",
                    ],
                    boxShadow: [
                      "0 0 20px rgba(212, 175, 55, 0.12)",
                      "0 0 48px rgba(212, 175, 55, 0.45)",
                      "0 0 20px rgba(212, 175, 55, 0.12)",
                    ],
                  }
                : { opacity: 0 }
            }
            transition={{
              opacity: { duration: 0.5, delay: 0.2 },
              borderColor: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 },
              boxShadow: { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1 },
            }}
            aria-hidden
          />

          <div className="relative overflow-hidden rounded-2xl">
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={revealed ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                background: `
                  radial-gradient(ellipse 90% 55% at 50% -5%, rgba(212, 175, 55, 0.28) 0%, transparent 55%),
                  radial-gradient(ellipse 70% 45% at 85% 100%, rgba(212, 175, 55, 0.12) 0%, transparent 50%),
                  radial-gradient(ellipse 60% 40% at 10% 80%, rgba(180, 150, 90, 0.08) 0%, transparent 45%)
                `,
              }}
            />

            <motion.div
              className="pointer-events-none absolute inset-0"
              animate={
                revealed
                  ? { opacity: [0.2, 0.5, 0.2] }
                  : { opacity: 0 }
              }
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(255,230,180,0.18) 0%, transparent 42%)",
              }}
              aria-hidden
            />

            <div
              className="relative border border-[#d4af37]/25 backdrop-blur-sm"
              style={{
                background: `linear-gradient(168deg, rgba(18, 24, 42, 0.92) 0%, rgba(26, 31, 46, 0.88) 45%, rgba(10, 14, 26, 0.95) 100%)`,
              }}
            >
              <PremiumReadingContent
                text={premiumReading}
                variant="sage"
                animateIn={revealed}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
