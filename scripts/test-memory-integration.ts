#!/usr/bin/env tsx
/**
 * Memory System Integration Test
 *
 * Tests the memory system end-to-end including:
 * - Module imports and initialization
 * - Configuration validation
 * - Database integration
 * - Graceful degradation
 *
 * Usage: npx tsx scripts/test-memory-integration.ts
 */

import fs from 'fs';
import path from 'path';

// Get the project root directory
const PROJECT_ROOT = process.cwd();

const TEST_MARKER = '[Memory Integration Test]';

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
  process.stdout.write(`${TEST_MARKER} Running: ${name}... `);

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log('✓ PASS');
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.log(`✗ FAIL: ${errorMsg}`);
  }
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
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
    console.log('\nFailed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

// Test 1: Verify all memory modules can be imported
await runTest('Module Imports', async () => {
  const modules = [
    path.join(PROJECT_ROOT, 'src/memory/config.js'),
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js'),
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js'),
    path.join(PROJECT_ROOT, 'src/memory/sync.js'),
    path.join(PROJECT_ROOT, 'src/memory/retriever.js'),
    path.join(PROJECT_ROOT, 'src/memory/index.js'),
  ];

  for (const mod of modules) {
    await import(mod);
  }
});

// Test 2: Verify configuration structure
await runTest('Configuration Structure', async () => {
  const { DEFAULT_MEMORY_CONFIG } = await import(
    path.join(PROJECT_ROOT, 'src/memory/config.js')
  );

  if (!DEFAULT_MEMORY_CONFIG) {
    throw new Error('DEFAULT_MEMORY_CONFIG is not defined');
  }

  if (typeof DEFAULT_MEMORY_CONFIG.enabled !== 'boolean') {
    throw new Error('enabled should be a boolean');
  }

  if (!DEFAULT_MEMORY_CONFIG.embedding) {
    throw new Error('embedding config is missing');
  }

  if (!DEFAULT_MEMORY_CONFIG.search) {
    throw new Error('search config is missing');
  }

  if (!DEFAULT_MEMORY_CONFIG.sync) {
    throw new Error('sync config is missing');
  }
});

// Test 3: Verify embedding service singleton
await runTest('Embedding Service Singleton', async () => {
  const { getEmbeddingManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/embeddings.js')
  );

  const manager1 = getEmbeddingManager();
  const manager2 = getEmbeddingManager();

  if (manager1 !== manager2) {
    throw new Error('getEmbeddingManager should return the same instance');
  }
});

// Test 4: Verify LanceDB manager singleton
await runTest('LanceDB Manager Singleton', async () => {
  const { getLanceDBManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );

  const manager1 = getLanceDBManager();
  const manager2 = getLanceDBManager();

  if (manager1 !== manager2) {
    throw new Error('getLanceDBManager should return the same instance');
  }
});

// Test 5: Verify message sync filter
await runTest('Message Sync Filter', async () => {
  const { shouldSyncMessage } = await import(
    path.join(PROJECT_ROOT, 'src/memory/sync.js')
  );

  // Normal message should sync
  const normalMsg = {
    id: 'test-1',
    chat_jid: 'test@g.us',
    sender: '123',
    sender_name: 'Test User',
    content: 'Hello world',
    timestamp: new Date().toISOString(),
    is_from_me: false,
    is_bot_message: false,
  };

  if (!shouldSyncMessage(normalMsg)) {
    throw new Error('Normal message should sync');
  }

  // Bot message should not sync
  const botMsg = { ...normalMsg, is_bot_message: true };
  if (shouldSyncMessage(botMsg)) {
    throw new Error('Bot message should not sync');
  }

  // Empty message should not sync
  const emptyMsg = { ...normalMsg, content: '' };
  if (shouldSyncMessage(emptyMsg)) {
    throw new Error('Empty message should not sync');
  }
});

// Test 6: Verify memory retrieval functions exist
await runTest('Memory Retrieval Functions', async () => {
  const { retrieveMemory, formatRetrievedMemory, getMemoryStats } =
    await import(path.join(PROJECT_ROOT, 'src/memory/retriever.js'));

  if (typeof retrieveMemory !== 'function') {
    throw new Error('retrieveMemory should be a function');
  }

  if (typeof formatRetrievedMemory !== 'function') {
    throw new Error('formatRetrievedMemory should be a function');
  }

  if (typeof getMemoryStats !== 'function') {
    throw new Error('getMemoryStats should be a function');
  }
});

// Test 7: Verify db.ts exports memory functions
await runTest('Database Module Memory Exports', async () => {
  const dbModule = await import(path.join(PROJECT_ROOT, 'src/db.js'));

  if (typeof dbModule.initMemoryStore !== 'function') {
    throw new Error('initMemoryStore should be exported from db.js');
  }

  if (typeof dbModule.storeMessageWithMemory !== 'function') {
    throw new Error('storeMessageWithMemory should be exported from db.js');
  }
});

// Test 8: Verify config.ts exports memory settings
await runTest('Config Module Memory Exports', async () => {
  const configModule = await import(path.join(PROJECT_ROOT, 'src/config.js'));

  if (typeof configModule.MEMORY_ENABLED !== 'boolean') {
    throw new Error('MEMORY_ENABLED should be defined in config.js');
  }

  if (typeof configModule.MEMORY_MAX_RESULTS !== 'number') {
    throw new Error('MEMORY_MAX_RESULTS should be defined in config.js');
  }

  if (typeof configModule.MEMORY_MIN_SCORE !== 'number') {
    throw new Error('MEMORY_MIN_SCORE should be defined in config.js');
  }
});

// Test 9: Verify graceful degradation configuration
await runTest('Graceful Degradation Config', async () => {
  const configModule = await import(path.join(PROJECT_ROOT, 'src/config.js'));
  const { DEFAULT_MEMORY_CONFIG } = await import(
    path.join(PROJECT_ROOT, 'src/memory/config.js')
  );

  if (typeof configModule.MEMORY_GRACEFUL_DEGRADATION !== 'boolean') {
    throw new Error('MEMORY_GRACEFUL_DEGRADATION should be defined');
  }

  if (typeof DEFAULT_MEMORY_CONFIG.sync.gracefulDegradation !== 'boolean') {
    throw new Error('gracefulDegradation should be in sync config');
  }
});

// Test 10: Test memory initialization with memory disabled
await runTest('Memory Init When Disabled', async () => {
  // Ensure memory is disabled for this test
  const originalEnabled = process.env.MEMORY_ENABLED;
  process.env.MEMORY_ENABLED = 'false';

  try {
    const { initMemory } = await import(
      path.join(PROJECT_ROOT, 'src/memory/index.js')
    );

    // Should return false when disabled
    const result = await initMemory();

    if (result !== false) {
      throw new Error('initMemory should return false when disabled');
    }
  } finally {
    if (originalEnabled !== undefined) {
      process.env.MEMORY_ENABLED = originalEnabled;
    }
  }
});

// Test 11: Test isMemoryEnabled function
await runTest('isMemoryEnabled Function', async () => {
  const { isMemoryEnabled } = await import(
    path.join(PROJECT_ROOT, 'src/memory/config.js')
  );

  // Default should be disabled (no API key)
  if (typeof isMemoryEnabled() !== 'boolean') {
    throw new Error('isMemoryEnabled should return a boolean');
  }
});

// Test 12: Verify LanceDB store creation
await runTest('LanceDB Store Creation', async () => {
  const { getLanceDBManager } = await import(
    path.join(PROJECT_ROOT, 'src/memory/lancedb.js')
  );

  const manager = getLanceDBManager();
  const store = manager.getStore('integration-test-group');

  if (!store) {
    throw new Error('Store should be created');
  }

  if (typeof store.isReady !== 'function') {
    throw new Error('Store should have isReady method');
  }
});

// Test 13: Verify memory stats function
await runTest('Memory Stats Function', async () => {
  const { getMemoryStats } = await import(
    path.join(PROJECT_ROOT, 'src/memory/retriever.js')
  );

  const stats = await getMemoryStats('test-group');

  if (typeof stats.enabled !== 'boolean') {
    throw new Error('stats.enabled should be a boolean');
  }
});

// Test 14: Verify formatRetrievedMemory function
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
        content: 'Hello',
        timestamp: '2025-03-10T10:00:00Z',
        is_from_me: false,
        is_bot_message: false,
      },
      source: 'sqlite' as const,
    },
  ];

  const formatted = formatRetrievedMemory(memories, false);

  if (typeof formatted !== 'string') {
    throw new Error('formatRetrievedMemory should return a string');
  }

  if (!formatted.includes('Alice') || !formatted.includes('Hello')) {
    throw new Error('Formatted output should contain message content');
  }
});

