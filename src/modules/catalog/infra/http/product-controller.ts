import { Router, type Request, type Response } from 'express';
import type { AdjustStockUseCase } from '../../application/use-cases/adjust-stock';
import type { CreateProductUseCase } from '../../application/use-cases/create-product';
import type { ListProductsUseCase } from '../../application/use-cases/list-products';

export class ProductController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly adjustStock: AdjustStockUseCase,
  ) {}

  routes(): Router {
    const router = Router();
    router.post('/products', this.create);
    router.get('/products', this.list);
    router.patch('/products/:id/stock', this.updateStock);
    return router;
  }

  private create = async (req: Request, res: Response) => {
    const { name, price, stock } = req.body ?? {};
    res.status(201).json(await this.createProduct.execute({ name, price, stock }));
  };

  private list = async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json(await this.listProducts.execute({ nameContains: q }));
  };

  private updateStock = async (req: Request<{ id: string }>, res: Response) => {
    res.json(await this.adjustStock.execute({ productId: req.params.id, quantity: req.body?.quantity }));
  };
}
