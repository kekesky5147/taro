"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CosmicBackground } from "@/components/cosmic-background";
import { SacredGeometryLogo } from "@/components/sacred-geometry-logo";
import { TarotSpread } from "@/components/tarot-spread";
import { TarotResult } from "@/components/tarot-result";
import { SagePersonaCinematic } from "@/components/mystic-path/sage-persona-cinematic";
import { CrossroadsChoice } from "@/components/mystic-path/crossroads-choice";
import { PremiumPaymentModal } from "@/components/premium/premium-payment-modal";
import { submitReading } from "@/actions/reading";
import { createPaymentIntent, unlockPremiumDev } from "@/actions/premium";
import { shouldSkipPaymentInDev } from "@/lib/payment-mode";
import type { TarotCard } from "@/lib/tarot-data";
import type { MysticPathChoice, ReadingCardInput, SubmitReadingResult } from "@/types/reading";

// ─── constants ─────────────────────────────────────────────────────────────────
type Phase =
  | "hero"
  | "question"
  | "transition"
  | "selecting"
  | "spread"
  | "loading"
  | "sage"
  | "crossroads"
  | "result";

// ease-out-cubic: 부드럽게 감속하며 자연스럽게 착지 — 슬라이드 전용
const heroEase = [0.25, 0.8, 0.25, 1] as const;
const HERO_DURATION = 2.2;
const CONTENT_DELAY = 0.9;
const HEADER_FINAL_TOP_DESKTOP = 24;
const HEADER_FINAL_TOP_MOBILE = 12;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [phase, setPhase]               = useState<Phase>("hero");
  const [showContent, setShowContent]   = useState(false);
  const [showMessage, setShowMessage]   = useState(false);
  const [showWheel, setShowWheel]       = useState(false);
  const [intention, setIntention]       = useState("");
  const [selectedCards, setSelectedCards] = useState<[TarotCard, TarotCard, TarotCard] | null>(null);
  const [readingResult, setReadingResult] = useState<SubmitReadingResult | null>(null);
  const [mysticPath, setMysticPath]       = useState<MysticPathChoice | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen]   = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const submittingRef = useRef(false);
  const [slideY, setSlideY] = useState(0);
  const [contentTop, setContentTop] = useState(192);

  const measureHeader = () => {
    const el = headerRef.current;
    if (!el) return;
    const isNarrow = window.innerWidth < 768;
    const safeTop =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--sat",
        ),
      ) || 0;
    const finalTop = isNarrow
      ? HEADER_FINAL_TOP_MOBILE + safeTop
      : HEADER_FINAL_TOP_DESKTOP;
    const gap = isNarrow ? 20 : 28;
    const { top, height } = el.getBoundingClientRect();
    setSlideY(-(top - finalTop));
    setContentTop(finalTop + height + gap);
  };

  useEffect(() => {
    measureHeader();
    window.addEventListener("resize", measureHeader);
    window.addEventListener("orientationchange", measureHeader);
    return () => {
      window.removeEventListener("resize", measureHeader);
      window.removeEventListener("orientationchange", measureHeader);
    };
  }, []);

  useEffect(() => {
    if (phase !== "hero") return;
    const t = setTimeout(() => {
      setShowContent(true);
      setPhase("question");
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleSubmit = () => {
    if (!intention.trim()) return;
    setPhase("transition");
  };

  const handleFormExited = () => {
    setShowMessage(true);
    setTimeout(() => {
      setShowWheel(true);
      setPhase("selecting");
    }, 2000);
  };

  const handleAllSelected = (cards: [TarotCard, TarotCard, TarotCard]) => {
    setSelectedCards(cards);
    setPhase("spread");
  };

  /** 새로운 리딩 시작 — 모든 상태 초기화 + 로컬 데이터 삭제 */
  const handleRestart = () => {
    // 브라우저 스토리지 전체 초기화
    try {
      localStorage.clear();
      sessionStorage.clear();
      // 모든 쿠키 삭제
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .trim()
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      });
    } catch {
      // SSR 환경에서는 무시
    }
    // React 상태 초기화
    setPhase("hero");
    setShowContent(false);
    setShowMessage(false);
    setShowWheel(false);
    setIntention("");
    setSelectedCards(null);
    setReadingResult(null);
    setMysticPath(null);
    setErrorMsg(null);
    setPaymentOpen(false);
    setClientSecret(null);
  };

  /** 결과보기 버튼 클릭 — submitReading 직접 호출 */
  const handleReveal = async () => {
    if (!selectedCards || !intention.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);
    setPhase("loading");

    try {
      const zodiacSign =
        typeof window !== "undefined"
          ? localStorage.getItem("mystic_zodiac_sign") ?? undefined
          : undefined;

      const result = await submitReading({
        intention,
        cards: selectedCards.map((card, i) => ({
          slug: card.slug,
          position: i as 0 | 1 | 2,
          isReversed: false,
        })) as [ReadingCardInput, ReadingCardInput, ReadingCardInput],
        zodiacSign: zodiacSign || undefined,
      });

      if (result.success) {
        setReadingResult(result.data);
        setMysticPath(null);
        setPhase("sage");
      } else {
        const raw = result.error ?? "";
        const isQuota =
          raw.includes("429") ||
          raw.toLowerCase().includes("quota") ||
          raw.toLowerCase().includes("too many requests");
        setErrorMsg(
          isQuota
            ? "There are too many requests right now. Please try again in a moment."
            : raw || "An unexpected error occurred. Please try again.",
        );
        setPhase("spread");
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const handleChooseFree = () => {
    setMysticPath("free");
    setPhase("result");
  };

  const handleChoosePremium = async () => {
    if (!readingResult) return;
    setPremiumLoading(true);
    setErrorMsg(null);

    try {
      if (shouldSkipPaymentInDev()) {
        const result = await unlockPremiumDev(readingResult.sessionId);
        if (!result.success) {
          setErrorMsg(result.error);
          return;
        }
        handlePremiumPaid(result.data.premiumReading);
        return;
      }

      const result = await createPaymentIntent(readingResult.sessionId);
      if (!result.success) {
        setErrorMsg(result.error);
        return;
      }
      setClientSecret(result.data.clientSecret);
      setPaymentOpen(true);
    } finally {
      setPremiumLoading(false);
    }
  };

  const handlePremiumPaid = (premiumReading: string) => {
    if (!readingResult) return;
    setReadingResult({
      ...readingResult,
      isPremium: true,
      premiumReading,
    });
    setMysticPath("premium");
    setPhase("result");
    setPaymentOpen(false);
    setClientSecret(null);
  };

  const zodiacSign =
    typeof window !== "undefined"
      ? localStorage.getItem("mystic_zodiac_sign")
      : null;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10">
        {/* ── Hero header layer ── */}
        <div className="pointer-events-none flex min-h-dvh flex-col items-center justify-center">
          <motion.header
            ref={headerRef}
            className="pointer-events-auto flex flex-col items-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))]"
            animate={{ y: showContent ? slideY : 0 }}
            transition={{ duration: HERO_DURATION, ease: heroEase }}
          >
            {/* logo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: showContent ? 0.72 : 1 }}
              transition={
                showContent
                  ? { duration: HERO_DURATION, ease: heroEase }
                  : { duration: 0.65, ease: [0.4, 0, 0.2, 1] }
              }
            >
              <div className="mx-auto h-18 w-18 sm:h-22 sm:w-22 md:h-24 md:w-24">
                <SacredGeometryLogo />
              </div>
            </motion.div>

            {/* title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1], delay: 0.18 }}
              className="mt-2 text-center font-serif text-[clamp(1.35rem,4.5vw,2rem)] tracking-[0.2em] md:tracking-[0.24em]"
            >
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.8 0.18 190), oklch(0.95 0.04 220), oklch(0.75 0.2 330))",
                }}
              >
                MYSTIC
              </span>
              <span className="mt-1 block font-sans text-[10px] font-normal tracking-[0.38em] text-white/40 md:text-[11px] md:tracking-[0.42em]">
                SYNCHRONICITY
              </span>
            </motion.h1>

            {/* tagline */}
            <AnimatePresence>
              {!showContent && (
                <motion.p
                  key="tagline"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: 0.32 }}
                  className="mt-3 max-w-[18rem] text-center text-[11px] leading-relaxed text-white/35"
                >
                  Your daily tarot reading awaits
                </motion.p>
              )}
            </AnimatePresence>
          </motion.header>
        </div>

        {/* ── Content layer ── */}
        <div className="absolute inset-x-0" style={{ top: contentTop }}>
          {/* Question form */}
          <AnimatePresence onExitComplete={handleFormExited}>
            {phase === "question" && (
              <motion.div
                key="question-form"
                className="px-4 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] sm:px-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: CONTENT_DELAY }}
              >
                <div className="mx-auto w-full max-w-lg">
                  <IntentionForm
                    value={intention}
                    onChange={setIntention}
                    onSubmit={handleSubmit}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message + card section */}
          {showMessage && (
            <div className="flex flex-col items-center px-4 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] sm:px-6">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="mb-8 max-w-sm text-center font-serif text-sm leading-relaxed"
                style={{ color: "oklch(0.75 0.08 240 / 0.75)" }}
              >
                We have held your question in our hearts. Please keep this intention in mind as you choose your cards.
              </motion.p>

              <AnimatePresence>
                {showWheel && (
                  <motion.div
                    key="card-wheel"
                    className="w-full max-w-3xl"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* 에러 메시지 */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-400/80"
                        >
                          {errorMsg}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 카드 선택 & 스프레드 */}
                    {(phase === "selecting" || phase === "spread") && (
                      <TarotSpread
                        onAllSelected={handleAllSelected}
                        onReveal={handleReveal}
                      />
                    )}

                    {/* 로딩 */}
                    {phase === "loading" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-6 py-20"
                      >
                        <motion.div
                          className="h-16 w-16 opacity-60"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                          <SacredGeometryLogo hideGlow />
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="font-serif text-sm text-white/40"
                        >
                          The cards are being read...
                        </motion.p>
                      </motion.div>
                    )}

                    {/* Sage persona — before results */}
                    {phase === "sage" && readingResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full max-w-3xl"
                      >
                        <SagePersonaCinematic onComplete={() => setPhase("crossroads")} />
                      </motion.div>
                    )}

                    {/* Crossroads — path choice */}
                    {phase === "crossroads" && readingResult && (
                      <>
                      {errorMsg && (
                        <p className="mb-4 text-center text-xs text-red-400/90">{errorMsg}</p>
                      )}
                      <CrossroadsChoice
                        zodiacSign={zodiacSign}
                        onChooseFree={handleChooseFree}
                        onChoosePremium={handleChoosePremium}
                        premiumLoading={premiumLoading}
                      />
                      </>
                    )}

                    {/* Results — after path chosen */}
                    {phase === "result" && selectedCards && readingResult && mysticPath && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <TarotResult
                          cards={selectedCards}
                          reading={readingResult.reading}
                          sessionId={readingResult.sessionId}
                          path={mysticPath}
                          easternTeaser={readingResult.easternTeaser}
                          isPremium={readingResult.isPremium}
                          premiumReading={readingResult.premiumReading}
                          onRestart={handleRestart}
                          onPremiumUnlocked={(text) =>
                            setReadingResult((prev) =>
                              prev
                                ? { ...prev, isPremium: true, premiumReading: text }
                                : prev,
                            )
                          }
                        />
                      </motion.div>
                    )}

                    {clientSecret && readingResult && (
                      <PremiumPaymentModal
                        open={paymentOpen}
                        clientSecret={clientSecret}
                        sessionId={readingResult.sessionId}
                        onClose={() => {
                          setPaymentOpen(false);
                          setClientSecret(null);
                        }}
                        onSuccess={handlePremiumPaid}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* bottom gradient fade */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 h-24 bg-linear-to-t from-background via-background/40 to-transparent" />
    </div>
  );
}

// ─── IntentionForm ─────────────────────────────────────────────────────────────
function IntentionForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const trimmed = value.trim();
  const hasKorean = /[\uAC00-\uD7A3\u3131-\u318E]/.test(trimmed);
  const minLength = hasKorean ? 1 : 2;
  const isValid = trimmed.length >= minLength;
  const showHint = trimmed.length > 0 && !isValid;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (isValid) onSubmit(); }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="intention"
          className="text-center font-serif text-[clamp(1rem,3.5vw,1.25rem)] tracking-wide text-white/75"
        >
          What is on your mind today?
        </label>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "oklch(0.11 0.04 255 / 0.7)",
          border: `1px solid ${showHint ? "oklch(0.65 0.15 25 / 0.5)" : "oklch(0.55 0.1 240 / 0.3)"}`,
          boxShadow: "0 0 0 1px oklch(1 0 0 / 0.04) inset, 0 8px 32px rgba(0,0,0,0.35)",
          transition: "border-color 0.3s",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, oklch(0.7 0.1 240 / 0.25), transparent)",
          }}
        />
        <textarea
          id="intention"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask a question or share what you're seeking guidance on..."
          className="w-full resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-white/80 outline-none placeholder:text-white/25 sm:px-5 sm:py-4 sm:text-sm"
          style={{ caretColor: "oklch(0.75 0.14 240)" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && isValid) onSubmit();
          }}
        />
      </div>

      <p
        className="text-center text-[11px] leading-relaxed transition-colors duration-300"
        style={{ color: showHint ? "oklch(0.65 0.12 25 / 0.8)" : "oklch(1 0 0 / 0.3)" }}
      >
        {showHint
          ? "Please enter at least one word to continue."
          : "Your thoughts remain confidential and are used only to personalize your reading."
        }
      </p>

      <div className="flex justify-center">
        <motion.button
          type="submit"
          disabled={!isValid}
          whileTap={{ scale: !isValid ? 1 : 0.97 }}
          className="relative overflow-hidden rounded-full px-9 py-3 text-sm font-medium tracking-wide transition-opacity disabled:opacity-35"
          style={{
            background: !isValid
              ? "oklch(0.2 0.05 270 / 0.5)"
              : "linear-gradient(135deg, oklch(0.58 0.22 285), oklch(0.52 0.2 210))",
            color: !isValid ? "oklch(0.5 0.06 240 / 0.6)" : "oklch(0.95 0.03 220)",
            boxShadow: !isValid
              ? "none"
              : "0 0 32px oklch(0.55 0.2 285 / 0.45), 0 4px 16px rgba(0,0,0,0.35)",
            transition: "background 0.4s, color 0.4s, box-shadow 0.4s",
          }}
        >
          <span className="relative z-10">Begin Your Reading</span>
          {isValid && (
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(1 0 0 / 0.12) 0%, transparent 60%)",
              }}
              aria-hidden
            />
          )}
        </motion.button>
      </div>
    </form>
  );
}
