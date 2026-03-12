# NanoClaw/AcademiClaw Skill Specification

**Version:** 1.0
**Date:** 2025-03-12
**Project:** AcademiClaw (NanoClaw Fork)

---

## 1. Overview

NanoClaw is a minimal, channel-based AI assistant framework. AcademiClaw is an academic-focused fork optimized for research and scholarly workflows.

### 1.1 Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AcademiClaw Core                       │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   Channels   │  │  Message Loop │  │  Group Queue    │ │
│  │  (WhatsApp,  │──│   (Router)    │──│   (Scheduler)   │ │
│  │  Telegram,   │  │               │  │                 │ │
│  │  Feishu...)  │  │               │  │                 │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Container Runner (Docker/Apple)           │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │         Agent Container (academiclaw-agent)      │  │ │
│  │  │  ┌───────────────┐  ┌─────────────────────────┐ │  │ │
│  │  │  │ Claude Agent  │  │  MCP Tools              │ │  │ │
│  │  │  │   SDK         │  │  (Read, Write, Bash,    │ │  │ │
│  │  │  │               │  │   Task, WebSearch...)   │ │  │ │
│  │  │  └───────────────┘  └─────────────────────────┘ │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Components

| Component | Description | Location |
|-----------|-------------|----------|
| **Core Service** | Main orchestrator, message loop, agent invocation | `src/index.ts` |
| **Channel Registry** | Self-registration system for messaging channels | `src/channels/registry.ts` |
| **Router** | Message formatting and outbound routing | `src/router.ts` |
| **Container Runner** | Spawns agent containers with mounts | `src/container-runner.ts` |
| **IPC System** | Inter-process communication for agents | `src/ipc.ts` |
| **Database** | SQLite for messages, groups, tasks | `src/db.ts` |
| **Memory System** | Semantic search with embeddings | `src/memory/` |
| **Agent Container** | Isolated Linux VM with Claude Agent SDK | `container/` |

---

## 2. Skill System

### 2.1 Skill Structure

A skill is a self-contained package that modifies the codebase or configuration.

```
.claude/skills/{skill-name}/
├── SKILL.md              # Skill specification (required)
├── manifest.yaml         # Skill metadata (optional, future)
├── add/                  # Files to add
│   └── {path}/file.ts
├── modify/               # Files to modify
│   └── {path}/file.ts
│       └── {file}.intent.md  # Modification intent
└── tests/                # Test files
    └── {test-name}.test.ts
```

### 2.2 Skill Frontmatter (YAML)

Every `SKILL.md` must begin with YAML frontmatter:

```yaml
---
name: skill-name
description: Brief description of what this skill does
triggers:
  - "keyword1"
  - "keyword2"
---
```

### 2.3 Skill Phases

Most skills follow this pattern:

1. **Pre-flight** - Check current state, detect environment
2. **Verify** - Ensure dependencies and code are present
3. **Configure** - Collect user preferences
4. **Apply** - Make code/config changes
5. **Register** - Register channels or groups
6. **Verify** - Test and validate

---

## 3. Channel Development

### 3.1 Channel Interface

All channels must implement the `Channel` interface:

```typescript
export interface Channel {
  name: string;
  connect(): Promise<void>;
  sendMessage(jid: string, text: string): Promise<void>;
  isConnected(): boolean;
  ownsJid(jid: string): boolean;
  disconnect(): Promise<void>;
}
```

### 3.2 Channel Registration

Channels self-register at startup via the channel registry:

```typescript
// src/channels/{channel}.ts

registerChannel('channel-name', (opts: ChannelOpts) => {
  const envVars = readEnvFile(['CHANNEL_API_KEY', 'CHANNEL_SECRET']);
  const apiKey = process.env.CHANNEL_API_KEY || envVars.CHANNEL_API_KEY;

  if (!apiKey) {
    logger.debug('Channel: credentials not set');
    return null; // Channel not enabled
  }

  return new ChannelClass({ ...opts, apiKey });
});
```

