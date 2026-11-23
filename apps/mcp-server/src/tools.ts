import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { z } from 'zod';
import { RepoDocContext } from '@repodoc/core';
import { KnowledgeCategorySchema } from '@repodoc/shared';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (ctx: RepoDocContext, args: Record<string, unknown>) => Promise<unknown>;
}

const emptySchema = z.object({});

const searchKnowledgeSchema = z.object({
  category: KnowledgeCategorySchema.optional(),
  searchText: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const searchRepoSchema = z.object({
  text: z.string().optional(),
  identifier: z.string().optional(),
  path: z.string().optional(),
  mode: z.enum(['fulltext', 'structural', 'semantic', 'hybrid']).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const impactSchema = z.object({
  changedFiles: z.array(z.string().min(1)).min(1),
});

const askSchema = z.object({
  question: z.string().min(1),
  limit: z.number().int().positive().max(20).optional(),
});

const registerKnowledgeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: KnowledgeCategorySchema.default('observations'),
  fileReferences: z.array(z.string()).default([]),
  symbols: z.array(z.string()).default([]),
});

const approveKnowledgeSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    all: z.boolean().optional(),
    category: KnowledgeCategorySchema.optional(),
  })
  .refine((val) => Boolean(val.itemId) || val.all === true, {
    message: 'Provide either itemId or all: true',
  });

const gitChangesSchema = z.object({
  baseRef: z.string().optional(),
  targetRef: z.string().optional(),
});

const docStatusSchema = z.object({
  baseRef: z.string().optional(),
});

const previewDocsSchema = z.object({
  depth: z.enum(['overview', 'standard', 'detailed', 'comprehensive']).optional(),
  language: z.string().min(2).optional(),
  audience: z.enum(['technical', 'business', 'all']).optional(),
  includeUnapproved: z.boolean().optional(),
});

const generateDocsSchema = previewDocsSchema.extend({
  outputDir: z.string().optional(),
  authorized: z.boolean().default(false),
  authorizedBy: z.string().optional(),
});

