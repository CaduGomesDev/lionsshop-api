import { Coupon } from '../../../src/modules/coupons/domain/coupon';
import { CouponAlreadyUsedError, CouponExpiredError } from '../../../src/modules/coupons/domain/errors';

const createdAt = new Date('2026-11-01T00:00:00Z');
const expiresAt = new Date('2026-11-30T23:59:59Z');

function coupon() {
  return Coupon.create({ code: ' lions10 ', discountPercent: 10, expiresAt, createdAt });
}

describe('Coupon', () => {
  it('normaliza o código para maiúsculas', () => {
    expect(coupon().code).toBe('LIONS10');
  });

  it.each([0, 101, 7.5])('rejeita percentual %p', (discountPercent) => {
    expect(() => Coupon.create({ code: 'X10', discountPercent, expiresAt, createdAt })).toThrow('Percentual de desconto');
  });

  it('rejeita validade no passado', () => {
    expect(() => Coupon.create({ code: 'OLD', discountPercent: 10, expiresAt: createdAt, createdAt })).toThrow(
      'A validade do cupom precisa ser uma data futura',
    );
  });

  it('pode ser usado dentro da validade, inclusive no último instante', () => {
    const c = coupon();
    c.redeem('c1', expiresAt);
    expect(c.wasRedeemedBy('c1')).toBe(true);
  });

  it('não pode ser usado depois da validade', () => {
    const c = coupon();
    expect(() => c.redeem('c1', new Date('2026-12-01T00:00:00Z'))).toThrow(CouponExpiredError);
  });

  it('cada cliente usa o mesmo cupom apenas uma vez', () => {
    const c = coupon();
    const now = new Date('2026-11-10T00:00:00Z');
    c.redeem('c1', now);
    expect(() => c.redeem('c1', now)).toThrow(CouponAlreadyUsedError);
    expect(() => c.redeem('c2', now)).not.toThrow();
  });
});
