import * as crypto from 'node:crypto';
import { PersistenceError } from '@repodoc/shared';
import { DatabaseConnection } from '../interfaces.js';
import { QASession } from './qa-session-types.js';

export type { QASession };

interface QASessionRow {
  id: string;
  question: string;
  answer: string | null;
  asked_at: string;
  answered_at: string | null;
  status: string;
  related_item_ids: string;
  metadata: string | null;
}

export interface IQASessionRepository {
  save(session: QASession): Promise<void>;
  findById(id: string): Promise<QASession | null>;
  findByStatus(status: QASession['status']): Promise<QASession[]>;
  updateAnswer(id: string, answer: string): Promise<void>;
  dismiss(id: string): Promise<void>;
  listAll(): Promise<QASession[]>;
}

export class QASessionRepository implements IQASessionRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public static generateId(): string {
    return crypto.randomUUID();
  }

  public async save(session: QASession): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO qa_sessions (id, question, answer, asked_at, answered_at, status, related_item_ids, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          question = excluded.question,
          answer = excluded.answer,
          answered_at = excluded.answered_at,
          status = excluded.status,
          related_item_ids = excluded.related_item_ids,
          metadata = excluded.metadata
      `);

      stmt.run(
        session.id,
        session.question,
        session.answer ?? null,
        session.askedAt,
        session.answeredAt ?? null,
        session.status,
        JSON.stringify(session.relatedItemIds),
        session.metadata ? JSON.stringify(session.metadata) : null
      );
    } catch (error) {
      throw new PersistenceError(`Failed to save QA session '${session.id}'`, { error, session });
    }
  }

  public async findById(id: string): Promise<QASession | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM qa_sessions WHERE id = ?');
      const row = stmt.get<QASessionRow>(id);
      return row ? this.mapRowToSession(row) : null;
    } catch (error) {
      throw new PersistenceError(`Failed to find QA session '${id}'`, { error, id });
    }
  }

  public async findByStatus(status: QASession['status']): Promise<QASession[]> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM qa_sessions WHERE status = ? ORDER BY asked_at ASC'
      );
      const rows = stmt.all<QASessionRow>(status);
      return rows.map((r) => this.mapRowToSession(r));
    } catch (error) {
      throw new PersistenceError(`Failed to find QA sessions by status '${status}'`, {
        error,
        status,
      });
    }
  }

  public async updateAnswer(id: string, answer: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE qa_sessions
        SET answer = ?, answered_at = ?, status = 'answered'
        WHERE id = ?
      `);
      const result = stmt.run(answer, new Date().toISOString(), id);

      if (result.changes === 0) {
        throw new PersistenceError(`QA session '${id}' not found`, { id });
      }
    } catch (error) {
      throw new PersistenceError(`Failed to update answer for QA session '${id}'`, { error, id });
    }
  }

  public async dismiss(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`UPDATE qa_sessions SET status = 'dismissed' WHERE id = ?`);
      const result = stmt.run(id);

      if (result.changes === 0) {
        throw new PersistenceError(`QA session '${id}' not found`, { id });
      }
    } catch (error) {
      throw new PersistenceError(`Failed to dismiss QA session '${id}'`, { error, id });
    }
  }

  public async listAll(): Promise<QASession[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM qa_sessions ORDER BY asked_at DESC');
      const rows = stmt.all<QASessionRow>();
      return rows.map((r) => this.mapRowToSession(r));
    } catch (error) {
      throw new PersistenceError('Failed to list all QA sessions', { error });
    }
  }

  private mapRowToSession(row: QASessionRow): QASession {
    return {
      id: row.id,
      question: row.question,
      answer: row.answer ?? undefined,
      askedAt: row.asked_at,
      answeredAt: row.answered_at ?? undefined,
      status: row.status as QASession['status'],
      relatedItemIds: JSON.parse(row.related_item_ids) as string[],
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    };
  }
}
