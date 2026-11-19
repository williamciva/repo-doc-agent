import Database from 'better-sqlite3';
import { DatabaseConnection, DatabaseStatement } from './interfaces.js';
import { PersistenceError } from '@repodoc/shared';

export interface SqliteConnectionOptions {
  path: string;
  readonly?: boolean;
}

export class SqliteDatabaseConnection implements DatabaseConnection {
  private readonly db: Database.Database;

  constructor(options: SqliteConnectionOptions) {
    try {
      this.db = new Database(options.path, {
        readonly: options.readonly ?? false,
      });
      // Enable WAL mode for better concurrency and foreign keys
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
    } catch (error) {
      throw new PersistenceError(
        `Failed to open SQLite database at '${options.path}': ${error instanceof Error ? error.message : String(error)}`,
        { path: options.path, error }
      );
    }
  }

  public exec(sql: string): void {
    try {
      this.db.exec(sql);
    } catch (error) {
      throw new PersistenceError(
        `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`,
        { sql, error }
      );
    }
  }

  public prepare(sql: string): DatabaseStatement {
    try {
      const stmt = this.db.prepare(sql);
      return {
        run: (...params: unknown[]) => stmt.run(...params),
        get: <T = unknown>(...params: unknown[]) => stmt.get(...params) as T | undefined,
        all: <T = unknown>(...params: unknown[]) => stmt.all(...params) as T[],
      };
    } catch (error) {
      throw new PersistenceError(
        `Failed to prepare SQL statement: ${error instanceof Error ? error.message : String(error)}`,
        { sql, error }
      );
    }
  }

  public transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  public close(): void {
    this.db.close();
  }
}
