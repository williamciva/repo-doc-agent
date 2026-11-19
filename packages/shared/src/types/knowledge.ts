export type KnowledgeCategory =
  | 'architecture'
  | 'modules'
  | 'components'
  | 'classes'
  | 'functions'
  | 'flows'
  | 'integrations'
  | 'apis'
  | 'entities'
  | 'business_rules'
  | 'technical_rules'
  | 'decisions'
  | 'configurations'
  | 'dependencies'
  | 'processes'
  | 'conventions'
  | 'constraints'
  | 'observations';

export type KnowledgeProvenance = 'confirmed' | 'inferred' | 'pending';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'certain';

export type RelationshipType =
  | 'depends_on'
  | 'implements'
  | 'calls'
  | 'affects'
  | 'relates_to'
  | 'derived_from';

export interface KnowledgeRelationship {
  targetId: string;
  type: RelationshipType;
  description?: string;
}

export interface KnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  source: string;
  fileReferences: string[];
  symbols: string[];
  discoveredAt: string;
  updatedAt: string;
  confidence: ConfidenceLevel;
  provenance: KnowledgeProvenance;
  approvalStatus: ApprovalStatus;
  relationships: KnowledgeRelationship[];
  metadata?: Record<string, unknown>;
}
