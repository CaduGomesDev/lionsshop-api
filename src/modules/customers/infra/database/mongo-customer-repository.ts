import type { Collection, Db } from 'mongodb';
import { newObjectIdString, toDbId, type DbId } from '../../../../shared/infra/database/object-id';
import { Customer } from '../../domain/customer';
import type { CustomerRepository } from '../../domain/customer-repository';
import { Email } from '../../domain/email';

interface CustomerDocument {
  _id: DbId;
  name: string;
  email: string;
  vip: boolean;
  createdAt: Date;
}

export const CustomerMapper = {
  toDomain(doc: CustomerDocument): Customer {
    return Customer.restore({
      id: String(doc._id),
      name: doc.name,
      email: Email.create(doc.email),
      vip: doc.vip === true,
      createdAt: doc.createdAt,
    });
  },
  toPersistence(customer: Customer): CustomerDocument {
    return {
      _id: toDbId(customer.id),
      name: customer.name,
      email: customer.email.toString(),
      vip: customer.vip,
      createdAt: customer.createdAt,
    };
  },
};

export class MongoCustomerRepository implements CustomerRepository {
  private readonly collection: Collection<CustomerDocument>;

  constructor(db: Db) {
    this.collection = db.collection<CustomerDocument>('customers');
  }

  nextId(): string {
    return newObjectIdString();
  }

  async save(customer: Customer): Promise<void> {
    const doc = CustomerMapper.toPersistence(customer);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<Customer | null> {
    const doc = await this.collection.findOne({ _id: toDbId(id) });
    return doc ? CustomerMapper.toDomain(doc) : null;
  }

  async findByEmail(email: Email): Promise<Customer | null> {
    const doc = await this.collection.findOne({ email: email.toString() });
    return doc ? CustomerMapper.toDomain(doc) : null;
  }
}
