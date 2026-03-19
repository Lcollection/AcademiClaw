/**
 * Memory Pro - Configuration
 *
 * Configuration management for the memory system.
 */

import { z } from 'zod';
import type { MemoryConfig, MemoryCategory } from './types.js';
import { MEMORY_CATEGORIES, DEFAULT_CONFIG } from './types.js';
import { logger } from '../../logger.js';

const embeddingSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('text-embedding-3-small'),
  baseUrl: z.string().optional(),
  dimensions: z.number().int().positive().optional(),
});

const configSchema = z.object({
  enabled: z.boolean().default(true),
  autoCapture: z.boolean().default(true),
  autoRecall: z.boolean().default(true),
  captureMaxChars: z.number().int().min(100).max(10000).default(500),
  recallLimit: z.number().int().min(1).max(20).default(5),
  recallMinScore: z.number().min(0).max(1).default(0.3),
  dedupThreshold: z.number().min(0).max(1).default(0.95),
  dbPath: z.string().optional(),
  embedding: embeddingSchema,
});

/**
 * Vector dimensions for common models
 */
export const VECTOR_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'jina-embeddings-v3': 1024,
  'nomic-embed-text': 768,
  'all-MiniLM-L6-v2': 384,
};

/**
 * Get vector dimensions for a model
 */
export function getVectorDimensions(model: string, override?: number): number {
  if (override) return override;
  return VECTOR_DIMENSIONS[model] ?? 1536;
}

/**
 * Load configuration from environment
 */
export function loadConfig(): MemoryConfig | null {
  const enabled = process.env.MEMORY_ENABLED === 'true';
  
  if (!enabled) {
    logger.info('[MemoryPro] Disabled (set MEMORY_ENABLED=true to enable)');
    return null;
  }

  const apiKey = process.env.MEMORY_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('[MemoryPro] No API key found (set MEMORY_EMBEDDING_API_KEY or OPENAI_API_KEY)');
    return null;
  }

  const rawConfig = {
    enabled,
    autoCapture: process.env.MEMORY_AUTO_CAPTURE !== 'false',
    autoRecall: process.env.MEMORY_AUTO_RECALL !== 'false',
    captureMaxChars: parseInt(process.env.MEMORY_CAPTURE_MAX_CHARS || '500', 10),
    recallLimit: parseInt(process.env.MEMORY_RECALL_LIMIT || '5', 10),
    recallMinScore: parseFloat(process.env.MEMORY_RECALL_MIN_SCORE || '0.3'),
    dedupThreshold: parseFloat(process.env.MEMORY_DEDUP_THRESHOLD || '0.95'),
    dbPath: process.env.MEMORY_DB_PATH,
    embedding: {
      apiKey,
      model: process.env.MEMORY_EMBEDDING_MODEL || 'text-embedding-3-small',
      baseUrl: process.env.MEMORY_EMBEDDING_BASE_URL,
      dimensions: process.env.MEMORY_EMBEDDING_DIMENSIONS
        ? parseInt(process.env.MEMORY_EMBEDDING_DIMENSIONS, 10)
        : undefined,
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    logger.error({ error }, '[MemoryPro] Invalid configuration');
    return null;
  }
}

/**
 * Log configuration status
 */
export function logConfigStatus(config: MemoryConfig): void {
  logger.info('[MemoryPro] Configuration loaded:', {
    enabled: config.enabled,
    autoCapture: config.autoCapture,
    autoRecall: config.autoRecall,
    model: config.embedding.model,
    dimensions: getVectorDimensions(config.embedding.model, config.embedding.dimensions),
  });
}

export { MEMORY_CATEGORIES };
