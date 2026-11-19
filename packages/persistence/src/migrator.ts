import { DatabaseConnection } from './interfaces.js';
import { migration001 } from './migrations/001_initial_schema.js';
import { migration002 } from './migrations/002_qa_sessions.js';
import { PersistenceError } from '@repodoc/shared';

export interface Migration {
  id: number;
  name: string;
  up: (db: DatabaseConnection) => void;
}

export class MigrationManager {
  private readonly migrations: Migration[] = [migration001, migration002];

  constructor(private readonly db: DatabaseConnection) {}

  public runMigrations(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      const applied = this.getAppliedMigrations();

      for (const migration of this.migrations) {
        if (!applied.has(migration.id)) {
          this.db.transaction(() => {
            migration.up(this.db);
            const stmt = this.db.prepare(
              'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)'
            );
            stmt.run(migration.id, migration.name, new Date().toISOString());
          });
        }
      }
    } catch (error) {
      throw new PersistenceError(
        `Failed to run database migrations: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  private getAppliedMigrations(): Set<number> {
    try {
      const stmt = this.db.prepare('SELECT id FROM _migrations');
      const rows = stmt.all<{ id: number }>();
      return new Set(rows.map((r) => r.id));
    } catch {
      return new Set();
    }
  }
}
