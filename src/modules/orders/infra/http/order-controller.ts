import { Router, type Request, type Response } from 'express';
import { OrderStatus } from '../../domain/order';
import type { CancelOrderUseCase } from '../../application/use-cases/cancel-order';
import type { CreateOrderUseCase } from '../../application/use-cases/create-order';
import type { GetOrderUseCase } from '../../application/use-cases/get-order';
import type { GetRevenueReportUseCase } from '../../application/use-cases/get-revenue-report';
import type { ListCustomerOrdersUseCase } from '../../application/use-cases/list-customer-orders';
import type { ListOrdersUseCase } from '../../application/use-cases/list-orders';
import type { ShipOrderUseCase } from '../../application/use-cases/ship-order';

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'PENDENTE',
  [OrderStatus.SHIPPED]: 'ENVIADO',
  [OrderStatus.CANCELED]: 'CANCELADO',
};

function withLabel<T extends { status: OrderStatus }>(output: T): Omit<T, 'status'> & { status: string } {
  return { ...output, status: STATUS_LABEL[output.status] };
}

export interface OrderUseCases {
  createOrder: CreateOrderUseCase;
  listOrders: ListOrdersUseCase;
  getOrder: GetOrderUseCase;
  shipOrder: ShipOrderUseCase;
  cancelOrder: CancelOrderUseCase;
  listCustomerOrders: ListCustomerOrdersUseCase;
  getRevenueReport: GetRevenueReportUseCase;
}

export class OrderController {
  constructor(private readonly useCases: OrderUseCases) {}

  routes(): Router {
    const router = Router();
    router.post('/orders', this.create);
    router.get('/orders', this.list);
    router.get('/orders/:id', this.get);
    router.patch('/orders/:id/ship', this.ship);
    router.patch('/orders/:id/cancel', this.cancel);
    router.get('/customers/:id/orders', this.listByCustomer);
    router.get('/reports/revenue', this.revenue);
    return router;
  }

  private create = async (req: Request, res: Response) => {
    const { customerId, items, coupon } = req.body ?? {};
    const output = await this.useCases.createOrder.execute({ customerId, items, coupon });
    res.status(201).json(withLabel(output));
  };

  private list = async (_req: Request, res: Response) => {
    res.json((await this.useCases.listOrders.execute()).map(withLabel));
  };

  private get = async (req: Request<{ id: string }>, res: Response) => {
    res.json(withLabel(await this.useCases.getOrder.execute(req.params.id)));
  };

  private ship = async (req: Request<{ id: string }>, res: Response) => {
    res.json(withLabel(await this.useCases.shipOrder.execute({ orderId: req.params.id })));
  };

  private cancel = async (req: Request<{ id: string }>, res: Response) => {
    res.json(withLabel(await this.useCases.cancelOrder.execute({ orderId: req.params.id })));
  };

  private listByCustomer = async (req: Request<{ id: string }>, res: Response) => {
    const orders = await this.useCases.listCustomerOrders.execute({ customerId: req.params.id });
    res.json(orders.map(withLabel));
  };

  private revenue = async (_req: Request, res: Response) => {
    res.json(await this.useCases.getRevenueReport.execute());
  };
}
