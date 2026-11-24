import type { Clock } from '../../../../shared/application/clock';
import type { Mailer } from '../../../../shared/application/mailer';
import { OrderNotFoundError } from '../../domain/errors';
import type { OrderRepository } from '../../domain/order-repository';
import type { OrderStatusOutput } from '../dtos';
import type { CustomerDirectory } from '../ports';

export class ShipOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerDirectory,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}

  async execute(input: { orderId: string }): Promise<OrderStatusOutput> {
    const order = await this.orders.findById(input.orderId);
    if (!order) throw new OrderNotFoundError();

    order.ship(this.clock.now());
    await this.orders.save(order);

    const customer = await this.customers.findById(order.customerId);
    if (customer) {
      await this.mailer.send({
        to: customer.email,
        subject: 'Pedido enviado!',
        body: `Olá ${customer.name}, seu pedido saiu para entrega.`,
      });
    }

    return { id: order.id, status: order.getStatus() };
  }
}
