import type { Order } from './order';

export interface OrderRepository {
  nextId(): string;
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
  findAll(): Promise<Order[]>;
}
