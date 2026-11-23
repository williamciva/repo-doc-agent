import { KnowledgeItem } from '@repodoc/shared';
import { DocLabels } from '../i18n/labels.js';
import { DocumentationDepth, DocumentSection, GeneratedDocument } from '../types.js';

export function buildDocumentFromSections(params: {
  relativePath: string;
  title: string;
  audience: 'technical' | 'business';
  sections: DocumentSection[];
  labels: DocLabels;
  language: string;
  depth: DocumentationDepth;
  generatedAt: string;
}): GeneratedDocument {
  const { relativePath, title, audience, sections, labels, language, depth, generatedAt } = params;

  const allSourceIds = Array.from(new Set(sections.flatMap((s) => s.sourceItemIds)));
  const allFileRefs = Array.from(new Set(sections.flatMap((s) => s.fileReferences)));

  const header = [
    `# ${title}`,
    '',
    `> ${labels.languageLabel}: \`${language}\` | ${labels.depthLabel}: \`${depth}\` | ${labels.generatedAtLabel}: \`${generatedAt}\``,
    '',
  ].join('\n');

  const body = sections
    .map((sec) => {
      const traceFooter =
        sec.sourceItemIds.length > 0
          ? `\n<!-- traceability: ${sec.sourceItemIds.join(', ')} -->`
          : '';
      return `## ${sec.title}\n\n${sec.content}${traceFooter}`;
    })
    .join('\n\n');

  const traceabilityLines: string[] = [
    `## ${labels.traceabilityTitle}`,
    '',
    `- **${labels.sourceItemsLabel}:** ${allSourceIds.length > 0 ? allSourceIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    `- **${labels.referencedFilesLabel}:** ${allFileRefs.length > 0 ? allFileRefs.map((f) => `\`${f}\``).join(', ') : 'none'}`,
  ];

  const content = `${header}\n${body}\n\n${traceabilityLines.join('\n')}\n`;

  return {
    relativePath,
    title,
    audience,
    content,
    sections,
    sourceItemIds: allSourceIds,
    generatedAt,
    language,
    depth,
  };
}

export function normalizeRelativeRef(ref: string, rootPath?: string): string {
  const normRef = ref.replace(/\\/g, '/');
  if (!rootPath) return normRef;
  const normRoot = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');
  if (normRoot && normRef.toLowerCase().startsWith(`${normRoot.toLowerCase()}/`)) {
    return normRef.slice(normRoot.length + 1);
  }
  return normRef;
}

export function formatKnowledgeItemsSection(
  id: string,
  title: string,
  items: KnowledgeItem[],
  emptyMessage: string,
  rootPath?: string
): DocumentSection {
  if (items.length === 0) {
    return {
      id,
      title,
      content: emptyMessage,
      sourceItemIds: [],
      fileReferences: [],
    };
  }

  const lines: string[] = [];
  const sourceItemIds: string[] = [];
  const fileReferences = new Set<string>();

  for (const item of items) {
    sourceItemIds.push(item.id);
    const relRefs = item.fileReferences.map((f) => normalizeRelativeRef(f, rootPath));
    for (const ref of relRefs) {
      fileReferences.add(ref);
    }

    lines.push(`### ${item.title}`);
    lines.push('');
    lines.push(item.content);
    if (relRefs.length > 0) {
      lines.push('');
      lines.push(`- Sources: ${relRefs.map((f) => `\`${f}\``).join(', ')}`);
    }
    lines.push('');
  }

  return {
    id,
    title,
    content: lines.join('\n').trimEnd(),
    sourceItemIds,
    fileReferences: Array.from(fileReferences),
  };
}

export function depthRank(depth: DocumentationDepth): number {
  switch (depth) {
    case 'overview':
      return 1;
    case 'standard':
      return 2;
    case 'detailed':
      return 3;
    case 'comprehensive':
      return 4;
  }
}
