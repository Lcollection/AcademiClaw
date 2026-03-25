# PaperVault Cron 安装指南

## 快速开始

### 1. 复制文件到工作区

```bash
# 创建目录结构
mkdir -p D:\PaperVault\{scripts,config,Templates,reports\Papers,data,logs}
mkdir -p D:\PaperVault\reports\{daily,weekly,monthly,quarterly,yearly}

# 复制脚本
cp -r scripts/* D:\PaperVault\scripts/
# 复制配置模板
cp config/keywords.example.json D:\PaperVault\config\keywords.json
cp config/translate.example.json D:\PaperVault\config/translate.json
# 复制笔记模板
cp templates/* D:\PaperVault\Templates/
```

### 2. 配置关键词

编辑 `D:\PaperVault\config\keywords.json`，根据你的研究方向调整关键词列表。

### 3. 配置翻译 API（可选）

编辑 `D:\PaperVault\config\translate.json`:
- 填入 Kimi API key
- 将 `enabled` 改为 `true`

### 4. 设置 OpenClaw 定时任务

在 OpenClaw 中运行以下命令设置定时任务:

```bash
# 每日论文检索 (08:00)
/cron add "每日论文检索" "0 8 * * *" "daily-search"

# 每日学习总结 (20:00)
/cron add "每日学习总结" "0 20 * * *" "daily-summary"

# 每周学习总结 (周四 14:00)
/cron add "每周学习总结" "0 14 * * 4" "weekly-summary"
```

或者直接使用 Python 脚本配置:

```bash
python D:\PaperVault\scripts\setup-cron.py
```

### 5. 验证安装

```bash
# 测试论文检索
python D:\PaperVault\scripts\daily-search.py

# 测试翻译功能（如果启用）
python -c "from scripts.daily_search import translate_to_chinese; print(translate_to_chinese('Attention Is All You Need', '标题'))"
```

## 手动配置定时任务

### 每日论文检索
- **名称**: 每日论文检索
- **Cron**: `0 8 * * *` (每天 08:00)
- **时区**: Asia/Shanghai
- **Payload**: 
  ```json
  {
    "kind": "agentTurn",
    "message": "运行 D:\\PaperVault\\scripts\\daily-search.py 进行每日论文检索"
  }
  ```

### 每日学习总结
- **名称**: 每日学习总结
- **Cron**: `0 20 * * *` (每天 20:00)
- **时区**: Asia/Shanghai
- **Payload**:
  ```json
  {
    "kind": "agentTurn",
    "message": "运行 D:\\PaperVault\\scripts\\daily-summary.py 进行每日学习总结"
  }
  ```

### 每周学习总结
- **名称**: 每周学习总结
- **Cron**: `0 14 * * 4` (每周四 14:00)
- **时区**: Asia/Shanghai
- **Payload**:
  ```json
  {
    "kind": "agentTurn",
    "message": "运行 D:\\PaperVault\\scripts\\weekly-summary.py 进行每周学习总结"
  }
  ```

## 目录结构

```
D:\PaperVault\
├── config\
│   ├── keywords.json       # 检索关键词
│   └── translate.json       # 翻译 API 配置
├── scripts\
│   ├── daily-search.py      # 每日检索
│   ├── daily-summary.py     # 每日总结
│   ├── weekly-summary.py    # 每周总结
│   ├── monthly-report.py    # 月度报告
│   ├── quarterly-report.py  # 季度报告
│   └── yearly-report.py     # 年度报告
├── templates\
│   ├── paper-template.md    # 论文笔记模板
│   ├── concept-template.md  # 概念笔记模板
│   └── method-template.md   # 方法笔记模板
├── reports\
│   ├── daily\              # 每日报告
│   ├── weekly\             # 每周报告
│   ├── monthly\            # 月度报告
│   ├── quarterly\          # 季度报告
│   └── yearly\             # 年度报告
├── Papers\                 # 论文笔记
├── data\
│   └── search-history.json # 检索历史
└── logs\
    └── daily-search.log   # 运行日志
```

## 依赖要求

- Python 3.8+
- requests
- feedparser
- Zotero (运行中)
- Obsidian (用于查看笔记)

## 故障排除

### Zotero 连接失败
确保 Zotero 正在运行，默认端口 23119 可访问。

### 翻译失败
1. 检查 `translate.json` 中的 API key 是否正确
2. 检查网络连接
3. 检查 API 配额

### 没有找到新论文
1. 检查关键词是否合理
2. 检查网络连接
3. 检查 arXiv API 是否正常

## 自定义

### 修改检索关键词
编辑 `config/keywords.json`，添加或删除关键词。

### 修改每日论文上限
编辑 `config/keywords.json` 中的 `max_papers_per_day` 字段。

### 修改翻译模型
编辑 `config/translate.json` 中的 `model` 字段:
- `moonshot-v1-8k` - 快速、经济
- `moonshot-v1-32k` - 更长上下文
- `moonshot-v1-128k` - 最长上下文

## 进阶用法

### 手动添加论文
```bash
python D:\PaperVault\scripts\paper-workflow.py --arxiv 2303.12345
```

### 生成特定日期的报告
```bash
python D:\PaperVault\scripts\daily-summary.py --date 2024-03-25
```

### 批量翻译已有论文
```bash
python D:\PaperVault\scripts\batch-translate.py --dir D:\PaperVault\Papers
```
