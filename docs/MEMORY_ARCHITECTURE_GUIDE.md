# AcademiClaw 记忆系统架构详解

## 目录

1. [概述](#概述)
2. [当前记忆系统](#当前记忆系统)
3. [数据存储架构](#数据存储架构)
4. [记忆检索机制](#记忆检索机制)
5. [会话管理](#会话管理)
6. [作用域隔离](#作用域隔离)
7. [目标架构对比](#目标架构对比)
8. [升级路径](#升级路径)

---

## 概述

AcademiClaw 的记忆系统采用**双层架构**设计：
1. **SQLite 数据库**：存储结构化数据（消息、会话、任务）
2. **文件系统**：存储非结构化记忆（CLAUDE.md、对话历史、学习内容）

```
┌─────────────────────────────────────────────────────────────┐
│                     AcademiClaw Host                        │
│                    (src/index.ts)                           │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  SQLite DB     │              │  Group Folders  │
        │  (store/)      │              │  (groups/{name})│
        └────────────────┘              └─────────────────┘
```

---

## 当前记忆系统

### 1. 数据库层（SQLite）

**位置**: `store/messages.db`

**核心表结构**:

```sql
-- 消息存储表
CREATE TABLE messages (
  id TEXT,                    -- 消息唯一标识
  chat_jid TEXT,              -- 聊天ID (如: whatsapp_group_id)
  sender TEXT,                -- 发送者ID
  sender_name TEXT,           -- 发送者名称
  content TEXT,               -- 消息内容
  timestamp TEXT,             -- 时间戳
  is_from_me INTEGER,         -- 是否为自己发送
  is_bot_message INTEGER,     -- 是否为机器人消息
  PRIMARY KEY (id, chat_jid)
);

-- 会话管理表
CREATE TABLE sessions (
  group_folder TEXT PRIMARY KEY,  -- 群组文件夹名
  session_id TEXT NOT NULL        -- Claude 会话ID
);

-- 注册群组表
CREATE TABLE registered_groups (
  jid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder TEXT NOT NULL UNIQUE,     -- 文件系统隔离目录
  trigger_pattern TEXT NOT NULL,
  added_at TEXT NOT NULL,
  container_config TEXT,           -- JSON配置
  requires_trigger INTEGER,        -- 是否需要触发词
  is_main INTEGER                  -- 是否为主群组
);

-- 聊天元数据表
CREATE TABLE chats (
  jid TEXT PRIMARY KEY,
  name TEXT,
  last_message_time TEXT,
  channel TEXT,                    -- whatsapp/telegram/slack
  is_group INTEGER
);

-- 定时任务表
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  group_folder TEXT NOT NULL,
  chat_jid TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL,     -- daily/weekly/cron
  schedule_value TEXT NOT NULL,
  next_run TEXT,
  last_run TEXT,
  last_result TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  context_mode TEXT DEFAULT 'isolated'
);

-- 任务运行日志表
CREATE TABLE task_run_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  run_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  error TEXT
);

-- 路由器状态表
CREATE TABLE router_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 2. 文件系统层

**目录结构**:

```
data/
├── store/
│   └── messages.db                    # SQLite 数据库
├── groups/
│   ├── main/                          # 主群组 (完整权限)
│   │   ├── CLAUDE.md                  # 群组记忆文件
│   │   ├── conversations/             # 对话历史
│   │   │   └── .learnings/            # 学习内容
│   │   └── logs/                      # 日志文件
│   ├── global/                        # 全局共享记忆
│   │   └── CLAUDE.md
│   └── {group_name}/                  # 其他群组
│       └── ...
└── sessions/
    └── {group_name}/
        ├── .claude/                   # Claude 会话配置
        │   ├── settings.json          # Claude 环境变量
        │   └── skills/                # 群组专属技能
        └── agent-runner-src/          # Agent Runner 源码副本
```

---

## 数据存储架构

### 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        消息接收流程                              │
└─────────────────────────────────────────────────────────────────┘

用户消息
    │
    ▼
┌─────────────────┐
│   通道层        │  (WhatsApp/Telegram/Slack)
│  (Channel)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  元数据存储     │  ← storeChatMetadata()
│  chats 表       │  (所有聊天，包括未注册群组)
└─────────────────┘
         │
         ▼
    已注册群组？
         │
    ┌────┴────┐
    │         │
   NO        YES
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │  完整消息存储   │  ← storeMessage()
    │    │  messages 表    │
    │    └─────────────────┘
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │  消息队列       │  ← GroupQueue
    │    │  (内存队列)     │
    │    └─────────────────┘
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │  格式化         │  ← formatMessages()
    │    │  生成 Prompt    │
    │    └─────────────────┘
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │  容器 Agent     │  ← runContainerAgent()
    │    │  Claude SDK     │
    │    └────────┬────────┘
    │             │
    │             ▼
    │    ┌─────────────────┐
    │    │  会话持久化     │  ← setSession()
    │    │  sessions 表    │
    │    └─────────────────┘
    │
    ▼
 消息处理完成
```

### 关键代码位置

| 功能 | 文件 | 行号 |
|------|------|------|
| 数据库初始化 | `src/db.ts` | 144-153 |
| 消息存储 | `src/db.ts` | 263-276 |
| 会话管理 | `src/db.ts` | 506-517 |
| 群组注册 | `src/db.ts` | 572-589 |
| 消息循环 | `src/index.ts` | 141-200 |
| 容器挂载 | `src/container-runner.ts` | 57-211 |

---

## 记忆检索机制

### 当前检索方式

AcademiClaw 目前使用**文件加载**方式进行记忆检索：

```typescript
// 数据流: SQLite → formatMessages() → Container Agent

// 1. 从 SQLite 获取历史消息
const missedMessages = getMessagesSince(
  chatJid,
  sinceTimestamp,
  ASSISTANT_NAME
);

// 2. 格式化为 Prompt
const prompt = formatMessages(missedMessages);

// 3. 传递给容器 Agent
runContainerAgent(group, { prompt, sessionId, ... });
```

### 容器挂载的记忆

容器运行时，以下目录会被挂载：

```typescript
// 主群组挂载
[
  '/workspace/project',        // 项目根目录 (只读)
  '/workspace/group',          // 群组目录 (读写)
  '/home/node/.claude',        // Claude 会话目录 (读写)
  '/workspace/global',         // 全局记忆 (只读)
  '/workspace/ipc',            // IPC 通信 (读写)
]

// 非主群组挂载
[
  '/workspace/group',          // 群组目录 (读写)
  '/home/node/.claude',        // Claude 会话目录 (读写)
  '/workspace/global',         // 全局记忆 (只读)
  '/workspace/ipc',            // IPC 通信 (读写)
]
```

### Claude 环境配置

每个群组的 `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD": "1",
    "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "0"
  }
}
```

**配置说明**:
- `AGENT_TEAMS`: 启用子代理编排
- `ADDITIONAL_DIRECTORIES_CLAUDE_MD`: 从挂载目录加载 CLAUDE.md
- `DISABLE_AUTO_MEMORY`: 启用 Claude 自动记忆功能

---

## 会话管理

### Session ID 持久化

```typescript
// 获取群组的 session_id
export function getSession(groupFolder: string): string | undefined {
  const row = db.prepare(
    'SELECT session_id FROM sessions WHERE group_folder = ?'
  ).get(groupFolder);
  return row?.session_id;
}

// 保存 session_id
export function setSession(groupFolder: string, sessionId: string): void {
  db.prepare(
    'INSERT OR REPLACE INTO sessions (group_folder, session_id) VALUES (?, ?)'
  ).run(groupFolder, sessionId);
}
```

### 会话数据流

```
┌────────────────────────────────────────────────────────────┐
│                     会话生命周期                             │
└────────────────────────────────────────────────────────────┘

启动时加载
    │
    ▼
sessions = getAllSessions()
    │
    ▼
{ "main": "sess-abc123", "research": "sess-def456" }
    │
    ▼
消息到达 → processGroupMessages()
    │
    ▼
const sessionId = sessions[group.folder]
    │
    ▼
runContainerAgent(group, { prompt, sessionId })
    │
    ▼
容器返回 newSessionId
    │
    ▼
setSession(group.folder, newSessionId)
    │
    ▼
sessions[group.folder] = newSessionId (内存更新)
    │
    ▼
saveState() (持久化到 SQLite)
```

---

## 作用域隔离

### 隔离策略

AcademiClaw 使用**文件系统隔离**实现多群组记忆分离：

```typescript
// 目录结构
groups/
├── main/           // 主群组 (可访问项目代码)
├── global/         // 全局共享 (所有群组只读)
└── {group_name}/   // 独立群组 (仅访问自己)
```

### 权限矩阵

| 资源 | Main Group | Other Groups |
|------|------------|--------------|
| `/workspace/project` | 读写 | 不可访问 |
| `/workspace/group` | 读写 | 读写 |
| `/workspace/global` | 读写 | 只读 |
| `/workspace/ipc` | 读写 | 读写 |

### 安全隔离

```typescript
// 容器挂载安全检查
function buildVolumeMounts(group: RegisteredGroup, isMain: boolean) {
  if (isMain) {
    // Main 获取项目根目录 (只读)
    mounts.push({
      hostPath: projectRoot,
      containerPath: '/workspace/project',
      readonly: true,  // 防止修改源代码
    });
  } else {
    // 其他群组只获取自己的目录
    mounts.push({
      hostPath: groupDir,
      containerPath: '/workspace/group',
      readonly: false,
    });

    // 全局记忆 (只读)
    const globalDir = path.join(GROUPS_DIR, 'global');
    mounts.push({
      hostPath: globalDir,
      containerPath: '/workspace/global',
      readonly: true,  // 只读访问
    });
  }
}
```

---

## 目标架构对比

### memory-lancedb-pro 架构

```
┌─────────────────────────────────────────────────────────────┐
│                   OpenClaw Gateway                          │
│  (Plugin API + Hooks + Config System)                       │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  LanceDB       │              │  OpenClaw       │
        │  (Vector+BM25) │              │  Agent Workspace│
        └────────────────┘              └─────────────────┘
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  memories 表   │              │  CLAUDE.md      │
        │  - vector      │              │  reflections/   │
        │  - text (FTS)  │              │  .learnings/    │
        │  - category    │              │  memory-md/     │
        │  - scope       │              │                 │
        │  - importance  │              │                 │
        │  - created_at  │              │                 │
        │  - accessed_at │              │                 │
        └────────────────┘              └─────────────────┘
```

### 核心差异

| 维度 | AcademiClaw | memory-lancedb-pro |
|------|-------------|-------------------|
| **存储** | SQLite + 文件系统 | LanceDB (向量 + BM25) |
| **检索** | 关键词过滤 | 混合检索 (Vector + BM25) |
| **重排序** | 无 | Cross-Encoder Rerank |
| **评分** | 无 | 多阶段评分系统 |
| **作用域** | 文件系统文件夹 | 数据库 scope 字段 |
| **自动记忆** | Claude SDK 原生 | 插件系统 |

### 混合检索管道

```
Query → embedQuery() ─┐
                     ├─→ RRF Fusion → Rerank → Recency Boost
Query → BM25 FTS ─────┘                              → Importance Weight
                                                         → Length Norm
                                                         → Time Decay
                                                         → Hard Min Score
                                                         → Noise Filter
                                                         → MMR Diversity
```

**评分组件**:
1. **RRF Fusion**: Vector 和 BM25 结果融合
2. **Rerank**: Cross-Encoder 重排序 (Jina/SiliconFlow)
3. **Recency Boost**: 最近记忆加权
4. **Importance Weight**: 重要性加权
5. **Time Decay**: 时间衰减
6. **MMR Diversity**: 多样性优化

---

## 升级路径

### Phase 1: SQLite FTS5 (立即可做)

在现有 SQLite 基础上添加全文搜索：

```sql
-- 添加记忆分类列
ALTER TABLE messages ADD COLUMN memory_category TEXT;
ALTER TABLE messages ADD COLUMN memory_importance REAL;

-- 创建 FTS5 虚拟表
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  group_folder,
  memory_category,
  content_rowid=rowid
);

-- 创建触发器自动同步
CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, group_folder, memory_category)
  VALUES (new.rowid, new.content, new.group_folder, new.memory_category);
END;
```

**新文件**: `src/memory/sqlite-fts.ts`

```typescript
export async function searchMemoriesFTS(
  query: string,
  groupFolder: string,
  limit: number = 10
): Promise<Memory[]> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT m.* FROM messages m
    JOIN messages_fts fts ON m.rowid = fts.rowid
    WHERE messages_fts MATCH ? AND m.group_folder = ?
    ORDER BY rank
    LIMIT ?
  `);
  return stmt.all(query, groupFolder, limit);
}
```

### Phase 2: 向量搜索 (1-2 周)

添加 LanceDB 向量存储：

```bash
npm install @lancedb/lancedb openai
```

**新文件**: `src/memory/lancedb-store.ts`

```typescript
import * as lancedb from '@lancedb/lancedb';

export class LanceDBMemoryStore {
  private db: lancedb.Connection;
  private table: lancedb.Table;

  async init() {
    this.db = await lancedb.connect('data/memory');
    this.table = await this.db.createTable('memories', [{
      vector: lancedb.EmbeddingVector(1536),
      text: str,
      category: str,
      groupFolder: str,
      importance: float32,
      createdAt: str,
    }]);
  }

  async store(memory: Memory) {
    const vector = await embedText(memory.text);
    await this.table.add({
      vector,
      text: memory.text,
      category: memory.category,
      groupFolder: memory.groupFolder,
      importance: memory.importance || 0.5,
      createdAt: new Date().toISOString(),
    });
  }

  async search(query: string, groupFolder: string, limit: number = 10) {
    const vector = await embedText(query);
    return await this.table
      .vectorSearch(vector)
      .where(`groupFolder = '${groupFolder}'`)
      .limit(limit)
      .toArray();
  }
}
```

### Phase 3: 混合检索 (2-4 周)

实现 RRF 融合和重排序：

**新文件**: `src/memory/hybrid-retriever.ts`

```typescript
export class HybridRetriever {
  constructor(
    private ftsStore: FTSStore,
    private vectorStore: LanceDBMemoryStore,
    private reranker?: Reranker
  ) {}

  async retrieve(query: string, groupFolder: string, topK: number = 10) {
    // 1. 并行检索
    const [ftsResults, vectorResults] = await Promise.all([
      this.ftsStore.search(query, groupFolder, topK * 2),
      this.vectorStore.search(query, groupFolder, topK * 2),
    ]);

    // 2. RRF 融合
    const fused = rrfFuse(ftsResults, vectorResults, k = 60);

    // 3. 重排序 (可选)
    if (this.reranker) {
      const reranked = await this.reranker.rerank(query, fused.slice(0, topK * 2));
      return reranked.slice(0, topK);
    }

    return fused.slice(0, topK);
  }
}

// RRF 融合算法
function rrfFuse(
  results1: SearchResult[],
  results2: SearchResult[],
  k: number = 60
): SearchResult[] {
  const scores = new Map<string, number>();

  for (const [i, result] of results1.entries()) {
    const score = 1 / (k + i + 1);
    scores.set(result.id, (scores.get(result.id) || 0) + score);
  }

  for (const [i, result] of results2.entries()) {
    const score = 1 / (k + i + 1);
    scores.set(result.id, (scores.get(result.id) || 0) + score);
  }

  // 按 RRF 分数排序
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ id, score }));
}
```

### Phase 4: 学术专属功能 (持续)

**新文件**: `src/memory/academic-memory.ts`

```typescript
// 学术记忆类型
export interface AcademicMemory {
  text: string;
  category: 'fact' | 'decision' | 'citation' | 'concept' | 'experiment';
  citations?: Citation[];
  keywords?: string[];
  relatedConcepts?: string[];
  paperReference?: PaperReference;
}

// 引用类型
export interface Citation {
  type: 'paper' | 'book' | 'url' | 'code';
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
  doi?: string;
}

// 论文参考
export interface PaperReference {
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  pdfUrl?: string;
}

// 实验记录
export interface ExperimentLog {
  id: string;
  date: Date;
  hypothesis: string;
  setup: string;
  results: string;
  conclusion: string;
  followUp: string[];
}
```

---

## 总结

### 当前系统优势

1. **简单可靠**: SQLite + 文件系统，无需额外依赖
2. **易于调试**: 数据可直接查看和编辑
3. **容器隔离**: 每个群组独立运行，安全隔离
4. **会话持久化**: session_id 确保对话连续性

### 当前系统局限

1. **无语义搜索**: 无法理解查询意图，只能关键词匹配
2. **无记忆评分**: 所有消息同等重要，无法区分
3. **无自动遗忘**: 记忆永久保存，可能积累噪声
4. **无跨群组关联**: 每个群组独立，无法共享知识

### 升级建议

采用**渐进式升级**路径：
- **Phase 1**: SQLite FTS5 (1周) - 立即改善搜索
- **Phase 2**: 向量搜索 (2周) - 启用语义检索
- **Phase 3**: 混合检索 (3周) - 提升检索质量
- **Phase 4**: 学术功能 (持续) - 专业化优化

---

*文档版本: 1.0*
*创建日期: 2025-03-09*
*作者: AcademiClaw 开发团队*
