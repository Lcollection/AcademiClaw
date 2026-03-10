---
name: add-telegram
description: Add Telegram as a channel. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel (triggers actions) or passive channel (receives notifications only).
---

# Add Telegram Channel

This skill configures Telegram for AcademiClaw. The channel code is already included in this minimal installation. This skill handles authentication, registration, and configuration.

## Phase 1: Pre-flight

### Check if already configured

Check if `TELEGRAM_BOT_TOKEN` is set in `.env`:

```bash
grep -q "TELEGRAM_BOT_TOKEN=" .env 2>/dev/null && echo "Telegram configured" || echo "Not configured"
```

### Ask the user

Use `AskUserQuestion` to collect configuration:

AskUserQuestion: Do you have a Telegram bot token, or do you need to create one?

If they have one, collect it now. If not, we'll create one in Phase 3.

## Phase 2: Verify Code

Verify the Telegram channel code is present:

```bash
test -f src/channels/telegram.ts && echo "Telegram channel code present" || echo "ERROR: Telegram channel code missing"
```

### Verify dependencies

```bash
npm list grammy 2>/dev/null && echo "grammy installed" || echo "Installing grammy..."
```

If not installed:

```bash
npm install grammy
```

### Validate build

```bash
npm run build
```

Build must be clean before proceeding.

## Phase 3: Setup

### Create Telegram Bot (if needed)

If the user doesn't have a bot token, tell them:

> I need you to create a Telegram bot:
>
> 1. Open Telegram and search for `@BotFather`
> 2. Send `/newbot` and follow prompts:
>    - Bot name: Something friendly (e.g., "Andy Assistant")
>    - Bot username: Must end in "bot" (e.g., "andy_ai_bot")
> 3. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

Wait for the user to provide the token.

### Configure environment

Add to `.env`:

```bash
TELEGRAM_BOT_TOKEN=<their-token>
```

Channels auto-enable when their credentials are present — no extra configuration needed.

Sync to container environment:

```bash
mkdir -p data/env && cp .env data/env/env
```

The container reads environment from `data/env/env`, not `.env` directly.

### Disable Group Privacy (for group chats)

Tell the user:

> **Important for group chats**: By default, Telegram bots only see @mentions and commands in groups. To let the bot see all messages:
>
> 1. Open Telegram and search for `@BotFather`
> 2. Send `/mybots` and select your bot
> 3. Go to **Bot Settings** > **Group Privacy** > **Turn off**
>
> This is optional if you only want trigger-based responses via @mentioning the bot.

### Build and restart

```bash
npm run build
```

If service is running, restart it:

```bash
# macOS
launchctl kickstart -k gui/$(id -u)/com.academiclaw
# Linux: systemctl --user restart academiclaw
```

## Phase 4: Registration

### Get Chat ID

Tell the user:

> 1. Open your bot in Telegram (search for its username)
> 2. Send `/chatid` — it will reply with the chat ID
> 3. For groups: add the bot to the group first, then send `/chatid` in the group

Wait for the user to provide the chat ID (format: `tg:123456789` or `tg:-1001234567890`).

### Configure the chat

AskUserQuestion: What trigger word should activate the assistant?
- **@Andy** - Default trigger
- **@Claw** - Short and easy
- **@Claude** - Match the AI name

AskUserQuestion: What should the assistant call itself?
- **Andy** - Default name
- **Claw** - Short and easy
- **Claude** - Match the AI name

AskUserQuestion: Is this your main chat (responds to all messages) or a trigger-only chat?
- **Main chat** - Responds to all messages without trigger
- **Trigger-only** - Requires trigger word to respond

### Register the chat

```bash
npx tsx setup/index.ts --step register \
  --jid "tg:<chat-id>" \
  --name "<chat-name>" \
  --trigger "@<trigger>" \
  --folder "telegram_main" \
  --channel telegram \
  --assistant-name "<name>" \
  --is-main \
  --no-trigger-required  # Only for main chat
```

For trigger-only chats:

```bash
npx tsx setup/index.ts --step register \
  --jid "tg:<chat-id>" \
  --name "<chat-name>" \
  --trigger "@<trigger>" \
  --folder "telegram_<name>" \
  --channel telegram
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message to your registered Telegram chat:
> - For main chat: Any message works
> - For trigger-only: `@Andy hello` or @mention the bot
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/academiclaw.log
```

## Troubleshooting

### Bot not responding

Check:
1. `TELEGRAM_BOT_TOKEN` is set in `.env` AND synced to `data/env/env`
2. Chat is registered in SQLite: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'tg:%'"`
3. For trigger-only chats: message includes trigger pattern
4. Service is running: `launchctl list | grep academiclaw` (macOS) or `systemctl --user status academiclaw` (Linux)

### Bot only responds to @mentions in groups

Group Privacy is enabled (default). Fix:
1. `@BotFather` > `/mybots` > select bot > **Bot Settings** > **Group Privacy** > **Turn off**
2. Remove and re-add the bot to the group (required for the change to take effect)

### Getting chat ID

If `/chatid` doesn't work:
- Verify token: `curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"`
- Check bot is started: `tail -f logs/academiclaw.log`

## After Setup

If running `npm run dev` while the service is active:

```bash
# macOS:
launchctl unload ~/Library/LaunchAgents/com.academiclaw.plist
npm run dev
# When done testing:
launchctl load ~/Library/LaunchAgents/com.academiclaw.plist

# Linux:
# systemctl --user stop academiclaw
# npm run dev
# systemctl --user start academiclaw
```
