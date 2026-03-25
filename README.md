<p align="center">
  <img src="assets/cover.svg" alt="AcademiClaw" width="400">
</p>

<p align="center">
  This is an educated lobster. You can also call him AC ( <del> not the AC that rejects your papers </del> )
</p>

<p align="center">
  <a href="README_zh.md">中文</a>&nbsp; • &nbsp;
  <a href="https://github.com/qwibitai/nanoclaw">NanoClaw</a>&nbsp; • &nbsp;
</p>

## Features

Compared to NanoClaw, we've primarily modified communication with Feishu etc., memory system, and academic-specific skills:

- **Semantic Memory Search** - Hybrid SQLite + LanceDB architecture for intelligent context retrieval
- **Multi-channel Support** - WhatsApp, Telegram, Slack, Feishu/Lark
- **Agent Groups** - Multi-agent collaboration for complex tasks
- **Scheduled Tasks** - Automated research summaries and periodic jobs
- **Container Isolation** - Secure sandboxed execution per group
- **Academic Integration** - Optimized for research workflows

## Academic Skills

AcademiClaw includes 16 built-in academic-specific skills:

### 📚 Paper Management

| Skill | Description | Triggers |
|-------|-------------|----------|
| **zotero-local** | Local Zotero database management: CRUD, PDF reading | "zotero", "literature", "paper" |
| **zotero-paper-reader** | Read and analyze academic papers from Zotero | "read paper", "analyze paper" |
| **arxiv-fetcher** | Fetch papers from arXiv | "arxiv", "fetch papers" |
| **paper-fetcher** | arXiv auto-search, translation, Zotero import | "search papers", "检索论文" |
| **paper-summarizer** | Generate daily/weekly/monthly reports | "daily summary", "学习总结" |
| **pdf-reader** | Deep PDF reading and analysis | "read PDF", "阅读PDF" |
| **papervault-cron** | Complete paper automation workflow | "paper workflow" |

### 🧠 Learning & Research

| Skill | Description | Triggers |
|-------|-------------|----------|
| **learning-reflector** | Deep reflection, blind spot discovery | "reflect learning", "反思学习" |
| **deep-research** | Enterprise-grade research: multi-source synthesis | "deep research", "comprehensive analysis" |
| **content-research-writer** | Content writing: research-backed, citations | "write", "content" |
| **data-analysis** | Data analysis: statistics, visualization | "analyze data", "data analysis" |

### 🛠️ Productivity Tools

| Skill | Description | Triggers |
|-------|-------------|----------|
| **token-usage-tracker** | Track API token consumption | "token usage", "API消耗" |
| **diagram-generator** | Generate flowcharts, sequence diagrams | "draw flowchart", "画流程图" |
| **slidev-generator** | Auto-generate Slidev presentations | "create presentation", "创建演示" |
| **github-cli** | GitHub automation (repos, issues, PRs) | "create repo", "创建仓库" |
| **agent-browser** | Browser automation for research | "browse", "search web" |

### Usage Examples

```
@Andy use zotero-local to search papers on machine learning
@Andy search today's papers on transformer    # paper-fetcher
@Andy generate weekly learning summary        # paper-summarizer
@Andy reflect on my learning blind spots      # learning-reflector
@Andy read this PDF paper                     # pdf-reader
@Andy draw a microservice architecture diagram    # diagram-generator
@Andy create a presentation on RAG            # slidev-generator
@Andy create a new GitHub repository          # github-cli
@Andy check my token usage today              # token-usage-tracker
```

## Quick Start

```bash
git clone https://github.com//academiclaw.git
cd academiclaw
claude
```

### Initial Setup

Run `/setup` in Claude Code CLI to configure:
- Dependencies and containers
- Message channels (WhatsApp, Telegram, etc.)
- Memory system (optional)

### Memory System

AcademiClaw includes an optional semantic memory system:

| Mode | Description | Cost |
|------|-------------|------|
| Off | SQLite only (exact match) | Free |
| Mock | Test mode, no API required | Free |
| Jina AI | Quality embeddings | 1M/month free |
| OpenAI | Official embeddings | Pay-per-use |

Enable with `MEMORY_ENABLED=true` in `.env`.

## Usage

Talk to your assistant with the trigger word (default: `@Andy`):

```
@Andy summarize the latest papers on semantic search from arXiv
@Andy create a weekly summary of my research notes every Monday 9am
@Andy search my conversation history for "vector database benchmarks"
```

## Architecture

```
Channels → SQLite + LanceDB → Polling → Container (Claude Agent) → Response
```

Key components:
- `src/index.ts` - Main orchestrator
- `src/memory/` - Semantic search system
- `src/channels/` - Channel implementations
- `src/container-runner.ts` - Container execution
- `src/task-scheduler.ts` - Scheduled tasks

### Memory System

```
      ┌────────────┐
      │   Input    │
      └─────┬──────┘
            │
   ┌────────┴─────────┐
   ▼                  ▼
 SQLite           LanceDB
(Source DB)     (Semantic Index)
   │                  │
   └────────┬─────────┘
            ▼
      Hybrid Retriever
```

## Configuration

Key environment variables:

```bash
# Memory System
MEMORY_ENABLED=false                    # Enable semantic search
EMBEDDING_API_KEY=                      # Jina AI or OpenAI key
EMBEDDING_BASE_URL=https://api.jina.ai/v1
EMBEDDING_MODEL=jina-embeddings-v3

# Claude API
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_CODE_OAUTH_TOKEN=                # Alternative

# Assistant Configuration
ASSISTANT_NAME=Andy
ASSISTANT_HAS_OWN_NUMBER=false
```

See `.env.example` for all options.

## Requirements

- macOS or Linux
- Node.js 20+
- [Claude Code](https://claude.ai/download)
- [Docker](https://docker.com) or [Apple Container](https://github.com/apple/container)

## Development

```bash
npm run dev          # Run with hot reload
npm run build        # Compile TypeScript
npm test             # Run tests
```

### Memory System Tests

```bash
# Unit tests
npm test

# Integration tests
npx tsx scripts/test-memory-integration.ts

# E2E tests (with mock embeddings)
MEMORY_ENABLED=true MEMORY_USE_MOCK_EMBEDDINGS=true npx tsx scripts/test-memory-e2e.ts

# Jina AI test (requires API key)
JINA_API_KEY=your-key npx tsx scripts/test-jina-memory.ts
```

## Documentation

- [Memory Architecture](docs/MEMORY_ARCHITECTURE.md) - Detailed system design
- [Test Results](docs/MEMORY_TEST_RESULTS.md) - Test coverage
- [Requirements](docs/REQUIREMENTS.md) - Architecture decisions
- [NanoClaw SPEC](docs/SPEC.md) - Base system specification

## Troubleshooting

**Memory not working:**
- Check `MEMORY_ENABLED=true` in `.env`
- Verify API key is set
- Check logs: `tail -f logs/academiclaw.log`

**Container fails to start:**
- Ensure Docker is running: `docker info`
- Check container logs in `groups/main/logs/`

**No response to messages:**
- Verify trigger pattern (default: `@Andy`)
- Check channel credentials in `.env`

## Contributing

AcademiClaw is a minimal fork of [NanoClaw](https://github.com/qwibitai/nanoclaw). Contributions should follow the same principles:

1. **Skills over features** - Use `.claude/skills/` for add-ons
2. **Keep it minimal** - Don't add bloat
3. **Document changes** - Update relevant docs

## License

MIT (same as NanoClaw)

## Acknowledgments

Based on [NanoClaw](https://github.com/qwibitai/nanoclaw) by qwibitai.
