/**
 * Memory Pro - Main Entry Point
 *
 * Advanced LanceDB memory system with auto-capture, auto-recall,
 * categorization, and importance scoring.
 *
 * Usage:
 *   import { initMemoryPro, getMemoryTools } from './memory-pro/index.js';
 *
 *   // Initialize on startup
 *   const config = initMemoryPro();
 *
 *   // Use tools
 *   const tools = getMemoryTools();
 *   const result = await tools.recall({ query: "user preferences" });
 */

import { loadConfig, logConfigStatus } from './config.js';
import { initEmbeddings, getEmbeddingService } from './embeddings.js';
import { initMemoryDB, getMemoryDB } from './db.js';
import { initAutoCapture, getAutoCapture } from './capture.js';
import { initMemoryTools, getMemoryTools, MEMORY_TOOLS } from './tools.js';
import type { MemoryConfig } from './types.js';
import { logger } from '../../logger.js';

export { MEMORY_TOOLS } from './tools.js';
export type { MemoryConfig, MemoryCategory, MemoryEntry, MemorySearchResult } from './types.js';
export { getEmbeddingService } from './embeddings.js';
export { getMemoryDB } from './db.js';
export { getAutoCapture, formatMemoriesForContext } from './capture.js';
export { getMemoryTools } from './tools.js';

/**
 * Initialize the Memory Pro system
 *
 * Call this during application startup.
 * Returns config if enabled, null otherwise.
 */
export async function initMemoryPro(): Promise<MemoryConfig | null> {
  const config = loadConfig();

  if (!config) {
    logger.info('[MemoryPro] Disabled (set MEMORY_ENABLED=true)');
    return null;
  }

  try {
    // Initialize components in order
    initEmbeddings(config);
    initMemoryDB(config);
    initAutoCapture(config);
    initMemoryTools(config);

    // Test embedding service
    const embeddings = getEmbeddingService();
    const testVector = await embeddings.embed('test');
    logger.info(`[MemoryPro] Embedding test passed (dim: ${testVector.length})`);

    // Log status
    logConfigStatus(config);

    logger.info('[MemoryPro] Memory system initialized successfully');
    return config;
  } catch (error) {
    logger.error({ error }, '[MemoryPro] Initialization failed');

    // Graceful degradation
    if (process.env.MEMORY_GRACEFUL_DEGRADATION !== 'false') {
      logger.warn('[MemoryPro] Graceful degradation enabled, continuing without memory');
      return null;
    }

    throw error;
  }
}

/**
 * Check if memory system is ready
 */
export async function isMemoryReady(): Promise<boolean> {
  try {
    const db = getMemoryDB();
    return db.isReady();
  } catch {
    return false;
  }
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<{
  enabled: boolean;
  count: number;
  ready: boolean;
}> {
  try {
    const db = getMemoryDB();
    const count = await db.count();
    return {
      enabled: true,
      count,
      ready: db.isReady(),
    };
  } catch {
    return {
      enabled: false,
      count: 0,
      ready: false,
    };
  }
}

/**
 * Auto-recall: Get relevant memories for a prompt
 *
 * Used in before_agent_start hook to inject context.
 */
export async function autoRecallMemories(
  prompt: string,
  config: MemoryConfig
): Promise<string | null> {
  if (!config.autoRecall) return null;
  if (prompt.length < 5) return null;

  try {
    const tools = getMemoryTools();
    const result = await tools.recall({
      query: prompt,
      limit: config.recallLimit,
    });

    if (result.memories.length === 0) return null;

    logger.info(`[MemoryPro] Auto-recall: ${result.memories.length} memories`);
    return formatMemoriesForContext(
      result.memories.map((m) => ({
        category: m.category,
        text: m.text,
      }))
    );
  } catch (error) {
    logger.warn({ error }, '[MemoryPro] Auto-recall failed');
    return null;
  }
}

/**
 * Auto-capture: Process message for potential memory
 *
 * Used in agent_end hook to capture important info.
 */
export async function autoCaptureMemory(
  text: string,
  config: MemoryConfig,
  scope?: string
): Promise<boolean> {
  if (!config.autoCapture) return false;

  try {
    const capture = getAutoCapture();
    return await capture.processMessage(text, scope);
  } catch (error) {
    logger.warn({ error }, '[MemoryPro] Auto-capture failed');
    return false;
  }
}
