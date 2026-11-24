import type { CustomerRepository } from '../../domain/customer-repository';
import { CustomerNotFoundError } from '../../domain/errors';
import { toCustomerOutput, type CustomerOutput } from '../customer-output';

export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(customerId: string): Promise<CustomerOutput> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new CustomerNotFoundError();
    return toCustomerOutput(customer);
  }
}
