import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Logger, SilentLogger, ConsoleLogger } from '@repodoc/shared';
import { loadProjectConfig, ProjectConfig } from '@repodoc/configuration';
import { PermissionsEngine } from '@repodoc/permissions';
import { RepositoryEngine, ProjectStructure } from '@repodoc/repository';
import { AnalyzerEngine, AnalysisResult } from '@repodoc/analyzer';
import {
  SqliteDatabaseConnection,
  MigrationManager,
  KnowledgeRepository,
  QASessionRepository,
  DatabaseConnection,
} from '@repodoc/persistence';
import { KnowledgeService } from '@repodoc/knowledge';

export interface RepoDocContextOptions {
  projectRoot: string;
  databasePath?: string; // default: .repodoc/repodoc.db or :memory:
  logger?: Logger;
  approvalMode?: 'auto' | 'manual';
}

export class RepoDocContext {
  public readonly projectRoot: string;
  public readonly config: ProjectConfig;
  public readonly permissions: PermissionsEngine;
  public readonly repository: RepositoryEngine;
  public readonly analyzer: AnalyzerEngine;
  public readonly knowledgeRepo: KnowledgeRepository;
  public readonly knowledgeService: KnowledgeService;
  public readonly db: DatabaseConnection;
  public readonly logger: Logger;

  private constructor(
    projectRoot: string,
    config: ProjectConfig,
    permissions: PermissionsEngine,
    repository: RepositoryEngine,
    analyzer: AnalyzerEngine,
    knowledgeRepo: KnowledgeRepository,
    knowledgeService: KnowledgeService,
    db: DatabaseConnection,
    logger: Logger
  ) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.permissions = permissions;
    this.repository = repository;
    this.analyzer = analyzer;
    this.knowledgeRepo = knowledgeRepo;
    this.knowledgeService = knowledgeService;
    this.db = db;
    this.logger = logger;
  }

  public static async create(options: RepoDocContextOptions): Promise<RepoDocContext> {
    const projectRoot = path.resolve(options.projectRoot);
    const logger = options.logger ?? new ConsoleLogger('info');
    const approvalMode = options.approvalMode ?? 'manual';

    // 1. Load project configuration
    const config = await loadProjectConfig(projectRoot);

    // 2. Initialize Permissions Engine with boundary at projectRoot
    const permissions = new PermissionsEngine({
      allowedRoot: projectRoot,
      logger,
    });

    // 3. Initialize Repository Engine
    const repository = new RepositoryEngine({
      projectRoot,
      config,
      logger,
    });

    // 4. Initialize Analyzer Engine
    const analyzer = new AnalyzerEngine({ logger });

    // 5. Initialize SQLite Persistence & run migrations
    let dbPath = options.databasePath;
    if (!dbPath) {
      const repodocDir = path.join(projectRoot, '.repodoc');
      await fs.mkdir(repodocDir, { recursive: true });
      dbPath = path.join(repodocDir, 'repodoc.db');
    }

    const db = new SqliteDatabaseConnection({ path: dbPath });
    const migrator = new MigrationManager(db);
    migrator.runMigrations();

    const knowledgeRepo = new KnowledgeRepository(db);
    const qaRepo = new QASessionRepository(db);
    const knowledgeService = new KnowledgeService(knowledgeRepo, qaRepo, { approvalMode });

    return new RepoDocContext(
      projectRoot,
      config,
      permissions,
      repository,
      analyzer,
      knowledgeRepo,
      knowledgeService,
      db,
      logger
    );
  }

  public static async createInMemory(
    projectRoot = process.cwd(),
    logger?: Logger,
    approvalMode: 'auto' | 'manual' = 'manual'
  ): Promise<RepoDocContext> {
    const config = await loadProjectConfig(projectRoot);
    const db = new SqliteDatabaseConnection({ path: ':memory:' });
    const migrator = new MigrationManager(db);
    migrator.runMigrations();

    const permissions = new PermissionsEngine({
      allowedRoot: projectRoot,
      logger: logger ?? new SilentLogger(),
    });

    const repository = new RepositoryEngine({
      projectRoot,
      config,
      logger: logger ?? new SilentLogger(),
    });

    const analyzer = new AnalyzerEngine({
      logger: logger ?? new SilentLogger(),
    });

    const knowledgeRepo = new KnowledgeRepository(db);
    const qaRepo = new QASessionRepository(db);
    const knowledgeService = new KnowledgeService(knowledgeRepo, qaRepo, { approvalMode });

    return new RepoDocContext(
      projectRoot,
      config,
      permissions,
      repository,
      analyzer,
      knowledgeRepo,
      knowledgeService,
      db,
      logger ?? new SilentLogger()
    );
  }

  public async discover(): Promise<ProjectStructure> {
    return this.repository.discover();
  }

  public async analyze(): Promise<AnalysisResult> {
    const structure = await this.discover();
    const analysis = await this.analyzer.analyzeFiles(structure.files);
    await this.knowledgeService.ingestFromAnalysis(analysis, structure);
    return analysis;
  }

  public close(): void {
    this.db.close();
  }
}
