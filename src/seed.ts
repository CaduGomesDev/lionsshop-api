import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

async function seed() {
  const client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017');
  const db = client.db(process.env.DB_NAME || 'lionsshop');

  await db.collection('products').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('orders').deleteMany({});
  await db.collection('coupons').deleteMany({});

  await db.collection('customers').createIndex({ email: 1 }, { unique: true });
  await db.collection('orders').createIndex({ customerId: 1, createdAt: -1 });

  const products = await db.collection('products').insertMany([
    { name: 'Camiseta Lions', price: 79.9, stock: 50, createdAt: new Date() },
    { name: 'Caneca Dev', price: 39.9, stock: 30, createdAt: new Date() },
    { name: 'Moletom Code Hero', price: 189.9, stock: 10, createdAt: new Date() },
    { name: 'Adesivos (kit)', price: 14.9, stock: 200, createdAt: new Date() },
  ]);

  const customers = await db.collection('customers').insertMany([
    { name: 'Ana Souza', email: 'ana@example.com', vip: false, createdAt: new Date() },
    { name: 'Bruno Lima', email: 'bruno@example.com', vip: true, createdAt: new Date() },
  ]);

  const nextYear = new Date().getFullYear() + 1;
  await db.collection<{ _id: string; [field: string]: unknown }>('coupons').insertMany([
    { _id: 'LIONS10', discountPercent: 10, expiresAt: new Date(`${nextYear}-12-31T23:59:59.999`), redeemedBy: [], createdAt: new Date() },
    { _id: 'BLACKFRIDAY', discountPercent: 30, expiresAt: new Date(`${nextYear}-11-30T23:59:59.999`), redeemedBy: [], createdAt: new Date() },
  ]);

  console.log('Produtos criados:');
  console.table(Object.values(products.insertedIds).map((id) => id.toString()));
  console.log('Clientes criados (Ana = comum, Bruno = VIP):');
  console.table(Object.values(customers.insertedIds).map((id) => id.toString()));
  console.log(`Cupons criados: LIONS10 (10%, até 31/12/${nextYear}) e BLACKFRIDAY (30%, até 30/11/${nextYear})`);

  await client.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
