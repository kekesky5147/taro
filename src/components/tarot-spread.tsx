'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { SacredGeometryLogo } from '@/components/sacred-geometry-logo'
import { TarotInfiniteWheel } from '@/components/tarot-infinite-wheel'
import type { SourceRect } from '@/components/tarot-infinite-wheel'
import { TAROT_DECK } from '@/lib/tarot-data'
import type { TarotCard } from '@/lib/tarot-data'
import {
  pauseCosmicBackground,
  resumeCosmicBackground
} from '@/lib/cosmic-bg-pause'

const CARD_W = 96
const CARD_H = 134
const FLIGHT_MS = 580 // flying card animation duration (ms)
const heroEase = [0.22, 1, 0.36, 1] as const
// 안정적인 참조 — 매 렌더마다 새 화살표 함수 생성 방지
const noop = () => {}

type FlyingCard = {
  id: string
  card: TarotCard
  from: SourceRect
  to: SourceRect
}

// ─── Shared card back face ────────────────────────────────────────────────────
const HiddenCardFace = memo(function HiddenCardFace ({
  width = CARD_W,
  height = CARD_H
}: {
  width?: number
  height?: number
}) {
  return (
    <div
      className='relative overflow-hidden rounded-xl'
      style={{
        width,
        height,
        border: '1px solid oklch(0.6 0.1 240 / 0.35)',
        background:
          'linear-gradient(160deg, oklch(0.14 0.06 255), oklch(0.09 0.04 265))',
        boxShadow:
          '0 0 14px oklch(0.5 0.12 240 / 0.25), 0 8px 24px rgba(0,0,0,0.45)'
      }}
    >
      <div
        className='pointer-events-none absolute inset-x-0 top-0 h-1/3'
        style={{
          background:
            'linear-gradient(to bottom, oklch(0.6 0.1 240 / 0.08), transparent)'
        }}
      />
      <div
        className='pointer-events-none absolute inset-2 rounded-lg border'
        style={{ borderColor: 'oklch(0.55 0.1 240 / 0.2)' }}
      />
      <div
        className='pointer-events-none absolute inset-[14px] rounded-md border'
        style={{ borderColor: 'oklch(0.5 0.08 240 / 0.12)' }}
      />
      {(
        [
          'left-[4px] top-[4px]',
          'right-[4px] top-[4px]',
          'left-[4px] bottom-[4px]',
          'right-[4px] bottom-[4px]'
        ] as const
      ).map(pos => (
        <span
          key={pos}
          className={`pointer-events-none absolute ${pos} text-[6px] leading-none`}
          style={{ color: 'oklch(0.5 0.1 240 / 0.55)' }}
          aria-hidden
        >
          ✦
        </span>
      ))}
      <div className='absolute inset-0 flex items-center justify-center'>
        <div
          className='flex h-9 w-9 items-center justify-center rounded-full border'
          style={{
            borderColor: 'oklch(0.55 0.12 240 / 0.5)',
            boxShadow: '0 0 14px oklch(0.5 0.12 240 / 0.3)'
          }}
        >
          <div
            className='h-[18px] w-[18px] rounded-full'
            style={{
              background:
                'radial-gradient(circle, oklch(0.55 0.14 240 / 0.6) 0%, oklch(0.3 0.08 255 / 0.2) 100%)',
              boxShadow: '0 0 10px oklch(0.5 0.14 240 / 0.4)'
            }}
          />
        </div>
      </div>
    </div>
  )
});

