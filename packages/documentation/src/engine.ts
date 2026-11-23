import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { KnowledgeCategory, KnowledgeItem, Logger, SilentLogger } from '@repodoc/shared';
import { PermissionsEngine, assertSafePath } from '@repodoc/permissions';
import { getLabelsForLanguage } from './i18n/labels.js';
import { TechnicalDocBuilder, BuilderContext } from './templates/technical-builder.js';
import { BusinessDocBuilder } from './templates/business-builder.js';
import {
  DocumentationGenerateOptions,
  DocumentationInput,
  DocumentationResult,
  GeneratedDocument,
} from './types.js';

export interface DocumentationEngineOptions {
  projectRoot: string;
  permissions: PermissionsEngine;
  logger?: Logger;
}

export class DocumentationEngine {
  private readonly projectRoot: string;
  private readonly permissions: PermissionsEngine;
  private readonly logger: Logger;
  private readonly technicalBuilder = new TechnicalDocBuilder();
  private readonly businessBuilder = new BusinessDocBuilder();

  constructor(options: DocumentationEngineOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.permissions = options.permissions;
    this.logger = options.logger ?? new SilentLogger();
  }

  /**
   * Generate documentation in memory without writing any files to disk.
   */
  public preview(
    input: DocumentationInput,
    options: DocumentationGenerateOptions
  ): DocumentationResult {
    return this.buildDocuments(input, { ...options, previewOnly: true });
  }

  /**
   * Generate documentation and optionally write it to disk (requires 'docs_write' permission).
   */
  public async generate(
    input: DocumentationInput,
    options: DocumentationGenerateOptions
  ): Promise<DocumentationResult> {
    const result = this.buildDocuments(input, options);

    if (options.previewOnly) {
      return result;
    }

    const outputBase = path.resolve(this.projectRoot, options.outputDir ?? './docs/repodoc');
    assertSafePath(outputBase, this.projectRoot);

    const writtenPaths: string[] = [];

    for (const doc of result.documents) {
      const targetPath = path.resolve(outputBase, doc.relativePath);
      const safeTarget = assertSafePath(targetPath, this.projectRoot);

      // Enforce explicit authorization via PermissionsEngine before any physical write
      this.permissions.assertAuthorized('docs_write', safeTarget);

      await fs.mkdir(path.dirname(safeTarget), { recursive: true });
      await fs.writeFile(safeTarget, doc.content, 'utf-8');
      writtenPaths.push(safeTarget);

      this.logger.info(`Generated documentation file: ${doc.relativePath}`, {
        path: safeTarget,
        sourceItems: doc.sourceItemIds.length,
      });
    }

    return {
      ...result,
      writtenPaths,
      previewOnly: false,
    };
  }

  private buildDocuments(
    input: DocumentationInput,
    options: DocumentationGenerateOptions
  ): DocumentationResult {
    const language = options.language ?? 'en';
    const depth = options.depth ?? 'detailed';
    const audience = options.audience ?? 'all';
    const generatedAt = new Date().toISOString();
    const labels = getLabelsForLanguage(language);

    const eligibleItems = options.includeUnapproved
      ? input.knowledgeItems.filter((i) => i.approvalStatus !== 'rejected')
      : input.knowledgeItems.filter((i) => i.approvalStatus === 'approved');

    const itemsByCategory = this.groupByCategory(eligibleItems);

    const ctx: BuilderContext = {
      projectName: options.projectName,
      projectDescription: options.projectDescription,
      structure: input.structure,
      analysis: input.analysis,
      itemsByCategory,
      labels,
      language,
      depth,
      generatedAt,
    };

    const documents: GeneratedDocument[] = [];

    if (audience === 'all' || audience === 'technical') {
      documents.push(...this.technicalBuilder.build(ctx));
    }

    if (audience === 'all' || audience === 'business') {
      documents.push(...this.businessBuilder.build(ctx));
    }

    return {
      documents,
      writtenPaths: [],
      previewOnly: Boolean(options.previewOnly),
      language,
      depth,
    };
  }

  private groupByCategory(items: KnowledgeItem[]): Map<KnowledgeCategory, KnowledgeItem[]> {
    const map = new Map<KnowledgeCategory, KnowledgeItem[]>();
    for (const item of items) {
      const existing = map.get(item.category);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.category, [item]);
      }
    }
    return map;
  }
}
