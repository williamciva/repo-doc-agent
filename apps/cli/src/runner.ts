import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { RepoDocContext } from '@repodoc/core';
import { startStdioMcpServer } from '@repodoc/mcp-server';
import { PermissionDeniedError, SilentLogger, ConsoleLogger, KnowledgeCategory } from '@repodoc/shared';

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export interface RunCliOptions {
  io?: CliIO;
  inMemory?: boolean;
}

const DEFAULT_IO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

const HELP_TEXT = `RepoDocAgent CLI (repodoc)

Usage:
  repodoc <command> [subcommand] [options]

Commands:
  analyze                      Discover files, analyze AST/symbols, ingest knowledge & index
  docs preview                 Preview generated documentation without writing to disk
  docs generate                Write generated documentation to disk (requires --yes)
  docs status                  Detect outdated documentation from git changes
  knowledge list               List knowledge items
  knowledge pending            List knowledge items pending approval
  knowledge approve <id>       Approve a pending knowledge item
  ask <question>               Retrieve contextual knowledge and register a Q&A session
  search <query>               Search indexed symbols, knowledge, and docs
  git changes                  Show working tree changes or diff against --base <ref>
  graph                        Build and inspect repository dependency graph summary
  config show                  Display resolved project configuration
  mcp start                    Start the MCP server over stdio

Options:
  -h, --help                   Show this help message
  -p, --project <path>         Project root directory (default: current directory)
      --json                   Output structured JSON
      --depth <level>          Documentation depth (overview|standard|detailed|comprehensive)
      --language <code>        Documentation language (e.g., en, pt-BR)
      --output <dir>           Output directory for docs generate
      --yes                    Explicitly authorize physical documentation write
      --base <ref>             Git base ref for diff/status comparison
      --mode <mode>            Search mode (fulltext|structural|semantic|hybrid)
      --category <cat>         Knowledge category filter
`;

