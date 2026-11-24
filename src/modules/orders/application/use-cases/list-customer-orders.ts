import type { OrderRepository } from '../../domain/order-repository';
import { toOrderSummary, type OrderSummary } from '../dtos';
import { CustomerNotFoundError } from '../errors';
import type { CustomerDirectory } from '../ports';

export class ListCustomerOrdersUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerDirectory,
  ) {}

  async execute(input: { customerId: string }): Promise<OrderSummary[]> {
    const customer = await this.customers.findById(input.customerId);
    if (!customer) throw new CustomerNotFoundError();
    return (await this.orders.findByCustomer(customer.id)).map(toOrderSummary);
  }
}
