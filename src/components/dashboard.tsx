"use client";

import { useState, useEffect, useCallback } from "react";
import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TarotInfiniteWheel } from "@/components/tarot-infinite-wheel";
import { TAROT_DECK } from "@/lib/tarot-data";

interface DashboardProps {
  onLogout: () => void;
}

interface CardData {
  id: number;
  name: string;
  numeral: string;
  type: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  keywords: string[];
  upright: string;
}

const majorArcana: CardData[] = TAROT_DECK.filter((c) => c.type === "major").slice(0, 7);
const minorArcana: CardData[] = TAROT_DECK.filter((c) => c.type === "minor").slice(0, 7);

type Phase = "stacked" | "shuffling" | "dealing" | "selecting";

const CARD_HEIGHT = 196;

export function Dashboard({ onLogout }: DashboardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phase, setPhase] = useState<Phase>("stacked");
  const [selectedMajor, setSelectedMajor] = useState<CardData | null>(null);
  const [selectedMinor, setSelectedMinor] = useState<CardData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const baseCards = step === 1 ? majorArcana : minorArcana;
  const focusedCard = baseCards[focusedIndex % baseCards.length];

  // Deck intro: stacked → shuffling → dealing → selecting (timed)
  /* eslint-disable react-hooks/set-state-in-effect -- intentional phase machine on step change */
  useEffect(() => {
    if (step === 1 || step === 2) {
      setPhase("stacked");
      setFocusedIndex(0);
      const t1 = setTimeout(() => setPhase("shuffling"), 300);
      const t2 = setTimeout(() => setPhase("dealing"), 1000);
      const t3 = setTimeout(() => setPhase("selecting"), 1600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleWheelCenterChange = useCallback(
    (_card: CardData, deckIndex: number) => {
      setFocusedIndex(deckIndex);
    },
    [],
  );

  const handleSelectCard = (card: CardData) => {
    if (phase !== "selecting" || isTransitioning) return;
    
    // Only allow selecting the focused card
    if (card.id !== focusedCard.id) return;
    
    if (step === 1) {
      setSelectedMajor(card);
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(2);
        setIsTransitioning(false);
      }, 600);
    } else {
      setSelectedMinor(card);
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(3);
        setIsTransitioning(false);
      }, 600);
    }
  };

  const handleReveal = () => {
    alert(`Revealing alignment for:\n• ${selectedMajor?.name}\n• ${selectedMinor?.name}`);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedMajor(null);
    setSelectedMinor(null);
    setPhase("stacked");
    setFocusedIndex(0);
  };

  return (
    <div className="h-[100dvh] bg-background relative flex flex-col overflow-hidden overscroll-none">
      {/* Sign out */}
      <button
        onClick={onLogout}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>

      <AnimatePresence mode="wait">
        {/* Steps 1 & 2: Card Selection */}
        {step < 3 && (
          <motion.main
            key={`step-${step}`}
            initial={{ opacity: 0, x: step === 2 ? 100 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {/* Header — extra top space so scale(1.4) center card never clips */}
            <div className="flex-shrink-0 flex flex-col items-center pt-8 pb-2 px-4 sm:pt-12">
              {step === 2 && selectedMajor && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex flex-col items-center"
                >
                  <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-1">
                    Anchor Selected
                  </p>
                  <div className="w-8 h-11 rounded-lg bg-gradient-to-br from-[oklch(0.2_0.08_50)] to-[oklch(0.12_0.06_40)] border border-[oklch(0.7_0.15_50)] flex items-center justify-center shadow-[0_0_12px_oklch(0.7_0.15_50/0.3)]">
                    <span className="font-serif text-[10px] text-[oklch(0.85_0.12_50)]">
                      {selectedMajor.numeral}
                    </span>
                  </div>
                </motion.div>
              )}
              <p className="text-muted-foreground text-[10px] tracking-[0.25em] uppercase mb-0.5">
                {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
              </p>
              <h1 className="font-serif text-lg text-foreground tracking-wide">
                {step === 1 ? "Choose Your Anchor" : "Choose Your Guide"}
              </h1>
            </div>

            {/* Wheel viewport: POV locked, no native horizontal scroll (no page rubber-band) */}
            <div
              className="flex flex-1 flex-col items-center justify-start overflow-hidden overscroll-none pt-6 sm:pt-10"
              style={{
                touchAction: "pan-y",
                paddingTop: "max(2.5rem, 8vh)",
                WebkitOverflowScrolling: "auto",
              }}
            >
              {/* Pre-deal stack */}
              {(phase === "stacked" || phase === "shuffling" || phase === "dealing") && (
                <div className="relative flex items-center justify-center" style={{ height: CARD_HEIGHT }}>
                  {baseCards.map((card, index) => {
                    const centerOffset = (baseCards.length - 1) / 2;
                    const isDealing = phase === "dealing";
                    
                    return (
                      <motion.div
                        key={card.id}
                        className="absolute will-change-transform"
                        style={{
                          width: 140,
                          height: CARD_HEIGHT,
                          zIndex: baseCards.length - index,
                        }}
                        initial={{ x: 0, y: 0, rotate: 0 }}
                        animate={{
                          x: isDealing ? (index - centerOffset) * 50 : index * 2,
                          y: isDealing ? 0 : index * -1.5,
                          rotate: phase === "stacked" ? (index - centerOffset) * 4 : 0,
                          scale: phase === "shuffling" ? [1, 1.05, 0.95, 1] : 1,
                          opacity: isDealing ? 0 : 1,
                        }}
                        transition={{
                          duration: isDealing ? 0.4 : 0.3,
                          delay: isDealing ? index * 0.03 : 0,
                          ease: [0.23, 1, 0.32, 1],
                          scale: phase === "shuffling" ? { repeat: 5, duration: 0.1 } : undefined,
                        }}
                      >
                        <CardBack />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {phase === "selecting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex w-full max-w-3xl shrink-0 flex-col items-stretch justify-start px-1 sm:px-2"
                >
                  <TarotInfiniteWheel
                    key={step}
                    cards={baseCards}
                    disabled={isTransitioning}
                    onCenterCardChange={handleWheelCenterChange}
                    onSelectCard={handleSelectCard}
                  />
                </motion.div>
              )}
            </div>

            {/* Footer info */}
            <div className="flex-shrink-0 flex flex-col items-center pb-6 px-4">
              <AnimatePresence mode="wait">
                {phase === "selecting" && focusedCard && (
                  <motion.div
                    key={focusedCard.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="text-center mb-2"
                  >
                    <p className="font-serif text-xl text-foreground mb-0.5">
                      {focusedCard.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Do you feel the connection to this {step === 1 ? "Anchor" : "Guide"}?
                    </p>
                    <p className="text-[oklch(0.75_0.15_60)] text-xs mt-0.5">
                      ({step === 1 ? (selectedMajor ? "1" : "0") : (selectedMinor ? "1" : "0")}/1)
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "selecting" ? 0.6 : 0.3 }}
                className="text-muted-foreground text-xs"
              >
                {phase === "selecting" ? "Swipe to explore • Tap center card to select" : "Preparing the deck..."}
              </motion.p>
            </div>
          </motion.main>
        )}

        {/* Step 3: Reveal */}
        {step === 3 && selectedMajor && selectedMinor && (
          <motion.main
            key="step-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center px-6"
          >
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-1">
                Cards Chosen
              </p>
              <h1 className="font-serif text-2xl text-foreground tracking-wide">
                Ready for Alignment
              </h1>
            </div>

            {/* Selected cards */}
            <div className="flex gap-6 mb-6">
              {[selectedMajor, selectedMinor].map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 30, rotateY: 180 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0 }}
                  transition={{ delay: idx * 0.2, duration: 0.6 }}
                  className="flex flex-col items-center"
                >
                  <p className="text-muted-foreground text-[10px] tracking-widest uppercase mb-2">
                    {idx === 0 ? "Anchor" : "Guide"}
                  </p>
                  <div 
                    className="w-20 h-28 rounded-xl flex flex-col items-center justify-center"
                    style={{
                      background: "linear-gradient(145deg, oklch(0.2 0.08 280), oklch(0.1 0.05 260))",
                      border: "2px solid oklch(0.75 0.15 60)",
                      boxShadow: "0 0 40px oklch(0.75 0.18 60 / 0.5)",
                    }}
                  >
                    <span className="font-serif text-lg text-[oklch(0.95_0.1_60)] mb-0.5">
                      {card.numeral}
                    </span>
                    <span className="font-serif text-[9px] text-foreground/90 text-center px-1.5 leading-tight">
                      {card.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Reveal button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleReveal}
              className="px-8 py-3 rounded-full font-serif text-sm tracking-wide mb-3 cursor-pointer transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, oklch(0.75 0.18 60), oklch(0.65 0.15 50))",
                color: "oklch(0.1 0.02 60)",
                boxShadow: "0 0 40px oklch(0.7 0.18 60 / 0.5)",
              }}
            >
              Reveal Today&apos;s Alignment
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-muted-foreground text-[10px] text-center max-w-[200px] mb-6"
            >
              Unlock 24-hour unlimited access for $0.99
            </motion.p>

            {/* Reset button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.9 }}
              onClick={handleReset}
              className="text-muted-foreground text-xs underline cursor-pointer hover:text-foreground transition-colors"
            >
              Draw new cards
            </motion.button>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardBack() {
  return (
    <div 
      className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(145deg, oklch(0.14 0.04 280), oklch(0.07 0.02 260))",
        border: "1px solid oklch(0.35 0.08 190 / 0.4)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Sacred geometry pattern */}
      <div className="absolute inset-3 border border-[oklch(0.4_0.08_190/0.15)] rounded-xl" />
      <div className="absolute inset-5 border border-[oklch(0.35_0.06_280/0.1)] rounded-lg" />
      
      {/* Center mystic symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border border-[oklch(0.4_0.08_190/0.25)] flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-[oklch(0.3_0.06_190/0.15)]" />
        </div>
      </div>
    </div>
  );
}
