/**
 * Hybrid Memory Retrieval
 *
 * Combines exact SQLite queries with semantic LanceDB search.
 * Uses Reciprocal Rank Fusion (RRF) to merge results.
 */

import { getMessagesSince } from '../db.js';
import { NewMessage } from '../types.js';
import { getLanceDBManager } from './lancedb.js';
import { getEmbeddingManager } from './embeddings.js';
import { DEFAULT_MEMORY_CONFIG } from './config.js';
import { logger } from '../logger.js';

export interface RetrievedMemory {
  message: NewMessage;
  score?: number;
  source: 'sqlite' | 'semantic';
}

/**
 * Reciprocal Rank Fusion (RRF) algorithm
 * Combines rankings from multiple retrieval systems
 *
 * @param results1 - First result set with scores
 * @param results2 - Second result set with scores
 * @param k - RRF constant (default 60)
 * @returns Fused and ranked results
 */
function reciprocalRankFusion<T extends { score?: number }>(
  results1: T[],
  results2: T[],
  k: number = 60
): T[] {
  const fused = new Map<string, T>();

  // Process first result set
  for (const [i, result] of results1.entries()) {
    const id = (result as any).id || `${i}`;
    const score = result.score ?? 1;
    const rrfScore = 1 / (k + i + 1);

    fused.set(id, {
      ...result,
      score: (fused.get(id)?.score ?? 0) + rrfScore * score,
    });
  }

  // Process second result set
  for (const [i, result] of results2.entries()) {
    const id = (result as any).id || `${i}`;
    const score = result.score ?? 1;
    const rrfScore = 1 / (k + i + 1);

    const existing = fused.get(id);
    if (existing) {
      existing.score = (existing.score ?? 0) + rrfScore * score;
    } else {
      fused.set(id, {
        ...result,
        score: rrfScore * score,
      });
    }
  }

  // Sort by score descending
  return Array.from(fused.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Hybrid memory retrieval combining SQLite and LanceDB
 *
 * @param chatJid - The chat JID to search in
 * @param query - The search query for semantic search
 * @param groupFolder - The group folder for LanceDB isolation
 * @param sinceTimestamp - Optional timestamp for SQLite exact match
 * @param options - Retrieval options
 * @returns Retrieved memories with source information
 */
export async function retrieveMemory(
  chatJid: string,
  query: string,
  groupFolder: string,
  sinceTimestamp?: string,
  options?: {
    maxResults?: number;
    useHybrid?: boolean;
  }
): Promise<RetrievedMemory[]> {
  const config = DEFAULT_MEMORY_CONFIG;
  const maxResults = options?.maxResults ?? config.search.maxSemanticResults;
  const useHybrid = options?.useHybrid ?? config.search.enableHybrid;

  const results: RetrievedMemory[] = [];
  const seenIds = new Set<string>();

  // 1. Get exact matches from SQLite (temporal context)
  let sqliteResults: NewMessage[] = [];
  if (sinceTimestamp) {
    sqliteResults = getMessagesSince(chatJid, sinceTimestamp, '');
  }

  for (const msg of sqliteResults) {
    if (!seenIds.has(msg.id)) {
      results.push({
        message: msg,
        source: 'sqlite',
      });
      seenIds.add(msg.id);
    }
  }

  // 2. Get semantic matches from LanceDB if enabled
  if (config.enabled && useHybrid && query) {
    try {
      const embeddingManager = getEmbeddingManager();
      const embeddingService = embeddingManager.getService();

      if (embeddingService) {
        const [queryEmbedding] = await embeddingService.embedBatch([query]);

        const lancedbManager = getLanceDBManager();
        const store = lancedbManager.getStore(groupFolder);

        if (store.isReady()) {
          const semanticResults = await store.search(
            queryEmbedding,
            chatJid,
            maxResults,
            config.search.minScore
          );

          for (const result of semanticResults) {
            if (!seenIds.has(result.id)) {
              // Convert distance to similarity score
              const similarity = result._distance ? 1 - result._distance : 0.5;

              results.push({
                message: {
                  id: result.id,
                  chat_jid: result.chat_jid,
                  sender: '',
                  sender_name: result.sender_name,
                  content: result.content,
                  timestamp: result.timestamp,
                  is_from_me: false,
                  is_bot_message: false,
                },
                score: similarity,
                source: 'semantic',
              });
              seenIds.add(result.id);
            }
          }
        }
      }
    } catch (error) {
      logger.warn({ error, chatJid, groupFolder }, 'Semantic search failed, using SQLite only');
    }
  }

  // 3. Sort and limit results
  // Prioritize: recent messages first, then by semantic score
  return results
    .sort((a, b) => {
      // SQLite results (recent) come first
      if (a.source === 'sqlite' && b.source === 'semantic') {
        return -1;
      }
      if (a.source === 'semantic' && b.source === 'sqlite') {
        return 1;
      }

      // Within same source, sort by score or timestamp
      if (a.source === 'sqlite' && b.source === 'sqlite') {
        return new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime();
      }

      // Semantic results by score
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, maxResults);
}

/**
 * Format retrieved memories for display or agent context
 *
 * @param retrieved - Retrieved memories
 * @param includeScores - Whether to include similarity scores
 * @returns Formatted string
 */
export function formatRetrievedMemory(
  retrieved: RetrievedMemory[],
  includeScores: boolean = false
): string {
  const sections: string[] = [];

  // Group by source
  const sqlite = retrieved.filter((r) => r.source === 'sqlite');
  const semantic = retrieved.filter((r) => r.source === 'semantic');

  if (sqlite.length > 0) {
    sections.push('## Recent Messages');
    for (const r of sqlite) {
      sections.push(formatMemoryMessage(r, includeScores));
    }
  }

  if (semantic.length > 0) {
    if (sections.length > 0) {
      sections.push('');
    }
    sections.push('## Relevant Context (Semantic Search)');
    for (const r of semantic) {
      sections.push(formatMemoryMessage(r, includeScores));
    }
  }

  return sections.join('\n');
}

/**
 * Format a single memory message
 */
function formatMemoryMessage(
  retrieved: RetrievedMemory,
  includeScore: boolean
): string {
  const { message, score } = retrieved;
  const date = new Date(message.timestamp);
  const timeStr = date.toLocaleString();

  const scoreStr =
    includeScore && score !== undefined ? ` [relevance: ${(score * 100).toFixed(0)}%]` : '';

  return `[${timeStr}] ${message.sender_name}${scoreStr}\n${message.content}`;
}

/**
 * Get memory statistics for a group
 */
export async function getMemoryStats(groupFolder: string): Promise<{
  lancedbCount?: number;
  enabled: boolean;
}> {
  const config = DEFAULT_MEMORY_CONFIG;
  const stats: {
    lancedbCount?: number;
    enabled: boolean;
  } = {
    enabled: config.enabled,
  };

  if (config.enabled) {
    const lancedbManager = getLanceDBManager();
    const store = lancedbManager.getStore(groupFolder);

    if (store.isReady()) {
      stats.lancedbCount = await store.count();
    }
  }

  return stats;
}
