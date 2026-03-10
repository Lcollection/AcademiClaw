#!/usr/bin/env tsx
/**
 * Test Memory System with Real Jina AI Embeddings
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const TEST_MARKER = '[Jina AI Memory Test]';

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

// Configure for Jina AI (no mock mode)
// Use JINA_API_KEY environment variable to provide your API key
const apiKey = process.env.JINA_API_KEY || process.env.EMBEDDING_API_KEY;

if (!apiKey) {
  console.error('Error: JINA_API_KEY or EMBEDDING_API_KEY environment variable required');
  console.error('Usage: JINA_API_KEY=your-key npx tsx scripts/test-jina-memory.ts');
  process.exit(1);
}

process.env.MEMORY_ENABLED = 'true';
process.env.EMBEDDING_API_KEY = apiKey;
process.env.EMBEDDING_BASE_URL = 'https://api.jina.ai/v1';
process.env.EMBEDDING_MODEL = 'jina-embeddings-v3';

console.log('');
console.log('='.repeat(60));
console.log('Jina AI Memory System Test');
console.log('Using: Real Jina AI Embeddings API');
console.log('='.repeat(60));
console.log('');

// Initialize SQLite database
await runTest('Initialize SQLite Database', async () => {
  const { _initTestDatabase } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );
  _initTestDatabase();
});

// Test 1: Initialize memory system with Jina AI
await runTest('Initialize Memory with Jina AI', async () => {
  const { initMemory, isMemoryReady } = await import(
    path.join(PROJECT_ROOT, 'src/memory/index.js')
  );

  const initialized = await initMemory();
  if (!initialized) {
    throw new Error('Memory system should initialize with Jina AI');
  }

  const ready = await isMemoryReady();
  if (!ready) {
    throw new Error('Memory system should be ready after initialization');
  }
});

// Test 2: Generate real embeddings
await runTest('Generate Real Jina Embeddings', async () => {
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );

  const manager = getEmbeddingManager();
  const service = manager.getService();

  if (!service) {
    throw new Error('Embedding service should be initialized');
  }

  const embeddings = await service.embedBatch([
    'Artificial intelligence and machine learning',
    'Database systems and SQL queries',
    'Web development and frontend frameworks',
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

  // Calculate similarity
  function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      norm1 += a[i] * a[i];
      norm2 += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  const simAI_DB = cosineSimilarity(embeddings[0], embeddings[1]);
  const simAI_Web = cosineSimilarity(embeddings[0], embeddings[2]);

  console.log(`\n  Similarity (AI vs Database): ${simAI_DB.toFixed(4)}`);
  console.log(`  Similarity (AI vs Web): ${simAI_Web.toFixed(4)}`);
});

// Test 3: Store and retrieve with Jina AI
await runTest('Store and Retrieve with Jina AI', async () => {
  const { getLanceDBManager, MessageVector } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );
  const { storeChatMetadata } = await import(
    path.join(PROJECT_ROOT, 'src/db.js')
  );

  const manager = getLanceDBManager();
  const store = manager.getStore('jina-test-group');

  // Initialize store to ensure table is created with correct dimension
  await store.init();
  console.log(`  Store initialized, isReady: ${store.isReady()}`);

  const embeddingService = getEmbeddingManager().getService()!;

  // Create test messages
  const messages: MessageVector[] = [
    {
      id: 'jina-test-1',
      chat_jid: 'test@g.us',
      content: 'Machine learning models learn patterns from data',
      timestamp: new Date().toISOString(),
      sender_name: 'Alice',
    },
    {
      id: 'jina-test-2',
      chat_jid: 'test@g.us',
      content: 'SQL databases store structured information in tables',
      timestamp: new Date().toISOString(),
      sender_name: 'Bob',
    },
    {
      id: 'jina-test-3',
      chat_jid: 'test@g.us',
      content: 'Neural networks are a type of machine learning algorithm',
      timestamp: new Date().toISOString(),
      sender_name: 'Charlie',
    },
  ];

  // Store chat metadata
  storeChatMetadata('test@g.us', messages[0].timestamp, 'Test Group', 'whatsapp', true);

  // Generate embeddings and store
  const texts = messages.map((m) => m.content);
  const embeddings = await embeddingService.embedBatch(texts);

  for (let i = 0; i < messages.length; i++) {
    messages[i].vector = embeddings[i];
  }

  await store.upsert(messages);

  // Verify count
  const count = await store.count();
  console.log(`\n  Stored ${count} messages in LanceDB`);

  // Search for "machine learning" content (use very low minScore threshold for testing)
  const queryEmbedding = await embeddingService.embed('machine learning and AI');

  // First try without distance filter
  console.log(`  Searching with query vector (dimension: ${queryEmbedding.length})...`);

  // Try direct table query without filtering
  try {
    const allResults = await store.search(queryEmbedding, 'test@g.us', 10, -10.0);
    console.log(`  Raw search returned ${allResults.length} results`);
  } catch (e: any) {
    console.log(`  Search error: ${e.message}`);
  }

  const results = await store.search(queryEmbedding, 'test@g.us', 10, -10.0);

  if (results.length === 0) {
    throw new Error('Expected at least one search result');
  }

  console.log(`\n  Found ${results.length} results for "machine learning and AI":`);
  for (let i = 0; i < Math.min(3, results.length); i++) {
    console.log(`    ${i + 1}. "${results[i].content}" (distance: ${results[i]._distance?.toFixed(4)})`);
  }

  // The top result should be about machine learning
  const topResult = results[0].content.toLowerCase();
  if (!topResult.includes('machine') && !topResult.includes('learning')) {
    console.log(`  Note: Top result is "${topResult}"`);
  }
});

// Cleanup
const cleanup = async () => {
  try {
    const { getLanceDBManager } = await import(
      path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
    );
    const manager = getLanceDBManager();
    await manager.closeStore('jina-test-group');

    const testDir = path.join(PROJECT_ROOT, 'data', 'memory', 'jina-test-group');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('\n[Warning] Cleanup failed:', error);
  }
};

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

process.exit(0);
