import { DatabaseConnection } from '../interfaces.js';

export const migration003 = {
  id: 3,
  name: '003_dependency_graph',
  up: (db: DatabaseConnection): void => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS graph_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        file_path TEXT,
        metadata TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
      CREATE INDEX IF NOT EXISTS idx_graph_nodes_file ON graph_nodes(file_path);

      CREATE TABLE IF NOT EXISTS graph_edges (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (source_id, target_id, type),
        FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
    `);
  },
};
