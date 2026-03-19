/**
 * Memory Pro - Tools
 *
 * Tool definitions for memory operations.
 */

import type { MemoryConfig, MemoryCategory } from './types.js';
import { MEMORY_CATEGORIES } from './types.js';
import { getEmbeddingService } from './embeddings.js';
import { getMemoryDB } from './db.js';
import { shouldCapture, detectCategory, formatMemoriesForContext } from './capture.js';
import { logger } from '../../logger.js';

/**
 * Tool parameter schemas (for documentation/LLM consumption)
 */
export const MEMORY_TOOLS = {
  memory_recall: {
    name: 'memory_recall',
    description:
      'Search through long-term memories using hybrid retrieval (vector + keyword). Use when you need context about user preferences, past decisions, or previously discussed topics.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for finding relevant memories',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (1-20, default: 5)',
        },
        category: {
          type: 'string',
          enum: MEMORY_CATEGORIES,
          description: 'Filter by category (optional)',
        },
        scope: {
          type: 'string',
          description: 'Filter by scope (optional)',
        },
      },
      required: ['query'],
    },
  },
  memory_store: {
    name: 'memory_store',
    description:
      'Save important information in long-term memory. Use for preferences, facts, decisions, and other notable information.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Information to remember',
        },
        importance: {
          type: 'number',
          description: 'Importance score 0-1 (default: 0.7)',
        },
        category: {
          type: 'string',
          enum: MEMORY_CATEGORIES,
          description: 'Memory category (default: auto-detect)',
        },
        scope: {
          type: 'string',
          description: 'Optional scope for the memory',
        },
      },
      required: ['text'],
    },
  },
  memory_forget: {
    name: 'memory_forget',
    description:
      'Delete specific memories. Supports both search-based and direct ID-based deletion.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find memory to delete',
        },
        memoryId: {
          type: 'string',
          description: 'Specific memory ID to delete (8+ char prefix or full UUID)',
        },
        scope: {
          type: 'string',
          description: 'Scope to search/delete from (optional)',
        },
      },
    },
  },
  memory_update: {
    name: 'memory_update',
    description:
      'Update an existing memory. For preferences/entities, changing text creates a new version (supersede).',
    parameters: {
      type: 'object',
      properties: {
        memoryId: {
          type: 'string',
          description: 'Memory ID (full UUID or 8+ char prefix)',
        },
        text: {
          type: 'string',
          description: 'New text content (triggers re-embedding)',
        },
        importance: {
          type: 'number',
          description: 'New importance score 0-1',
        },
        category: {
          type: 'string',
          enum: MEMORY_CATEGORIES,
          description: 'New category',
        },
      },
      required: ['memoryId'],
    },
  },
};

/**
 * Tool execution handlers
 */
export class MemoryTools {
  constructor(private config: MemoryConfig) {}

  /**
   * Execute memory_recall tool
   */
  async recall(params: {
    query: string;
    limit?: number;
    category?: MemoryCategory;
    scope?: string;
  }): Promise<{
    content: string;
    memories: Array<{
      id: string;
      text: string;
      category: MemoryCategory;
      importance: number;
      score: number;
    }>;
  }> {
    const { query, limit = 5, category, scope } = params;

    try {
      const embeddings = getEmbeddingService();
      const db = getMemoryDB();

      const vector = await embeddings.embed(query);
      const results = await db.search(vector, {
        limit,
        minScore: this.config.recallMinScore,
        category,
        scope,
      });

      if (results.length === 0) {
        return {
          content: 'No relevant memories found.',
          memories: [],
        };
      }

      const memories = results.map((r) => ({
        id: r.entry.id,
        text: r.entry.text,
        category: r.entry.category,
        importance: r.entry.importance,
        score: r.score,
      }));

      const content = results
        .map((r, i) => `${i + 1}. [${r.entry.category}] ${r.entry.text} (${(r.score * 100).toFixed(0)}%)`)
        .join('\n');

      return {
        content: `Found ${results.length} memories:\n\n${content}`,
        memories,
      };
    } catch (error) {
      logger.error({ error }, '[MemoryPro] Recall failed');
      return {
        content: `Recall error: ${String(error)}`,
        memories: [],
      };
    }
  }

