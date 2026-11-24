import type { CouponRepository } from '../../domain/coupon-repository';
import { toCouponOutput, type CouponOutput } from '../coupon-output';

export class ListCouponsUseCase {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(): Promise<CouponOutput[]> {
    return (await this.coupons.findAll()).map(toCouponOutput);
  }
}
