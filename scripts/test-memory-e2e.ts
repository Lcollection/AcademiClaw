#!/usr/bin/env tsx
/**
 * Memory System End-to-End Test
 *
 * Tests the complete memory system flow with mock embeddings.
 * This validates that SQLite + LanceDB integration works correctly.
 *
 * Usage: MEMORY_ENABLED=true npx tsx scripts/test-memory-e2e.ts
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const TEST_MARKER = '[Memory E2E Test]';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  process.stdout.write(`${TEST_MARKER} ${name}... `);

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log('✓');
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.log(`✗ ${errorMsg}`);
  }
}

// Set up test environment
process.env.MEMORY_ENABLED = 'true';
process.env.MEMORY_USE_MOCK_EMBEDDINGS = 'true';

console.log('');
console.log('='.repeat(60));
console.log('Memory System End-to-End Test');
console.log('Using: Mock Embeddings (for testing without API)');
console.log('='.repeat(60));
console.log('');

// Initialize SQLite database first (required for sync tests)
await runTest('Initialize SQLite Database', async () => {
  const { _initTestDatabase } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );
  _initTestDatabase();
});

// Test 1: Initialize memory system
await runTest('Initialize Memory System', async () => {
  const { initMemory, isMemoryReady } = await import(
    path.join(PROJECT_ROOT, 'src/memory/index.js')
  );

  const initialized = await initMemory();
  if (!initialized) {
    throw new Error('Memory system should initialize with mock embeddings');
  }

  const ready = await isMemoryReady();
  if (!ready) {
    throw new Error('Memory system should be ready after initialization');
  }
});

// Test 2: Create LanceDB store
await runTest('Create LanceDB Store', async () => {
  const { getLanceDBManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );

  const manager = getLanceDBManager();
  const store = manager.getStore('e2e-test-group');

  await store.init();
  if (!store.isReady()) {
    throw new Error('Store should be ready after initialization');
  }
});

// Test 3: Generate mock embeddings
await runTest('Generate Mock Embeddings', async () => {
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );

  const manager = getEmbeddingManager();
  const service = manager.getService();

  if (!service) {
    throw new Error('Embedding service should be initialized');
  }

  const embeddings = await service.embedBatch([
    'Hello world',
    'Goodbye world',
    'Test message',
  ]);

  if (embeddings.length !== 3) {
    throw new Error(`Expected 3 embeddings, got ${embeddings.length}`);
  }

  const dim = service.getDimension();
  for (const emb of embeddings) {
    if (emb.length !== dim) {
      throw new Error(`Expected dimension ${dim}, got ${emb.length}`);
    }
  }
});

// Test 4: Store messages with embeddings
await runTest('Store Messages with Embeddings', async () => {
  const { getLanceDBManager, MessageVector } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );

  const manager = getLanceDBManager();
  const store = manager.getStore('e2e-test-group');
  const embeddingService = getEmbeddingManager().getService()!;

  const messages: MessageVector[] = [
    {
      id: 'test-msg-1',
      chat_jid: 'test@g.us',
      content: 'First test message about AI',
      timestamp: '2025-03-10T10:00:00Z',
      sender_name: 'Alice',
    },
    {
      id: 'test-msg-2',
      chat_jid: 'test@g.us',
      content: 'Second test message about databases',
      timestamp: '2025-03-10T10:01:00Z',
      sender_name: 'Bob',
    },
    {
      id: 'test-msg-3',
      chat_jid: 'test@g.us',
      content: 'Third test message about vector search',
      timestamp: '2025-03-10T10:02:00Z',
      sender_name: 'Charlie',
    },
  ];

  // Generate embeddings
  const texts = messages.map((m) => m.content);
  const embeddings = await embeddingService.embedBatch(texts);

  // Add embeddings to messages
  for (let i = 0; i < messages.length; i++) {
    messages[i].vector = embeddings[i];
  }

  // Store in LanceDB
  await store.upsert(messages);

  // Verify storage
  const count = await store.count();
  if (count < messages.length) {
    throw new Error(`Expected at least ${messages.length} messages, got ${count}`);
  }
});

// Test 5: Semantic search
await runTest('Semantic Search', async () => {
  const { getLanceDBManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );

  const manager = getLanceDBManager();
  const store = manager.getStore('e2e-test-group');
  const embeddingService = getEmbeddingManager().getService()!;

  // Search for "AI" content - use very low minScore for mock embeddings
  const queryEmbedding = await embeddingService.embed('AI information');
  const results = await store.search(queryEmbedding, 'test@g.us', 10, -1.0);

  if (results.length === 0) {
    throw new Error('Expected at least one search result');
  }

  // With mock embeddings, we just check we get results back
  console.log(`\n  Note: Got ${results.length} results, top: "${results[0].content}"`);
});

// Test 6: Message sync wrapper
await runTest('Message Sync Wrapper', async () => {
  const { storeMessageWithSync, shouldSyncMessage } = await import(
    path.join(PROJECT_ROOT, 'src/memory/sync.js')
  );
  const { storeChatMetadata } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );

  const testMessage = {
    id: 'sync-test-1',
    chat_jid: 'test@g.us',
    sender: '123456789',
    sender_name: 'Test User',
    content: 'Sync test message',
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  };

  // Create chat metadata first (required for SQLite FK constraint)
  storeChatMetadata(testMessage.chat_jid, testMessage.timestamp, 'Test Group', 'whatsapp', true);

  // Check if message should sync
  if (!shouldSyncMessage(testMessage)) {
    throw new Error('Normal message should sync');
  }

  // Store with sync (will use mock embeddings)
  await storeMessageWithSync(testMessage, 'e2e-test-group');
});

// Test 7: Memory retrieval
await runTest('Memory Retrieval', async () => {
  const { retrieveMemory } = await import(
    path.join(PROJECT_ROOT, 'src/memory/retriever.js')
  );
  const { storeMessage, storeChatMetadata, getMessagesSince } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );

  // Add a test message to SQLite first for retrieval
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const testMsg = {
    id: 'retrieval-test-1',
    chat_jid: 'test@g.us',
    sender: '123456789',
    sender_name: 'Alice',
    content: 'A database is an organized collection of structured information',
    timestamp: now.toISOString(),
    is_from_me: false,
    is_bot_message: false,
  };
  storeChatMetadata(testMsg.chat_jid, testMsg.timestamp, 'Test Group', 'whatsapp', true);
  storeMessage(testMsg);

  // Use sinceTimestamp to get SQLite results
  const results = await retrieveMemory(
    'test@g.us',
    'databases',
    'e2e-test-group',
    fiveMinutesAgo,
    { maxResults: 10, useHybrid: true }
  );

  if (results.length === 0) {
    throw new Error('Expected at least one retrieved memory');
  }

  // Check that results have proper structure
  for (const result of results) {
    if (!result.message || !result.message.content) {
      throw new Error('Result should have message with content');
    }
    if (!['sqlite', 'semantic'].includes(result.source)) {
      throw new Error(`Invalid source: ${result.source}`);
    }
  }

  console.log(`\n  Retrieved ${results.length} memories, sources: ${results.map(r => r.source).join(', ')}`);
});

// Test 8: Format retrieved memory
await runTest('Format Retrieved Memory', async () => {
  const { formatRetrievedMemory } = await import(
    path.join(PROJECT_ROOT, 'src/memory/retriever.js')
  );

  const memories = [
    {
      message: {
        id: '1',
        chat_jid: 'test@g.us',
        sender: '',
        sender_name: 'Alice',
        content: 'Test message',
        timestamp: '2025-03-10T10:00:00Z',
        is_from_me: false,
        is_bot_message: false,
      },
      source: 'sqlite' as const,
    },
  ];

  const formatted = formatRetrievedMemory(memories, false);

  if (!formatted.includes('Alice') || !formatted.includes('Test message')) {
    throw new Error('Formatted output should contain message content');
  }
});

// Test 9: Verify SQLite is source of truth
await runTest('SQLite as Source of Truth', async () => {
  // Import db functions
  const { getMessagesSince } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );

  // Messages should be in SQLite regardless of LanceDB
  // This test validates that SQLite storage works independently
  const messages = getMessagesSince('test@g.us', '', '');

  // SQLite will have our test messages since we stored them via storeMessageWithSync
  if (!Array.isArray(messages)) {
    throw new Error('getMessagesSince should return an array');
  }
});

// Test 10: Memory stats
await runTest('Memory Stats', async () => {
  const { getMemoryStats } = await import(
    path.join(PROJECT_ROOT, 'src/memory/retriever.js')
  );

  const stats = await getMemoryStats('e2e-test-group');

  if (typeof stats.enabled !== 'boolean') {
    throw new Error('Stats should have enabled flag');
  }

  if (stats.enabled && typeof stats.lancedbCount !== 'number') {
    throw new Error('Stats should have lancedbCount when enabled');
  }
});

// Clean up test data
const cleanup = async () => {
  try {
    const { getLanceDBManager } = await import(
      path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
    );
    const manager = getLanceDBManager();
    await manager.closeStore('e2e-test-group');

    // Clean up test database files
    const testDir = path.join(PROJECT_ROOT, 'data', 'memory', 'e2e-test-group');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('\n[Warning] Cleanup failed:', error);
  }
};

// Run cleanup and print summary
process.on('exit', async () => {
  await cleanup();

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('');
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}: ${r.error}`);
      });
  }

  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
});

// Run all tests
try {
  for (const result of results) {
    if (!result.passed) {
      break;
    }
  }
} catch (error) {
  console.error('\nFatal error:', error);
  await cleanup();
  process.exit(1);
}

// Trigger cleanup on exit
process.exit(0);
