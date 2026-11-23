// LionsShop API
// Começou como um protótipo de fim de semana e foi crescendo...
// Tudo está neste arquivo. Funciona, mas ninguém tem coragem de mexer.

import express from 'express';
import { MongoClient, ObjectId, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const app = express();
app.use(express.json());

let db: Db;
let client: MongoClient;

async function getDb() {
  if (!db) {
    client = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017');
    db = client.db(process.env.DB_NAME || 'lionsshop');
  }
  return db;
}

// "envia" e-mail (por enquanto só escreve no console)
function sendEmail(to: string, subject: string, body: string) {
  console.log(`[EMAIL] para: ${to} | assunto: ${subject}\n        ${body}`);
}

// =====================================================================
// PRODUTOS
// =====================================================================

app.post('/products', async (req, res) => {
  const { name, price, stock } = req.body;
  if (!name) {
    return res.status(400).json({ erro: 'nome é obrigatório' });
  }
  if (price === undefined || price <= 0) {
    return res.status(400).json({ error: 'Preço inválido' });
  }
  const db = await getDb();
  const result = await db.collection('products').insertOne({
    name,
    price,
    stock: stock ?? 0,
    createdAt: new Date(),
  });
  res.status(201).json({ id: result.insertedId, name, price, stock: stock ?? 0 });
});

app.get('/products', async (req, res) => {
  const db = await getDb();
  const filter: any = {};
  if (req.query.q) {
    filter.name = { $regex: String(req.query.q), $options: 'i' };
  }
  const products = await db.collection('products').find(filter).toArray();
  res.json(products.map((p) => ({ id: p._id, name: p.name, price: p.price, stock: p.stock })));
});

app.patch('/products/:id/stock', async (req, res) => {
  const { quantity } = req.body;
  if (typeof quantity !== 'number') {
    return res.status(400).json({ error: 'quantity deve ser um número' });
  }
  const db = await getDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(req.params.id) });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  if (product.stock + quantity < 0) {
    return res.status(400).json({ error: 'Estoque não pode ficar negativo' });
  }
  await db.collection('products').updateOne({ _id: product._id }, { $inc: { stock: quantity } });
  res.json({ id: product._id, stock: product.stock + quantity });
});

// =====================================================================
// CLIENTES
// =====================================================================

app.post('/customers', async (req, res) => {
  const { name, email, vip } = req.body;
  if (!name || !email) {
    return res.status(400).json({ erro: 'nome e email são obrigatórios' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  const db = await getDb();
  const exists = await db.collection('customers').findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ error: 'Já existe um cliente com este e-mail' });
  }
  const result = await db.collection('customers').insertOne({
    name,
    email: email.toLowerCase(),
    vip: vip == true,
    createdAt: new Date(),
  });
  res.status(201).json({ id: result.insertedId, name, email: email.toLowerCase(), vip: vip == true });
});

app.get('/customers/:id', async (req, res) => {
  const db = await getDb();
  const c = await db.collection('customers').findOne({ _id: new ObjectId(req.params.id) });
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ id: c._id, name: c.name, email: c.email, vip: c.vip });
});

app.put('/customers/:id', async (req, res) => {
  const { name, email } = req.body;
  // mesma validação do cadastro (copiada)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ erro: 'email invalido' });
  }
  const db = await getDb();
  const update: any = {};
  if (name) update.name = name;
  if (email) update.email = email; // TODO: deveria salvar em minúsculas como no cadastro?
  const result = await db.collection('customers').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update },
  );
  if (result.matchedCount == 0) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ ok: true });
});

// =====================================================================
// PEDIDOS
// status: 1 = pendente, 2 = enviado, 3 = cancelado
// =====================================================================

