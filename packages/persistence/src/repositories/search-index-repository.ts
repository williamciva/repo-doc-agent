import { PersistenceError } from '@repodoc/shared';
import { DatabaseConnection } from '../interfaces.js';

export interface PersistedChunk {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  path?: string;
  symbolName?: string;
  category?: string;
  provenance?: string;
  embedding?: number[];
}

export interface SearchFilterOptions {
  sourceType?: string;
  category?: string;
  provenance?: string;
  pathPrefix?: string;
}

interface ChunkRow {
  id: string;
  source_type: string;
  source_id: string;
  title: string;
  content: string;
  path: string | null;
  symbol_name: string | null;
  category: string | null;
  provenance: string | null;
  embedding_json: string | null;
  score?: number;
}

export class SearchIndexRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public async upsertChunks(chunks: PersistedChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    try {
      const now = new Date().toISOString();
      this.db.transaction(() => {
        const deleteFts = this.db.prepare('DELETE FROM indexed_chunks_fts WHERE chunk_id = ?');
        const upsertChunk = this.db.prepare(`
          INSERT INTO indexed_chunks (
            id, source_type, source_id, title, content, path,
            symbol_name, category, provenance, embedding_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            source_type = excluded.source_type,
            source_id = excluded.source_id,
            title = excluded.title,
            content = excluded.content,
            path = excluded.path,
            symbol_name = excluded.symbol_name,
            category = excluded.category,
            provenance = excluded.provenance,
            embedding_json = excluded.embedding_json,
            updated_at = excluded.updated_at
        `);
        const insertFts = this.db.prepare(`
          INSERT INTO indexed_chunks_fts (chunk_id, title, content, path, symbol_name)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const chunk of chunks) {
          upsertChunk.run(
            chunk.id,
            chunk.sourceType,
            chunk.sourceId,
            chunk.title,
            chunk.content,
            chunk.path ?? null,
            chunk.symbolName ?? null,
            chunk.category ?? null,
            chunk.provenance ?? null,
            chunk.embedding ? JSON.stringify(chunk.embedding) : null,
            now
          );

          deleteFts.run(chunk.id);
          insertFts.run(
            chunk.id,
            chunk.title,
            chunk.content,
            chunk.path ?? '',
            chunk.symbolName ?? ''
          );
        }
      });
    } catch (error) {
      throw new PersistenceError('Failed to upsert search index chunks', { error });
    }
  }

  public async searchFullText(
    query: string,
    filters: SearchFilterOptions = {},
    limit = 20
  ): Promise<Array<{ chunk: PersistedChunk; score: number }>> {
    const ftsQuery = this.sanitizeFtsQuery(query);
    if (!ftsQuery) {
      return [];
    }

    try {
      const { whereClause, params } = this.buildFilterClause(filters, 'c');
      const sql = `
        SELECT c.*, bm25(indexed_chunks_fts) AS score
        FROM indexed_chunks_fts f
        JOIN indexed_chunks c ON c.id = f.chunk_id
        WHERE indexed_chunks_fts MATCH ?
        ${whereClause ? `AND ${whereClause}` : ''}
        ORDER BY score ASC
        LIMIT ?
      `;

      const rows = this.db.prepare(sql).all<ChunkRow>(ftsQuery, ...params, limit);
      return rows.map((row) => ({
        chunk: this.mapRow(row),
        // SQLite bm25() returns negative scores where lower (more negative) is better
        score: row.score !== undefined ? Math.abs(row.score) : 1,
      }));
    } catch (error) {
      throw new PersistenceError(`Full-text search failed for query '${query}'`, { error });
    }
  }

  public async searchByIdentifier(
    identifier: string,
    filters: SearchFilterOptions = {},
    limit = 20
  ): Promise<PersistedChunk[]> {
    try {
      const { whereClause, params } = this.buildFilterClause(filters);
      const pattern = `%${identifier}%`;
      const sql = `
        SELECT * FROM indexed_chunks
        WHERE (symbol_name LIKE ? OR title LIKE ?)
        ${whereClause ? `AND ${whereClause}` : ''}
        LIMIT ?
      `;

      const rows = this.db.prepare(sql).all<ChunkRow>(pattern, pattern, ...params, limit);
      return rows.map((r) => this.mapRow(r));
    } catch (error) {
      throw new PersistenceError(`Identifier search failed for '${identifier}'`, { error });
    }
  }

  public async listChunks(filters: SearchFilterOptions = {}, limit = 500): Promise<PersistedChunk[]> {
    try {
      const { whereClause, params } = this.buildFilterClause(filters);
      const sql = `
        SELECT * FROM indexed_chunks
        ${whereClause ? `WHERE ${whereClause}` : ''}
        LIMIT ?
      `;
      const rows = this.db.prepare(sql).all<ChunkRow>(...params, limit);
      return rows.map((r) => this.mapRow(r));
    } catch (error) {
      throw new PersistenceError('Failed to list indexed chunks', { error });
    }
  }

  public async clear(): Promise<void> {
    try {
      this.db.transaction(() => {
        this.db.exec('DELETE FROM indexed_chunks_fts; DELETE FROM indexed_chunks;');
      });
    } catch (error) {
      throw new PersistenceError('Failed to clear search index', { error });
    }
  }

  private sanitizeFtsQuery(raw: string): string {
    const tokens = raw
      .trim()
      .split(/[\s/\\.:;,'"()[\]{}]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return '';
    return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ');
  }

  private buildFilterClause(
    filters: SearchFilterOptions,
    alias?: string
  ): { whereClause: string; params: unknown[] } {
    const prefix = alias ? `${alias}.` : '';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.sourceType) {
      conditions.push(`${prefix}source_type = ?`);
      params.push(filters.sourceType);
    }
    if (filters.category) {
      conditions.push(`${prefix}category = ?`);
      params.push(filters.category);
    }
    if (filters.provenance) {
      conditions.push(`${prefix}provenance = ?`);
      params.push(filters.provenance);
    }
    if (filters.pathPrefix) {
      conditions.push(`${prefix}path LIKE ?`);
      params.push(`${filters.pathPrefix}%`);
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }

  private mapRow(row: ChunkRow): PersistedChunk {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      content: row.content,
      path: row.path ?? undefined,
      symbolName: row.symbol_name ?? undefined,
      category: row.category ?? undefined,
      provenance: row.provenance ?? undefined,
      embedding: row.embedding_json ? (JSON.parse(row.embedding_json) as number[]) : undefined,
    };
  }
}
