import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RepoDocContext } from '@repodoc/core';
import { McpServerHandler } from '../src/server.js';

describe('McpServerHandler', () => {
  let context: RepoDocContext;
  let handler: McpServerHandler;

  beforeEach(async () => {
    context = await RepoDocContext.createInMemory(process.cwd());
    handler = new McpServerHandler(context);
  });

  afterEach(() => {
    context.close();
  });

  it('should handle initialize, tools/list, resources/list, and prompts/list', async () => {
    const initResp = await handler.handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect((initResp?.result as { serverInfo: { name: string } }).serverInfo.name).toBe(
      'repodoc-mcp-server'
    );

    const toolsResp = await handler.handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (toolsResp?.result as { tools: Array<{ name: string }> }).tools;
    expect(tools.some((t) => t.name === 'analyze_repository')).toBe(true);
    expect(tools.some((t) => t.name === 'generate_documentation')).toBe(true);

    const resResp = await handler.handleRequest({ jsonrpc: '2.0', id: 3, method: 'resources/list' });
    const resources = (resResp?.result as { resources: Array<{ uri: string }> }).resources;
    expect(resources.some((r) => r.uri === 'repodoc://overview')).toBe(true);

    const promptsResp = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'prompts/list',
    });
    const prompts = (promptsResp?.result as { prompts: Array<{ name: string }> }).prompts;
    expect(prompts.some((p) => p.name === 'analyze-repository')).toBe(true);
  });

  it('should read resources and get prompts', async () => {
    const readResp = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/read',
      params: { uri: 'repodoc://config' },
    });
    const contents = (readResp?.result as { contents: Array<{ text: string }> }).contents;
    expect(contents[0]?.text).toContain('repo-doc-agent');

    const promptResp = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'prompts/get',
      params: { name: 'investigate-business-rule', arguments: { topic: 'permissions' } },
    });
    const messages = (
      promptResp?.result as { messages: Array<{ content: { text: string } }> }
    ).messages;
    expect(messages[0]?.content.text).toContain('permissions');
  });

  it('should execute register_knowledge, preview_documentation_changes, and block unauthorized generate_documentation', async () => {
    const regResp = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'register_knowledge',
        arguments: {
          title: 'MCP Contract',
          content: 'MCP is the primary external agent interface.',
          category: 'architecture',
        },
      },
    });
    expect((regResp?.result as { isError: boolean }).isError).toBe(false);

    const previewResp = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'preview_documentation_changes',
        arguments: { depth: 'overview' },
      },
    });
    const previewResult = previewResp?.result as { isError: boolean; content: Array<{ text: string }> };
    expect(previewResult.isError).toBe(false);
    expect(previewResult.content[0]?.text).toContain('technical/OVERVIEW.md');

    const genUnauthorized = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'generate_documentation',
        arguments: { depth: 'overview', authorized: false },
      },
    });
    const genResult = genUnauthorized?.result as { isError: boolean; content: Array<{ text: string }> };
    expect(genResult.isError).toBe(true);
    expect(genResult.content[0]?.text).toContain('not authorized');

    const batchApprove = await handler.handleRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'approve_knowledge',
        arguments: { all: true },
      },
    });
    expect((batchApprove?.result as { isError: boolean }).isError).toBe(false);
  }, 15000);
});
