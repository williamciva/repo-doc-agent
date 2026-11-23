import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { RepoDocContext } from '@repodoc/core';
import { ConsoleLogger, Logger } from '@repodoc/shared';
import { createMcpTools, McpToolDefinition } from './tools.js';
import { createMcpResources, McpResourceDefinition } from './resources.js';
import { createMcpPrompts, McpPromptDefinition } from './prompts.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpServerOptions {
  defaultProjectRoot?: string;
  logger?: Logger;
  contextFactory?: (projectRoot: string) => Promise<RepoDocContext>;
}

function uriToPath(uriOrPath: string): string {
  if (uriOrPath.startsWith('file://')) {
    return fileURLToPath(uriOrPath);
  }
  return path.resolve(uriOrPath);
}

function extractRootFromInitialize(params?: Record<string, unknown>): string | undefined {
  if (!params) return undefined;

  const workspaceFolders = params['workspaceFolders'];
  if (Array.isArray(workspaceFolders) && workspaceFolders.length > 0) {
    const first = workspaceFolders[0] as Record<string, unknown> | undefined;
    const uri = typeof first?.['uri'] === 'string' ? first['uri'] : undefined;
    if (uri) return uriToPath(uri);
  }

  const rootUri = params['rootUri'];
  if (typeof rootUri === 'string' && rootUri.length > 0) {
    return uriToPath(rootUri);
  }

  const rootPath = params['rootPath'];
  if (typeof rootPath === 'string' && rootPath.length > 0) {
    return path.resolve(rootPath);
  }

  return undefined;
}

export class McpServerHandler {
  private readonly tools: Map<string, McpToolDefinition>;
  private readonly resources: Map<string, McpResourceDefinition>;
  private readonly prompts: Map<string, McpPromptDefinition>;
  private readonly contexts = new Map<string, RepoDocContext>();
  private readonly logger: Logger;
  private readonly contextFactory: (projectRoot: string) => Promise<RepoDocContext>;
  private defaultProjectRoot: string;

  constructor(contextOrOptions?: RepoDocContext | McpServerOptions) {
    this.tools = new Map(createMcpTools().map((t) => [t.name, t]));
    this.resources = new Map(createMcpResources().map((r) => [r.uri, r]));
    this.prompts = new Map(createMcpPrompts().map((p) => [p.name, p]));

    if (contextOrOptions && 'projectRoot' in contextOrOptions && 'config' in contextOrOptions) {
      const fixedCtx = contextOrOptions;
      this.defaultProjectRoot = fixedCtx.projectRoot;
      this.logger = fixedCtx.logger;
      this.contexts.set(path.resolve(fixedCtx.projectRoot), fixedCtx);
      this.contextFactory = async () => fixedCtx;
    } else {
      const opts = contextOrOptions ?? {};
      this.defaultProjectRoot = path.resolve(opts.defaultProjectRoot ?? process.cwd());
      this.logger = opts.logger ?? new ConsoleLogger('warn');
      this.contextFactory =
        opts.contextFactory ??
        ((root) => RepoDocContext.create({ projectRoot: root, logger: this.logger }));
    }
  }

  public getDefaultProjectRoot(): string {
    return this.defaultProjectRoot;
  }

  public async getContext(projectRoot?: string): Promise<RepoDocContext> {
    const resolved = path.resolve(projectRoot ?? this.defaultProjectRoot);
    const existing = this.contexts.get(resolved);
    if (existing) {
      return existing;
    }

    const created = await this.contextFactory(resolved);
    this.contexts.set(resolved, created);
    return created;
  }

  public closeAll(): void {
    for (const ctx of this.contexts.values()) {
      ctx.close();
    }
    this.contexts.clear();
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const id = req.id ?? null;

    // Notifications do not expect a response
    if (req.id === undefined && req.method.startsWith('notifications/')) {
      return null;
    }

    try {
      switch (req.method) {
        case 'initialize': {
          const detectedRoot = extractRootFromInitialize(req.params);
          if (detectedRoot) {
            this.defaultProjectRoot = detectedRoot;
          }
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
              },
              serverInfo: {
                name: 'repodoc-mcp-server',
                version: '0.1.0',
              },
            },
          };
        }

        case 'ping':
          return { jsonrpc: '2.0', id, result: {} };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: Array.from(this.tools.values()).map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
              })),
            },
          };

        case 'tools/call': {
          const params = req.params ?? {};
          const name = String(params['name'] ?? '');
          const rawArgs = { ...((params['arguments'] as Record<string, unknown> | undefined) ?? {}) };
          const tool = this.tools.get(name);
          if (!tool) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Unknown tool: '${name}'` },
            };
          }

          const explicitRoot =
            typeof rawArgs['projectRoot'] === 'string' ? rawArgs['projectRoot'] : undefined;
          delete rawArgs['projectRoot'];

          try {
            const ctx = await this.getContext(explicitRoot);
            const output = await tool.execute(ctx, rawArgs);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(output, null, 2),
                  },
                ],
                isError: false,
              },
            };
          } catch (err) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: err instanceof Error ? err.message : String(err),
                  },
                ],
                isError: true,
              },
            };
          }
        }

        case 'resources/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: Array.from(this.resources.values()).map((r) => ({
                uri: r.uri,
                name: r.name,
                description: r.description,
                mimeType: r.mimeType,
              })),
            },
          };

        case 'resources/read': {
          const uri = String(req.params?.['uri'] ?? '');
          const resource = this.resources.get(uri);
          if (!resource) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: `Resource not found: '${uri}'` },
            };
          }

          const ctx = await this.getContext();
          const text = await resource.read(ctx);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }],
            },
          };
        }

        case 'prompts/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: Array.from(this.prompts.values()).map((p) => ({
                name: p.name,
                description: p.description,
                arguments: p.arguments ?? [],
              })),
            },
          };

        case 'prompts/get': {
          const name = String(req.params?.['name'] ?? '');
          const args = (req.params?.['arguments'] as Record<string, string> | undefined) ?? {};
          const prompt = this.prompts.get(name);
          if (!prompt) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: `Prompt not found: '${name}'` },
            };
          }

          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: prompt.description,
              messages: prompt.render(args),
            },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: '${req.method}'` },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export async function startStdioMcpServer(projectRoot?: string): Promise<void> {
  const logger = new ConsoleLogger('warn');
  const handler = new McpServerHandler({
    defaultProjectRoot: projectRoot ?? process.cwd(),
    logger,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    void (async () => {
      try {
        const req = JSON.parse(trimmed) as JsonRpcRequest;
        const resp = await handler.handleRequest(req);
        if (resp) {
          process.stdout.write(`${JSON.stringify(resp)}\n`);
        }
      } catch (err) {
        const errorResp: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
          },
        };
        process.stdout.write(`${JSON.stringify(errorResp)}\n`);
      }
    })();
  });

  await new Promise<void>((resolve) => {
    rl.on('close', () => {
      handler.closeAll();
      resolve();
    });
  });
}
