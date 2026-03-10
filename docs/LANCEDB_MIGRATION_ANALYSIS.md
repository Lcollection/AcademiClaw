# LanceDB 替换 SQLite 可行性分析

## 结论先行

**完全替换：不推荐** | **混合使用：推荐**

---

## SQLite 在 AcademiClaw 中的作用

### 数据表分析

| 表 | 数据量 | 查询类型 | 是否适合 LanceDB |
|----|--------|----------|------------------|
| `messages` | 大 | 时间范围查询、过滤 | **适合** (向量搜索优势) |
| `chats` | 小 | 简单 CRUD | 可用，但 SQLite 更合适 |
| `sessions` | 小 | Key-Value 查询 | 可用，但 SQLite 更合适 |
| `registered_groups` | 小 | 关联查询 | **不适合** (无外键) |
| `scheduled_tasks` | 中 | 复杂条件查询 | **不适合** (无索引) |
| `task_run_logs` | 大 | 关联查询 | **不适合** (无外键) |
| `router_state` | 小 | Key-Value 查询 | 可用 |

### SQLite 关键特性使用

```typescript
// 1. 外键约束
FOREIGN KEY (chat_jid) REFERENCES chats(jid)
FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)

// 2. 复杂查询
SELECT m.* FROM messages m
JOIN messages_fts fts ON m.rowid = fts.rowid
WHERE messages_fts MATCH ? AND m.group_folder = ?
ORDER BY rank LIMIT ?

// 3. 时间范围查询
WHERE timestamp > ? AND chat_jid IN (?, ?, ?)
ORDER BY timestamp

// 4. 事务
db.transaction(() => {
  // 多步操作，原子性保证
})();

// 5. 索引
CREATE INDEX idx_timestamp ON messages(timestamp);
CREATE INDEX idx_next_run ON scheduled_tasks(next_run);
```

---

## LanceDB 能力分析

### LanceDB 擅长的

```typescript
// ✅ 向量搜索
const results = await table.vectorSearch(queryVector)
  .where(`group_folder = 'main'`)
  .limit(10)
  .toArray();

// ✅ 结构化数据存储
await table.add({
  vector: [0.1, 0.2, ...],
  text: "消息内容",
  chat_jid: "xxx@g.us",
  timestamp: "2025-03-09T10:00:00Z",
  metadata: { ... }
});

// ✅ 过滤查询
await table.search()
  .where("timestamp > '2025-03-01'")
  .where("is_bot_message = false")
  .limit(100);
```

### LanceDB 不支持的

```typescript
// ❌ 外键约束 (无参照完整性)
// ❌ JOIN 操作 (无表关联)
// ❌ 事务 (无 ACID 保证)
// ❌ 复杂聚合查询
// ❌ 触发器
// ❌ AUTOINCREMENT
// ❌ UNIQUE 约束 (部分支持)
```

---

## 方案对比

### 方案 A：完全替换到 LanceDB (不推荐)

```
┌─────────────────────────────────────────────────────────────┐
│                    全部使用 LanceDB                          │
├─────────────────────────────────────────────────────────────┤
│  ❌ 失去外键约束 (数据完整性风险)                              │
│  ❌ 失去事务支持 (并发安全风险)                               │
│  ❌ 失去复杂查询能力 (需要应用层实现)                          │
│  ❌ 代码改动量大 (~2000 行)                                   │
│  ✅ 获得向量搜索能力                                          │
│  ✅ 统一存储引擎                                             │
└─────────────────────────────────────────────────────────────┘
```

**问题示例**：

```typescript
// 原来 SQLite (简单)
const results = db.prepare(`
  SELECT m.*, c.name as chat_name
  FROM messages m
  JOIN chats c ON m.chat_jid = c.jid
  WHERE m.timestamp > ? AND c.channel = 'whatsapp'
  ORDER BY m.timestamp
  LIMIT 100
`).all(since);

// LanceDB (需要应用层实现多步查询)
// 1. 先查 messages
const messages = await messagesTable.search()
  .where(`timestamp > '${since}'`)
  .limit(1000)  // 需要获取更多数据
  .toArray();

// 2. 再查 chats
const chatJids = [...new Set(messages.map(m => m.chat_jid))];
const chats = await chatsTable.search()
  .where(`jid IN (${chatJids.map(j => `'${j}'`).join(',')})`)
  .toArray();

// 3. 应用层 JOIN
const chatMap = new Map(chats.map(c => [c.jid, c]));
const results = messages
  .filter(m => chatMap.get(m.chat_jid)?.channel === 'whatsapp')
  .slice(0, 100);
```

### 方案 B：混合使用 (推荐)