// ─── Flying card portal (fixed-position overlay) ──────────────────────────────
const FlyingCardPortal = memo(function FlyingCardPortal ({
  flights,
  onComplete
}: {
  flights: FlyingCard[]
  onComplete: (id: string) => void
}) {
  return createPortal(
    <>
      {flights.map(f => {
        // Use CSS transform: keep card at 'from' size/position, transform to 'to'
        const scale = CARD_W / f.from.width
        const fromCx = f.from.x + f.from.width / 2
        const fromCy = f.from.y + f.from.height / 2
        const toCx = f.to.x + f.to.width / 2
        const toCy = f.to.y + f.to.height / 2

        return (
          <motion.div
            key={f.id}
            style={{
              position: 'fixed',
              left: f.from.x,
              top: f.from.y,
              width: f.from.width,
              height: f.from.height,
              transformOrigin: 'center center',
              zIndex: 9000,
              pointerEvents: 'none'
            }}
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={{ x: toCx - fromCx, y: toCy - fromCy, scale }}
            transition={{ duration: FLIGHT_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => onComplete(f.id)}
          >
            <HiddenCardFace width={f.from.width} height={f.from.height} />
          </motion.div>
        )
      })}
    </>,
    document.body
  )
});

// ─── TarotSpread ──────────────────────────────────────────────────────────────
export type TarotSpreadProps = {
  onAllSelected: (cards: [TarotCard, TarotCard, TarotCard]) => void
  /** "결과보기" 버튼 클릭 시 호출 — submitReading 직접 실행 */
  onReveal: () => void
}

export function TarotSpread ({ onAllSelected, onReveal }: TarotSpreadProps) {
  const [selected, setSelected] = useState<TarotCard[]>([])
  const [allDone, setAllDone] = useState(false)
  const [flights, setFlights] = useState<FlyingCard[]>([])
  const [showResetModal, setShowResetModal] = useState(false)
  // pendingCount: tracked as both state (for render) and ref (for sync access in callbacks)
  const [pendingCount, setPendingCount] = useState(0)

  // 컴포넌트 마운트 시 1회만 셔플 — 매 세션마다 카드 순서가 달라짐
  const shuffledDeck = useMemo(() => {
    const deck = [...TAROT_DECK]
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
  }, [])

  // How many cards are currently in-flight (not yet landed in a slot)
  const pendingRef = useRef(0)
  // Refs to the 3 spread slot elements (always in DOM for measurement)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([null, null, null])
  // Ref to wheel container (used for fallback destination estimate)
  const wheelWrapRef = useRef<HTMLDivElement>(null)
  // CTA button ref for auto-scroll
  const ctaRef = useRef<HTMLDivElement>(null)
  // 이미 뽑은 카드 id — 연속 탭 시 리렌더 전 중복 선택 방지
  const pickedIdsRef = useRef(new Set<number>())

  const pickedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of selected) ids.add(c.id)
    for (const f of flights) ids.add(f.card.id)
    return ids
  }, [selected, flights])

  const availableDeck = useMemo(
    () => shuffledDeck.filter(c => !pickedIds.has(c.id)),
    [shuffledDeck, pickedIds]
  )

  // 3장이 모두 착지하면 부모에게 알림 (setState 업데이터 밖에서 호출해야 React 규칙 준수)
  useEffect(() => {
    if (selected.length === 3 && pendingRef.current === 0) {
      onAllSelected(selected as [TarotCard, TarotCard, TarotCard])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const handleSelect = useCallback(
    (card: TarotCard, sourceRect: SourceRect | null) => {
      // effectiveCount = landed cards + in-flight cards (use ref for sync accuracy)
      if (selected.length + pendingRef.current >= 3) return
      if (pickedIdsRef.current.has(card.id)) return

      pickedIdsRef.current.add(card.id)

      const slotIndex = selected.length + pendingRef.current
      if (slotIndex >= 3) return
      pendingRef.current++
      setPendingCount(c => c + 1)

      // ── Compute destination slot rect ──────────────────────────────────────
      let destRect: SourceRect
      const slotEl = slotRefs.current[slotIndex]
      if (slotEl) {
        const r = slotEl.getBoundingClientRect()
        destRect = { x: r.left, y: r.top, width: r.width, height: r.height }
      } else {
        // Fallback estimate (slot not yet visible)
        const wheelEl = wheelWrapRef.current
        const wheelBottom = wheelEl
          ? wheelEl.getBoundingClientRect().bottom + 24
          : window.innerHeight * 0.65
        const totalW = 3 * CARD_W + 2 * 16
        const startX = window.innerWidth / 2 - totalW / 2
        destRect = {
          x: startX + slotIndex * (CARD_W + 16),
          y: wheelBottom,
          width: CARD_W,
          height: CARD_H
        }
      }

      // ── Launch flying card ─────────────────────────────────────────────────
      if (sourceRect) {
        pauseCosmicBackground()
        const flyId = `fly-${slotIndex}-${Date.now()}`
        setFlights(prev => [
          ...prev,
          { id: flyId, card, from: sourceRect, to: destRect }
        ])
      }

      // ── Land card after flight ─────────────────────────────────────────────
      setTimeout(
        () => {
          pendingRef.current--
          setPendingCount(c => Math.max(0, c - 1))
          setSelected(prev => {
            const next = [...prev, card]
            if (next.length === 3) {
              setAllDone(true)
              // onAllSelected은 setState 업데이터 밖 useEffect에서 호출
            }
            return next
          })
        },
        sourceRect ? FLIGHT_MS : 0
      )
    },
    [selected.length]
  )

  const handleFlightComplete = useCallback((id: string) => {
    setFlights(prev => {
      const next = prev.filter(f => f.id !== id)
      if (next.length === 0) resumeCosmicBackground()
      return next
    })
  }, [])

  const effectiveCount = selected.length + pendingCount
  const remainingPicks = 3 - effectiveCount
  // Show spread row as soon as any card is in-flight or has landed
  const spreadVisible = selected.length > 0 || flights.length > 0

  const handleReset = () => {
    pickedIdsRef.current.clear()
    setSelected([])
    setAllDone(false)
    setFlights([])
    setPendingCount(0)
    pendingRef.current = 0
    setShowResetModal(false)
  }

  return (
    <div className='relative flex w-full flex-col items-center gap-0'>
      {/* ── Restart icon (top-right, fades in after first pick) ── */}
      <AnimatePresence>
        {effectiveCount > 0 && (
          <motion.button
            type='button'
            aria-label='Restart card selection'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: heroEase }}
            onClick={() => setShowResetModal(true)}
            className='group absolute right-0 top-0 z-20 flex h-8 w-8 items-center justify-center'
          >
            <RefreshCw
              size={13}
              strokeWidth={1.5}
              className='transition-all duration-500 ease-out'
              style={{ color: 'oklch(0.65 0.1 240 / 0.75)' }}
              // hover handled via group class below
            />
            <style>{`
              .group:hover svg {
                color: oklch(0.7 0.12 240) !important;
                transform: rotate(180deg);
              }
            `}</style>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Reset confirmation modal (fixed viewport overlay) ── */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            className='fixed inset-0 z-200 flex items-center justify-center px-6'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: heroEase }}
            onClick={() => setShowResetModal(false)}
          >
            {/* backdrop */}
            <div
              className='absolute inset-0'
              style={{ background: 'oklch(0.04 0.02 255 / 0.88)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.28, ease: heroEase }}
              className='relative z-10 flex w-full max-w-xl flex-col items-center gap-8 rounded-2xl px-16 py-[52px] text-center'
              style={{
                background: 'oklch(0.11 0.05 255 / 0.95)',
                border: '1px solid oklch(0.55 0.1 240 / 0.2)',
                boxShadow:
                  '0 0 60px oklch(0.4 0.1 255 / 0.3), 0 24px 48px rgba(0,0,0,0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* logo */}
              <div
                className='shrink-0 opacity-80'
                style={{ width: 96, height: 96 }}
              >
                <SacredGeometryLogo className='h-full w-full' hideGlow />
              </div>

              {/* message */}
              <p
                className='max-w-[220px] font-serif text-sm leading-relaxed'
                style={{ color: 'oklch(0.78 0.06 220 / 0.85)' }}
              >
                Do you wish to clear your current cards and begin a new reading?
              </p>

              {/* actions */}
              <div className='flex items-center gap-3'>
                {/* Stay */}
                <motion.button
                  type='button'
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowResetModal(false)}
                  className='rounded-full px-5 py-2 text-xs font-medium tracking-wide transition-colors'
                  style={{
                    background: 'oklch(0.18 0.05 255 / 0.6)',
                    border: '1px solid oklch(0.5 0.08 240 / 0.3)',
                    color: 'oklch(0.6 0.06 220 / 0.8)'
                  }}
                >
                  Stay
                </motion.button>

                {/* Clear */}
                <motion.button
                  type='button'
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className='relative overflow-hidden rounded-full px-5 py-2 text-xs font-medium tracking-wide'
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(0.55 0.15 240), oklch(0.42 0.14 260))',
                    color: 'oklch(0.92 0.04 220)',
                    boxShadow:
                      '0 0 18px oklch(0.5 0.15 240 / 0.4), 0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <span className='relative z-10'>Clear</span>
                  <span
                    className='pointer-events-none absolute inset-0'
                    style={{
                      background:
                        'linear-gradient(135deg, oklch(1 0 0 / 0.1) 0%, transparent 60%)'
                    }}
                    aria-hidden
                  />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wheel ── */}
      <div
        ref={wheelWrapRef}
        className='relative w-full overflow-hidden rounded-2xl border border-white/8 bg-black/48 shadow-[0_0_0_1px_oklch(1_0_0/0.04)_inset]'
      >
        <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[oklch(0.75_0.12_55/0.25)] to-transparent' />
        <TarotInfiniteWheel
          cards={availableDeck}
          onCenterCardChange={noop}
          onSelectCard={handleSelect}
          disabled={effectiveCount >= 3 || availableDeck.length === 0}
          remainingPicks={remainingPicks}
        />
      </div>

      {/*
        ── Spread slots ──
        Always in the DOM so slotRefs are measurable when a card is tapped.
        Invisible (opacity 0) until first card is in-flight or landed.
      */}
      <div
        className='mt-6 w-full transition-opacity duration-300'
        style={{
          opacity: spreadVisible ? 1 : 0,
          pointerEvents: spreadVisible ? 'auto' : 'none'
        }}
      >
        <div className='flex items-start justify-center gap-4 sm:gap-6'>
          {Array.from({ length: 3 }).map((_, i) => {
            const landed = selected[i] !== undefined
            const inFlight =
              !landed && i === selected.length && flights.length > 0
            return (
              <div
                key={i}
                ref={el => {
                  slotRefs.current[i] = el
                }}
                style={{ width: CARD_W, height: CARD_H }}
              >
                {landed ? (
                  // Card has landed — show card face (fade in)
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: heroEase }}
                  >
                    <HiddenCardFace />
                  </motion.div>
                ) : (
                  // Ghost slot placeholder
                  <div
                    className='h-full w-full rounded-xl border border-dashed border-white/20'
                    style={{ opacity: inFlight ? 0.08 : 0.22 }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 결과보기 CTA ── */}
      <AnimatePresence>
        {allDone && <RevealButton onReveal={onReveal} containerRef={ctaRef} />}
      </AnimatePresence>

      {/* ── Flying card portal ── */}
      {typeof window !== 'undefined' && flights.length > 0 && (
        <FlyingCardPortal flights={flights} onComplete={handleFlightComplete} />
      )}
    </div>
  )
}

// ─── RevealButton ──────────────────────────────────────────────────────────────
const REVEAL_CTA_FOCUS_DELAY_MS = 650 // fade-in delay(200) + duration(450)

function RevealButton ({
  onReveal,
  containerRef
}: {
  onReveal: () => void
  containerRef?: React.RefObject<HTMLDivElement | null>
}) {
  const [isRevealing, setIsRevealing] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      containerRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      buttonRef.current?.focus({ preventScroll: true })
    }, REVEAL_CTA_FOCUS_DELAY_MS)
    return () => clearTimeout(t)
  }, [containerRef])

  const handleClick = () => {
    if (isRevealing) return
    setIsRevealing(true)
    onReveal()
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
      className='mt-8 flex flex-col items-center gap-3'
    >
      <p className='text-center text-xs leading-relaxed text-white/45'>
        Your three cards have been drawn.
        <br />
        Reveal the wisdom they hold for you.
      </p>
      <button
        ref={buttonRef}
        type='button'
        onClick={handleClick}
        disabled={isRevealing}
        className='relative overflow-hidden rounded-full px-8 py-3 text-sm font-medium tracking-wide outline-none transition-all focus-visible:ring-2 focus-visible:ring-oklch(0.72 0.18 190 / 0.85) focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70'
        style={{
          background: isRevealing
            ? 'oklch(0.25 0.08 270 / 0.7)'
            : 'linear-gradient(135deg, oklch(0.58 0.22 285), oklch(0.52 0.2 210))',
          color: 'oklch(0.95 0.03 220)',
          boxShadow: isRevealing
            ? 'none'
            : '0 0 32px oklch(0.55 0.2 285 / 0.45), 0 4px 16px rgba(0,0,0,0.35)',
          transition: 'background 0.3s, box-shadow 0.3s'
        }}
      >
        <span className='relative z-10 flex items-center gap-2'>
          {isRevealing && (
            <motion.span
              className='inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent'
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {isRevealing ? 'Reading your cards...' : 'Reveal My Reading'}
        </span>
        {!isRevealing && (
          <span
            className='pointer-events-none absolute inset-0'
            style={{
              background:
                'linear-gradient(135deg, oklch(1 0 0 / 0.12) 0%, transparent 60%)'
            }}
            aria-hidden
          />
        )}
      </button>
    </motion.div>
  )
}
