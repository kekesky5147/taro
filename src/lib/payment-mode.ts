/**
 * 개발 환경 결제 모드
 *
 * - 기본(dev): Stripe 결제 플로우 테스트 (createPaymentIntent + Elements)
 * - NEXT_PUBLIC_SKIP_PAYMENT_IN_DEV=true: 결제 없이 unlockPremiumDev (빠른 UI 테스트)
 */
export function shouldSkipPaymentInDev(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.NEXT_PUBLIC_SKIP_PAYMENT_IN_DEV === "true";
}
