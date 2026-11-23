import { KnowledgeItem } from '@repodoc/shared';
import { ProjectStructure } from '@repodoc/repository';
import { AnalysisResult } from '@repodoc/analyzer';

export type DocumentationDepth = 'overview' | 'standard' | 'detailed' | 'comprehensive';

export type DocumentationAudience = 'technical' | 'business' | 'all';

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  sourceItemIds: string[];
  fileReferences: string[];
}

export interface GeneratedDocument {
  relativePath: string;
  title: string;
  audience: 'technical' | 'business';
  content: string;
  sections: DocumentSection[];
  sourceItemIds: string[];
  generatedAt: string;
  language: string;
  depth: DocumentationDepth;
}

export interface DocumentationInput {
  structure: ProjectStructure;
  analysis: AnalysisResult;
  knowledgeItems: KnowledgeItem[];
}

export interface DocumentationGenerateOptions {
  projectName: string;
  projectDescription?: string;
  language?: string;
  depth?: DocumentationDepth;
  audience?: DocumentationAudience;
  outputDir?: string;
  previewOnly?: boolean;
  includeUnapproved?: boolean;
}

export interface DocumentationResult {
  documents: GeneratedDocument[];
  writtenPaths: string[];
  previewOnly: boolean;
  language: string;
  depth: DocumentationDepth;
}
