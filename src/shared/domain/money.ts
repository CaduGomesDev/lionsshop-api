import { ValidationError } from './domain-error';

export class Money {
  private constructor(private readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new ValidationError('Valor monetário inválido');
    }
    return new Money(cents);
  }

  static fromDecimal(value: number): Money {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ValidationError('Valor monetário inválido');
    }
    return Money.fromCents(Math.round(value * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  static sum(values: Money[]): Money {
    return values.reduce((acc, value) => acc.add(value), Money.zero());
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    if (other.cents > this.cents) {
      throw new ValidationError('Valor monetário não pode ficar negativo');
    }
    return new Money(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new ValidationError('Fator de multiplicação inválido');
    }
    return new Money(this.cents * factor);
  }

  percent(percent: number): Money {
    return new Money(Math.round((this.cents * percent) / 100));
  }

  applyDiscount(percent: number): Money {
    return this.subtract(this.percent(percent));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toCents(): number {
    return this.cents;
  }

  toDecimal(): number {
    return this.cents / 100;
  }

  format(): string {
    return (this.cents / 100).toFixed(2).replace('.', ',');
  }
}
