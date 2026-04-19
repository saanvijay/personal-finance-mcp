require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { z } = require('zod');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const PORT = process.env.MCP_PORT || 3100;

const server = new McpServer({
  name: 'personal-finance',
  version: '1.0.0',
});

// Tool: get_transactions
server.tool(
  'get_transactions',
  'Get all income and expense transactions, sorted by most recent first',
  {},
  async () => {
    const res = await fetch(`${API_BASE}/api/transactions`);
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: create_transaction
server.tool(
  'create_transaction',
  'Add a new income or expense transaction',
  {
    type:     z.enum(['income', 'expense']).describe('Transaction type'),
    amount:   z.number().positive().describe('Transaction amount'),
    category: z.string().describe('Category (e.g. Food, Rent, Salary)'),
    date:     z.string().describe('Date in YYYY-MM-DD format'),
    note:     z.string().optional().describe('Optional note'),
  },
  async ({ type, amount, category, date, note }) => {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, category, date, note }),
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: delete_transaction
server.tool(
  'delete_transaction',
  'Delete a transaction by its ID',
  {
    id: z.string().describe('MongoDB ObjectId of the transaction'),
  },
  async ({ id }) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

const app = express();

const transports = {};

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).send('No transport found for sessionId');
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`Personal Finance MCP server (SSE) listening on http://localhost:${PORT}/sse`);
});
