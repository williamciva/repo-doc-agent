import { DatabaseConnection } from '../interfaces.js';

export const migration001 = {
  id: 1,
  name: '001_initial_schema',
  up: (db: DatabaseConnection): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        language TEXT,
        hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        signature TEXT,
        visibility TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS knowledge_items (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        file_references TEXT NOT NULL, -- JSON array
        symbols TEXT NOT NULL,         -- JSON array
        discovered_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        confidence TEXT NOT NULL,
        provenance TEXT NOT NULL,
        approval_status TEXT NOT NULL,
        metadata TEXT                  -- JSON object
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_items(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_approval ON knowledge_items(approval_status);
      CREATE INDEX IF NOT EXISTS idx_knowledge_provenance ON knowledge_items(provenance);

      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        PRIMARY KEY (source_id, target_id, type),
        FOREIGN KEY (source_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        target_path TEXT,
        authorized_by TEXT,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT -- JSON
      );
    `);
  },
};
