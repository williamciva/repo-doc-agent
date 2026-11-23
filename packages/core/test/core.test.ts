import { describe, it, expect, afterEach } from 'vitest';
import { RepoDocContext } from '../src/context.js';
import { KnowledgeItem } from '@repodoc/shared';

describe('RepoDoc Core Context', () => {
  let context: RepoDocContext;

  afterEach(() => {
    if (context) {
      context.close();
    }
  });

  it('should initialize in-memory context with configuration and permissions', async () => {
    context = await RepoDocContext.createInMemory(process.cwd());

    expect(context.config.project.name).toBe('repo-doc-agent');
    expect(context.config.documentation.language).toBe('en');
    expect(context.permissions).toBeDefined();
    expect(context.knowledgeRepo).toBeDefined();
    expect(context.graphRepo).toBeDefined();
    expect(context.knowledgeService).toBeDefined();
    expect(context.documentation).toBeDefined();
    expect(context.gitIntelligence).toBeDefined();
    expect(context.repository).toBeDefined();
    expect(context.analyzer).toBeDefined();

    // Verify discovery and analysis through context
    const structure = await context.discover();
    expect(structure.isMonorepo).toBe(true);
    expect(structure.totalFiles).toBeGreaterThan(5);

    const analysis = await context.analyze();
    expect(analysis.parsedFiles.length).toBeGreaterThan(0);
    expect(analysis.allSymbols.length).toBeGreaterThan(0);
    expect(analysis.summary.totalSymbols).toBeGreaterThan(0);

    // Verify knowledge repository works inside context
    const item: KnowledgeItem = {
      id: 'core-item-1',
      category: 'architecture',
      title: 'Monorepo Core Foundation',
      content: 'Phase 1 Foundation bootstrap complete.',
      source: 'packages/core/src/context.ts',
      fileReferences: ['packages/core/src/context.ts'],
      symbols: ['RepoDocContext'],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'certain',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [],
    };

    await context.knowledgeRepo.save(item);
    const retrieved = await context.knowledgeRepo.findById('core-item-1');
    expect(retrieved?.title).toBe('Monorepo Core Foundation');

    // Verify documentation preview works through context
    const docPreview = await context.previewDocumentation({ depth: 'overview' });
    expect(docPreview.previewOnly).toBe(true);
    expect(docPreview.documents.length).toBeGreaterThanOrEqual(2);
    expect(docPreview.language).toBe('en');
  });
});
