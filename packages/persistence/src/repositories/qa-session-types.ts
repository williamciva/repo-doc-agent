/**
 * QASession type — defined in persistence to avoid circular dependency
 * between @repodoc/persistence and @repodoc/knowledge.
 * Re-exported from @repodoc/knowledge/src/types.ts for consumers.
 */
export interface QASession {
  id: string;
  question: string;
  answer?: string;
  askedAt: string;
  answeredAt?: string;
  relatedItemIds: string[];
  status: 'pending' | 'answered' | 'dismissed';
  metadata?: Record<string, unknown>;
}
