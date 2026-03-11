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
│   │   └── server.js         # MCP server (Claude Desktop integration)
│   ├── docs/
│   │   └── swagger.json      # OpenAPI specification
│   ├── server.js             # Express server + MongoDB routes
│   ├── .env                  # Environment variables (not committed)
│   ├── package.json
│   └── package-lock.json
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

## MCP Server (Claude Desktop Integration)

This project includes an MCP (Model Context Protocol) server that lets Claude Desktop interact with your personal finance data using natural language.

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

### Claude Desktop Configuration

> **Important:** The Express server (`npm start`) must be running before using the MCP tools in Claude Desktop.

**1. Find your Claude Desktop config file**

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

**2. Add the MCP server**

Open the config file and add the `personal-finance` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "personal-finance": {
      "command": "node",
      "args": ["/full-path/personal-finance/backend/mcp/server.js"]
    }
  }
}
```

> Update the path in `args` to match your actual project location.

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
