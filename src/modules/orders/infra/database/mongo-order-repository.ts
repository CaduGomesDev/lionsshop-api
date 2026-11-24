import type { Collection, Db } from 'mongodb';
import { newObjectIdString, toDbId } from '../../../../shared/infra/database/object-id';
import type { Order } from '../../domain/order';
import type { OrderRepository } from '../../domain/order-repository';
import { OrderMapper, type OrderDocument } from './order-mapper';

export class MongoOrderRepository implements OrderRepository {
  private readonly collection: Collection<OrderDocument>;

  constructor(db: Db) {
    this.collection = db.collection<OrderDocument>('orders');
  }

  nextId(): string {
    return newObjectIdString();
  }

  async save(order: Order): Promise<void> {
    const doc = OrderMapper.toPersistence(order);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<Order | null> {
    const doc = await this.collection.findOne({ _id: toDbId(id) });
    return doc ? OrderMapper.toDomain(doc) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const docs = await this.collection
      .find({ customerId: toDbId(customerId) })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
    return docs.map((doc) => OrderMapper.toDomain(doc));
  }

  async findAll(): Promise<Order[]> {
    const docs = await this.collection.find({}).sort({ createdAt: -1, _id: -1 }).toArray();
    return docs.map((doc) => OrderMapper.toDomain(doc));
  }
}
