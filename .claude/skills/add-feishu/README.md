# NanoClaw Feishu Channel Skill

[中文文档](README_zh.md)

A [NanoClaw](https://github.com/anthropics/nanoclaw) skill that adds [Feishu (Lark)](https://www.feishu.cn/) as a messaging channel. Talk to your Claude assistant directly from Feishu.

## Features

- WebSocket persistent connection (no public URL required)
- Text message send/receive
- Media message placeholders (images, files, audio, video)
- Sender name resolution via Feishu Contacts API
- Chat name resolution via Feishu Chat API
- Group chat and direct message support
- @mention detection
- Full test coverage (24 tests)

## Prerequisites

- [NanoClaw](https://github.com/anthropics/nanoclaw) installed and running
- A Feishu custom app with bot capabilities enabled

## Installation

In your NanoClaw project directory, run:

```bash
npx tsx scripts/apply-skill.ts .claude/skills/add-feishu
npm run build
```

Or use the Claude Code skill command:

```
/add-feishu
```

## Feishu App Setup

1. Go to [Feishu Open Platform](https://open.feishu.cn/app)
2. Click **Create Custom App**
3. In **Credentials & Basic Info**, copy the **App ID** and **App Secret**
4. In **Permissions & Scopes**, add:
   - `im:message` — Read/Send messages
   - `im:message.receive_v1` — Receive message events
   - `contact:user.base:readonly` — Read basic user info
   - `im:chat:readonly` — Read chat info
5. In **Event Subscriptions**, subscribe to `im.message.receive_v1`
6. In **Event Subscriptions** > **Subscription Mode**, select **Persistent Connection**
7. Enable the **Bot** feature
8. Publish the app

## Configuration

Add to your `.env` file:

```bash
FEISHU_APP_ID=cli_your_app_id
FEISHU_APP_SECRET=your_app_secret
```

Restart NanoClaw, then send a message to the bot in Feishu. Check logs for the Chat ID and register it.

## Architecture

This skill follows NanoClaw's channel architecture:

```
src/channels/feishu.ts      # FeishuChannel class (implements Channel interface)
src/channels/feishu.test.ts # Unit tests (24 tests)
src/channels/index.ts       # Auto-registration barrel (modified to import feishu)
```

The `FeishuChannel` class self-registers at startup via `registerChannel()`. Messages are received through the Feishu WebSocket SDK and routed through NanoClaw's standard message pipeline.

## Based On

Built for [NanoClaw](https://github.com/anthropics/nanoclaw) by Gavriel (MIT License).

## License

MIT
