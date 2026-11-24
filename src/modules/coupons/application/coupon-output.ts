import type { Coupon } from '../domain/coupon';

export interface CouponOutput {
  code: string;
  discountPercent: number;
  expiresAt: Date;
}

export function toCouponOutput(coupon: Coupon): CouponOutput {
  return { code: coupon.code, discountPercent: coupon.discountPercent, expiresAt: coupon.expiresAt };
}
