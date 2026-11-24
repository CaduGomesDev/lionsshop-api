import { DiscountService } from '../../src/modules/orders/domain/discount-service';
import { OrderStatus } from '../../src/modules/orders/domain/order';
import {
  EmptyOrderError,
  InvalidQuantityError,
  OrderAlreadyShippedError,
  OrderNotFoundError,
} from '../../src/modules/orders/domain/errors';
import {
  CustomerNotFoundError,
  InsufficientStockError,
  ProductNotFoundError,
} from '../../src/modules/orders/application/errors';
import { CancelOrderUseCase } from '../../src/modules/orders/application/use-cases/cancel-order';
import { CreateOrderUseCase } from '../../src/modules/orders/application/use-cases/create-order';
import { GetOrderUseCase } from '../../src/modules/orders/application/use-cases/get-order';
import { GetRevenueReportUseCase } from '../../src/modules/orders/application/use-cases/get-revenue-report';
import { ListCustomerOrdersUseCase } from '../../src/modules/orders/application/use-cases/list-customer-orders';
import { ShipOrderUseCase } from '../../src/modules/orders/application/use-cases/ship-order';
import { InMemoryOrderRepository } from '../../src/modules/orders/infra/database/in-memory-order-repository';
import { CouponAlreadyUsedError, InvalidCouponError } from '../../src/modules/coupons/domain/errors';
import { FakeMailer, FixedClock } from '../support/fakes';
import { FakeCouponGateway, FakeCustomerDirectory, FakeProductCatalog } from '../support/order-fakes';

function makeSut() {
  const orders = new InMemoryOrderRepository();
  const catalog = new FakeProductCatalog().add('camiseta', 'Camiseta Lions', 79.9, 50).add('moletom', 'Moletom', 189.9, 1);
  const customers = new FakeCustomerDirectory().add('ana').add('bruno', true);
  const coupons = new FakeCouponGateway().add('LIONS10', 10).add('BLACKFRIDAY', 30);
  const mailer = new FakeMailer();
  const clock = new FixedClock();

  return {
    orders,
    catalog,
    coupons,
    mailer,
    clock,
    createOrder: new CreateOrderUseCase(orders, catalog, customers, coupons, new DiscountService(), mailer, clock),
    cancelOrder: new CancelOrderUseCase(orders, catalog, customers, mailer, clock),
    shipOrder: new ShipOrderUseCase(orders, customers, mailer, clock),
    getOrder: new GetOrderUseCase(orders),
    listCustomerOrders: new ListCustomerOrdersUseCase(orders, customers),
    revenue: new GetRevenueReportUseCase(orders),
  };
}

describe('CreateOrderUseCase', () => {
  it('cria o pedido, aplica cupom + VIP, baixa o estoque, registra o cupom e envia e-mail', async () => {
    const sut = makeSut();

    const output = await sut.createOrder.execute({
      customerId: 'bruno',
      items: [{ productId: 'camiseta', quantity: 2 }],
      coupon: 'lions10',
    });

    expect(output).toEqual({ id: expect.any(String), total: 136.63, status: OrderStatus.PENDING });
    expect(sut.catalog.stockOf('camiseta')).toBe(48);
    expect(sut.coupons.redeemed).toEqual([{ code: 'LIONS10', customerId: 'bruno' }]);
    expect(sut.mailer.sent[0]).toMatchObject({ to: 'bruno@example.com', subject: 'Pedido recebido!' });
    expect(await sut.orders.findById(output.id)).not.toBeNull();
  });

  it('não devolve a entidade, só o DTO de saída', async () => {
    const sut = makeSut();
    const output = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }] });
    expect(Object.keys(output).sort()).toEqual(['id', 'status', 'total']);
  });

  it.each([
    ['pedido vazio', { customerId: 'ana', items: [] }, EmptyOrderError],
    ['cliente inexistente', { customerId: 'x', items: [{ productId: 'camiseta', quantity: 1 }] }, CustomerNotFoundError],
    ['produto inexistente', { customerId: 'ana', items: [{ productId: 'x', quantity: 1 }] }, ProductNotFoundError],
    ['quantidade inválida', { customerId: 'ana', items: [{ productId: 'camiseta', quantity: 0 }] }, InvalidQuantityError],
    ['estoque insuficiente', { customerId: 'ana', items: [{ productId: 'moletom', quantity: 2 }] }, InsufficientStockError],
    ['cupom inexistente', { customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }], coupon: 'NAO' }, InvalidCouponError],
  ])('rejeita %s sem alterar nada', async (_case, input, error) => {
    const sut = makeSut();
    await expect(sut.createOrder.execute(input)).rejects.toThrow(error);
    expect(await sut.orders.findAll()).toHaveLength(0);
    expect(sut.catalog.stockOf('camiseta')).toBe(50);
    expect(sut.mailer.sent).toHaveLength(0);
  });

  it('soma linhas repetidas do mesmo produto ao conferir o estoque', async () => {
    const sut = makeSut();
    const input = { customerId: 'ana', items: [{ productId: 'moletom', quantity: 1 }, { productId: 'moletom', quantity: 1 }] };
    await expect(sut.createOrder.execute(input)).rejects.toThrow(InsufficientStockError);
  });

  it('o cliente não pode usar o mesmo cupom duas vezes', async () => {
    const sut = makeSut();
    const input = { customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }], coupon: 'LIONS10' };
    await sut.createOrder.execute(input);
    await expect(sut.createOrder.execute(input)).rejects.toThrow(CouponAlreadyUsedError);
  });
});

