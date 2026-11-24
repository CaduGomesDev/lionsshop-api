import type { Clock } from '../../../../shared/application/clock';
import { ValidationError } from '../../../../shared/domain/domain-error';
import { Customer } from '../../domain/customer';
import type { CustomerRepository } from '../../domain/customer-repository';
import { Email } from '../../domain/email';
import { EmailAlreadyInUseError } from '../../domain/errors';
import { toCustomerOutput, type CustomerOutput } from '../customer-output';

export interface RegisterCustomerInput {
  name: string;
  email: string;
  vip?: boolean;
}

export class RegisterCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterCustomerInput): Promise<CustomerOutput> {
    if (!input.name || !input.email) throw new ValidationError('Nome e e-mail são obrigatórios');
    const email = Email.create(input.email);
    if (await this.customers.findByEmail(email)) throw new EmailAlreadyInUseError();

    const customer = Customer.create({
      id: this.customers.nextId(),
      name: input.name,
      email,
      vip: input.vip === true,
      createdAt: this.clock.now(),
    });
    await this.customers.save(customer);
    return toCustomerOutput(customer);
  }
}
