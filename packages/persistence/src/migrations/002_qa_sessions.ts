import { DatabaseConnection } from '../interfaces.js';

export const migration002 = {
  id: 2,
  name: '002_qa_sessions',
  up: (db: DatabaseConnection): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS qa_sessions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT,
        asked_at TEXT NOT NULL,
        answered_at TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        related_item_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
        metadata TEXT                                -- JSON object
      );

      CREATE INDEX IF NOT EXISTS idx_qa_sessions_status ON qa_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_qa_sessions_asked_at ON qa_sessions(asked_at);
    `);
  },
};
