export type SymbolKind =
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'type_alias'
  | 'enum'
  | 'variable'
  | 'constant';

export interface SymbolInfo {
  id: string;
  name: string;
  kind: SymbolKind;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  docstring?: string;
  visibility?: 'public' | 'private' | 'protected';
  isExported: boolean;
  parentSymbol?: string;
}

export interface ImportInfo {
  source: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  kind?: SymbolKind;
  line: number;
}

export interface ParsedFile {
  filePath: string;
  language: string;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  parserUsed: string;
}

export interface AnalysisSummary {
  totalFilesAnalyzed: number;
  totalSymbols: number;
  symbolsByKind: Record<SymbolKind, number>;
  externalDependencies: string[];
  internalDependencies: string[];
}

export interface AnalysisResult {
  parsedFiles: ParsedFile[];
  allSymbols: SymbolInfo[];
  moduleGraph: Record<string, string[]>;
  summary: AnalysisSummary;
}
