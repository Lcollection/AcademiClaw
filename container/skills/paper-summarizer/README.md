# Paper Summarizer 📊

> 生成每日/每周/月度/季度/年度学习报告

[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)]()
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)]()

## 📖 简介

Paper Summarizer 自动统计和总结你的学习进度，生成多维度报告：
- 📅 每日总结 - 今日新增论文、阅读进度
- 📆 每周总结 - 本周学习主题、重点论文
- 📊 月度报告 - 月度学习成果、知识分布
- 📈 季度报告 - 研究方向分析、趋势洞察
- 📝 年度总结 - 全年学习回顾、成长轨迹

## 🎯 使用场景

- 跟踪每日学习进度
- 生成周报/月报汇报
- 分析研究方向分布
- 发现学习规律和趋势

## 🚀 快速开始

### 触发词
```
"生成今天的每日总结"
"生成本周学习周报"
"生成这个月的月度报告"
```

### 手动运行
```bash
python scripts/daily-summary.py
python scripts/weekly-summary.py
python scripts/monthly-report.py
```

## 📝 报告示例

### 每日报告
```markdown
# 📝 每日学习总结 - 2026-03-25

## 学习概览

| 指标 | 数值 |
|------|------|
| 今日笔记 | 15 篇 |
| 已完成 | 3 篇 |
| 阅读中 | 5 篇 |
| 待阅读 | 7 篇 |

## 标签分布

- **transformer**: 8 篇
- **LLM**: 6 篇
- **agent**: 4 篇
```

### 每周报告
```markdown
# 📊 每周学习总结 - Week 12

## 本周概览

- **新增论文**: 45 篇
- **完成阅读**: 12 篇
- **笔记数量**: 30 篇

## 重点论文

1. **Attention Is All You Need** - Transformer 架构
2. **GPT-4 Technical Report** - 大语言模型
```

## ⏰ 定时任务

默认配置（可在 `cron.json` 修改）：
- 每日总结: 20:00
- 每周总结: 周四 14:00
- 月度报告: 月末 20:00
- 季度报告: 季末 20:00
- 年度总结: 12/31 20:00

## 🔧 自定义配置

### 修改报告模板
编辑 `templates/` 目录下的模板文件

### 调整定时任务
编辑 `config/cron.json`

## 📚 相关 Skills

- [Paper Fetcher](../paper-fetcher) - 论文检索
- [Learning Reflector](../learning-reflector) - 学习反思
- [PDF Reader](../pdf-reader) - 深度阅读

---

[← 返回主页](../../README.md)
