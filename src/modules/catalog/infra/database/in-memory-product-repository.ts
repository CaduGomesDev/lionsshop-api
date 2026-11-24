import { randomUUID } from 'node:crypto';
import { Product, type ProductProps } from '../../domain/product';
import type { ProductRepository } from '../../domain/product-repository';

export class InMemoryProductRepository implements ProductRepository {
  private readonly items = new Map<string, ProductProps>();

  nextId(): string {
    return randomUUID();
  }

  async save(product: Product): Promise<void> {
    this.items.set(product.id, product.snapshot());
  }

  async findById(id: string): Promise<Product | null> {
    const props = this.items.get(id);
    return props ? Product.restore(props) : null;
  }

  async search(nameContains?: string): Promise<Product[]> {
    const term = nameContains?.toLowerCase();
    return [...this.items.values()]
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .map((p) => Product.restore(p));
  }
}
