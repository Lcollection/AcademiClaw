/**
 * Memory System Unit Tests
 *
 * Tests for the hybrid SQLite + LanceDB memory system.
 * Run with: npm test -- memory.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Test utilities
const TEST_DB_PATH = path.join(process.cwd(), 'store', 'test-messages.db');
const TEST_MEMORY_PATH = path.join(process.cwd(), 'data', 'memory', 'test-group');

function cleanupTestFiles(): void {
  // Clean up test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Clean up test memory directory
  if (fs.existsSync(TEST_MEMORY_PATH)) {
    fs.rmSync(TEST_MEMORY_PATH, { recursive: true, force: true });
  }
}

describe('Memory System Configuration', () => {
  it('should load default configuration', async () => {
    const { DEFAULT_MEMORY_CONFIG } = await import('./config.js');

    expect(DEFAULT_MEMORY_CONFIG).toBeDefined();
    expect(DEFAULT_MEMORY_CONFIG.enabled).toBe(false); // Default is disabled
    expect(DEFAULT_MEMORY_CONFIG.embedding).toBeDefined();
    expect(DEFAULT_MEMORY_CONFIG.embedding.provider).toBe('openai');
    expect(DEFAULT_MEMORY_CONFIG.embedding.model).toBe('text-embedding-3-small');
    expect(DEFAULT_MEMORY_CONFIG.embedding.dimension).toBe(1536);
  });

  it('should have search configuration with defaults', async () => {
    const { DEFAULT_MEMORY_CONFIG } = await import('./config.js');

    expect(DEFAULT_MEMORY_CONFIG.search).toBeDefined();
    expect(DEFAULT_MEMORY_CONFIG.search.maxSemanticResults).toBe(20);
    expect(DEFAULT_MEMORY_CONFIG.search.minScore).toBe(0.7);
    expect(DEFAULT_MEMORY_CONFIG.search.enableHybrid).toBe(true);
  });

  it('should have sync configuration with defaults', async () => {
    const { DEFAULT_MEMORY_CONFIG } = await import('./config.js');

    expect(DEFAULT_MEMORY_CONFIG.sync).toBeDefined();
    expect(DEFAULT_MEMORY_CONFIG.sync.batchSize).toBe(32);
    expect(DEFAULT_MEMORY_CONFIG.sync.syncOnWrite).toBe(true);
    expect(DEFAULT_MEMORY_CONFIG.sync.gracefulDegradation).toBe(true);
  });

  it('should detect when memory is disabled by default', async () => {
    const { isMemoryEnabled } = await import('./config.js');

    expect(isMemoryEnabled()).toBe(false);
  });
});

describe('Memory Module Imports', () => {
  it('should import config module', async () => {
    const configModule = await import('./config.js');

    expect(configModule.DEFAULT_MEMORY_CONFIG).toBeDefined();
    expect(configModule.isMemoryEnabled).toBeInstanceOf(Function);
    expect(configModule.logMemoryConfig).toBeInstanceOf(Function);
  });

  it('should import embeddings module', async () => {
    const embeddingsModule = await import('./embeddings.js');

    expect(embeddingsModule.OpenAIEmbeddingService).toBeDefined();
    expect(embeddingsModule.getEmbeddingManager).toBeInstanceOf(Function);
    expect(embeddingsModule.initEmbeddings).toBeInstanceOf(Function);
  });

  it('should import lancedb module', async () => {
    const lancedbModule = await import('./lancedb.js');

    expect(lancedbModule.LanceDBStore).toBeDefined();
    expect(lancedbModule.getLanceDBManager).toBeInstanceOf(Function);
  });

  it('should import sync module', async () => {
    const syncModule = await import('./sync.js');

    expect(syncModule.storeMessageWithSync).toBeInstanceOf(Function);
    expect(syncModule.syncBatchMessages).toBeInstanceOf(Function);
    expect(syncModule.shouldSyncMessage).toBeInstanceOf(Function);
  });

  it('should import retriever module', async () => {
    const retrieverModule = await import('./retriever.js');

    expect(retrieverModule.retrieveMemory).toBeInstanceOf(Function);
    expect(retrieverModule.formatRetrievedMemory).toBeInstanceOf(Function);
    expect(retrieverModule.getMemoryStats).toBeInstanceOf(Function);
  });

  it('should import index module', async () => {
    const indexModule = await import('./index.js');

    expect(indexModule.initMemory).toBeInstanceOf(Function);
    expect(indexModule.isMemoryReady).toBeInstanceOf(Function);
  });
});

describe('Embedding Service', () => {
  it('should create embedding manager singleton', async () => {
    const { getEmbeddingManager } = await import('./embeddings.js');

    const manager1 = getEmbeddingManager();
    const manager2 = getEmbeddingManager();

    expect(manager1).toBe(manager2);
  });

  it('should return null service when not initialized', async () => {
    const { getEmbeddingManager } = await import('./embeddings.js');

    const manager = getEmbeddingManager();
    const service = manager.getService();

    expect(service).toBeNull();
  });

  it('should report not ready when not initialized', async () => {
    const { getEmbeddingManager } = await import('./embeddings.js');

    const manager = getEmbeddingManager();
    expect(manager.isReady()).toBe(false);
  });
});

describe('LanceDB Store', () => {
  beforeEach(() => {
    cleanupTestFiles();
  });

  afterEach(() => {
    cleanupTestFiles();
  });

  it('should create LanceDB store for a group', async () => {
    const { getLanceDBManager } = await import('./lancedb.js');

    const manager = getLanceDBManager();
    const store = manager.getStore('test-group');

    expect(store).toBeDefined();
    expect(store.isReady()).toBe(false);
  });

  it('should return same store for same group', async () => {
    const { getLanceDBManager } = await import('./lancedb.js');

    const manager = getLanceDBManager();
    const store1 = manager.getStore('test-group');
    const store2 = manager.getStore('test-group');

    expect(store1).toBe(store2);
  });

  it('should return different stores for different groups', async () => {
    const { getLanceDBManager } = await import('./lancedb.js');

    const manager = getLanceDBManager();
    const store1 = manager.getStore('test-group-1');
    const store2 = manager.getStore('test-group-2');

    expect(store1).not.toBe(store2);
  });
});

describe('Message Sync Filter', () => {
  it('should sync normal messages', async () => {
    const { shouldSyncMessage } = await import('./sync.js');

    const msg = {
      id: 'test-1',
      chat_jid: 'test@g.us',
      sender: '123',
      sender_name: 'Test User',
      content: 'Hello world',
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: false,
    };

    expect(shouldSyncMessage(msg)).toBe(true);
  });

  it('should not sync bot messages', async () => {
    const { shouldSyncMessage } = await import('./sync.js');

    const msg = {
      id: 'test-1',
      chat_jid: 'test@g.us',
      sender: '123',
      sender_name: 'Bot',
      content: 'Bot message',
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: true,
    };

    expect(shouldSyncMessage(msg)).toBe(false);
  });

  it('should not sync empty messages', async () => {
    const { shouldSyncMessage } = await import('./sync.js');

    const msg = {
      id: 'test-1',
      chat_jid: 'test@g.us',
      sender: '123',
      sender_name: 'Test User',
      content: '',
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: false,
    };

    expect(shouldSyncMessage(msg)).toBe(false);
  });

  it('should not sync system messages', async () => {
    const { shouldSyncMessage } = await import('./sync.js');

    const msg = {
      id: 'test-1',
      chat_jid: 'test@g.us',
      sender: '123',
      sender_name: 'Test User',
      content: '<internal>system message</internal>',
      timestamp: new Date().toISOString(),
      is_from_me: false,
      is_bot_message: false,
    };

    expect(shouldSyncMessage(msg)).toBe(false);
  });
});

describe('Memory Retrieval', () => {
  it('should format retrieved memory without scores', async () => {
    const { formatRetrievedMemory } = await import('./retriever.js');

    const memories = [
      {
        message: {
          id: '1',
          chat_jid: 'test@g.us',
          sender: '',
          sender_name: 'Alice',
          content: 'Hello',
          timestamp: '2025-03-10T10:00:00Z',
          is_from_me: false,
          is_bot_message: false,
        },
        source: 'sqlite' as const,
      },
      {
        message: {
          id: '2',
          chat_jid: 'test@g.us',
          sender: '',
          sender_name: 'Bob',
          content: 'Hi there',
          timestamp: '2025-03-10T10:01:00Z',
          is_from_me: false,
          is_bot_message: false,
        },
        source: 'semantic' as const,
        score: 0.85,
      },
    ];

    const formatted = formatRetrievedMemory(memories, false);

    expect(formatted).toContain('Recent Messages');
    expect(formatted).toContain('Alice');
    expect(formatted).toContain('Hello');
    expect(formatted).toContain('Relevant Context');
    expect(formatted).toContain('Bob');
    expect(formatted).not.toContain('[relevance:');
  });

  it('should format retrieved memory with scores', async () => {
    const { formatRetrievedMemory } = await import('./retriever.js');

    const memories = [
      {
        message: {
          id: '1',
          chat_jid: 'test@g.us',
          sender: '',
          sender_name: 'Alice',
          content: 'Hello',
          timestamp: '2025-03-10T10:00:00Z',
          is_from_me: false,
          is_bot_message: false,
        },
        source: 'semantic' as const,
        score: 0.85,
      },
    ];

    const formatted = formatRetrievedMemory(memories, true);

    expect(formatted).toContain('[relevance: 85%]');
  });
});

describe('Memory Initialization', () => {
  it('should initialize memory system when disabled', async () => {
    // Ensure memory is disabled
    process.env.MEMORY_ENABLED = 'false';
    process.env.OPENAI_API_KEY = '';

    const { initMemory } = await import('./index.js');

    // Should not throw and should return false
    const result = await initMemory();
    expect(result).toBe(false);
  });

  it('should gracefully handle missing API key', async () => {
    // Enable memory but no API key
    process.env.MEMORY_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    const { initMemory } = await import('./index.js');

    // Should not throw with graceful degradation
    const result = await initMemory();
    expect(result).toBe(false);
  });
});

describe('Module Integration', () => {
  it('should export all expected functions from index', async () => {
    const indexModule = await import('./index.js');

    // Config exports
    expect(indexModule.DEFAULT_MEMORY_CONFIG).toBeDefined();
    expect(indexModule.isMemoryEnabled).toBeInstanceOf(Function);

    // Embedding exports
    expect(indexModule.getEmbeddingManager).toBeInstanceOf(Function);

    // LanceDB exports
    expect(indexModule.getLanceDBManager).toBeInstanceOf(Function);

    // Sync exports
    expect(indexModule.storeMessageWithSync).toBeInstanceOf(Function);
    expect(indexModule.syncBatchMessages).toBeInstanceOf(Function);
    expect(indexModule.shouldSyncMessage).toBeInstanceOf(Function);

    // Retriever exports
    expect(indexModule.retrieveMemory).toBeInstanceOf(Function);
    expect(indexModule.formatRetrievedMemory).toBeInstanceOf(Function);
    expect(indexModule.getMemoryStats).toBeInstanceOf(Function);

    // Main exports
    expect(indexModule.initMemory).toBeInstanceOf(Function);
    expect(indexModule.isMemoryReady).toBeInstanceOf(Function);
  });

  it('should have consistent type exports', async () => {
    const indexModule = await import('./index.js');

    // These should be functions/classes
    expect(typeof indexModule.OpenAIEmbeddingService).toBe('function');
    expect(typeof indexModule.LanceDBStore).toBe('function');
  });
});
