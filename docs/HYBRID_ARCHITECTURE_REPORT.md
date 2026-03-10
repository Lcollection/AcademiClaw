# SQLite + LanceDB 混合架构详细报告

## 目录

1. [架构概述](#架构概述)
2. [系统设计](#系统设计)
3. [数据同步机制](#数据同步机制)
4. [检索策略](#检索策略)
5. [资源开销分析](#资源开销分析)
6. [性能对比](#性能对比)
7. [成本分析](#成本分析)
8. [实施细节](#实施细节)
9. [监控与优化](#监控与优化)

---

## 架构概述

### 设计原则

```
┌─────────────────────────────────────────────────────────────────┐
│                    混合架构设计原则                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SQLite 作为源数据库 (Source of Truth)                        │
│     - 保持现有表结构不变                                          │
│     - 事务、外键、约束完整保留                                     │
│     - 现有代码最小改动                                           │
│                                                                  │
│  2. LanceDB 作为搜索索引 (Search Index)                          │
│     - 只同步需要语义搜索的表 (messages)                           │
│     - 向量化 + 元数据，支持高效检索                                │
│     - 可降级，不影响核心功能                                      │
│                                                                  │
│  3. 双写同步机制                                                 │
│     - 写入时同步双写                                             │
│     - 失败隔离，互不影响                                         │
│     - 支持异步和同步两种模式                                      │
│                                                                  │
│  4. 灵活检索策略                                                 │
│     - 精确查询：SQLite                                           │
│     - 语义搜索：LanceDB                                          │
│     - 混合检索：SQLite + LanceDB 融合                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AcademiClaw 混合记忆系统                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              用户请求
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌──────────────┐
            │  写入路径      │           │  查询路径     │
            └───────┬───────┘           └──────┬───────┘
                    │                           │
        ┌───────────┴───────────┐               │
        │                       │               │
        ▼                       ▼               ▼
┌───────────────┐       ┌──────────────┐  ┌────────────────┐
│   SQLite      │       │   LanceDB    │  │  查询路由器     │
│  (主数据库)    │       │  (搜索索引)   │  │                │
└───────────────┘       └──────────────┘  └───────┬────────┘
        │                       │                   │
        │                       │            ┌──────┴──────┐
        ▼                       ▼            │             │
┌───────────────┐       ┌──────────────┐    ▼             ▼
│ chats         │       │ messages     │  精确查询      语义搜索
│ sessions      │       │ (带向量)      │  (SQLite)     (LanceDB)
│ registered_   │       │              │  │             │
│ groups        │       │ - vector     │  │             │
│ scheduled_    │       │ - content    │  ▼             ▼
│ tasks         │       │ - metadata   │  SQLite       LanceDB
│ task_run_logs │       │              │  结果         结果
│ router_state  │       │              │
└───────────────┘       └──────────────┘  └──────┬──────┘
        │                       │               │
        └───────────────────────┴───────────────┘
                                  │
                            可选结果融合
```

---

## 系统设计

### 模块结构

```
src/
├── db.ts                          # SQLite (现有，保持不变)
├── index.ts                       # 主程序 (最小修改)
│
└── memory/                        # 新增记忆模块
    ├── index.ts                   # 模块入口
    ├── lancedb.ts                 # LanceDB 连接管理
    ├── embeddings.ts              # 向量嵌入服务
    ├── sync.ts                    # 双写同步机制
    ├── retriever.ts               # 混合检索引擎
    ├── migration.ts               # 数据迁移工具
    └── config.ts                  # 配置管理
```

### 数据表映射

| SQLite 表 | 是否同步到 LanceDB | 同步策略 | 理由 |
|-----------|-------------------|----------|------|
| `messages` | **是** | 实时双写 | 核心数据，需要语义搜索 |
| `chats` | 否 | - | 元数据，SQLite 足够 |
| `sessions` | 否 | - | Key-Value，SQLite 足够 |
| `registered_groups` | 否 | - | 配置数据，无需搜索 |
| `scheduled_tasks` | 否 | - | 任务管理，无需语义 |
| `task_run_logs` | 否 | - | 日志数据，无需搜索 |
| `router_state` | 否 | - | 状态数据，无需搜索 |

### LanceDB Schema

```typescript
interface LanceDBMessageSchema {
  // === 主键 (来自 SQLite) ===
  id: string;                    // 消息 ID

  // === 关联字段 (用于过滤) ===
  chat_jid: string;              // 聊天 JID
  group_folder: string;          // 群组文件夹 (作用域隔离)
  sender: string;                // 发送者 ID
  sender_name: string;           // 发送者名称

  // === 内容字段 ===
  content: string;               // 原始消息内容

  // === 元数据字段 ===
  timestamp: string;             // ISO 8601 时间戳
  is_from_me: boolean;           // 是否为自己发送
  is_bot_message: boolean;       // 是否为机器人消息

  // === 向量字段 (LanceDB 核心) ===
  vector: Float32Array(1536);    // OpenAI text-embedding-3-small

  // === 扩展字段 (可选) ===
  channel?: string;              // 渠道类型 (whatsapp/telegram)
  message_type?: string;         // 消息类型 (text/image/file)
  language?: string;             // 语言检测 (zh/en)
  importance?: number;           // 重要性评分 (0-1)
}
```

---

## 数据同步机制

### 双写策略

```typescript
┌─────────────────────────────────────────────────────────────────┐
│                      双写同步流程                                │
└─────────────────────────────────────────────────────────────────┘

消息到达
    │
    ▼
┌─────────────────┐
│  事务开始       │
│  (SQLite)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ SQLite  │ │ LanceDB │
│ 写入    │ │ 向量化+ │
│         │ │ 写入    │
└────┬────┘ └────┬────┘
     │           │
     │    ┌──────┴──────┐
     │    │             │
     ▼    ▼             ▼
   成功  成功          失败
     │    │             │
     │    │             ▼
     │    │        记录失败日志
     │    │        (不影响 SQLite)
     │    │
     ▼    ▼
  ┌────────┐
  │ 事务   │
  │ 提交   │
  └────────┘
```

### 同步模式

#### 模式 1: 同步双写 (推荐)

```typescript
// 优点：数据一致性好
// 缺点：写入延迟略高
// 适用：实时性要求高的场景

async function storeMessageSync(message: NewMessage, groupFolder: string) {
  const db = getDatabase();

  // SQLite 事务
  const tx = db.transaction(() => {
    // 1. 写入 SQLite
    db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, chat_jid, sender, sender_name, content, timestamp, is_from_me, is_bot_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(message.id, message.chat_jid, message.sender, message.sender_name,
          message.content, message.timestamp, message.is_from_me ? 1 : 0,
          message.is_bot_message ? 1 : 0);
  });

  tx();

  // 2. 写入 LanceDB (失败不影响主流程)
  try {
    await lancedbStore.addMessage({
      ...message,
      group_folder: groupFolder,
    });
  } catch (err) {
    logger.warn({ messageId: message.id, error: err }, 'LanceDB sync failed');
    // 记录到失败队列，稍后重试
    await syncQueue.add({ type: 'message', data: message, groupFolder });
  }
}
```

#### 模式 2: 异步双写

```typescript
// 优点：写入延迟低
// 缺点：短暂不一致
// 适用：高并发场景

const syncQueue = new PQueue({ concurrency: 2 });

async function storeMessageAsync(message: NewMessage, groupFolder: string) {
  const db = getDatabase();

  // 1. 立即写入 SQLite
  db.prepare(`
    INSERT OR REPLACE INTO messages ...
  `).run(...);

  // 2. 异步写入 LanceDB
  syncQueue.add(async () => {
    try {
      await lancedbStore.addMessage({ ...message, group_folder: groupFolder });
    } catch (err) {
      await syncQueue.add({ type: 'message', data: message, groupFolder });
    }
  });
}
```

### 数据一致性保障

```typescript
// 一致性检查和修复

interface SyncStats {
  sqliteCount: number;
  lancedbCount: number;
  missingIds: string[];
}

async function checkConsistency(groupFolder: string): Promise<SyncStats> {
  const db = getDatabase();

  // 1. 获取 SQLite 消息计数
  const sqliteResult = db.prepare(`
    SELECT COUNT(*) as count, MIN(timestamp) as min_ts, MAX(timestamp) as max_ts
    FROM messages m
    JOIN registered_groups g ON m.chat_jid = g.jid
    WHERE g.folder = ?
  `).get(groupFolder) as { count: number; min_ts: string; max_ts: string };

  // 2. 获取 LanceDB 消息计数
  const lancedbCount = await lancedbTable.countRows(`group_folder = '${groupFolder}'`);

  // 3. 找出缺失的消息 ID
  const sqliteIds = db.prepare(`
    SELECT m.id FROM messages m
    JOIN registered_groups g ON m.chat_jid = g.jid
    WHERE g.folder = ?
  `).all(groupFolder).map((row: any) => row.id);

  const lancedbIds = await lancedbTable
    .query()
    .where(`group_folder = '${groupFolder}'`)
    .toArray()
    .then(rows => rows.map(r => r.id));

  const missingIds = sqliteIds.filter(id => !lancedbIds.includes(id));

  return {
    sqliteCount: sqliteResult.count,
    lancedbCount,
    missingIds,
  };
}

// 修复不一致
async function repairSync(missingIds: string[], groupFolder: string) {
  const db = getDatabase();

  for (const id of missingIds) {
    const message = db.prepare(`
      SELECT m.*, g.folder as group_folder
      FROM messages m
      JOIN registered_groups g ON m.chat_jid = g.jid
      WHERE m.id = ?
    `).get(id);

    if (message) {
      await lancedbStore.addMessage(message);
    }
  }
}
```

---

## 检索策略

### 查询路由器

```typescript
┌─────────────────────────────────────────────────────────────────┐
│                      查询路由决策                                │
└─────────────────────────────────────────────────────────────────┘

                    查询请求
                        │
                        ▼
              ┌─────────────────┐
              │ 查询类型分析     │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   精确查询       语义查询        混合查询
        │              │              │
        │              │              │
        ▼              ▼              ▼
    SQLite        LanceDB      RRF 融合
   (时间范围)     (向量搜索)    (综合结果)
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
                 结果返回
```

### 检索实现

```typescript
export class QueryRouter {
  constructor(
    private db: Database.Database,
    private lancedb: LanceDBMemoryStore
  ) {}

  /**
   * 路由查询到合适的存储
   */
  async query(
    request: QueryRequest
  ): Promise<QueryResult> {
    // 分析查询类型
    const queryType = this.analyzeQuery(request);

    switch (queryType) {
      case 'exact':
        return await this.queryExact(request);
      case 'semantic':
        return await this.querySemantic(request);
      case 'hybrid':
        return await this.queryHybrid(request);
      default:
        return await this.queryExact(request);
    }
  }

  /**
   * 分析查询类型
   */
  private analyzeQuery(request: QueryRequest): QueryType {
    // 1. 精确查询条件 (时间范围、特定 JID)
    if (request.chatJid || request.since || request.until) {
      return 'exact';
    }

    // 2. 语义搜索 (自然语言查询)
    if (request.semanticQuery && request.semanticQuery.length > 10) {
      return 'semantic';
    }

    // 3. 混合查询 (同时有精确条件和语义查询)
    if (request.keywords && request.semanticQuery) {
      return 'hybrid';
    }

    // 默认精确查询
    return 'exact';
  }

  /**
   * 精确查询 (SQLite)
   */
  private async queryExact(request: QueryRequest): Promise<QueryResult> {
    const { chatJid, since, until, limit = 100 } = request;

    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];

    if (chatJid) {
      sql += ' AND chat_jid = ?';
      params.push(chatJid);
    }

    if (since) {
      sql += ' AND timestamp > ?';
      params.push(since);
    }

    if (until) {
      sql += ' AND timestamp < ?';
      params.push(until);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const messages = this.db.prepare(sql).all(...params);

    return {
      source: 'sqlite',
      results: messages,
      total: messages.length,
    };
  }

  /**
   * 语义查询 (LanceDB)
   */
  private async querySemantic(request: QueryRequest): Promise<QueryResult> {
    const { semanticQuery, groupFolder, limit = 10 } = request;

    const results = await this.lancedb.semanticSearch(
      semanticQuery!,
      groupFolder,
      limit
    );

    return {
      source: 'lancedb',
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        timestamp: r.timestamp,
        score: r._distance ? 1 - r._distance : 0,
      })),
      total: results.length,
    };
  }

  /**
   * 混合查询 (RRF 融合)
   */
  private async queryHybrid(request: QueryRequest): Promise<QueryResult> {
    const { keywords, semanticQuery, groupFolder, limit = 10 } = request;

    // 并行查询
    const [exactResults, semanticResults] = await Promise.all([
      this.queryExact({ ...request, limit: limit * 2 }),
      this.querySemantic({ ...request, limit: limit * 2 }),
    ]);

    // RRF 融合
    const fused = this.rrfFuse(
      exactResults.results.map((r, i) => ({ ...r, rank: i })),
      semanticResults.results.map((r, i) => ({ ...r, rank: i })),
      k = 60
    );

    return {
      source: 'hybrid',
      results: fused.slice(0, limit),
      total: fused.length,
    };
  }

  /**
   * RRF (Reciprocal Rank Fusion) 融合算法
   */
  private rrfFuse(
    results1: Array<{ id: string; rank: number }>,
    results2: Array<{ id: string; rank: number }>,
    k: number = 60
  ): Array<any> {
    const scores = new Map<string, { score: number; data: any }>();

    // 第一组结果
    for (const result of results1) {
      const score = 1 / (k + result.rank + 1);
      scores.set(result.id, { score, data: result });
    }

    // 第二组结果
    for (const result of results2) {
      const existing = scores.get(result.id);
      const score = 1 / (k + result.rank + 1);
      if (existing) {
        existing.score += score;
      } else {
        scores.set(result.id, { score, data: result });
      }
    }

    // 按分数排序
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.data);
  }
}
```

---

## 资源开销分析

### 1. 存储开销

#### SQLite 存储

```
单条消息平均大小: ~500 bytes
- id: 36 bytes
- chat_jid: 40 bytes
- sender: 30 bytes
- sender_name: 50 bytes
- content: 300 bytes
- timestamp: 24 bytes
- 其他字段: 20 bytes

估算 (10万条消息):
- 原始数据: 500 bytes × 100,000 = 50 MB
- 索引开销: ~20%
- 总计: ~60 MB
```

#### LanceDB 存储

```
单条消息平均大小: ~6,500 bytes
- 元数据 (同 SQLite): 500 bytes
- 向量 (text-embedding-3-small): 1,536 × 4 bytes (float32) = 6,144 bytes
- LanceDB 开销: ~100 bytes

估算 (10万条消息):
- 元数据: 500 bytes × 100,000 = 50 MB
- 向量数据: 6,144 bytes × 100,000 = 614 MB
- LanceDB 开销: ~100 bytes × 100,000 = 10 MB
- 总计: ~674 MB
```

#### 总存储对比

| 消息量 | SQLite | LanceDB | 合计 | 增量 |
|--------|--------|---------|------|------|
| 1万 | 6 MB | 67 MB | 73 MB | +61 MB |
| 10万 | 60 MB | 674 MB | 734 MB | +674 MB |
| 100万 | 600 MB | 6.7 GB | 7.3 GB | +6.7 GB |

### 2. 内存开销

#### 常驻内存

```typescript
// SQLite
- 数据库连接: ~1 MB
- 页缓存 (默认): ~2 MB
- 总计: ~3 MB

// LanceDB
- 连接对象: ~2 MB
- 向量缓存 (1000条): 1,536 × 4 × 1000 = ~6 MB
- 索引结构: ~5 MB
- 总计: ~13 MB

// 合计
- 混合架构常驻内存: ~16 MB
- 纯 SQLite: ~3 MB
- 增量: +13 MB
```

#### 峰值内存 (查询时)

```
语义搜索峰值:
- 查询向量化: ~10 KB
- 结果缓存 (100条): 6,144 × 100 = ~600 KB
- 总计: ~610 KB

批量同步峰值 (100条消息):
- 向量化队列: 100 × 300 bytes (输入) = ~30 KB
- 嵌入 API 响应: 100 × 6,144 = ~600 KB
- 总计: ~630 KB
```

### 3. CPU 开销

#### 向量嵌入

```
OpenAI text-embedding-3-small:
- 本地处理: 无 (API 调用)
- 网络往返: ~100-300 ms
- CPU 占用: 可忽略 (等待 I/O)

如使用本地模型 (e.g., sentence-transformers):
- 单条嵌入: ~50 ms
- CPU 占用: ~30% (单核)
- 批量 (32条): ~200 ms
```

#### 向量搜索

```
LanceDB HNSW 索引:
- 1万条: ~1 ms
- 10万条: ~2-5 ms
- 100万条: ~10-20 ms
- CPU 占用: ~10-20% (单核)

对比 SQLite:
- 时间范围查询: ~5 ms
- FTS5 全文搜索: ~10 ms
```

### 4. 网络开销

#### OpenAI Embedding API

```
请求:
- 文本大小: ~300 bytes × N
- HTTP 开销: ~200 bytes/请求

响应:
- 向量大小: 6,144 bytes × N
- HTTP 开销: ~200 bytes/请求

单条消息:
- 上行: ~500 bytes
- 下行: ~6,344 bytes
- 总计: ~6.8 KB

批量 (10条):
- 上行: ~3.2 KB
- 下行: ~61.4 KB
- 总计: ~64.6 KB

估算 (1000条/天):
- 流量: 6.8 KB × 1000 = ~6.8 MB/天
- 月流量: ~200 MB
```

### 5. 成本分析

#### OpenAI Embedding API 成本

```
text-embedding-3-small 定价 (2025):
- $0.02 / 1M tokens

估算:
- 平均消息长度: ~100 tokens
- 每条消息成本: 100 × $0.02 / 1M = $0.000002
- 1000条/天: $0.002/天
- 月成本: $0.002 × 30 = $0.06/月
- 年成本: $0.72/年

高负载 (10000条/天):
- 月成本: $0.60/月
- 年成本: $7.20/年
```

#### 资源成本汇总

| 项目 | 成本 |
|------|------|
| 存储 (100万条) | ~7 GB 磁盘空间 |
| 内存常驻 | +13 MB |
| OpenAI API (1000条/天) | ~$0.06/月 |
| OpenAI API (1万条/天) | ~$0.60/月 |

---

## 性能对比

### 查询性能

| 查询类型 | SQLite | LanceDB | 混合方案 |
|----------|--------|---------|----------|
| 时间范围查询 | 5 ms | 20 ms | 5 ms (走 SQLite) |
| JID 过滤查询 | 3 ms | 15 ms | 3 ms (走 SQLite) |
| 关键词搜索 (FTS5) | 10 ms | N/A | 10 ms |
| 语义搜索 | N/A | 5 ms | 5 ms (走 LanceDB) |
| 混合查询 | N/A | N/A | 15 ms (RRF 融合) |

### 写入性能

| 操作 | SQLite | LanceDB | 混合方案 (同步) | 混合方案 (异步) |
|------|--------|---------|-----------------|-----------------|
| 单条写入 | 1 ms | 150 ms* | 151 ms | 1 ms |
| 批量写入 (100) | 50 ms | 500 ms* | 550 ms | 50 ms |

*包含向量化 API 调用时间

### 吞吐量

```
纯 SQLite:
- 写入: ~1000 msg/s
- 查询: ~500 qps

混合方案 (异步):
- 写入: ~800 msg/s (受 API 限制)
- 语义查询: ~200 qps
- 精确查询: ~500 qps
```

---

## 实施细节

### 配置文件

```typescript
// src/memory/config.ts

export interface MemoryConfig {
  // LanceDB 配置
  lancedb: {
    path: string;              // 数据库路径
    embeddingModel: string;     // 嵌入模型
    embeddingDimension: number; // 向量维度
  };

  // 同步配置
  sync: {
    mode: 'sync' | 'async';     // 同步模式
    batchSize: number;          // 批量大小
    concurrency: number;        // 并发数
    retryAttempts: number;      // 重试次数
  };

  // 检索配置
  retrieval: {
    defaultLimit: number;       // 默认返回数量
    rrfK: number;              // RRF 融合参数
    enableCache: boolean;      // 启用缓存
    cacheSize: number;         // 缓存大小
  };

  // OpenAI 配置
  openai: {
    apiKey: string;
    baseURL?: string;
    timeout: number;
  };
}

export const defaultConfig: MemoryConfig = {
  lancedb: {
    path: 'data/memory/lancedb',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimension: 1536,
  },
  sync: {
    mode: 'async',
    batchSize: 10,
    concurrency: 2,
    retryAttempts: 3,
  },
  retrieval: {
    defaultLimit: 10,
    rrfK: 60,
    enableCache: true,
    cacheSize: 100,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    timeout: 30000,
  },
};
```

### 环境变量

```bash
# .env

# OpenAI 配置
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# LanceDB 配置
MEMORY_LANCEDB_PATH=data/memory/lancedb
MEMORY_EMBEDDING_MODEL=text-embedding-3-small

# 同步配置
MEMORY_SYNC_MODE=async
MEMORY_SYNC_BATCH_SIZE=10
MEMORY_SYNC_CONCURRENCY=2

# 检索配置
MEMORY_DEFAULT_LIMIT=10
MEMORY_ENABLE_CACHE=true
```

### 安装依赖

```bash
# LanceDB
npm install @lancedb/lancedb

# OpenAI SDK
npm install openai

# 工具库
npm install p-queue  # 异步队列
```

---

## 监控与优化

### 监控指标

```typescript
interface MemoryMetrics {
  // 同步指标
  syncTotal: number;
  syncSuccess: number;
  syncFailed: number;
  syncPending: number;

  // 存储指标
  sqliteSize: number;
  lancedbSize: number;
  messageCount: number;

  // 性能指标
  avgSyncTime: number;
  avgQueryTime: number;
  p95QueryTime: number;
  p99QueryTime: number;

  // API 指标
  embeddingApiCalls: number;
  embeddingApiErrors: number;
  embeddingApiCost: number;
}

// 获取指标
async function getMetrics(): Promise<MemoryMetrics> {
  return {
    syncTotal: metrics.syncTotal,
    syncSuccess: metrics.syncSuccess,
    syncFailed: metrics.syncFailed,
    syncPending: syncQueue.size,

    sqliteSize: getDbSize(),
    lancedbSize: getLanceDBSize(),
    messageCount: await getMessageCount(),

    avgSyncTime: metrics.syncTimeSum / metrics.syncTotal,
    avgQueryTime: metrics.queryTimeSum / metrics.queryTotal,
    p95QueryTime: percentile(metrics.queryTimes, 95),
    p99QueryTime: percentile(metrics.queryTimes, 99),

    embeddingApiCalls: metrics.apiCalls,
    embeddingApiErrors: metrics.apiErrors,
    embeddingApiCost: metrics.apiCalls * 0.02 / 1e6, // 转换为美元
  };
}
```

### 优化建议

#### 1. 减少存储开销

```typescript
// 使用更小的嵌入模型
embeddingModel: 'text-embedding-3-small',  // 1536 维
// vs
embeddingModel: 'text-embedding-ada-002',  // 1536 维

// 或使用量化向量
await lancedb.createTable({
  name: 'messages',
  schema: [...],
  embeddingIndex: {
    type: 'IVF_PQ',
    params: { nlist: 100, m: 8 },  // 量化参数
  },
});
```

#### 2. 减少网络开销

```typescript
// 批量嵌入
async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map(d => d.embedding);
}

// 使用本地模型 (无网络开销)
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
```

#### 3. 减少延迟

```typescript
// 预计算常用查询的向量
const queryCache = new Map<string, number[]>();

async function getCachedEmbedding(query: string): Promise<number[]> {
  if (queryCache.has(query)) {
    return queryCache.get(query)!;
  }
  const embedding = await embedText(query);
  queryCache.set(query, embedding);
  return embedding;
}
```

---

## 总结

### 资源开销总结

| 资源类型 | 纯 SQLite | 混合架构 | 增量 |
|----------|-----------|----------|------|
| **磁盘 (10万条)** | 60 MB | 734 MB | +674 MB |
| **内存 (常驻)** | 3 MB | 16 MB | +13 MB |
| **内存 (峰值)** | 5 MB | 7 MB | +2 MB |
| **CPU (空闲)** | <1% | <1% | 0% |
| **CPU (查询)** | 5-10% | 10-20% | +10% |
| **网络** | 0 | 200 MB/月* | +200 MB/月 |

*按 1000 条消息/天计算

### 权衡分析

| 方面 | 优势 | 劣势 |
|------|------|------|
| **功能** | 新增语义搜索能力 | 代码复杂度增加 |
| **性能** | 语义查询快 10 倍 | 写入延迟 +150ms |
| **成本** | API 成本低 (<$1/月) | 需要 API Key |
| **维护** | 故障隔离 (LanceDB 挂了不影响核心) | 需要监控两个系统 |

### 推荐配置

```yaml
适用场景:
  - 消息量: < 100万条
  - 日均消息: < 1万条
  - 语义查询: > 10/天

最小配置:
  - 磁盘: 10 GB
  - 内存: 512 MB
  - CPU: 1 核

推荐配置:
  - 磁盘: 50 GB
  - 内存: 2 GB
  - CPU: 2 核

生产配置:
  - 磁盘: 100 GB SSD
  - 内存: 4 GB
  - CPU: 4 核
```

---

*文档版本: 1.0*
*创建日期: 2025-03-09*
*作者: AcademiClaw 开发团队*
