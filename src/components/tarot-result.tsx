'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { TarotCard } from '@/lib/tarot-data'
import { getTarotCardImageUrl } from '@/lib/tarot-card-images'
import type { MysticPathChoice } from '@/types/reading'
import { EasternTeaserBlock } from '@/components/mystic-path/eastern-teaser-block'
import { SacredGeometryLogo } from '@/components/sacred-geometry-logo'
import { mysticEase, mysticTheme } from '@/components/mystic-path/mystic-theme'
import {
  findSectionBody,
  parseReadingSections
} from '@/lib/reading-sections'

const TIMELINE_SLOT_MIN_H = 'min(420px, 52vh)'
const TIMELINE_CARD_WIDTH = 88
const TIMELINE_CARD_HEIGHT = 124
/** Message 카드 페이드인 delay(0.35) + duration(0.55) */
const MESSAGE_FOCUS_DELAY_MS = 920

/** 플립 뒷면 — 플레이스홀더 자리에 육망성 로고만 */
function TimelineLogoPlaceholder ({ logoIdPrefix }: { logoIdPrefix: string }) {
  return (
    <div
      className='relative shrink-0'
      style={{ width: TIMELINE_CARD_WIDTH, height: TIMELINE_CARD_HEIGHT }}
    >
      <SacredGeometryLogo
        className='h-full w-full opacity-90'
        hideGlow
        idPrefix={logoIdPrefix}
      />
    </div>
  )
}

function timelineBoxStyle (isMajor: boolean) {
  return {
    borderColor: isMajor ? mysticTheme.goldDim : 'rgba(255,255,255,0.1)',
    background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
    boxShadow: isMajor
      ? `0 0 16px ${mysticTheme.goldGlow}`
      : '0 4px 20px rgba(0,0,0,0.22)'
  }
}

