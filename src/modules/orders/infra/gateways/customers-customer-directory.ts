import { CustomerNotFoundError, type GetCustomerUseCase } from '../../../customers';
import type { CustomerDirectory, CustomerInfo } from '../../application/ports';

export class CustomersCustomerDirectory implements CustomerDirectory {
  constructor(private readonly getCustomer: GetCustomerUseCase) {}

  async findById(customerId: string): Promise<CustomerInfo | null> {
    try {
      return await this.getCustomer.execute(customerId);
    } catch (error) {
      if (error instanceof CustomerNotFoundError) return null;
      throw error;
    }
  }
}
