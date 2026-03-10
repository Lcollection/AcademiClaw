# AcademiClaw 记忆系统升级分析

## 目录

1. [当前架构](#当前架构)
2. [目标架构](#目标架构)
3. [架构差异分析](#架构差异分析)
4. [升级方案](#升级方案)
5. [学术工作流专属功能](#学术工作流专属功能)
6. [推荐实施路径](#推荐实施路径)

---

## 当前架构

### AcademiClaw 记忆系统

```
┌─────────────────────────────────────────────────────────────┐
│                     AcademiClaw Host                        │
│  (src/index.ts + src/container-runner.ts + src/db.ts)       │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  SQLite DB     │              │  Group Folders  │
        │  (store/)      │              │  (groups/{name})│
        └────────────────┘              └─────────────────┘
               │                                  │
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  messages      │              │  CLAUDE.md      │
        │  registered_   │              │  conversations/ │
        │  groups        │              │  .learnings/    │
        │  sessions      │              │                 │
        │  scheduled_    │              │                 │
        │  tasks         │              │                 │
        └────────────────┘              └─────────────────┘
```

**核心特点：**

| 组件 | 技术 | 作用 |
|------|------|------|
| **主存储** | SQLite | 结构化数据存储 |
| **记忆文件** | CLAUDE.md | 群组隔离的文本记忆 |
| **会话管理** | session_id | SQLite + 文件系统 |
| **作用域隔离** | 文件系统文件夹 | groups/{name}/ + groups/global/ |

**数据流：**

```
用户消息 → SQLite 存储 → 格式化 → 容器 Agent
                  ↓
            session_id 持久化
                  ↓
            CLAUDE.md 自动加载
```

---

## 目标架构

### memory-lancedb-pro 架构

```
┌─────────────────────────────────────────────────────────────┐
│                   OpenClaw Gateway                          │
│  (Plugin API + Hooks + Config System)                       │
└──────────────┬──────────────────────────────────┬───────────┘
               │                                  │
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  LanceDB       │              │  OpenClaw       │
        │  (Vector+BM25) │              │  Agent Workspace│
        └────────────────┘              └─────────────────┘
               │                                  │
               │                                  │
        ┌──────▼─────────┐              ┌────────▼────────┐
        │  memories 表   │              │  CLAUDE.md      │
        │  - vector      │              │  reflections/   │
        │  - text (FTS)  │              │  .learnings/    │
        │  - category    │              │  memory-md/     │
        │  - scope       │              │                 │
        │  - importance  │              │                 │
        └────────────────┘              └─────────────────┘
```

**核心特点：**

| 组件 | 技术 | 作用 |
|------|------|------|
| **向量存储** | LanceDB | 向量搜索 (ANN) |
| **全文搜索** | BM25 | 关键词精确匹配 |
| **混合检索** | RRF Fusion | Vector + BM25 融合 |
| **重排序** | Cross-Encoder | Jina/SiliconFlow API |
| **多作用域** | scope 字段 | global/agent/custom/project/user |

**检索管道：**

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

---

## 架构差异分析

### 关键差异表

| 方面 | AcademiClaw | memory-lancedb-pro |
|------|-------------|-------------------|
| **基础架构** | NanoClaw (消息路由 + 容器) | OpenClaw 插件系统 |
| **插件 API** | 无 (硬编码通道) | 完整钩子系统 |
| **记忆存储** | SQLite + 文件系统 | LanceDB (向量 + BM25) |
| **检索方式** | 文件加载，无语义搜索 | 混合检索 + 多阶段评分 |
| **作用域隔离** | 文件系统文件夹 | 数据库 scope 字段 |
| **Agent 工具** | MCP Server (ipc-mcp-stdio.ts) | OpenClaw Tool API |
| **会话策略** | SQLite session_id | systemSessionMemory/memoryReflection |

### 兼容性问题

#### 1. 插件系统不兼容

```typescript
// OpenClaw 插件接口
interface OpenClawPlugin {
  onLoad(): Promise<void>;
  onUnload(): Promise<void>;
  hooks: {
    before_agent_start?: HookCallback;
    agent_end?: HookCallback;
    before_prompt_build?: HookCallback;
  };
}

// AcademiClaw 没有对应的钩子系统
// 消息流程：通道 → SQLite → 格式化 → 容器
```

#### 2. 工具 API 不兼容

```typescript
// OpenClaw Tool API (memory-lancedb-pro)
tools: {
  memory_store: {
    input_schema: { ... },
    handler: async (params) => { ... }
  }
}

// AcademiClaw MCP Server (ipc-mcp-stdio.ts)
mcpServers: {
  nanoclaw: {
    command: 'node',
    args: [mcpServerPath],
    env: { ... }
  }
}
```

#### 3. 配置系统不同

```json
// OpenClaw 配置 (~/.openclaw/openclaw.json)
{
  "plugins": {
    "entries": {
      "memory-lancedb-pro": {
        "enabled": true,
        "config": { ... }
      }
    }
  }
}

// AcademiClaw 配置 (.env + SQLite)
// 没有插件加载系统
```

---

## 升级方案

### 方案 A：完整移植 (推荐但工作量大)

将 memory-lancedb-pro 的核心功能移植到 AcademiClaw 架构。

**新文件结构：**

```
src/memory/
├── index.ts           # 记忆系统入口
├── store.ts           # LanceDB 存储层
├── embedder.ts        # 向量嵌入抽象
├── retriever.ts       # 混合检索引擎
├── scopes.ts          # 作用域隔离
├── noise-filter.ts    # 噪声过滤
├── adaptive-retrieval.ts  # 自适应检索
└── tools/
    ├── memory_store.ts
    ├── memory_recall.ts
    └── memory_forget.ts
```

**集成点：**

1. **在 `src/container-runner.ts` 中添加记忆挂载：**
```typescript
// 在 buildVolumeMounts 中添加
const memoryDir = path.join(DATA_DIR, 'memory', group.folder);
fs.mkdirSync(memoryDir, { recursive: true });
mounts.push({
  hostPath: memoryDir,
  containerPath: '/workspace/memory',
  readonly: false,
});
```

2. **在 `container/agent-runner/src/ipp-mcp-stdio.ts` 中添加记忆工具：**
```typescript
// 添加记忆相关的 MCP 工具
tools: {
  memory_store: { ... },
  memory_recall: { ... },
  memory_forget: { ... },
}
```

3. **添加依赖：**
```bash
npm install @lancedb/lancedb openai
```

**优点：**
- 完整的混合检索能力
- 充分利用 AcademiClaw 的架构优势
- 完全控制实现细节

**缺点：**
- 工作量大 (~2000 行代码)
- 需要深入理解两个系统
- 维护成本高

---

### 方案 B：轻量级升级 (快速见效)

保留现有 CLAUDE.md + SQLite 架构，添加基础语义检索。

**新文件结构：**

```
src/memory/
├── sqlite-fts.ts      # SQLite FTS5 全文搜索
├── embeddings.ts      # 基础向量嵌入
├── retriever.ts       # 简单混合检索
└── migration.ts       # 从现有系统迁移
```

**核心实现：**

```typescript
// sqlite-fts.ts - 在现有 SQLite 基础上添加 FTS5
CREATE VIRTUAL TABLE memories_fts USING fts5(
  text,
  category,
  group_folder,
  content=messages,
  content_rowid=rowid
);

// embeddings.ts - 使用 OpenAI Embeddings API
async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// retriever.ts - 简单的向量 + 关键词混合检索
async function retrieveMemories(
  query: string,
  groupFolder: string,
  topK: number = 3
): Promise<Memory[]> {
  // 1. 向量搜索
  const vectorResults = await vectorSearch(query, groupFolder, topK * 2);
  // 2. 全文搜索
  const ftsResults = await ftsSearch(query, groupFolder, topK * 2);
  // 3. 简单融合
  return fuseResults(vectorResults, ftsResults, topK);
}
```

**优点：**
- 快速实现 (~500 行代码)
- 渐进式升级
- 保留现有架构

**缺点：**
- 功能有限 (无高级评分)
- 需要外部向量数据库才能扩展

---

### 方案 C：渐进式升级 (平衡)

分阶段实现，逐步增强记忆能力。

#### Phase 1: SQLite FTS5 (立即)

```bash
# 在现有 SQLite 中添加 FTS5
ALTER TABLE messages ADD COLUMN memory_category TEXT;
ALTER TABLE messages ADD COLUMN memory_importance REAL;
CREATE VIRTUAL TABLE messages_fts USING fts5(...);
```

#### Phase 2: 向量搜索 (1-2 周)

```bash
# 添加 LanceDB
npm install @lancedb/lancedb openai

# 创建独立的向量存储
src/memory/lancedb-store.ts
src/memory/embeddings.ts
```

#### Phase 3: 混合检索 (2-4 周)

```bash
# 实现混合检索管道
src/memory/hybrid-retriever.ts
src/memory/scoring.ts
src/memory/reranker.ts
```

#### Phase 4: 高级功能 (持续)

```bash
# 噪声过滤、自适应检索、Markdown 镜像等
src/memory/noise-filter.ts
src/memory/adaptive-retrieval.ts
src/memory/md-mirror.ts
```

---

## 学术工作流专属功能

考虑到 AcademiClaw 的学术定位，建议添加以下功能：

### 1. 引用追踪

```typescript
// 当存储记忆时，自动提取和记录引用
interface AcademicMemory {
  text: string;
  category: 'fact' | 'decision' | 'citation' | 'concept';
  citations?: Citation[];
  // ...
}

interface Citation {
  type: 'paper' | 'book' | 'url' | 'code';
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
  doi?: string;
}
```

### 2. 知识图谱

```typescript
// 构建概念关联图
interface ConceptNode {
  id: string;
  label: string;
  category: string;
  related: string[];  // 关联概念 ID
}

// 检索时返回相关概念
async function retrieveWithGraph(
  query: string,
  depth: number = 1
): Promise<{ memories: Memory[]; graph: ConceptNode[] }>;
```

### 3. 学术模板

```markdown
## 论文笔记模板

### Title
**Authors**: ...
**Year**: ...
**Venue**: ...

### Key Contributions
- ...

### Research Gap
- ...

### Methodology
- ...

### Results
- ...

### Relevance to My Work
- ...
```

### 4. PDF 提取

```typescript
// 自动从 PDF 中提取关键信息
async function extractPaperMetadata(pdfPath: string): Promise<{
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
}>;
```

### 5. 实验记录

```typescript
// 结构化实验日志
interface ExperimentLog {
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

## 推荐实施路径

### 建议：采用方案 C（渐进式）

**时间线：**

| 阶段 | 时间 | 交付物 | 价值 |
|------|------|--------|------|
| **Phase 1** | 1 周 | SQLite FTS5 全文搜索 | 立即改善关键词搜索 |
| **Phase 2** | 2 周 | 向量嵌入 + 基础语义检索 | 启用语义搜索 |
| **Phase 3** | 3 周 | 混合检索 + 多阶段评分 | 提升检索质量 |
| **Phase 4** | 持续 | 学术专属功能 | 针对学术场景优化 |

**第一步：立即可做**

在 AcademiClaw 中添加基础的 SQLite FTS5 搜索：

```typescript
// src/memory/sqlite-fts.ts
export async function enableFTS(): Promise<void> {
  const db = getDatabase();
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      group_folder,
      content_rowid=rowid
    );

    -- 创建触发器自动同步
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, group_folder)
      VALUES (new.rowid, new.content, new.group_folder);
    END;
  `);
}

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

**第二步：集成到容器**

修改 `container/agent-runner/src/ipc-mcp-stdio.ts` 添加记忆搜索工具：

```typescript
tools: {
  memory_search: {
    description: 'Search memories using full-text search',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 5 }
      }
    },
    handler: async (params) => {
      const groupFolder = process.env.NANOCLAW_GROUP_FOLDER;
      return await searchMemoriesFTS(params.query, groupFolder, params.limit);
    }
  }
}
```

---

## 结论

1. **直接使用 memory-lancedb-pro 不可行**：架构差异太大，OpenClaw 插件无法在 AcademiClaw 中运行。

2. **推荐渐进式升级**：
   - Phase 1: SQLite FTS5 (1 周)
   - Phase 2: 向量搜索 (2 周)
   - Phase 3: 混合检索 (3 周)
   - Phase 4: 学术功能 (持续)

3. **学术工作流专属功能**是 AcademiClaw 的差异化优势，应该重点投入。

---

**下一步行动：**

1. 确认升级方案选择
2. 开始实施 Phase 1 (SQLite FTS5)
3. 设计学术记忆模板
4. 规划向量搜索集成

---

*文档版本: 1.0*
*创建日期: 2025-03-09*
*作者: AcademiClaw 开发团队*