export async function runCli(argv: string[], options: RunCliOptions = {}): Promise<number> {
  const io = options.io ?? DEFAULT_IO;

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h', default: false },
        project: { type: 'string', short: 'p' },
        json: { type: 'boolean', default: false },
        depth: { type: 'string' },
        language: { type: 'string' },
        output: { type: 'string' },
        yes: { type: 'boolean', default: false },
        base: { type: 'string' },
        mode: { type: 'string' },
        category: { type: 'string' },
      },
    });
  } catch (err) {
    io.stderr(`Argument error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  const { values, positionals } = parsed;
  const cmd = positionals[0];
  const sub = positionals[1];

  if (values.help || !cmd || cmd === 'help') {
    io.stdout(`${HELP_TEXT}\n`);
    return 0;
  }

  const projectRoot = path.resolve(values.project ?? process.cwd());

  if (cmd === 'mcp' && sub === 'start') {
    await startStdioMcpServer(projectRoot);
    return 0;
  }

  const logger = values.json ? new SilentLogger() : new ConsoleLogger('warn');
  const ctx = options.inMemory
    ? await RepoDocContext.createInMemory(projectRoot, logger)
    : await RepoDocContext.create({ projectRoot, logger });

  try {
    return await dispatchCommand(ctx, positionals, values, io);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      io.stderr(`Permission denied: ${error.message}\n`);
      return 2;
    }
    io.stderr(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  } finally {
    ctx.close();
  }
}

async function dispatchCommand(
  ctx: RepoDocContext,
  positionals: string[],
  values: {
    json?: boolean;
    depth?: string;
    language?: string;
    output?: string;
    yes?: boolean;
    base?: string;
    mode?: string;
    category?: string;
  },
  io: CliIO
): Promise<number> {
  const [cmd, sub, arg2] = positionals;
  const emit = (data: unknown, humanText: string): void => {
    if (values.json) {
      io.stdout(`${JSON.stringify(data, null, 2)}\n`);
    } else {
      io.stdout(`${humanText}\n`);
    }
  };

  if (cmd === 'config' && sub === 'show') {
    const safeConfig = {
      ...ctx.config,
      ai: {
        provider: ctx.config.ai.provider,
        model: ctx.config.ai.model,
        endpoint: ctx.config.ai.endpoint,
      },
    };
    emit(
      safeConfig,
      `Project: ${safeConfig.project.name} | Language: ${safeConfig.documentation.language} | Depth: ${safeConfig.documentation.depth}`
    );
    return 0;
  }

  if (cmd === 'analyze') {
    const analysis = await ctx.analyze();
    const items = await ctx.knowledgeService.query({});
    await ctx.indexer.indexKnowledgeItems(items);
    await ctx.indexer.indexSymbols(analysis.allSymbols);

    const summary = {
      filesAnalyzed: analysis.summary.totalFilesAnalyzed,
      symbolsDiscovered: analysis.summary.totalSymbols,
      knowledgeItems: items.length,
    };
    emit(
      summary,
      `Analyzed ${summary.filesAnalyzed} files, discovered ${summary.symbolsDiscovered} symbols, indexed ${summary.knowledgeItems} knowledge items.`
    );
    return 0;
  }

  if (cmd === 'docs') {
    const depth = values.depth as
      | 'overview'
      | 'standard'
      | 'detailed'
      | 'comprehensive'
      | undefined;

    if (sub === 'preview') {
      const res = await ctx.previewDocumentation({
        depth,
        language: values.language,
      });
      emit(
        res,
        `Preview (${res.language}, ${res.depth}): ${res.documents.map((d) => d.relativePath).join(', ')}`
      );
      return 0;
    }

    if (sub === 'generate') {
      const outputDir = values.output ?? ctx.config.documentation.destination.path;
      if (values.yes) {
        const targetDir = path.resolve(ctx.projectRoot, outputDir);
        ctx.permissions.grantAuthorization({
          id: `cli-docs-${Date.now()}`,
          operation: 'docs_write',
          targetPaths: [targetDir],
          description: 'Explicit CLI --yes documentation write authorization',
          authorizedAt: new Date().toISOString(),
          authorizedBy: 'cli-user',
        });
      }

      const res = await ctx.generateDocumentation({
        depth,
        language: values.language,
        outputDir,
      });
      emit(res, `Generated ${res.writtenPaths.length} file(s):\n${res.writtenPaths.join('\n')}`);
      return 0;
    }

    if (sub === 'status') {
      const report = await ctx.detectOutdatedDocumentation(values.base);
      emit(
        report,
        `Outdated: ${report.isOutdated} | Changed files: ${report.changedFiles.length} | Proposals: ${report.updateProposals.length}`
      );
      return 0;
    }
  }

  if (cmd === 'knowledge') {
    if (sub === 'list') {
      const items = await ctx.knowledgeService.query({
        category: values.category as KnowledgeCategory | undefined,
      });
      emit(items, `Knowledge items (${items.length}):\n${items.map((i) => `- [${i.approvalStatus}] ${i.id}: ${i.title}`).join('\n')}`);
      return 0;
    }
    if (sub === 'pending') {
      const pending = await ctx.knowledgeService.getPending();
      emit(pending, `Pending items (${pending.length}):\n${pending.map((i) => `- ${i.id}: ${i.title}`).join('\n')}`);
      return 0;
    }
    if (sub === 'approve' && arg2) {
      const result = await ctx.knowledgeService.approve(arg2);
      emit(result, `Approved ${result.itemId} (${result.previousStatus} -> ${result.newStatus})`);
      return 0;
    }
  }

  if (cmd === 'ask' && sub) {
    const contextHits = await ctx.indexer.retrieveContext(sub);
    const session = await ctx.knowledgeService.addQASession(sub);
    const payload = { qaSessionId: session.id, question: sub, contextHits };
    emit(payload, `Q&A Session ${session.id}: ${contextHits.length} relevant context chunk(s) found.`);
    return 0;
  }

  if (cmd === 'search' && sub) {
    const mode = values.mode as 'fulltext' | 'structural' | 'semantic' | 'hybrid' | undefined;
    const results = await ctx.indexer.search({ text: sub, mode });
    emit(results, `Search results (${results.length}):\n${results.map((r) => `- [${r.matchType}] ${r.chunk.title}`).join('\n')}`);
    return 0;
  }

  if (cmd === 'git' && sub === 'changes') {
    const data = values.base
      ? await ctx.gitIntelligence.getDiffBetweenRefs(values.base)
      : await ctx.gitIntelligence.getWorkingTreeChanges();
    emit(data, JSON.stringify(data, null, 2));
    return 0;
  }

  if (cmd === 'graph') {
    const graph = await ctx.buildDependencyGraph(true);
    const persisted = graph.toPersisted();
    const summary = { nodes: persisted.nodes.length, edges: persisted.edges.length };
    emit(summary, `Dependency Graph: ${summary.nodes} nodes, ${summary.edges} edges.`);
    return 0;
  }

  io.stderr(`Unknown command: '${positionals.join(' ')}'. Run 'repodoc --help' for usage.\n`);
  return 1;
}
