import { Money } from '../../../../shared/domain/money';
import { toDbId, type DbId } from '../../../../shared/infra/database/object-id';
import { Order, OrderStatus } from '../../domain/order';
import { OrderItem } from '../../domain/order-item';

export interface OrderDocument {
  _id: DbId;
  customerId: DbId;
  items: { productId: DbId; name: string; price: number; quantity: number }[];
  coupon: string | null;
  total: number;
  status: 1 | 2 | 3;
  createdAt: Date;
  shippedAt?: Date | null;
  canceledAt?: Date | null;
}

const STATUS_TO_DB: Record<OrderStatus, OrderDocument['status']> = {
  [OrderStatus.PENDING]: 1,
  [OrderStatus.SHIPPED]: 2,
  [OrderStatus.CANCELED]: 3,
};

const STATUS_FROM_DB: Record<number, OrderStatus> = {
  1: OrderStatus.PENDING,
  2: OrderStatus.SHIPPED,
  3: OrderStatus.CANCELED,
};

export const OrderMapper = {
  toDomain(doc: OrderDocument): Order {
    return Order.restore({
      id: String(doc._id),
      customerId: String(doc.customerId),
      items: doc.items.map((item) =>
        OrderItem.create({
          productId: String(item.productId),
          productName: item.name,
          unitPrice: Money.fromDecimal(item.price),
          quantity: item.quantity,
        }),
      ),
      couponCode: doc.coupon ?? null,
      total: Money.fromDecimal(doc.total),
      status: STATUS_FROM_DB[doc.status] ?? OrderStatus.PENDING,
      createdAt: doc.createdAt,
      shippedAt: doc.shippedAt ?? null,
      canceledAt: doc.canceledAt ?? null,
    });
  },

  toPersistence(order: Order): OrderDocument {
    return {
      _id: toDbId(order.id),
      customerId: toDbId(order.customerId),
      items: order.items.map((item) => ({
        productId: toDbId(item.productId),
        name: item.productName,
        price: item.unitPrice.toDecimal(),
        quantity: item.quantity,
      })),
      coupon: order.couponCode,
      total: order.total().toDecimal(),
      status: STATUS_TO_DB[order.getStatus()],
      createdAt: order.createdAt,
      shippedAt: order.shippedAt,
      canceledAt: order.canceledAt,
    };
  },
};
