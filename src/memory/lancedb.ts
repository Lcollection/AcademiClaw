/**
 * LanceDB Store
 *
 * Manages LanceDB connection and vector storage for semantic search.
 * Each group has its own isolated LanceDB instance.
 */

import * as lancedb from '@lancedb/lancedb';
import fs from 'fs';
import path from 'path';
import { DEFAULT_MEMORY_CONFIG } from './config.js';

export interface MessageVector extends Record<string, unknown> {
  id: string;
  chat_jid: string;
  content: string;
  timestamp: string;
  sender_name: string;
  vector?: number[];
}

export interface SearchResult extends MessageVector {
  _distance?: number;
}

/**
 * LanceDB store for a single group
 */
export class LanceDBStore {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private dbPath: string;
  private tableName = 'messages';
  private groupFolder: string;

  constructor(groupFolder: string) {
    this.groupFolder = groupFolder;
    this.dbPath = DEFAULT_MEMORY_CONFIG.getDbPath(groupFolder);
  }

  /**
   * Initialize LanceDB connection and create table if needed
   */
  async init(): Promise<boolean> {
    try {
      // Create directory if it doesn't exist
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

      // Connect to LanceDB
      this.db = await lancedb.connect(this.dbPath);

      // Check if table exists
      const tables = await this.db.tableNames();

      if (!tables.includes(this.tableName)) {
        await this.createTable();
      } else {
        this.table = await this.db.openTable(this.tableName);
      }

      console.log(`[Memory] LanceDB initialized for group: ${this.groupFolder}`);
      return true;
    } catch (error) {
      console.error(`[Memory] LanceDB init failed for ${this.groupFolder}:`, error);
      this.db = null;
      this.table = null;
      return false;
    }
  }

  /**
   * Create the messages table with vector column
   */
  private async createTable(): Promise<void> {
    if (!this.db) return;

    // LanceDB schema using the new API format
    const data = [
      {
        id: '',
        chat_jid: '',
        content: '',
        timestamp: '',
        sender_name: '',
        vector: new Array(DEFAULT_MEMORY_CONFIG.embedding.dimension).fill(0),
      },
    ];

    this.table = await this.db.createTable(this.tableName, data);

    console.log(`[Memory] Created table: ${this.tableName}`);
  }

  /**
   * Add or update message vectors
   */
  async upsert(messages: MessageVector[]): Promise<void> {
    if (!this.table || messages.length === 0) return;

    try {
      await this.table.add(messages);
    } catch (error) {
      console.error(`[Memory] LanceDB upsert failed for ${this.groupFolder}:`, error);
      throw error;
    }
  }

  /**
   * Semantic search by query vector
   */
  async search(
    queryVector: number[],
    chatJid: string,
    limit: number = 20,
    minScore: number = 0.7
  ): Promise<SearchResult[]> {
    if (!this.table) return [];

    try {
      const results = await this.table
        .vectorSearch(queryVector)
        .where(`chat_jid = '${chatJid}'`)
        .limit(limit)
        .toArray();

      // Convert distance to similarity score (1 - normalized distance)
      const minDistance = 1 - minScore;

      return results
        .filter((r: any) => (r._distance || 1) <= minDistance)
        .map((r: any) => ({
          id: r.id,
          chat_jid: r.chat_jid,
          content: r.content,
          timestamp: r.timestamp,
          sender_name: r.sender_name,
          _distance: r._distance,
        }));
    } catch (error) {
      console.error(`[Memory] LanceDB search failed for ${this.groupFolder}:`, error);
      return [];
    }
  }

  /**
   * Get count of messages in the store
   */
  async count(): Promise<number> {
    if (!this.table) return 0;

    try {
      // Use a simple query to count - just get ids
      const results = await this.table.query().select(['id']).limit(1000000).toArray();
      return results.length;
    } catch {
      return 0;
    }
  }

  /**
   * Delete messages by ID
   */
  async delete(messageIds: string[]): Promise<void> {
    if (!this.table || messageIds.length === 0) return;

    try {
      // Build WHERE clause for IDs
      const ids = messageIds.map((id) => `'${id}'`).join(',');
      await this.table.delete(`id IN (${ids})`);
    } catch (error) {
      console.error(`[Memory] LanceDB delete failed for ${this.groupFolder}:`, error);
    }
  }

  /**
   * Check if the store is ready
   */
  isReady(): boolean {
    return this.db !== null && this.table !== null;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.table = null;
    }
  }
}

/**
 * Store manager for managing multiple LanceDB instances (one per group)
 */
class LanceDBManager {
  private static instance: LanceDBManager;
  private stores: Map<string, LanceDBStore> = new Map();

  private constructor() {}

  static getInstance(): LanceDBManager {
    if (!LanceDBManager.instance) {
      LanceDBManager.instance = new LanceDBManager();
    }
    return LanceDBManager.instance;
  }

  /**
   * Get or create a store for a group
   */
  getStore(groupFolder: string): LanceDBStore {
    if (!this.stores.has(groupFolder)) {
      const store = new LanceDBStore(groupFolder);
      this.stores.set(groupFolder, store);
    }
    return this.stores.get(groupFolder)!;
  }

  /**
   * Initialize a store for a group
   */
  async initStore(groupFolder: string): Promise<boolean> {
    const store = this.getStore(groupFolder);
    return await store.init();
  }

  /**
   * Close a specific store
   */
  async closeStore(groupFolder: string): Promise<void> {
    const store = this.stores.get(groupFolder);
    if (store) {
      await store.close();
      this.stores.delete(groupFolder);
    }
  }

  /**
   * Close all stores
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.stores.values()).map((store) => store.close())
    );
    this.stores.clear();
  }
}

/**
 * Get the singleton LanceDB manager
 */
export function getLanceDBManager(): LanceDBManager {
  return LanceDBManager.getInstance();
}
