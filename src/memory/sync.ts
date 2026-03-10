/**
 * Dual-Write Synchronization
 *
 * Wrapper around storeMessage that adds LanceDB sync.
 * SQLite is always written first (source of truth),
 * then LanceDB is updated asynchronously with graceful degradation.
 */

import { NewMessage } from '../types.js';
import { storeMessage as storeMessageSqlite } from '../db.js';
import { getLanceDBManager, MessageVector } from './lancedb.js';
import { getEmbeddingManager } from './embeddings.js';
import { DEFAULT_MEMORY_CONFIG } from './config.js';
import { logger } from '../logger.js';

/**
 * Store a message with dual-write synchronization
 *
 * 1. Always writes to SQLite first (synchronous, source of truth)
 * 2. Then writes to LanceDB (async, graceful degradation)
 *
 * @param msg - The message to store
 * @param groupFolder - The group folder for isolation
 */
export async function storeMessageWithSync(
  msg: NewMessage,
  groupFolder: string
): Promise<void> {
  // Always write to SQLite first (source of truth)
  storeMessageSqlite(msg);

  // Check if memory sync is enabled
  const config = DEFAULT_MEMORY_CONFIG;
  if (!config.enabled || !config.sync.syncOnWrite) {
    return;
  }

  // Check if embedding service is ready
  const embeddingManager = getEmbeddingManager();
  if (!embeddingManager.isReady()) {
    return;
  }

  // Sync to LanceDB asynchronously (don't block)
  syncToLanceDB(msg, groupFolder).catch((error) => {
    if (config.sync.gracefulDegradation) {
      // Log but don't fail
      logger.warn({ messageId: msg.id, error }, 'LanceDB sync failed (continuing)');
    } else {
      // Re-throw if graceful degradation is disabled
      throw error;
    }
  });
}

/**
 * Sync a message to LanceDB
 */
async function syncToLanceDB(
  msg: NewMessage,
  groupFolder: string
): Promise<void> {
  const embeddingManager = getEmbeddingManager();
  const embeddingService = embeddingManager.getService();
  if (!embeddingService) return;

  // Generate embedding for the message content
  const [vector] = await embeddingService.embedBatch([msg.content]);

  // Get or create LanceDB store
  const lancedbManager = getLanceDBManager();
  const store = lancedbManager.getStore(groupFolder);

  // Ensure store is initialized
  if (!store.isReady()) {
    await store.init();
  }

  // Upsert to LanceDB
  const messageVector: MessageVector = {
    id: msg.id,
    chat_jid: msg.chat_jid,
    content: msg.content,
    timestamp: msg.timestamp,
    sender_name: msg.sender_name,
    vector,
  };

  await store.upsert([messageVector]);
}

/**
 * Batch sync multiple messages to LanceDB
 * Useful for migrating historical data
 *
 * @param messages - Messages to sync
 * @param groupFolder - The group folder for isolation
 * @param onProgress - Optional progress callback
 */
export async function syncBatchMessages(
  messages: NewMessage[],
  groupFolder: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const config = DEFAULT_MEMORY_CONFIG;
  if (!config.enabled) {
    logger.info('[Memory] Sync disabled, skipping batch sync');
    return;
  }

  const embeddingManager = getEmbeddingManager();
  const embeddingService = embeddingManager.getService();
  if (!embeddingService) {
    logger.warn('[Memory] Embedding service not ready, skipping batch sync');
    return;
  }

  const lancedbManager = getLanceDBManager();
  const store = lancedbManager.getStore(groupFolder);

  // Ensure store is initialized
  if (!store.isReady()) {
    await store.init();
  }

  const batchSize = config.sync.batchSize;
  const total = messages.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    try {
      // Generate embeddings for the batch
      const texts = batch.map((m) => m.content);
      const vectors = await embeddingService.embedBatch(texts);

      // Prepare message vectors
      const messageVectors: MessageVector[] = batch.map((msg, idx) => ({
        id: msg.id,
        chat_jid: msg.chat_jid,
        content: msg.content,
        timestamp: msg.timestamp,
        sender_name: msg.sender_name,
        vector: vectors[idx],
      }));

      // Upsert to LanceDB
      await store.upsert(messageVectors);

      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + batchSize, total), total);
      }
    } catch (error) {
      logger.warn(
        { groupFolder, current: i, total, error },
        'Batch sync failed for batch'
      );
      if (!config.sync.gracefulDegradation) {
        throw error;
      }
    }
  }

  logger.info({ groupFolder, total }, 'Batch sync complete');
}

/**
 * Check if a message should be synced to LanceDB
 * Filters out bot messages and empty content
 */
export function shouldSyncMessage(msg: NewMessage): boolean {
  // Don't sync bot messages
  if (msg.is_bot_message) {
    return false;
  }

  // Don't sync empty content
  if (!msg.content || msg.content.trim().length === 0) {
    return false;
  }

  // Don't sync system messages
  if (msg.content.startsWith('<internal>') || msg.content.startsWith('<system>')) {
    return false;
  }

  return true;
}
