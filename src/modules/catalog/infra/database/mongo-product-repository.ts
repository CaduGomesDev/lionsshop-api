import type { Collection, Db, Filter } from 'mongodb';
import { Money } from '../../../../shared/domain/money';
import { newObjectIdString, toDbId, type DbId } from '../../../../shared/infra/database/object-id';
import { Product } from '../../domain/product';
import type { ProductRepository } from '../../domain/product-repository';

interface ProductDocument {
  _id: DbId;
  name: string;
  price: number;
  stock: number;
  createdAt: Date;
}

export const ProductMapper = {
  toDomain(doc: ProductDocument): Product {
    return Product.restore({
      id: String(doc._id),
      name: doc.name,
      price: Money.fromDecimal(doc.price),
      stock: doc.stock,
      createdAt: doc.createdAt,
    });
  },
  toPersistence(product: Product): ProductDocument {
    return {
      _id: toDbId(product.id),
      name: product.name,
      price: product.price.toDecimal(),
      stock: product.stock,
      createdAt: product.createdAt,
    };
  },
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MongoProductRepository implements ProductRepository {
  private readonly collection: Collection<ProductDocument>;

  constructor(db: Db) {
    this.collection = db.collection<ProductDocument>('products');
  }

  nextId(): string {
    return newObjectIdString();
  }

  async save(product: Product): Promise<void> {
    const doc = ProductMapper.toPersistence(product);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<Product | null> {
    const doc = await this.collection.findOne({ _id: toDbId(id) });
    return doc ? ProductMapper.toDomain(doc) : null;
  }

  async search(nameContains?: string): Promise<Product[]> {
    const filter: Filter<ProductDocument> = nameContains
      ? { name: { $regex: escapeRegex(nameContains), $options: 'i' } }
      : {};
    const docs = await this.collection.find(filter).toArray();
    return docs.map((doc) => ProductMapper.toDomain(doc));
  }
}
