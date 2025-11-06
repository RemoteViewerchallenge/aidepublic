import pool from '../../../db/index.js';
import type { Model, ProviderId } from '../types/provider.js';

interface ModelCriteria {
  minContext?: number;
  maxContext?: number;
  toolCalling?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  embedding?: boolean;
  isFree?: boolean;
}

interface SelectModelOptions {
  allowedProviders?: ProviderId[];
  preferredProviderOrder?: ProviderId[];
  excludedModelIds?: string[];
  candidatesPerProvider?: number;
}

export class ModelSelector {
  async selectModel(
    criteria: ModelCriteria,
    options: SelectModelOptions = {}
  ): Promise<Model[] | null> {
    let client;
    try {
      client = await pool.connect();

      const queryParams: any[] = [];

      // --- Build Query based on Criteria ---
      const whereClauses: string[] = ['blacklisted = false'];

      if (criteria.minContext !== undefined) {
        queryParams.push(criteria.minContext);
        whereClauses.push(`context_length >= $${queryParams.length}`);
      }
      if (criteria.maxContext !== undefined) {
        queryParams.push(criteria.maxContext);
        whereClauses.push(`context_length <= $${queryParams.length}`);
      }
      if (criteria.toolCalling !== undefined) {
        queryParams.push(criteria.toolCalling);
        whereClauses.push(`tool_calling = $${queryParams.length}`);
      }
      if (criteria.vision !== undefined) {
        queryParams.push(criteria.vision);
        whereClauses.push(`vision = $${queryParams.length}`);
      }
      if (criteria.reasoning !== undefined) {
        queryParams.push(criteria.reasoning);
        whereClauses.push(`reasoning = $${queryParams.length}`);
      }
      if (criteria.embedding !== undefined) {
        queryParams.push(criteria.embedding);
        whereClauses.push(`embedding = $${queryParams.length}`);
      }

      // --- Provider Filtering ---
      if (options.allowedProviders && options.allowedProviders.length > 0) {
        queryParams.push(options.allowedProviders);
        whereClauses.push(`provider = ANY($${queryParams.length}::text[])`);
      }
      if (options.excludedModelIds && options.excludedModelIds.length > 0) {
        queryParams.push(options.excludedModelIds);
        whereClauses.push(`id != ANY($${queryParams.length}::text[])`);
      }

      const finalQuery = `SELECT * FROM models WHERE ${whereClauses.join(
        ' AND '
      )} ORDER BY RANDOM()`;

      console.log('ModelSelector Query:', finalQuery, queryParams);

      const result = await client.query(finalQuery, queryParams);
      const candidates = result.rows;

      if (candidates.length === 0) {
        console.log('❌ ModelSelector: No models matched the criteria.');
        return null;
      }

      // Return the list of candidates
      return candidates.map(row => ({
        id: row.id,
        name: row.name,
        apiProvider: String(row.provider || '').toLowerCase() as ProviderId,
        sourceProvider: String(row.provider || '').toLowerCase() as ProviderId,
        contextWindow: row.context_length,
        supportsToolUse: Boolean(row.tool_calling),
        isFree: row.is_free, // Use the actual value from the database
      }));
    } catch (error) {
      console.error('Failed to select model:', error);
      return null;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Backwards compatibility for tests.
  // Note: This now returns the first model from the list for simplicity.
  async selectBestModel(
    criteria: ModelCriteria,
    options: SelectModelOptions = {}
  ): Promise<Model | null> {
    const models = await this.selectModel(criteria, options);
    return models && models.length > 0 ? models[0] : null;
  }
}
