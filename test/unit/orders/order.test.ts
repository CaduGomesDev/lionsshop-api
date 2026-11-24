import { Money } from '../../../src/shared/domain/money';
import { Order, OrderStatus } from '../../../src/modules/orders/domain/order';
import { OrderItem } from '../../../src/modules/orders/domain/order-item';
import {
  EmptyOrderError,
  InvalidQuantityError,
  OrderAlreadyCanceledError,
  OrderAlreadyShippedError,
  OrderNotPendingError,
} from '../../../src/modules/orders/domain/errors';

const now = new Date('2026-11-20T12:00:00Z');

function item(price: number, quantity: number, productId = 'p1') {
  return OrderItem.create({ productId, productName: 'Produto', unitPrice: Money.fromDecimal(price), quantity });
}

function placeOrder(total?: number) {
  const items = [item(79.9, 2), item(39.9, 1, 'p2')];
  return Order.place({ id: 'o1', customerId: 'c1', items, total: Money.fromDecimal(total ?? 199.7), now });
}

describe('OrderItem', () => {
  it('calcula o subtotal', () => {
    expect(item(79.9, 3).subtotal().toDecimal()).toBe(239.7);
  });

  it.each([0, -1, 1.5])('rejeita quantidade %p', (quantity) => {
    expect(() => item(10, quantity)).toThrow(InvalidQuantityError);
  });
});

describe('Order', () => {
  it('não pode ser criado sem itens', () => {
    expect(() => Order.place({ id: 'o1', customerId: 'c1', items: [], total: Money.zero(), now })).toThrow(EmptyOrderError);
  });

  it('nasce pendente', () => {
    expect(placeOrder().getStatus()).toBe(OrderStatus.PENDING);
  });

  it('soma os subtotais dos itens e expõe total e desconto', () => {
    const order = placeOrder(179.73);

    expect(order.subtotal().toDecimal()).toBe(199.7);
    expect(order.total().toDecimal()).toBe(179.73);
    expect(order.discount().toDecimal()).toBe(19.97);
  });

  it('não aceita total maior que o subtotal', () => {
    expect(() => placeOrder(300)).toThrow('O total do pedido não pode ser maior que o subtotal');
  });

  describe('cancelamento', () => {
    it('cancela um pedido pendente', () => {
      const order = placeOrder();
      order.cancel(now);
      expect(order.getStatus()).toBe(OrderStatus.CANCELED);
      expect(order.canceledAt).toEqual(now);
      expect(order.isBillable()).toBe(false);
    });

    it('não cancela pedido enviado', () => {
      const order = placeOrder();
      order.ship(now);
      expect(() => order.cancel(now)).toThrow(OrderAlreadyShippedError);
      expect(order.getStatus()).toBe(OrderStatus.SHIPPED);
    });

    it('não cancela duas vezes', () => {
      const order = placeOrder();
      order.cancel(now);
      expect(() => order.cancel(now)).toThrow(OrderAlreadyCanceledError);
    });
  });

  describe('envio', () => {
    it('envia um pedido pendente', () => {
      const order = placeOrder();
      order.ship(now);
      expect(order.getStatus()).toBe(OrderStatus.SHIPPED);
      expect(order.isBillable()).toBe(true);
    });

    it('só pedidos pendentes podem ser enviados', () => {
      const order = placeOrder();
      order.cancel(now);
      expect(() => order.ship(now)).toThrow(OrderNotPendingError);
    });
  });
});
