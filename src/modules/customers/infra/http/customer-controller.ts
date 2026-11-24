import { Router, type Request, type Response } from 'express';
import type { GetCustomerUseCase } from '../../application/use-cases/get-customer';
import type { RegisterCustomerUseCase } from '../../application/use-cases/register-customer';
import type { UpdateCustomerUseCase } from '../../application/use-cases/update-customer';

export class CustomerController {
  constructor(
    private readonly registerCustomer: RegisterCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
  ) {}

  routes(): Router {
    const router = Router();
    router.post('/customers', this.register);
    router.get('/customers/:id', this.get);
    router.put('/customers/:id', this.update);
    return router;
  }

  private register = async (req: Request, res: Response) => {
    const { name, email, vip } = req.body ?? {};
    res.status(201).json(await this.registerCustomer.execute({ name, email, vip }));
  };

  private get = async (req: Request<{ id: string }>, res: Response) => {
    res.json(await this.getCustomer.execute(req.params.id));
  };

  private update = async (req: Request<{ id: string }>, res: Response) => {
    const { name, email } = req.body ?? {};
    res.json(await this.updateCustomer.execute({ customerId: req.params.id, name, email }));
  };
}
