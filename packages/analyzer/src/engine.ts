import * as fs from 'node:fs/promises';
import { Logger, SilentLogger } from '@repodoc/shared';
import { FileInfo } from '@repodoc/repository';
import { ParserRegistry } from './parsers/registry.js';
import {
  AnalysisResult,
  ParsedFile,
  SymbolInfo,
  SymbolKind,
  AnalysisSummary,
} from './types.js';

export interface AnalyzerEngineOptions {
  registry?: ParserRegistry;
  logger?: Logger;
}

export class AnalyzerEngine {
  private readonly registry: ParserRegistry;
  private readonly logger: Logger;

  constructor(options: AnalyzerEngineOptions = {}) {
    this.registry = options.registry ?? new ParserRegistry();
    this.logger = options.logger ?? new SilentLogger();
  }

  public async analyzeFile(filePath: string, language: string, content?: string): Promise<ParsedFile> {
    const fileContent = content ?? (await fs.readFile(filePath, 'utf-8'));
    const parser = this.registry.getParser(language, filePath);

    this.logger.debug(`Parsing '${filePath}' using parser '${parser.id}'`);
    return parser.parse(filePath, fileContent);
  }

  public async analyzeFiles(files: FileInfo[]): Promise<AnalysisResult> {
    const codeFiles = files.filter((f) => !f.isBinary && f.language !== 'binary');
    this.logger.info(`Starting code analysis on ${codeFiles.length} files`);

    const parsedFiles: ParsedFile[] = [];
    const allSymbols: SymbolInfo[] = [];
    const moduleGraph: Record<string, string[]> = {};
    const externalDepsSet = new Set<string>();
    const internalDepsSet = new Set<string>();

    const symbolsByKind: Record<SymbolKind, number> = {
      class: 0,
      interface: 0,
      function: 0,
      method: 0,
      type_alias: 0,
      enum: 0,
      variable: 0,
      constant: 0,
    };

    for (const file of codeFiles) {
      try {
        const parsed = await this.analyzeFile(file.path, file.language);
        parsedFiles.push(parsed);

        // Accumulate symbols
        for (const sym of parsed.symbols) {
          allSymbols.push(sym);
          if (symbolsByKind[sym.kind] !== undefined) {
            symbolsByKind[sym.kind]++;
          }
        }

        // Build module graph
        moduleGraph[parsed.filePath] = parsed.dependencies;

        for (const dep of parsed.dependencies) {
          if (dep.startsWith('.') || dep.startsWith('/') || dep.startsWith('\\')) {
            internalDepsSet.add(dep);
          } else {
            externalDepsSet.add(dep);
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to parse file '${file.path}': ${String(err)}`);
      }
    }

    const summary: AnalysisSummary = {
      totalFilesAnalyzed: parsedFiles.length,
      totalSymbols: allSymbols.length,
      symbolsByKind,
      externalDependencies: Array.from(externalDepsSet).sort(),
      internalDependencies: Array.from(internalDepsSet).sort(),
    };

    this.logger.info(
      `Analysis complete: ${summary.totalSymbols} symbols discovered in ${summary.totalFilesAnalyzed} files`
    );

    return {
      parsedFiles,
      allSymbols,
      moduleGraph,
      summary,
    };
  }
}
