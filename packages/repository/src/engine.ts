import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ProjectConfig } from '@repodoc/configuration';
import { assertSafePath } from '@repodoc/permissions';
import { Logger, SilentLogger } from '@repodoc/shared';
import { FileScanner } from './scanner.js';
import { MonorepoDetector } from './monorepo-detector.js';
import { GitStateInspector } from './git-inspector.js';
import { ProjectStructure } from './types.js';

export interface RepositoryEngineOptions {
  projectRoot: string;
  config?: ProjectConfig;
  logger?: Logger;
}

export class RepositoryEngine {
  public readonly projectRoot: string;
  private readonly config?: ProjectConfig;
  private readonly logger: Logger;
  private cachedStructure: ProjectStructure | null = null;

  constructor(options: RepositoryEngineOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.config = options.config;
    this.logger = options.logger ?? new SilentLogger();
  }

  public async discover(): Promise<ProjectStructure> {
    this.logger.info(`Starting repository discovery for '${this.projectRoot}'`);

    const scanner = new FileScanner({
      projectRoot: this.projectRoot,
      config: this.config?.analysis,
    });

    const [scanResult, monorepoInfo, gitInfo] = await Promise.all([
      scanner.scan(),
      MonorepoDetector.detect(this.projectRoot),
      GitStateInspector.inspect(this.projectRoot),
    ]);

    const structure: ProjectStructure = {
      rootPath: this.projectRoot,
      isMonorepo: monorepoInfo.isMonorepo,
      monorepoType: monorepoInfo.type,
      packages: monorepoInfo.packages,
      detectedLanguages: scanResult.languages,
      totalFiles: scanResult.files.length,
      totalBytes: scanResult.totalBytes,
      configFiles: scanResult.configFiles,
      gitInfo,
      files: scanResult.files,
    };

    this.cachedStructure = structure;
    this.logger.info(
      `Discovered ${structure.totalFiles} files across ${Object.keys(structure.detectedLanguages).length} languages. Monorepo: ${structure.isMonorepo}`
    );

    return structure;
  }

  public async readFile(targetPath: string): Promise<string> {
    const safePath = assertSafePath(targetPath, this.projectRoot);
    return fs.readFile(safePath, 'utf-8');
  }

  public async readBuffer(targetPath: string): Promise<Buffer> {
    const safePath = assertSafePath(targetPath, this.projectRoot);
    return fs.readFile(safePath);
  }

  public async getStructure(): Promise<ProjectStructure> {
    if (!this.cachedStructure) {
      return this.discover();
    }
    return this.cachedStructure;
  }
}
