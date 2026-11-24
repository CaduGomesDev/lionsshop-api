import { randomUUID } from 'node:crypto';
import { Customer, type CustomerProps } from '../../domain/customer';
import type { CustomerRepository } from '../../domain/customer-repository';
import type { Email } from '../../domain/email';

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly items = new Map<string, CustomerProps>();

  nextId(): string {
    return randomUUID();
  }

  async save(customer: Customer): Promise<void> {
    this.items.set(customer.id, customer.snapshot());
  }

  async findById(id: string): Promise<Customer | null> {
    const props = this.items.get(id);
    return props ? Customer.restore(props) : null;
  }

  async findByEmail(email: Email): Promise<Customer | null> {
    const props = [...this.items.values()].find((c) => c.email.equals(email));
    return props ? Customer.restore(props) : null;
  }
}
