import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ChangedFile, CommitInfo, FileChangeStatus, GitDiffSummary } from './types.js';

const execFileAsync = promisify(execFile);

const SAFE_GIT_REF_REGEX = /^[a-zA-Z0-9._\-/^~@]+$/;

export function assertSafeGitRef(ref: string): string {
  if (!ref || ref.startsWith('-') || !SAFE_GIT_REF_REGEX.test(ref)) {
    throw new Error(`Invalid or unsafe git ref: '${ref}'`);
  }
  return ref;
}

export class GitDiffAnalyzer {
  constructor(private readonly projectRoot: string) {}

  public async getCurrentCommit(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
        cwd: this.projectRoot,
      });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  public async getWorkingTreeChanges(): Promise<ChangedFile[]> {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd: this.projectRoot,
    });
    return this.parsePorcelainStatus(stdout);
  }

  public async getDiffBetweenRefs(baseRef: string, targetRef = 'HEAD'): Promise<GitDiffSummary> {
    const safeBase = assertSafeGitRef(baseRef);
    const safeTarget = assertSafeGitRef(targetRef);

    const [{ stdout: nameStatusOut }, { stdout: numstatOut }] = await Promise.all([
      execFileAsync('git', ['diff', '--name-status', safeBase, safeTarget], {
        cwd: this.projectRoot,
      }),
      execFileAsync('git', ['diff', '--numstat', safeBase, safeTarget], {
        cwd: this.projectRoot,
      }),
    ]);

    const files = this.parseDiffNameStatus(nameStatusOut);
    const stats = this.parseDiffNumstat(numstatOut);

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const file of files) {
      const stat = stats.get(file.path);
      if (stat) {
        file.additions = stat.additions;
        file.deletions = stat.deletions;
        totalAdditions += stat.additions;
        totalDeletions += stat.deletions;
      }
    }

    return {
      baseRef: safeBase,
      targetRef: safeTarget,
      changedFiles: files,
      totalAdditions,
      totalDeletions,
    };
  }

  public async getRecentCommits(limit = 10): Promise<CommitInfo[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const { stdout } = await execFileAsync(
      'git',
      ['log', `-n`, String(safeLimit), '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s'],
      { cwd: this.projectRoot }
    );

    const commits: CommitInfo[] = [];
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [hash, shortHash, author, date, message] = line.split('\x1f');
      if (hash && shortHash) {
        commits.push({
          hash,
          shortHash,
          author: author ?? '',
          date: date ?? '',
          message: message ?? '',
        });
      }
    }
    return commits;
  }

  public parsePorcelainStatus(output: string): ChangedFile[] {
    const results: ChangedFile[] = [];
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const code = line.slice(0, 2);
      const rawPath = line.slice(3).trim();

      let status: FileChangeStatus = 'modified';
      let filePath = rawPath;
      let previousPath: string | undefined;

      if (code === '??') {
        status = 'untracked';
      } else if (code.includes('A')) {
        status = 'added';
      } else if (code.includes('D')) {
        status = 'deleted';
      } else if (code.includes('R') && rawPath.includes(' -> ')) {
        status = 'renamed';
        const parts = rawPath.split(' -> ');
        previousPath = parts[0];
        filePath = parts[1] ?? rawPath;
      }

      results.push({ path: filePath.replace(/\\/g, '/'), previousPath, status });
    }
    return results;
  }

  public parseDiffNameStatus(output: string): ChangedFile[] {
    const results: ChangedFile[] = [];
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      const code = parts[0] ?? '';

      if (code.startsWith('R') && parts.length >= 3) {
        results.push({
          status: 'renamed',
          previousPath: parts[1]!.replace(/\\/g, '/'),
          path: parts[2]!.replace(/\\/g, '/'),
        });
      } else if (parts[1]) {
        let status: FileChangeStatus = 'modified';
        if (code === 'A') status = 'added';
        else if (code === 'D') status = 'deleted';

        results.push({
          status,
          path: parts[1].replace(/\\/g, '/'),
        });
      }
    }
    return results;
  }

  public parseDiffNumstat(
    output: string
  ): Map<string, { additions: number; deletions: number }> {
    const map = new Map<string, { additions: number; deletions: number }>();
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;

      const additions = parts[0] === '-' ? 0 : Number.parseInt(parts[0]!, 10) || 0;
      const deletions = parts[1] === '-' ? 0 : Number.parseInt(parts[1]!, 10) || 0;
      const filePath = parts[2]!.replace(/\\/g, '/');

      map.set(filePath, { additions, deletions });
    }
    return map;
  }
}
