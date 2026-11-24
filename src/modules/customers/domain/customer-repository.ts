import type { Customer } from './customer';
import type { Email } from './email';

export interface CustomerRepository {
  nextId(): string;
  save(customer: Customer): Promise<void>;
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: Email): Promise<Customer | null>;
}
