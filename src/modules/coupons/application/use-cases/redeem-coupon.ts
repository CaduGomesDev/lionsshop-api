import type { Clock } from '../../../../shared/application/clock';
import { Coupon } from '../../domain/coupon';
import type { CouponRepository } from '../../domain/coupon-repository';
import { InvalidCouponError } from '../../domain/errors';
import type { CouponCheckInput } from './check-coupon';

export class RedeemCouponUseCase {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CouponCheckInput): Promise<void> {
    const coupon = await this.coupons.findByCode(Coupon.normalizeCode(input.code));
    if (!coupon) throw new InvalidCouponError();
    coupon.redeem(input.customerId, this.clock.now());
    await this.coupons.save(coupon);
  }
}
