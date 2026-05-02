FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY mcp ./mcp

ENV MCP_PORT=3100
EXPOSE 3100

CMD ["node", "mcp/index.js"]
