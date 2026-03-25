---
name: PaperVault Cron
slug: papervault-cron
version: 1.0.0
homepage: https://clawhub.com/skills/papervault-cron
description: "自动化论文检索、翻译、导入和学习闭环系统。每日从 arXiv 检索论文、自动翻译标题和摘要、导入 Zotero、生成 Obsidian 笔记和学习报告。"
changelog: "Initial release with daily search, translation, and cron scheduling"
metadata:
  clawdbot:
    emoji: "\U{1F4D0}"
    requires:
      bins: [python]
      services: [zotero]
    os: [win32, darwin, linux]
    configPaths:
      - "{workspace}/PaperVault/config/"
    configPaths.optional:
      - "{workspace}/PaperVault/scripts/"
---

## When to Use

Use this skill when you want to:
- Set up automated paper search from arXiv
- Generate daily/weekly/monthly learning reports
- Translate paper titles and abstracts to Chinese
- Import papers to Zotero automatically
- Create Obsidian notes for papers

**Triggers:**
- User mentions "paper search", "arxiv automation", "paper workflow"
- User wants to set up paper retrieval cron jobs
- User mentions "PaperVault", "论文检索", "自动翻译"
- User asks about setting up research automation

## Setup

### 1. Create Directory Structure

The skill expects a `PaperVault` directory in your workspace:

```
{workspace}/PaperVault/
├── config/
│   ├── keywords.json
│   └── translate.json
├── scripts/
│   ├── daily-search.py
│   ├── daily-summary.py
│   ├── weekly-summary.py
│   ├── monthly-report.py
│   ├── quarterly-report.py
│   └── yearly-report.py
├── templates/
│   ├── Paper Template.md
│   ├── Concept Template.md
│   └── Method Template.md
├── reports/
│   ├── daily/
│   ├── weekly/
│   ├── monthly/
│   ├── quarterly/
│   └── yearly/
├── Papers/
├── data/
└── logs/
```

### 2. Configuration Files

**keywords.json** - Search keywords:
```json
{
  "keywords": ["machine learning", "deep learning", "transformer"],
  "max_papers_per_day": 15,
  "auto_import": true
}
```

**translate.json** - Translation API:
```json
{
  "provider": "kimi",
  "api_key": "your-api-key",
  "base_url": "https://api.moonshot.cn/v1",
  "model": "moonshot-v1-8k",
  "enabled": true
}
```

### 3. Set Up Cron Jobs

Run the setup script:
```bash
python {workspace}/PaperVault/scripts/setup-cron.py
```

Or manually configure in OpenClaw:
```
/cron add "每日论文检索" "0 8 * * *" "运行 {workspace}/PaperVault/scripts/daily-search.py 进行每日论文检索"
/cron add "每日学习总结" "0 20 * * *" "运行 {workspace}/PaperVault/scripts/daily-summary.py 进行每日学习总结"
```

## Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Paper Search | 08:00 | Search arXiv for new papers |
| Daily Summary | 20:00 | Generate daily learning summary |
| Weekly Summary | Thu 14:00 | Generate weekly learning summary |
| Monthly Report | Month-end 20:00 | Generate monthly report |
| Quarterly Report | Quarter-end 20:00 | Generate quarterly report |
| Yearly Report | Dec 31 20:00 | Generate yearly summary |

## Manual Operations

### Run Paper Search Manually
```bash
python {workspace}/PaperVault/scripts/daily-search.py
```

### Generate Summary
```bash
python {workspace}/PaperVault/scripts/daily-summary.py
python {workspace}/PaperVault/scripts/weekly-summary.py
```

### View Reports
Reports are saved in `{workspace}/PaperVault/reports/`:
- `daily/YYYY-MM-DD.md` - Daily paper reports
- `weekly/YYYY-WW.md` - Weekly summaries
- `monthly/YYYY-MM.md` - Monthly reports

## Features

### Automatic Translation
- Paper titles translated to Chinese
- Abstracts translated to Chinese
- Uses Kimi API (configurable)

### Smart Filtering
- Keyword-based arXiv search
- Deduplication (avoids re-imports)
- Recent 7 days papers only

### Report Generation
- Daily: New papers list
- Weekly: Learning progress
- Monthly: Achievement statistics
- Quarterly: Research direction analysis
- Yearly: Full year summary

## Troubleshooting

### Zotero Connection Failed
Ensure Zotero is running with Connector enabled on port 23119.

### Translation Failed
1. Check `translate.json` API key is correct
2. Check network connection
3. Check API quota

### No New Papers Found
1. Check keywords in `keywords.json`
2. Check network connection
3. Check arXiv API status

## Customization

### Modify Search Keywords
Edit `{workspace}/PaperVault/config/keywords.json`

### Change Daily Paper Limit
Edit `max_papers_per_day` in `keywords.json`

### Change Translation Model
Edit `model` in `translate.json`:
- `moonshot-v1-8k` - Fast, economical
- `moonshot-v1-32k` - Longer context
- `moonshot-v1-128k` - Longest context

## Related Skills

- `zotero-local` - Local Zotero management
- `obsidian-markdown` - Obsidian Markdown enhancement
- `obsidian-bases` - Obsidian database features

## Feedback

For issues or suggestions, please submit feedback via ClawHub.
