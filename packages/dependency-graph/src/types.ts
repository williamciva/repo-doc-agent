export type GraphNodeType = 'file' | 'module' | 'symbol' | 'knowledge' | 'document';

export type GraphEdgeType =
  | 'imports'
  | 'defines'
  | 'depends_on'
  | 'relates_to'
  | 'documented_by';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface ImpactReport {
  changedFiles: string[];
  impactedFiles: string[];
  impactedModules: string[];
  impactedSymbols: string[];
  impactedKnowledgeIds: string[];
  impactedDocuments: string[];
}
