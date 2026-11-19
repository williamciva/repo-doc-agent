import { describe, it, expect } from 'vitest';
import { KnowledgeItemSchema } from '../src/schemas/knowledge.js';
import { RepoDocError, PermissionDeniedError } from '../src/types/errors.js';

describe('Knowledge schemas and errors', () => {
  it('should validate a valid KnowledgeItem', () => {
    const item = {
      id: 'item-1',
      category: 'architecture',
      title: 'Repository Engine Overview',
      content: 'Discovers file structure and detected technologies.',
      source: 'src/engine.ts',
      fileReferences: ['src/engine.ts'],
      symbols: ['RepositoryEngine'],
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'high',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [
        {
          targetId: 'item-2',
          type: 'depends_on',
          description: 'Uses SQLite persistence',
        },
      ],
    };

    const parsed = KnowledgeItemSchema.parse(item);
    expect(parsed.id).toBe('item-1');
    expect(parsed.provenance).toBe('confirmed');
    expect(parsed.category).toBe('architecture');
  });

  it('should reject invalid provenance', () => {
    const invalidItem = {
      id: 'item-1',
      category: 'architecture',
      title: 'Test',
      content: 'Content',
      source: 'test.ts',
      discoveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 'high',
      provenance: 'unverified', // invalid
      approvalStatus: 'pending',
    };

    expect(() => KnowledgeItemSchema.parse(invalidItem)).toThrow();
  });

  it('should instantiate custom errors with correct codes', () => {
    const err = new PermissionDeniedError('Cannot write file', { path: '/tmp/test' });
    expect(err).toBeInstanceOf(RepoDocError);
    expect(err.code).toBe('PERMISSION_DENIED');
    expect(err.message).toBe('Cannot write file');
    expect(err.details).toEqual({ path: '/tmp/test' });
  });
});
