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
}

export class ModelSelector {
  async selectModel(
    criteria: ModelCriteria,
    options: SelectModelOptions = {}
  ): Promise<Model | null> {
    let client;

    try {
      client = await pool.connect();

      const result = await client.query('SELECT * FROM models');
      let rows: any[] = Array.isArray(result.rows) ? result.rows : [];

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

      const pickBest = (candidates: any[]): any | null => {
        if (candidates.length === 0) {
          return null;
        }

        const best = candidates.reduce((currentBest, candidate) => {
          if (!currentBest) {
            return candidate;
          }

          const bestContext = Number.isFinite(currentBest.context_length)
            ? currentBest.context_length
            : Number.MAX_SAFE_INTEGER;
          const candidateContext = Number.isFinite(candidate.context_length)
            ? candidate.context_length
            : Number.MAX_SAFE_INTEGER;

          const getPriority = (row: any): number =>
            providerPriority.get(
              normalizeProvider(row.provider ?? row.api_provider)
            ) ?? Number.MAX_SAFE_INTEGER;

          const bestPriority = getPriority(currentBest);
          const candidatePriority = getPriority(candidate);

          if (candidatePriority !== bestPriority) {
            return candidatePriority < bestPriority ? candidate : currentBest;
          }

          if (candidateContext < bestContext) {
            return candidate;
          }

          if (candidateContext > bestContext) {
            return currentBest;
          }

          const bestFree = determineIsFree(currentBest) ? 1 : 0;
          const candidateFree = determineIsFree(candidate) ? 1 : 0;
          if (candidateFree !== bestFree) {
            return candidateFree > bestFree ? candidate : currentBest;
          }

          const bestName = currentBest.name || currentBest.id || '';
          const candidateName = candidate.name || candidate.id || '';
          return candidateName.localeCompare(bestName) < 0
            ? candidate
            : currentBest;
        }, null as any | null);

        return best;
      };

      const preferFree = criteria.isFree !== false;

      let candidates = rows.filter(row => matchesCriteria(row, preferFree));

      if (candidates.length === 0 && preferFree) {
        console.log(
          '⚠️ ModelSelector: no free models matched criteria, retrying without free filter.'
        );
        candidates = rows.filter(row => matchesCriteria(row, false));
      }

      let selectedRow = pickBest(candidates);

      if (!selectedRow) {
        console.log(
          '⚠️ ModelSelector: no models matched criteria, falling back to overall best.'
        );
        selectedRow = pickBest(rows);
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
