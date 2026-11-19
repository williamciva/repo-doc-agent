import {
  KnowledgeItem,
  KnowledgeCategory,
  ApprovalStatus,
  KnowledgeRelationship,
  PersistenceError,
} from '@repodoc/shared';
import { DatabaseConnection, IKnowledgeRepository } from '../interfaces.js';

interface KnowledgeRow {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  file_references: string;
  symbols: string;
  discovered_at: string;
  updated_at: string;
  confidence: string;
  provenance: string;
  approval_status: string;
  metadata: string | null;
}

interface RelationshipRow {
  source_id: string;
  target_id: string;
  type: string;
  description: string | null;
}

export class KnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly db: DatabaseConnection) {}

  public async save(item: KnowledgeItem): Promise<void> {
    try {
      this.db.transaction(() => {
        const itemStmt = this.db.prepare(`
          INSERT INTO knowledge_items (
            id, category, title, content, source, file_references,
            symbols, discovered_at, updated_at, confidence, provenance,
            approval_status, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            category = excluded.category,
            title = excluded.title,
            content = excluded.content,
            source = excluded.source,
            file_references = excluded.file_references,
            symbols = excluded.symbols,
            updated_at = excluded.updated_at,
            confidence = excluded.confidence,
            provenance = excluded.provenance,
            approval_status = excluded.approval_status,
            metadata = excluded.metadata
        `);

        itemStmt.run(
          item.id,
          item.category,
          item.title,
          item.content,
          item.source,
          JSON.stringify(item.fileReferences),
          JSON.stringify(item.symbols),
          item.discoveredAt,
          item.updatedAt,
          item.confidence,
          item.provenance,
          item.approvalStatus,
          item.metadata ? JSON.stringify(item.metadata) : null
        );

        // Replace relationships
        const deleteRelStmt = this.db.prepare(
          'DELETE FROM knowledge_relationships WHERE source_id = ?'
        );
        deleteRelStmt.run(item.id);

        if (item.relationships && item.relationships.length > 0) {
          const insertRelStmt = this.db.prepare(`
            INSERT INTO knowledge_relationships (source_id, target_id, type, description)
            VALUES (?, ?, ?, ?)
          `);

          for (const rel of item.relationships) {
            insertRelStmt.run(item.id, rel.targetId, rel.type, rel.description ?? null);
          }
        }
      });
    } catch (error) {
      throw new PersistenceError(`Failed to save knowledge item '${item.id}'`, { error, item });
    }
  }

  public async findById(id: string): Promise<KnowledgeItem | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM knowledge_items WHERE id = ?');
      const row = stmt.get<KnowledgeRow>(id);

      if (!row) {
        return null;
      }

      const rels = this.loadRelationships(id);
      return this.mapRowToItem(row, rels);
    } catch (error) {
      throw new PersistenceError(`Failed to find knowledge item '${id}'`, { error, id });
    }
  }

  public async findByCategory(category: KnowledgeCategory): Promise<KnowledgeItem[]> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM knowledge_items WHERE category = ? ORDER BY discovered_at DESC'
      );
      const rows = stmt.all<KnowledgeRow>(category);

      return rows.map((row) => {
        const rels = this.loadRelationships(row.id);
        return this.mapRowToItem(row, rels);
      });
    } catch (error) {
      throw new PersistenceError(`Failed to find knowledge items by category '${category}'`, {
        error,
        category,
      });
    }
  }

  public async findPendingApproval(): Promise<KnowledgeItem[]> {
    try {
      const stmt = this.db.prepare(
        "SELECT * FROM knowledge_items WHERE approval_status = 'pending' ORDER BY discovered_at ASC"
      );
      const rows = stmt.all<KnowledgeRow>();

      return rows.map((row) => {
        const rels = this.loadRelationships(row.id);
        return this.mapRowToItem(row, rels);
      });
    } catch (error) {
      throw new PersistenceError('Failed to find pending knowledge items', { error });
    }
  }

  public async updateApprovalStatus(id: string, status: ApprovalStatus): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE knowledge_items
        SET approval_status = ?, updated_at = ?
        WHERE id = ?
      `);
      const result = stmt.run(status, new Date().toISOString(), id);

      if (result.changes === 0) {
        throw new PersistenceError(`Knowledge item '${id}' not found to update status`, { id });
      }
    } catch (error) {
      throw new PersistenceError(`Failed to update approval status for knowledge item '${id}'`, {
        error,
        id,
        status,
      });
    }
  }

  public async listAll(): Promise<KnowledgeItem[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM knowledge_items ORDER BY discovered_at DESC');
      const rows = stmt.all<KnowledgeRow>();

      return rows.map((row) => {
        const rels = this.loadRelationships(row.id);
        return this.mapRowToItem(row, rels);
      });
    } catch (error) {
      throw new PersistenceError('Failed to list all knowledge items', { error });
    }
  }

  private loadRelationships(sourceId: string): KnowledgeRelationship[] {
    const stmt = this.db.prepare(
      'SELECT target_id, type, description FROM knowledge_relationships WHERE source_id = ?'
    );
    const rows = stmt.all<RelationshipRow>(sourceId);

    return rows.map((r) => ({
      targetId: r.target_id,
      type: r.type as KnowledgeRelationship['type'],
      description: r.description ?? undefined,
    }));
  }

  private mapRowToItem(row: KnowledgeRow, relationships: KnowledgeRelationship[]): KnowledgeItem {
    return {
      id: row.id,
      category: row.category as KnowledgeCategory,
      title: row.title,
      content: row.content,
      source: row.source,
      fileReferences: JSON.parse(row.file_references) as string[],
      symbols: JSON.parse(row.symbols) as string[],
      discoveredAt: row.discovered_at,
      updatedAt: row.updated_at,
      confidence: row.confidence as KnowledgeItem['confidence'],
      provenance: row.provenance as KnowledgeItem['provenance'],
      approvalStatus: row.approval_status as ApprovalStatus,
      relationships,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    };
  }
}
