import { z } from 'zod';

export const KnowledgeCategorySchema = z.enum([
  'architecture',
  'modules',
  'components',
  'classes',
  'functions',
  'flows',
  'integrations',
  'apis',
  'entities',
  'business_rules',
  'technical_rules',
  'decisions',
  'configurations',
  'dependencies',
  'processes',
  'conventions',
  'constraints',
  'observations',
]);

export const KnowledgeProvenanceSchema = z.enum(['confirmed', 'inferred', 'pending']);

export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const ConfidenceLevelSchema = z.enum(['low', 'medium', 'high', 'certain']);

export const RelationshipTypeSchema = z.enum([
  'depends_on',
  'implements',
  'calls',
  'affects',
  'relates_to',
  'derived_from',
]);

export const KnowledgeRelationshipSchema = z.object({
  targetId: z.string().min(1),
  type: RelationshipTypeSchema,
  description: z.string().optional(),
});

export const KnowledgeItemSchema = z.object({
  id: z.string().min(1),
  category: KnowledgeCategorySchema,
  title: z.string().min(1),
  content: z.string(),
  source: z.string().min(1),
  fileReferences: z.array(z.string()).default([]),
  symbols: z.array(z.string()).default([]),
  discoveredAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  confidence: ConfidenceLevelSchema,
  provenance: KnowledgeProvenanceSchema,
  approvalStatus: ApprovalStatusSchema,
  relationships: z.array(KnowledgeRelationshipSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
});
