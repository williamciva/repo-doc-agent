import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import fg from 'fast-glob';
import createIgnore from 'ignore';
import { AnalysisConfig } from '@repodoc/configuration';
import { LanguageDetector } from './language-detector.js';
import { FileInfo, LanguageStat } from './types.js';

export interface ScanOptions {
  projectRoot: string;
  config?: AnalysisConfig;
  maxFileSize?: number; // default: 10MB
}

export class FileScanner {
  private readonly projectRoot: string;
  private readonly includePatterns: string[];
  private readonly excludePatterns: string[];
  private readonly maxFileSize: number;

  constructor(options: ScanOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.includePatterns = options.config?.include ?? ['**/*'];
    this.excludePatterns = options.config?.exclude ?? [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '.repodoc/**',
    ];
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024;
  }

  public async scan(): Promise<{
    files: FileInfo[];
    languages: Record<string, LanguageStat>;
    configFiles: string[];
    totalBytes: number;
  }> {
    const gitignoreFilter = await this.loadGitignore();

    const matches = await fg(this.includePatterns, {
      cwd: this.projectRoot,
      dot: true,
      onlyFiles: true,
      ignore: this.excludePatterns,
      absolute: false,
    });

    const files: FileInfo[] = [];
    const languages: Record<string, LanguageStat> = {};
    const configFiles: string[] = [];
    let totalBytes = 0;

    for (const relativePath of matches) {
      const normalizedRelative = relativePath.replace(/\\/g, '/');

      // Check if ignored by .gitignore
      if (gitignoreFilter && gitignoreFilter.ignores(normalizedRelative)) {
        continue;
      }

      const absolutePath = path.join(this.projectRoot, relativePath);

      try {
        const stat = await fs.stat(absolutePath);
        if (stat.size > this.maxFileSize) {
          continue;
        }

        // Sample up to first 8KB to detect binary vs text and compute full hash
        const buffer = await fs.readFile(absolutePath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        const detection = LanguageDetector.detect(absolutePath, buffer);

        const info: FileInfo = {
          path: absolutePath,
          relativePath: normalizedRelative,
          language: detection.language,
          extension: path.extname(absolutePath).toLowerCase(),
          sizeBytes: stat.size,
          hash,
          lastModified: stat.mtime.toISOString(),
          isBinary: detection.isBinary,
        };

        files.push(info);
        totalBytes += stat.size;

        if (detection.category === 'config') {
          configFiles.push(normalizedRelative);
        }

        if (!languages[detection.language]) {
          languages[detection.language] = { fileCount: 0, totalBytes: 0 };
        }
        languages[detection.language]!.fileCount++;
        languages[detection.language]!.totalBytes += stat.size;
      } catch {
        // Skip unreadable files safely
      }
    }

    return {
      files,
      languages,
      configFiles,
      totalBytes,
    };
  }

  private async loadGitignore(): Promise<ReturnType<typeof createIgnore> | null> {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const ig = createIgnore();
      ig.add(content);
      return ig;
    } catch {
      return null;
    }
  }
}
