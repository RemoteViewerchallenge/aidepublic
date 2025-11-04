import pool from '../db/index';
import { Model, ProviderId } from '../types/provider';

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
}

export class ModelSelector {
  async selectModel(
    criteria: ModelCriteria,
    options: SelectModelOptions = {}
  ): Promise<Model | null> {
    let client;

    try {
      client = await pool.connect();

      let rows: any[];
      try {
        const result = await client.query('SELECT * FROM models');
        rows = Array.isArray(result.rows) ? result.rows : [];
      } catch (dbError) {
        console.error(
          '❌ ModelSelector: Error querying the "models" table. Does it exist?',
          dbError
        );
        // If the table doesn't exist or there's a query error, return null.
        rows = [];
        return null;
      }

      const normalizeProvider = (value: unknown): string =>
        String(value || '').toLowerCase();

      const allowedProviders = (options.allowedProviders || [])
        .map(provider => normalizeProvider(provider))
        .filter(Boolean);
      const allowedProviderSet =
        allowedProviders.length > 0 ? new Set(allowedProviders) : null;

      const preferredOrder = (
        options.preferredProviderOrder ||
        options.allowedProviders ||
        []
      )
        .map(provider => normalizeProvider(provider))
        .filter(Boolean);
      const excludedModelIds = new Set(
        (options.excludedModelIds || []).map(id =>
          String(id || '').toLowerCase()
        )
      );

      const providerPriority = new Map<string, number>();
      preferredOrder.forEach((provider, index) => {
        if (!providerPriority.has(provider)) {
          providerPriority.set(provider, index);
        }
      });

      if (allowedProviderSet) {
        rows = rows.filter(row =>
          allowedProviderSet.has(
            normalizeProvider(row.provider ?? row.api_provider)
          )
        );

        if (rows.length === 0) {
          console.warn(
            '⚠️ ModelSelector: no models available for allowed providers.',
            { allowedProviders }
          );
          return null;
        }
      }

      if (rows.length === 0) {
        console.log('❌ ModelSelector: models table is empty.');
        return null;
      }

      // Apply excluded model ids filter (session blacklists, etc.)
      if (excludedModelIds.size > 0) {
        rows = rows.filter(
          row => !excludedModelIds.has(String(row.id || '').toLowerCase())
        );
        if (rows.length === 0) {
          console.warn(
            '⚠️ ModelSelector: all models excluded by excludedModelIds'
          );
          return null;
        }
      }

      const normalizeRawData = (raw: any): Record<string, any> => {
        if (!raw) {
          return {};
        }

        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch (error) {
            console.warn(
              '⚠️ ModelSelector: failed to parse raw_data string.',
              error
            );
            return {};
          }
        }

        return raw;
      };

      const determineIsFree = (row: any): boolean => {
        const provider = normalizeProvider(row.provider);

        if (provider === 'aistudio') {
          return true;
        }

        if (provider === 'openrouter') {
          const raw = normalizeRawData(row.raw_data);
          const pricing = raw.pricing || {};

          const allPricesZero = Object.values(pricing).every(value => {
            if (typeof value === 'string') {
              const parsed = parseFloat(value);
              return Number.isFinite(parsed) && parsed === 0;
            }

            if (typeof value === 'number') {
              return value === 0;
            }

            return false;
          });

          return (
            allPricesZero ||
            (typeof row.id === 'string' &&
              row.id.toLowerCase().includes(':free'))
          );
        }

        return false;
      };

      const matchesCriteria = (row: any, requireFree: boolean): boolean => {
        if (
          criteria.minContext !== undefined &&
          (row.context_length || 0) < criteria.minContext
        ) {
          return false;
        }

        if (
          criteria.maxContext !== undefined &&
          (row.context_length || 0) > criteria.maxContext
        ) {
          return false;
        }

        if (
          criteria.toolCalling !== undefined &&
          Boolean(row.tool_calling) !== Boolean(criteria.toolCalling)
        ) {
          return false;
        }

        if (
          criteria.vision !== undefined &&
          Boolean(row.vision) !== Boolean(criteria.vision)
        ) {
          return false;
        }

        if (
          criteria.reasoning !== undefined &&
          Boolean(row.reasoning) !== Boolean(criteria.reasoning)
        ) {
          return false;
        }

        if (
          criteria.embedding !== undefined &&
          Boolean(row.embedding) !== Boolean(criteria.embedding)
        ) {
          return false;
        }

        if (requireFree && !determineIsFree(row)) {
          return false;
        }

        return true;
      };

      const pickDiverse = (candidates: any[]): any | null => {
        if (candidates.length === 0) {
          return null;
        }

        // Sort candidates by priority and context (similar to before)
        const sorted = candidates.sort((a, b) => {
          const getPriority = (row: any): number =>
            providerPriority.get(
              normalizeProvider(row.provider ?? row.api_provider)
            ) ?? Number.MAX_SAFE_INTEGER;

          const aPriority = getPriority(a);
          const bPriority = getPriority(b);

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          const aContext = Number.isFinite(a.context_length)
            ? a.context_length
            : Number.MAX_SAFE_INTEGER;
          const bContext = Number.isFinite(b.context_length)
            ? b.context_length
            : Number.MAX_SAFE_INTEGER;

          if (aContext !== bContext) {
            return bContext - aContext; // Higher context first
          }

          const aFree = determineIsFree(a) ? 1 : 0;
          const bFree = determineIsFree(b) ? 1 : 0;
          if (aFree !== bFree) {
            return bFree - aFree; // Free first
          }

          const aName = a.name || a.id || '';
          const bName = b.name || b.id || '';
          return aName.localeCompare(bName);
        });

        // Select randomly from the top 3 candidates for diversity
        const topCandidates = sorted.slice(0, Math.min(3, sorted.length));
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        return topCandidates[randomIndex];
      };

      const preferFree = criteria.isFree !== false;

      let candidates = rows.filter(row => matchesCriteria(row, preferFree));

      if (candidates.length === 0 && preferFree) {
        console.log(
          '⚠️ ModelSelector: no free models matched criteria, retrying without free filter.'
        );
        candidates = rows.filter(row => matchesCriteria(row, false));
      }

      let selectedRow = pickDiverse(candidates);

      if (!selectedRow) {
        console.log(
          '⚠️ ModelSelector: no models matched criteria, falling back to overall best.'
        );
        selectedRow = pickDiverse(rows);
      }

      if (!selectedRow) {
        console.log(
          '❌ ModelSelector: failed to select a model after fallback.'
        );
        return null;
      }

      const isFree = determineIsFree(selectedRow);
      const normalizedProvider = normalizeProvider(
        selectedRow.provider ?? selectedRow.api_provider
      );

      console.log('✅ ModelSelector selected model:', {
        id: selectedRow.id,
        name: selectedRow.name,
        provider: normalizedProvider,
        context: selectedRow.context_length,
        free: isFree,
      });

      return {
        id: selectedRow.id,
        name: selectedRow.name,
        apiProvider: normalizedProvider,
        sourceProvider: normalizedProvider,
        contextWindow: selectedRow.context_length,
        supportsToolUse: Boolean(selectedRow.tool_calling),
        isFree,
      };
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
