#!/usr/bin/env node
import { runCli } from './runner.js';

runCli(process.argv.slice(2))
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    process.stderr.write(`Fatal CLI error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
