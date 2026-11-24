import type { Clock } from '../../../../shared/application/clock';
import type { Mailer } from '../../../../shared/application/mailer';
import { ValidationError } from '../../../../shared/domain/domain-error';
import { Money } from '../../../../shared/domain/money';
import type { DiscountService } from '../../domain/discount-service';
import { EmptyOrderError } from '../../domain/errors';
import { Order } from '../../domain/order';
import { OrderItem } from '../../domain/order-item';
import type { OrderRepository } from '../../domain/order-repository';
import type { CreateOrderInput, CreateOrderOutput } from '../dtos';
import { CustomerNotFoundError, InsufficientStockError, ProductNotFoundError } from '../errors';
import type { CouponGateway, CustomerDirectory, ProductCatalog } from '../ports';

export class CreateOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: ProductCatalog,
    private readonly customers: CustomerDirectory,
    private readonly coupons: CouponGateway,
    private readonly discounts: DiscountService,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    if (!input.customerId) throw new ValidationError('customerId é obrigatório');
    if (!Array.isArray(input.items) || input.items.length === 0) throw new EmptyOrderError();

    const customer = await this.customers.findById(String(input.customerId));
    if (!customer) throw new CustomerNotFoundError();

    const items: OrderItem[] = [];
    const quantityByProduct = new Map<string, number>();
    for (const line of input.items) {
      const product = await this.catalog.findById(String(line?.productId));
      if (!product) throw new ProductNotFoundError(String(line?.productId));

      const item = OrderItem.create({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: line.quantity,
      });
      const requested = (quantityByProduct.get(product.id) ?? 0) + item.quantity;
      if (product.stock < requested) throw new InsufficientStockError(product.name);
      quantityByProduct.set(product.id, requested);
      items.push(item);
    }

    const coupon = input.coupon ? await this.coupons.check(input.coupon, customer.id) : null;
    const subtotal = Money.sum(items.map((item) => item.subtotal()));
    const total = this.discounts.calculate(subtotal, customer, coupon);

    const order = Order.place({
      id: this.orders.nextId(),
      customerId: customer.id,
      items,
      couponCode: coupon?.code ?? null,
      total,
      now: this.clock.now(),
    });

    for (const [productId, quantity] of quantityByProduct) {
      await this.catalog.withdrawStock(productId, quantity);
    }
    if (coupon) await this.coupons.redeem(coupon.code, customer.id);
    await this.orders.save(order);

    await this.mailer.send({
      to: customer.email,
      subject: 'Pedido recebido!',
      body: `Olá ${customer.name}, recebemos seu pedido de R$ ${total.format()}.`,
    });

    return { id: order.id, total: total.toDecimal(), status: order.getStatus() };
  }
}