### 3.3 Channel Auto-Enable Logic

Channels are automatically enabled when their credentials are present:

1. Check `process.env` for credentials
2. Fall back to reading `.env` file
3. Return `null` if credentials missing → channel skipped
4. Return channel instance if credentials present → channel enabled

### 3.4 JID Format Convention

Channels use JID (Jabber ID) format for consistent addressing:

| Channel | JID Format | Example |
|---------|------------|---------|
| WhatsApp | `{phone}@whatsapp` | `1234567890@s.whatsapp.net` |
| Telegram | `{chat_id}@telegram` | `-1001234567890@telegram` |
| Feishu/Lark | `{open_id}@feishu` | `oc_xxxxxxxx@feishu` |
| Slack | `{channel_id}@slack` | `C12345678@slack` |

---

## 4. Container Agent System

### 4.1 Agent Container Structure

```
academiclaw-agent:latest
├── /app/
│   ├── entrypoint.sh    # Container entry point
│   ├── dist/            # Compiled agent-runner
│   └── node_modules/    # Dependencies
└── /workspace/
    ├── group/           # Group-specific workspace (writable)
    ├── global/          # Global memory (shared across groups)
    ├── extra/           # Additional mounts (per allowlist)
    └── ipc/
        ├── messages/    # IPC for message streaming
        ├── tasks/       # IPC for task results
        └── input/       # IPC for follow-up inputs
```

### 4.2 Container Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_BASE_URL` | Optional alternate API endpoint |
| `MEMORY_ENABLED` | Enable semantic memory |
| `EMBEDDING_API_KEY` | Embedding provider key |
| `EMBEDDING_BASE_URL` | Embedding API endpoint |
| `EMBEDDING_MODEL` | Embedding model name |

### 4.3 MCP Server Integration

The agent includes an MCP server for host interaction:

```typescript
mcpServers: {
  academiclaw: {
    command: 'node',
    args: [mcpServerPath],
    env: {
      ACADEMICLAW_CHAT_JID: chatJid,
      ACADEMICLAW_GROUP_FOLDER: groupFolder,
      ACADEMICLAW_IS_MAIN: isMain ? '1' : '0',
    },
  },
}
```

---

## 5. Configuration Files

### 5.1 Environment Variables (.env)

```bash
# Claude Authentication
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic  # Optional

# Memory System
MEMORY_ENABLED=true
EMBEDDING_API_KEY=jina_xxxxx
EMBEDDING_BASE_URL=https://api.jina.ai/v1
EMBEDDING_MODEL=jina-embeddings-v3

# Container
CONTAINER_IMAGE=academiclaw-agent:latest
CONTAINER_TIMEOUT=1800000

# Channel Credentials (per channel)
FEISHU_APP_ID=cli_xxxxxx
FEISHU_APP_SECRET=xxxxx
TELEGRAM_BOT_TOKEN=xxxxx
```

### 5.2 Mount Allowlist (~/.config/academiclaw/mount-allowlist.json)

```json
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true,
      "description": "User projects"
    }
  ],
  "blockedPatterns": [
    "**/.ssh/**",
    "**/.gnupg/**",
    "**/node_modules/**"
  ],
  "nonMainReadOnly": true
}
```

### 5.3 Service Configuration

**macOS (launchd):** `~/Library/LaunchAgents/com.academiclaw.plist`
**Linux (systemd):** `~/.config/systemd/user/academiclaw.service`

---

## 6. Database Schema

### 6.1 Registered Groups

```sql
CREATE TABLE registered_groups (
  jid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder TEXT NOT NULL UNIQUE,
  trigger_pattern TEXT NOT NULL,
  added_at TEXT NOT NULL,
  container_config TEXT,
  requires_trigger INTEGER DEFAULT 1,
  is_main INTEGER DEFAULT 0
);
```

