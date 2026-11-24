import { Money } from '../../src/shared/domain/money';
import { CouponAlreadyUsedError, InvalidCouponError } from '../../src/modules/coupons/domain/errors';
import type {
  AppliedCoupon,
  CatalogProduct,
  CouponGateway,
  CustomerDirectory,
  CustomerInfo,
  ProductCatalog,
} from '../../src/modules/orders/application/ports';

export class FakeProductCatalog implements ProductCatalog {
  readonly products = new Map<string, CatalogProduct>();

  add(id: string, name: string, price: number, stock: number): this {
    this.products.set(id, { id, name, price: Money.fromDecimal(price), stock });
    return this;
  }

  stockOf(id: string): number | undefined {
    return this.products.get(id)?.stock;
  }

  async findById(productId: string): Promise<CatalogProduct | null> {
    const product = this.products.get(productId);
    return product ? { ...product } : null;
  }

  async withdrawStock(productId: string, quantity: number): Promise<void> {
    this.products.get(productId)!.stock -= quantity;
  }

  async restock(productId: string, quantity: number): Promise<void> {
    this.products.get(productId)!.stock += quantity;
  }
}

export class FakeCustomerDirectory implements CustomerDirectory {
  readonly customers = new Map<string, CustomerInfo>();

  add(id: string, vip = false): this {
    this.customers.set(id, { id, name: `Cliente ${id}`, email: `${id}@example.com`, vip });
    return this;
  }

  async findById(customerId: string): Promise<CustomerInfo | null> {
    return this.customers.get(customerId) ?? null;
  }
}

export class FakeCouponGateway implements CouponGateway {
  readonly coupons = new Map<string, number>();
  readonly redeemed: { code: string; customerId: string }[] = [];

  add(code: string, discountPercent: number): this {
    this.coupons.set(code, discountPercent);
    return this;
  }

  async check(code: string, customerId: string): Promise<AppliedCoupon> {
    const percent = this.coupons.get(code.toUpperCase());
    if (percent === undefined) throw new InvalidCouponError();
    if (this.redeemed.some((r) => r.code === code.toUpperCase() && r.customerId === customerId)) {
      throw new CouponAlreadyUsedError();
    }
    return { code: code.toUpperCase(), discountPercent: percent };
  }

  async redeem(code: string, customerId: string): Promise<void> {
    this.redeemed.push({ code, customerId });
  }
}
