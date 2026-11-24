import type { Customer } from '../domain/customer';

export interface CustomerOutput {
  id: string;
  name: string;
  email: string;
  vip: boolean;
}

export function toCustomerOutput(customer: Customer): CustomerOutput {
  return { id: customer.id, name: customer.name, email: customer.email.toString(), vip: customer.vip };
}
