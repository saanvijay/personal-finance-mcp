// MCP stdio uses stdout for protocol — redirect all console.log to stderr
console.log = (...args) => console.error(...args);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

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

// Start with stdio transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('Personal Finance MCP server running');
});
