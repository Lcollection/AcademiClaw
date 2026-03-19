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

AcademiClaw includes built-in academic-specific skills:

| Skill | Description | Triggers |
|-------|-------------|----------|
| **zotero-local** | Local Zotero database management: CRUD, PDF reading | "zotero", "literature", "paper" |
| **zotero-paper-reader** | Read and analyze academic papers from Zotero | "read paper", "analyze paper" |
| **deep-research** | Enterprise-grade research: multi-source synthesis, citation tracking | "deep research", "comprehensive analysis" |
| **data-analysis** | Data analysis: statistics, visualization, reports | "analyze data", "data analysis" |
| **content-research-writer** | Content writing: research-backed, citations, real-time feedback | "write", "content" |

Usage examples:
```
@Andy use zotero-local to search papers on machine learning
@Andy perform deep analysis on this dataset
@Andy help me write a review on RAG technology
@Andy deep research on vector database trends
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