### 6.2 Messages

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%s', 'now'))
);
```

### 6.3 Scheduled Tasks

```sql
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  group_folder TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  schedule_value TEXT NOT NULL,
  context_mode TEXT NOT NULL,
  next_run TEXT,
  last_run TEXT,
  last_result TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## 7. Group Configuration

### 7.1 Group Folders

```
groups/{folder-name}/
├── CLAUDE.md              # Group-specific memory/instructions
├── memory/                # Semantic memory store
│   ├── messages.json      # Embedded messages
│   └── metadata.json      # Memory metadata
├── tasks/                 # Scheduled tasks
└── logs/                  # Container execution logs
```

### 7.2 Group Types

| Type | requiresTrigger | isMain | Mount Permissions |
|------|-----------------|--------|-------------------|
| Main Channel | false | true | Read-write to allowed roots |
| Trigger Group | true | false | Read-only (by default) |
| Direct Message | false | false | Read-only (by default) |

---

## 8. Memory System

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Memory System                      │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Messages    │──│ Embeddings   │──│   Store   │ │
│  │   (Source)    │  │   (Jina AI)  │  │ (Vector)  │ │
│  └───────────────┘  └──────────────┘  └───────────┘ │
│                            │                         │
│                            ▼                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Semantic Search                     │ │
│  │  - Max Results: 20                               │ │
│  │  - Min Score: 0.7                                │ │
│  │  - Batch Size: 32                                │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 8.2 Configuration

```typescript
MEMORY_MAX_RESULTS = 20        // Max results to return
MEMORY_MIN_SCORE = 0.7          // Minimum similarity score
MEMORY_BATCH_SIZE = 32          // Embedding batch size
MEMORY_SYNC_ON_WRITE = true     // Update on every message
MEMORY_GRACEFUL_DEGRADATION = true  // Fallback on error
```

---

## 9. Tool Reference

### 9.1 Built-in MCP Tools

| Tool | Description | Scope |
|------|-------------|-------|
| `Read` | Read file contents | Group workspace |
| `Write` | Create new files | Group workspace |
| `Edit` | Edit existing files | Group workspace |
| `Glob` | Find files by pattern | Group workspace |
| `Grep` | Search file contents | Group workspace |
| `Bash` | Execute shell commands | Full system |
| `WebSearch` | Search the web | Unrestricted |
| `WebFetch` | Fetch web content | Unrestricted |
| `Task` | Launch sub-agents | Full system |
| `TaskOutput` | Get task results | Full system |
| `TaskStop` | Stop running task | Full system |
| `Skill` | Execute user-invocable skills | Full system |
| `send_message` | Send immediate message | IPC only |

### 9.2 Custom Skills

User-invocable skills are defined in `.claude/skills/` and invoked via the `Skill` tool:

```
/{skill-name} [args...]
```

Examples:
- `/setup` - Run initial setup
- `/add-whatsapp` - Add WhatsApp channel
- `/add-telegram` - Add Telegram channel
- `/add-slack` - Add Slack channel
- `/add-feishu` - Add Feishu/Lark channel

---

## 10. Development Workflow

### 10.1 Creating a New Channel

1. **Create channel file:** `src/channels/{channel}.ts`
2. **Implement Channel interface**
3. **Add self-registration** at bottom of file
4. **Import in barrel:** `src/channels/index.ts`
5. **Create skill:** `.claude/skills/add-{channel}/SKILL.md`
6. **Test:** Build and verify

### 10.2 Creating a New Skill

1. **Create skill directory:** `.claude/skills/{skill-name}/`
2. **Write SKILL.md** with YAML frontmatter
3. **Define phases** (Pre-flight → Verify → Configure → Apply → Register)
4. **Add modify/ directory** if code changes needed
5. **Document** all user interactions

### 10.3 Building and Testing

