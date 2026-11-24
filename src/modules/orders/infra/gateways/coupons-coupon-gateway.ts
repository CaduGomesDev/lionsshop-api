import type { CheckCouponUseCase, RedeemCouponUseCase } from '../../../coupons';
import type { AppliedCoupon, CouponGateway } from '../../application/ports';

export class CouponsCouponGateway implements CouponGateway {
  constructor(
    private readonly checkCoupon: CheckCouponUseCase,
    private readonly redeemCoupon: RedeemCouponUseCase,
  ) {}

  check(code: string, customerId: string): Promise<AppliedCoupon> {
    return this.checkCoupon.execute({ code, customerId });
  }

  redeem(code: string, customerId: string): Promise<void> {
    return this.redeemCoupon.execute({ code, customerId });
  }
}
