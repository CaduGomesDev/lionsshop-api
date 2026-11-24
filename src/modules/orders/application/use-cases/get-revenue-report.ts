import { Money } from '../../../../shared/domain/money';
import type { OrderRepository } from '../../domain/order-repository';
import type { RevenueReport } from '../dtos';

export class GetRevenueReportUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(): Promise<RevenueReport> {
    const billable = (await this.orders.findAll()).filter((order) => order.isBillable());
    const revenue = Money.sum(billable.map((order) => order.total()));
    return { orders: billable.length, revenue: revenue.toDecimal() };
  }
}
