import { CheckCouponUseCase } from '../../src/modules/coupons/application/use-cases/check-coupon';
import { CreateCouponUseCase } from '../../src/modules/coupons/application/use-cases/create-coupon';
import { RedeemCouponUseCase } from '../../src/modules/coupons/application/use-cases/redeem-coupon';
import {
  CouponAlreadyUsedError,
  CouponCodeAlreadyExistsError,
  CouponExpiredError,
  InvalidCouponError,
} from '../../src/modules/coupons/domain/errors';
import { InMemoryCouponRepository } from '../../src/modules/coupons/infra/database/in-memory-coupon-repository';
import { FixedClock } from '../support/fakes';

function makeSut() {
  const coupons = new InMemoryCouponRepository();
  const clock = new FixedClock(new Date('2026-11-20T12:00:00'));
  return {
    clock,
    create: new CreateCouponUseCase(coupons, clock),
    check: new CheckCouponUseCase(coupons, clock),
    redeem: new RedeemCouponUseCase(coupons, clock),
  };
}

describe('CreateCouponUseCase', () => {
  it('cadastra o cupom com código, percentual e validade', async () => {
    const sut = makeSut();
    const output = await sut.create.execute({ code: 'natal15', discountPercent: 15, expiresAt: '2026-12-25' });
    expect(output.code).toBe('NATAL15');
    expect(output.discountPercent).toBe(15);
  });

  it('data sem horário vale até o fim do dia', async () => {
    const sut = makeSut();
    const output = await sut.create.execute({ code: 'HOJE', discountPercent: 5, expiresAt: '2026-11-20' });
    expect(output.expiresAt).toEqual(new Date('2026-11-20T23:59:59.999'));
  });

  it('não permite código duplicado', async () => {
    const sut = makeSut();
    await sut.create.execute({ code: 'LIONS10', discountPercent: 10, expiresAt: '2026-12-31' });
    await expect(sut.create.execute({ code: 'lions10', discountPercent: 20, expiresAt: '2026-12-31' })).rejects.toThrow(
      CouponCodeAlreadyExistsError,
    );
  });

  it('rejeita data inválida', async () => {
    await expect(makeSut().create.execute({ code: 'X10', discountPercent: 10, expiresAt: 'amanhã' })).rejects.toThrow(
      'Data de validade inválida',
    );
  });
});

describe('Aplicar cupom (Check + Redeem)', () => {
  it('cupom válido pode ser usado uma vez por cliente', async () => {
    const sut = makeSut();
    await sut.create.execute({ code: 'LIONS10', discountPercent: 10, expiresAt: '2026-12-31' });

    expect(await sut.check.execute({ code: 'lions10', customerId: 'ana' })).toEqual({ code: 'LIONS10', discountPercent: 10 });
    await sut.redeem.execute({ code: 'LIONS10', customerId: 'ana' });

    await expect(sut.check.execute({ code: 'LIONS10', customerId: 'ana' })).rejects.toThrow(CouponAlreadyUsedError);
    await expect(sut.check.execute({ code: 'LIONS10', customerId: 'bruno' })).resolves.toBeDefined();
  });

  it('cupom vencido não pode ser usado', async () => {
    const sut = makeSut();
    await sut.create.execute({ code: 'BLACKFRIDAY', discountPercent: 30, expiresAt: '2026-11-28' });
    sut.clock.set(new Date('2026-11-29T00:00:01'));
    await expect(sut.check.execute({ code: 'BLACKFRIDAY', customerId: 'ana' })).rejects.toThrow(CouponExpiredError);
  });

  it('cupom inexistente é inválido', async () => {
    await expect(makeSut().check.execute({ code: 'NADA', customerId: 'ana' })).rejects.toThrow(InvalidCouponError);
  });
});
