import { LanguageParser } from './interface.js';
import { ParsedFile, SymbolInfo, ImportInfo, ExportInfo } from '../types.js';

export class GenericRegexParser implements LanguageParser {
  public readonly id = 'generic-regex';

  public supports(): boolean {
    return true; // Fallback for any language
  }

  public async parse(filePath: string, content: string): Promise<ParsedFile> {
    const symbols: SymbolInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const dependencies: Set<string> = new Set();

    const lines = content.split('\n');

    // Patterns
    // 1. Classes: "class ClassName", "type StructName struct", "interface InterfaceName"
    const classRegex = /^(?:export\s+|public\s+|private\s+)?(?:class|interface|struct)\s+([A-Za-z0-9_]+)/;
    // 2. Functions: "def func_name", "fn func_name", "func func_name", "function func_name"
    const funcRegex = /^(?:export\s+|public\s+|private\s+|protected\s+|async\s+)*(?:def|fn|func|function)\s+([A-Za-z0-9_]+)/;
    // 3. Imports: "import x", "from x import y", "using x;", "#include <x>"
    const importRegex = /^(?:import\s+([A-Za-z0-9_./@-]+)|from\s+([A-Za-z0-9_./@-]+)\s+import|using\s+([A-Za-z0-9_.]+);|#include\s+[<"]([^>"]+)[>"])/;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]?.trim() ?? '';
      const lineNumber = i + 1;

      // Import check
      const importMatch = lineText.match(importRegex);
      if (importMatch) {
        const source = importMatch[1] || importMatch[2] || importMatch[3] || importMatch[4];
        if (source) {
          dependencies.add(source);
          imports.push({
            source,
            importedSymbols: [],
            isDefault: false,
            isNamespace: false,
            line: lineNumber,
          });
        }
        continue;
      }

      // Class check
      const classMatch = lineText.match(classRegex);
      if (classMatch && classMatch[1]) {
        const name = classMatch[1];
        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'class',
          filePath,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          isExported: lineText.startsWith('export ') || lineText.startsWith('public '),
        });
        continue;
      }

      // Function check
      const funcMatch = lineText.match(funcRegex);
      if (funcMatch && funcMatch[1]) {
        const name = funcMatch[1];
        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'function',
          filePath,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          isExported: lineText.startsWith('export ') || lineText.startsWith('public '),
        });
        continue;
      }
    }

    return {
      filePath,
      language: 'generic',
      symbols,
      imports,
      exports,
      dependencies: Array.from(dependencies),
      parserUsed: this.id,
    };
  }
}
