import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeService } from '../src/service.js';
import { KnowledgeRepository, QASessionRepository, MigrationManager, SqliteDatabaseConnection } from '@repodoc/persistence';
import { AnalysisResult } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';

function makeMockStructure(): ProjectStructure {
  return {
    rootPath: '/workspace',
    isMonorepo: false,
    packages: [],
    totalFiles: 2,
    detectedLanguages: { typescript: { fileCount: 2, extensions: ['.ts'] } },
    gitInfo: { isGitRepo: false },
    excludedPaths: [],
  };
}

function makeMockAnalysis(): AnalysisResult {
  return {
    parsedFiles: [
      {
        filePath: '/workspace/src/app.ts',
        language: 'typescript',
        symbols: [
          {
            id: '/workspace/src/app.ts#AppClass',
            name: 'AppClass',
            kind: 'class',
            filePath: '/workspace/src/app.ts',
            lineStart: 1,
            lineEnd: 10,
            isExported: true,
            docstring: 'Main application class',
          },
        ],
        dependencies: ['express'],
        parseErrors: [],
      },
    ],
    summary: {
      totalFiles: 1,
      totalSymbols: 1,
      byLanguage: { typescript: 1 },
      externalDependencies: ['express'],
      parseErrors: 0,
      analysisTimeMs: 5,
    },
    moduleDependencies: {},
  };
}

describe('KnowledgeService', () => {
  let knowledgeRepo: KnowledgeRepository;
  let qaRepo: QASessionRepository;
  let service: KnowledgeService;

  beforeEach(() => {
    // in-memory SQLite for each test
    const db = new SqliteDatabaseConnection({ path: ':memory:' });
    const migrator = new MigrationManager(db);
    migrator.runMigrations();

    knowledgeRepo = new KnowledgeRepository(db);
    qaRepo = new QASessionRepository(db);
    service = new KnowledgeService(knowledgeRepo, qaRepo, { approvalMode: 'manual' });
  });

  it('should ingest items from analysis in manual mode (inferred => pending)', async () => {
    const items = await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.approvalStatus === 'pending')).toBe(true);
    expect(items.every((i) => i.provenance === 'inferred')).toBe(true);
  });

  it('should ingest items in auto mode and auto-approve them', async () => {
    const autoService = new KnowledgeService(knowledgeRepo, qaRepo, { approvalMode: 'auto' });
    const items = await autoService.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    expect(items.every((i) => i.approvalStatus === 'approved')).toBe(true);
  });

  it('should query items by category', async () => {
    await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const archItems = await service.query({ category: 'architecture' });
    expect(archItems.length).toBeGreaterThan(0);
    expect(archItems.every((i) => i.category === 'architecture')).toBe(true);
  });

  it('should query items by text search', async () => {
    await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const results = await service.query({ searchText: 'AppClass' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should approve a pending item', async () => {
    const items = await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const pending = items.find((i) => i.approvalStatus === 'pending');
    expect(pending).toBeDefined();

    const result = await service.approve(pending!.id);
    expect(result.newStatus).toBe('approved');
    expect(result.previousStatus).toBe('pending');

    const updated = await knowledgeRepo.findById(pending!.id);
    expect(updated?.approvalStatus).toBe('approved');
  });

  it('should reject a pending item', async () => {
    const items = await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const pending = items.find((i) => i.approvalStatus === 'pending');

    const result = await service.reject(pending!.id);
    expect(result.newStatus).toBe('rejected');
  });

  it('should return all pending items', async () => {
    await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const pending = await service.getPending();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((i) => i.approvalStatus === 'pending')).toBe(true);
  });

  it('should create and retrieve a pending Q&A session', async () => {
    const session = await service.addQASession('What does AppClass do?');
    expect(session.status).toBe('pending');
    expect(session.question).toBe('What does AppClass do?');

    const pending = await service.getPendingQuestions();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(session.id);
  });

  it('should answer a Q&A session and persist as a knowledge item', async () => {
    const items = await service.ingestFromAnalysis(makeMockAnalysis(), makeMockStructure());
    const session = await service.addQASession('What is AppClass?', [items[0]!.id]);

    const { session: answered, knowledgeItem } = await service.answerQASession(
      session.id,
      'AppClass is the main entry point of the application.'
    );

    expect(answered.status).toBe('answered');
    expect(answered.answer).toContain('AppClass');

    expect(knowledgeItem.provenance).toBe('confirmed');
    expect(knowledgeItem.approvalStatus).toBe('approved');
    expect(knowledgeItem.content).toContain('AppClass');

    // should no longer appear in pending
    const pending = await service.getPendingQuestions();
    expect(pending).toHaveLength(0);
  });
});
