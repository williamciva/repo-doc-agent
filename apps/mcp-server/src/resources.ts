import { RepoDocContext } from '@repodoc/core';

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: RepoDocContext) => Promise<string>;
}

export function createMcpResources(): McpResourceDefinition[] {
  return [
    {
      uri: 'repodoc://overview',
      name: 'Project Overview',
      description: 'Repository structure, detected languages, and packages.',
      mimeType: 'application/json',
      read: async (ctx) => {
        const structure = await ctx.discover();
        return JSON.stringify(
          {
            project: ctx.config.project,
            isMonorepo: structure.isMonorepo,
            monorepoType: structure.monorepoType,
            packages: structure.packages,
            detectedLanguages: structure.detectedLanguages,
            totalFiles: structure.totalFiles,
            gitInfo: structure.gitInfo,
          },
          null,
          2
        );
      },
    },
    {
      uri: 'repodoc://config',
      name: 'Public Project Configuration',
      description: 'Resolved RepoDocAgent project configuration (secrets redacted).',
      mimeType: 'application/json',
      read: async (ctx) => {
        return JSON.stringify(
          {
            ...ctx.config,
            ai: {
              provider: ctx.config.ai.provider,
              model: ctx.config.ai.model,
              endpoint: ctx.config.ai.endpoint,
            },
          },
          null,
          2
        );
      },
    },
    {
      uri: 'repodoc://knowledge',
      name: 'Project Knowledge Base',
      description: 'All persisted structured knowledge items.',
      mimeType: 'application/json',
      read: async (ctx) => {
        const items = await ctx.knowledgeService.query({});
        return JSON.stringify(items, null, 2);
      },
    },
    {
      uri: 'repodoc://graph',
      name: 'Dependency Graph',
      description: 'Persisted or computed repository dependency graph.',
      mimeType: 'application/json',
      read: async (ctx) => {
        const loaded = await ctx.graphRepo.loadGraph();
        if (loaded.nodes.length > 0) {
          return JSON.stringify(loaded, null, 2);
        }
        const built = await ctx.buildDependencyGraph(false);
        return JSON.stringify(built.toPersisted(), null, 2);
      },
    },
    {
      uri: 'repodoc://docs/status',
      name: 'Documentation Status',
      description: 'Outdated documentation report based on git changes.',
      mimeType: 'application/json',
      read: async (ctx) => {
        const report = await ctx.detectOutdatedDocumentation();
        return JSON.stringify(report, null, 2);
      },
    },
  ];
}
