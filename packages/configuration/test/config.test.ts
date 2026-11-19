import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { ProjectConfigSchema } from '../src/schemas/project.js';
import { loadProjectConfig, findProjectRoot } from '../src/loader.js';

describe('Configuration Engine', () => {
  it('should validate project config schema with defaults', () => {
    const raw = {
      project: {
        name: 'my-project',
      },
    };

    const config = ProjectConfigSchema.parse(raw);
    expect(config.project.name).toBe('my-project');
    expect(config.documentation.language).toBe('en');
    expect(config.documentation.depth).toBe('detailed');
    expect(config.knowledge.approval.mode).toBe('manual');
    expect(config.integrations.mcp.enabled).toBe(true);
  });

  it('should load actual project config from .repodoc/config.yaml', async () => {
    const root = await findProjectRoot(process.cwd());
    expect(root).not.toBeNull();

    if (root) {
      const config = await loadProjectConfig(root);
      expect(config.project.name).toBe('repo-doc-agent');
      expect(config.documentation.language).toBe('en');
      expect(config.knowledge.approval.mode).toBe('manual');
    }
  });
});