/** Past / Present / Future — 박스 전체 3D 플립 (앞: 아트 / 뒤: 원래 UI — 카드 정보·포지션 리딩) */
function TimelineReadingCard ({
  label,
  card,
  interpretation,
  delay,
  index,
  isFlipped,
  onFlip
}: {
  label: string
  card: TarotCard
  interpretation: string
  delay: number
  index: number
  isFlipped: boolean
  onFlip: (index: number) => void
}) {
  const isMajor = card.type === 'major'
  const imageSrc = getTarotCardImageUrl(card)
  const [imgFailed, setImgFailed] = useState(false)
  const boxStyle = timelineBoxStyle(isMajor)

  useEffect(() => {
    setImgFailed(false)
  }, [imageSrc])

  const useRemoteImg = imageSrc.startsWith('http')

  /** iOS Safari: backfaceVisibility만으로는 앞면이 거울상으로 비침 → visibility로 강제 전환 */
  const frontFaceStyle = {
    ...boxStyle,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    transform: 'rotateY(0deg) translateZ(2px)',
    visibility: isFlipped ? ('hidden' as const) : ('visible' as const)
  }

  const backFaceStyle = {
    ...boxStyle,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    transform: 'rotateY(180deg) translateZ(2px)',
    visibility: isFlipped ? ('visible' as const) : ('hidden' as const)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: mysticEase, delay }}
      className='min-w-0 flex-1'
    >
      <button
        type='button'
        onClick={() => onFlip(index)}
        aria-label={
          isFlipped
            ? `${label} — show front of ${card.name}`
            : `${label} — flip ${card.name}`
        }
        className='block h-full w-full cursor-pointer rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2'
        style={{
          perspective: 1100,
          outlineColor: mysticTheme.goldDim,
          WebkitPerspective: 1100
        }}
      >
        <motion.div
          className='relative w-full'
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            minHeight: TIMELINE_SLOT_MIN_H
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: mysticEase }}
        >
          {/* 앞면 — 타임라인 박스 전체에 아트워크 */}
          <div
            className='absolute inset-0 flex flex-col overflow-hidden rounded-2xl border'
            style={frontFaceStyle}
            aria-hidden={isFlipped}
          >
            <span
              className='relative z-10 px-2 pb-1 pt-3 text-center text-[8px] font-medium uppercase tracking-[0.32em] sm:text-[9px] sm:tracking-[0.38em]'
              style={{
                color: mysticTheme.gold,
                textShadow: '0 1px 8px rgba(0,0,0,0.85)'
              }}
            >
              {label}
            </span>
            <div className='relative min-h-0 flex-1'>
              {!imgFailed ? (
                useRemoteImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={card.name}
                    className='absolute inset-0 h-full w-full object-cover object-center'
                    onError={() => setImgFailed(true)}
                    loading='eager'
                    decoding='async'
                  />
                ) : (
                  <Image
                    src={imageSrc}
                    alt={card.name}
                    fill
                    sizes='(max-width: 640px) 30vw, 200px'
                    className='object-cover object-center'
                    onError={() => setImgFailed(true)}
                  />
                )
              ) : (
                <div
                  className='flex h-full w-full items-center justify-center px-3'
                  style={{
                    background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`
                  }}
                >
                  <span
                    className='text-center font-serif text-sm'
                    style={{ color: mysticTheme.gold }}
                  >
                    {card.name}
                  </span>
                </div>
              )}
              <div
                className='pointer-events-none absolute inset-0'
                style={{
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 42%)'
                }}
              />
            </div>
            <p
              className='relative z-10 px-2 pb-3 text-center text-[8px] leading-snug sm:text-[9px]'
              style={{
                color: mysticTheme.offWhiteMuted,
                textShadow: '0 1px 6px rgba(0,0,0,0.9)'
              }}
            >
              Tap to turn over
            </p>
          </div>

          {/* 뒷면 — 상단 고정 / 보더 아래 리딩만 스크롤 */}
          <div
            className='absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border px-2 py-3 sm:px-3 sm:py-4'
            style={backFaceStyle}
            aria-hidden={!isFlipped}
          >
            <span
              className='mb-2 shrink-0 text-[8px] font-medium uppercase tracking-[0.32em] sm:text-[9px] sm:tracking-[0.38em]'
              style={{ color: mysticTheme.gold }}
            >
              {label}
            </span>

            <TimelineLogoPlaceholder logoIdPrefix={`timeline-flip-${index}`} />

            {/* 이름·Major·키워드 — 모바일 2줄 뱃지까지 확보 후 보더 */}
            <div className='mt-1 flex w-full shrink-0 flex-col items-center'>
              <h3
                className='line-clamp-2 max-h-[2.25rem] shrink-0 text-center font-serif text-xs leading-snug sm:max-h-8 sm:text-sm'
                style={{ color: isMajor ? mysticTheme.gold : mysticTheme.offWhite }}
              >
                {card.name}
              </h3>

              <div className='flex min-h-[0.625rem] w-full shrink-0 items-center justify-center'>
                {isMajor && (
                  <span
                    className='rounded-full border px-1.5 py-px text-[7px] uppercase leading-none tracking-[0.15em] sm:text-[8px]'
                    style={{ borderColor: mysticTheme.goldDim, color: mysticTheme.gold }}
                  >
                    ✦ Major
                  </span>
                )}
              </div>

              <div className='mt-1 flex min-h-[2.75rem] w-full shrink-0 flex-wrap content-center justify-center gap-x-1 gap-y-1 px-0.5 pb-1 sm:min-h-6'>
                {card.keywords.slice(0, 3).map(kw => (
                  <span
                    key={kw}
                    className='rounded-full border px-1.5 py-px text-[7px] capitalize sm:px-2 sm:text-[8px]'
                    style={{
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: mysticTheme.offWhiteMuted,
                      background: 'rgba(255,255,255,0.04)'
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div
              className='mt-1 flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t pt-2 sm:mt-2'
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
                <motion.p
                  initial={false}
                  animate={
                    isFlipped ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }
                  }
                  transition={{ duration: 0.45, ease: mysticEase }}
                  className='px-0.5 pb-1 text-center font-serif text-[11px] leading-relaxed sm:text-xs sm:leading-[1.7]'
                  style={{ color: mysticTheme.offWhite }}
                >
                  {interpretation ||
                    'The cards hold their counsel — your reader will speak when the path is clear.'}
                </motion.p>
              </div>
            </div>
          </div>
        </motion.div>
      </button>
    </motion.div>
  )
}

function MessageReadingCard ({
  body,
  delay,
  readingUnlocked,
  articleRef
}: {
  body: string
  delay: number
  readingUnlocked: boolean
  articleRef?: RefObject<HTMLElement | null>
}) {
  if (!body.trim()) return null

  return (
    <AnimatePresence>
      {readingUnlocked && (
        <motion.article
          ref={articleRef}
          tabIndex={-1}
          role='region'
          aria-label='Reading message'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: mysticEase, delay }}
          className='w-full rounded-2xl border p-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:p-5'
          style={{
            borderColor: mysticTheme.goldDim,
            background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
            boxShadow: `0 0 24px ${mysticTheme.goldGlow}`,
            outlineColor: mysticTheme.goldDim
          }}
        >
          <span
            className='text-[9px] font-medium uppercase tracking-[0.35em]'
            style={{ color: mysticTheme.gold }}
          >
            Message
          </span>
          <p
            className='mt-3 font-serif text-sm leading-relaxed italic sm:text-[15px] sm:leading-[1.75]'
            style={{ color: mysticTheme.offWhite }}
          >
            {body}
          </p>
        </motion.article>
      )}
    </AnimatePresence>
  )
}

export type TarotResultProps = {
  cards: [TarotCard, TarotCard, TarotCard]
  reading: string
  sessionId: string
  path: MysticPathChoice
  easternTeaser: string | null
  isPremium: boolean
  premiumReading: string | null
  onRestart: () => void
  onPremiumUnlocked?: (premiumReading: string) => void
}

export function TarotResult ({
  cards,
  reading,
  sessionId,
  path,
  easternTeaser,
  isPremium,
  premiumReading,
  onRestart,
  onPremiumUnlocked
}: TarotResultProps) {
  const [past, present, future] = cards
  const allSections = useMemo(() => parseReadingSections(reading), [reading])
  const [premium, setPremium] = useState(isPremium)
  const [premiumText, setPremiumText] = useState(premiumReading)

  const [flipStates, setFlipStates] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false
  ])
  const [revealedSlots, setRevealedSlots] = useState<Set<number>>(() => new Set())

  const readingUnlocked = revealedSlots.size >= 3
  const messageCardRef = useRef<HTMLElement>(null)

  const handleFlip = useCallback((index: number) => {
    setFlipStates(prev => {
      const next: [boolean, boolean, boolean] = [...prev] as [
        boolean,
        boolean,
        boolean
      ]
      const turningToBack = !next[index]
      next[index] = turningToBack
      if (turningToBack) {
        setRevealedSlots(revealed => {
          const updated = new Set(revealed)
          updated.add(index)
          return updated
        })
      }
      return next
    })
  }, [])

  const messageBody = findSectionBody(allSections, 'Message')

  useEffect(() => {
    if (!readingUnlocked) return
    const t = setTimeout(() => {
      messageCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
      messageCardRef.current?.focus({ preventScroll: true })
    }, MESSAGE_FOCUS_DELAY_MS)
    return () => clearTimeout(t)
  }, [readingUnlocked])

  useEffect(() => {
    setPremium(isPremium)
    setPremiumText(premiumReading)
  }, [isPremium, premiumReading])

  const timelineCards = [
    { label: 'Past' as const, card: past },
    { label: 'Present' as const, card: present },
    { label: 'Future' as const, card: future }
  ]

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: mysticEase }}
      className='mx-auto w-full max-w-2xl space-y-4 pb-24'
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: mysticEase }}
        className='mb-2 text-center'
      >
        <p
          className='font-serif text-[10px] uppercase tracking-[0.4em]'
          style={{ color: mysticTheme.offWhiteMuted }}
        >
          The Standard Reading
        </p>
        <h2
          className='mt-1 font-serif text-xl sm:text-2xl'
          style={{ color: mysticTheme.gold }}
        >
          Past · Present · Future
        </h2>
        <div
          className='mx-auto mt-2 h-px w-20'
          style={{
            background: `linear-gradient(to right, transparent, ${mysticTheme.gold}, transparent)`
          }}
        />
        {!readingUnlocked && (
          <p
            className='mx-auto mt-3 max-w-xs font-serif text-[11px] leading-relaxed'
            style={{ color: mysticTheme.offWhiteMuted }}
          >
            Turn over Past, Present, and Future to reveal the message below.
          </p>
        )}
      </motion.div>

      <div className='flex w-full items-stretch gap-2 sm:gap-3'>
        {timelineCards.map(({ label, card }, i) => (
          <TimelineReadingCard
            key={label}
            label={label}
            card={card}
            index={i}
            isFlipped={flipStates[i]}
            onFlip={handleFlip}
            interpretation={findSectionBody(allSections, label)}
            delay={0.05 + i * 0.08}
          />
        ))}
      </div>

      <div className='mt-4 w-full'>
        <MessageReadingCard
          body={messageBody}
          delay={0.35}
          readingUnlocked={readingUnlocked}
          articleRef={messageCardRef}
        />

        {readingUnlocked &&
          allSections.length === 1 &&
          allSections[0]?.id === 'reading' && (
            <motion.article
              ref={!messageBody.trim() ? messageCardRef : undefined}
              tabIndex={-1}
              role='region'
              aria-label='Reading'
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: mysticEase, delay: 0.2 }}
              className='rounded-2xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:p-5'
              style={{
                borderColor: 'rgba(255,255,255,0.1)',
                background: mysticTheme.glass,
                outlineColor: mysticTheme.goldDim
              }}
            >
              <p
                className='whitespace-pre-line font-serif text-sm leading-relaxed'
                style={{ color: mysticTheme.offWhiteMuted }}
              >
                {allSections[0].body}
              </p>
            </motion.article>
          )}
      </div>

      <AnimatePresence>
        {easternTeaser && readingUnlocked && (
          <EasternTeaserBlock
            sessionId={sessionId}
            easternTeaser={easternTeaser}
            isPremium={premium}
            premiumReading={premiumText}
            onUnlocked={text => {
              setPremium(true)
              setPremiumText(text)
              onPremiumUnlocked?.(text)
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: mysticEase, delay: 0.2 }}
        className='flex flex-col items-center gap-6 py-10'
      >
        <p
          className='font-serif text-[10px] uppercase tracking-[0.3em]'
          style={{ color: mysticTheme.offWhiteMuted }}
        >
          ✦ End of reading ✦
        </p>
        <div
          className='h-px w-24'
          style={{
            background: `linear-gradient(to right, transparent, ${mysticTheme.goldDim}, transparent)`
          }}
        />
        <motion.button
          type='button'
          onClick={onRestart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className='rounded-full border px-8 py-3 font-serif text-sm tracking-wide'
          style={{
            borderColor: mysticTheme.goldDim,
            color: mysticTheme.offWhiteMuted,
            background: mysticTheme.glass
          }}
        >
          ✦ Start a New Reading
        </motion.button>
      </motion.div>
    </motion.section>
  )
}
