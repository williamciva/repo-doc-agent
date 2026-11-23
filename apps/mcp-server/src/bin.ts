#!/usr/bin/env node
import { startStdioMcpServer } from './server.js';

const explicitRoot = process.argv[2];
startStdioMcpServer(explicitRoot).catch((err) => {
  process.stderr.write(`Fatal MCP server error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