export function createMcpTools(): McpToolDefinition[] {
  return [
    {
      name: 'analyze_repository',
      description: 'Discover repository structure, analyze source files, and ingest knowledge.',
      inputSchema: { type: 'object', properties: {} },
      execute: async (ctx, args) => {
        emptySchema.parse(args);
        const analysis = await ctx.analyze();
        const items = await ctx.knowledgeService.query({});
        await ctx.indexer.indexKnowledgeItems(items);
        await ctx.indexer.indexSymbols(analysis.allSymbols);
        return {
          summary: analysis.summary,
          ingestedKnowledgeCount: items.length,
        };
      },
    },
    {
      name: 'get_project_overview',
      description: 'Return project structure, detected languages, and repository metadata.',
      inputSchema: { type: 'object', properties: {} },
      execute: async (ctx, args) => {
        emptySchema.parse(args);
        const structure = await ctx.discover();
        return {
          name: ctx.config.project.name,
          description: ctx.config.project.description,
          isMonorepo: structure.isMonorepo,
          monorepoType: structure.monorepoType,
          packages: structure.packages,
          detectedLanguages: structure.detectedLanguages,
          totalFiles: structure.totalFiles,
          gitInfo: structure.gitInfo,
        };
      },
    },
    {
      name: 'search_repository',
      description: 'Search indexed code symbols, documentation, and knowledge chunks.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          identifier: { type: 'string' },
          path: { type: 'string' },
          mode: { type: 'string', enum: ['fulltext', 'structural', 'semantic', 'hybrid'] },
          limit: { type: 'number' },
        },
      },
      execute: async (ctx, args) => {
        const parsed = searchRepoSchema.parse(args);
        return ctx.indexer.search(parsed);
      },
    },
    {
      name: 'search_knowledge',
      description: 'Query structured knowledge items by category, text, or approval status.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          searchText: { type: 'string' },
          approvalStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        },
      },
      execute: async (ctx, args) => {
        const parsed = searchKnowledgeSchema.parse(args);
        return ctx.knowledgeService.query(parsed);
      },
    },
    {
      name: 'get_dependency_impact',
      description: 'Analyze transitive impact of modified files across code, knowledge, and docs.',
      inputSchema: {
        type: 'object',
        properties: {
          changedFiles: { type: 'array', items: { type: 'string' } },
        },
        required: ['changedFiles'],
      },
      execute: async (ctx, args) => {
        const parsed = impactSchema.parse(args);
        const graph = await ctx.buildDependencyGraph(false);
        const report = ctx.gitIntelligence.detectOutdatedFromChanges(
          graph,
          parsed.changedFiles.map((f) => ({ path: f, status: 'modified' as const }))
        );
        return report;
      },
    },
    {
      name: 'ask_repository',
      description: 'Retrieve contextual knowledge and code chunks for a question about the project.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['question'],
      },
      execute: async (ctx, args) => {
        const parsed = askSchema.parse(args);
        const contextHits = await ctx.indexer.retrieveContext(parsed.question, {
          limit: parsed.limit ?? 8,
        });
        const session = await ctx.knowledgeService.addQASession(parsed.question);
        return {
          qaSessionId: session.id,
          question: parsed.question,
          retrievedContext: contextHits,
        };
      },
    },
    {
      name: 'register_knowledge',
      description: 'Register a confirmed knowledge item in the persistent knowledge base.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          category: { type: 'string' },
          fileReferences: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content'],
      },
      execute: async (ctx, args) => {
        const parsed = registerKnowledgeSchema.parse(args);
        const now = new Date().toISOString();
        const item = {
          id: crypto.randomUUID().slice(0, 16),
          category: parsed.category,
          title: parsed.title,
          content: parsed.content,
          source: 'mcp-agent',
          fileReferences: parsed.fileReferences,
          symbols: parsed.symbols,
          discoveredAt: now,
          updatedAt: now,
          confidence: 'high' as const,
          provenance: 'confirmed' as const,
          approvalStatus: 'approved' as const,
          relationships: [],
        };
        await ctx.knowledgeRepo.save(item);
        await ctx.indexer.indexKnowledgeItems([item]);
        return item;
      },
    },
    {
      name: 'approve_knowledge',
      description: 'Approve a pending inferred knowledge item by ID, or approve all pending items.',
      inputSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          all: { type: 'boolean' },
          category: { type: 'string' },
        },
      },
      execute: async (ctx, args) => {
        const parsed = approveKnowledgeSchema.parse(args);
        if (parsed.all) {
          const approved = await ctx.knowledgeService.approveAll({ category: parsed.category });
          return { approvedCount: approved.length, results: approved };
        }
        return ctx.knowledgeService.approve(parsed.itemId!);
      },
    },
    {
      name: 'get_pending_knowledge',
      description: 'List knowledge items awaiting user approval.',
      inputSchema: { type: 'object', properties: {} },
      execute: async (ctx, args) => {
        emptySchema.parse(args);
        return ctx.knowledgeService.getPending();
      },
    },
    {
      name: 'analyze_git_changes',
      description: 'Inspect working tree changes or diff between git refs (read-only).',
      inputSchema: {
        type: 'object',
        properties: {
          baseRef: { type: 'string' },
          targetRef: { type: 'string' },
        },
      },
      execute: async (ctx, args) => {
        const parsed = gitChangesSchema.parse(args);
        if (parsed.baseRef) {
          return ctx.gitIntelligence.getDiffBetweenRefs(parsed.baseRef, parsed.targetRef ?? 'HEAD');
        }
        return {
          currentCommit: await ctx.gitIntelligence.getCurrentCommit(),
          workingTreeChanges: await ctx.gitIntelligence.getWorkingTreeChanges(),
        };
      },
    },
    {
      name: 'get_documentation_status',
      description: 'Detect potentially outdated documentation and prepare update proposals.',
      inputSchema: {
        type: 'object',
        properties: { baseRef: { type: 'string' } },
      },
      execute: async (ctx, args) => {
        const parsed = docStatusSchema.parse(args);
        return ctx.detectOutdatedDocumentation(parsed.baseRef);
      },
    },
    {
      name: 'preview_documentation_changes',
      description: 'Generate documentation preview in memory without modifying files on disk.',
      inputSchema: {
        type: 'object',
        properties: {
          depth: { type: 'string', enum: ['overview', 'standard', 'detailed', 'comprehensive'] },
          language: { type: 'string' },
          audience: { type: 'string', enum: ['technical', 'business', 'all'] },
          includeUnapproved: { type: 'boolean' },
        },
      },
      execute: async (ctx, args) => {
        const parsed = previewDocsSchema.parse(args);
        return ctx.previewDocumentation(parsed);
      },
    },
    {
      name: 'generate_documentation',
      description:
        'Write generated documentation files to disk. Requires explicit authorization (authorized: true).',
      inputSchema: {
        type: 'object',
        properties: {
          depth: { type: 'string', enum: ['overview', 'standard', 'detailed', 'comprehensive'] },
          language: { type: 'string' },
          audience: { type: 'string', enum: ['technical', 'business', 'all'] },
          includeUnapproved: { type: 'boolean' },
          outputDir: { type: 'string' },
          authorized: { type: 'boolean' },
          authorizedBy: { type: 'string' },
        },
      },
      execute: async (ctx, args) => {
        const parsed = generateDocsSchema.parse(args);
        const outputDir = parsed.outputDir ?? ctx.config.documentation.destination.path;
        const targetDir = path.resolve(ctx.projectRoot, outputDir);

        if (parsed.authorized) {
          ctx.permissions.grantAuthorization({
            id: `mcp-docs-${Date.now()}`,
            operation: 'docs_write',
            targetPaths: [targetDir],
            description: 'Explicit MCP documentation write authorization',
            authorizedAt: new Date().toISOString(),
            authorizedBy: parsed.authorizedBy ?? 'mcp-client',
          });
        }

        return ctx.generateDocumentation({
          depth: parsed.depth,
          language: parsed.language,
          audience: parsed.audience,
          includeUnapproved: parsed.includeUnapproved,
          outputDir,
        });
      },
    },
    {
      name: 'get_project_configuration',
      description: 'Return the resolved non-secret project configuration.',
      inputSchema: { type: 'object', properties: {} },
      execute: async (ctx, args) => {
        emptySchema.parse(args);
        return {
          ...ctx.config,
          ai: {
            provider: ctx.config.ai.provider,
            model: ctx.config.ai.model,
            endpoint: ctx.config.ai.endpoint,
          },
        };
      },
    },
  ];
}
