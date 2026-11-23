import { Logger, SilentLogger } from '@repodoc/shared';
import { DependencyGraph } from '@repodoc/dependency-graph';
import { GitDiffAnalyzer } from './diff-analyzer.js';
import { OutdatedDetector } from './outdated-detector.js';
import { ChangedFile, CommitInfo, GitDiffSummary, OutdatedDocReport } from './types.js';

export interface GitIntelligenceEngineOptions {
  projectRoot: string;
  logger?: Logger;
}

export class GitIntelligenceEngine {
  private readonly diffAnalyzer: GitDiffAnalyzer;
  private readonly outdatedDetector: OutdatedDetector;
  private readonly logger: Logger;

  constructor(options: GitIntelligenceEngineOptions) {
    this.diffAnalyzer = new GitDiffAnalyzer(options.projectRoot);
    this.outdatedDetector = new OutdatedDetector();
    this.logger = options.logger ?? new SilentLogger();
  }

  public async getCurrentCommit(): Promise<string | null> {
    return this.diffAnalyzer.getCurrentCommit();
  }

  public async getWorkingTreeChanges(): Promise<ChangedFile[]> {
    return this.diffAnalyzer.getWorkingTreeChanges();
  }

  public async getDiffBetweenRefs(baseRef: string, targetRef = 'HEAD'): Promise<GitDiffSummary> {
    return this.diffAnalyzer.getDiffBetweenRefs(baseRef, targetRef);
  }

  public async getRecentCommits(limit = 10): Promise<CommitInfo[]> {
    return this.diffAnalyzer.getRecentCommits(limit);
  }

  public detectOutdatedFromChanges(
    graph: DependencyGraph,
    changedFiles: ChangedFile[]
  ): OutdatedDocReport {
    const report = this.outdatedDetector.detect(graph, changedFiles);
    this.logger.info('Outdated documentation detection completed', {
      changedFiles: changedFiles.length,
      outdatedKnowledge: report.outdatedKnowledgeIds.length,
      outdatedDocuments: report.outdatedDocuments.length,
    });
    return report;
  }

  public async detectOutdatedSinceRef(
    graph: DependencyGraph,
    baseRef: string,
    targetRef = 'HEAD'
  ): Promise<OutdatedDocReport> {
    const diff = await this.diffAnalyzer.getDiffBetweenRefs(baseRef, targetRef);
    return this.detectOutdatedFromChanges(graph, diff.changedFiles);
  }
}
