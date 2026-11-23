import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeIngestor } from '../src/ingestor.js';
import { AnalysisResult } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';

function makeMockStructure(): ProjectStructure {
  return {
    rootPath: '/workspace',
    isMonorepo: true,
    monorepoType: 'pnpm',
    packages: [
      { name: 'pkg-a', relativePath: 'packages/pkg-a', absolutePath: '/workspace/packages/pkg-a' },
    ],
    totalFiles: 10,
    detectedLanguages: {
      typescript: { fileCount: 10, extensions: ['.ts'] },
    },
    gitInfo: { isGitRepo: true, currentBranch: 'main', lastCommitHash: 'abc123' },
    excludedPaths: [],
  };
}

function makeMockAnalysis(): AnalysisResult {
  return {
    parsedFiles: [
      {
        filePath: '/workspace/packages/pkg-a/src/index.ts',
        language: 'typescript',
        symbols: [
          {
            id: '/workspace/packages/pkg-a/src/index.ts#MyClass',
            name: 'MyClass',
            kind: 'class',
            filePath: '/workspace/packages/pkg-a/src/index.ts',
            lineStart: 1,
            lineEnd: 20,
            isExported: true,
            docstring: 'A sample class',
            visibility: 'public',
          },
          {
            id: '/workspace/packages/pkg-a/src/index.ts#helperFn',
            name: 'helperFn',
            kind: 'function',
            filePath: '/workspace/packages/pkg-a/src/index.ts',
            lineStart: 22,
            lineEnd: 30,
            isExported: false, // should be skipped
          },
        ],
        dependencies: ['some-lib'],
        parseErrors: [],
      },
    ],
    summary: {
      totalFiles: 1,
      totalSymbols: 2,
      byLanguage: { typescript: 1 },
      externalDependencies: ['some-lib'],
      parseErrors: 0,
      analysisTimeMs: 10,
    },
    moduleDependencies: {},
  };
}

describe('KnowledgeIngestor', () => {
  let ingestor: KnowledgeIngestor;

  beforeEach(() => {
    ingestor = new KnowledgeIngestor();
  });

  it('should produce at least one item from a monorepo structure', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    expect(items.length).toBeGreaterThan(0);
  });

  it('should produce an architecture overview item', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const arch = items.find((i) => i.category === 'architecture');
    expect(arch).toBeDefined();
    expect(arch?.title).toBe('Project Architecture Overview');
    expect(arch?.content).toContain('Monorepo');
  });

  it('should produce module items for each package in a monorepo', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const modules = items.filter((i) => i.category === 'modules');
    expect(modules.length).toBe(1);
    expect(modules[0]?.title).toContain('pkg-a');
  });

  it('should produce dependency items when external deps exist', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const deps = items.find((i) => i.category === 'dependencies');
    expect(deps).toBeDefined();
    expect(deps?.content).toContain('some-lib');
  });

  it('should only ingest exported symbols', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const fnItem = items.find((i) => i.title.includes('helperFn'));
    expect(fnItem).toBeUndefined();
  });

  it('should map exported class to components category with relative paths', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const classItem = items.find((i) => i.title.includes('MyClass'));
    expect(classItem).toBeDefined();
    expect(classItem?.category).toBe('components');
    expect(classItem?.source).toBe('packages/pkg-a/src/index.ts');
    expect(classItem?.fileReferences).toEqual(['packages/pkg-a/src/index.ts']);
    expect(classItem?.content).toContain('Defined in: packages/pkg-a/src/index.ts');
    expect(classItem?.content).not.toContain('/workspace/');
  });

  it('should use inferred provenance from options', () => {
    const items = ingestor.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure(), {
      provenance: 'inferred',
    });
    expect(items.every((i) => i.provenance === 'inferred')).toBe(true);
    expect(items.every((i) => i.approvalStatus === 'pending')).toBe(true);
  });
});