```
┌─────────────────────────────────────────────────────────────┐
│              SQLite + LanceDB 混合架构                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   SQLite                          LanceDB                   │
│   ┌─────────────┐                ┌─────────────┐            │
│   │ chats       │                │ messages    │            │
│   │ sessions    │                │ (with       │            │
│   │ registered_ │ ←─────────────→  vectors)    │            │
│   │ groups      │    双写同步     │             │            │
│   │ scheduled_  │                │             │            │
│   │ tasks       │                │             │            │
│   │ task_run_   │                │             │            │
│   │ logs        │                │             │            │
│   │ router_     │                │             │            │
│   │ state       │                │             │            │
│   └─────────────┘                └─────────────┘            │
│         │                                │                   │
│         ▼                                ▼                   │
│   关系型数据                        向量搜索                 │
│   事务/外键                         语义检索                 │
│   现有功能不变                       新增能力                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**数据流**：

```
用户消息
    │
    ├─────────────────┐
    ▼                 ▼
SQLite          LanceDB
(原有逻辑)      (新增)
storeMessage()  embed + store
    │                 │
    └────────┬────────┘
             ▼
        检索时可选:
        - SQLite 精确查询
        - LanceDB 语义搜索
        - 两者融合结果
```

---

## 推荐实现：混合方案

### 架构设计

```
src/
├── db.ts                    # SQLite (保持不变)
└── memory/
    ├── lancedb.ts           # LanceDB 连接管理
    ├── embeddings.ts        # 向量嵌入服务
    ├── message-sync.ts      # SQLite → LanceDB 同步
    └── retriever.ts         # 混合检索
```

### 核心代码

**1. LanceDB 连接 (`src/memory/lancedb.ts`)**

```typescript
import * as lancedb from '@lancedb/lancedb';
import openai from 'openai';

export interface MessageWithVector {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: boolean;
  is_bot_message: boolean;
  vector?: number[];
  group_folder?: string;
}

export class LanceDBMemoryStore {
  private db: lancedb.Connection;
  private table: lancedb.Table<MessageWithVector>;
  private embeddingClient: openai.OpenAI;

