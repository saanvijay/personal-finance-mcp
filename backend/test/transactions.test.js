const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, Transaction } = require('../server');

let mongo;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await Transaction.deleteMany({});
});

test('GET /api/transactions returns empty array when no data', async () => {
  const res = await request(app).get('/api/transactions');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('POST /api/transactions creates an expense', async () => {
  const payload = { type: 'expense', amount: 25.5, category: 'Food', date: '2026-05-01', note: 'lunch' };
  const res = await request(app).post('/api/transactions').send(payload);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.type, 'expense');
  assert.strictEqual(res.body.amount, 25.5);
  assert.strictEqual(res.body.category, 'Food');
  assert.strictEqual(res.body.date, '2026-05-01');
  assert.strictEqual(res.body.note, 'lunch');
  assert.ok(res.body._id);
});

test('POST /api/transactions creates an income', async () => {
  const payload = { type: 'income', amount: 1000, category: 'Salary', date: '2026-04-01' };
  const res = await request(app).post('/api/transactions').send(payload);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.type, 'income');
  assert.strictEqual(res.body.note, '');
});

test('POST /api/transactions rejects invalid type with 400', async () => {
  const res = await request(app).post('/api/transactions').send({
    type: 'invalid', amount: 10, category: 'X', date: '2026-05-01',
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
});

test('POST /api/transactions rejects missing required fields with 400', async () => {
  const res = await request(app).post('/api/transactions').send({ type: 'expense' });
  assert.strictEqual(res.status, 400);
});

test('GET /api/transactions returns most recent first', async () => {
  const older = await Transaction.create({ type: 'income', amount: 1000, category: 'Salary', date: '2026-04-01' });
  // Force a later createdAt for the second record by waiting a tick
  await new Promise(r => setTimeout(r, 10));
  const newer = await Transaction.create({ type: 'expense', amount: 50, category: 'Coffee', date: '2026-05-01' });

  const res = await request(app).get('/api/transactions');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 2);
  assert.strictEqual(res.body[0]._id, newer._id.toString());
  assert.strictEqual(res.body[1]._id, older._id.toString());
});

test('DELETE /api/transactions/:id removes the transaction', async () => {
  const tx = await Transaction.create({ type: 'expense', amount: 5, category: 'X', date: '2026-05-01' });
  const res = await request(app).delete(`/api/transactions/${tx._id}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { success: true });
  const found = await Transaction.findById(tx._id);
  assert.strictEqual(found, null);
});

test('DELETE /api/transactions/:id with invalid id returns 400', async () => {
  const res = await request(app).delete('/api/transactions/not-a-valid-id');
  assert.strictEqual(res.status, 400);
});

test('DELETE /api/transactions/:id is a no-op for missing id', async () => {
  const fakeId = new mongoose.Types.ObjectId().toString();
  const res = await request(app).delete(`/api/transactions/${fakeId}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { success: true });
});