// Test 15: Verify all index.js exports
await runTest('Index Module Exports', async () => {
  const indexModule = await import(path.join(PROJECT_ROOT, 'src/memory/index.js'));

  const expectedExports = [
    'DEFAULT_MEMORY_CONFIG',
    'isMemoryEnabled',
    'logMemoryConfig',
    'OpenAIEmbeddingService',
    'getEmbeddingManager',
    'initEmbeddings',
    'LanceDBStore',
    'getLanceDBManager',
    'storeMessageWithSync',
    'syncBatchMessages',
    'shouldSyncMessage',
    'retrieveMemory',
    'formatRetrievedMemory',
    'getMemoryStats',
    'initMemory',
    'isMemoryReady',
  ];

  for (const exp of expectedExports) {
    if (!(exp in indexModule)) {
      throw new Error(`Missing export: ${exp}`);
    }
  }
});

// Test 16: Verify build output includes memory files
await runTest('Build Output Verification', async () => {
  const distDir = path.join(PROJECT_ROOT, 'dist');

  if (!fs.existsSync(distDir)) {
    throw new Error('dist directory not found - run npm run build first');
  }

  const memoryDir = path.join(distDir, 'memory');

  if (!fs.existsSync(memoryDir)) {
    throw new Error('dist/memory directory not found');
  }

  const expectedFiles = [
    'config.js',
    'config.d.ts',
    'embeddings.js',
    'embeddings.d.ts',
    'lancedb.js',
    'lancedb.d.ts',
    'sync.js',
    'sync.d.ts',
    'retriever.js',
    'retriever.d.ts',
    'index.js',
    'index.d.ts',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(memoryDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing build output: ${file}`);
    }
  }
});

// Test 17: Verify package.json includes dependencies
await runTest('Package Dependencies', async () => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  if (!pkg.dependencies['@lancedb/lancedb']) {
    throw new Error('@lancedb/lancedb should be in dependencies');
  }

  if (!pkg.dependencies['openai']) {
    throw new Error('openai should be in dependencies');
  }
});

// Test 18: Verify .env.example includes memory config
await runTest('Env Example Configuration', async () => {
  const envPath = path.join(PROJECT_ROOT, '.env.example');
  const envContent = fs.readFileSync(envPath, 'utf-8');

  const requiredVars = [
    'MEMORY_ENABLED',
    'OPENAI_API_KEY',
    'MEMORY_MAX_RESULTS',
    'MEMORY_MIN_SCORE',
  ];

  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      throw new Error(`${varName} should be in .env.example`);
    }
  }
});

printSummary();
