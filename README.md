# Personal Finance

A simple personal finance web app to track income and expenses, backed by MongoDB.

## Project Structure

```
personal-finance/
├── frontend/
│   ├── index.html            # Main HTML page
│   ├── style.css             # Styles
│   └── app.js                # Frontend logic (fetch API calls)
├── backend/
│   ├── mcp/
│   │   ├── server.js         # MCP server (Claude Desktop integration)
│   │   └── Dockerfile        # Container image for the MCP server
│   ├── docs/
│   │   └── swagger.json      # OpenAPI specification
│   ├── test/
│   │   ├── transactions.test.js  # API integration tests
│   │   └── mcp.test.js           # MCP tool handler tests
│   ├── server.js             # Express server + MongoDB routes
│   ├── .env                  # Environment variables (not committed)
│   ├── .dockerignore
│   ├── package.json
│   └── package-lock.json
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions: tests + Docker build
├── .gitignore
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community)

## Setup

**1. Install MongoDB (macOS)**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**2. Install dependencies**
```bash
cd backend
npm install
```

**3. Configure environment**

Create a `backend/.env` file:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/personal-finance
API_BASE=http://localhost:3000
MCP_PORT=3100
```

**4. Start the server**
```bash
npm start
```

**5. Open the app**

Visit [http://localhost:3000](http://localhost:3000)

**6. View API docs (Swagger UI)**

Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Features

- Add income and expense transactions
- Categorize transactions
- View total balance, income, and expenses
- Delete transactions
- Data persisted in MongoDB

---

## Testing

Tests use Node's built-in test runner (`node:test`), [`supertest`](https://www.npmjs.com/package/supertest) for HTTP assertions, and [`mongodb-memory-server`](https://www.npmjs.com/package/mongodb-memory-server) so tests run against a real, ephemeral MongoDB without needing a local server.

```bash
cd backend
npm install
npm test
```

| File | Covers |
|------|--------|
| `backend/test/transactions.test.js` | `GET`/`POST`/`DELETE /api/transactions` — happy paths, validation 400s, sort order |
| `backend/test/mcp.test.js` | `get_transactions`, `create_transaction`, `delete_transaction` MCP handlers (mocks `fetch`) |

The first run downloads the MongoDB binary into `~/.cache/mongodb-binaries`; subsequent runs are fast.

---

## Docker (MCP server)

A Dockerfile is provided for the MCP server at `backend/mcp/Dockerfile`. The build context is the `backend/` directory because the image shares `package.json` with the API.

```bash
cd backend
docker build -f mcp/Dockerfile -t personal-finance-mcp .
docker run -p 3100:3100 \
  -e API_BASE=http://host.docker.internal:3000 \
  personal-finance-mcp
```

Notes:
- Inside the container, `localhost` refers to the container itself. Use `host.docker.internal` (macOS/Windows) or a docker network hostname to reach the backend API on the host.
- The image installs production dependencies only (`npm ci --omit=dev`) and excludes `test/`, `node_modules`, and `.env` via `.dockerignore`.

---

## Continuous Integration

GitHub Actions runs on every push and PR to `main` (`.github/workflows/ci.yml`):

| Job | What it does |
|-----|--------------|
| `backend` | `npm ci` → `node --check` → `npm test` on Node 20 & 22 |
| `frontend` | `node --check frontend/app.js` |
| `docker-mcp` | Builds the MCP image, runs it, waits for `:3100`, and posts a real MCP `initialize` handshake to `/mcp` |

---

## MCP Server (Streamable HTTP)

This project includes an MCP (Model Context Protocol) server that lets MCP clients (Claude Desktop, MCP Inspector, etc.) interact with your personal finance data using natural language.

The server uses the **Streamable HTTP** transport on port `3100` by default. A single endpoint handles all traffic; the session id is tracked via the `mcp-session-id` header.

| Method | Path  | Purpose |
|--------|-------|---------|
| POST   | `/mcp` | Initialize a session and send JSON-RPC requests |
| GET    | `/mcp` | Open the SSE stream for server→client notifications |
| DELETE | `/mcp` | Terminate a session |

### Running the MCP server

The MCP server calls the backend API, so the API must be running too.

```bash
# Terminal 1 — backend API (port 3000)
cd backend && npm start

# Terminal 2 — MCP server (port 3100)
cd backend && npm run mcp
```

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_transactions` | Fetch all transactions sorted by most recent | None |
| `create_transaction` | Add a new income or expense transaction | `type`, `amount`, `category`, `date`, `note` (optional) |
| `delete_transaction` | Delete a transaction by its ID | `id` |

#### Tool Parameters

**`create_transaction`**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `"income"` \| `"expense"` | Yes | Transaction type |
| `amount` | number | Yes | Positive amount |
| `category` | string | Yes | e.g. Food, Rent, Salary |
| `date` | string | Yes | Format: `YYYY-MM-DD` |
| `note` | string | No | Optional description |

**`delete_transaction`**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the transaction |

---

### Testing with MCP Inspector

The easiest way to exercise the tools is the official MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:
1. Set **Transport Type** → `Streamable HTTP`
2. Set **URL** → `http://localhost:3100/mcp`
3. Click **Connect**, then invoke any tool (`get_transactions`, `create_transaction`, `delete_transaction`).

### Claude Desktop Configuration

> **Important:** Both the backend API (`npm start`) and the MCP server (`npm run mcp`) must be running before using the tools in Claude Desktop.

**1. Find your Claude Desktop config file**

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

**2. Add the MCP server**

Claude Desktop connects to local stdio servers natively; for a Streamable HTTP server, use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge:

```json
{
  "mcpServers": {
    "personal-finance": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3100/mcp"]
    }
  }
}
```

**3. Restart Claude Desktop**

Quit and reopen Claude Desktop. The tools will appear automatically.

**4. Example prompts you can use**

```
Show me all my transactions
Add an expense of $45 for Food on 2026-03-10 with note "Grocery run"
Add a salary income of $5000 for March 2026
Delete transaction with id 65f1a2b3c4d5e6f7a8b9c0d1
What did I spend this month?
```
