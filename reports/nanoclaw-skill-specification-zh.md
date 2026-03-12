# NanoClaw/AcademiClaw 技能规范

**版本：** 1.0
**日期：** 2025-03-12
**项目：** AcademiClaw（NanoClaw 分支）

---

## 1. 概述

NanoClaw 是一个极简的、基于频道的 AI 助手框架。AcademiClaw 是一个专注于学术研究的分支，针对研究和学术工作流程进行了优化。

### 1.1 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      AcademiClaw 核心                       │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   频道       │  │  消息循环     │  │  群组队列       │ │
│  │  (WhatsApp,  │──│   (路由器)    │──│   (调度器)      │ │
│  │  Telegram,   │  │               │  │                 │ │
│  │  Feishu...)  │  │               │  │                 │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              容器运行器 (Docker/Apple)                 │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │         代理容器 (academiclaw-agent)              │  │ │
│  │  │  ┌───────────────┐  ┌─────────────────────────┐ │  │ │
│  │  │  │ Claude 代理   │  │  MCP 工具               │ │  │ │
│  │  │  │   SDK         │  │  (Read, Write, Bash,    │ │  │ │
│  │  │  │               │  │   Task, WebSearch...)   │ │  │ │
│  │  │  └───────────────┘  └─────────────────────────┘ │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 主要组件

| 组件 | 描述 | 位置 |
|-----------|-------------|----------|
| **核心服务** | 主协调器、消息循环、代理调用 | `src/index.ts` |
| **频道注册表** | 消息频道的自注册系统 | `src/channels/registry.ts` |
| **路由器** | 消息格式化和出站路由 | `src/router.ts` |
| **容器运行器** | 启动带挂载的代理容器 | `src/container-runner.ts` |
| **IPC 系统** | 代理的进程间通信 | `src/ipc.ts` |
| **数据库** | SQLite 用于消息、群组、任务 | `src/db.ts` |
| **记忆系统** | 基于嵌入的语义搜索 | `src/memory/` |
| **代理容器** | 带有 Claude Agent SDK 的隔离 Linux 虚拟机 | `container/` |

---

## 2. 技能系统

### 2.1 技能结构

技能是一个独立的包，用于修改代码库或配置。

```
.claude/skills/{skill-name}/
├── SKILL.md              # 技能规范（必需）
├── manifest.yaml         # 技能元数据（可选，未来）
├── add/                  # 要添加的文件
│   └── {path}/file.ts
├── modify/               # 要修改的文件
│   └── {path}/file.ts
│       └── {file}.intent.md  # 修改意图
└── tests/                # 测试文件
    └── {test-name}.test.ts
```

### 2.2 技能前置元数据（YAML）

每个 `SKILL.md` 必须以 YAML 前置元数据开头：

```yaml
---
name: skill-name
description: 对此技能功能的简要描述
triggers:
  - "keyword1"
  - "keyword2"
---
```

### 2.3 技能阶段

大多数技能遵循此模式：

1. **预检查** - 检查当前状态，检测环境
2. **验证** - 确保依赖和代码存在
3. **配置** - 收集用户偏好
4. **应用** - 进行代码/配置更改
5. **注册** - 注册频道或群组
6. **验证** - 测试和验证

---

## 3. 频道开发

### 3.1 频道接口

所有频道必须实现 `Channel` 接口：

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

### 3.2 频道注册

频道在启动时通过频道注册表自注册：

```typescript
// src/channels/{channel}.ts

registerChannel('channel-name', (opts: ChannelOpts) => {
  const envVars = readEnvFile(['CHANNEL_API_KEY', 'CHANNEL_SECRET']);
  const apiKey = process.env.CHANNEL_API_KEY || envVars.CHANNEL_API_KEY;

  if (!apiKey) {
    logger.debug('Channel: credentials not set');
    return null; // 频道未启用
  }

  return new ChannelClass({ ...opts, apiKey });
});
```

### 3.3 频道自动启用逻辑

当频道凭据存在时自动启用：

1. 检查 `process.env` 中的凭据
2. 回退到读取 `.env` 文件
3. 如果凭据缺失返回 `null` → 跳过频道
4. 如果凭据存在返回频道实例 → 启用频道

### 3.4 JID 格式约定

频道使用 JID（Jabber ID）格式进行一致的寻址：

| 频道 | JID 格式 | 示例 |
|---------|------------|---------|
| WhatsApp | `{phone}@whatsapp` | `1234567890@s.whatsapp.net` |
| Telegram | `{chat_id}@telegram` | `-1001234567890@telegram` |
| Feishu/Lark | `{open_id}@feishu` | `oc_xxxxxxxx@feishu` |
| Slack | `{channel_id}@slack` | `C12345678@slack` |

---

## 4. 容器代理系统

### 4.1 代理容器结构

```
academiclaw-agent:latest
├── /app/
│   ├── entrypoint.sh    # 容器入口点
│   ├── dist/            # 编译后的 agent-runner
│   └── node_modules/    # 依赖项
└── /workspace/
    ├── group/           # 群组特定工作区（可写）
    ├── global/          # 全局记忆（跨群组共享）
    ├── extra/           # 额外挂载（根据允许列表）
    └── ipc/
        ├── messages/    # 用于消息流的 IPC
        ├── tasks/       # 用于任务结果的 IPC
        └── input/       # 用于后续输入的 IPC
```

