import { ConflictError, ValidationError } from '../../../shared/domain/domain-error';

export class InvalidCouponError extends ValidationError {
  constructor() {
    super('Cupom inválido');
  }
}

export class CouponExpiredError extends ValidationError {
  constructor() {
    super('Cupom fora da validade');
  }
}

export class CouponAlreadyUsedError extends ConflictError {
  constructor() {
    super('Este cliente já usou este cupom');
  }
}

export class CouponCodeAlreadyExistsError extends ConflictError {
  constructor() {
    super('Já existe um cupom com este código');
  }
}
