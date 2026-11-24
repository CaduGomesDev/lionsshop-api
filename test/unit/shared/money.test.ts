import { Money } from '../../../src/shared/domain/money';

describe('Money', () => {
  it('evita o erro de ponto flutuante guardando centavos', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    const a = Money.fromDecimal(0.1);
    const b = Money.fromDecimal(0.2);

    const sum = a.add(b);

    expect(sum.toDecimal()).toBe(0.3);
    expect(sum.toCents()).toBe(30);
  });

  it('é imutável: operações devolvem novas instâncias', () => {
    const price = Money.fromDecimal(10);
    const doubled = price.multiply(2);
    expect(price.toDecimal()).toBe(10);
    expect(doubled.toDecimal()).toBe(20);
  });

  it('calcula percentual e desconto arredondando ao centavo', () => {
    const value = Money.fromDecimal(143.82);
    expect(value.percent(5).toDecimal()).toBe(7.19);
    expect(value.applyDiscount(5).toDecimal()).toBe(136.63);
  });

  it('compara pelo valor', () => {
    expect(Money.fromCents(100).equals(Money.fromDecimal(1))).toBe(true);
    expect(Money.fromCents(101).isGreaterThan(Money.fromCents(100))).toBe(true);
  });

  it('rejeita valores negativos ou inválidos', () => {
    expect(() => Money.fromCents(-1)).toThrow('Valor monetário inválido');
    expect(() => Money.fromDecimal(NaN)).toThrow('Valor monetário inválido');
    expect(() => Money.fromCents(1).subtract(Money.fromCents(2))).toThrow();
  });

  it('formata para mensagens em reais', () => {
    expect(Money.fromDecimal(68.2).format()).toBe('68,20');
  });
});
