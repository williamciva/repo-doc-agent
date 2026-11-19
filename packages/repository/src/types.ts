export interface FileInfo {
  path: string;
  relativePath: string;
  language: string;
  extension: string;
  sizeBytes: number;
  hash: string;
  lastModified: string;
  isBinary: boolean;
}

export interface PackageInfo {
  name: string;
  path: string;
  relativePath: string;
  version?: string;
  manifestPath?: string;
}

export type MonorepoType =
  | 'pnpm'
  | 'npm'
  | 'yarn'
  | 'lerna'
  | 'turborepo'
  | 'gradle'
  | 'maven'
  | 'cargo'
  | 'generic';

export interface MonorepoInfo {
  isMonorepo: boolean;
  type?: MonorepoType;
  packages: PackageInfo[];
}

export interface GitInfo {
  isGitRepo: boolean;
  currentBranch?: string;
  headCommit?: string;
  isDirty?: boolean;
}

export interface LanguageStat {
  fileCount: number;
  totalBytes: number;
}

export interface ProjectStructure {
  rootPath: string;
  isMonorepo: boolean;
  monorepoType?: MonorepoType;
  packages: PackageInfo[];
  detectedLanguages: Record<string, LanguageStat>;
  totalFiles: number;
  totalBytes: number;
  configFiles: string[];
  gitInfo: GitInfo;
  files: FileInfo[];
}
