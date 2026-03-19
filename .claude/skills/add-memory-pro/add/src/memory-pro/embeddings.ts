/**
 * Memory Pro - Embeddings
 *
 * Embedding service using OpenAI-compatible API.
 */

import OpenAI from 'openai';
import type { MemoryConfig } from './types.js';
import { getVectorDimensions } from './config.js';
import { logger } from '../../logger.js';

/**
 * Embedding service for vectorizing text
 */
export class EmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimensions?: number;
  private requestCount = 0;

  constructor(config: MemoryConfig) {
    this.client = new OpenAI({
      apiKey: config.embedding.apiKey,
      baseURL: config.embedding.baseUrl,
    });
    this.model = config.embedding.model;
    this.dimensions = config.embedding.dimensions;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const params: OpenAI.Embeddings.EmbeddingCreateParams = {
      model: this.model,
      input: text,
    };

    if (this.dimensions) {
      params.dimensions = this.dimensions;
    }

    const response = await this.client.embeddings.create(params);
    this.requestCount++;

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const params: OpenAI.Embeddings.EmbeddingCreateParams = {
      model: this.model,
      input: texts,
    };

    if (this.dimensions) {
      params.dimensions = this.dimensions;
    }

    const response = await this.client.embeddings.create(params);
    this.requestCount++;

    return response.data.map((d) => d.embedding);
  }

  /**
   * Get vector dimensions for current model
   */
  getDimensions(): number {
    return getVectorDimensions(this.model, this.dimensions);
  }

  /**
   * Get request count (for monitoring)
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Initialize the embedding service
 */
export function initEmbeddings(config: MemoryConfig): EmbeddingService {
  embeddingService = new EmbeddingService(config);
  logger.info(`[MemoryPro] Embedding service initialized (model: ${config.embedding.model})`);
  return embeddingService;
}

/**
 * Get the embedding service singleton
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    throw new Error('Embedding service not initialized. Call initEmbeddings() first.');
  }
  return embeddingService;
}
