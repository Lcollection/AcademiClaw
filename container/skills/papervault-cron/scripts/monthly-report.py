#!/usr/bin/env python3
"""
月度报告生成脚本
"""

import os
import sys
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
import calendar

PAPERVAULT = r"D:\PaperVault"
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
CONCEPTS_DIR = os.path.join(PAPERVAULT, "Concepts")
METHODS_DIR = os.path.join(PAPERVAULT, "Methods")
REPORTS_DIR = os.path.join(PAPERVAULT, "reports", "monthly")
DAILY_REPORTS = os.path.join(PAPERVAULT, "reports", "daily")

def get_month_notes(year, month):
    """获取指定月份的笔记"""
    notes = []
    month_start = datetime(year, month, 1)
    month_end = datetime(year, month, calendar.monthrange(year, month)[1])
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        if filename.startswith('.'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        
        # 检查修改时间
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        if mtime < month_start or mtime > month_end:
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        notes.append({
            "filename": filename,
            "path": filepath,
            "content": content,
            "mtime": mtime
        })
    
    return notes

def extract_metadata(content):
    """提取元数据"""
    metadata = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1]
            for line in frontmatter.strip().split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip().strip('"\'[]')
    return metadata

def analyze_month(notes, year, month):
    """分析月度数据"""
    analysis = {
        "total": len(notes),
        "by_status": defaultdict(int),
        "by_tag": defaultdict(int),
        "by_week": defaultdict(int),
        "titles": [],
        "daily_count": defaultdict(int)
    }
    
    for note in notes:
        metadata = extract_metadata(note['content'])
        
        # 统计
        status = metadata.get('status', 'unknown')
        analysis['by_status'][status] += 1
        
        tags = metadata.get('tags', '')
        for tag in re.findall(r'[\w-]+', tags):
            analysis['by_tag'][tag] += 1
        
        # 按周统计
        week_num = note['mtime'].isocalendar()[1]
        analysis['by_week'][f"Week {week_num}"] += 1
        
        # 按天统计
        day = note['mtime'].strftime('%Y-%m-%d')
        analysis['daily_count'][day] += 1
        
        # 记录标题
        title = metadata.get('title', note['filename'])
        if len(title) > 10:
            analysis['titles'].append({
                "title": title,
                "status": status
            })
    
    return analysis

def generate_monthly_report(notes, analysis, year, month):
    """生成月报"""
    month_name = datetime(year, month, 1).strftime('%Y-%m')
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{month_name}.md")
    
    # 计算统计
    finished = analysis['by_status'].get('finished', 0)
    total = len(notes)
    completion_rate = (finished / total * 100) if total > 0 else 0
    
    content = f'''---
type: monthly-report
period: {month_name}
year: {year}
month: {month}
papers_count: {len(notes)}
completion_rate: {completion_rate:.1f}
---

# 📈 月报 - {year}年{month}月

## 月度概览

| 指标 | 数值 |
|------|------|
| 阅读论文 | {len(notes)} 篇 |
| 完成阅读 | {finished} 篇 |
| 完成率 | {completion_rate:.1f}% |
| 研究方向 | {len(analysis['by_tag'])} 个 |

## 周度趋势

| 周次 | 论文数 |
|------|--------|
'''
    
    for week, count in sorted(analysis['by_week'].items()):
        bar = "█" * min(count, 10)
        content += f"| {week} | {bar} {count} |\n"
    
    content += "\n## 研究方向分布\n\n"
    
    for tag, count in sorted(analysis['by_tag'].items(), key=lambda x: -x[1])[:15]:
        bar = "█" * min(count // 2, 10)
        content += f"- **{tag}**: {bar} {count}\n"
    
    content += "\n## 完成的论文\n\n"
    
    finished_papers = [t for t in analysis['titles'] if t['status'] == 'finished']
    for i, paper in enumerate(finished_papers[:20], 1):
        content += f"{i}. ✅ [[{paper['title'][:60]}]]\n"
    
    if not finished_papers:
        content += "_暂无已完成阅读的论文_\n"
    
    content += f"""
## 月度总结

### 主要成果

1. 
2. 
3. 

### 研究进展

<!-- 描述本月的研究进展 -->

### 遇到的挑战

- 

### 下月计划

- [ ] 
- [ ] 
- [ ] 

## 知识积累

### 新学到的概念

- 

### 新掌握的方法

- 

## 统计图表

### 每日阅读量

```
{generate_ascii_chart(analysis['daily_count'])}
```

---
_由 Echo 自动生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}_
"""
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path

def generate_ascii_chart(daily_count):
    """生成 ASCII 图表"""
    if not daily_count:
        return "暂无数据"
    
    lines = []
    sorted_days = sorted(daily_count.items())[-14:]  # 最近14天
    max_count = max(daily_count.values()) if daily_count else 1
    
    for day, count in sorted_days:
        bar_len = int(count / max_count * 20) if max_count > 0 else 0
        bar = "▓" * bar_len
        lines.append(f"{day[-5:]} |{bar:<20} {count}")
    
    return "\n".join(lines)

def main():
    """主函数"""
    today = datetime.now()
    year = today.year
    month = today.month
    
    print("=" * 60)
    print(f"📈 开始生成月报 - {year}年{month}月")
    print("=" * 60)
    
    # 获取本月笔记
    notes = get_month_notes(year, month)
    print(f"\n📚 本月笔记: {len(notes)} 篇")
    
    # 分析
    analysis = analyze_month(notes, year, month)
    print(f"   已完成: {analysis['by_status'].get('finished', 0)}")
    print(f"   阅读中: {analysis['by_status'].get('reading', 0)}")
    print(f"   方向数: {len(analysis['by_tag'])}")
    
    # 生成月报
    report_path = generate_monthly_report(notes, analysis, year, month)
    print(f"\n✅ 月报已生成: {report_path}")
    
    print("\n" + "=" * 60)
    print("🎉 月报生成完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
