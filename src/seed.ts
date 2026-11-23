// Popula o banco com alguns produtos e clientes para testar a API.
// Uso: npm run seed
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

async function seed() {
  const client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017');
  const db = client.db(process.env.DB_NAME || 'lionsshop');

  await db.collection('products').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('orders').deleteMany({});

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

  console.log('Produtos criados:');
  console.table(Object.values(products.insertedIds).map((id) => id.toString()));
  console.log('Clientes criados (Ana = comum, Bruno = VIP):');
  console.table(Object.values(customers.insertedIds).map((id) => id.toString()));

  await client.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