describe('CancelOrderUseCase', () => {
  it('cancela um pedido pendente, devolve os itens ao estoque e avisa o cliente', async () => {
    const sut = makeSut();
    const { id } = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 3 }] });
    expect(sut.catalog.stockOf('camiseta')).toBe(47);

    const output = await sut.cancelOrder.execute({ orderId: id });

    expect(output).toEqual({ id, status: OrderStatus.CANCELED });
    expect(sut.catalog.stockOf('camiseta')).toBe(50);
    expect((await sut.orders.findById(id))!.getStatus()).toBe(OrderStatus.CANCELED);
    expect(sut.mailer.subjects()).toContain('Pedido cancelado');
  });

  it('não cancela pedido enviado (regra da entidade) e não mexe no estoque', async () => {
    const sut = makeSut();
    const { id } = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }] });
    await sut.shipOrder.execute({ orderId: id });

    await expect(sut.cancelOrder.execute({ orderId: id })).rejects.toThrow(OrderAlreadyShippedError);
    expect(sut.catalog.stockOf('camiseta')).toBe(49);
  });

  it('lança erro se o pedido não existir', async () => {
    await expect(makeSut().cancelOrder.execute({ orderId: 'nao-existe' })).rejects.toThrow(OrderNotFoundError);
  });
});

describe('ListCustomerOrdersUseCase', () => {
  it('lista os pedidos do cliente, do mais recente para o mais antigo, com status e total', async () => {
    const sut = makeSut();
    const first = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }] });
    sut.clock.advanceMinutes(10);
    await sut.createOrder.execute({ customerId: 'bruno', items: [{ productId: 'camiseta', quantity: 1 }] });
    sut.clock.advanceMinutes(10);
    const second = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 2 }] });
    await sut.cancelOrder.execute({ orderId: first.id });

    const orders = await sut.listCustomerOrders.execute({ customerId: 'ana' });

    expect(orders.map((o) => [o.id, o.status, o.total])).toEqual([
      [second.id, OrderStatus.PENDING, 159.8],
      [first.id, OrderStatus.CANCELED, 79.9],
    ]);
  });

  it('cliente inexistente gera erro', async () => {
    await expect(makeSut().listCustomerOrders.execute({ customerId: 'x' })).rejects.toThrow(CustomerNotFoundError);
  });
});

describe('GetRevenueReportUseCase', () => {
  it('soma o total cobrado dos pedidos válidos e ignora cancelados', async () => {
    const sut = makeSut();
    await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }], coupon: 'BLACKFRIDAY' });
    const canceled = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 1 }] });
    await sut.cancelOrder.execute({ orderId: canceled.id });

    expect(await sut.revenue.execute()).toEqual({ orders: 1, revenue: 55.93 });
  });
});

describe('GetOrderUseCase', () => {
  it('detalha subtotal, desconto e total', async () => {
    const sut = makeSut();
    const { id } = await sut.createOrder.execute({ customerId: 'ana', items: [{ productId: 'camiseta', quantity: 2 }], coupon: 'LIONS10' });
    expect(await sut.getOrder.execute(id)).toMatchObject({ subtotal: 159.8, discount: 15.98, total: 143.82, coupon: 'LIONS10' });
  });
});
