import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { Money } from '../../src/shared/domain/money';
import { Order, OrderStatus } from '../../src/modules/orders/domain/order';
import { OrderItem } from '../../src/modules/orders/domain/order-item';
import { MongoOrderRepository } from '../../src/modules/orders/infra/database/mongo-order-repository';

jest.setTimeout(120_000);

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repository: MongoOrderRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongo.getUri());
  db = client.db('lionsshop-repo-test');
  repository = new MongoOrderRepository(db);
});

afterAll(async () => {
  await client?.close();
  await mongo?.stop();
});

beforeEach(async () => {
  await db.collection('orders').deleteMany({});
});

const customerId = new ObjectId().toHexString();
const productId = new ObjectId().toHexString();

function newOrder(createdAt: Date) {
  return Order.place({
    id: repository.nextId(),
    customerId,
    items: [OrderItem.create({ productId, productName: 'Caneca Dev', unitPrice: Money.fromDecimal(39.9), quantity: 3 })],
    couponCode: 'LIONS10',
    total: Money.fromDecimal(107.73),
    now: createdAt,
  });
}

describe('MongoOrderRepository', () => {
  it('recupera um pedido salvo com os mesmos dados', async () => {
    const order = newOrder(new Date('2026-11-20T12:00:00Z'));

    await repository.save(order);
    const loaded = await repository.findById(order.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.snapshot()).toEqual(order.snapshot());
    expect(loaded!.subtotal().toDecimal()).toBe(119.7);
  });

  it('salva no formato do banco herdado (status numérico e ObjectId)', async () => {
    const order = newOrder(new Date());
    order.ship(new Date());
    await repository.save(order);

    const doc = await db.collection('orders').findOne({ _id: new ObjectId(order.id) });
    expect(doc).toMatchObject({ status: 2, total: 107.73, coupon: 'LIONS10' });
    expect(doc!.customerId).toBeInstanceOf(ObjectId);
    expect((await repository.findById(order.id))!.getStatus()).toBe(OrderStatus.SHIPPED);
  });

  it('atualiza (upsert) em vez de duplicar', async () => {
    const order = newOrder(new Date());
    await repository.save(order);
    order.cancel(new Date());
    await repository.save(order);
    expect(await db.collection('orders').countDocuments()).toBe(1);
  });

  it('busca por cliente do mais recente para o mais antigo', async () => {
    const old = newOrder(new Date('2026-11-01T00:00:00Z'));
    const recent = newOrder(new Date('2026-11-10T00:00:00Z'));
    await repository.save(old);
    await repository.save(recent);

    const orders = await repository.findByCustomer(customerId);
    expect(orders.map((o) => o.id)).toEqual([recent.id, old.id]);
    expect(await repository.findByCustomer(new ObjectId().toHexString())).toEqual([]);
  });

  it('id que não é ObjectId simplesmente não é encontrado', async () => {
    expect(await repository.findById('123')).toBeNull();
  });
});
