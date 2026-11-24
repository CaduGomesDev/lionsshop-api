import type { CustomerRepository } from '../../domain/customer-repository';
import { Email } from '../../domain/email';
import { CustomerNotFoundError, EmailAlreadyInUseError } from '../../domain/errors';
import { toCustomerOutput, type CustomerOutput } from '../customer-output';

export interface UpdateCustomerInput {
  customerId: string;
  name?: string;
  email?: string;
}

export class UpdateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<CustomerOutput> {
    const email = input.email ? Email.create(input.email) : undefined;

    const customer = await this.customers.findById(input.customerId);
    if (!customer) throw new CustomerNotFoundError();

    if (input.name) customer.rename(input.name);
    if (email && !email.equals(customer.email)) {
      const owner = await this.customers.findByEmail(email);
      if (owner && owner.id !== customer.id) throw new EmailAlreadyInUseError();
      customer.changeEmail(email);
    }

    await this.customers.save(customer);
    return toCustomerOutput(customer);
  }
}
