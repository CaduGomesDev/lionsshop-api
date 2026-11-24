import type { Product } from '../domain/product';

export interface ProductOutput {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export function toProductOutput(product: Product): ProductOutput {
  return { id: product.id, name: product.name, price: product.price.toDecimal(), stock: product.stock };
}
