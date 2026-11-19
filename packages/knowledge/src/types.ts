import { KnowledgeItem, KnowledgeCategory } from '@repodoc/shared';
import type { QASession as QASessionBase } from '@repodoc/persistence';

/** Re-export QASession for consumers of @repodoc/knowledge */
export type { QASessionBase as QASession };

export interface KnowledgeQueryOptions {
  category?: KnowledgeCategory;
  provenance?: KnowledgeItem['provenance'];
  approvalStatus?: KnowledgeItem['approvalStatus'];
  searchText?: string;
  fileReference?: string;
  symbol?: string;
}

export interface IngestOptions {
  provenance?: KnowledgeItem['provenance'];
  overwrite?: boolean;
}

export interface ApprovalResult {
  itemId: string;
  previousStatus: KnowledgeItem['approvalStatus'];
  newStatus: KnowledgeItem['approvalStatus'];
}