### 4.2 容器环境变量

| 变量 | 描述 |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API 密钥 |
| `ANTHROPIC_BASE_URL` | 可选的备用 API 端点 |
| `MEMORY_ENABLED` | 启用语义记忆 |
| `EMBEDDING_API_KEY` | 嵌入提供商密钥 |
| `EMBEDDING_BASE_URL` | 嵌入 API 端点 |
| `EMBEDDING_MODEL` | 嵌入模型名称 |

### 4.3 MCP 服务器集成

代理包含一个用于主机交互的 MCP 服务器：

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

## 5. 配置文件

### 5.1 环境变量 (.env)

```bash
# Claude 身份验证
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic  # 可选

# 记忆系统
MEMORY_ENABLED=true
EMBEDDING_API_KEY=jina_xxxxx
EMBEDDING_BASE_URL=https://api.jina.ai/v1
EMBEDDING_MODEL=jina-embeddings-v3

# 容器
CONTAINER_IMAGE=academiclaw-agent:latest
CONTAINER_TIMEOUT=1800000

# 频道凭据（每个频道）
FEISHU_APP_ID=cli_xxxxxx
FEISHU_APP_SECRET=xxxxx
TELEGRAM_BOT_TOKEN=xxxxx
```

### 5.2 挂载允许列表 (~/.config/academiclaw/mount-allowlist.json)

```json
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true,
      "description": "用户项目"
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

### 5.3 服务配置

**macOS (launchd):** `~/Library/LaunchAgents/com.academiclaw.plist`
**Linux (systemd):** `~/.config/systemd/user/academiclaw.service`

---

## 6. 数据库架构

### 6.1 已注册群组

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

### 6.2 消息

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

### 6.3 定时任务

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

## 7. 群组配置

### 7.1 群组文件夹

```
groups/{folder-name}/
├── CLAUDE.md              # 群组特定记忆/指令
├── memory/                # 语义记忆存储
│   ├── messages.json      # 嵌入的消息
│   └── metadata.json      # 记忆元数据
├── tasks/                 # 定时任务
└── logs/                  # 容器执行日志
```

### 7.2 群组类型

| 类型 | requiresTrigger | isMain | 挂载权限 |
|------|-----------------|--------|-------------------|
| 主频道 | false | true | 对允许的根目录读写 |
| 触发群组 | true | false | 只读（默认） |
| 私聊 | false | false | 只读（默认） |

---

## 8. 记忆系统

### 8.1 架构

```
┌─────────────────────────────────────────────────────┐
│                   记忆系统                           │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   消息        │──│   嵌入       │──│   存储    │ │
│  │   (源)        │  │   (Jina AI)  │  │  (向量)   │ │
│  └───────────────┘  └──────────────┘  └───────────┘ │
│                            │                         │
│                            ▼                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │              语义搜索                            │ │
│  │  - 最大结果数：20                                │ │
│  │  - 最小分数：0.7                                 │ │
│  │  - 批处理大小：32                                │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 8.2 配置

```typescript
MEMORY_MAX_RESULTS = 20        // 返回的最大结果数
MEMORY_MIN_SCORE = 0.7          // 最小相似度分数
MEMORY_BATCH_SIZE = 32          // 嵌入批处理大小
MEMORY_SYNC_ON_WRITE = true     // 每条消息时更新
MEMORY_GRACEFUL_DEGRADATION = true  // 错误时回退
```

---

## 9. 工具参考

### 9.1 内置 MCP 工具

| 工具 | 描述 | 作用域 |
|------|-------------|-------|
| `Read` | 读取文件内容 | 群组工作区 |
| `Write` | 创建新文件 | 群组工作区 |
| `Edit` | 编辑现有文件 | 群组工作区 |
| `Glob` | 按模式查找文件 | 群组工作区 |
| `Grep` | 搜索文件内容 | 群组工作区 |
| `Bash` | 执行 Shell 命令 | 完整系统 |
| `WebSearch` | 搜索网络 | 无限制 |
| `WebFetch` | 获取网络内容 | 无限制 |
| `Task` | 启动子代理 | 完整系统 |
| `TaskOutput` | 获取任务结果 | 完整系统 |
| `TaskStop` | 停止运行中的任务 | 完整系统 |
| `Skill` | 执行用户可调用技能 | 完整系统 |
| `send_message` | 发送即时消息 | 仅 IPC |

### 9.2 自定义技能

用户可调用技能在 `.claude/skills/` 中定义，并通过 `Skill` 工具调用：

```
/{skill-name} [args...]
```

示例：
- `/setup` - 运行初始设置
- `/add-whatsapp` - 添加 WhatsApp 频道
- `/add-telegram` - 添加 Telegram 频道
- `/add-slack` - 添加 Slack 频道
- `/add-feishu` - 添加飞书频道

---

## 10. 开发工作流程

### 10.1 创建新频道

