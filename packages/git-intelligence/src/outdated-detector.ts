import { DependencyGraph, ImpactAnalyzer } from '@repodoc/dependency-graph';
import { ChangedFile, OutdatedDocReport, UpdateProposal } from './types.js';

export class OutdatedDetector {
  private readonly impactAnalyzer = new ImpactAnalyzer();

  public detect(
    graph: DependencyGraph,
    changedFiles: ChangedFile[]
  ): OutdatedDocReport {
    const filePaths = changedFiles.map((f) => f.path);
    const impact = this.impactAnalyzer.analyzeImpact(graph, filePaths);

    const directSet = new Set(filePaths);
    const updateProposals: UpdateProposal[] = impact.impactedDocuments.map((docPath) => {
      const docNode = graph.getNode(`doc:${docPath}`);
      const relatedKnowledgeIds: string[] = [];

      if (docNode) {
        for (const edge of graph.getIncoming(docNode.id)) {
          if (edge.type === 'documented_by') {
            const kId = edge.source.replace(/^knowledge:/, '');
            if (impact.impactedKnowledgeIds.includes(kId)) {
              relatedKnowledgeIds.push(kId);
            }
          }
        }
      }

      const hasDirectChange = filePaths.some((fp) => {
        const fileNode = graph.getNode(`file:${fp}`);
        if (!fileNode) return false;
        return graph.getOutgoing(fileNode.id).some(
          (e) =>
            e.type === 'relates_to' &&
            relatedKnowledgeIds.includes(e.target.replace(/^knowledge:/, ''))
        );
      });

      const priority: UpdateProposal['priority'] =
        hasDirectChange || directSet.size > 0 && relatedKnowledgeIds.length > 0
          ? hasDirectChange
            ? 'high'
            : 'medium'
          : 'low';

      return {
        targetDocument: docPath,
        reason: hasDirectChange
          ? 'Source file directly referenced by documented knowledge items was modified.'
          : 'Transitive dependency of documented components was modified.',
        affectedKnowledgeIds: relatedKnowledgeIds,
        triggerFiles: filePaths,
        priority,
      };
    });

    const isOutdated =
      impact.impactedKnowledgeIds.length > 0 || impact.impactedDocuments.length > 0;

    return {
      isOutdated,
      changedFiles,
      impact,
      outdatedKnowledgeIds: impact.impactedKnowledgeIds,
      outdatedDocuments: impact.impactedDocuments,
      updateProposals,
    };
  }
}