  async init(dbPath: string = 'data/memory/lancedb') {
    this.db = await lancedb.connect(dbPath);
    this.embeddingClient = new openai({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 创建 messages 表 (带向量)
    this.table = await this.db.createTable({
      name: 'messages',
      schema: [
        { name: 'id', type: 'string' },
        { name: 'chat_jid', type: 'string' },
        { name: 'sender', type: 'string' },
        { name: 'sender_name', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'timestamp', type: 'string' },
        { name: 'is_from_me', type: 'boolean' },
        { name: 'is_bot_message', type: 'boolean' },
        { name: 'group_folder', type: 'string' },
        { name: 'vector', type: 'vector', dims: 1536 }, // OpenAI embedding dimension
      ],
    });
  }

  private async embedText(text: string): Promise<number[]> {
    const response = await this.embeddingClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async addMessage(message: MessageWithVector): Promise<void> {
    if (!message.vector) {
      message.vector = await this.embedText(message.content);
    }
    await this.table.add([message]);
  }

  async semanticSearch(
    query: string,
    groupFolder?: string,
    limit: number = 10
  ): Promise<MessageWithVector[]> {
    const queryVector = await this.embedText(query);

    let search = this.table.vectorSearch(queryVector).limit(limit);

    if (groupFolder) {
      search = search.where(`group_folder = '${groupFolder}'`);
    }

    return await search.toArray();
  }
}
```

**2. 消息同步 (`src/memory/message-sync.ts`)**

```typescript
import { getDatabase, storeMessage as storeMessageSqlite } from '../db.js';
import { LanceDBMemoryStore } from './lancedb.js';

let lancedbStore: LanceDBMemoryStore | null = null;

export async function initMemorySync() {
  lancedbStore = new LanceDBMemoryStore();
  await lancedbStore.init();
}

/**
 * 双写：同时写入 SQLite 和 LanceDB
 */
export async function storeMessage(
  message: import('../types.js').NewMessage,
  groupFolder: string
): Promise<void> {
  const db = getDatabase();

  // 1. 写入 SQLite (原有逻辑)
  storeMessageSqlite(message);

  // 2. 写入 LanceDB (新增)
  if (lancedbStore) {
    await lancedbStore.addMessage({
      ...message,
      group_folder: groupFolder,
    });
  }
}

/**
 * 迁移历史消息到 LanceDB
 */
export async function migrateHistoricalMessages(groupFolder?: string) {
  const db = getDatabase();
  const lancedb = new LanceDBMemoryStore();
  await lancedb.init();

  let sql = 'SELECT * FROM messages';
  const params: any[] = [];

  if (groupFolder) {
    // 需要通过 registered_groups 关联查询
    sql += ` m
      JOIN registered_groups g ON m.chat_jid = g.jid
      WHERE g.folder = ?`;
    params.push(groupFolder);
  }

  const messages = db.prepare(sql).all(...params);

  let processed = 0;
  for (const message of messages) {
    await lancedb.addMessage({
      ...message,
      group_folder: groupFolder || 'main',
    });
    processed++;

    if (processed % 100 === 0) {
      console.log(`Migrated ${processed} messages...`);
    }
  }

  console.log(`Migration complete: ${processed} messages`);
}
```

**3. 混合检索 (`src/memory/retriever.ts`)**

```typescript
import { getDatabase } from '../db.js';
import { LanceDBMemoryStore } from './lancedb.js';

export interface MemoryResult {
  id: string;
  content: string;
  timestamp: string;
  score: number;
  source: 'sqlite' | 'lancedb' | 'hybrid';
}

export class HybridRetriever {
  constructor(private lancedb: LanceDBMemoryStore) {}

  /**
   * 精确查询 (SQLite)
   */
  async searchExact(
    chatJid: string,
    sinceTimestamp: string,
    limit: number = 100
  ): Promise<MemoryResult[]> {
    const db = getDatabase();
    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE chat_jid = ? AND timestamp > ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(chatJid, sinceTimestamp, limit);

    return messages.map((m: any) => ({
      id: m.id,
      content: m.content,
      timestamp: m.timestamp,
      score: 1.0,
      source: 'sqlite' as const,
    }));
  }

  /**
   * 语义搜索 (LanceDB)
   */
  async searchSemantic(
    query: string,
    groupFolder: string,
    limit: number = 10
  ): Promise<MemoryResult[]> {
    const results = await this.lancedb.semanticSearch(
      query,
      groupFolder,
      limit
    );

    return results.map((m: any) => ({
      id: m.id,
      content: m.content,
      timestamp: m.timestamp,
      score: m._distance ? 1 - m._distance : 0.5, // 转换距离为相似度
      source: 'lancedb' as const,
    }));
  }

  /**
   * 关键词搜索 (SQLite FTS5 - 可选)
   */
  async searchKeywords(
    query: string,
    groupFolder: string,
    limit: number = 10
  ): Promise<MemoryResult[]> {
    const db = getDatabase();

    // 首先检查 FTS 表是否存在
    const ftsExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='messages_fts'
    `).get();

    if (!ftsExists) {
      return []; // FTS 未启用
    }

    const results = db.prepare(`
      SELECT m.* FROM messages m
      JOIN messages_fts fts ON m.rowid = fts.rowid
      JOIN registered_groups g ON m.chat_jid = g.jid
      WHERE messages_fts MATCH ? AND g.folder = ?
      ORDER BY rank
      LIMIT ?
    `).all(query, groupFolder, limit);

    return results.map((m: any) => ({
      id: m.id,
      content: m.content,
      timestamp: m.timestamp,
      score: 1.0,
      source: 'sqlite' as const,
    }));
  }
}
```

### 集成到现有代码

**修改 `src/index.ts`**:

```typescript
import { initMemorySync, storeMessage as storeMessageMemory } from './memory/message-sync.js';

// 启动时初始化
await initMemorySync();

// 消息处理时使用双写
const missedMessages = getMessagesSince(chatJid, sinceTimestamp, ASSISTANT_NAME);
for (const msg of missedMessages) {
  await storeMessageMemory(msg, group.folder);  // 双写 SQLite + LanceDB
}
```

---

## 实施步骤

### 第一步：安装依赖

```bash
npm install @lancedb/lancedb openai
```

### 第二步：创建记忆模块

```bash
mkdir -p src/memory
touch src/memory/lancedb.ts
touch src/memory/message-sync.ts
touch src/memory/retriever.ts
```

### 第三步：配置环境变量

```bash
# .env
OPENAI_API_KEY=sk-xxx
MEMORY_LANCEDB_PATH=data/memory/lancedb
```

### 第四步：迁移历史数据 (可选)

```typescript
// 运行一次性迁移脚本
import { migrateHistoricalMessages } from './memory/message-sync.js';

await migrateHistoricalMessages('main');  // 迁移主群组
// 或 await migrateHistoricalMessages();  // 迁移全部
```

---

## 总结

| 方案 | 工作量 | 风险 | 收益 |
|------|--------|------|------|
| **完全替换** | 高 (~2000 行) | 高 (失去事务/外键) | 统一架构 |
| **混合使用** | 中 (~500 行) | 低 (保留现有功能) | 向量搜索 + 保持稳定 |

### 推荐：混合方案

**理由**：
1. **保留 SQLite 的优势**：事务、外键、复杂查询、现有代码稳定
2. **获得 LanceDB 的优势**：向量搜索、语义检索
3. **渐进式升级**：可以逐步迁移，风险可控
4. **代码改动小**：主要是新增模块，修改点少

**核心原则**：
- SQLite 作为"源数据库"（Source of Truth）
- LanceDB 作为"搜索索引"（Search Index）
- 写入时双写，查询时可选

---

*文档版本: 1.0*
*创建日期: 2025-03-09*
