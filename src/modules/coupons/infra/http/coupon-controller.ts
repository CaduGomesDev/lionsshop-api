import { Router, type Request, type Response } from 'express';
import type { CreateCouponUseCase } from '../../application/use-cases/create-coupon';
import type { ListCouponsUseCase } from '../../application/use-cases/list-coupons';

export class CouponController {
  constructor(
    private readonly createCoupon: CreateCouponUseCase,
    private readonly listCoupons: ListCouponsUseCase,
  ) {}

  routes(): Router {
    const router = Router();
    router.post('/coupons', this.create);
    router.get('/coupons', this.list);
    return router;
  }

  private create = async (req: Request, res: Response) => {
    const { code, discountPercent, expiresAt } = req.body ?? {};
    res.status(201).json(await this.createCoupon.execute({ code, discountPercent, expiresAt }));
  };

  private list = async (_req: Request, res: Response) => {
    res.json(await this.listCoupons.execute());
  };
}
