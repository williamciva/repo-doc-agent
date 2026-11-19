import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteDatabaseConnection } from '../src/sqlite-connection.js';
import { MigrationManager } from '../src/migrator.js';
import { KnowledgeRepository } from '../src/repositories/knowledge-repository.js';
import { KnowledgeItem } from '@repodoc/shared';

describe('Persistence Engine (SQLite)', () => {
  let db: SqliteDatabaseConnection;
  let repo: KnowledgeRepository;

  beforeEach(() => {
    db = new SqliteDatabaseConnection({ path: ':memory:' });
    const migrator = new MigrationManager(db);
    migrator.runMigrations();
    repo = new KnowledgeRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should run migrations idempotently', () => {
    const migrator = new MigrationManager(db);
    expect(() => migrator.runMigrations()).not.toThrow();
  });

  it('should save, retrieve and relate knowledge items', async () => {
    const itemA: KnowledgeItem = {
      id: 'item-core',
      category: 'architecture',
      title: 'Core Engine',
      content: 'Central orchestration engine.',
      source: 'src/core.ts',
      fileReferences: ['src/core.ts'],
      symbols: ['CoreEngine'],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'high',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [],
    };

    const itemB: KnowledgeItem = {
      id: 'item-config',
      category: 'configurations',
      title: 'Configuration Loader',
      content: 'Loads .repodoc configuration.',
      source: 'src/config.ts',
      fileReferences: ['src/config.ts'],
      symbols: ['loadConfig'],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'certain',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [
        {
          targetId: 'item-core',
          type: 'depends_on',
          description: 'Required by Core Engine',
        },
      ],
    };

    await repo.save(itemA);
    await repo.save(itemB);

    const retrieved = await repo.findById('item-config');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('item-config');
    expect(retrieved?.relationships).toHaveLength(1);
    expect(retrieved?.relationships[0]?.targetId).toBe('item-core');
    expect(retrieved?.relationships[0]?.type).toBe('depends_on');
  });

  it('should query pending knowledge and update approval status', async () => {
    const pendingItem: KnowledgeItem = {
      id: 'item-inferred-1',
      category: 'business_rules',
      title: 'Inferred Discount Rule',
      content: 'Customer discount calculated based on volume.',
      source: 'src/discount.ts',
      fileReferences: ['src/discount.ts'],
      symbols: ['calculateDiscount'],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'medium',
      provenance: 'inferred',
      approvalStatus: 'pending',
      relationships: [],
    };

    await repo.save(pendingItem);

    const pendingList = await repo.findPendingApproval();
    expect(pendingList).toHaveLength(1);
    expect(pendingList[0]?.id).toBe('item-inferred-1');

    await repo.updateApprovalStatus('item-inferred-1', 'approved');

    const updated = await repo.findById('item-inferred-1');
    expect(updated?.approvalStatus).toBe('approved');

    const remainingPending = await repo.findPendingApproval();
    expect(remainingPending).toHaveLength(0);
  });
});
