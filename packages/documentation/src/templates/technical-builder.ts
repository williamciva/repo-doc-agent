import { KnowledgeCategory, KnowledgeItem } from '@repodoc/shared';
import { AnalysisResult } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';
import { DocLabels } from '../i18n/labels.js';
import { MermaidGenerator } from '../diagrams/mermaid-generator.js';
import { DocumentationDepth, DocumentSection, GeneratedDocument } from '../types.js';
import {
  buildDocumentFromSections,
  depthRank,
  formatKnowledgeItemsSection,
} from './doc-renderer.js';

export interface BuilderContext {
  projectName: string;
  projectDescription?: string;
  structure: ProjectStructure;
  analysis: AnalysisResult;
  itemsByCategory: Map<KnowledgeCategory, KnowledgeItem[]>;
  labels: DocLabels;
  language: string;
  depth: DocumentationDepth;
  generatedAt: string;
}

export class TechnicalDocBuilder {
  private readonly mermaid = new MermaidGenerator();

  public build(ctx: BuilderContext): GeneratedDocument[] {
    const docs: GeneratedDocument[] = [];
    const rank = depthRank(ctx.depth);

    // 1. OVERVIEW.md (all depth levels)
    docs.push(this.buildOverviewDoc(ctx));

    // 2. ARCHITECTURE.md (standard, detailed, comprehensive)
    if (rank >= 2) {
      docs.push(this.buildArchitectureDoc(ctx));
    }

    // 3. COMPONENTS.md (detailed, comprehensive)
    if (rank >= 3) {
      docs.push(this.buildComponentsDoc(ctx));
    }

    // 4. FLOWS_AND_RULES.md (comprehensive)
    if (rank >= 4) {
      docs.push(this.buildFlowsAndRulesDoc(ctx));
    }

    return docs;
  }

  private buildOverviewDoc(ctx: BuilderContext): GeneratedDocument {
    const { structure, analysis, itemsByCategory, labels } = ctx;
    const archItems = itemsByCategory.get('architecture') ?? [];

    const languagesList = Object.entries(structure.detectedLanguages)
      .sort(([, a], [, b]) => b.fileCount - a.fileCount)
      .map(([lang, stat]) => `- \`${lang}\`: ${stat.fileCount} files (${stat.totalBytes} bytes)`)
      .join('\n');

    const summaryContent = [
      ctx.projectDescription ? `${ctx.projectDescription}\n` : '',
      `- **${labels.repositoryType}:** ${structure.isMonorepo ? `${labels.monorepo} (${structure.monorepoType ?? 'workspace'})` : labels.singleProject}`,
      `- **${labels.totalFiles}:** ${structure.totalFiles}`,
      `- **${labels.totalSymbols}:** ${analysis.summary.totalSymbols}`,
      '',
      `### ${labels.languagesDetected}`,
      '',
      languagesList || labels.noDataAvailable,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    const summarySection: DocumentSection = {
      id: 'project-summary',
      title: labels.projectSummary,
      content: summaryContent,
      sourceItemIds: archItems.map((i) => i.id),
      fileReferences: archItems.flatMap((i) => i.fileReferences),
    };

    const diagramSection: DocumentSection = {
      id: 'architecture-diagram',
      title: labels.architectureDiagram,
      content: this.mermaid.generateArchitectureDiagram(structure, analysis.moduleGraph),
      sourceItemIds: archItems.map((i) => i.id),
      fileReferences: [],
    };

    return buildDocumentFromSections({
      relativePath: 'technical/OVERVIEW.md',
      title: `${ctx.projectName} — ${labels.overviewTitle}`,
      audience: 'technical',
      sections: [summarySection, diagramSection],
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }

  private buildArchitectureDoc(ctx: BuilderContext): GeneratedDocument {
    const { structure, analysis, itemsByCategory, labels } = ctx;

    const moduleItems = itemsByCategory.get('modules') ?? [];
    const depItems = itemsByCategory.get('dependencies') ?? [];
    const decisionItems = itemsByCategory.get('decisions') ?? [];
    const configItems = itemsByCategory.get('configurations') ?? [];

    const sections: DocumentSection[] = [
      formatKnowledgeItemsSection(
        'modules',
        labels.modulesSection,
        moduleItems,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'external-dependencies',
        labels.externalDependencies,
        depItems,
        labels.noDataAvailable
      ),
      {
        id: 'internal-dependencies',
        title: labels.internalDependencies,
        content: this.mermaid.generateDependencyDiagram(
          analysis.moduleGraph,
          40,
          structure.rootPath
        ),
        sourceItemIds: moduleItems.map((i) => i.id),
        fileReferences: structure.packages.map((p) => `${p.relativePath}/package.json`),
      },
      formatKnowledgeItemsSection(
        'decisions',
        labels.decisionsSection,
        decisionItems,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'configurations',
        labels.configurationsSection,
        configItems,
        labels.noDataAvailable
      ),
    ];

    return buildDocumentFromSections({
      relativePath: 'technical/ARCHITECTURE.md',
      title: `${ctx.projectName} — ${labels.architectureTitle}`,
      audience: 'technical',
      sections,
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }

  private buildComponentsDoc(ctx: BuilderContext): GeneratedDocument {
    const { itemsByCategory, labels } = ctx;
    const components = itemsByCategory.get('components') ?? [];
    const functions = itemsByCategory.get('functions') ?? [];

    const sections: DocumentSection[] = [
      formatKnowledgeItemsSection(
        'components',
        labels.componentsSection,
        components,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'functions',
        labels.functionsSection,
        functions,
        labels.noDataAvailable
      ),
    ];

    return buildDocumentFromSections({
      relativePath: 'technical/COMPONENTS.md',
      title: `${ctx.projectName} — ${labels.componentsTitle}`,
      audience: 'technical',
      sections,
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }

  private buildFlowsAndRulesDoc(ctx: BuilderContext): GeneratedDocument {
    const { itemsByCategory, labels } = ctx;
    const flows = itemsByCategory.get('flows') ?? [];
    const techRules = itemsByCategory.get('technical_rules') ?? [];
    const integrations = itemsByCategory.get('integrations') ?? [];
    const conventions = itemsByCategory.get('conventions') ?? [];

    const sections: DocumentSection[] = [
      formatKnowledgeItemsSection('flows', labels.flowsSection, flows, labels.noDataAvailable),
      formatKnowledgeItemsSection(
        'technical-rules',
        labels.technicalRulesSection,
        techRules,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'integrations',
        labels.integrationsSection,
        integrations,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'conventions',
        labels.conventionsSection,
        conventions,
        labels.noDataAvailable
      ),
    ];

    return buildDocumentFromSections({
      relativePath: 'technical/FLOWS_AND_RULES.md',
      title: `${ctx.projectName} — ${labels.flowsAndRulesTitle}`,
      audience: 'technical',
      sections,
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }
}
