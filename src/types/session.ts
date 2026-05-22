/**
 * 타로 리딩 세션 관련 공용 타입 정의
 */

export type SessionStatus = "selecting" | "completed" | "revealed";

/**
 * Server Action의 표준 응답 형식
 * 성공 시 data, 실패 시 error를 담습니다.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
