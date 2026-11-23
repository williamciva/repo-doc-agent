import { describe, it, expect, beforeEach } from 'vitest';
import {
  MigrationManager,
  SearchIndexRepository,
  SqliteDatabaseConnection,
} from '@repodoc/persistence';
import { KnowledgeItem } from '@repodoc/shared';
import { SymbolInfo } from '@repodoc/analyzer';
import { GeneratedDocument } from '@repodoc/documentation';
import { TextChunker } from '../src/chunker.js';
import { IndexerEngine } from '../src/engine.js';
import { EmbeddingProvider, RerankerProvider, SearchResultItem } from '../src/types.js';

function makeMockItems(): KnowledgeItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'k-1',
      category: 'architecture',
      title: 'SQLite Persistence Layer',
      content: 'Uses better-sqlite3 with FTS5 full-text indexing.',
      source: 'packages/persistence/src/sqlite-connection.ts',
      fileReferences: ['packages/persistence/src/sqlite-connection.ts'],
      symbols: ['SqliteDatabaseConnection'],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'certain',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: [],
    },
    {
      id: 'k-2',
      category: 'business_rules',
      title: 'Authorization Boundary',
      content: 'Every physical file write requires explicit user authorization.',
      source: 'packages/permissions/src/engine.ts',
      fileReferences: ['packages/permissions/src/engine.ts'],
      symbols: ['PermissionsEngine'],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'high',
      provenance: 'inferred',
      approvalStatus: 'pending',
      relationships: [],
    },
  ];
}

function makeMockSymbols(): SymbolInfo[] {
  return [
    {
      id: 'sym-1',
      name: 'PermissionsEngine',
      kind: 'class',
      filePath: 'packages/permissions/src/engine.ts',
      lineStart: 10,
      lineEnd: 83,
      docstring: 'Enforces explicit authorization for mutations.',
      isExported: true,
    },
  ];
}

describe('IndexerEngine & TextChunker', () => {
  let repo: SearchIndexRepository;
  let engine: IndexerEngine;

  beforeEach(() => {
    const db = new SqliteDatabaseConnection({ path: ':memory:' });
    new MigrationManager(db).runMigrations();
    repo = new SearchIndexRepository(db);
    engine = new IndexerEngine({ repository: repo });
  });

  it('should split long text into overlapping chunks', () => {
    const chunker = new TextChunker({ maxChunkSize: 120, overlap: 20 });
    const longText = Array.from({ length: 10 }, (_, i) => `Line ${i}: Repodoc documentation text.`).join('\n');
    const chunks = chunker.chunk(longText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 120)).toBe(true);
  });

  it('should index knowledge items and support FTS5 full-text search with filters', async () => {
    await engine.indexKnowledgeItems(makeMockItems());

    const ftsHits = await engine.search({ text: 'FTS5 persistence', mode: 'fulltext' });
    expect(ftsHits.length).toBe(1);
    expect(ftsHits[0]?.chunk.sourceId).toBe('k-1');

    const filteredByProvenance = await engine.search({
      text: 'authorization',
      provenance: 'confirmed',
    });
    expect(filteredByProvenance).toHaveLength(0);

    const inferredHits = await engine.search({
      text: 'authorization',
      provenance: 'inferred',
    });
    expect(inferredHits).toHaveLength(1);
  });

  it('should support structural search by symbol identifier and path prefix', async () => {
    await engine.indexSymbols(makeMockSymbols());

    const byId = await engine.search({ identifier: 'PermissionsEngine', mode: 'structural' });
    expect(byId).toHaveLength(1);
    expect(byId[0]?.chunk.symbolName).toBe('PermissionsEngine');

    const byPath = await engine.search({ path: 'packages/permissions/', mode: 'structural' });
    expect(byPath).toHaveLength(1);
  });

  it('should index long generated documents as multiple chunks', async () => {
    const chunkedEngine = new IndexerEngine({
      repository: repo,
      chunking: { maxChunkSize: 120, overlap: 20 },
    });

    const doc: GeneratedDocument = {
      relativePath: 'technical/OVERVIEW.md',
      title: 'Overview',
      audience: 'technical',
      content: Array.from({ length: 12 }, (_, i) => `Section ${i}: Architecture details.`).join('\n'),
      sections: [],
      sourceItemIds: [],
      generatedAt: new Date().toISOString(),
      language: 'en',
      depth: 'overview',
    };

    const count = await chunkedEngine.indexDocuments([doc]);
    expect(count).toBeGreaterThan(1);

    const results = await chunkedEngine.search({ text: 'Architecture details' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should fall back gracefully to fulltext when semantic mode is requested without embedding provider', async () => {
    await engine.indexKnowledgeItems(makeMockItems());
    const results = await engine.search({ text: 'better-sqlite3', mode: 'semantic' });
    expect(results.length).toBe(1);
    expect(results[0]?.matchType).toBe('fulltext');
  });

  it('should support hybrid search and reranking when optional providers are configured', async () => {
    const mockEmbedder: EmbeddingProvider = {
      name: 'mock-embedder',
      async embed(texts: string[]): Promise<number[][]> {
        return texts.map((t) =>
          t.toLowerCase().includes('authorization') ? [1, 0] : [0, 1]
        );
      },
    };

    const mockReranker: RerankerProvider = {
      name: 'mock-reranker',
      async rerank(_query: string, items: SearchResultItem[]): Promise<SearchResultItem[]> {
        return [...items].sort((a, b) => b.score - a.score);
      },
    };

    const ragEngine = new IndexerEngine({
      repository: repo,
      embeddingProvider: mockEmbedder,
      reranker: mockReranker,
    });

    await ragEngine.indexKnowledgeItems(makeMockItems());

    const results = await ragEngine.retrieveContext('How does authorization work?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.chunk.sourceId).toBe('k-2');
    expect(results[0]?.matchType).toBe('hybrid');
  });
});
