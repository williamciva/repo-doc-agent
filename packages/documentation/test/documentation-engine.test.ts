import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PermissionsEngine } from '@repodoc/permissions';
import { KnowledgeItem, PermissionDeniedError } from '@repodoc/shared';
import { ProjectStructure } from '@repodoc/repository';
import { AnalysisResult } from '@repodoc/analyzer';
import { DocumentationEngine } from '../src/engine.js';
import { DocumentationInput } from '../src/types.js';

function makeInput(): DocumentationInput {
  const structure: ProjectStructure = {
    rootPath: '/workspace',
    isMonorepo: true,
    monorepoType: 'pnpm',
    packages: [
      { name: '@repodoc/shared', path: '/workspace/packages/shared', relativePath: 'packages/shared' },
      { name: '@repodoc/core', path: '/workspace/packages/core', relativePath: 'packages/core' },
    ],
    totalFiles: 12,
    totalBytes: 2048,
    configFiles: [],
    files: [],
    detectedLanguages: { typescript: { fileCount: 12, totalBytes: 2048 } },
    gitInfo: { isGitRepo: true, currentBranch: 'main' },
  };

  const analysis: AnalysisResult = {
    parsedFiles: [],
    allSymbols: [],
    moduleGraph: {
      '@repodoc/core': ['@repodoc/shared'],
    },
    summary: {
      totalFilesAnalyzed: 12,
      totalSymbols: 24,
      symbolsByKind: {
        class: 2,
        interface: 4,
        function: 10,
        method: 6,
        type_alias: 2,
        enum: 0,
        variable: 0,
        constant: 0,
      },
      externalDependencies: ['zod'],
      internalDependencies: ['@repodoc/shared'],
    },
  };

  const now = new Date().toISOString();
  const baseItem = {
    source: 'packages/core/src/context.ts',
    fileReferences: ['packages/core/src/context.ts'],
    symbols: ['RepoDocContext'],
    discoveredAt: now,
    updatedAt: now,
    confidence: 'high' as const,
    provenance: 'confirmed' as const,
    approvalStatus: 'approved' as const,
    relationships: [],
  };

  const knowledgeItems: KnowledgeItem[] = [
    {
      ...baseItem,
      id: 'arch-1',
      category: 'architecture',
      title: 'Project Architecture Overview',
      content: 'Modular monorepo architecture.',
      fileReferences: [],
      symbols: [],
    },
    {
      ...baseItem,
      id: 'mod-1',
      category: 'modules',
      title: 'Module: @repodoc/core',
      content: 'Orchestrates all engines.',
      fileReferences: ['packages/core/package.json'],
    },
    {
      ...baseItem,
      id: 'comp-1',
      category: 'components',
      title: 'Class: RepoDocContext',
      content: 'Central execution context.',
    },
    {
      ...baseItem,
      id: 'rule-1',
      category: 'business_rules',
      title: 'Explicit Write Authorization',
      content: 'No file mutation without explicit user authorization.',
    },
    {
      ...baseItem,
      id: 'pending-1',
      category: 'observations',
      title: 'Unapproved Observation',
      content: 'Should not appear when includeUnapproved is false.',
      provenance: 'inferred',
      approvalStatus: 'pending',
    },
  ];

  return { structure, analysis, knowledgeItems };
}

