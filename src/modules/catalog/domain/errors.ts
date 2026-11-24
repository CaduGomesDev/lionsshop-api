import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error';

export class ProductNotFoundError extends NotFoundError {
  constructor() {
    super('Produto não encontrado');
  }
}

export class NegativeStockError extends ValidationError {
  constructor() {
    super('Estoque não pode ficar negativo');
  }
}
