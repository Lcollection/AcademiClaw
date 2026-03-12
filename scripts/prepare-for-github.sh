#!/bin/bash
# Prepare AcademiClaw repository for GitHub sync
# This script sanitizes sensitive data and creates example files

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== AcademiClaw GitHub Preparation Script ==="
echo ""
echo "This script will:"
echo "  1. Create .env.example from your .env (sanitized)"
echo "  2. Clean log files"
echo "  3. Reset database (removes messages)"
echo "  4. Clean groups/ directory (keeps structure)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# 1. Create .env.example
echo ">>> Creating .env.example..."
cat > .env.example << 'EOF'
# Feishu/Lark Channel (optional - remove if not using)
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here

# Telegram Channel (optional - remove if not using)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# WhatsApp Channel (optional - auto-generated via QR/pairing)
# No manual configuration needed

# Memory System (Semantic Search)
MEMORY_ENABLED=true
EMBEDDING_API_KEY=your_embedding_api_key_here
EMBEDDING_BASE_URL=https://api.jina.ai/v1
EMBEDDING_MODEL=jina-embeddings-v3

# Provider: Jina AI (https://jina.ai/)
# Alternatives: OpenAI, or custom OpenAI-compatible endpoint
MEMORY_MAX_RESULTS=20
MEMORY_MIN_SCORE=0.7
MEMORY_BATCH_SIZE=32
MEMORY_SYNC_ON_WRITE=true
MEMORY_GRACEFUL_DEGRADATION=true

# Claude Authentication
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Or use GLM (BigModel.cn):
# ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic

# Container (optional)
CONTAINER_IMAGE=academiclaw-agent:latest
CONTAINER_TIMEOUT=1800000

# Assistant (optional)
ASSISTANT_NAME=Andy
EOF

# 2. Clean logs
echo ">>> Cleaning log files..."
rm -rf logs/*.log logs/setup.log 2>/dev/null || true
touch logs/.gitkeep

# 3. Reset database
echo ">>> Resetting database..."
rm -f store/messages.db 2>/dev/null || true
mkdir -p store

# 4. Clean groups (keep structure only)
echo ">>> Cleaning groups directory..."
find groups -type f ! -name "CLAUDE.md" -delete 2>/dev/null || true
find groups -type d -empty -delete 2>/dev/null || true

# 5. Clean container build cache
echo ">>> Note: Container image not included (build locally)"
echo "    Run ./container/build.sh after cloning"

# 6. Verify .gitignore
echo ">>> Verifying .gitignore..."
if ! grep -q ".env" .gitignore; then
    echo "WARNING: .env not in .gitignore"
fi

echo ""
echo "=== Preparation Complete ==="
echo ""
echo "Files created/modified:"
echo "  - .env.example (sanitized configuration)"
echo "  - logs/ (emptied)"
echo "  - store/messages.db (removed)"
echo "  - groups/ (cleaned, structure preserved)"
echo ""
echo "Next steps:"
echo "  1. Review .gitignore to ensure sensitive files are excluded"
echo "  2. Run 'git status' to check what will be committed"
echo "  3. Run 'git add .' and 'git commit'"
echo "  4. Push to GitHub"
echo ""
echo "After cloning on a new machine:"
echo "  1. Copy .env.example to .env"
echo "  2. Fill in your credentials"
echo "  3. Run npm install"
echo "  4. Run /setup (invoke the setup skill)"
