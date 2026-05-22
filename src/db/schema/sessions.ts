/**
 * 타로 리딩 세션 관련 테이블 스키마
 *
 * reading_sessions: 사용자의 고민/질문과 세션 메타데이터
 * session_cards:    세션에서 선택된 카드 3장 (과거/현재/미래)
 */
import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tarotCards } from "./cards";

export const readingSessions = pgTable("reading_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Supabase Auth 사용자 ID (auth.users.id 참조)
   * 로그인 전에는 null — 비로그인 상태로 카드 선택 허용,
   * 결과 열람 시 로그인 연동
   */
  userId: uuid("user_id"),

  /** 사용자가 입력한 고민/질문 원문 */
  intention: text("intention").notNull(),

  /**
   * 세션 상태
   * - selecting: 카드 선택 중
   * - completed:  3장 선택 완료, 결과 생성 전
   * - revealed:   AI 리딩 생성 완료
   */
  status: varchar("status", {
    length: 20,
    enum: ["selecting", "completed", "revealed"],
  })
    .default("selecting")
    .notNull(),

  /** OpenAI가 생성한 최종 리딩 텍스트 (revealed 상태에서 채워짐) */
  aiReading: text("ai_reading"),

  /** AI 리딩 생성에 사용한 모델 식별자 */
  aiModel: varchar("ai_model", { length: 50 }),

  /** 프리미엄(동양철학) 해석 결제 완료 여부 */
  isPremium: boolean("is_premium").default(false).notNull(),

  /** 프리미엄 동양철학 AI 해석 텍스트 */
  premiumReading: text("premium_reading"),

  /** 무료 경로용 동양철학 맛보기 텍스트 (1~2줄 노출 후 블러) */
  easternTeaser: text("eastern_teaser"),

  /** 선택적 별자리 (유저 제공 시) */
  zodiacSign: varchar("zodiac_sign", { length: 30 }),

  /** Stripe Payment Intent ID (결제 검증용) */
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),

  /** 세션 만료 시각 (예: 24시간 뒤) */
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessionCards = pgTable("session_cards", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),

  /** 소속 세션 */
  sessionId: uuid("session_id")
    .notNull()
    .references(() => readingSessions.id, { onDelete: "cascade" }),

  /** 선택된 카드 ID */
  cardId: integer("card_id")
    .notNull()
    .references(() => tarotCards.id),

  /**
   * 카드 포지션
   * - 0: Past (과거)
   * - 1: Present (현재)
   * - 2: Future (미래)
   */
  position: integer("position").notNull(),

  /** 역방향 여부 (true = reversed) */
  isReversed: boolean("is_reversed").default(false).notNull(),

  /** AI가 해당 포지션에 대해 생성한 개별 해석 */
  positionReading: text("position_reading"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ── Relations ─────────────────────────────────────────── */

export const readingSessionsRelations = relations(
  readingSessions,
  ({ many }) => ({
    cards: many(sessionCards),
  }),
);

export const sessionCardsRelations = relations(sessionCards, ({ one }) => ({
  session: one(readingSessions, {
    fields: [sessionCards.sessionId],
    references: [readingSessions.id],
  }),
  card: one(tarotCards, {
    fields: [sessionCards.cardId],
    references: [tarotCards.id],
  }),
}));

export type ReadingSession = typeof readingSessions.$inferSelect;
export type NewReadingSession = typeof readingSessions.$inferInsert;
export type SessionCard = typeof sessionCards.$inferSelect;
export type NewSessionCard = typeof sessionCards.$inferInsert;
