# GitHub 同步准备指南

**日期:** 2025-03-12
**状态:** 已准备就绪

---

## 已处理的隐私内容

### 1. 环境变量 (.env)

**原始文件包含:**
- ✗ FEISHU_APP_ID / FEISHU_APP_SECRET
- ✗ ANTHROPIC_API_KEY
- ✗ ANTHROPIC_BASE_URL (GLM)
- ✗ EMBEDDING_API_KEY (Jina AI)
- ✗ 其他个人配置

**已创建:** `.env.example` (不含真实凭证)

### 2. 日志文件 (logs/)

**已清理:**
- `logs/academiclaw.log` - 包含聊天记录和系统日志
- `logs/academiclaw.error.log` - 错误日志
- `logs/setup.log` - 安装日志
- `groups/*/logs/*.log` - 各组容器日志

### 3. 数据库 (store/)

**已清理:**
- `store/messages.db` - 包含所有消息记录
- `store/messages.db-shm` / `store/messages.db-wal` - 数据库临时文件

### 4. 群组数据 (groups/)

**已清理:**
- `groups/feishu_main/` - 聊天记录和记忆
- 其他组的对话历史

### 5. 服务配置

**已创建示例:** `com.academiclaw.plist.example` (不含凭证)

---

## .gitignore 排除项

以下路径/文件不会被提交到 GitHub：

```
.env                    # 环境变量
logs/                   # 所有日志
store/                  # 数据库
data/                   # 运行时数据
groups/*/               # 组数据 (保留结构)
node_modules/           # 依赖
dist/                   # 编译输出
.academiclaw/           # 本地状态
```

---

## 提交前的检查清单

- [ ] 确认 `.env` 未被跟踪 (`git check-ignore .env`)
- [ ] 确认 `logs/` 未被跟踪
- [ ] 确认 `store/` 未被跟踪
- [ ] 运行 `git status` 查看待提交文件
- [ ] 确认没有个人凭证出现在待提交文件中

---

## 推荐的提交命令

```bash
# 查看状态
git status

# 添加所有更改
git add .

# 提交
git commit -m "refactor: rename nanoclaw to academiclaw

- Update all references from nanoclaw to academiclaw
- Add GitHub preparation script
- Create .env.example for configuration template
- Update documentation"

# 推送到 GitHub
git push origin main
```

---

## 克隆后的设置步骤

在新机器上克隆此仓库后：

```bash
# 1. 安装依赖
npm install

# 2. 创建配置文件
cp .env.example .env

# 3. 填入凭证
# 编辑 .env 文件，添加你的 API keys 和应用凭证

# 4. 构建容器
./container/build.sh

# 5. 运行 setup (通过 Claude Code)
# /setup
```

---

## 安全提醒

⚠️ **重要:** 永远不要提交以下内容到 GitHub：

- API Keys (ANTHROPIC_API_KEY, EMBEDDING_API_KEY 等)
- 应用凭证 (FEISHU_APP_SECRET, TELEGRAM_BOT_TOKEN 等)
- 个人聊天记录
- 包含个人信息的日志
- 数据库文件

---

## 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `.env` | ✗ 排除 | 个人配置，不提交 |
| `.env.example` | ✓ 提交 | 配置模板 |
| `logs/` | ✗ 排除 | 日志目录 |
| `store/` | ✗ 排除 | 数据库 |
| `groups/*/` | ✗ 排除 | 组数据 |
| `com.academiclaw.plist.example` | ✓ 提交 | 服务配置示例 |
| `scripts/prepare-for-github.sh` | ✓ 提交 | 清理脚本 |
| `reports/nanoclaw-skill-specification.md` | ✓ 提交 | 技术文档 |

---

## 自动清理脚本

如需再次清理，运行：

```bash
bash scripts/prepare-for-github.sh
```

这将自动：
- 创建/更新 `.env.example`
- 清空日志文件
- 删除数据库
- 清理组数据
