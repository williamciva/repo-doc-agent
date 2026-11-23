import { ImpactReport } from '@repodoc/dependency-graph';

export type FileChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

export interface ChangedFile {
  path: string;
  previousPath?: string;
  status: FileChangeStatus;
  additions?: number;
  deletions?: number;
}

export interface GitDiffSummary {
  baseRef: string;
  targetRef: string;
  changedFiles: ChangedFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface UpdateProposal {
  targetDocument: string;
  reason: string;
  affectedKnowledgeIds: string[];
  triggerFiles: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface OutdatedDocReport {
  isOutdated: boolean;
  changedFiles: ChangedFile[];
  impact: ImpactReport;
  outdatedKnowledgeIds: string[];
  outdatedDocuments: string[];
  updateProposals: UpdateProposal[];
}
