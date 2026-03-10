# AcademiClaw

Academic-focused AI assistant based on NanoClaw minimal installation. A lightweight, secure, and customizable personal Claude system designed for research and academic workflows.

## Overview

AcademiClaw is a secondary development based on NanoClaw, optimized for academic use cases including:
- Literature review and research assistance
- Citation management and formatting
- Academic writing support
- Data analysis and visualization
- Collaboration with research groups

## What's Included

### Core Application
- `src/` - TypeScript source code (without test files)
- `container/` - Agent container definition
- `setup/` - Installation scripts

### Channels
- **Telegram** - Quick messaging and notifications
- **WhatsApp** - Mobile-friendly communication
- **Feishu** - Team collaboration (for Chinese users)

### Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template
- `.nvmrc` - Node version requirement

### Documentation
- `README.md` - Original NanoClaw documentation
- `CLAUDE.md` - Project instructions

### Scripts
- `scripts/` - Utility scripts for skill management

## Installation

### Guided Setup (Recommended)

The easiest way to get started is using the Claude Code guided setup. Simply tell Claude:

```
/setup
```

Or say "install academiclaw" or "configure academiclaw". The setup will guide you through:

1. **Bootstrap** - Install Node.js and dependencies
2. **Environment Check** - Detect your platform and existing config
3. **Container Runtime** - Set up Docker or Apple Container
4. **Claude Authentication** - Configure API access
5. **Channel Setup** - Add WhatsApp, Telegram, or Slack
6. **Mount Allowlist** - Configure agent filesystem access
7. **Service Setup** - Configure background service
8. **Verification** - Test everything works

### Manual Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run setup step manually
npx tsx setup/index.ts --step environment
npx tsx setup/index.ts --step container
npx tsx setup/index.ts --step service

# Start in development mode
npm run dev

# Or start in production mode
npm start
```

## Adding Channels

Channels are added via guided skills. Tell Claude:

```
/add-whatsapp
/add-telegram
/add-slack
```

Each skill will guide you through:
1. Verification of channel code (already included)
2. Authentication setup
3. Chat registration
4. Testing and verification

## Directory Structure

```
academiclaw/
├── data/          # Runtime data (auto-created)
├── store/         # Auth and database (auto-created)
├── logs/          # Application logs (auto-created)
├── groups/        # Per-group memory (create via setup)
└── src/           # Source code
    └── channels/  # Channel implementations
```

## Service Management

### macOS (launchd)
```bash
launchctl load ~/Library/LaunchAgents/com.academiclaw.plist
launchctl unload ~/Library/LaunchAgents/com.academiclaw.plist
```

### Linux (systemd)
```bash
systemctl --user start academiclaw
systemctl --user stop academiclaw
```

## Minimum Requirements

- Node.js >= 20 (see `.nvmrc`)
- Docker or Apple Container (for agent isolation)
- macOS or Linux

## Skills System

AcademiClaw includes a Claude Code skills system for guided setup:

| Skill | Description |
|-------|-------------|
| `/setup` | Full guided installation |
| `/add-whatsapp` | Add WhatsApp channel (QR/pairing code auth) |
| `/add-telegram` | Add Telegram channel (bot token from @BotFather) |
| `/add-slack` | Add Slack channel (Socket Mode, no public URL needed) |

Skills work by emitting structured status that Claude Code can parse and respond to. Each step emits:

```
=== ACADEMICLAW SETUP: <step_name> ===
KEY: value
STATUS: success
=== END ===
```

This allows Claude to:
- Detect issues automatically
- Prompt for user input when needed
- Execute fixes without manual intervention
- Guide through complex multi-step processes

## Differences from NanoClaw

AcademiClaw is based on NanoClaw but optimized for academic workflows:

1. **Minimal installation** - Only essential channels included
2. **Academic-focused** - Pre-configured for research use cases
3. **Lightweight** - Test files and dev tools removed
4. **Guided setup** - Claude Code skills for easy installation
5. **Chinese-friendly** - Feishu support for Chinese academic teams

## Acknowledgments

AcademiClaw is built upon [NanoClaw](https://github.com/anthropics/nanoclaw), a lightweight personal Claude assistant framework.

## License

This project inherits the license from NanoClaw. See the original repository for details.