describe('DocumentationEngine', () => {
  let tmpDir: string;
  let permissions: PermissionsEngine;
  let engine: DocumentationEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repodoc-docs-test-'));
    permissions = new PermissionsEngine({ allowedRoot: tmpDir });
    engine = new DocumentationEngine({ projectRoot: tmpDir, permissions });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should generate different document sets based on depth level', () => {
    const input = makeInput();

    const overview = engine.preview(input, { projectName: 'RepoDoc', depth: 'overview' });
    expect(overview.documents.map((d) => d.relativePath)).toEqual([
      'technical/OVERVIEW.md',
      'business/BUSINESS_OVERVIEW.md',
    ]);

    const standard = engine.preview(input, { projectName: 'RepoDoc', depth: 'standard' });
    expect(standard.documents.map((d) => d.relativePath)).toEqual([
      'technical/OVERVIEW.md',
      'technical/ARCHITECTURE.md',
      'business/BUSINESS_OVERVIEW.md',
    ]);

    const detailed = engine.preview(input, { projectName: 'RepoDoc', depth: 'detailed' });
    expect(detailed.documents.map((d) => d.relativePath)).toEqual([
      'technical/OVERVIEW.md',
      'technical/ARCHITECTURE.md',
      'technical/COMPONENTS.md',
      'business/BUSINESS_OVERVIEW.md',
      'business/BUSINESS_RULES.md',
    ]);

    const comprehensive = engine.preview(input, { projectName: 'RepoDoc', depth: 'comprehensive' });
    expect(comprehensive.documents.map((d) => d.relativePath)).toEqual([
      'technical/OVERVIEW.md',
      'technical/ARCHITECTURE.md',
      'technical/COMPONENTS.md',
      'technical/FLOWS_AND_RULES.md',
      'business/BUSINESS_OVERVIEW.md',
      'business/BUSINESS_RULES.md',
    ]);
  });

  it('should respect configured language while preserving technical identifiers', () => {
    const input = makeInput();
    const res = engine.preview(input, {
      projectName: 'RepoDoc',
      language: 'pt-BR',
      depth: 'detailed',
    });

    const overview = res.documents.find((d) => d.relativePath === 'technical/OVERVIEW.md');
    const components = res.documents.find((d) => d.relativePath === 'technical/COMPONENTS.md');

    expect(overview?.content).toContain('Visão Geral do Projeto');
    expect(overview?.content).toContain('Rastreabilidade');
    expect(components?.content).toContain('Class: RepoDocContext');
  });

  it('should include traceability IDs and exclude unapproved items by default', () => {
    const input = makeInput();

    const res = engine.preview(input, { projectName: 'RepoDoc', depth: 'detailed' });
    const archDoc = res.documents.find((d) => d.relativePath === 'technical/ARCHITECTURE.md');
    const bizDoc = res.documents.find((d) => d.relativePath === 'business/BUSINESS_OVERVIEW.md');

    expect(archDoc?.sourceItemIds).toContain('mod-1');
    expect(archDoc?.content).toContain('<!-- traceability: mod-1 -->');
    expect(bizDoc?.content).not.toContain('Unapproved Observation');

    const resWithUnapproved = engine.preview(input, {
      projectName: 'RepoDoc',
      depth: 'detailed',
      includeUnapproved: true,
    });
    const bizWithUnapproved = resWithUnapproved.documents.find(
      (d) => d.relativePath === 'business/BUSINESS_OVERVIEW.md'
    );
    expect(bizWithUnapproved?.content).toContain('Unapproved Observation');
  });

  it('should refuse physical write without explicit docs_write authorization', async () => {
    const input = makeInput();

    await expect(
      engine.generate(input, { projectName: 'RepoDoc', depth: 'overview', outputDir: './docs' })
    ).rejects.toThrow(PermissionDeniedError);
  });

  it('should write documents to disk when docs_write authorization is granted', async () => {
    const input = makeInput();
    const docsDir = path.join(tmpDir, 'docs');

    permissions.grantAuthorization({
      id: 'auth-docs-1',
      operation: 'docs_write',
      targetPaths: [docsDir],
      description: 'Authorize test documentation output',
      authorizedAt: new Date().toISOString(),
      authorizedBy: 'test-user',
    });

    const result = await engine.generate(input, {
      projectName: 'RepoDoc',
      depth: 'overview',
      outputDir: './docs',
    });

    expect(result.previewOnly).toBe(false);
    expect(result.writtenPaths).toHaveLength(2);

    for (const writtenPath of result.writtenPaths) {
      const content = await fs.readFile(writtenPath, 'utf-8');
      expect(content).toContain('RepoDoc');
    }
  });
});
