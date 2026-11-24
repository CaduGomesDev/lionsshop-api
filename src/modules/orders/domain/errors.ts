import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/domain-error';

export class OrderNotFoundError extends NotFoundError {
  constructor() {
    super('Pedido não encontrado');
  }
}

export class EmptyOrderError extends ValidationError {
  constructor() {
    super('Pedido vazio');
  }
}

export class InvalidQuantityError extends ValidationError {
  constructor() {
    super('Quantidade inválida');
  }
}

export class OrderNotPendingError extends ConflictError {
  constructor() {
    super('Só pedidos pendentes podem ser enviados');
  }
}

export class OrderAlreadyShippedError extends ConflictError {
  constructor() {
    super('Pedido já enviado não pode ser cancelado');
  }
}

export class OrderAlreadyCanceledError extends ConflictError {
  constructor() {
    super('Pedido já está cancelado');
  }
}
