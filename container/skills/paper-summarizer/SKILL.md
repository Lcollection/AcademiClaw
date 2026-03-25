---
name: Paper Summarizer
slug: paper-summarizer
version: 1.0.0
homepage: https://clawhub.com/skills/paper-summarizer
description: "生成论文学习报告：每日总结、每周总结、月度报告、季度报告、年度总结。统计学习进度、分析研究方向、追踪知识积累。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F4CA}"
    requires:
      bins: [python]
    os: [win32, darwin, linux]
    configPaths:
      - "{workspace}/PaperVault/reports/"
---

## When to Use

Use this skill when you want to:
- Generate daily learning summary
- Create weekly progress report
- Produce monthly/quarterly/yearly reports
- Track your research progress
- Analyze your learning patterns

**Triggers:**
- User says "daily summary", "weekly report", "每日总结", "每周报告"
- User mentions "learning progress", "学习进度"
- User asks "what did I learn", "我学了什么"
- User wants to "generate report", "生成报告"

## Quick Start

### Daily Summary
```
生成今天的每日总结
```

### Weekly Summary
```
生成本周学习周报
```

### Monthly Report
```
生成这个月的月度报告
```

### Manual Run
```bash
python {workspace}/PaperVault/scripts/daily-summary.py
python {workspace}/PaperVault/scripts/weekly-summary.py
python {workspace}/PaperVault/scripts/monthly-report.py
```

## Report Types

### 1. Daily Summary (每日总结)
**Time**: 20:00 every day

**Content**:
- Papers read today
- Notes created
- Tags distribution
- Key abstracts
- Learning highlights

**Output**: `{workspace}/PaperVault/reports/daily/YYYY-MM-DD-summary.md`

**Example**:
```markdown
# 📝 每日学习总结 - 2024-03-25

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

## 今日收获

1. 学习了新的注意力机制
2. 了解了多智能体协作框架
3. 掌握了 RAG 优化技巧
```

### 2. Weekly Summary (每周总结)
**Time**: Thursday 14:00

**Content**:
- Weekly statistics
- Reading progress
- Knowledge areas covered
- Papers to follow up
- Next week plan

**Output**: `{workspace}/PaperVault/reports/weekly/YYYY-WW.md`

### 3. Monthly Report (月度报告)
**Time**: Last day of month, 20:00

**Content**:
- Monthly statistics
- Research direction analysis
- Top papers
- Knowledge growth
- Monthly highlights

**Output**: `{workspace}/PaperVault/reports/monthly/YYYY-MM.md`

### 4. Quarterly Report (季度报告)
**Time**: End of quarter, 20:00

**Content**:
- Quarterly overview
- Research trends
- Key achievements
- Skills developed
- Next quarter goals

**Output**: `{workspace}/PaperVault/reports/quarterly/YYYY-QX.md`

### 5. Yearly Report (年度总结)
**Time**: December 31, 20:00

**Content**:
- Annual statistics
- Research journey
- Major breakthroughs
- Knowledge map
- Next year plan

**Output**: `{workspace}/PaperVault/reports/yearly/YYYY.md`

## Statistics Tracked

### Papers
- Total papers added
- Papers read vs unread
- Reading completion rate
- Most cited papers

### Topics
- Tag distribution
- Hot topics
- Emerging areas
- Topic evolution

### Learning
- Notes created
- Concepts learned
- Methods mastered
- Time invested

## Report Templates

### Daily Summary Template
```markdown
---
type: daily-summary
date: YYYY-MM-DD
notes_count: X
---

# 📝 每日学习总结 - YYYY-MM-DD

## 学习概览

| 指标 | 数值 |
|------|------|
| 今日笔记 | X 篇 |
| 已完成 | X 篇 |
| 阅读中 | X 篇 |
| 待阅读 | X 篇 |

## 标签分布

- **tag1**: X 篇
- **tag2**: X 篇

## 今日收获

1. 
2. 
3. 

## 明日计划

- [ ] 
- [ ] 
```

### Weekly Summary Template
```markdown
---
type: weekly-summary
week: YYYY-WW
date_range: YYYY-MM-DD to YYYY-MM-DD
---

# 📊 每周学习总结 - Week WW

## 本周概览

- **新增论文**: X 篇
- **完成阅读**: X 篇
- **笔记数量**: X 篇
- **学习时长**: X 小时

## 重点论文

1. **Paper Title** - 关键发现
2. **Paper Title** - 关键发现

## 知识积累

### 新概念
- 

### 新方法
- 

## 下周计划

- [ ] 
- [ ] 
```

## Advanced Features

### Custom Date Range
```bash
python weekly-summary.py --start 2024-03-01 --end 2024-03-07
```

### Filter by Tags
```bash
python monthly-report.py --tags "transformer,LLM"
```

### Export to PDF
```bash
python monthly-report.py --format pdf
```

## Integration with Other Skills

- **paper-fetcher**: Source of papers
- **learning-reflector**: Deep reflection on summaries
- **pdf-reader**: Detailed paper analysis

## Troubleshooting

### No Data Found
```
Error: No notes found for this period
```
**Solution**: Check your notes are in the correct directory.

### Report Generation Failed
```
Error: Template not found
```
**Solution**: Ensure templates exist in `templates/` directory.

## Best Practices

1. **Review Daily**: Spend 5 minutes reviewing daily summary
2. **Plan Weekly**: Use weekly summary to plan next week
3. **Reflect Monthly**: Monthly report for deep reflection
4. **Track Yearly**: Yearly summary for long-term trends

## Related Skills

- `paper-fetcher` - Paper retrieval
- `learning-reflector` - Deep reflection
- `pdf-reader` - Detailed paper reading
