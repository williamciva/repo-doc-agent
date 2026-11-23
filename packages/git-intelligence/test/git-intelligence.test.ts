import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '@repodoc/dependency-graph';
import { KnowledgeItem } from '@repodoc/shared';
import { ProjectStructure } from '@repodoc/repository';
import { AnalysisResult } from '@repodoc/analyzer';
import { GeneratedDocument } from '@repodoc/documentation';
import { GitDiffAnalyzer, assertSafeGitRef } from '../src/diff-analyzer.js';
import { GitIntelligenceEngine } from '../src/engine.js';

function makeGraph() {
  const structure: ProjectStructure = {
    rootPath: '/repo',
    isMonorepo: false,
    packages: [],
    detectedLanguages: { typescript: { fileCount: 2, totalBytes: 200 } },
    totalFiles: 2,
    totalBytes: 200,
    configFiles: [],
    gitInfo: { isGitRepo: true, currentBranch: 'main' },
    files: [
      {
        path: '/repo/src/entity.ts',
        relativePath: 'src/entity.ts',
        language: 'typescript',
        extension: '.ts',
        sizeBytes: 100,
        hash: 'h1',
        lastModified: new Date().toISOString(),
        isBinary: false,
      },
      {
        path: '/repo/src/controller.ts',
        relativePath: 'src/controller.ts',
        language: 'typescript',
        extension: '.ts',
        sizeBytes: 100,
        hash: 'h2',
        lastModified: new Date().toISOString(),
        isBinary: false,
      },
    ],
  };

  const analysis: AnalysisResult = {
    parsedFiles: [
      {
        filePath: '/repo/src/entity.ts',
        language: 'typescript',
        symbols: [],
        imports: [],
        exports: [],
        dependencies: [],
        parserUsed: 'typescript',
      },
      {
        filePath: '/repo/src/controller.ts',
        language: 'typescript',
        symbols: [],
        imports: [
          {
            source: './entity.js',
            importedSymbols: ['Entity'],
            isDefault: false,
            isNamespace: false,
            line: 1,
          },
        ],
        exports: [],
        dependencies: ['./entity.js'],
        parserUsed: 'typescript',
      },
    ],
    allSymbols: [],
    moduleGraph: {},
    summary: {
      totalFilesAnalyzed: 2,
      totalSymbols: 0,
      symbolsByKind: {
        class: 0,
        interface: 0,
        function: 0,
        method: 0,
        type_alias: 0,
        enum: 0,
        variable: 0,
        constant: 0,
      },
      externalDependencies: [],
      internalDependencies: [],
    },
  };

  const now = new Date().toISOString();
  const knowledgeItems: KnowledgeItem[] = [
    {
      id: 'k-ctrl',
      category: 'components',
      title: 'Controller',
      content: 'Exposes API.',
      source: 'src/controller.ts',
      fileReferences: ['src/controller.ts'],
      symbols: [],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'high',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [],
    },
  ];

  const documents: GeneratedDocument[] = [
    {
      relativePath: 'technical/COMPONENTS.md',
      title: 'Components',
      audience: 'technical',
      content: '# Components',
      sections: [],
      sourceItemIds: ['k-ctrl'],
      generatedAt: now,
      language: 'en',
      depth: 'detailed',
    },
  ];

  return new GraphBuilder().build({ structure, analysis, knowledgeItems, documents });
}

describe('GitIntelligenceEngine', () => {
  it('should reject unsafe git refs to prevent flag injection', () => {
    expect(() => assertSafeGitRef('--exec=evil')).toThrow();
    expect(() => assertSafeGitRef('HEAD; rm -rf /')).toThrow();
    expect(assertSafeGitRef('HEAD~1')).toBe('HEAD~1');
    expect(assertSafeGitRef('main')).toBe('main');
  });

  it('should parse porcelain status and diff outputs accurately', () => {
    const analyzer = new GitDiffAnalyzer(process.cwd());

    const status = analyzer.parsePorcelainStatus(
      ' M packages/core/src/context.ts\n?? new-file.ts\nR  old.ts -> new.ts\n'
    );
    expect(status).toHaveLength(3);
    expect(status[0]).toEqual({ path: 'packages/core/src/context.ts', previousPath: undefined, status: 'modified' });
    expect(status[1]).toEqual({ path: 'new-file.ts', previousPath: undefined, status: 'untracked' });
    expect(status[2]).toEqual({ path: 'new.ts', previousPath: 'old.ts', status: 'renamed' });

    const nameStatus = analyzer.parseDiffNameStatus('A\tsrc/a.ts\nM\tsrc/b.ts\nD\tsrc/c.ts\n');
    expect(nameStatus.map((f) => f.status)).toEqual(['added', 'modified', 'deleted']);

    const numstat = analyzer.parseDiffNumstat('10\t2\tsrc/a.ts\n-\t-\tbin.png\n');
    expect(numstat.get('src/a.ts')).toEqual({ additions: 10, deletions: 2 });
    expect(numstat.get('bin.png')).toEqual({ additions: 0, deletions: 0 });
  });

  it('should detect outdated documents and generate prioritized update proposals', () => {
    const graph = makeGraph();
    const engine = new GitIntelligenceEngine({ projectRoot: '/repo' });

    // Transitive change: entity.ts -> controller.ts -> k-ctrl -> COMPONENTS.md
    const transitiveReport = engine.detectOutdatedFromChanges(graph, [
      { path: 'src/entity.ts', status: 'modified' },
    ]);
    expect(transitiveReport.isOutdated).toBe(true);
    expect(transitiveReport.outdatedDocuments).toContain('technical/COMPONENTS.md');
    expect(transitiveReport.updateProposals[0]?.priority).toBe('medium');

    // Direct change: controller.ts -> k-ctrl -> COMPONENTS.md
    const directReport = engine.detectOutdatedFromChanges(graph, [
      { path: 'src/controller.ts', status: 'modified' },
    ]);
    expect(directReport.isOutdated).toBe(true);
    expect(directReport.updateProposals[0]?.priority).toBe('high');
  });

  it('should read recent commits from the current git repository', async () => {
    const engine = new GitIntelligenceEngine({ projectRoot: process.cwd() });
    const head = await engine.getCurrentCommit();
    const commits = await engine.getRecentCommits(3);

    expect(head).toBeTruthy();
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]?.hash).toBeTruthy();
  });
});
