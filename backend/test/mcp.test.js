const test = require('node:test');
const assert = require('node:assert');
const {
  createServer,
  getTransactions,
  createTransaction,
  deleteTransaction,
} = require('../mcp/server');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

function stubFetch(handler) {
  const original = global.fetch;
  global.fetch = handler;
  return () => { global.fetch = original; };
}

test('createServer returns an MCP server instance', () => {
  const server = createServer();
  assert.ok(server, 'expected createServer() to return a value');
  assert.strictEqual(typeof server.connect, 'function', 'McpServer should expose connect()');
});

test('get_transactions handler GETs the transactions endpoint and wraps the response', async () => {
  const calls = [];
  const restore = stubFetch(async (url, init) => {
    calls.push({ url, init });
    return { json: async () => [{ _id: '1', type: 'expense', amount: 10 }] };
  });
  try {
    const result = await getTransactions();
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, `${API_BASE}/api/transactions`);
    assert.strictEqual(calls[0].init, undefined);
    assert.strictEqual(result.content[0].type, 'text');
    const parsed = JSON.parse(result.content[0].text);
    assert.deepStrictEqual(parsed, [{ _id: '1', type: 'expense', amount: 10 }]);
  } finally {
    restore();
  }
});

test('create_transaction handler POSTs JSON body to the transactions endpoint', async () => {
  const calls = [];
  const restore = stubFetch(async (url, init) => {
    calls.push({ url, init });
    return { json: async () => ({ _id: 'abc', ...JSON.parse(init.body) }) };
  });
  try {
    const args = { type: 'expense', amount: 25, category: 'Food', date: '2026-05-01', note: 'lunch' };
    const result = await createTransaction(args);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, `${API_BASE}/api/transactions`);
    assert.strictEqual(calls[0].init.method, 'POST');
    assert.strictEqual(calls[0].init.headers['Content-Type'], 'application/json');
    assert.deepStrictEqual(JSON.parse(calls[0].init.body), args);
    const parsed = JSON.parse(result.content[0].text);
    assert.strictEqual(parsed._id, 'abc');
    assert.strictEqual(parsed.category, 'Food');
  } finally {
    restore();
  }
});

test('delete_transaction handler DELETEs by id', async () => {
  const calls = [];
  const restore = stubFetch(async (url, init) => {
    calls.push({ url, init });
    return { json: async () => ({ success: true }) };
  });
  try {
    const result = await deleteTransaction({ id: '64ffaa00aabbccdd11223344' });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, `${API_BASE}/api/transactions/64ffaa00aabbccdd11223344`);
    assert.strictEqual(calls[0].init.method, 'DELETE');
    const parsed = JSON.parse(result.content[0].text);
    assert.deepStrictEqual(parsed, { success: true });
  } finally {
    restore();
  }
});
