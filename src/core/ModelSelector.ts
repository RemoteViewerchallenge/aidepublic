import pool from '../db/index';
import { Model } from '../types/provider';

interface ModelCriteria {
  minContext?: number;
  maxContext?: number;
  toolCalling?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  embedding?: boolean;
}

export class ModelSelector {
  async selectModel(criteria: ModelCriteria): Promise<Model | null> {
    let query = 'SELECT * FROM models WHERE 1=1';
    const params = [];

    if (criteria.minContext !== undefined) {
      params.push(criteria.minContext);
      query += ` AND context_length >= $${params.length}`;
    }
    if (criteria.maxContext !== undefined) {
      params.push(criteria.maxContext);
      query += ` AND context_length <= $${params.length}`;
    }
    if (criteria.toolCalling !== undefined) {
      params.push(criteria.toolCalling);
      query += ` AND tool_calling = $${params.length}`;
    }
    if (criteria.vision !== undefined) {
      params.push(criteria.vision);
      query += ` AND vision = $${params.length}`;
    }
    if (criteria.reasoning !== undefined) {
      params.push(criteria.reasoning);
      query += ` AND reasoning = $${params.length}`;
    }
    if (criteria.embedding !== undefined) {
      params.push(criteria.embedding);
      query += ` AND embedding = $${params.length}`;
    }

    query += ' ORDER BY context_length DESC, name ASC LIMIT 1';

    let client;
    try {
      client = await pool.connect();
      const result = await client.query(query, params);
      if (result.rows.length > 0) {
        console.log('Selected model data:', result.rows);
        const selected = result.rows[0];
        return {
          id: selected.id,
          name: selected.name,
          apiProvider: selected.provider,
          sourceProvider: selected.provider,
          contextWindow: selected.context_length,
          supportsToolUse: selected.tool_calling,
          isFree: selected.is_free,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to select model:', error);
      return null;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
