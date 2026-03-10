/**
 * Memory System Configuration
 *
 * Configuration for the hybrid SQLite + LanceDB memory system.
 * Supports OpenAI, DeepSeek, and other OpenAI-compatible APIs.
 */

import path from 'path';
import { DATA_DIR } from '../config.js';

export interface MemoryConfig {
  /** Whether semantic search is enabled */
  enabled: boolean;
  /** LanceDB storage path (per-group isolation) */
  getDbPath(groupFolder: string): string;
  /** Embedding model configuration */
  embedding: {
    /** Provider: 'openai', 'deepseek', or any OpenAI-compatible API */
    provider: string;
    /** Model name (e.g., 'text-embedding-3-small', 'deepseek-embeddings') */
    model: string;
    /** Vector dimension */
    dimension: number;
    /** API key (from environment) */
    apiKey?: string;
    /** Custom base URL for OpenAI-compatible APIs (e.g., DeepSeek) */
    baseURL?: string;
  };
  /** Search configuration */
  search: {
    /** Max results from semantic search */
    maxSemanticResults: number;
    /** Minimum similarity score (0-1) */
    minScore: number;
    /** Whether to use hybrid retrieval */
    enableHybrid: boolean;
  };
  /** Sync configuration */
  sync: {
    /** Batch size for embedding generation */
    batchSize: number;
    /** Whether to sync on every message write */
    syncOnWrite: boolean;
    /** Graceful degradation: continue if LanceDB fails */
    gracefulDegradation: boolean;
  };
}

/**
 * Get embedding configuration from environment variables
 * Supports Jina AI, OpenAI, and other OpenAI-compatible APIs
 */
function getEmbeddingConfig() {
  // Check for generic embedding configuration (Jina AI, etc.)
  const embeddingKey = process.env.EMBEDDING_API_KEY;
  const embeddingURL = process.env.EMBEDDING_BASE_URL;
  const embeddingModel = process.env.EMBEDDING_MODEL;

  if (embeddingKey && embeddingURL) {
    // Detect provider from URL or model name
    let provider = 'custom';
    let dimension = 1536;

    if (embeddingURL.includes('jina.ai') || embeddingModel?.includes('jina')) {
      provider = 'jina';
      dimension = (embeddingModel?.includes('v2') || embeddingModel?.includes('v3')) ? 1024 : 768;
    }

    return {
      provider,
      model: embeddingModel || 'text-embedding-3-small',
      dimension,
      apiKey: embeddingKey,
      baseURL: embeddingURL,
    };
  }

  // Fall back to OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      model: embeddingModel || 'text-embedding-3-small',
      dimension: 1536,
      apiKey: openaiKey,
      baseURL: embeddingURL,
    };
  }

  // No API key configured
  return {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimension: 1536,
    apiKey: undefined,
    baseURL: undefined,
  };
}

/**
 * Default configuration
 * Uses DeepSeek if configured, otherwise falls back to OpenAI
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: process.env.MEMORY_ENABLED === 'true',
  getDbPath: (groupFolder: string) =>
    path.join(DATA_DIR, 'memory', groupFolder, 'lancedb'),
  embedding: getEmbeddingConfig(),
  search: {
    maxSemanticResults: parseInt(process.env.MEMORY_MAX_RESULTS || '20', 10),
    minScore: parseFloat(process.env.MEMORY_MIN_SCORE || '0.7'),
    enableHybrid: process.env.MEMORY_ENABLE_HYBRID !== 'false',
  },
  sync: {
    batchSize: parseInt(process.env.MEMORY_BATCH_SIZE || '32', 10),
    syncOnWrite: process.env.MEMORY_SYNC_ON_WRITE !== 'false',
    gracefulDegradation: process.env.MEMORY_GRACEFUL_DEGRADATION !== 'false',
  },
};

/**
 * Validate configuration and check if memory system should be enabled
 */
export function isMemoryEnabled(): boolean {
  const config = DEFAULT_MEMORY_CONFIG;
  const useMockForTesting =
    process.env.MEMORY_USE_MOCK_EMBEDDINGS === 'true';
  return (
    config.enabled &&
    (useMockForTesting || !!config.embedding.apiKey) &&
    config.sync.gracefulDegradation
  );
}

/**
 * Log configuration status on startup
 */
export function logMemoryConfig(): void {
  const config = DEFAULT_MEMORY_CONFIG;
  const enabled = isMemoryEnabled();

  console.log('[Memory] Configuration:');
  console.log(`  - Enabled: ${enabled}`);
  console.log(`  - Provider: ${config.embedding.provider}`);

  if (config.embedding.baseURL) {
    try {
      const url = new URL(config.embedding.baseURL);
      console.log(`  - API URL: ${url.hostname}`);
    } catch {
      console.log(`  - API URL: ${config.embedding.baseURL}`);
    }
  }

  console.log(`  - Model: ${config.embedding.model}`);
  console.log(`  - Dimension: ${config.embedding.dimension}`);
  console.log(`  - Max Results: ${config.search.maxSemanticResults}`);
  console.log(`  - Min Score: ${config.search.minScore}`);
  console.log(`  - Sync on Write: ${config.sync.syncOnWrite}`);
  console.log(`  - Graceful Degradation: ${config.sync.gracefulDegradation}`);
}
