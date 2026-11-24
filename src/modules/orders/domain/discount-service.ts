import type { Money } from '../../../shared/domain/money';

export interface DiscountCustomer {
  vip: boolean;
}

export interface DiscountCoupon {
  discountPercent: number;
}

export class DiscountService {
  static readonly VIP_DISCOUNT_PERCENT = 5;

  calculate(subtotal: Money, customer: DiscountCustomer, coupon?: DiscountCoupon | null): Money {
    let total = subtotal;
    if (coupon) total = total.applyDiscount(coupon.discountPercent);
    if (customer.vip) total = total.applyDiscount(DiscountService.VIP_DISCOUNT_PERCENT);
    return total;
  }
}
