# AcademiClaw Memory System

## 概述

AcademiClaw 记忆系统是一个混合架构，结合 SQLite 和 LanceDB，提供语义搜索能力。

- **SQLite**: 作为唯一真实来源，存储所有消息
- **LanceDB**: 作为语义搜索索引，存储向量嵌入

## 架构图

```
用户消息
    │
    ├─────────────────┐
    ▼                 ▼
SQLite          LanceDB
(源数据库)      (语义搜索索引)
    │                 │
    └────────┬────────┘
             ▼
       混合检索器
             │
             ▼
         容器 Agent
```

## 关键特性

1. **SQLite 优先**: 所有写入先经过 SQLite，确保数据完整性
2. **优雅降级**: LanceDB 失败时，系统仅使用 SQLite 继续运行
3. **群组隔离**: 每个群组有独立的 LanceDB 实例
4. **向后兼容**: 可选启用，不影响现有功能

## 文件结构

```
src/memory/
├── config.ts           # 配置管理
├── embeddings.ts       # 嵌入服务 (OpenAI 兼容 API)
├── embeddings-mock.ts  # Mock 嵌入 (测试用)
├── lancedb.ts          # LanceDB 连接和向量存储
├── sync.ts             # 双写同步包装器
├── retriever.ts        # 混合检索引擎
└── index.ts            # 模块入口点
```

## 配置选项

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `MEMORY_ENABLED` | false | 启用语义搜索 |
| `EMBEDDING_API_KEY` | - | 嵌入 API 密钥 |
| `EMBEDDING_BASE_URL` | - | API 基础 URL |
| `EMBEDDING_MODEL` | - | 模型名称 |
| `MEMORY_MAX_RESULTS` | 20 | 最大结果数 |
| `MEMORY_MIN_SCORE` | 0.7 | 最小相似度 (0-1) |
| `MEMORY_BATCH_SIZE` | 32 | 批处理大小 |

## 支持的嵌入提供商

| 提供商 | 维度 | 免费额度 |
|-------|-----|---------|
| Jina AI | 1024 | 100万/月 |
| OpenAI | 1536 | 按量付费 |
| Mock | 可配置 | 无限 (测试) |

## 数据存储

### SQLite
- 路径: `store/messages.db`
- 表: `messages`, `chats`, `sessions`

### LanceDB
- 路径: `data/memory/{group_folder}/lancedb`
- 表: `messages` (包含向量列)

## 测试

```bash
# 单元测试
npm test

# 集成测试
npx tsx scripts/test-memory-integration.ts

# E2E 测试 (使用 Mock 嵌入)
MEMORY_ENABLED=true MEMORY_USE_MOCK_EMBEDDINGS=true npx tsx scripts/test-memory-e2e.ts

# Jina AI 测试 (需要 API 密钥)
JINA_API_KEY=your-key npx tsx scripts/test-jina-memory.ts
```

## 性能指标

10 万条消息的估计资源开销:

| 资源 | 开销 |
|------|-----|
| 存储 (LanceDB) | +674 MB |
| 内存 | +13 MB |
| CPU | 10-20% (查询时) |

## 安全考虑

1. **API 密钥**: 存储在 `.env` 文件中，不被 Git 跟踪
2. **群组隔离**: 每个群组的数据完全隔离
3. **优雅降级**: API 失败不影响主功能
4. **本地存储**: 所有数据存储在本地

## 故障排除

### LanceDB 初始化失败
- 检查 `data/memory/` 目录权限
- 确保磁盘空间充足

### 嵌入 API 失败
- 检查 API 密钥是否正确
- 检查网络连接
- 使用 Mock 模式测试

### 搜索结果为空
- 降低 `MEMORY_MIN_SCORE` 阈值
- 增加 `MEMORY_MAX_RESULTS`
- 检查是否有足够的数据

## 未来改进

- [ ] 历史数据迁移脚本
- [ ] MCP 工具集成
- [ ] 本地嵌入模型支持 (Ollama)
- [ ] 多语言嵌入支持
