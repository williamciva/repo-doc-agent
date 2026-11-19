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
    expect(context.knowledge).toBeDefined();

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

    await context.knowledge.save(item);
    const retrieved = await context.knowledge.findById('core-item-1');
    expect(retrieved?.title).toBe('Monorepo Core Foundation');
  });
});
