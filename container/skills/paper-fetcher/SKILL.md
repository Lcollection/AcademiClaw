---
name: Paper Fetcher
slug: paper-fetcher
version: 1.0.0
homepage: https://clawhub.com/skills/paper-fetcher
description: "从 arXiv 自动检索论文、翻译标题摘要、导入 Zotero、生成 Obsidian 笔记。支持关键词检索、自动去重、中文翻译。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F4DD}"
    requires:
      bins: [python]
      services: [zotero]
    os: [win32, darwin, linux]
    configPaths:
      - "{workspace}/PaperVault/config/"
---

## When to Use

Use this skill when you want to:
- Search for new papers from arXiv
- Automatically translate paper titles and abstracts to Chinese
- Import papers to Zotero
- Generate Obsidian notes for papers

**Triggers:**
- User says "search papers", "fetch papers", "检索论文", "获取论文"
- User mentions "arXiv", "论文检索", "paper search"
- User wants to import papers to Zotero
- User asks about daily paper retrieval

## Quick Start

### Search Papers Now
```
搜索今天的论文
```

### Search Specific Topic
```
搜索 arXiv 上关于 "transformer" 的最新论文
```

### Manual Run
```bash
python {workspace}/PaperVault/scripts/daily-search.py
```

## Features

### 1. Automatic Paper Search
- Searches arXiv based on configured keywords
- Filters papers from last 7 days
- Deduplicates to avoid re-imports
- Respects daily limit (default: 15 papers)

### 2. Chinese Translation
- Translates paper titles to Chinese
- Translates abstracts to Chinese
- Uses Kimi API (configurable)
- Maintains professional terminology

### 3. Zotero Integration
- Automatically imports papers to Zotero
- Requires Zotero running on localhost:23119
- Creates BibTeX entries with proper metadata

### 4. Obsidian Notes
- Generates structured Obsidian notes
- Includes both English and Chinese content
- Links to arXiv and DOI
- Tags for easy filtering

## Configuration

### Keywords (config/keywords.json)
```json
{
  "keywords": [
    "machine learning",
    "deep learning",
    "transformer",
    "LLM",
    "agent"
  ],
  "max_papers_per_day": 15,
  "auto_import": true
}
```

### Translation API (config/translate.json)
```json
{
  "provider": "kimi",
  "api_key": "your-api-key",
  "base_url": "https://api.moonshot.cn/v1",
  "model": "moonshot-v1-8k",
  "enabled": true
}
```

## Note Structure

Generated notes follow this structure:

```markdown
---
title: "English Title"
title_cn: "中文标题"
arxiv_id: "2303.12345"
authors: ["Author 1", "Author 2"]
year: 2024
doi: "10.48550/arXiv.2303.12345"
tags: [daily-search, auto-import]
status: "unread"
date_added: 2024-03-25
source: "daily-search"
---

# English Title

> [!info] 文献信息
> - **作者**: Author 1; Author 2
> - **发布日期**: 2024-03-20
> - **arXiv**: [2303.12345](https://arxiv.org/abs/2303.12345)
> - **DOI**: 10.48550/arXiv.2303.12345
> - **中文标题**: 中文标题

## 摘要

English abstract...

## 🇨🇳 中文翻译

**标题**: 中文标题

**摘要**: 中文摘要...

## 待阅读

- [ ] 阅读全文
- [ ] 提取核心观点
- [ ] 关联相关概念

## 笔记

<!-- 在这里记录你的阅读笔记 -->
```

## Troubleshooting

### Zotero Not Running
```
Error: Cannot connect to Zotero
```
**Solution**: Start Zotero and ensure Connector is enabled.

### Translation Failed
```
Error: Translation API returned 401
```
**Solution**: Check API key in `config/translate.json`.

### No Papers Found
```
No new papers found today
```
**Solution**: 
1. Check keywords are relevant
2. Check network connection
3. Try different keywords

## Related Skills

- `paper-summarizer` - Generate learning summaries
- `pdf-reader` - Read and analyze PDF papers
- `zotero-local` - Manage Zotero library

## Advanced Usage

### Custom Search
```bash
python daily-search.py --keywords "quantum computing" --max 20
```

### Skip Translation
Set `enabled: false` in `translate.json`.

### Manual Import
```bash
python paper-workflow.py --arxiv 2303.12345
```
