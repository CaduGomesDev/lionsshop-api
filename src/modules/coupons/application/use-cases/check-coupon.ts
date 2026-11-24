import type { Clock } from '../../../../shared/application/clock';
import { Coupon } from '../../domain/coupon';
import type { CouponRepository } from '../../domain/coupon-repository';
import { InvalidCouponError } from '../../domain/errors';

export interface CouponCheckInput {
  code: string;
  customerId: string;
}

export class CheckCouponUseCase {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CouponCheckInput): Promise<{ code: string; discountPercent: number }> {
    const coupon = await this.coupons.findByCode(Coupon.normalizeCode(input.code));
    if (!coupon) throw new InvalidCouponError();
    coupon.assertRedeemableBy(input.customerId, this.clock.now());
    return { code: coupon.code, discountPercent: coupon.discountPercent };
  }
}
