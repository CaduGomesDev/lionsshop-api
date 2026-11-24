import type { Money } from '../../../shared/domain/money';

export interface CatalogProduct {
  id: string;
  name: string;
  price: Money;
  stock: number;
}

export interface ProductCatalog {
  findById(productId: string): Promise<CatalogProduct | null>;
  withdrawStock(productId: string, quantity: number): Promise<void>;
  restock(productId: string, quantity: number): Promise<void>;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  vip: boolean;
}

export interface CustomerDirectory {
  findById(customerId: string): Promise<CustomerInfo | null>;
}

export interface AppliedCoupon {
  code: string;
  discountPercent: number;
}

export interface CouponGateway {
  check(code: string, customerId: string): Promise<AppliedCoupon>;
  redeem(code: string, customerId: string): Promise<void>;
}
