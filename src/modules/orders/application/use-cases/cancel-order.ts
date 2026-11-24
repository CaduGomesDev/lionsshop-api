import type { Clock } from '../../../../shared/application/clock';
import type { Mailer } from '../../../../shared/application/mailer';
import { OrderNotFoundError } from '../../domain/errors';
import type { OrderRepository } from '../../domain/order-repository';
import type { OrderStatusOutput } from '../dtos';
import type { CustomerDirectory, ProductCatalog } from '../ports';

export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: ProductCatalog,
    private readonly customers: CustomerDirectory,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}

  async execute(input: { orderId: string }): Promise<OrderStatusOutput> {
    const order = await this.orders.findById(input.orderId);
    if (!order) throw new OrderNotFoundError();

    order.cancel(this.clock.now());

    for (const item of order.items) {
      await this.catalog.restock(item.productId, item.quantity);
    }
    await this.orders.save(order);

    const customer = await this.customers.findById(order.customerId);
    if (customer) {
      await this.mailer.send({
        to: customer.email,
        subject: 'Pedido cancelado',
        body: `Olá ${customer.name}, seu pedido ${order.id} foi cancelado.`,
      });
    }

    return { id: order.id, status: order.getStatus() };
  }
}
