---
name: add-memory-pro
description: >
  Add LanceDB Pro memory system with auto-capture, auto-recall, categorization, and importance scoring.
  Replaces basic memory with advanced long-term memory capabilities.
---

# Add Memory Pro (LanceDB)

Upgrade AcademiClaw with advanced long-term memory:

- **Categorization**: preference, fact, decision, entity, other
- **Importance scoring**: 0-1 scale for relevance ranking
- **Auto-capture**: Automatically store important info from conversations
- **Auto-recall**: Inject relevant memories into context
- **Deduplication**: Vector similarity detection
- **Security**: Prompt injection protection

## Prerequisites

1. OpenAI API key (for embeddings) or compatible endpoint
2. LanceDB native binding (auto-installed)

## Installation

```bash
npx tsx scripts/apply-skill.ts .claude/skills/add-memory-pro
```

## Configuration

Add to `.env`:

```bash
# Memory Pro
MEMORY_ENABLED=true
MEMORY_AUTO_CAPTURE=true
MEMORY_AUTO_RECALL=true
MEMORY_EMBEDDING_API_KEY=sk-...
MEMORY_EMBEDDING_MODEL=text-embedding-3-small
MEMORY_EMBEDDING_BASE_URL=https://api.openai.com/v1  # optional
MEMORY_DB_PATH=~/.academiclaw/memory  # optional
```

## Usage

After installation, the agent will have access to:

### Tools

| Tool | Description |
|------|-------------|
| `memory_recall` | Search memories by query |
| `memory_store` | Store important information |
| `memory_forget` | Delete specific memories |

### Auto Features

- **Auto-capture**: Detects and stores preferences, decisions, facts
- **Auto-recall**: Injects relevant memories before agent starts

## Memory Categories

| Category | Trigger Examples |
|----------|-----------------|
| `preference` | "I prefer...", "I like...", "I hate..." |
| `fact` | "My name is...", "I work at..." |
| `decision` | "We decided...", "We will use..." |
| `entity` | Phone numbers, emails, names |
| `other` | Everything else |

## Example

```
User: Remember that I prefer dark mode
Agent: [Stores as preference]

User: What's my preference for UI?
Agent: [Recalls] You prefer dark mode.
```

## Technical Details

- Uses LanceDB for vector storage
- OpenAI text-embedding-3-small by default (1536 dimensions)
- Supports custom embedding endpoints (Ollama, etc.)
- Memory deduplication at 95% similarity threshold
