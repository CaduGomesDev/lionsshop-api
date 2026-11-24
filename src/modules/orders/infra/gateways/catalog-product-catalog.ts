import { Money } from '../../../../shared/domain/money';
import type { AdjustStockUseCase, FindProductUseCase } from '../../../catalog';
import type { CatalogProduct, ProductCatalog } from '../../application/ports';

export class CatalogProductCatalog implements ProductCatalog {
  constructor(
    private readonly findProduct: FindProductUseCase,
    private readonly adjustStock: AdjustStockUseCase,
  ) {}

  async findById(productId: string): Promise<CatalogProduct | null> {
    const product = await this.findProduct.execute(productId);
    if (!product) return null;
    return { id: product.id, name: product.name, price: Money.fromDecimal(product.price), stock: product.stock };
  }

  async withdrawStock(productId: string, quantity: number): Promise<void> {
    await this.adjustStock.execute({ productId, quantity: -quantity });
  }

  async restock(productId: string, quantity: number): Promise<void> {
    await this.adjustStock.execute({ productId, quantity });
  }
}
