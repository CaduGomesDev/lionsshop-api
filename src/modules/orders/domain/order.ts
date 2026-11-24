import { ValidationError } from '../../../shared/domain/domain-error';
import { Money } from '../../../shared/domain/money';
import { EmptyOrderError, OrderAlreadyCanceledError, OrderAlreadyShippedError, OrderNotPendingError } from './errors';
import type { OrderItem } from './order-item';

export enum OrderStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  CANCELED = 'CANCELED',
}

export interface OrderProps {
  id: string;
  customerId: string;
  items: OrderItem[];
  couponCode: string | null;
  total: Money;
  status: OrderStatus;
  createdAt: Date;
  shippedAt: Date | null;
  canceledAt: Date | null;
}

export class Order {
  private constructor(private readonly props: OrderProps) {}

  static place(input: {
    id: string;
    customerId: string;
    items: OrderItem[];
    couponCode?: string | null;
    total: Money;
    now: Date;
  }): Order {
    if (input.items.length === 0) throw new EmptyOrderError();
    const subtotal = Money.sum(input.items.map((item) => item.subtotal()));
    if (input.total.isGreaterThan(subtotal)) {
      throw new ValidationError('O total do pedido não pode ser maior que o subtotal');
    }
    return new Order({
      id: input.id,
      customerId: input.customerId,
      items: [...input.items],
      couponCode: input.couponCode ?? null,
      total: input.total,
      status: OrderStatus.PENDING,
      createdAt: input.now,
      shippedAt: null,
      canceledAt: null,
    });
  }

  static restore(props: OrderProps): Order {
    return new Order({ ...props, items: [...props.items] });
  }

  get id(): string {
    return this.props.id;
  }
  get customerId(): string {
    return this.props.customerId;
  }
  get items(): readonly OrderItem[] {
    return this.props.items;
  }
  get couponCode(): string | null {
    return this.props.couponCode;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get shippedAt(): Date | null {
    return this.props.shippedAt;
  }
  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }

  getStatus(): OrderStatus {
    return this.props.status;
  }

  subtotal(): Money {
    return Money.sum(this.props.items.map((item) => item.subtotal()));
  }

  total(): Money {
    return this.props.total;
  }

  discount(): Money {
    return this.subtotal().subtract(this.props.total);
  }

  ship(now: Date): void {
    if (this.props.status !== OrderStatus.PENDING) throw new OrderNotPendingError();
    this.props.status = OrderStatus.SHIPPED;
    this.props.shippedAt = now;
  }

  cancel(now: Date): void {
    if (this.props.status === OrderStatus.SHIPPED) throw new OrderAlreadyShippedError();
    if (this.props.status === OrderStatus.CANCELED) throw new OrderAlreadyCanceledError();
    this.props.status = OrderStatus.CANCELED;
    this.props.canceledAt = now;
  }

  isBillable(): boolean {
    return this.props.status !== OrderStatus.CANCELED;
  }

  snapshot(): OrderProps {
    return { ...this.props, items: [...this.props.items] };
  }
}
