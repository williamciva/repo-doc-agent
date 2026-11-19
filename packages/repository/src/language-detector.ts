import * as path from 'node:path';

export interface LanguageDetectionResult {
  language: string;
  isBinary: boolean;
  category: 'code' | 'config' | 'documentation' | 'data' | 'binary' | 'unknown';
}

const EXTENSION_MAP: Record<string, { language: string; category: LanguageDetectionResult['category'] }> = {
  // TypeScript & JavaScript
  '.ts': { language: 'typescript', category: 'code' },
  '.tsx': { language: 'typescript', category: 'code' },
  '.mts': { language: 'typescript', category: 'code' },
  '.cts': { language: 'typescript', category: 'code' },
  '.js': { language: 'javascript', category: 'code' },
  '.jsx': { language: 'javascript', category: 'code' },
  '.mjs': { language: 'javascript', category: 'code' },
  '.cjs': { language: 'javascript', category: 'code' },

  // Python
  '.py': { language: 'python', category: 'code' },
  '.pyw': { language: 'python', category: 'code' },
  '.pyi': { language: 'python', category: 'code' },

  // Java & JVM
  '.java': { language: 'java', category: 'code' },
  '.kt': { language: 'kotlin', category: 'code' },
  '.kts': { language: 'kotlin', category: 'code' },
  '.scala': { language: 'scala', category: 'code' },
  '.groovy': { language: 'groovy', category: 'code' },

  // C / C++ / C#
  '.c': { language: 'c', category: 'code' },
  '.h': { language: 'c', category: 'code' },
  '.cpp': { language: 'cpp', category: 'code' },
  '.hpp': { language: 'cpp', category: 'code' },
  '.cc': { language: 'cpp', category: 'code' },
  '.cxx': { language: 'cpp', category: 'code' },
  '.cs': { language: 'csharp', category: 'code' },

  // Systems languages
  '.rs': { language: 'rust', category: 'code' },
  '.go': { language: 'go', category: 'code' },
  '.zig': { language: 'zig', category: 'code' },
  '.swift': { language: 'swift', category: 'code' },

  // Web & Styles
  '.html': { language: 'html', category: 'code' },
  '.htm': { language: 'html', category: 'code' },
  '.css': { language: 'css', category: 'code' },
  '.scss': { language: 'scss', category: 'code' },
  '.sass': { language: 'sass', category: 'code' },
  '.less': { language: 'less', category: 'code' },
  '.vue': { language: 'vue', category: 'code' },
  '.svelte': { language: 'svelte', category: 'code' },

  // Data & Database
  '.sql': { language: 'sql', category: 'code' },
  '.psql': { language: 'sql', category: 'code' },
  '.plsql': { language: 'plsql', category: 'code' },
  '.graphql': { language: 'graphql', category: 'code' },
  '.gql': { language: 'graphql', category: 'code' },
  '.proto': { language: 'protobuf', category: 'code' },

  // Scripting & Shell
  '.sh': { language: 'shell', category: 'code' },
  '.bash': { language: 'bash', category: 'code' },
  '.zsh': { language: 'zsh', category: 'code' },
  '.ps1': { language: 'powershell', category: 'code' },
  '.psm1': { language: 'powershell', category: 'code' },
  '.bat': { language: 'batch', category: 'code' },
  '.cmd': { language: 'batch', category: 'code' },

  // Configurations
  '.json': { language: 'json', category: 'config' },
  '.yaml': { language: 'yaml', category: 'config' },
  '.yml': { language: 'yaml', category: 'config' },
  '.toml': { language: 'toml', category: 'config' },
  '.xml': { language: 'xml', category: 'config' },
  '.ini': { language: 'ini', category: 'config' },
  '.env': { language: 'dotenv', category: 'config' },

  // Documentation
  '.md': { language: 'markdown', category: 'documentation' },
  '.mdx': { language: 'mdx', category: 'documentation' },
  '.rst': { language: 'restructuredtext', category: 'documentation' },
  '.txt': { language: 'text', category: 'documentation' },

  // Binaries
  '.png': { language: 'binary', category: 'binary' },
  '.jpg': { language: 'binary', category: 'binary' },
  '.jpeg': { language: 'binary', category: 'binary' },
  '.gif': { language: 'binary', category: 'binary' },
  '.pdf': { language: 'binary', category: 'binary' },
  '.exe': { language: 'binary', category: 'binary' },
  '.dll': { language: 'binary', category: 'binary' },
  '.so': { language: 'binary', category: 'binary' },
  '.wasm': { language: 'binary', category: 'binary' },
  '.db': { language: 'binary', category: 'binary' },
  '.sqlite': { language: 'binary', category: 'binary' },
  '.zip': { language: 'binary', category: 'binary' },
  '.tar': { language: 'binary', category: 'binary' },
  '.gz': { language: 'binary', category: 'binary' },
};

const FILENAME_MAP: Record<string, { language: string; category: LanguageDetectionResult['category'] }> = {
  dockerfile: { language: 'dockerfile', category: 'config' },
  containerfile: { language: 'dockerfile', category: 'config' },
  makefile: { language: 'makefile', category: 'config' },
  cmakelists: { language: 'cmake', category: 'config' },
  gemfile: { language: 'ruby', category: 'config' },
  rakefile: { language: 'ruby', category: 'config' },
  jenkinsfile: { language: 'groovy', category: 'config' },
  vagrantfile: { language: 'ruby', category: 'config' },
};

export class LanguageDetector {
  public static detect(filePath: string, sampleBuffer?: Buffer): LanguageDetectionResult {
    const filename = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Check special filenames first
    if (FILENAME_MAP[filename]) {
      const match = FILENAME_MAP[filename]!;
      return {
        language: match.language,
        isBinary: false,
        category: match.category,
      };
    }

    // Check extension
    if (ext && EXTENSION_MAP[ext]) {
      const match = EXTENSION_MAP[ext]!;
      return {
        language: match.language,
        isBinary: match.category === 'binary',
        category: match.category,
      };
    }

    // Inspect buffer if available to detect binary or text
    if (sampleBuffer && sampleBuffer.length > 0) {
      const isBinary = LanguageDetector.isBinaryBuffer(sampleBuffer);
      return {
        language: isBinary ? 'binary' : 'text',
        isBinary,
        category: isBinary ? 'binary' : 'unknown',
      };
    }

    return {
      language: 'unknown',
      isBinary: false,
      category: 'unknown',
    };
  }

  public static isBinaryBuffer(buffer: Buffer): boolean {
    const checkLength = Math.min(buffer.length, 8000);
    let nullBytes = 0;

    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) {
        nullBytes++;
      }
    }

    // If more than 0.5% null bytes, consider binary
    return nullBytes / checkLength > 0.005;
  }
}
