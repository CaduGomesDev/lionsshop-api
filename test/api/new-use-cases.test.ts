import request from 'supertest';
import type { Express } from 'express';
import { buildApp } from '../../src/main';
import { FakeMailer, FixedClock } from '../support/fakes';

let app: Express;
let mailer: FakeMailer;
let clock: FixedClock;
let productId: string;
let customerId: string;
let vipId: string;

beforeEach(async () => {
  mailer = new FakeMailer();
  clock = new FixedClock(new Date('2026-11-20T12:00:00Z'));
  app = buildApp({ repository: 'memory', mailer, clock });

  productId = (await request(app).post('/products').send({ name: 'Camiseta Lions', price: 79.9, stock: 10 })).body.id;
  customerId = (await request(app).post('/customers').send({ name: 'Ana', email: 'ana@example.com' })).body.id;
  vipId = (await request(app).post('/customers').send({ name: 'Bruno', email: 'bruno@example.com', vip: true })).body.id;
});

async function placeOrder(body: Record<string, unknown> = {}) {
  return request(app)
    .post('/orders')
    .send({ customerId, items: [{ productId, quantity: 2 }], ...body });
}

async function stock() {
  return (await request(app).get('/products')).body[0].stock;
}

describe('PATCH /orders/:id/cancel', () => {
  it('cancela pedido pendente, devolve estoque, avisa o cliente e tira do faturamento', async () => {
    const order = (await placeOrder()).body;
    expect(await stock()).toBe(8);

    const res = await request(app).patch(`/orders/${order.id}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: order.id, status: 'CANCELADO' });
    expect(await stock()).toBe(10);
    expect(mailer.subjects()).toContain('Pedido cancelado');
    expect((await request(app).get('/reports/revenue')).body).toEqual({ orders: 0, revenue: 0 });
  });

  it('pedido enviado não pode ser cancelado (409)', async () => {
    const order = (await placeOrder()).body;
    await request(app).patch(`/orders/${order.id}/ship`).expect(200);

    const res = await request(app).patch(`/orders/${order.id}/cancel`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Pedido já enviado não pode ser cancelado');
    expect(await stock()).toBe(8);
  });

  it('pedido inexistente (404)', async () => {
    const res = await request(app).patch('/orders/nao-existe/cancel');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Pedido não encontrado');
  });
});

describe('Cupons cadastrados', () => {
  beforeEach(async () => {
    await request(app).post('/coupons').send({ code: 'LIONS10', discountPercent: 10, expiresAt: '2026-12-31' }).expect(201);
  });

  it('POST /coupons valida os dados e impede código repetido', async () => {
    await request(app).post('/coupons').send({ code: 'X', discountPercent: 10, expiresAt: '2026-12-31' }).expect(400);
    await request(app).post('/coupons').send({ code: 'ZERO', discountPercent: 0, expiresAt: '2026-12-31' }).expect(400);
    await request(app).post('/coupons').send({ code: 'lions10', discountPercent: 5, expiresAt: '2026-12-31' }).expect(409);
    expect((await request(app).get('/coupons')).body).toHaveLength(1);
  });

  it('aplica o cupom e mantém o desconto VIP', async () => {
    const res = await placeOrder({ customerId: vipId, coupon: 'lions10' });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(136.63);
  });

  it('cada cliente pode usar o mesmo cupom apenas uma vez (409)', async () => {
    await placeOrder({ coupon: 'LIONS10' }).then((r) => expect(r.status).toBe(201));
    const again = await placeOrder({ coupon: 'LIONS10' });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('Este cliente já usou este cupom');
    expect(await stock()).toBe(8);

    const other = await placeOrder({ customerId: vipId, coupon: 'LIONS10' });
    expect(other.status).toBe(201);
  });

  it('cupom fora da validade não é aceito (400)', async () => {
    clock.set(new Date('2027-01-02T00:00:00Z'));
    const res = await placeOrder({ coupon: 'LIONS10' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cupom fora da validade');
  });

  it('cupom inexistente é inválido (400)', async () => {
    const res = await placeOrder({ coupon: 'NAOEXISTE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cupom inválido');
  });
});

describe('GET /customers/:id/orders', () => {
  it('lista os pedidos do cliente, mais recentes primeiro, com status e total', async () => {
    const first = (await placeOrder()).body;
    clock.advanceMinutes(5);
    await placeOrder({ customerId: vipId });
    clock.advanceMinutes(5);
    const second = (await placeOrder({ items: [{ productId, quantity: 1 }] })).body;
    await request(app).patch(`/orders/${first.id}/ship`).expect(200);

    const res = await request(app).get(`/customers/${customerId}/orders`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: second.id, customerId, total: 79.9, status: 'PENDENTE', createdAt: '2026-11-20T12:10:00.000Z' },
      { id: first.id, customerId, total: 159.8, status: 'ENVIADO', createdAt: '2026-11-20T12:00:00.000Z' },
    ]);
  });

  it('cliente sem pedidos recebe lista vazia', async () => {
    expect((await request(app).get(`/customers/${vipId}/orders`)).body).toEqual([]);
  });

  it('cliente inexistente (404)', async () => {
    await request(app).get('/customers/nao-existe/orders').expect(404);
  });
});
