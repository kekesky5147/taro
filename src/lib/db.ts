/**
 * Drizzle ORM 클라이언트 초기화 (서버 전용)
 *
 * Next.js의 서버 컴포넌트 / Server Action / Route Handler에서만 import할 것.
 * 클라이언트 컴포넌트에서 직접 import하면 빌드 에러가 발생합니다.
 */
import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
}

/**
 * postgres.js 연결 풀
 * - max: 서버리스 환경(Supabase + Vercel)에서는 1~3으로 낮게 유지 권장
 * - prepare: false (Supabase Transaction pooler 호환)
 */
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

/**
 * Drizzle ORM 인스턴스
 * 모든 DB 쿼리는 이 객체를 통해 실행합니다.
 */
export const db = drizzle(client, { schema });
