import { describe, it, expect } from 'vitest';
import { MonorepoDetector } from '../src/monorepo-detector.js';

describe('Monorepo Detector', () => {
  it('should detect pnpm monorepo in the current repository', async () => {
    const info = await MonorepoDetector.detect(process.cwd());
    expect(info.isMonorepo).toBe(true);
    expect(info.type).toBe('pnpm');
    expect(info.packages.length).toBeGreaterThanOrEqual(4);

    const packageNames = info.packages.map((p) => p.name);
    expect(packageNames).toContain('@repodoc/shared');
    expect(packageNames).toContain('@repodoc/configuration');
    expect(packageNames).toContain('@repodoc/permissions');
    expect(packageNames).toContain('@repodoc/persistence');
  });
});
