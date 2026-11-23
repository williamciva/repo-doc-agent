import { DocumentSection, GeneratedDocument } from '../types.js';
import { BuilderContext } from './technical-builder.js';
import {
  buildDocumentFromSections,
  depthRank,
  formatKnowledgeItemsSection,
} from './doc-renderer.js';

export class BusinessDocBuilder {
  public build(ctx: BuilderContext): GeneratedDocument[] {
    const docs: GeneratedDocument[] = [];
    const rank = depthRank(ctx.depth);

    // 1. BUSINESS_OVERVIEW.md (all depth levels)
    docs.push(this.buildBusinessOverview(ctx));

    // 2. BUSINESS_RULES.md (detailed, comprehensive)
    if (rank >= 3) {
      docs.push(this.buildBusinessRules(ctx));
    }

    return docs;
  }

  private buildBusinessOverview(ctx: BuilderContext): GeneratedDocument {
    const { itemsByCategory, labels } = ctx;
    const moduleItems = itemsByCategory.get('modules') ?? [];
    const observationItems = itemsByCategory.get('observations') ?? [];

    const objectivesSection: DocumentSection = {
      id: 'system-objectives',
      title: labels.systemObjectives,
      content: ctx.projectDescription ?? `${ctx.projectName} software platform.`,
      sourceItemIds: [],
      fileReferences: [],
    };

    const capabilitiesSection = formatKnowledgeItemsSection(
      'functional-capabilities',
      labels.functionalCapabilities,
      moduleItems,
      labels.noDataAvailable
    );

    const observationsSection = formatKnowledgeItemsSection(
      'observations-qa',
      labels.observationsAndQA,
      observationItems,
      labels.noDataAvailable
    );

    return buildDocumentFromSections({
      relativePath: 'business/BUSINESS_OVERVIEW.md',
      title: `${ctx.projectName} — ${labels.businessOverviewTitle}`,
      audience: 'business',
      sections: [objectivesSection, capabilitiesSection, observationsSection],
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }

  private buildBusinessRules(ctx: BuilderContext): GeneratedDocument {
    const { itemsByCategory, labels } = ctx;
    const businessRules = itemsByCategory.get('business_rules') ?? [];
    const flows = itemsByCategory.get('flows') ?? [];

    const sections: DocumentSection[] = [
      formatKnowledgeItemsSection(
        'business-rules',
        labels.businessRulesSection,
        businessRules,
        labels.noDataAvailable
      ),
      formatKnowledgeItemsSection(
        'business-flows',
        labels.flowsSection,
        flows,
        labels.noDataAvailable
      ),
    ];

    return buildDocumentFromSections({
      relativePath: 'business/BUSINESS_RULES.md',
      title: `${ctx.projectName} — ${labels.businessRulesTitle}`,
      audience: 'business',
      sections,
      labels,
      language: ctx.language,
      depth: ctx.depth,
      generatedAt: ctx.generatedAt,
    });
  }
}
