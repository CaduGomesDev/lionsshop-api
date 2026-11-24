import type { ProductRepository } from '../../domain/product-repository';
import { toProductOutput, type ProductOutput } from '../product-output';

export class FindProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(productId: string): Promise<ProductOutput | null> {
    const product = await this.products.findById(productId);
    return product ? toProductOutput(product) : null;
  }
}