1. **创建频道文件：** `src/channels/{channel}.ts`
2. **实现 Channel 接口**
3. **在文件底部添加自注册**
4. **在桶文件中导入：** `src/channels/index.ts`
5. **创建技能：** `.claude/skills/add-{channel}/SKILL.md`
6. **测试：** 构建并验证

### 10.2 创建新技能

1. **创建技能目录：** `.claude/skills/{skill-name}/`
2. **编写 SKILL.md** 并带有 YAML 前置元数据
3. **定义阶段**（预检查 → 验证 → 配置 → 应用 → 注册）
4. **添加 modify/ 目录**（如果需要代码更改）
5. **记录**所有用户交互

### 10.3 构建和测试

```bash
# 构建 TypeScript
npm run build

# 重新构建容器
./container/build.sh

# 重启服务 (macOS)
launchctl kickstart -k gui/$(id -u)/com.academiclaw

# 查看日志
tail -f logs/academiclaw.log
```

---

## 11. 命名约定

### 11.1 NanoClaw → AcademiClaw 迁移后

| 组件 | 旧名称 | 新名称 |
|-----------|----------|----------|
| 项目 | NanoClaw | AcademiClaw |
| 容器镜像 | `nanoclaw-agent:latest` | `academiclaw-agent:latest` |
| 容器前缀 | `nanoclaw-` | `academiclaw-` |
| 配置目录 | `.config/nanoclaw/` | `.config/academiclaw/` |
| 状态目录 | `.nanoclaw/` | `.academiclaw/` |
| 服务名称 | `com.nanoclaw` | `com.academiclaw` |
| MCP 服务器 | `mcp__nanoclaw__*` | `mcp__academiclaw__*` |
| 环境变量 | `NANOCLAW_*` | `ACADEMICLAW_*` |

### 11.2 代码约定

- **文件：** `kebab-case.ts`（例如，`container-runner.ts`）
- **类：** `PascalCase`（例如，`FeishuChannel`）
- **函数：** `camelCase`（例如，`sendMessage`）
- **常量：** `UPPER_SNAKE_CASE`（例如，`MEMORY_ENABLED`）
- **接口：** `PascalCase`（例如，`RegisteredGroup`）

---

## 12. 故障排除

### 12.1 常见问题

| 问题 | 原因 | 解决方案 |
|-------|-------|----------|
| 服务无法启动 | plist 中的 Node 路径错误 | 重新运行 `npx tsx setup/index.ts --step service` |
| 容器退出代码 125 | 未找到镜像 | 重新构建容器或检查 `CONTAINER_IMAGE` |
| 消息无响应 | 触发模式 | 主频道不需要前缀 |
| 频道未连接 | 缺少凭据 | 检查 `.env` 中的频道密钥 |
| 记忆已禁用 | 未设置 `MEMORY_ENABLED` | 添加到 launchd plist |

### 12.2 调试命令

```bash
# 检查服务状态
launchctl list | grep academiclaw

# 查看错误日志
tail -f logs/academiclaw.error.log

# 检查容器
docker ps -a | grep academiclaw

# 检查数据库
sqlite3 store/messages.db "SELECT * FROM registered_groups;"

# 测试频道
npm run dev
```

---

## 13. 安全考虑

### 13.1 挂载安全

- 允许列表存储在项目根目录**之外**
- 从不挂载到容器中
- 非主群组默认为只读
- 敏感路径的阻止模式（`.ssh`、`.gnupg`）

### 13.2 凭据管理

- 从 `.env` 文件读取密钥，而非 `process.env`
- 从不在日志中记录或在错误消息中暴露
- 频道凭据仅在启动时检查
- API 密钥通过环境变量传递给容器

### 13.3 容器隔离

- 每个群组获得隔离的文件系统
- 全局记忆以只读方式挂载
- 通过共享文件进行 IPC（无网络）
- 容器以非 root 用户运行

---

## 14. 附录

### 14.1 文件结构

```
AcademiClaw/
├── src/
│   ├── index.ts              # 主入口点
│   ├── config.ts             # 配置
│   ├── db.ts                 # 数据库操作
│   ├── router.ts             # 消息路由
│   ├── ipc.ts                # IPC 监视器
│   ├── channels/             # 频道实现
│   │   ├── index.ts          # 频道桶文件
│   │   ├── registry.ts       # 频道注册表
│   │   ├── whatsapp.ts
│   │   ├── telegram.ts
│   │   ├── slack.ts
│   │   └── feishu.ts
│   ├── memory/               # 记忆系统
│   └── ...
├── container/
│   ├── Dockerfile
│   ├── build.sh
│   └── agent-runner/         # 容器端代码
├── setup/                    # 设置脚本
├── scripts/                  # 实用脚本
├── .claude/skills/           # 技能定义
├── groups/                   # 群组数据
├── store/                    # 数据库
├── logs/                     # 服务日志
└── reports/                  # 文档（此文件）
```

### 14.2 参考

- **NanoClaw：** https://github.com/anthropics/nanoclaw
- **Claude Agent SDK：** https://docs.anthropic.com/en/docs/build-with-claude/agent
- **MCP 协议：** https://modelcontextprotocol.io/
