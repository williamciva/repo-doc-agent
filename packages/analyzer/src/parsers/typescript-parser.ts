import ts from 'typescript';
import * as path from 'node:path';
import { LanguageParser } from './interface.js';
import { ParsedFile, SymbolInfo, ImportInfo, ExportInfo } from '../types.js';

export class TypeScriptParser implements LanguageParser {
  public readonly id = 'typescript-ast';

  public supports(language: string, filePath: string): boolean {
    if (language === 'typescript' || language === 'javascript') {
      return true;
    }
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
  }

  public async parse(filePath: string, content: string): Promise<ParsedFile> {
    const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    const scriptKind = isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const symbols: SymbolInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const dependencies: Set<string> = new Set();

    const getLineAndChar = (pos: number) => {
      const lineChar = sourceFile.getLineAndCharacterOfPosition(pos);
      return lineChar.line + 1; // 1-indexed
    };

    const hasModifier = (node: ts.Node, kind: ts.SyntaxKind): boolean => {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      return modifiers?.some((m) => m.kind === kind) ?? false;
    };

    const getVisibility = (node: ts.Node): SymbolInfo['visibility'] => {
      if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
      if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
      return 'public';
    };

    const getDocstring = (node: ts.Node): string | undefined => {
      const jsDocNode = (node as { jsDoc?: Array<{ comment?: unknown }> }).jsDoc;
      if (jsDocNode && jsDocNode.length > 0 && jsDocNode[0]?.comment) {
        const comment = jsDocNode[0].comment;
        if (typeof comment === 'string') {
          return comment;
        }
        if (Array.isArray(comment)) {
          return comment
            .map((part: unknown) => {
              if (typeof part === 'string') return part;
              if (part && typeof part === 'object' && 'text' in part) {
                return String((part as { text: unknown }).text);
              }
              return '';
            })
            .join('');
        }
      }
      return undefined;
    };

    const visit = (node: ts.Node, parentSymbolName?: string) => {
      // 1. Imports
      if (ts.isImportDeclaration(node)) {
        const line = getLineAndChar(node.getStart(sourceFile));
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const source = moduleSpecifier.text;
          dependencies.add(source);

          const importClause = node.importClause;
          let isDefault = false;
          let isNamespace = false;
          const importedSymbols: string[] = [];

          if (importClause) {
            if (importClause.name) {
              isDefault = true;
              importedSymbols.push(importClause.name.text);
            }
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                isNamespace = true;
                importedSymbols.push(importClause.namedBindings.name.text);
              } else if (ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                  importedSymbols.push(element.name.text);
                }
              }
            }
          }

          imports.push({
            source,
            importedSymbols,
            isDefault,
            isNamespace,
            line,
          });
        }
      }

      // 2. Class Declaration
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'class',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: 'public',
          isExported,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
            kind: 'class',
            line: lineStart,
          });
        }

        ts.forEachChild(node, (child) => visit(child, name));
        return;
      }

      // 3. Methods inside class
      else if (ts.isMethodDeclaration(node) && node.name && parentSymbolName) {
        const methodName = node.name.getText(sourceFile);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${parentSymbolName}.${methodName}`,
          name: methodName,
          kind: 'method',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: getVisibility(node),
          isExported: false,
          parentSymbol: parentSymbolName,
        });
      }

      // 4. Interface Declaration
      else if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'interface',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: 'public',
          isExported,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: false,
            kind: 'interface',
            line: lineStart,
          });
        }
      }

      // 5. Function Declaration
      else if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'function',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: 'public',
          isExported,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
            kind: 'function',
            line: lineStart,
          });
        }
      }

      // 6. Type Alias
      else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'type_alias',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: 'public',
          isExported,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: false,
            kind: 'type_alias',
            line: lineStart,
          });
        }
      }

      // 7. Enum Declaration
      else if (ts.isEnumDeclaration(node)) {
        const name = node.name.text;
        const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const lineStart = getLineAndChar(node.getStart(sourceFile));
        const lineEnd = getLineAndChar(node.getEnd());

        symbols.push({
          id: `${filePath}#${name}`,
          name,
          kind: 'enum',
          filePath,
          lineStart,
          lineEnd,
          docstring: getDocstring(node),
          visibility: 'public',
          isExported,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: false,
            kind: 'enum',
            line: lineStart,
          });
        }
      }

      // 8. Export Declaration (e.g. export { a, b } or export * from 'c')
      else if (ts.isExportDeclaration(node)) {
        const line = getLineAndChar(node.getStart(sourceFile));
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          dependencies.add(node.moduleSpecifier.text);
        }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            exports.push({
              name: el.name.text,
              isDefault: false,
              line,
            });
          }
        }
      }

      ts.forEachChild(node, (child) => visit(child, parentSymbolName));
    };

    ts.forEachChild(sourceFile, (node) => visit(node));

    return {
      filePath,
      language: filePath.endsWith('.js') || filePath.endsWith('.jsx') ? 'javascript' : 'typescript',
      symbols,
      imports,
      exports,
      dependencies: Array.from(dependencies),
      parserUsed: this.id,
    };
  }
}
