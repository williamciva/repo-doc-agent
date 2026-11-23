import { PersistenceError } from '@repodoc/shared';
import { DatabaseConnection } from '../interfaces.js';

export interface PersistedGraphNode {
  id: string;
  type: string;
  label: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface PersistedGraphEdge {
  source: string;
  target: string;
  type: string;
}

interface NodeRow {
  id: string;
  type: string;
  label: string;
  file_path: string | null;
  metadata: string | null;
}

interface EdgeRow {
  source_id: string;
  target_id: string;
  type: string;
}

export class GraphRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public async saveGraph(nodes: PersistedGraphNode[], edges: PersistedGraphEdge[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      this.db.transaction(() => {
        this.db.exec('DELETE FROM graph_edges; DELETE FROM graph_nodes;');

        const insertNode = this.db.prepare(`
          INSERT INTO graph_nodes (id, type, label, file_path, metadata, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const node of nodes) {
          insertNode.run(
            node.id,
            node.type,
            node.label,
            node.filePath ?? null,
            node.metadata ? JSON.stringify(node.metadata) : null,
            now
          );
        }

        const insertEdge = this.db.prepare(`
          INSERT OR IGNORE INTO graph_edges (source_id, target_id, type)
          VALUES (?, ?, ?)
        `);

        for (const edge of edges) {
          insertEdge.run(edge.source, edge.target, edge.type);
        }
      });
    } catch (error) {
      throw new PersistenceError('Failed to save dependency graph', { error });
    }
  }

  public async loadGraph(): Promise<{ nodes: PersistedGraphNode[]; edges: PersistedGraphEdge[] }> {
    try {
      const nodeRows = this.db.prepare('SELECT * FROM graph_nodes').all<NodeRow>();
      const edgeRows = this.db.prepare('SELECT * FROM graph_edges').all<EdgeRow>();

      const nodes: PersistedGraphNode[] = nodeRows.map((row) => ({
        id: row.id,
        type: row.type,
        label: row.label,
        filePath: row.file_path ?? undefined,
        metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
      }));

      const edges: PersistedGraphEdge[] = edgeRows.map((row) => ({
        source: row.source_id,
        target: row.target_id,
        type: row.type,
      }));

      return { nodes, edges };
    } catch (error) {
      throw new PersistenceError('Failed to load dependency graph', { error });
    }
  }
}
