---
name: find-skills
description: Search the ClawHub registry to discover and find available skills for installation.
triggers:
  - "find skills"
  - "search skills"
  - "find skill"
  - "available skills"
  - "list skills"
---

# Find Skills

Search the ClawHub registry to discover available skills. This is a meta-skill that helps you find other skills for your AI agent.

## Usage

```
/find-skills [query]
/find-skills --category <category>
/find-skills --trending
/find-skills --author <username>
```

## Examples

- `/find-skills browser` - Search for browser-related skills
- `/find-skills --category productivity` - Browse by category
- `/find-skills --trending` - Show trending skills
- `/find-skills --author JimLiuxinghai` - Search by author

## Phase 1: Pre-flight

### Check dependencies

Verify `curl` or `wget` is available for API requests:

```bash
command -v curl >/dev/null 2>&1 && echo "HTTP client available" || echo "ERROR: curl or wget required"
```

## Phase 2: Search

### Parse arguments

Extract the search query or options from the skill arguments:

- If argument starts with `--category`, filter by category
- If argument is `--trending`, show trending skills
- If argument starts with `--author`, filter by author
- Otherwise, treat as a text search query

### Query ClawHub API

Make a request to the ClawHub registry API:

```bash
# Basic search
curl -s "https://clawhub.ai/api/v1/skills?q=${query}&limit=10"

# Category search
curl -s "https://clawhub.ai/api/v1/skills?category=${category}&limit=10"

# Trending
curl -s "https://clawhub.ai/api/v1/skills/trending?limit=10"

# Author search
curl -s "https://clawhub.ai/api/v1/skills?author=${author}&limit=10"
```

### Parse and display results

Format the results as a readable list:

```markdown
## Found X skills

1. **skill-name** by @author
   - Description: Brief description
   - Category: category-name
   - Downloads: 1234
   - Install: `clawhub install skill-name`
```

## Phase 3: Installation guidance

After displaying results, offer guidance:

> To install a skill, you'll need to:
> 1. Visit the skill page on ClawHub for details
> 2. For AcademiClaw: Copy the skill's SKILL.md to `.claude/skills/<skill-name>/`
> 3. Follow the skill's installation instructions

## API Reference

### ClawHub API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/skills` | GET | List/search skills |
| `/api/v1/skills/trending` | GET | Get trending skills |
| `/api/v1/skills/:name` | GET | Get skill details |
| `/api/v1/categories` | GET | List categories |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `category` | string | Filter by category |
| `author` | string | Filter by author |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

## Categories

Common skill categories on ClawHub:

- `productivity` - Workflow automation
- `browser` - Web automation
- `search` - Search tools
- `communication` - Messaging and email
- `data` - Data processing
- `development` - Coding tools
- `media` - Image/video processing
- `system` - System administration

## Troubleshooting

### API unreachable

If the ClawHub API is unavailable, fallback to:

1. Check internet connectivity
2. Try visiting https://clawhub.ai directly
3. Search GitHub for "openclaw skills"

### No results found

- Try a broader search term
- Check spelling
- Browse categories instead

## Notes

- This skill is read-only - it only searches, does not install
- Installation requires manual setup or the separate ClawHub CLI
- Some skills may require additional dependencies
- Always review skill code before installing
