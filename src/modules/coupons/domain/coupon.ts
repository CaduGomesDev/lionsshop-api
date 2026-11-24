import { ValidationError } from '../../../shared/domain/domain-error';
import { CouponAlreadyUsedError, CouponExpiredError } from './errors';

export interface CouponProps {
  code: string;
  discountPercent: number;
  expiresAt: Date;
  redeemedBy: string[];
  createdAt: Date;
}

const CODE_FORMAT = /^[A-Z0-9_-]{3,30}$/;

export class Coupon {
  private constructor(private readonly props: CouponProps) {}

  static normalizeCode(code: string): string {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
  }

  static create(input: { code: string; discountPercent: number; expiresAt: Date; createdAt: Date }): Coupon {
    const code = Coupon.normalizeCode(input.code);
    if (!CODE_FORMAT.test(code)) {
      throw new ValidationError('Código do cupom deve ter de 3 a 30 letras, números, "-" ou "_"');
    }
    const percent = input.discountPercent;
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      throw new ValidationError('Percentual de desconto deve ser um inteiro entre 1 e 100');
    }
    if (!(input.expiresAt instanceof Date) || Number.isNaN(input.expiresAt.getTime())) {
      throw new ValidationError('Data de validade inválida');
    }
    if (input.expiresAt.getTime() <= input.createdAt.getTime()) {
      throw new ValidationError('A validade do cupom precisa ser uma data futura');
    }
    return new Coupon({ code, discountPercent: percent, expiresAt: input.expiresAt, redeemedBy: [], createdAt: input.createdAt });
  }

  static restore(props: CouponProps): Coupon {
    return new Coupon({ ...props, redeemedBy: [...props.redeemedBy] });
  }

  get code(): string {
    return this.props.code;
  }
  get discountPercent(): number {
    return this.props.discountPercent;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpiredAt(now: Date): boolean {
    return now.getTime() > this.props.expiresAt.getTime();
  }

  wasRedeemedBy(customerId: string): boolean {
    return this.props.redeemedBy.includes(customerId);
  }

  assertRedeemableBy(customerId: string, now: Date): void {
    if (this.isExpiredAt(now)) throw new CouponExpiredError();
    if (this.wasRedeemedBy(customerId)) throw new CouponAlreadyUsedError();
  }

  redeem(customerId: string, now: Date): void {
    this.assertRedeemableBy(customerId, now);
    this.props.redeemedBy.push(customerId);
  }

  snapshot(): CouponProps {
    return { ...this.props, redeemedBy: [...this.props.redeemedBy] };
  }
}
