import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';
import type { Db } from 'mongodb';

jest.setTimeout(120_000);

let mongo: MongoMemoryServer;
let app: Express;
let db: Db;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongo.getUri();
  process.env.DB_NAME = 'lionsshop-legacy-test';
  const legacy = await import('../../src/app');
  app = legacy.app;
  db = await legacy.getDb();
});

afterAll(async () => {
  await db?.client.close();
  await mongo?.stop();
});

beforeEach(async () => {
  await db.collection('products').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('orders').deleteMany({});
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

async function createProduct(body = { name: 'Camiseta Lions', price: 79.9, stock: 50 }) {
  return (await request(app).post('/products').send(body)).body;
}
async function createCustomer(body: Record<string, unknown> = { name: 'Ana', email: 'ana@example.com' }) {
  return (await request(app).post('/customers').send(body)).body;
}

describe('produtos', () => {
  it('cadastra, lista e busca por nome', async () => {
    const res = await request(app).post('/products').send({ name: 'Caneca Dev', price: 39.9, stock: 5 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Caneca Dev', price: 39.9, stock: 5 });
    await createProduct();

    const all = await request(app).get('/products');
    expect(all.body).toHaveLength(2);
    const found = await request(app).get('/products?q=caneca');
    expect(found.body).toHaveLength(1);
  });

  it('rejeita preço inválido', async () => {
    const res = await request(app).post('/products').send({ name: 'X', price: 0 });
    expect(res.status).toBe(400);
  });

  it('ajusta estoque sem deixar negativo', async () => {
    const p = await createProduct();
    const ok = await request(app).patch(`/products/${p.id}/stock`).send({ quantity: -10 });
    expect(ok.body.stock).toBe(40);
    const neg = await request(app).patch(`/products/${p.id}/stock`).send({ quantity: -100 });
    expect(neg.status).toBe(400);
  });
});

describe('clientes', () => {
  it('cadastra com e-mail em minúsculas e impede e-mail duplicado', async () => {
    const res = await request(app).post('/customers').send({ name: 'Ana', email: 'ANA@Example.com' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ana@example.com');
    const dup = await request(app).post('/customers').send({ name: 'Ana 2', email: 'ana@example.com' });
    expect(dup.status).toBe(409);
  });

  it('rejeita e-mail inválido', async () => {
    const res = await request(app).post('/customers').send({ name: 'Ana', email: 'ana' });
    expect(res.status).toBe(400);
  });

  it('busca e atualiza', async () => {
    const c = await createCustomer();
    await request(app).put(`/customers/${c.id}`).send({ name: 'Ana Souza' }).expect(200);
    const res = await request(app).get(`/customers/${c.id}`);
    expect(res.body).toMatchObject({ name: 'Ana Souza', email: 'ana@example.com', vip: false });
  });
});

describe('pedidos', () => {
  it('cria pedido aplicando cupom e desconto VIP e baixa o estoque', async () => {
    const p = await createProduct();
    const c = await createCustomer({ name: 'Bruno', email: 'bruno@example.com', vip: true });

    const res = await request(app)
      .post('/orders')
      .send({ customerId: c.id, items: [{ productId: p.id, quantity: 2 }], coupon: 'LIONS10' });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(136.63);

    const products = await request(app).get('/products');
    expect(products.body[0].stock).toBe(48);
  });

  it('rejeita pedido vazio, cupom inválido e estoque insuficiente', async () => {
    const p = await createProduct({ name: 'Moletom', price: 189.9, stock: 1 });
    const c = await createCustomer();
    await request(app).post('/orders').send({ customerId: c.id, items: [] }).expect(400);
    await request(app)
      .post('/orders')
      .send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }], coupon: 'NAOEXISTE' })
      .expect(400);
    await request(app)
      .post('/orders')
      .send({ customerId: c.id, items: [{ productId: p.id, quantity: 2 }] })
      .expect(400);
  });

  it('lista, detalha e envia pedido (só pendente pode ser enviado)', async () => {
    const p = await createProduct();
    const c = await createCustomer();
    const order = (await request(app).post('/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }] })).body;

    const list = await request(app).get('/orders');
    expect(list.body[0]).toMatchObject({ total: 79.9, status: 'PENDENTE' });

    const detail = await request(app).get(`/orders/${order.id}`);
    expect(detail.body).toMatchObject({ subtotal: 79.9, total: 79.9, status: 'PENDENTE' });

    await request(app).patch(`/orders/${order.id}/ship`).expect(200);
    await request(app).patch(`/orders/${order.id}/ship`).expect(400);
  });

  it('relatório de faturamento soma os pedidos', async () => {
    const p = await createProduct();
    const c = await createCustomer();
    await request(app).post('/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }] });
    const res = await request(app).get('/reports/revenue');
    expect(res.body).toEqual({ orders: 1, revenue: 79.9 });
  });

  it('BUG conhecido: o relatório ignora o desconto BLACKFRIDAY', async () => {
    const p = await createProduct({ name: 'Item', price: 100, stock: 10 });
    const c = await createCustomer();
    const order = (
      await request(app).post('/orders').send({ customerId: c.id, items: [{ productId: p.id, quantity: 1 }], coupon: 'BLACKFRIDAY' })
    ).body;
    expect(order.total).toBe(70);
    const res = await request(app).get('/reports/revenue');
    expect(res.body.revenue).toBe(100);
  });
});
