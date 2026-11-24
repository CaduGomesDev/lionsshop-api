import type { ProductRepository } from '../../domain/product-repository';
import { toProductOutput, type ProductOutput } from '../product-output';

export class ListProductsUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: { nameContains?: string } = {}): Promise<ProductOutput[]> {
    const products = await this.products.search(input.nameContains);
    return products.map(toProductOutput);
  }
}
