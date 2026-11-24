import { Money } from '../../../src/shared/domain/money';
import { DiscountService } from '../../../src/modules/orders/domain/discount-service';

describe('DiscountService', () => {
  const service = new DiscountService();
  const subtotal = Money.fromDecimal(159.8);

  it('sem cupom e cliente comum, não há desconto', () => {
    expect(service.calculate(subtotal, { vip: false }).toDecimal()).toBe(159.8);
  });

  it('aplica o percentual do cupom', () => {
    expect(service.calculate(subtotal, { vip: false }, { discountPercent: 10 }).toDecimal()).toBe(143.82);
  });

  it('cliente VIP ganha 5% sem cupom', () => {
    expect(service.calculate(subtotal, { vip: true }).toDecimal()).toBe(151.81);
  });

  it('o desconto VIP é aplicado depois do cupom', () => {
    expect(service.calculate(subtotal, { vip: true }, { discountPercent: 10 }).toDecimal()).toBe(136.63);
  });
});
