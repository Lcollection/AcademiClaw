#!/usr/bin/env tsx
/**
 * Test Jina AI Embeddings API
 *
 * Usage: JINA_API_KEY=your-key npx tsx scripts/test-jina-embeddings.ts
 */

import OpenAI from 'openai';

const apiKey = process.env.JINA_API_KEY || process.env.EMBEDDING_API_KEY;

if (!apiKey) {
  console.error('Error: JINA_API_KEY or EMBEDDING_API_KEY environment variable required');
  console.error('Usage: JINA_API_KEY=your-key npx tsx scripts/test-jina-embeddings.ts');
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: 'https://api.jina.ai/v1',
});

console.log('Testing Jina AI embeddings API...');
console.log('');

const response = await client.embeddings.create({
  model: 'jina-embeddings-v3',
  input: ['Hello world', 'Test message', 'Semantic search test'],
  encoding_format: 'float',
});

console.log('✓ Success!');
console.log('');
console.log('Response details:');
console.log(`  - Model: ${response.model}`);
console.log(`  - Embeddings: ${response.data.length}`);
console.log(`  - Dimension: ${response.data[0].embedding.length}`);
console.log(`  - First 5 values: [${response.data[0].embedding.slice(0, 5).map((v: number) => v.toFixed(4)).join(', ')}]`);
console.log('');

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

const sim1 = cosineSimilarity(response.data[0].embedding, response.data[1].embedding);
const sim2 = cosineSimilarity(response.data[0].embedding, response.data[2].embedding);

console.log('Similarity scores:');
console.log(`  - "Hello world" vs "Test message": ${sim1.toFixed(4)}`);
console.log(`  - "Hello world" vs "Semantic search test": ${sim2.toFixed(4)}`);
