import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Logger, SilentLogger, ConsoleLogger } from '@repodoc/shared';
import { loadProjectConfig, ProjectConfig } from '@repodoc/configuration';
import { PermissionsEngine } from '@repodoc/permissions';
import { RepositoryEngine, ProjectStructure } from '@repodoc/repository';
import {
  SqliteDatabaseConnection,
  MigrationManager,
  KnowledgeRepository,
  DatabaseConnection,
} from '@repodoc/persistence';

export interface RepoDocContextOptions {
  projectRoot: string;
  databasePath?: string; // default: .repodoc/repodoc.db or :memory:
  logger?: Logger;
}

export class RepoDocContext {
  public readonly projectRoot: string;
  public readonly config: ProjectConfig;
  public readonly permissions: PermissionsEngine;
  public readonly repository: RepositoryEngine;
  public readonly knowledge: KnowledgeRepository;
  public readonly db: DatabaseConnection;
  public readonly logger: Logger;

  private constructor(
    projectRoot: string,
    config: ProjectConfig,
    permissions: PermissionsEngine,
    repository: RepositoryEngine,
    knowledge: KnowledgeRepository,
    db: DatabaseConnection,
    logger: Logger
  ) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.permissions = permissions;
    this.repository = repository;
    this.knowledge = knowledge;
    this.db = db;
    this.logger = logger;
  }

  public static async create(options: RepoDocContextOptions): Promise<RepoDocContext> {
    const projectRoot = path.resolve(options.projectRoot);
    const logger = options.logger ?? new ConsoleLogger('info');

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

    // 4. Initialize SQLite Persistence & run migrations
    let dbPath = options.databasePath;
    if (!dbPath) {
      const repodocDir = path.join(projectRoot, '.repodoc');
      await fs.mkdir(repodocDir, { recursive: true });
      dbPath = path.join(repodocDir, 'repodoc.db');
    }

    const db = new SqliteDatabaseConnection({ path: dbPath });
    const migrator = new MigrationManager(db);
    migrator.runMigrations();

    const knowledge = new KnowledgeRepository(db);

    return new RepoDocContext(projectRoot, config, permissions, repository, knowledge, db, logger);
  }

  public static async createInMemory(
    projectRoot = process.cwd(),
    logger?: Logger
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

    const knowledge = new KnowledgeRepository(db);

    return new RepoDocContext(
      projectRoot,
      config,
      permissions,
      repository,
      knowledge,
      db,
      logger ?? new SilentLogger()
    );
  }

  public async discover(): Promise<ProjectStructure> {
    return this.repository.discover();
  }

  public close(): void {
    this.db.close();
  }
}
