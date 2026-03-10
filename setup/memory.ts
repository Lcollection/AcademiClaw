/**
 * Step: memory — Configure memory system (SQLite + LanceDB hybrid)
 * Allows user to choose between no memory, mock mode, or real embedding API
 */
import fs from 'fs';
import path from 'path';

import { logger } from '../src/logger.js';
import { emitStatus } from './status.js';

interface MemoryConfig {
  enabled: boolean;
  provider: 'none' | 'mock' | 'jina' | 'openai' | 'custom';
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

function parseArgs(args: string[]): MemoryConfig {
  const config: MemoryConfig = {
    enabled: false,
    provider: 'none',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      config.provider = args[i + 1] as MemoryConfig['provider'];
      i++;
    }
    if (args[i] === '--api-key' && args[i + 1]) {
      config.apiKey = args[i + 1];
      i++;
    }
    if (args[i] === '--base-url' && args[i + 1]) {
      config.baseURL = args[i + 1];
      i++;
    }
    if (args[i] === '--model' && args[i + 1]) {
      config.model = args[i + 1];
      i++;
    }
  }

  // Auto-enable memory if provider is not 'none'
  if (config.provider !== 'none') {
    config.enabled = true;
  }

  return config;
}

function getProviderDefaults(provider: MemoryConfig['provider']): {
  baseURL?: string;
  model?: string;
  description: string;
} {
  switch (provider) {
    case 'mock':
      return {
        description: 'Mock embeddings for testing (no API required)',
      };
    case 'jina':
      return {
        baseURL: 'https://api.jina.ai/v1',
        model: 'jina-embeddings-v3',
        description: 'Jina AI (1M free tokens/month)',
      };
    case 'openai':
      return {
        baseURL: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        description: 'OpenAI (paid, requires API key)',
      };
    case 'custom':
      return {
        description: 'Custom OpenAI-compatible API',
      };
    default:
      return {
        description: 'No semantic search (SQLite only)',
      };
  }
}

async function updateEnvFile(config: MemoryConfig): Promise<string> {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Remove old memory config lines (both keys and comments)
  const memoryKeys = [
    'MEMORY_ENABLED',
    'MEMORY_USE_MOCK_EMBEDDINGS',
    'EMBEDDING_API_KEY',
    'EMBEDDING_BASE_URL',
    'EMBEDDING_MODEL',
    'MEMORY_MAX_RESULTS',
    'MEMORY_MIN_SCORE',
    'MEMORY_BATCH_SIZE',
    'MEMORY_SYNC_ON_WRITE',
    'MEMORY_GRACEFUL_DEGRADATION',
    'MEMORY_ENABLE_HYBRID',
  ];

  const lines = envContent.split('\n');
  const filtered: string[] = [];
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that start with memory keys
    if (memoryKeys.some((key) => line.startsWith(`${key}=`))) {
      continue;
    }

    // Skip comment lines that are memory-related
    if (line.includes('Memory System') || line.includes('MEMORY_')) {
      continue;
    }

    // Skip lines after certain memory comments
    if (line.includes('# Mock mode:') ||
        line.includes('# Provider:') ||
        line.includes('# Embedding API')) {
      continue;
    }

    filtered.push(line);
  }

  // Build new memory config section
  const memorySection: string[] = [];

  if (config.enabled) {
    memorySection.push('# Memory System (Semantic Search)');
    memorySection.push(`MEMORY_ENABLED=true`);

    if (config.provider === 'mock') {
      memorySection.push(`MEMORY_USE_MOCK_EMBEDDINGS=true`);
      memorySection.push(`# Mock mode: No API key required`);
    } else if (config.provider === 'jina') {
      memorySection.push(`EMBEDDING_API_KEY=${config.apiKey || ''}`);
      memorySection.push(`EMBEDDING_BASE_URL=${config.baseURL || 'https://api.jina.ai/v1'}`);
      memorySection.push(`EMBEDDING_MODEL=${config.model || 'jina-embeddings-v3'}`);
      memorySection.push(`# Provider: Jina AI (https://jina.ai/)`);
    } else if (config.provider === 'openai') {
      memorySection.push(`EMBEDDING_API_KEY=${config.apiKey || ''}`);
      memorySection.push(`EMBEDDING_BASE_URL=${config.baseURL || 'https://api.openai.com/v1'}`);
      memorySection.push(`EMBEDDING_MODEL=${config.model || 'text-embedding-3-small'}`);
      memorySection.push(`# Provider: OpenAI (https://openai.com/)`);
    } else if (config.provider === 'custom') {
      memorySection.push(`EMBEDDING_API_KEY=${config.apiKey || ''}`);
      memorySection.push(`EMBEDDING_BASE_URL=${config.baseURL || ''}`);
      memorySection.push(`EMBEDDING_MODEL=${config.model || ''}`);
      memorySection.push(`# Provider: Custom OpenAI-compatible API`);
    }

    // Add default options
    memorySection.push(`MEMORY_MAX_RESULTS=20`);
    memorySection.push(`MEMORY_MIN_SCORE=0.7`);
    memorySection.push(`MEMORY_BATCH_SIZE=32`);
    memorySection.push(`MEMORY_SYNC_ON_WRITE=true`);
    memorySection.push(`MEMORY_GRACEFUL_DEGRADATION=true`);
    memorySection.push('');
  } else {
    memorySection.push(`# Memory System (disabled - SQLite only)`);
    memorySection.push(`MEMORY_ENABLED=false`);
    memorySection.push('');
  }

  // Combine filtered content with new memory section
  const newContent = [...filtered, ...memorySection].join('\n');

  fs.writeFileSync(envPath, newContent);

  return envPath;
}

export async function run(args: string[]): Promise<void> {
  const config = parseArgs(args);
  const providerDefaults = getProviderDefaults(config.provider);

  logger.info(
    { provider: config.provider, description: providerDefaults.description },
    'Configuring memory system'
  );

  // Update .env file
  const envPath = await updateEnvFile(config);

  // Emit status
  emitStatus('CONFIGURE_MEMORY', {
    ENABLED: config.enabled,
    PROVIDER: config.provider,
    DESCRIPTION: providerDefaults.description,
    ENV_PATH: envPath,
    STATUS: 'success',
    LOG: 'logs/setup.log',
  });

  logger.info(
    { enabled: config.enabled, provider: config.provider, envPath },
    'Memory system configured'
  );

  // Print user-friendly message
  console.log('\n' + '='.repeat(60));
  console.log('Memory System Configuration');
  console.log('='.repeat(60));
  console.log(`Provider: ${config.provider}`);
  console.log(`Description: ${providerDefaults.description}`);
  console.log(`Enabled: ${config.enabled ? 'Yes' : 'No (SQLite only)'}`);

  if (config.provider === 'jina') {
    console.log('\nTo get a Jina AI API key:');
    console.log('  1. Visit https://jina.ai/');
    console.log('  2. Sign up for a free account');
    console.log('  3. Copy your API key');
    console.log('  4. Add EMBEDDING_API_KEY=<your-key> to .env');
    console.log('\nFree tier: 1M tokens/month');
  } else if (config.provider === 'openai') {
    console.log('\nTo get an OpenAI API key:');
    console.log('  1. Visit https://platform.openai.com/');
    console.log('  2. Create an API key');
    console.log('  3. Add EMBEDDING_API_KEY=<your-key> to .env');
  } else if (config.provider === 'mock') {
    console.log('\nMock mode enabled for testing.');
    console.log('No API key required - embeddings are generated locally.');
  }

  console.log('='.repeat(60) + '\n');
}
