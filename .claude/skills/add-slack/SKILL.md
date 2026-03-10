---
name: add-slack
description: Add Slack as a channel. Can replace WhatsApp entirely or run alongside it. Uses Socket Mode (no public URL needed).
---

# Add Slack Channel

This skill configures Slack for AcademiClaw. The channel code is already included in this minimal installation. This skill handles authentication, registration, and configuration.

**Note:** Slack support is in beta. The channel implementation may have limitations compared to WhatsApp/Telegram.

## Phase 1: Pre-flight

### Check if already configured

Check if Slack tokens are set in `.env`:

```bash
grep -q "SLACK_BOT_TOKEN=" .env 2>/dev/null && echo "Slack configured" || echo "Not configured"
```

### Ask the user

**Do they already have a Slack app configured?** If yes, collect the Bot Token and App Token now. If no, we'll create one in Phase 3.

## Phase 2: Verify Code

Verify the Slack channel code is present:

```bash
test -f src/channels/slack.ts && echo "Slack channel code present" || echo "ERROR: Slack channel code not included in minimal build"
```

**If Slack code is missing**, inform the user that Slack is not included in the minimal installation. They can either:
1. Use the full AcademiClaw installation instead
2. Add Slack manually by copying from the full repo

### Verify dependencies

```bash
npm list @slack/bolt 2>/dev/null && echo "@slack/bolt installed" || echo "Installing @slack/bolt..."
```

If not installed:

```bash
npm install @slack/bolt
```

### Validate build

```bash
npm run build
```

Build must be clean before proceeding.

## Phase 3: Setup

### Create Slack App (if needed)

If the user doesn't have a Slack app, guide them:

> I need you to create a Slack app:
>
> 1. Go to https://api.slack.com/apps and click **Create New App**
> 2. Choose **From scratch**
> 3. App name: Something like "AcademiClaw Assistant"
> 4. Pick your workspace
> 5. Go to **Socket Mode** and enable it
> 6. Under **Basic Information** > **App-Level Tokens**, create a token with scope `connections:write`
> 7. Copy the App-Level Token (starts with `xapp-`)
> 8. Go to **OAuth & Permissions** and add scopes:
>    - `chat:write`
>    - `channels:history`, `groups:history`, `im:history`
>    - `channels:read`, `groups:read`, `users:read`
> 9. Go to **Event Subscriptions** > **Subscribe to bot events** and add:
>    - `message.channels`
>    - `message.groups`
>    - `message.im`
> 10. Install the app to your workspace and copy the Bot Token (starts with `xoxb-`)

Wait for the user to provide both tokens.

### Configure environment

Add to `.env`:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
```

Channels auto-enable when their credentials are present — no extra configuration needed.

Sync to container environment:

```bash
mkdir -p data/env && cp .env data/env/env
```

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

### Get Channel ID

Tell the user:

> 1. Add the bot to a Slack channel (right-click channel → **View channel details** → **Integrations** → **Add apps**)
> 2. In that channel, the channel ID is in the URL when you open it in a browser: `https://app.slack.com/client/T.../C0123456789` — the `C...` part is the channel ID
> 3. Alternatively, right-click the channel name → **Copy link** — the channel ID is the last path segment
>
> The JID format for AcademiClaw is: `slack:C0123456789`

Wait for the user to provide the channel ID.

### Register the channel

```bash
npx tsx setup/index.ts --step register \
  --jid "slack:<channel-id>" \
  --name "<channel-name>" \
  --trigger "@<trigger>" \
  --folder "slack_main" \
  --channel slack \
  --assistant-name "<name>" \
  --is-main \
  --no-trigger-required  # Only for main channel
```

For trigger-only channels:

```bash
npx tsx setup/index.ts --step register \
  --jid "slack:<channel-id>" \
  --name "<channel-name>" \
  --trigger "@<trigger>" \
  --folder "slack_<name>" \
  --channel slack
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message in your registered Slack channel:
> - For main channel: Any message works
> - For trigger-only: `@<assistant-name> hello` (using the configured trigger word)
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/academiclaw.log
```

## Troubleshooting

### Bot not responding

1. Check `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` are set in `.env` AND synced to `data/env/env`
2. Check channel is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'slack:%'"`
3. For trigger-only channels: message must include trigger pattern
4. Service is running: `launchctl list | grep academiclaw`

### Bot connected but not receiving messages

1. Verify Socket Mode is enabled in the Slack app settings
2. Verify the bot is subscribed to the correct events (`message.channels`, `message.groups`, `message.im`)
3. Verify the bot has been added to the channel
4. Check that the bot has the required OAuth scopes

### "missing_scope" errors

If the bot logs `missing_scope` errors:
1. Go to **OAuth & Permissions** in your Slack app settings
2. Add the missing scope listed in the error message
3. **Reinstall the app** to your workspace — scope changes require reinstallation
4. Copy the new Bot Token (it changes on reinstall) and update `.env`
5. Sync: `mkdir -p data/env && cp .env data/env/env`
6. Restart: `launchctl kickstart -k gui/$(id -u)/com.academiclaw`

## Known Limitations

- **Threads are flattened** — Threaded replies are delivered as regular channel messages
- **No typing indicator** — Slack's Bot API does not expose a typing indicator
- **No file/image handling** — The bot only processes text content
- **Channel metadata sync** — May be slow for workspaces with thousands of channels

## After Setup

The Slack channel supports:
- **Public channels** — Bot must be added to the channel
- **Private channels** — Bot must be invited to the channel
- **Direct messages** — Users can DM the bot directly
- **Multi-channel** — Can run alongside WhatsApp or Telegram

If running `npm run dev` while the service is active:

```bash
# macOS:
launchctl unload ~/Library/LaunchAgents/com.academiclaw.plist
npm run dev
# When done testing:
launchctl load ~/Library/LaunchAgents/com.academiclaw.plist
```
