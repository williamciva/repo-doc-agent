import { describe, it, expect } from 'vitest';
import { AnalyzerEngine } from '../src/engine.js';
import { FileInfo } from '@repodoc/repository';

describe('AnalyzerEngine', () => {
  const engine = new AnalyzerEngine();

  it('should analyze multiple files and build module dependencies', async () => {
    const mockFiles: FileInfo[] = [
      {
        path: '/workspace/src/math.ts',
        relativePath: 'src/math.ts',
        language: 'typescript',
        extension: '.ts',
        sizeBytes: 100,
        hash: 'hash1',
        lastModified: new Date().toISOString(),
        isBinary: false,
      },
    ];

    const tsContent = `
      import { Logger } from '@repodoc/shared';
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const parsed = await engine.analyzeFile(mockFiles[0]!.path, mockFiles[0]!.language, tsContent);
    expect(parsed.symbols).toHaveLength(1);
    expect(parsed.symbols[0]?.name).toBe('add');
    expect(parsed.dependencies).toContain('@repodoc/shared');
  });
});
