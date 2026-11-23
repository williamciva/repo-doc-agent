import { DependencyGraph } from './graph.js';
import { ImpactReport } from './types.js';

export class ImpactAnalyzer {
  public analyzeImpact(graph: DependencyGraph, changedFiles: string[]): ImpactReport {
    const normalizedChanges = changedFiles.map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));
    const seedIds = normalizedChanges.map((f) => `file:${f}`);

    const impactedIds = graph.findImpactedNodeIds(seedIds);

    const impactedFiles = new Set<string>(normalizedChanges);
    const impactedModules = new Set<string>();
    const impactedSymbols = new Set<string>();
    const impactedKnowledgeIds = new Set<string>();
    const impactedDocuments = new Set<string>();

    for (const id of impactedIds) {
      const node = graph.getNode(id);
      if (!node) continue;

      switch (node.type) {
        case 'file':
          if (node.filePath) impactedFiles.add(node.filePath);
          break;
        case 'module':
          impactedModules.add(node.label);
          break;
        case 'symbol':
          impactedSymbols.add(node.label);
          break;
        case 'knowledge':
          impactedKnowledgeIds.add(id.replace(/^knowledge:/, ''));
          break;
        case 'document':
          if (node.filePath) impactedDocuments.add(node.filePath);
          break;
      }
    }

    return {
      changedFiles: normalizedChanges,
      impactedFiles: Array.from(impactedFiles),
      impactedModules: Array.from(impactedModules),
      impactedSymbols: Array.from(impactedSymbols),
      impactedKnowledgeIds: Array.from(impactedKnowledgeIds),
      impactedDocuments: Array.from(impactedDocuments),
    };
  }
}
