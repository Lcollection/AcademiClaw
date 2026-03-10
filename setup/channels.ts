/**
 * Channel setup step.
 * Guides user through channel configuration (WhatsApp, Telegram, Slack, Feishu).
 */

import { logger } from '../src/logger.js';
import { emitStatus } from './status.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ChannelConfig {
  type: string;
  enabled: boolean;
  credentials?: Record<string, string>;
}

const ENV_TEMPLATE = `
# ===== CHANNELS =====

# WhatsApp
WHATSAPP_SESSION_ID=academi_whatsapp

# Telegram
TELEGRAM_BOT_TOKEN=

# Slack (Beta)
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_LEVEL_TOKEN=

# Feishu/Lark
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_VERIFICATION_TOKEN=
FEISHU_ENCRYPT_KEY=
`;

export async function run(args: string[]): Promise<void> {
  logger.info('Starting channel setup');

  const envPath = join(process.cwd(), '.env');
  let envContent = '';
  let hasEnv = existsSync(envPath);

  if (hasEnv) {
    envContent = readFileSync(envPath, 'utf-8');
    logger.info('Found existing .env file');
  }

  console.log('\n📡 Channel Setup');
  console.log('================\n');

  const channels: ChannelConfig[] = [
    { type: 'whatsapp', enabled: false },
    { type: 'telegram', enabled: false },
    { type: 'slack', enabled: false },
    { type: 'feishu', enabled: false },
  ];

  // Detect which channels are already configured
  if (envContent.includes('WHATSAPP_SESSION_ID') && envContent.includes('WHATSAPP_AUTH_STATE')) {
    const waConfig = channels.find(c => c.type === 'whatsapp');
    if (waConfig) waConfig.enabled = true;
  }
  if (envContent.includes('TELEGRAM_BOT_TOKEN=') && envContent.split('TELEGRAM_BOT_TOKEN=')[1]?.split('\n')[0]?.trim()) {
    const tgConfig = channels.find(c => c.type === 'telegram');
    if (tgConfig) tgConfig.enabled = true;
  }
  if (envContent.includes('SLACK_BOT_TOKEN=') && envContent.split('SLACK_BOT_TOKEN=')[1]?.split('\n')[0]?.trim()) {
    const slackConfig = channels.find(c => c.type === 'slack');
    if (slackConfig) slackConfig.enabled = true;
  }
  if (envContent.includes('FEISHU_APP_ID=') && envContent.split('FEISHU_APP_ID=')[1]?.split('\n')[0]?.trim()) {
    const feishuConfig = channels.find(c => c.type === 'feishu');
    if (feishuConfig) feishuConfig.enabled = true;
  }

  // Display current status
  console.log('Current channel status:\n');
  for (const channel of channels) {
    const status = channel.enabled ? '✅ Configured' : '❌ Not configured';
    const name = channel.type.charAt(0).toUpperCase() + channel.type.slice(1);
    console.log(`  ${name}: ${status}`);
  }
  console.log('');

  // Instructions for each channel
  console.log('To add a channel, run the corresponding command in Claude Code:\n');
  console.log('  /add-whatsapp    - Add WhatsApp channel (QR code auth)');
  console.log('  /add-telegram    - Add Telegram channel (bot token)');
  console.log('  /add-slack       - Add Slack channel (beta)');
  console.log('  /add-feishu      - Add Feishu/Lark channel\n');

  console.log('Or manually configure your .env file with the credentials above.\n');

  emitStatus('CHANNELS', {
    STATUS: 'success',
    CONFIGURED: channels.filter(c => c.enabled).map(c => c.type),
  });

  logger.info('Channel setup complete');
}
