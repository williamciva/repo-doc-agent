import * as crypto from 'node:crypto';
import { KnowledgeItem, Logger, SilentLogger } from '@repodoc/shared';
import { SymbolInfo } from '@repodoc/analyzer';
import { GeneratedDocument } from '@repodoc/documentation';
import { PersistedChunk, SearchFilterOptions, SearchIndexRepository } from '@repodoc/persistence';
import { TextChunker } from './chunker.js';
import { cosineSimilarity } from './vector-math.js';
import {
  ChunkingOptions,
  ChunkSourceType,
  EmbeddingProvider,
  IndexedChunk,
  RerankerProvider,
  SearchQuery,
  SearchResultItem,
} from './types.js';

export interface IndexerEngineOptions {
  repository: SearchIndexRepository;
  embeddingProvider?: EmbeddingProvider;
  reranker?: RerankerProvider;
  chunking?: ChunkingOptions;
  logger?: Logger;
}

export class IndexerEngine {
  private readonly repo: SearchIndexRepository;
  private readonly embeddingProvider?: EmbeddingProvider;
  private readonly reranker?: RerankerProvider;
  private readonly chunker: TextChunker;
  private readonly logger: Logger;

  constructor(options: IndexerEngineOptions) {
    this.repo = options.repository;
    this.embeddingProvider = options.embeddingProvider;
    this.reranker = options.reranker;
    this.chunker = new TextChunker(options.chunking);
    this.logger = options.logger ?? new SilentLogger();
  }

  public async indexKnowledgeItems(items: KnowledgeItem[]): Promise<number> {
    const chunks: PersistedChunk[] = items.map((item) => ({
      id: this.makeId(`knowledge:${item.id}`),
      sourceType: 'knowledge',
      sourceId: item.id,
      title: item.title,
      content: item.content,
      path: item.fileReferences[0] ?? item.source,
      symbolName: item.symbols[0],
      category: item.category,
      provenance: item.provenance,
    }));

    return this.attachEmbeddingsAndUpsert(chunks);
  }

  public async indexSymbols(symbols: SymbolInfo[]): Promise<number> {
    const chunks: PersistedChunk[] = symbols.map((sym) => ({
      id: this.makeId(`symbol:${sym.id}`),
      sourceType: 'symbol',
      sourceId: sym.id,
      title: `${sym.kind}: ${sym.name}`,
      content: [
        sym.signature ? `Signature: ${sym.signature}` : '',
        sym.docstring ? `Docstring: ${sym.docstring}` : '',
        `File: ${sym.filePath}:${sym.lineStart}-${sym.lineEnd}`,
      ]
        .filter(Boolean)
        .join('\n'),
      path: sym.filePath,
      symbolName: sym.name,
    }));

    return this.attachEmbeddingsAndUpsert(chunks);
  }

  public async indexDocuments(documents: GeneratedDocument[]): Promise<number> {
    const chunks: PersistedChunk[] = [];

    for (const doc of documents) {
      const parts = this.chunker.chunk(doc.content);
      parts.forEach((part, idx) => {
        chunks.push({
          id: this.makeId(`document:${doc.relativePath}#${idx}`),
          sourceType: 'document',
          sourceId: doc.relativePath,
          title: parts.length > 1 ? `${doc.title} (Part ${idx + 1})` : doc.title,
          content: part,
          path: doc.relativePath,
        });
      });
    }

    return this.attachEmbeddingsAndUpsert(chunks);
  }

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const limit = query.limit ?? 20;
    const filters: SearchFilterOptions = {
      sourceType: query.sourceType,
      category: query.category,
      provenance: query.provenance,
      pathPrefix: query.path,
    };

    const mode = query.mode ?? (query.identifier ? 'structural' : 'fulltext');

    let results: SearchResultItem[] = [];

    if (mode === 'structural' || query.identifier) {
      results = await this.runStructuralSearch(query, filters, limit);
    } else if (mode === 'semantic') {
      results = await this.runSemanticSearch(query, filters, limit);
    } else if (mode === 'hybrid') {
      results = await this.runHybridSearch(query, filters, limit);
    } else {
      results = await this.runFullTextSearch(query, filters, limit);
    }

    if (this.reranker && query.text && results.length > 1) {
      results = await this.reranker.rerank(query.text, results);
    }

