require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createApp } = require('./server');

const PORT = process.env.MCP_PORT || 3100;

createApp().listen(PORT, () => {
  console.log(`Personal Finance MCP server (Streamable HTTP) listening on http://localhost:${PORT}/mcp`);
});
