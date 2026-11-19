import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { GitInfo } from './types.js';

export class GitStateInspector {
  public static async inspect(projectRoot: string): Promise<GitInfo> {
    const gitDir = path.join(projectRoot, '.git');

    try {
      const stat = await fs.stat(gitDir);
      if (!stat.isDirectory()) {
        return { isGitRepo: false };
      }

      // Read .git/HEAD
      const headPath = path.join(gitDir, 'HEAD');
      const headContent = (await fs.readFile(headPath, 'utf-8')).trim();

      let currentBranch: string | undefined;
      let headCommit: string | undefined;

      if (headContent.startsWith('ref: ')) {
        const refRelative = headContent.replace('ref: ', '').trim();
        currentBranch = refRelative.replace('refs/heads/', '');

        const refPath = path.join(gitDir, refRelative);
        try {
          headCommit = (await fs.readFile(refPath, 'utf-8')).trim();
        } catch {
          // Ref might be in packed-refs
          const packedRefsPath = path.join(gitDir, 'packed-refs');
          try {
            const packedContent = await fs.readFile(packedRefsPath, 'utf-8');
            for (const line of packedContent.split('\n')) {
              const [commit, ref] = line.trim().split(' ');
              if (ref === refRelative && commit) {
                headCommit = commit;
                break;
              }
            }
          } catch {
            // Cannot resolve commit from packed-refs
          }
        }
      } else {
        // Detached HEAD
        headCommit = headContent;
      }

      return {
        isGitRepo: true,
        currentBranch,
        headCommit,
      };
    } catch {
      return { isGitRepo: false };
    }
  }
}
