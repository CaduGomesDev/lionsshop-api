import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error';

export class CustomerNotFoundError extends NotFoundError {
  constructor() {
    super('Cliente não encontrado');
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(productId: string) {
    super(`Produto ${productId} não encontrado`);
  }
}

export class InsufficientStockError extends ValidationError {
  constructor(productName: string) {
    super(`Estoque insuficiente para ${productName}`);
  }
}
