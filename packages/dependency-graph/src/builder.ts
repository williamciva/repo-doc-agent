import * as path from 'node:path';
import { KnowledgeItem } from '@repodoc/shared';
import { AnalysisResult } from '@repodoc/analyzer';
import { ProjectStructure } from '@repodoc/repository';
import { GeneratedDocument } from '@repodoc/documentation';
import { DependencyGraph } from './graph.js';

export interface GraphBuildInput {
  structure: ProjectStructure;
  analysis: AnalysisResult;
  knowledgeItems?: KnowledgeItem[];
  documents?: GeneratedDocument[];
}

export class GraphBuilder {
  public build(input: GraphBuildInput): DependencyGraph {
    const graph = new DependencyGraph();
    const { structure, analysis, knowledgeItems = [], documents = [] } = input;

    // 1. Register modules/packages
    for (const pkg of structure.packages) {
      graph.addNode({
        id: `module:${pkg.name}`,
        type: 'module',
        label: pkg.name,
        filePath: pkg.relativePath,
      });
    }

    // 2. Register files and map normalized relative paths
    const fileIdByNormPath = new Map<string, string>();
    for (const file of structure.files) {
      const norm = this.normalizePath(file.relativePath);
      const nodeId = `file:${norm}`;
      fileIdByNormPath.set(norm, nodeId);

      graph.addNode({
        id: nodeId,
        type: 'file',
        label: norm,
        filePath: norm,
        metadata: { language: file.language },
      });

      // Link file -> module if inside a workspace package
      for (const pkg of structure.packages) {
        const pkgNorm = this.normalizePath(pkg.relativePath);
        if (norm.startsWith(`${pkgNorm}/`)) {
          graph.addEdge({
            source: `module:${pkg.name}`,
            target: nodeId,
            type: 'defines',
          });
        }
      }
    }

    // 3. Register moduleGraph dependencies
    for (const [source, targets] of Object.entries(analysis.moduleGraph)) {
      const sourceId = this.resolveModuleOrFileNodeId(graph, source, structure.rootPath, fileIdByNormPath);
      for (const target of targets) {
        const targetId = this.resolveModuleOrFileNodeId(graph, target, structure.rootPath, fileIdByNormPath);
        if (sourceId && targetId && sourceId !== targetId) {
          graph.addEdge({
            source: sourceId,
            target: targetId,
            type: 'depends_on',
          });
        }
      }
    }

    // 4. Register parsed files, symbols, and relative imports
    for (const parsed of analysis.parsedFiles) {
      const rel = this.toRelative(parsed.filePath, structure.rootPath);
      const fileNodeId = `file:${rel}`;
      if (!graph.getNode(fileNodeId)) {
        graph.addNode({
          id: fileNodeId,
          type: 'file',
          label: rel,
          filePath: rel,
          metadata: { language: parsed.language },
        });
        fileIdByNormPath.set(rel, fileNodeId);
      }

      for (const sym of parsed.symbols) {
        const symId = `symbol:${sym.id}`;
        graph.addNode({
          id: symId,
          type: 'symbol',
          label: sym.name,
          filePath: rel,
          metadata: { kind: sym.kind, isExported: sym.isExported },
        });
        graph.addEdge({ source: fileNodeId, target: symId, type: 'defines' });
      }

      for (const imp of parsed.imports) {
        if (imp.source.startsWith('.')) {
          const resolvedRel = this.resolveRelativeImport(rel, imp.source);
          const targetFileId = this.matchFileNode(resolvedRel, fileIdByNormPath);
          if (targetFileId) {
            graph.addEdge({ source: fileNodeId, target: targetFileId, type: 'imports' });
          }
        }
      }
    }

    // 5. Register knowledge items and connect to referenced files
    for (const item of knowledgeItems) {
      const kId = `knowledge:${item.id}`;
      graph.addNode({
        id: kId,
        type: 'knowledge',
        label: item.title,
        metadata: { category: item.category, approvalStatus: item.approvalStatus },
      });

      for (const ref of item.fileReferences) {
        const normRef = this.toRelative(ref, structure.rootPath);
        const fileNodeId = fileIdByNormPath.get(normRef) ?? `file:${normRef}`;
        if (graph.getNode(fileNodeId)) {
          graph.addEdge({ source: fileNodeId, target: kId, type: 'relates_to' });
        }
      }
    }

    // 6. Register generated documents and connect via documented_by
    for (const doc of documents) {
      const docId = `doc:${doc.relativePath}`;
      graph.addNode({
        id: docId,
        type: 'document',
        label: doc.title,
        filePath: doc.relativePath,
        metadata: { audience: doc.audience, depth: doc.depth },
      });

      for (const itemId of doc.sourceItemIds) {
        const kId = `knowledge:${itemId}`;
        if (graph.getNode(kId)) {
          graph.addEdge({ source: kId, target: docId, type: 'documented_by' });
        }
      }
    }

    return graph;
  }

  private resolveModuleOrFileNodeId(
    graph: DependencyGraph,
    raw: string,
    rootPath: string,
    fileMap: Map<string, string>
  ): string | undefined {
    const modId = `module:${raw}`;
    if (graph.getNode(modId)) return modId;

    const rel = this.toRelative(raw, rootPath);
    return fileMap.get(rel);
  }

  private matchFileNode(resolvedNoExt: string, fileMap: Map<string, string>): string | undefined {
    if (fileMap.has(resolvedNoExt)) return fileMap.get(resolvedNoExt);

    const candidates = [
      `${resolvedNoExt}.ts`,
      `${resolvedNoExt}.tsx`,
      `${resolvedNoExt}.js`,
      `${resolvedNoExt}.jsx`,
      `${resolvedNoExt}/index.ts`,
      `${resolvedNoExt}/index.js`,
    ];

    // Also handle ESM .js -> .ts imports
    if (resolvedNoExt.endsWith('.js')) {
      const withoutJs = resolvedNoExt.slice(0, -3);
      candidates.unshift(`${withoutJs}.ts`, `${withoutJs}.tsx`);
    }

    for (const c of candidates) {
      const hit = fileMap.get(c);
      if (hit) return hit;
    }

    return undefined;
  }

  private resolveRelativeImport(fromRelFile: string, importSource: string): string {
    const fromDir = path.posix.dirname(fromRelFile);
    return this.normalizePath(path.posix.join(fromDir, importSource));
  }

  private toRelative(filePath: string, rootPath: string): string {
    const normRoot = this.normalizePath(rootPath);
    const normFile = this.normalizePath(filePath);
    if (normFile.startsWith(`${normRoot}/`)) {
      return normFile.slice(normRoot.length + 1);
    }
    return normFile;
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^\.\//, '');
  }
}
