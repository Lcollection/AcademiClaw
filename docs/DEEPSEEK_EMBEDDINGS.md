# DeepSeek 嵌入 API 说明

## 重要提示

**DeepSeek 目前不提供嵌入 (Embeddings) API**，仅支持聊天 (Chat Completions) 模型。

测试结果：
- ✓ 聊天 API (`/v1/chat/completions`) 正常工作
- ✗ 嵌入 API (`/embeddings`) 返回 404

## 解决方案

### 方案 1: 使用本地嵌入模型（推荐）

使用 `transformers.js` 在本地运行嵌入模型，无需外部 API：

```bash
npm install @xenova/transformers
```

### 方案 2: 使用 OpenAI 嵌入 API

DeepSeek 用于聊天，OpenAI 用于嵌入：

```bash
MEMORY_ENABLED=true
OPENAI_API_KEY=sk-xxx  # 用于嵌入
EMBEDDING_MODEL=text-embedding-3-small
```

### 方案 3: 使用其他嵌入 API

兼容 OpenAI 格式的嵌入 API 提供商：
- Jina AI
- Cohere
- Voyage AI

## 当前配置

记忆系统现在支持多种嵌入提供商：

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-xxx` |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com/v1` |
| `OPENAI_API_KEY` | OpenAI API 密钥（嵌入用） | `sk-xxx` |
| `EMBEDDING_API_KEY` | 通用嵌入 API 密钥 | `sk-xxx` |
| `EMBEDDING_BASE_URL` | 通用嵌入 API 地址 | `https://api.openai.com/v1` |
| `EMBEDDING_MODEL` | 嵌入模型名称 | `text-embedding-3-small` |

## 推荐配置

使用 DeepSeek 进行推理，使用 OpenAI 进行嵌入：

```bash
# DeepSeek 聊天模型（Claude SDK 配置）
# (在 Claude SDK 配置中设置)

# OpenAI 嵌入（记忆系统）
MEMORY_ENABLED=true
OPENAI_API_KEY=sk-your-openai-key
EMBEDDING_MODEL=text-embedding-3-small
```

---

*更新日期: 2025-03-10*