    return results.slice(0, limit);
  }

  /**
   * Contextual retrieval helper for RAG & Q&A workflows.
   */
  public async retrieveContext(
    question: string,
    options: Omit<SearchQuery, 'text'> = {}
  ): Promise<SearchResultItem[]> {
    const mode = this.embeddingProvider ? 'hybrid' : 'fulltext';
    return this.search({
      ...options,
      text: question,
      mode,
      limit: options.limit ?? 8,
    });
  }

  public async clearIndex(): Promise<void> {
    await this.repo.clear();
  }

  private async runFullTextSearch(
    query: SearchQuery,
    filters: SearchFilterOptions,
    limit: number
  ): Promise<SearchResultItem[]> {
    if (!query.text) {
      const rows = await this.repo.listChunks(filters, limit);
      return rows.map((r) => ({
        chunk: this.toIndexedChunk(r),
        score: 1,
        matchType: 'structural',
      }));
    }

    const hits = await this.repo.searchFullText(query.text, filters, limit);
    return hits.map((h) => ({
      chunk: this.toIndexedChunk(h.chunk),
      score: h.score,
      matchType: 'fulltext',
    }));
  }

  private async runStructuralSearch(
    query: SearchQuery,
    filters: SearchFilterOptions,
    limit: number
  ): Promise<SearchResultItem[]> {
    if (query.identifier) {
      const rows = await this.repo.searchByIdentifier(query.identifier, filters, limit);
      return rows.map((r) => ({
        chunk: this.toIndexedChunk(r),
        score: r.symbolName === query.identifier ? 1.0 : 0.8,
        matchType: 'structural',
      }));
    }

    const rows = await this.repo.listChunks(filters, limit);
    return rows.map((r) => ({
      chunk: this.toIndexedChunk(r),
      score: 1,
      matchType: 'structural',
    }));
  }

  private async runSemanticSearch(
    query: SearchQuery,
    filters: SearchFilterOptions,
    limit: number
  ): Promise<SearchResultItem[]> {
    if (!this.embeddingProvider || !query.text) {
      this.logger.warn('Embedding provider not configured; falling back to full-text search.');
      return this.runFullTextSearch(query, filters, limit);
    }

    const [queryVector] = await this.embeddingProvider.embed([query.text]);
    if (!queryVector) {
      return this.runFullTextSearch(query, filters, limit);
    }

    const candidates = await this.repo.listChunks(filters, 1000);
    const scored: SearchResultItem[] = [];

    for (const c of candidates) {
      if (!c.embedding) continue;
      const sim = cosineSimilarity(queryVector, c.embedding);
      scored.push({
        chunk: this.toIndexedChunk(c),
        score: sim,
        matchType: 'semantic',
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  private async runHybridSearch(
    query: SearchQuery,
    filters: SearchFilterOptions,
    limit: number
  ): Promise<SearchResultItem[]> {
    const ftsResults = await this.runFullTextSearch(query, filters, limit * 2);
    if (!this.embeddingProvider || !query.text) {
      return ftsResults.slice(0, limit);
    }

    const semanticResults = await this.runSemanticSearch(query, filters, limit * 2);
    const merged = new Map<string, SearchResultItem>();

    // Normalize and fuse scores (0.4 FTS + 0.6 Semantic)
    const maxFts = ftsResults.reduce((m, r) => Math.max(m, r.score), 1);
    for (const r of ftsResults) {
      const norm = r.score / maxFts;
      merged.set(r.chunk.id, {
        chunk: r.chunk,
        score: norm * 0.4,
        matchType: 'hybrid',
      });
    }

    for (const r of semanticResults) {
      const existing = merged.get(r.chunk.id);
      const semScore = Math.max(0, r.score) * 0.6;
      if (existing) {
        existing.score += semScore;
      } else {
        merged.set(r.chunk.id, {
          chunk: r.chunk,
          score: semScore,
          matchType: 'hybrid',
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async attachEmbeddingsAndUpsert(chunks: PersistedChunk[]): Promise<number> {
    if (chunks.length === 0) return 0;

    if (this.embeddingProvider) {
      const texts = chunks.map((c) => `${c.title}\n${c.content}`);
      const vectors = await this.embeddingProvider.embed(texts);
      for (let i = 0; i < chunks.length; i++) {
        if (vectors[i]) {
          chunks[i]!.embedding = vectors[i];
        }
      }
    }

    await this.repo.upsertChunks(chunks);
    return chunks.length;
  }

  private toIndexedChunk(row: PersistedChunk): IndexedChunk {
    return {
      id: row.id,
      sourceType: row.sourceType as ChunkSourceType,
      sourceId: row.sourceId,
      title: row.title,
      content: row.content,
      path: row.path,
      symbolName: row.symbolName,
      category: row.category,
      provenance: row.provenance as KnowledgeItem['provenance'],
      embedding: row.embedding,
    };
  }

  private makeId(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}
