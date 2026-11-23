#!/usr/bin/env node
import { startStdioMcpServer } from './server.js';

const projectRoot = process.argv[2] ?? process.cwd();
startStdioMcpServer(projectRoot).catch((err) => {
  process.stderr.write(`Fatal MCP server error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
