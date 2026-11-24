import dotenv from 'dotenv';
import express, { type Express } from 'express';
import { MongoClient, type Db } from 'mongodb';

import type { Clock } from './shared/application/clock';
import type { Mailer } from './shared/application/mailer';
import { ConsoleMailer } from './shared/infra/console-mailer';
import { errorHandler } from './shared/infra/http/error-handler';
import { SystemClock } from './shared/infra/system-clock';

import { AdjustStockUseCase } from './modules/catalog/application/use-cases/adjust-stock';
import { CreateProductUseCase } from './modules/catalog/application/use-cases/create-product';
import { FindProductUseCase } from './modules/catalog/application/use-cases/find-product';
import { ListProductsUseCase } from './modules/catalog/application/use-cases/list-products';
import type { ProductRepository } from './modules/catalog/domain/product-repository';
import { InMemoryProductRepository } from './modules/catalog/infra/database/in-memory-product-repository';
import { MongoProductRepository } from './modules/catalog/infra/database/mongo-product-repository';
import { ProductController } from './modules/catalog/infra/http/product-controller';

import { GetCustomerUseCase } from './modules/customers/application/use-cases/get-customer';
import { RegisterCustomerUseCase } from './modules/customers/application/use-cases/register-customer';
import { UpdateCustomerUseCase } from './modules/customers/application/use-cases/update-customer';
import type { CustomerRepository } from './modules/customers/domain/customer-repository';
import { InMemoryCustomerRepository } from './modules/customers/infra/database/in-memory-customer-repository';
import { MongoCustomerRepository } from './modules/customers/infra/database/mongo-customer-repository';
import { CustomerController } from './modules/customers/infra/http/customer-controller';

import { CheckCouponUseCase } from './modules/coupons/application/use-cases/check-coupon';
import { CreateCouponUseCase } from './modules/coupons/application/use-cases/create-coupon';
import { ListCouponsUseCase } from './modules/coupons/application/use-cases/list-coupons';
import { RedeemCouponUseCase } from './modules/coupons/application/use-cases/redeem-coupon';
import type { CouponRepository } from './modules/coupons/domain/coupon-repository';
import { InMemoryCouponRepository } from './modules/coupons/infra/database/in-memory-coupon-repository';
import { MongoCouponRepository } from './modules/coupons/infra/database/mongo-coupon-repository';
import { CouponController } from './modules/coupons/infra/http/coupon-controller';

import { CancelOrderUseCase } from './modules/orders/application/use-cases/cancel-order';
import { CreateOrderUseCase } from './modules/orders/application/use-cases/create-order';
import { GetOrderUseCase } from './modules/orders/application/use-cases/get-order';
import { GetRevenueReportUseCase } from './modules/orders/application/use-cases/get-revenue-report';
import { ListCustomerOrdersUseCase } from './modules/orders/application/use-cases/list-customer-orders';
import { ListOrdersUseCase } from './modules/orders/application/use-cases/list-orders';
import { ShipOrderUseCase } from './modules/orders/application/use-cases/ship-order';
import { DiscountService } from './modules/orders/domain/discount-service';
import type { OrderRepository } from './modules/orders/domain/order-repository';
import { InMemoryOrderRepository } from './modules/orders/infra/database/in-memory-order-repository';
import { MongoOrderRepository } from './modules/orders/infra/database/mongo-order-repository';
import { CatalogProductCatalog } from './modules/orders/infra/gateways/catalog-product-catalog';
import { CouponsCouponGateway } from './modules/orders/infra/gateways/coupons-coupon-gateway';
import { CustomersCustomerDirectory } from './modules/orders/infra/gateways/customers-customer-directory';
import { OrderController } from './modules/orders/infra/http/order-controller';

export type RepositoryKind = 'memory' | 'mongo';

export interface AppOptions {
  repository: RepositoryKind;
  db?: Db;
  mailer?: Mailer;
  clock?: Clock;
}

interface Repositories {
  products: ProductRepository;
  customers: CustomerRepository;
  coupons: CouponRepository;
  orders: OrderRepository;
}

function createRepositories(options: AppOptions): Repositories {
  if (options.repository === 'mongo') {
    if (!options.db) throw new Error('REPOSITORY=mongo precisa de uma conexão com o banco');
    return {
      products: new MongoProductRepository(options.db),
      customers: new MongoCustomerRepository(options.db),
      coupons: new MongoCouponRepository(options.db),
      orders: new MongoOrderRepository(options.db),
    };
  }
  return {
    products: new InMemoryProductRepository(),
    customers: new InMemoryCustomerRepository(),
    coupons: new InMemoryCouponRepository(),
    orders: new InMemoryOrderRepository(),
  };
}

export function buildApp(options: AppOptions): Express {
  const mailer = options.mailer ?? new ConsoleMailer();
  const clock = options.clock ?? new SystemClock();
  const repos = createRepositories(options);

  const adjustStock = new AdjustStockUseCase(repos.products);
  const findProduct = new FindProductUseCase(repos.products);
  const productController = new ProductController(
    new CreateProductUseCase(repos.products, clock),
    new ListProductsUseCase(repos.products),
    adjustStock,
  );

  const getCustomer = new GetCustomerUseCase(repos.customers);
  const customerController = new CustomerController(
    new RegisterCustomerUseCase(repos.customers, clock),
    getCustomer,
    new UpdateCustomerUseCase(repos.customers),
  );

  const couponController = new CouponController(
    new CreateCouponUseCase(repos.coupons, clock),
    new ListCouponsUseCase(repos.coupons),
  );

  const catalog = new CatalogProductCatalog(findProduct, adjustStock);
  const customers = new CustomersCustomerDirectory(getCustomer);
  const coupons = new CouponsCouponGateway(
    new CheckCouponUseCase(repos.coupons, clock),
    new RedeemCouponUseCase(repos.coupons, clock),
  );
  const orderController = new OrderController({
    createOrder: new CreateOrderUseCase(repos.orders, catalog, customers, coupons, new DiscountService(), mailer, clock),
    listOrders: new ListOrdersUseCase(repos.orders),
    getOrder: new GetOrderUseCase(repos.orders),
    shipOrder: new ShipOrderUseCase(repos.orders, customers, mailer, clock),
    cancelOrder: new CancelOrderUseCase(repos.orders, catalog, customers, mailer, clock),
    listCustomerOrders: new ListCustomerOrdersUseCase(repos.orders, customers),
    getRevenueReport: new GetRevenueReportUseCase(repos.orders),
  });

  const app = express();
  app.use(express.json());
  app.use(productController.routes());
  app.use(customerController.routes());
  app.use(couponController.routes());
  app.use(orderController.routes());
  app.use(errorHandler);
  return app;
}

async function main(): Promise<void> {
  dotenv.config({ quiet: true });
  const repository = (process.env.REPOSITORY ?? 'mongo') as RepositoryKind;
  if (repository !== 'mongo' && repository !== 'memory') {
    throw new Error(`REPOSITORY inválido: ${repository} (use "mongo" ou "memory")`);
  }

  let db: Db | undefined;
  if (repository === 'mongo') {
    const client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017');
    db = client.db(process.env.DB_NAME || 'lionsshop');
  }

  const port = Number(process.env.PORT) || 3000;
  buildApp({ repository, db }).listen(port, () => {
    console.log(`LionsShop API rodando em http://localhost:${port} (repositório: ${repository})`);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
