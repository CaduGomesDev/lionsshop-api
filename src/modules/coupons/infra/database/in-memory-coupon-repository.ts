import { Coupon, type CouponProps } from '../../domain/coupon';
import type { CouponRepository } from '../../domain/coupon-repository';

export class InMemoryCouponRepository implements CouponRepository {
  private readonly items = new Map<string, CouponProps>();

  async save(coupon: Coupon): Promise<void> {
    this.items.set(coupon.code, coupon.snapshot());
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const props = this.items.get(code);
    return props ? Coupon.restore(props) : null;
  }

  async findAll(): Promise<Coupon[]> {
    return [...this.items.values()].map((props) => Coupon.restore(props));
  }
}
