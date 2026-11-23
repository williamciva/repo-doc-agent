import * as crypto from 'node:crypto';
import { KnowledgeCategory, KnowledgeItem } from '@repodoc/shared';
import { KnowledgeRepository, QASessionRepository } from '@repodoc/persistence';
import type { QASession } from '@repodoc/persistence';
import { AnalysisResult } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';
import { KnowledgeIngestor } from './ingestor.js';
import { KnowledgeQueryOptions, IngestOptions, ApprovalResult } from './types.js';

export interface KnowledgeServiceConfig {
  approvalMode: 'auto' | 'manual';
}

export class KnowledgeService {
  private readonly ingestor: KnowledgeIngestor;

  constructor(
    private readonly knowledgeRepo: KnowledgeRepository,
    private readonly qaRepo: QASessionRepository,
    private readonly config: KnowledgeServiceConfig = { approvalMode: 'manual' }
  ) {
    this.ingestor = new KnowledgeIngestor();
  }

  /**
   * Ingest knowledge from a repository analysis result.
   * In 'auto' mode, all items are auto-approved.
   * In 'manual' mode, inferred items stay pending.
   */
  public async ingestFromAnalysis(
    analysis: AnalysisResult,
    structure: ProjectStructure,
    options: IngestOptions = {}
  ): Promise<KnowledgeItem[]> {
    const provenance = options.provenance ?? 'inferred';
    const items = this.ingestor.ingestFromAnalysis(analysis, structure, { provenance });

    const resolved = items.map((item) => {
      if (this.config.approvalMode === 'auto') {
        return { ...item, approvalStatus: 'approved' as const };
      }
      return item;
    });

    for (const item of resolved) {
      await this.knowledgeRepo.save(item);
    }

    return resolved;
  }

  /**
   * Query knowledge items with optional filters.
   */
  public async query(options: KnowledgeQueryOptions = {}): Promise<KnowledgeItem[]> {
    let items: KnowledgeItem[];

    if (options.category) {
      items = await this.knowledgeRepo.findByCategory(options.category);
    } else {
      items = await this.knowledgeRepo.listAll();
    }

    if (options.provenance) {
      items = items.filter((i) => i.provenance === options.provenance);
    }

    if (options.approvalStatus) {
      items = items.filter((i) => i.approvalStatus === options.approvalStatus);
    }

    if (options.searchText) {
      const lower = options.searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(lower) || i.content.toLowerCase().includes(lower)
      );
    }

    if (options.fileReference) {
      items = items.filter((i) => i.fileReferences.includes(options.fileReference!));
    }

    if (options.symbol) {
      items = items.filter((i) => i.symbols.includes(options.symbol!));
    }

    return items;
  }

  /**
   * Approve a pending knowledge item.
   */
  public async approve(itemId: string): Promise<ApprovalResult> {
    const item = await this.knowledgeRepo.findById(itemId);
    if (!item) {
      throw new Error(`Knowledge item '${itemId}' not found`);
    }

    const previousStatus = item.approvalStatus;
    await this.knowledgeRepo.updateApprovalStatus(itemId, 'approved');

    return { itemId, previousStatus, newStatus: 'approved' };
  }

  /**
   * Approve all pending knowledge items, optionally filtered by category.
   */
  public async approveAll(options: { category?: KnowledgeCategory } = {}): Promise<ApprovalResult[]> {
    const pending = await this.getPending();
    const targets = options.category
      ? pending.filter((item) => item.category === options.category)
      : pending;

    const results: ApprovalResult[] = [];
    for (const item of targets) {
      await this.knowledgeRepo.updateApprovalStatus(item.id, 'approved');
      results.push({
        itemId: item.id,
        previousStatus: item.approvalStatus,
        newStatus: 'approved',
      });
    }

    return results;
  }

  /**
   * Reject a pending knowledge item.
   */
  public async reject(itemId: string): Promise<ApprovalResult> {
    const item = await this.knowledgeRepo.findById(itemId);
    if (!item) {
      throw new Error(`Knowledge item '${itemId}' not found`);
    }

    const previousStatus = item.approvalStatus;
    await this.knowledgeRepo.updateApprovalStatus(itemId, 'rejected');

    return { itemId, previousStatus, newStatus: 'rejected' };
  }

  /**
   * Get all knowledge items pending approval.
   */
  public async getPending(): Promise<KnowledgeItem[]> {
    return this.knowledgeRepo.findPendingApproval();
  }

  /**
   * Create a Q&A session with a question.
   */
  public async addQASession(
    question: string,
    relatedItemIds: string[] = []
  ): Promise<QASession> {
    const session: QASession = {
      id: crypto.randomUUID(),
      question,
      askedAt: new Date().toISOString(),
      relatedItemIds,
      status: 'pending',
    };

    await this.qaRepo.save(session);
    return session;
  }

  /**
   * Answer a Q&A session and persist the answer as a confirmed knowledge item.
   */
  public async answerQASession(
    sessionId: string,
    answer: string
  ): Promise<{ session: QASession; knowledgeItem: KnowledgeItem }> {
    await this.qaRepo.updateAnswer(sessionId, answer);
    const session = await this.qaRepo.findById(sessionId);

    if (!session) {
      throw new Error(`QA session '${sessionId}' not found after update`);
    }

    const now = new Date().toISOString();
    const knowledgeItem: KnowledgeItem = {
      id: crypto.createHash('sha256').update(`qa:${sessionId}`).digest('hex').slice(0, 16),
      category: 'observations',
      title: `Q&A: ${session.question.slice(0, 80)}`,
      content: `Question: ${session.question}\n\nAnswer: ${answer}`,
      source: `qa-session:${sessionId}`,
      fileReferences: [],
      symbols: [],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'high',
      provenance: 'confirmed',
      approvalStatus: 'approved',
      relationships: session.relatedItemIds.map((targetId) => ({
        targetId,
        type: 'relates_to' as const,
        description: 'Referenced in Q&A session',
      })),
    };

    await this.knowledgeRepo.save(knowledgeItem);

    return { session, knowledgeItem };
  }

  /**
   * Get all Q&A sessions that are still pending an answer.
   */
  public async getPendingQuestions(): Promise<QASession[]> {
    return this.qaRepo.findByStatus('pending');
  }
}
