import { KnowledgeItem, KnowledgeCategory, ApprovalStatus } from '@repodoc/shared';

export interface DatabaseStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

export interface DatabaseConnection {
  exec(sql: string): void;
  prepare(sql: string): DatabaseStatement;
  transaction<T>(fn: () => T): T;
  close(): void;
}

export interface IKnowledgeRepository {
  save(item: KnowledgeItem): Promise<void>;
  findById(id: string): Promise<KnowledgeItem | null>;
  findByCategory(category: KnowledgeCategory): Promise<KnowledgeItem[]>;
  findPendingApproval(): Promise<KnowledgeItem[]>;
  updateApprovalStatus(id: string, status: ApprovalStatus): Promise<void>;
  listAll(): Promise<KnowledgeItem[]>;
}
