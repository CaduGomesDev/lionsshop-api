import type { Clock } from '../../../../shared/application/clock';
import { ValidationError } from '../../../../shared/domain/domain-error';
import { Coupon } from '../../domain/coupon';
import type { CouponRepository } from '../../domain/coupon-repository';
import { CouponCodeAlreadyExistsError } from '../../domain/errors';
import { toCouponOutput, type CouponOutput } from '../coupon-output';

export interface CreateCouponInput {
  code: string;
  discountPercent: number;
  expiresAt: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseExpiresAt(value: string): Date {
  if (typeof value !== 'string' || !value) throw new ValidationError('Data de validade é obrigatória');
  const date = DATE_ONLY.test(value) ? new Date(`${value}T23:59:59.999`) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError('Data de validade inválida');
  return date;
}

export class CreateCouponUseCase {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateCouponInput): Promise<CouponOutput> {
    const coupon = Coupon.create({
      code: input.code,
      discountPercent: input.discountPercent,
      expiresAt: parseExpiresAt(input.expiresAt),
      createdAt: this.clock.now(),
    });
    if (await this.coupons.findByCode(coupon.code)) throw new CouponCodeAlreadyExistsError();

    await this.coupons.save(coupon);
    return toCouponOutput(coupon);
  }
}
