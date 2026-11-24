import type { Order, OrderStatus } from '../domain/order';

export interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  coupon?: string | null;
}

export interface CreateOrderOutput {
  id: string;
  total: number;
  status: OrderStatus;
}

export interface OrderSummary {
  id: string;
  customerId: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface OrderDetails extends OrderSummary {
  items: { productId: string; name: string; price: number; quantity: number }[];
  coupon: string | null;
  subtotal: number;
  discount: number;
}

export interface OrderStatusOutput {
  id: string;
  status: OrderStatus;
}

export interface RevenueReport {
  orders: number;
  revenue: number;
}

export function toOrderSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    customerId: order.customerId,
    total: order.total().toDecimal(),
    status: order.getStatus(),
    createdAt: order.createdAt,
  };
}

export function toOrderDetails(order: Order): OrderDetails {
  return {
    ...toOrderSummary(order),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      price: item.unitPrice.toDecimal(),
      quantity: item.quantity,
    })),
    coupon: order.couponCode,
    subtotal: order.subtotal().toDecimal(),
    discount: order.discount().toDecimal(),
  };
}
