import { Money } from '../../src/shared/domain/money';
import { Product } from '../../src/modules/catalog/domain/product';
import { NegativeStockError } from '../../src/modules/catalog/domain/errors';
import { Email } from '../../src/modules/customers/domain/email';
import { Customer } from '../../src/modules/customers/domain/customer';

const createdAt = new Date('2026-11-01T00:00:00Z');

describe('Product', () => {
  const product = () => Product.create({ id: 'p1', name: 'Caneca', price: Money.fromDecimal(39.9), stock: 5, createdAt });

  it('o estoque nunca fica negativo', () => {
    const p = product();
    expect(() => p.adjustStock(-6)).toThrow(NegativeStockError);
    expect(p.stock).toBe(5);
  });

  it('ajusta o estoque com entradas e saídas', () => {
    const p = product();
    p.adjustStock(-5);
    p.adjustStock(2);
    expect(p.stock).toBe(2);
  });

  it('exige nome e preço maior que zero', () => {
    expect(() => Product.create({ id: 'p', name: ' ', price: Money.fromDecimal(1), createdAt })).toThrow('Nome é obrigatório');
    expect(() => Product.create({ id: 'p', name: 'X', price: Money.zero(), createdAt })).toThrow('Preço inválido');
  });
});

describe('Email', () => {
  it('normaliza para minúsculas', () => {
    expect(Email.create('  Ana@Example.COM ').toString()).toBe('ana@example.com');
  });

  it('rejeita formato inválido', () => {
    expect(() => Email.create('ana')).toThrow('E-mail inválido');
  });

  it('é comparado pelo valor', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.com'))).toBe(true);
  });
});

describe('Customer', () => {
  it('exige nome', () => {
    expect(() => Customer.create({ id: 'c', name: '', email: Email.create('a@b.com'), vip: false, createdAt })).toThrow(
      'Nome é obrigatório',
    );
  });
});