```bash
# Build TypeScript
npm run build

# Rebuild container
./container/build.sh

# Restart service (macOS)
launchctl kickstart -k gui/$(id -u)/com.academiclaw

# View logs
tail -f logs/academiclaw.log
```

---

## 11. Naming Conventions

### 11.1 After NanoClaw → AcademiClaw Migration

| Component | Old Name | New Name |
|-----------|----------|----------|
| Project | NanoClaw | AcademiClaw |
| Container Image | `nanoclaw-agent:latest` | `academiclaw-agent:latest` |
| Container Prefix | `nanoclaw-` | `academiclaw-` |
| Config Directory | `.config/nanoclaw/` | `.config/academiclaw/` |
| State Directory | `.nanoclaw/` | `.academiclaw/` |
| Service Name | `com.nanoclaw` | `com.academiclaw` |
| MCP Server | `mcp__nanoclaw__*` | `mcp__academiclaw__*` |
| Env Vars | `NANOCLAW_*` | `ACADEMICLAW_*` |

### 11.2 Code Conventions

- **Files:** `kebab-case.ts` (e.g., `container-runner.ts`)
- **Classes:** `PascalCase` (e.g., `FeishuChannel`)
- **Functions:** `camelCase` (e.g., `sendMessage`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MEMORY_ENABLED`)
- **Interfaces:** `PascalCase` (e.g., `RegisteredGroup`)

---

## 12. Troubleshooting

### 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Service won't start | Wrong Node path in plist | Re-run `npx tsx setup/index.ts --step service` |
| Container exits 125 | Image not found | Rebuild container or check `CONTAINER_IMAGE` |
| No response to messages | Trigger pattern | Main channel doesn't need prefix |
| Channel not connecting | Missing credentials | Check `.env` for channel secrets |
| Memory disabled | `MEMORY_ENABLED` not set | Add to launchd plist |

### 12.2 Debug Commands

```bash
# Check service status
launchctl list | grep academiclaw

# View error logs
tail -f logs/academiclaw.error.log

# Check container
docker ps -a | grep academiclaw

# Inspect database
sqlite3 store/messages.db "SELECT * FROM registered_groups;"

# Test channel
npm run dev
```

---

## 13. Security Considerations

### 13.1 Mount Security

- Allowlist stored **outside** project root
- Never mounted into containers
- Non-main groups default to read-only
- Blocked patterns for sensitive paths (`.ssh`, `.gnupg`)

### 13.2 Credential Management

- Secrets read from `.env` file, not `process.env`
- Never logged or exposed in error messages
- Channel credentials checked at startup only
- API keys passed to containers via env vars

### 13.3 Container Isolation

- Each group gets isolated filesystem
- Global memory mounted read-only
- IPC via shared files (no network)
- Containers run as non-root user

---

## 14. Appendix

### 14.1 File Structure

```
AcademiClaw/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration
│   ├── db.ts                 # Database operations
│   ├── router.ts             # Message routing
│   ├── ipc.ts                # IPC watcher
│   ├── channels/             # Channel implementations
│   │   ├── index.ts          # Channel barrel
│   │   ├── registry.ts       # Channel registry
│   │   ├── whatsapp.ts
│   │   ├── telegram.ts
│   │   ├── slack.ts
│   │   └── feishu.ts
│   ├── memory/               # Memory system
│   └── ...
├── container/
│   ├── Dockerfile
│   ├── build.sh
│   └── agent-runner/         # Container-side code
├── setup/                    # Setup scripts
├── scripts/                  # Utility scripts
├── .claude/skills/           # Skill definitions
├── groups/                   # Group data
├── store/                    # Database
├── logs/                     # Service logs
└── reports/                  # Documentation (this file)
```

### 14.2 References

- **NanoClaw:** https://github.com/anthropics/nanoclaw
- **Claude Agent SDK:** https://docs.anthropic.com/en/docs/build-with-claude/agent
- **MCP Protocol:** https://modelcontextprotocol.io/
