import { PersistedGraphEdge, PersistedGraphNode } from '@repodoc/persistence';
import { GraphEdge, GraphEdgeType, GraphNode, GraphNodeType } from './types.js';

export class DependencyGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly outgoing = new Map<string, GraphEdge[]>();
  private readonly incoming = new Map<string, GraphEdge[]>();

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): GraphEdge[] {
    const edges: GraphEdge[] = [];
    for (const list of this.outgoing.values()) {
      edges.push(...list);
    }
    return edges;
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      return;
    }

    const outList = this.outgoing.get(edge.source) ?? [];
    const exists = outList.some(
      (e) => e.target === edge.target && e.type === edge.type
    );
    if (exists) return;

    outList.push(edge);
    this.outgoing.set(edge.source, outList);

    const inList = this.incoming.get(edge.target) ?? [];
    inList.push(edge);
    this.incoming.set(edge.target, inList);
  }

  public getOutgoing(nodeId: string): GraphEdge[] {
    return this.outgoing.get(nodeId) ?? [];
  }

  public getIncoming(nodeId: string): GraphEdge[] {
    return this.incoming.get(nodeId) ?? [];
  }

  public findNodesByType(type: GraphNodeType): GraphNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.type === type);
  }

  /**
   * Computes all transitively impacted node IDs starting from a set of seed nodes.
   * Follows reverse dependency edges ('imports', 'depends_on') to find callers/dependents,
   * and forward/semantic edges ('defines', 'relates_to', 'documented_by') to find affected
   * symbols, knowledge items, and documentation files.
   */
  public findImpactedNodeIds(seedIds: string[], maxDepth = 10): Set<string> {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [];

    for (const id of seedIds) {
      if (this.nodes.has(id) && !visited.has(id)) {
        visited.add(id);
        queue.push({ id, depth: 0 });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      // 1. Reverse dependency edges: anyone importing or depending on current is impacted
      for (const edge of this.getIncoming(current.id)) {
        if (
          edge.type === 'imports' ||
          edge.type === 'depends_on' ||
          edge.type === 'relates_to'
        ) {
          if (!visited.has(edge.source)) {
            visited.add(edge.source);
            queue.push({ id: edge.source, depth: current.depth + 1 });
          }
        }
      }

      // 2. Forward semantic edges: symbols defined, knowledge items, and documents
      for (const edge of this.getOutgoing(current.id)) {
        if (
          edge.type === 'defines' ||
          edge.type === 'relates_to' ||
          edge.type === 'documented_by'
        ) {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            queue.push({ id: edge.target, depth: current.depth + 1 });
          }
        }
      }
    }

    return visited;
  }

  public toPersisted(): { nodes: PersistedGraphNode[]; edges: PersistedGraphEdge[] } {
    return {
      nodes: this.getAllNodes().map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        filePath: n.filePath,
        metadata: n.metadata,
      })),
      edges: this.getAllEdges().map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };
  }

  public static fromPersisted(data: {
    nodes: PersistedGraphNode[];
    edges: PersistedGraphEdge[];
  }): DependencyGraph {
    const graph = new DependencyGraph();
    for (const n of data.nodes) {
      graph.addNode({
        id: n.id,
        type: n.type as GraphNodeType,
        label: n.label,
        filePath: n.filePath,
        metadata: n.metadata,
      });
    }
    for (const e of data.edges) {
      graph.addEdge({
        source: e.source,
        target: e.target,
        type: e.type as GraphEdgeType,
      });
    }
    return graph;
  }
}
