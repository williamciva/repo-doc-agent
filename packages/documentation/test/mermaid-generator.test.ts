import { describe, it, expect } from 'vitest';
import { MermaidGenerator } from '../src/diagrams/mermaid-generator.js';
import { ProjectStructure } from '@repodoc/repository';

describe('MermaidGenerator', () => {
  const generator = new MermaidGenerator();

  it('should generate a monorepo architecture flowchart with sanitized node IDs', () => {
    const structure: ProjectStructure = {
      rootPath: '/workspace',
      isMonorepo: true,
      monorepoType: 'pnpm',
      packages: [
        { name: '@repodoc/shared', path: '/workspace/packages/shared', relativePath: 'packages/shared' },
        { name: '@repodoc/core', path: '/workspace/packages/core', relativePath: 'packages/core' },
      ],
      totalFiles: 10,
      totalBytes: 1024,
      configFiles: [],
      files: [],
      detectedLanguages: { typescript: { fileCount: 10, totalBytes: 1024 } },
      gitInfo: { isGitRepo: false },
    };

    const diagram = generator.generateArchitectureDiagram(structure, {
      '@repodoc/core': ['@repodoc/shared'],
    });

    expect(diagram).toContain('```mermaid');
    expect(diagram).toContain('flowchart TD');
    expect(diagram).toContain('node_repodoc_shared["@repodoc/shared"]');
    expect(diagram).toContain('node_repodoc_core["@repodoc/core"]');
    expect(diagram).toContain('node_repodoc_core --> node_repodoc_shared');
    expect(diagram).toContain('```');
  });

  it('should generate a single-project diagram grouped by language', () => {
    const structure: ProjectStructure = {
      rootPath: '/workspace/my-app',
      isMonorepo: false,
      packages: [],
      totalFiles: 5,
      totalBytes: 500,
      configFiles: [],
      files: [],
      detectedLanguages: {
        typescript: { fileCount: 3, totalBytes: 300 },
        python: { fileCount: 2, totalBytes: 200 },
      },
      gitInfo: { isGitRepo: false },
    };

    const diagram = generator.generateArchitectureDiagram(structure, {});

    expect(diagram).toContain('root_project["my-app"]');
    expect(diagram).toContain('node_lang_typescript["typescript (3)"]');
    expect(diagram).toContain('node_lang_python["python (2)"]');
  });

  it('should handle empty module dependencies gracefully', () => {
    const diagram = generator.generateDependencyDiagram({});
    expect(diagram).toContain('graph LR');
    expect(diagram).toContain('No internal module dependencies detected');
  });
});
