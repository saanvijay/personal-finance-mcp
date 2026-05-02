require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { randomUUID } = require('node:crypto');
const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const { z } = require('zod');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const PORT = process.env.MCP_PORT || 3100;

async function getTransactions() {
  const res = await fetch(`${API_BASE}/api/transactions`);
  const data = await res.json();
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function createTransaction({ type, amount, category, date, note }) {
  const res = await fetch(`${API_BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, amount, category, date, note }),
  });
  const data = await res.json();
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function deleteTransaction({ id }) {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function createServer() {
  const server = new McpServer({
    name: 'personal-finance',
    version: '1.0.0',
  });

  server.tool(
    'get_transactions',
    'Get all income and expense transactions, sorted by most recent first',
    {},
    getTransactions
  );

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
    createTransaction
  );

  server.tool(
    'delete_transaction',
    'Delete a transaction by its ID',
    {
      id: z.string().describe('MongoDB ObjectId of the transaction'),
    },
    deleteTransaction
  );

  return server;
}

function createApp() {
  const app = express();
  app.use(express.json());

  const transports = {};

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };
      await createServer().connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  async function handleSessionRequest(req, res) {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  }

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  return app;
}

if (require.main === module) {
  createApp().listen(PORT, () => {
    console.log(`Personal Finance MCP server (Streamable HTTP) listening on http://localhost:${PORT}/mcp`);
  });
}

module.exports = { createServer, createApp, getTransactions, createTransaction, deleteTransaction };
