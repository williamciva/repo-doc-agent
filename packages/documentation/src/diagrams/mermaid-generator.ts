import { ProjectStructure } from '@repodoc/repository';

export class MermaidGenerator {
  /**
   * Generates a Mermaid flowchart representing the project's package/module architecture.
   */
  public generateArchitectureDiagram(
    structure: ProjectStructure,
    moduleDependencies: Record<string, string[]>
  ): string {
    const lines: string[] = ['```mermaid', 'flowchart TD'];

    if (structure.isMonorepo && structure.packages.length > 0) {
      const pkgNames = new Set(structure.packages.map((p) => p.name));

      for (const pkg of structure.packages) {
        const nodeId = this.sanitizeId(pkg.name);
        lines.push(`  ${nodeId}["${this.escapeLabel(pkg.name)}"]`);
      }

      const edges = new Set<string>();
      for (const [source, targets] of Object.entries(moduleDependencies)) {
        const sourceId = this.sanitizeId(source);
        if (!pkgNames.has(source)) continue;

        for (const target of targets) {
          if (pkgNames.has(target) && source !== target) {
            const targetId = this.sanitizeId(target);
            const edge = `  ${sourceId} --> ${targetId}`;
            if (!edges.has(edge)) {
              edges.add(edge);
              lines.push(edge);
            }
          }
        }
      }
    } else {
      const rootId = 'root_project';
      lines.push(`  ${rootId}["${this.escapeLabel(structure.rootPath.split(/[/\\]/).pop() || 'Project')}"]`);

      const langEntries = Object.entries(structure.detectedLanguages);
      for (const [lang, stat] of langEntries) {
        const langId = this.sanitizeId(`lang_${lang}`);
        lines.push(`  ${langId}["${this.escapeLabel(`${lang} (${stat.fileCount})`)}"]`);
        lines.push(`  ${rootId} --> ${langId}`);
      }
    }

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Generates a Mermaid dependency graph for module/file dependencies.
   */
  public generateDependencyDiagram(
    moduleDependencies: Record<string, string[]>,
    maxEdges = 40
  ): string {
    const lines: string[] = ['```mermaid', 'graph LR'];
    const declaredNodes = new Set<string>();
    let edgeCount = 0;

    for (const [source, targets] of Object.entries(moduleDependencies)) {
      if (edgeCount >= maxEdges) break;
      const sourceId = this.sanitizeId(source);

      for (const target of targets) {
        if (edgeCount >= maxEdges) break;
        if (source === target) continue;

        const targetId = this.sanitizeId(target);
        if (!declaredNodes.has(sourceId)) {
          lines.push(`  ${sourceId}["${this.escapeLabel(source)}"]`);
          declaredNodes.add(sourceId);
        }
        if (!declaredNodes.has(targetId)) {
          lines.push(`  ${targetId}["${this.escapeLabel(target)}"]`);
          declaredNodes.add(targetId);
        }

        lines.push(`  ${sourceId} --> ${targetId}`);
        edgeCount++;
      }
    }

    if (edgeCount === 0) {
      lines.push('  empty["No internal module dependencies detected"]');
    }

    lines.push('```');
    return lines.join('\n');
  }

  private sanitizeId(raw: string): string {
    const sanitized = raw.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '');
    return sanitized.length > 0 ? `node_${sanitized}` : 'node_unknown';
  }

  private escapeLabel(raw: string): string {
    return raw.replace(/"/g, "'");
  }
}
