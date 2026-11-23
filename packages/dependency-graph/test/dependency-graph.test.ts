import { describe, it, expect } from 'vitest';
import { GraphRepository, MigrationManager, SqliteDatabaseConnection } from '@repodoc/persistence';
import { KnowledgeItem } from '@repodoc/shared';
import { ProjectStructure } from '@repodoc/repository';
import { AnalysisResult } from '@repodoc/analyzer';
import { GeneratedDocument } from '@repodoc/documentation';
import { DependencyGraph } from '../src/graph.js';
import { GraphBuilder } from '../src/builder.js';
import { ImpactAnalyzer } from '../src/impact-analyzer.js';

function makeSampleData() {
  const structure: ProjectStructure = {
    rootPath: '/repo',
    isMonorepo: true,
    monorepoType: 'pnpm',
    packages: [
      { name: 'pkg-core', path: '/repo/packages/core', relativePath: 'packages/core' },
    ],
    detectedLanguages: { typescript: { fileCount: 2, totalBytes: 400 } },
    totalFiles: 2,
    totalBytes: 400,
    configFiles: [],
    gitInfo: { isGitRepo: true, currentBranch: 'main' },
    files: [
      {
        path: '/repo/packages/core/src/model.ts',
        relativePath: 'packages/core/src/model.ts',
        language: 'typescript',
        extension: '.ts',
        sizeBytes: 200,
        hash: 'h1',
        lastModified: new Date().toISOString(),
        isBinary: false,
      },
      {
        path: '/repo/packages/core/src/service.ts',
        relativePath: 'packages/core/src/service.ts',
        language: 'typescript',
        extension: '.ts',
        sizeBytes: 200,
        hash: 'h2',
        lastModified: new Date().toISOString(),
        isBinary: false,
      },
    ],
  };

  const analysis: AnalysisResult = {
    parsedFiles: [
      {
        filePath: '/repo/packages/core/src/model.ts',
        language: 'typescript',
        symbols: [
          {
            id: 'model#UserEntity',
            name: 'UserEntity',
            kind: 'interface',
            filePath: '/repo/packages/core/src/model.ts',
            lineStart: 1,
            lineEnd: 5,
            isExported: true,
          },
        ],
        imports: [],
        exports: [],
        dependencies: [],
        parserUsed: 'typescript',
      },
      {
        filePath: '/repo/packages/core/src/service.ts',
        language: 'typescript',
        symbols: [
          {
            id: 'service#UserService',
            name: 'UserService',
            kind: 'class',
            filePath: '/repo/packages/core/src/service.ts',
            lineStart: 1,
            lineEnd: 20,
            isExported: true,
          },
        ],
        imports: [
          {
            source: './model.js',
            importedSymbols: ['UserEntity'],
            isDefault: false,
            isNamespace: false,
            line: 1,
          },
        ],
        exports: [],
        dependencies: ['./model.js'],
        parserUsed: 'typescript',
      },
    ],
    allSymbols: [],
    moduleGraph: {},
    summary: {
      totalFilesAnalyzed: 2,
      totalSymbols: 2,
      symbolsByKind: {
        class: 1,
        interface: 1,
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
      id: 'k-service',
      category: 'components',
      title: 'UserService',
      content: 'Handles user domain operations.',
      source: 'packages/core/src/service.ts',
      fileReferences: ['packages/core/src/service.ts'],
      symbols: ['UserService'],
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
      sourceItemIds: ['k-service'],
      generatedAt: now,
      language: 'en',
      depth: 'detailed',
    },
  ];

  return { structure, analysis, knowledgeItems, documents };
}

describe('DependencyGraph & ImpactAnalyzer', () => {
  it('should trace transitive impact from modified entity file to dependent service, knowledge and document', () => {
    const data = makeSampleData();
    const builder = new GraphBuilder();
    const graph = builder.build(data);

    const analyzer = new ImpactAnalyzer();
    const report = analyzer.analyzeImpact(graph, ['packages/core/src/model.ts']);

    expect(report.impactedFiles).toContain('packages/core/src/model.ts');
    expect(report.impactedFiles).toContain('packages/core/src/service.ts');
    expect(report.impactedSymbols).toContain('UserEntity');
    expect(report.impactedSymbols).toContain('UserService');
    expect(report.impactedKnowledgeIds).toContain('k-service');
    expect(report.impactedDocuments).toContain('technical/COMPONENTS.md');
  });

  it('should persist and reload dependency graph in SQLite', async () => {
    const data = makeSampleData();
    const graph = new GraphBuilder().build(data);

    const db = new SqliteDatabaseConnection({ path: ':memory:' });
    new MigrationManager(db).runMigrations();
    const repo = new GraphRepository(db);

    const persisted = graph.toPersisted();
    await repo.saveGraph(persisted.nodes, persisted.edges);

    const loaded = await repo.loadGraph();
    const restored = DependencyGraph.fromPersisted(loaded);

    expect(restored.getAllNodes().length).toBe(graph.getAllNodes().length);
    expect(restored.getAllEdges().length).toBe(graph.getAllEdges().length);
  });
});
