import { randomUUID } from 'node:crypto';
import { Order, type OrderProps } from '../../domain/order';
import type { OrderRepository } from '../../domain/order-repository';

interface Stored {
  props: OrderProps;
  sequence: number;
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, Stored>();
  private sequence = 0;

  nextId(): string {
    return randomUUID();
  }

  async save(order: Order): Promise<void> {
    const existing = this.items.get(order.id);
    this.items.set(order.id, { props: order.snapshot(), sequence: existing?.sequence ?? this.sequence++ });
  }

  async findById(id: string): Promise<Order | null> {
    const stored = this.items.get(id);
    return stored ? Order.restore(stored.props) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.newestFirst().filter((order) => order.customerId === customerId);
  }

  async findAll(): Promise<Order[]> {
    return this.newestFirst();
  }

  private newestFirst(): Order[] {
    return [...this.items.values()]
      .sort((a, b) => b.props.createdAt.getTime() - a.props.createdAt.getTime() || b.sequence - a.sequence)
      .map((stored) => Order.restore(stored.props));
  }
}
