import { ConflictError, NotFoundError } from '../../../shared/domain/domain-error';

export class CustomerNotFoundError extends NotFoundError {
  constructor() {
    super('Cliente não encontrado');
  }
}

export class EmailAlreadyInUseError extends ConflictError {
  constructor() {
    super('Já existe um cliente com este e-mail');
  }
}
