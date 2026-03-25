# PaperVault Cron Skill

自动化论文检索、翻译、导入和学习闭环系统。

## 快速开始

1. **安装 Skill**
   ```bash
   # 将 skill 复制到你的工作区
   cp -r D:\.openclaw\workspace\skills\papervault-cron D:\PaperVault
   ```

2. **配置**
   - 编辑 `config/keywords.json` 设置检索关键词
   - 编辑 `config/translate.json` 设置翻译 API

3. **设置定时任务**
   ```bash
   python scripts/setup-cron.py
   ```

4. **验证**
   ```bash
   # 手动运行一次检索
   python scripts/daily-search.py
   ```

## 文件说明

### 脚本 (scripts/)
- `daily-search.py` - 每日论文检索
- `daily-summary.py` - 每日学习总结
- `weekly-summary.py` - 每周学习总结
- `monthly-report.py` - 月度报告
- `quarterly-report.py` - 季度报告
- `yearly-report.py` - 年度报告
- `setup-cron.py` - 定时任务配置工具

### 配置 (config/)
- `keywords.json` - 检索关键词配置
- `translate.json` - 翻译 API 配置

### 模板 (templates/)
- `paper-template.md` - 论文笔记模板
- `concept-template.md` - 概念笔记模板
- `method-template.md` - 方法笔记模板

## 定时任务时间表

| 任务 | 时间 | Cron 表达式 |
|------|------|--------------|
| 每日论文检索 | 08:00 | `0 8 * * *` |
| 每日学习总结 | 20:00 | `0 20 * * *` |
| 每周学习总结 | 周四 14:00 | `0 14 * * 4` |
| 月度报告 | 月末 20:00 | `0 20 28-31 * *` |
| 季度报告 | 季末 20:00 | `0 20 31 3,30 6,30 9,31 12 *` |
| 年度总结 | 12/31 20:00 | `0 20 31 12 *` |

## 功能特性

### 自动翻译
- 论文标题自动翻译为中文
- 摘要自动翻译为中文
- 支持多种 LLM 提供商（Kimi、GLM 等）

### 智能筛选
- 基于关键词的 arXiv 检索
- 自动去重（避免重复导入）
- 最近 7 天的新论文

### 报告生成
- 每日报告：新增论文列表
- 每周报告：学习进度汇总
- 月度报告：学习成果统计
- 季度报告：研究方向分析
- 年度报告：全年学习总结

## 依赖

- Python 3.8+
- requests
- feedparser
- Zotero (运行中)
- Obsidian (可选，用于查看笔记)

## 许可证

MIT

## 作者

Echo (OpenClaw Assistant)

## 版本历史

- v1.0.0 (2024-03-25) - 初始版本
  - 每日论文检索
  - 中文翻译
  - 定时任务配置
