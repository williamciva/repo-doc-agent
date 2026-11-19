import * as crypto from 'node:crypto';
import { KnowledgeItem, KnowledgeCategory } from '@repodoc/shared';
import { AnalysisResult, ParsedFile, SymbolInfo } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';
import { IngestOptions } from './types.js';

export class KnowledgeIngestor {
  public ingestFromAnalysis(
    analysis: AnalysisResult,
    structure: ProjectStructure,
    options: IngestOptions = {}
  ): KnowledgeItem[] {
    const provenance = options.provenance ?? 'confirmed';
    const items: KnowledgeItem[] = [];
    const now = new Date().toISOString();

    // 1. Project-level architecture overview
    const architectureItem = this.buildArchitectureItem(structure, analysis, provenance, now);
    items.push(architectureItem);

    // 2. Per-package module knowledge (monorepos)
    if (structure.isMonorepo) {
      for (const pkg of structure.packages) {
        items.push(this.buildModuleItem(pkg.name, pkg.relativePath, provenance, now));
      }
    }

    // 3. External dependencies
    const externalDepsItem = this.buildDependenciesItem(
      analysis.summary.externalDependencies,
      provenance,
      now
    );
    if (externalDepsItem) {
      items.push(externalDepsItem);
    }

    // 4. Symbols: classes, interfaces, functions
    for (const file of analysis.parsedFiles) {
      const fileSymbolItems = this.buildSymbolItems(file, provenance, now);
      items.push(...fileSymbolItems);
    }

    return items;
  }

  private buildArchitectureItem(
    structure: ProjectStructure,
    analysis: AnalysisResult,
    provenance: KnowledgeItem['provenance'],
    now: string
  ): KnowledgeItem {
    const languages = Object.entries(structure.detectedLanguages)
      .sort(([, a], [, b]) => b.fileCount - a.fileCount)
      .map(([lang, stat]) => `${lang} (${stat.fileCount} files)`)
      .join(', ');

    const content = [
      `Repository: ${structure.rootPath}`,
      `Type: ${structure.isMonorepo ? `Monorepo (${structure.monorepoType ?? 'unknown'})` : 'Single project'}`,
      `Total files: ${structure.totalFiles}`,
      `Languages detected: ${languages || 'none'}`,
      `Total symbols discovered: ${analysis.summary.totalSymbols}`,
      structure.isMonorepo
        ? `Packages: ${structure.packages.map((p) => p.name).join(', ')}`
        : '',
      `Git repository: ${structure.gitInfo.isGitRepo ? `yes (branch: ${structure.gitInfo.currentBranch ?? 'unknown'})` : 'no'}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: this.makeId('architecture:overview'),
      category: 'architecture',
      title: 'Project Architecture Overview',
      content,
      source: 'repository-analysis',
      fileReferences: [],
      symbols: [],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'high',
      provenance,
      approvalStatus: provenance === 'confirmed' ? 'approved' : 'pending',
      relationships: [],
    };
  }

  private buildModuleItem(
    pkgName: string,
    relativePath: string,
    provenance: KnowledgeItem['provenance'],
    now: string
  ): KnowledgeItem {
    return {
      id: this.makeId(`module:${pkgName}`),
      category: 'modules',
      title: `Module: ${pkgName}`,
      content: `Workspace package '${pkgName}' located at '${relativePath}'.`,
      source: `${relativePath}/package.json`,
      fileReferences: [`${relativePath}/package.json`],
      symbols: [],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'certain',
      provenance,
      approvalStatus: provenance === 'confirmed' ? 'approved' : 'pending',
      relationships: [
        {
          targetId: this.makeId('architecture:overview'),
          type: 'relates_to',
          description: 'Part of the project architecture',
        },
      ],
    };
  }

  private buildDependenciesItem(
    deps: string[],
    provenance: KnowledgeItem['provenance'],
    now: string
  ): KnowledgeItem | null {
    if (deps.length === 0) return null;

    return {
      id: this.makeId('dependencies:external'),
      category: 'dependencies',
      title: 'External Dependencies',
      content: `External packages referenced in the codebase:\n${deps.map((d) => `- ${d}`).join('\n')}`,
      source: 'code-analysis',
      fileReferences: [],
      symbols: [],
      discoveredAt: now,
      updatedAt: now,
      confidence: 'high',
      provenance,
      approvalStatus: provenance === 'confirmed' ? 'approved' : 'pending',
      relationships: [
        {
          targetId: this.makeId('architecture:overview'),
          type: 'relates_to',
          description: 'External dependencies of the project',
        },
      ],
    };
  }

  private buildSymbolItems(
    file: ParsedFile,
    provenance: KnowledgeItem['provenance'],
    now: string
  ): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];

    for (const sym of file.symbols) {
      // Only surface exported, significant symbols
      if (!sym.isExported) continue;
      if (sym.kind === 'variable' || sym.kind === 'constant') continue;

      const category = this.symbolKindToCategory(sym.kind);
      const title = this.buildSymbolTitle(sym);

      const content = [
        `${sym.kind.charAt(0).toUpperCase() + sym.kind.slice(1)}: ${sym.name}`,
        sym.docstring ? `Description: ${sym.docstring}` : '',
        `Defined in: ${sym.filePath} (line ${sym.lineStart})`,
        sym.parentSymbol ? `Belongs to: ${sym.parentSymbol}` : '',
        sym.visibility ? `Visibility: ${sym.visibility}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const item: KnowledgeItem = {
        id: this.makeId(sym.id),
        category,
        title,
        content,
        source: sym.filePath,
        fileReferences: [sym.filePath],
        symbols: [sym.name],
        discoveredAt: now,
        updatedAt: now,
        confidence: 'high',
        provenance,
        approvalStatus: provenance === 'confirmed' ? 'approved' : 'pending',
        relationships: sym.parentSymbol
          ? [
              {
                targetId: this.makeId(`${sym.filePath}#${sym.parentSymbol}`),
                type: 'relates_to',
                description: `Member of ${sym.parentSymbol}`,
              },
            ]
          : [],
      };

      items.push(item);
    }

    return items;
  }

  private symbolKindToCategory(kind: SymbolInfo['kind']): KnowledgeCategory {
    switch (kind) {
      case 'class':
        return 'components';
      case 'interface':
        return 'components';
      case 'function':
        return 'functions';
      case 'method':
        return 'functions';
      case 'type_alias':
        return 'technical_rules';
      case 'enum':
        return 'configurations';
      default:
        return 'observations';
    }
  }

  private buildSymbolTitle(sym: SymbolInfo): string {
    const prefix = sym.kind.charAt(0).toUpperCase() + sym.kind.slice(1);
    return sym.parentSymbol
      ? `${prefix}: ${sym.parentSymbol}.${sym.name}`
      : `${prefix}: ${sym.name}`;
  }

  private makeId(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}
