import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { RepositoryEngine } from '../src/engine.js';
import { PermissionDeniedError } from '@repodoc/shared';

describe('Repository Engine', () => {
  const root = process.cwd();
  const engine = new RepositoryEngine({ projectRoot: root });

  it('should discover repository structure accurately', async () => {
    const structure = await engine.discover();

    expect(structure.rootPath).toBe(root);
    expect(structure.isMonorepo).toBe(true);
    expect(structure.monorepoType).toBe('pnpm');
    expect(structure.totalFiles).toBeGreaterThan(10);
    expect(structure.detectedLanguages['typescript']).toBeDefined();
    expect(structure.gitInfo.isGitRepo).toBe(true);
    expect(structure.gitInfo.currentBranch).toBe('main');

    // Ensure ignored files like dist/ or node_modules/ are not present
    const distFiles = structure.files.filter((f) => f.relativePath.includes('dist/'));
    expect(distFiles).toHaveLength(0);
  });

  it('should safely read authorized files', async () => {
    const content = await engine.readFile(path.join(root, 'package.json'));
    expect(content).toContain('"name": "repo-doc-agent"');
  });

  it('should reject path traversal when reading files', async () => {
    await expect(engine.readFile(path.join(root, '../../etc/passwd'))).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
