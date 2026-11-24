import type { Coupon } from './coupon';

export interface CouponRepository {
  save(coupon: Coupon): Promise<void>;
  findByCode(code: string): Promise<Coupon | null>;
  findAll(): Promise<Coupon[]>;
}
