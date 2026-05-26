/**
 * tarot_cards 테이블 스키마
 * 78장의 타로 카드 데이터를 저장합니다.
 * - Major Arcana: 22장 (번호 0~21)
 * - Minor Arcana: 56장 (Wands, Cups, Swords, Pentacles 각 14장)
 */
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const tarotCards = pgTable("tarot_cards", {
  id: serial("id").primaryKey(),

  /** 카드 고유 슬러그 (예: "the-fool", "ace-of-wands") */
  slug: varchar("slug", { length: 100 }).notNull().unique(),

  /** 카드 이름 (예: "The Fool", "Ace of Wands") */
  name: varchar("name", { length: 100 }).notNull(),

  /** Major(대아르카나) / Minor(소아르카나) 구분 */
  arcana: varchar("arcana", { length: 10, enum: ["major", "minor"] }).notNull(),

  /** Major Arcana 번호 (0~21), Minor는 null */
  majorNumber: integer("major_number"),

  /** Minor Arcana 수트 (wands, cups, swords, pentacles), Major는 null */
  suit: varchar("suit", {
    length: 20,
    enum: ["wands", "cups", "swords", "pentacles"],
  }),

  /** 수트 내 순서 (Ace=1 ~ King=14), Major는 null */
  suitRank: integer("suit_rank"),

  /** 카드 이미지 URL 또는 경로 */
  imageUrl: text("image_url"),

  /** 정방향 핵심 키워드 (배열) */
  uprightKeywords: jsonb("upright_keywords").$type<string[]>().default([]),

  /** 역방향 핵심 키워드 (배열) */
  reversedKeywords: jsonb("reversed_keywords").$type<string[]>().default([]),

  /** 정방향 짧은 의미 */
  uprightMeaning: text("upright_meaning"),

  /** 역방향 짧은 의미 */
  reversedMeaning: text("reversed_meaning"),

  /** 동양철학적 해석 (오행, 음양 등) */
  easternInterpretation: text("eastern_interpretation"),

  /** 연관 원소 (fire, water, air, earth, spirit) */
  element: varchar("element", { length: 20 }),

  /** 연관 행성 또는 별자리 */
  astrology: varchar("astrology", { length: 50 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TarotCard = typeof tarotCards.$inferSelect;
export type NewTarotCard = typeof tarotCards.$inferInsert;