app.post('/orders', async (req, res) => {
  const { customerId, items, coupon } = req.body;
  if (!customerId) {
    return res.status(400).json({ erro: 'customerId é obrigatório' });
  }
  if (!items || items.length == 0) {
    return res.status(400).json({ error: 'Pedido vazio' });
  }

  const db = await getDb();
  const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  let total = 0;
  const orderItems: any[] = [];
  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }
    const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
    if (!product) {
      return res.status(404).json({ error: `Produto ${item.productId} não encontrado` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
    }
    total += product.price * item.quantity;
    orderItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
  }

  // cupons
  if (coupon) {
    if (coupon == 'LIONS10') {
      total = total * 0.9;
    } else if (coupon == 'BLACKFRIDAY') {
      total = total * 0.7;
    } else {
      return res.status(400).json({ error: 'Cupom inválido' });
    }
  }

  // cliente VIP ganha mais 5%
  if (customer.vip == true) {
    total = total - total * 0.05;
  }
  total = Math.round(total * 100) / 100;

  // baixa no estoque
  for (const it of orderItems) {
    await db.collection('products').updateOne({ _id: it.productId }, { $inc: { stock: -it.quantity } });
  }

  const result = await db.collection('orders').insertOne({
    customerId: customer._id,
    items: orderItems,
    coupon: coupon || null,
    total,
    status: 1,
    createdAt: new Date(),
  });

  sendEmail(customer.email, 'Pedido recebido!', `Olá ${customer.name}, recebemos seu pedido de R$ ${total}.`);

  res.status(201).json({ id: result.insertedId, total, status: 1 });
});

app.get('/orders', async (req, res) => {
  const db = await getDb();
  const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
  res.json(
    orders.map((o) => ({
      id: o._id,
      customerId: o.customerId,
      total: o.total,
      status: o.status == 1 ? 'PENDENTE' : o.status == 2 ? 'ENVIADO' : 'CANCELADO',
      createdAt: o.createdAt,
    })),
  );
});

app.get('/orders/:id', async (req, res) => {
  const db = await getDb();
  const o = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
  if (!o) return res.status(404).json({ error: 'Pedido não encontrado' });

  // recalcula o subtotal para mostrar na tela
  let subtotal = 0;
  for (const i of o.items) {
    subtotal += i.price * i.quantity;
  }

  res.json({
    id: o._id,
    customerId: o.customerId,
    items: o.items,
    coupon: o.coupon,
    subtotal,
    total: o.total,
    status: o.status == 1 ? 'PENDENTE' : o.status == 2 ? 'ENVIADO' : 'CANCELADO',
    createdAt: o.createdAt,
  });
});

app.patch('/orders/:id/ship', async (req, res) => {
  const db = await getDb();
  const o = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
  if (!o) return res.status(404).json({ error: 'Pedido não encontrado' });
  if (o.status != 1) {
    return res.status(400).json({ error: 'Só pedidos pendentes podem ser enviados' });
  }
  await db.collection('orders').updateOne({ _id: o._id }, { $set: { status: 2, shippedAt: new Date() } });

  const customer = await db.collection('customers').findOne({ _id: o.customerId });
  if (customer) {
    sendEmail(customer.email, 'Pedido enviado!', `Olá ${customer.name}, seu pedido saiu para entrega.`);
  }
  res.json({ id: o._id, status: 'ENVIADO' });
});

// =====================================================================
// RELATÓRIOS
// =====================================================================

app.get('/reports/revenue', async (req, res) => {
  const db = await getDb();
  const orders = await db.collection('orders').find({ status: { $ne: 3 } }).toArray();

  // recalcula o faturamento a partir dos itens
  // TODO: conferir se bate com o total salvo nos pedidos
  let revenue = 0;
  for (const o of orders) {
    let t = 0;
    for (const i of o.items) {
      t += i.price * i.quantity;
    }
    if (o.coupon == 'LIONS10') t = t * 0.9;
    revenue += t;
  }

  res.json({ orders: orders.length, revenue: Math.round(revenue * 100) / 100 });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`LionsShop API rodando em http://localhost:${port}`);
  });
}

export { app, getDb };