  /**
   * Execute memory_store tool
   */
  async store(params: {
    text: string;
    importance?: number;
    category?: MemoryCategory;
    scope?: string;
  }): Promise<{
    content: string;
    id?: string;
    action: 'created' | 'duplicate' | 'error';
  }> {
    const { text, importance = 0.7, category, scope } = params;

    try {
      const embeddings = getEmbeddingService();
      const db = getMemoryDB();

      const vector = await embeddings.embed(text);

      // Check for duplicates
      const existing = await db.findSimilar(vector, this.config.dedupThreshold);
      if (existing) {
        return {
          content: `Similar memory already exists: "${existing.entry.text.slice(0, 100)}..."`,
          action: 'duplicate',
        };
      }

      // Auto-detect category if not provided
      const finalCategory = category ?? detectCategory(text);

      const entry = await db.store(text, vector, {
        importance,
        category: finalCategory,
        scope,
      });

      return {
        content: `Stored [${finalCategory}]: "${text.slice(0, 100)}..."`,
        id: entry.id,
        action: 'created',
      };
    } catch (error) {
      logger.error({ error }, '[MemoryPro] Store failed');
      return {
        content: `Store error: ${String(error)}`,
        action: 'error',
      };
    }
  }

  /**
   * Execute memory_forget tool
   */
  async forget(params: {
    query?: string;
    memoryId?: string;
    scope?: string;
  }): Promise<{
    content: string;
    action: 'deleted' | 'candidates' | 'not_found' | 'error';
    candidates?: Array<{ id: string; text: string; score: number }>;
  }> {
    const { query, memoryId, scope } = params;

    try {
      const db = getMemoryDB();

      // Direct deletion by ID
      if (memoryId) {
        await db.delete(memoryId);
        return {
          content: `Memory ${memoryId} forgotten.`,
          action: 'deleted',
        };
      }

      // Search-based deletion
      if (query) {
        const embeddings = getEmbeddingService();
        const vector = await embeddings.embed(query);
        const results = await db.search(vector, {
          limit: 5,
          minScore: 0.7,
          scope,
        });

        if (results.length === 0) {
          return {
            content: 'No matching memories found.',
            action: 'not_found',
          };
        }

        // Single high-confidence match: auto-delete
        if (results.length === 1 && results[0].score > 0.9) {
          await db.delete(results[0].entry.id);
          return {
            content: `Forgotten: "${results[0].entry.text}"`,
            action: 'deleted',
          };
        }

        // Multiple matches: return candidates
        const candidates = results.map((r) => ({
          id: r.entry.id,
          text: r.entry.text,
          score: r.score,
        }));

        const list = candidates
          .map((c) => `- [${c.id.slice(0, 8)}] ${c.text.slice(0, 60)}... (${(c.score * 100).toFixed(0)}%)`)
          .join('\n');

        return {
          content: `Found ${candidates.length} candidates. Specify memoryId:\n${list}`,
          action: 'candidates',
          candidates,
        };
      }

      return {
        content: 'Provide query or memoryId.',
        action: 'error',
      };
    } catch (error) {
      logger.error({ error }, '[MemoryPro] Forget failed');
      return {
        content: `Forget error: ${String(error)}`,
        action: 'error',
      };
    }
  }
}

let memoryTools: MemoryTools | null = null;

export function initMemoryTools(config: MemoryConfig): MemoryTools {
  memoryTools = new MemoryTools(config);
  return memoryTools;
}

export function getMemoryTools(): MemoryTools {
  if (!memoryTools) throw new Error('MemoryTools not initialized');
  return memoryTools;
}
