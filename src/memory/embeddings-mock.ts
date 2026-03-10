/**
 * Mock Embedding Service for Testing
 *
 * Generates deterministic vector embeddings for testing the memory system
 * without requiring an external API. Uses a simple hash-based approach.
 */

import { DEFAULT_MEMORY_CONFIG } from './config.js';

export interface EmbeddingService {
  /** Generate embeddings for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (batch) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Get the embedding dimension */
  getDimension(): number;
}

/**
 * Mock embedding service for testing
 * Generates deterministic vectors based on text content using a hash function
 */
export class MockEmbeddingService implements EmbeddingService {
  private dimension: number;

  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }

  /**
   * Generate a simple hash-based embedding
   * This creates a deterministic vector for each unique text
   */
  public hashToVector(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Fill vector with pseudo-random values based on hash
    for (let i = 0; i < this.dimension; i++) {
      // Use a simple LCG for deterministic "random" values
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      vector[i] = (hash % 20000 - 10000) / 10000; // Normalize to [-1, 1]
    }

    // Apply L2 normalization
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((v) => v / norm);
  }

  async embed(text: string): Promise<number[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    return this.hashToVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    return texts.map((text) => this.hashToVector(text));
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * Test if mock embeddings produce reasonable similarity scores
 */
export function testMockEmbeddings(): {
  similaritySame: number;
  similarityDifferent: number;
} {
  const mock = new MockEmbeddingService(1536);

  const text1 = 'Hello world';
  const text2 = 'Hello world';
  const text3 = 'Goodbye world';

  const emb1 = mock.hashToVector(text1);
  const emb2 = mock.hashToVector(text2);
  const emb3 = mock.hashToVector(text3);

  // Cosine similarity
  function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      norm1 += a[i] * a[i];
      norm2 += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  return {
    similaritySame: cosineSimilarity(emb1, emb2),
    similarityDifferent: cosineSimilarity(emb1, emb3),
  };
}
