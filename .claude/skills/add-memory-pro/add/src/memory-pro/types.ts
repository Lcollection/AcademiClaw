/**
 * Memory Pro - Types
 *
 * Type definitions for the advanced memory system.
 */

export type MemoryCategory = 'preference' | 'fact' | 'decision' | 'entity' | 'other';

export interface MemoryEntry {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: MemoryCategory;
  scope?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryConfig {
  enabled: boolean;
  autoCapture: boolean;
  autoRecall: boolean;
  captureMaxChars: number;
  recallLimit: number;
  recallMinScore: number;
  dedupThreshold: number;
  dbPath: string;
  embedding: {
    apiKey: string;
    model: string;
    baseUrl?: string;
    dimensions?: number;
  };
}

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'preference',
  'fact',
  'decision',
  'entity',
  'other',
];

export const DEFAULT_CONFIG: Partial<MemoryConfig> = {
  enabled: true,
  autoCapture: true,
  autoRecall: true,
  captureMaxChars: 500,
  recallLimit: 5,
  recallMinScore: 0.3,
  dedupThreshold: 0.95,
  dbPath: '~/.academiclaw/memory/lancedb',
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
};
