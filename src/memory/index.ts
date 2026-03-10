/**
 * Memory System Entry Point
 *
 * Main entry point for the hybrid SQLite + LanceDB memory system.
 * Exports all memory functions for use in other modules.
 *
 * Usage:
 *   import { initMemory, storeMessageWithSync, retrieveMemory } from './memory/index.js';
 *
 *   // Initialize on startup
 *   await initMemory();
 *
 *   // Store messages with sync
 *   await storeMessageWithSync(message, groupFolder);
 *
 *   // Retrieve memories
 *   const memories = await retrieveMemory(chatJid, query, groupFolder);
 */

export { DEFAULT_MEMORY_CONFIG, isMemoryEnabled, logMemoryConfig } from './config.js';
export type { MemoryConfig } from './config.js';

export { OpenAIEmbeddingService, getEmbeddingManager, initEmbeddings } from './embeddings.js';
export type { EmbeddingService } from './embeddings.js';

export { LanceDBStore, getLanceDBManager } from './lancedb.js';
export type { MessageVector, SearchResult } from './lancedb.js';

export {
  storeMessageWithSync,
  syncBatchMessages,
  shouldSyncMessage,
} from './sync.js';

export {
  retrieveMemory,
  formatRetrievedMemory,
  getMemoryStats,
} from './retriever.js';
export type { RetrievedMemory } from './retriever.js';

import { initEmbeddings } from './embeddings.js';
import { isMemoryEnabled, logMemoryConfig } from './config.js';
import { logger } from '../logger.js';

/**
 * Initialize the memory system
 *
 * Call this during application startup, after database initialization.
 * This sets up the embedding service and logs configuration.
 *
 * @returns true if memory system is enabled and ready, false otherwise
 */
export async function initMemory(): Promise<boolean> {
  const enabled = isMemoryEnabled();

  if (!enabled) {
    logger.info('[Memory] Semantic memory is disabled (set MEMORY_ENABLED=true to enable)');
    return false;
  }

  try {
    // Initialize embedding service
    await initEmbeddings();

    // Log configuration
    logMemoryConfig();

    logger.info('[Memory] Memory system initialized successfully');
    return true;
  } catch (error) {
    logger.error({ error }, '[Memory] Failed to initialize memory system');

    // Check if graceful degradation is enabled
    const gracefulDegradation = process.env.MEMORY_GRACEFUL_DEGRADATION !== 'false';
    if (gracefulDegradation) {
      logger.warn('[Memory] Graceful degradation enabled, continuing without semantic search');
      return false;
    }

    throw error;
  }
}

/**
 * Check if the memory system is ready
 *
 * @returns true if memory system is enabled and embedding service is ready
 */
export async function isMemoryReady(): Promise<boolean> {
  if (!isMemoryEnabled()) {
    return false;
  }

  const embeddingManager = (await import('./embeddings.js')).getEmbeddingManager();
  return embeddingManager.isReady();
}
