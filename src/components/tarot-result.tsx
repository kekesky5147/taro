'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { TarotCard } from '@/lib/tarot-data'
import { getTarotCardImageUrl } from '@/lib/tarot-card-images'
import type { MysticPathChoice } from '@/types/reading'
import { EasternTeaserBlock } from '@/components/mystic-path/eastern-teaser-block'
import { mysticEase, mysticTheme } from '@/components/mystic-path/mystic-theme'

type ReadingSection = {
  id: string
  title: string
  body: string
}

function parseReadingSections (reading: string): ReadingSection[] {
  const lines = reading.trim().split('\n')
  const sections: ReadingSection[] = []
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    const headerMatch =
      line.match(/^#{1,4}\s+(.+)/) || line.match(/^\*\*(.+)\*\*\s*$/)

    if (headerMatch) {
      if (current && current.lines.join('').trim()) {
        sections.push({
          id: current.title.toLowerCase().replace(/\s+/g, '-'),
          title: current.title,
          body: current.lines.join('\n').trim()
        })
      }
      current = { title: headerMatch[1].trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }

  if (current && current.lines.join('').trim()) {
    sections.push({
      id: current.title.toLowerCase().replace(/\s+/g, '-'),
      title: current.title,
      body: current.lines.join('\n').trim()
    })
  }

  if (sections.length === 0) {
    return [{ id: 'reading', title: 'Your Reading', body: reading.trim() }]
  }

  return sections
}

function findSectionBody (sections: ReadingSection[], title: string): string {
  const key = title.toLowerCase()
  const hit = sections.find(s => s.title.toLowerCase() === key)
  return hit?.body ?? ''
}

const TIMELINE_SLOT_MIN_H = 'min(420px, 52vh)'

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
            ? `${label} — ${card.name} 앞면 보기`
            : `${label} — ${card.name} 뒤집기`
        }
        className='block h-full w-full cursor-pointer rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2'
        style={{ perspective: 1100, outlineColor: mysticTheme.goldDim }}
      >
        <motion.div
          className='relative w-full'
          style={{
            transformStyle: 'preserve-3d',
            minHeight: TIMELINE_SLOT_MIN_H
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: mysticEase }}
        >
          {/* 앞면 — 타임라인 박스 전체에 아트워크 */}
          <div
            className='absolute inset-0 flex flex-col overflow-hidden rounded-2xl border'
            style={{
              ...boxStyle,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)'
            }}
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
                <Image
                  src={imageSrc}
                  alt={card.name}
                  fill
                  sizes='(max-width: 640px) 30vw, 200px'
                  className='object-cover object-center'
                  onError={() => setImgFailed(true)}
                  unoptimized={imageSrc.startsWith('http')}
                />
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

          {/* 뒷면 — 원래 타임라인 카드 UI (이름·키워드·포지션 리딩) */}
          <div
            className='absolute inset-0 flex min-w-0 flex-1 flex-col items-center overflow-y-auto rounded-2xl border px-2 py-4 sm:px-3 sm:py-5'
            style={{
              ...boxStyle,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <span
              className='mb-3 text-[8px] font-medium uppercase tracking-[0.32em] sm:text-[9px] sm:tracking-[0.38em]'
              style={{ color: mysticTheme.gold }}
            >
              {label}
            </span>

            <h3
              className='mt-0 line-clamp-2 text-center font-serif text-xs leading-snug sm:text-sm'
              style={{ color: isMajor ? mysticTheme.gold : mysticTheme.offWhite }}
            >
              {card.name}
            </h3>

            {isMajor && (
              <span
                className='mt-1 rounded-full border px-1.5 py-px text-[7px] uppercase tracking-[0.15em] sm:text-[8px]'
                style={{ borderColor: mysticTheme.goldDim, color: mysticTheme.gold }}
              >
                ✦ Major
              </span>
            )}

            <div className='mt-2 flex min-h-[24px] w-full flex-wrap justify-center gap-1 px-0.5'>
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

            <div
              className='mt-3 w-full flex-1 border-t pt-3 sm:mt-4 sm:pt-4'
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p
                className='mb-1.5 text-center text-[8px] uppercase tracking-[0.22em] sm:text-[9px]'
                style={{ color: mysticTheme.offWhiteMuted }}
              >
                Your reader
              </p>
              <motion.p
                initial={false}
                animate={
                  isFlipped ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }
                }
                transition={{ duration: 0.45, ease: mysticEase }}
                className='text-center font-serif text-[11px] leading-relaxed sm:text-xs sm:leading-[1.7]'
                style={{ color: mysticTheme.offWhite }}
              >
                {interpretation ||
                  'The cards hold their counsel — your reader will speak when the path is clear.'}
              </motion.p>
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
  readingUnlocked
}: {
  body: string
  delay: number
  readingUnlocked: boolean
}) {
  if (!body.trim()) return null

  return (
    <AnimatePresence>
      {readingUnlocked && (
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: mysticEase, delay }}
          className='w-full rounded-2xl border p-4 text-center sm:p-5'
          style={{
            borderColor: mysticTheme.goldDim,
            background: `linear-gradient(145deg, ${mysticTheme.navyMid}, ${mysticTheme.charcoal})`,
            boxShadow: `0 0 24px ${mysticTheme.goldGlow}`
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
        />

        {readingUnlocked &&
          allSections.length === 1 &&
          allSections[0]?.id === 'reading' && (
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: mysticEase, delay: 0.2 }}
              className='rounded-2xl border p-4 sm:p-5'
              style={{
                borderColor: 'rgba(255,255,255,0.1)',
                background: mysticTheme.glass
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

      {easternTeaser && (
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
