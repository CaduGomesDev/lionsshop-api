import { ValidationError } from '../../../shared/domain/domain-error';

const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!EMAIL_FORMAT.test(normalized)) throw new ValidationError('E-mail inválido');
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
