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
  GraphRepository,
  DatabaseConnection,
} from '@repodoc/persistence';
import { KnowledgeService } from '@repodoc/knowledge';
import {
  DocumentationEngine,
  DocumentationGenerateOptions,
  DocumentationResult,
} from '@repodoc/documentation';
import { DependencyGraph, GraphBuilder } from '@repodoc/dependency-graph';
import { GitIntelligenceEngine, OutdatedDocReport } from '@repodoc/git-intelligence';

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
  public readonly graphRepo: GraphRepository;
  public readonly knowledgeService: KnowledgeService;
  public readonly documentation: DocumentationEngine;
  public readonly gitIntelligence: GitIntelligenceEngine;
  public readonly db: DatabaseConnection;
  public readonly logger: Logger;

  private constructor(
    projectRoot: string,
    config: ProjectConfig,
    permissions: PermissionsEngine,
    repository: RepositoryEngine,
    analyzer: AnalyzerEngine,
    knowledgeRepo: KnowledgeRepository,
    graphRepo: GraphRepository,
    knowledgeService: KnowledgeService,
    documentation: DocumentationEngine,
    gitIntelligence: GitIntelligenceEngine,
    db: DatabaseConnection,
    logger: Logger
  ) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.permissions = permissions;
    this.repository = repository;
    this.analyzer = analyzer;
    this.knowledgeRepo = knowledgeRepo;
    this.graphRepo = graphRepo;
    this.knowledgeService = knowledgeService;
    this.documentation = documentation;
    this.gitIntelligence = gitIntelligence;
    this.db = db;
    this.logger = logger;
  }

  public static async create(options: RepoDocContextOptions): Promise<RepoDocContext> {
    const projectRoot = path.resolve(options.projectRoot);
    const logger = options.logger ?? new ConsoleLogger('info');
    // 1. Load project configuration
    const config = await loadProjectConfig(projectRoot);
    const configuredApproval =
      config.knowledge.approval.mode === 'automatic' ? 'auto' : 'manual';
    const approvalMode = options.approvalMode ?? configuredApproval;

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
    const graphRepo = new GraphRepository(db);
    const qaRepo = new QASessionRepository(db);
    const knowledgeService = new KnowledgeService(knowledgeRepo, qaRepo, {
      approvalMode,
    });
    const documentation = new DocumentationEngine({
      projectRoot,
      permissions,
      logger,
    });
    const gitIntelligence = new GitIntelligenceEngine({
      projectRoot,
      logger,
    });

    return new RepoDocContext(
      projectRoot,
      config,
      permissions,
      repository,
      analyzer,
      knowledgeRepo,
      graphRepo,
      knowledgeService,
      documentation,
      gitIntelligence,
      db,
      logger
    );
  }

  public static async createInMemory(
    projectRoot = process.cwd(),
    logger?: Logger,
    approvalMode?: 'auto' | 'manual'
  ): Promise<RepoDocContext> {
    const config = await loadProjectConfig(projectRoot);
    const resolvedApprovalMode =
      approvalMode ?? (config.knowledge.approval.mode === 'automatic' ? 'auto' : 'manual');
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

    const resolvedLogger = logger ?? new SilentLogger();
    const knowledgeRepo = new KnowledgeRepository(db);
    const graphRepo = new GraphRepository(db);
    const qaRepo = new QASessionRepository(db);
    const knowledgeService = new KnowledgeService(knowledgeRepo, qaRepo, {
      approvalMode: resolvedApprovalMode,
    });
    const documentation = new DocumentationEngine({
      projectRoot,
      permissions,
      logger: resolvedLogger,
    });
    const gitIntelligence = new GitIntelligenceEngine({
      projectRoot,
      logger: resolvedLogger,
    });

    return new RepoDocContext(
      projectRoot,
      config,
      permissions,
      repository,
      analyzer,
      knowledgeRepo,
      graphRepo,
      knowledgeService,
      documentation,
      gitIntelligence,
      db,
      resolvedLogger
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

  public async previewDocumentation(
    overrides: Partial<DocumentationGenerateOptions> = {}
  ): Promise<DocumentationResult> {
    const structure = await this.discover();
    const analysis = await this.analyzer.analyzeFiles(structure.files);
    const knowledgeItems = await this.knowledgeService.query({});

    return this.documentation.preview(
      { structure, analysis, knowledgeItems },
      {
        projectName: this.config.project.name,
        projectDescription: this.config.project.description,
        language: this.config.documentation.language,
        depth: this.config.documentation.depth,
        outputDir: this.config.documentation.destination.path,
        ...overrides,
      }
    );
  }

  public async generateDocumentation(
    overrides: Partial<DocumentationGenerateOptions> = {}
  ): Promise<DocumentationResult> {
    const structure = await this.discover();
    const analysis = await this.analyzer.analyzeFiles(structure.files);
    const knowledgeItems = await this.knowledgeService.query({});

    return this.documentation.generate(
      { structure, analysis, knowledgeItems },
      {
        projectName: this.config.project.name,
        projectDescription: this.config.project.description,
        language: this.config.documentation.language,
        depth: this.config.documentation.depth,
        outputDir: this.config.documentation.destination.path,
        ...overrides,
      }
    );
  }

  public async buildDependencyGraph(persist = true): Promise<DependencyGraph> {
    const structure = await this.discover();
    const analysis = await this.analyzer.analyzeFiles(structure.files);
    const knowledgeItems = await this.knowledgeService.query({});
    const docsPreview = this.documentation.preview(
      { structure, analysis, knowledgeItems },
      {
        projectName: this.config.project.name,
        projectDescription: this.config.project.description,
        language: this.config.documentation.language,
        depth: this.config.documentation.depth,
      }
    );

    const graph = new GraphBuilder().build({
      structure,
      analysis,
      knowledgeItems,
      documents: docsPreview.documents,
    });

    if (persist) {
      const persisted = graph.toPersisted();
      await this.graphRepo.saveGraph(persisted.nodes, persisted.edges);
    }

    return graph;
  }

  public async detectOutdatedDocumentation(baseRef?: string): Promise<OutdatedDocReport> {
    const graph = await this.buildDependencyGraph(false);
    if (baseRef) {
      return this.gitIntelligence.detectOutdatedSinceRef(graph, baseRef);
    }
    const changes = await this.gitIntelligence.getWorkingTreeChanges();
    return this.gitIntelligence.detectOutdatedFromChanges(graph, changes);
  }

  public close(): void {
    this.db.close();
  }
}
