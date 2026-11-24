import type { Money } from '../../../shared/domain/money';
import { InvalidQuantityError } from './errors';

export class OrderItem {
  private constructor(
    readonly productId: string,
    readonly productName: string,
    readonly unitPrice: Money,
    readonly quantity: number,
  ) {}

  static create(input: { productId: string; productName: string; unitPrice: Money; quantity: number }): OrderItem {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new InvalidQuantityError();
    return new OrderItem(input.productId, input.productName, input.unitPrice, input.quantity);
  }

  subtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}
