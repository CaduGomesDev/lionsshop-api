import type { OrderRepository } from '../../domain/order-repository';
import { toOrderSummary, type OrderSummary } from '../dtos';

export class ListOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(): Promise<OrderSummary[]> {
    return (await this.orders.findAll()).map(toOrderSummary);
  }
}
