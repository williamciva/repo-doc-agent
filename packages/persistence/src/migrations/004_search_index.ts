import { DatabaseConnection } from '../interfaces.js';

export const migration004 = {
  id: 4,
  name: '004_search_index',
  up: (db: DatabaseConnection): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS indexed_chunks (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        path TEXT,
        symbol_name TEXT,
        category TEXT,
        provenance TEXT,
        embedding_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_source_type ON indexed_chunks(source_type);
      CREATE INDEX IF NOT EXISTS idx_chunks_category ON indexed_chunks(category);
      CREATE INDEX IF NOT EXISTS idx_chunks_provenance ON indexed_chunks(provenance);
      CREATE INDEX IF NOT EXISTS idx_chunks_symbol ON indexed_chunks(symbol_name);
      CREATE INDEX IF NOT EXISTS idx_chunks_path ON indexed_chunks(path);

      CREATE VIRTUAL TABLE IF NOT EXISTS indexed_chunks_fts USING fts5(
        chunk_id UNINDEXED,
        title,
        content,
        path,
        symbol_name
      );
    `);
  },
};
