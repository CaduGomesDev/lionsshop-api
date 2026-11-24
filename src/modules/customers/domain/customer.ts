import { ValidationError } from '../../../shared/domain/domain-error';
import type { Email } from './email';

export interface CustomerProps {
  id: string;
  name: string;
  email: Email;
  vip: boolean;
  createdAt: Date;
}

function validName(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new ValidationError('Nome é obrigatório');
  return trimmed;
}

export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static create(input: CustomerProps): Customer {
    return new Customer({ ...input, name: validName(input.name) });
  }

  static restore(props: CustomerProps): Customer {
    return new Customer({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): Email {
    return this.props.email;
  }
  get vip(): boolean {
    return this.props.vip;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  rename(name: string): void {
    this.props.name = validName(name);
  }

  changeEmail(email: Email): void {
    this.props.email = email;
  }

  snapshot(): CustomerProps {
    return { ...this.props };
  }
}
