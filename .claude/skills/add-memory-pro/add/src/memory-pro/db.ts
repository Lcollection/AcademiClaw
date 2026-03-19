/**
 * Memory Pro - Database
 *
 * LanceDB-based vector storage for memories.
 */

import * as lancedb from '@lancedb/lancedb';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { MemoryEntry, MemorySearchResult, MemoryConfig, MemoryCategory } from './types.js';
import { getVectorDimensions } from './config.js';
import { logger } from '../../logger.js';

const TABLE_NAME = 'memories';

/**
 * LanceDB-backed memory storage
 */
export class MemoryDB {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private initPromise: Promise<void> | null = null;
  private dbPath: string;
  private vectorDim: number;

  constructor(config: MemoryConfig) {
    this.dbPath = this.resolvePath(config.dbPath || '~/.academiclaw/memory/lancedb');
    this.vectorDim = getVectorDimensions(
      config.embedding.model,
      config.embedding.dimensions
    );
  }

  private resolvePath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(os.homedir(), p.slice(2));
    }
    return p;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (this.table) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    // Create directory
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

    // Connect to LanceDB
    this.db = await lancedb.connect(this.dbPath);
    const tables = await this.db.tableNames();

    if (tables.includes(TABLE_NAME)) {
      this.table = await this.db.openTable(TABLE_NAME);
    } else {
      // Create table with schema
      this.table = await this.db.createTable(TABLE_NAME, [
        {
          id: '__schema__',
          text: '',
          vector: Array.from({ length: this.vectorDim }).fill(0) as number[],
          importance: 0,
          category: 'other',
          scope: '',
          createdAt: 0,
          updatedAt: 0,
        },
      ]);
      await this.table.delete('id = "__schema__"');
    }

    logger.info(`[MemoryPro] Database initialized at ${this.dbPath}`);
  }

  /**
   * Store a new memory
   */
  async store(
    text: string,
    vector: number[],
    options?: {
      importance?: number;
      category?: MemoryCategory;
      scope?: string;
    }
  ): Promise<MemoryEntry> {
    await this.ensureInit();

    const entry: MemoryEntry = {
      id: randomUUID(),
      text,
      vector,
      importance: options?.importance ?? 0.7,
      category: options?.category ?? 'other',
      scope: options?.scope,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.table!.add([entry]);
    return entry;
  }

  /**
   * Search memories by vector similarity
   */
  async search(
    vector: number[],
    options?: {
      limit?: number;
      minScore?: number;
      scope?: string;
      category?: MemoryCategory;
    }
  ): Promise<MemorySearchResult[]> {
    await this.ensureInit();

    const limit = options?.limit ?? 5;
    const minScore = options?.minScore ?? 0.3;

    let query = this.table!.vectorSearch(vector).limit(limit * 2);

    if (options?.scope) {
      query = query.where(`scope = '${options.scope}'`);
    }
    if (options?.category) {
      query = query.where(`category = '${options.category}'`);
    }

    const results = await query.toArray();

    // Convert L2 distance to similarity score
    return results
      .map((row: any) => {
        const distance = row._distance ?? 0;
        const score = 1 / (1 + distance);
        return {
          entry: {
            id: row.id,
            text: row.text,
            vector: row.vector,
            importance: row.importance,
            category: row.category,
            scope: row.scope,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
          score,
        };
      })
      .filter((r) => r.score >= minScore)
      .slice(0, limit);
  }

  /**
   * Find similar memories (for deduplication)
   */
  async findSimilar(
    vector: number[],
    threshold: number = 0.95
  ): Promise<MemorySearchResult | null> {
    const results = await this.search(vector, { limit: 1, minScore: threshold });
    return results[0] ?? null;
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInit();

    // Validate UUID to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid memory ID: ${id}`);
    }

    await this.table!.delete(`id = '${id}'`);
    return true;
  }

  /**
   * Get memory count
   */
  async count(): Promise<number> {
    await this.ensureInit();
    return this.table!.countRows();
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.table !== null;
  }
}

// Singleton
let memoryDB: MemoryDB | null = null;

export function initMemoryDB(config: MemoryConfig): MemoryDB {
  memoryDB = new MemoryDB(config);
  return memoryDB;
}

export function getMemoryDB(): MemoryDB {
  if (!memoryDB) {
    throw new Error('Memory DB not initialized');
  }
  return memoryDB;
}
