import { KnowledgeCategory, KnowledgeItem } from '@repodoc/shared';

export type ChunkSourceType = 'knowledge' | 'symbol' | 'document' | 'file';

export interface IndexedChunk {
  id: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  title: string;
  content: string;
  path?: string;
  symbolName?: string;
  category?: KnowledgeCategory | string;
  provenance?: KnowledgeItem['provenance'];
  embedding?: number[];
}

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlap?: number;
}

export type SearchMode = 'fulltext' | 'structural' | 'semantic' | 'hybrid';

export interface SearchQuery {
  text?: string;
  identifier?: string;
  path?: string;
  category?: KnowledgeCategory;
  provenance?: KnowledgeItem['provenance'];
  sourceType?: ChunkSourceType;
  limit?: number;
  mode?: SearchMode;
}

export interface SearchResultItem {
  chunk: IndexedChunk;
  score: number;
  matchType: SearchMode;
}

/**
 * Optional embedding provider abstraction.
 * The system operates fully offline when no embedding provider is configured.
 */
export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Optional reranker provider abstraction for RAG result refinement.
 */
export interface RerankerProvider {
  readonly name: string;
  rerank(query: string, items: SearchResultItem[]): Promise<SearchResultItem[]>;
}
