import { ValidationError } from '../../../shared/domain/domain-error';
import { Money } from '../../../shared/domain/money';
import { NegativeStockError } from './errors';

export interface ProductProps {
  id: string;
  name: string;
  price: Money;
  stock: number;
  createdAt: Date;
}

export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(input: { id: string; name: string; price: Money; stock?: number; createdAt: Date }): Product {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('Nome é obrigatório');
    if (input.price.isZero()) throw new ValidationError('Preço inválido');

    const stock = input.stock ?? 0;
    if (!Number.isInteger(stock)) throw new ValidationError('Estoque deve ser um número inteiro');
    if (stock < 0) throw new NegativeStockError();

    return new Product({ id: input.id, name, price: input.price, stock, createdAt: input.createdAt });
  }

  static restore(props: ProductProps): Product {
    return new Product({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get price(): Money {
    return this.props.price;
  }
  get stock(): number {
    return this.props.stock;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  adjustStock(quantity: number): void {
    if (!Number.isInteger(quantity)) throw new ValidationError('quantity deve ser um número inteiro');
    if (this.props.stock + quantity < 0) throw new NegativeStockError();
    this.props.stock += quantity;
  }

  snapshot(): ProductProps {
    return { ...this.props };
  }
}
