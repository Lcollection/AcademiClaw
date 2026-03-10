/**
 * Embedding Service
 *
 * Generates vector embeddings using OpenAI-compatible APIs.
 * Supports OpenAI, DeepSeek, Jina AI, and other compatible providers.
 * Includes a mock mode for testing without an API key.
 */

import OpenAI from 'openai';
import { DEFAULT_MEMORY_CONFIG } from './config.js';
import {
  MockEmbeddingService,
  testMockEmbeddings,
} from './embeddings-mock.js';

export interface EmbeddingService {
  /** Generate embeddings for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (batch) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Get the embedding dimension */
  getDimension(): number;
}

/**
 * OpenAI-compatible embedding service
 * Works with OpenAI, Jina AI, Voyage AI, and other compatible APIs
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimension: number;

  constructor(
    apiKey: string,
    model: string = 'text-embedding-3-small',
    baseURL?: string
  ) {
    const clientConfig: { apiKey: string; baseURL?: string } = { apiKey };

    // Use custom baseURL if provided (e.g., Jina AI, DeepSeek)
    if (baseURL) {
      clientConfig.baseURL = baseURL;
    }

    this.client = new OpenAI(clientConfig);
    this.model = model;

    // Set dimension based on model
    if (model === 'text-embedding-ada-002') {
      this.dimension = 1536;
    } else if (model === 'text-embedding-3-small') {
      this.dimension = 1536;
    } else if (model === 'text-embedding-3-large') {
      this.dimension = 3072;
    } else if (model.includes('jina-embeddings')) {
      // Jina embeddings: v3=1024, v2=1024, v1=768
      this.dimension = (model.includes('v2') || model.includes('v3')) ? 1024 : 768;
    } else if (model.includes('voyage-')) {
      // Voyage AI embeddings are 1024 dimensions
      this.dimension = 1024;
    } else if (model === 'deepseek-embeddings' || model.includes('deepseek')) {
      // DeepSeek embeddings are 1536 dimensions
      this.dimension = 1536;
    } else {
      // Default to 1536 for unknown models
      this.dimension = 1536;
    }
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in batches for reliability
    const batchSize = DEFAULT_MEMORY_CONFIG.sync.batchSize;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        const embeddings = response.data.map((item) => item.embedding);
        results.push(...embeddings);
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        console.error('[Memory] Embedding API failed:', errorMessage);
        throw error;
      }
    }

    return results;
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * Singleton embedding manager
 */
class EmbeddingManager {
  private static instance: EmbeddingManager;
  private service: EmbeddingService | null = null;
  private useMock: boolean = false;

  private constructor() {}

  static getInstance(): EmbeddingManager {
    if (!EmbeddingManager.instance) {
      EmbeddingManager.instance = new EmbeddingManager();
    }
    return EmbeddingManager.instance;
  }

  async initialize(): Promise<void> {
    const config = DEFAULT_MEMORY_CONFIG;

    if (!config.enabled) {
      console.log('[Memory] Embedding service not enabled');
      return;
    }

    const apiKey = config.embedding.apiKey;
    const baseURL = config.embedding.baseURL;

    // Check if we should use mock mode for testing
    const useMockForTesting =
      process.env.MEMORY_USE_MOCK_EMBEDDINGS === 'true' || !apiKey;

    if (useMockForTesting) {
      if (config.enabled && !apiKey) {
        console.log(
          '[Memory] No embedding API key configured, using mock embeddings for testing'
        );
      }

      this.service = new MockEmbeddingService(config.embedding.dimension);
      this.useMock = true;

      const testResults = testMockEmbeddings();
      console.log(
        `[Memory] Mock embeddings initialized (dim=${config.embedding.dimension})`
      );
      console.log(`  - Same text similarity: ${testResults.similaritySame.toFixed(4)}`);
      console.log(`  - Different text similarity: ${testResults.similarityDifferent.toFixed(4)}`);
      return;
    }

    try {
      this.service = new OpenAIEmbeddingService(
        apiKey,
        config.embedding.model,
        baseURL
      );

      const provider = baseURL
        ? new URL(baseURL).hostname
        : config.embedding.provider;

      console.log(
        `[Memory] Embedding service initialized: ${config.embedding.model} (${provider})`
      );
      this.useMock = false;
    } catch (error) {
      console.error('[Memory] Failed to initialize embedding service:', error);
      if (!config.sync.gracefulDegradation) {
        throw error;
      }
      // Fall back to mock embeddings
      this.service = new MockEmbeddingService(config.embedding.dimension);
      this.useMock = true;
      console.log('[Memory] Falling back to mock embeddings for testing');
    }
  }

  getService(): EmbeddingService | null {
    return this.service;
  }

  isReady(): boolean {
    return this.service !== null;
  }

  isUsingMock(): boolean {
    return this.useMock;
  }
}

/**
 * Get the singleton embedding manager
 */
export function getEmbeddingManager(): EmbeddingManager {
  return EmbeddingManager.getInstance();
}

/**
 * Initialize the embedding service
 */
export async function initEmbeddings(): Promise<void> {
  await EmbeddingManager.getInstance().initialize();
}

/**
 * Export mock service for direct use if needed
 */
export { MockEmbeddingService };
