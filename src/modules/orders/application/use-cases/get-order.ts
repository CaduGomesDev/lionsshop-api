import { OrderNotFoundError } from '../../domain/errors';
import type { OrderRepository } from '../../domain/order-repository';
import { toOrderDetails, type OrderDetails } from '../dtos';

export class GetOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(orderId: string): Promise<OrderDetails> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError();
    return toOrderDetails(order);
  }
}
