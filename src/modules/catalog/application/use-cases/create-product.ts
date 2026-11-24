import type { Clock } from '../../../../shared/application/clock';
import { ValidationError } from '../../../../shared/domain/domain-error';
import { Money } from '../../../../shared/domain/money';
import { Product } from '../../domain/product';
import type { ProductRepository } from '../../domain/product-repository';
import { toProductOutput, type ProductOutput } from '../product-output';

export interface CreateProductInput {
  name: string;
  price: number;
  stock?: number;
}

export class CreateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductOutput> {
    if (typeof input.price !== 'number' || input.price <= 0) {
      throw new ValidationError('Preço inválido');
    }
    const product = Product.create({
      id: this.products.nextId(),
      name: input.name,
      price: Money.fromDecimal(input.price),
      stock: input.stock,
      createdAt: this.clock.now(),
    });
    await this.products.save(product);
    return toProductOutput(product);
  }
}
