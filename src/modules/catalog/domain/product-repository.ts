import type { Product } from './product';

export interface ProductRepository {
  nextId(): string;
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  search(nameContains?: string): Promise<Product[]>;
}
