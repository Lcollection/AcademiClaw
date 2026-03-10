#!/usr/bin/env tsx
/**
 * DeepSeek Embedding API Test
 *
 * Tests the DeepSeek embedding API connection with provided credentials.
 * Usage: DEEPSEEK_API_KEY=sk-xxx npx tsx scripts/test-deepseek-embeddings.ts
 */

import OpenAI from 'openai';

const TEST_MARKER = '[DeepSeek Test]';

// Get API configuration
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.EMBEDDING_API_KEY || '';
const baseURL =
  process.env.DEEPSEEK_BASE_URL ||
  process.env.EMBEDDING_BASE_URL ||
  'https://api.deepseek.com';

// Test texts
const testTexts = [
  'Hello, this is a test message.',
  'AcademiClaw is an AI assistant for academic workflows.',
  'Semantic search helps find relevant information.',
];

async function testDeepSeekEmbeddings(): Promise<void> {
  console.log(`${TEST_MARKER} Testing DeepSeek Embedding API`);
  console.log(`API URL: ${baseURL}`);
  console.log(`API Key: ${apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET'}`);
  console.log('');

  if (!apiKey) {
    console.error('ERROR: DEEPSEEK_API_KEY or EMBEDDING_API_KEY not set!');
    console.log('');
    console.log('Usage:');
    console.log('  DEEPSEEK_API_KEY=sk-xxx npx tsx scripts/test-deepseek-embeddings.ts');
    console.log('  or');
    console.log('  EMBEDDING_API_KEY=sk-xxx EMBEDDING_BASE_URL=https://api.deepseek.com npx tsx scripts/test-deepseek-embeddings.ts');
    process.exit(1);
  }

  // Initialize OpenAI client with DeepSeek base URL
  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  try {
    console.log(`${TEST_MARKER} Testing single text embedding...`);

    const singleResponse = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: testTexts[0],
    });

    const embedding = singleResponse.data[0].embedding;
    console.log(`✓ Success! Embedding dimension: ${embedding.length}`);
    console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log('');

    console.log(`${TEST_MARKER} Testing batch embedding (${testTexts.length} texts)...`);

    const batchResponse = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: testTexts,
    });

    console.log(`✓ Success! Got ${batchResponse.data.length} embeddings`);

    for (let i = 0; i < batchResponse.data.length; i++) {
      const item = batchResponse.data[i];
      const textPreview = testTexts[i].slice(0, 40);
      console.log(`  [${i + 1}] "${textPreview}..." - dimension: ${item.embedding.length}`);
    }
    console.log('');

    // Test similarity calculation
    console.log(`${TEST_MARKER} Testing similarity calculation...`);

    const emb1 = batchResponse.data[0].embedding;
    const emb2 = batchResponse.data[1].embedding;

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < emb1.length; i++) {
      dotProduct += emb1[i] * emb2[i];
      norm1 += emb1[i] * emb1[i];
      norm2 += emb2[i] * emb2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

    console.log(`✓ Similarity between text 1 and text 2: ${similarity.toFixed(4)}`);
    console.log('');

    // Test with the memory system
    console.log(`${TEST_MARKER} Testing with memory system...`);

    const { initMemory, isMemoryEnabled, DEFAULT_MEMORY_CONFIG } = await import(
      '../src/memory/index.js'
    );

    // Temporarily set environment variables for testing
    const originalEnabled = process.env.MEMORY_ENABLED;
    process.env.MEMORY_ENABLED = 'true';

    const wasEnabled = await initMemory();

    console.log(`Memory system enabled: ${wasEnabled}`);
    console.log(`Config provider: ${DEFAULT_MEMORY_CONFIG.embedding.provider}`);
    console.log(`Config model: ${DEFAULT_MEMORY_CONFIG.embedding.model}`);
    console.log(`Config baseURL: ${DEFAULT_MEMORY_CONFIG.embedding.baseURL}`);
    console.log(`Config dimension: ${DEFAULT_MEMORY_CONFIG.embedding.dimension}`);

    // Restore original value
    if (originalEnabled !== undefined) {
      process.env.MEMORY_ENABLED = originalEnabled;
    }

    console.log('');
    console.log(`${TEST_MARKER} All tests passed! ✓`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('ERROR: DeepSeek API request failed!');
    console.error(`Details: ${errorMessage}`);
    console.error('');

    if (errorMessage.includes('401')) {
      console.error('Hint: Check your API key is correct.');
    } else if (errorMessage.includes('404')) {
      console.error('Hint: Check the base URL and model name.');
    } else if (errorMessage.includes('ECONNREFUSED')) {
      console.error('Hint: Check your network connection.');
    }

    process.exit(1);
  }
}

testDeepSeekEmbeddings();
