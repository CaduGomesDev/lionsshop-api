import { ValidationError } from '../../../../shared/domain/domain-error';
import { ProductNotFoundError } from '../../domain/errors';
import type { ProductRepository } from '../../domain/product-repository';

export interface AdjustStockInput {
  productId: string;
  quantity: number;
}

export class AdjustStockUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: AdjustStockInput): Promise<{ id: string; stock: number }> {
    if (typeof input.quantity !== 'number') {
      throw new ValidationError('quantity deve ser um número');
    }
    const product = await this.products.findById(input.productId);
    if (!product) throw new ProductNotFoundError();

    product.adjustStock(input.quantity);
    await this.products.save(product);
    return { id: product.id, stock: product.stock };
  }
}
