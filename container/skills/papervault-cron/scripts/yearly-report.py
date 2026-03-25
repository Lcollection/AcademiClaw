#!/usr/bin/env python3
"""
年度总结生成脚本
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict

PAPERVAULT = r"D:\PaperVault"
REPORTS_DIR = os.path.join(PAPERVAULT, "reports", "yearly")
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
CONCEPTS_DIR = os.path.join(PAPERVAULT, "Concepts")
METHODS_DIR = os.path.join(PAPERVAULT, "Methods")

def get_year_notes(year):
    """获取年度笔记"""
    notes = []
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        if filename.startswith('.'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        
        if mtime.year == year:
            with open(filepath, 'r', encoding='utf-8') as f:
                notes.append({
                    "filename": filename,
                    "content": f.read(),
                    "mtime": mtime
                })
    
    return notes

def count_files(directory):
    """统计目录下的文件数"""
    if not os.path.exists(directory):
        return 0
    return len([f for f in os.listdir(directory) if f.endswith('.md') and not f.startswith('.')])

def generate_yearly_report(year, notes):
    """生成年度总结"""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{year}.md")
    
    # 统计
    total = len(notes)
    finished = sum(1 for n in notes if 'status: finished' in n['content'])
    reading = sum(1 for n in notes if 'status: reading' in n['content'])
    
    concepts_count = count_files(CONCEPTS_DIR)
    methods_count = count_files(METHODS_DIR)
    
    # 按季度分组
    by_quarter = defaultdict(int)
    for note in notes:
        quarter = (note['mtime'].month - 1) // 3 + 1
        by_quarter[quarter] += 1
    
    # 按月分组
    by_month = defaultdict(int)
    for note in notes:
        by_month[note['mtime'].month] += 1
    
    content = f'''---
type: yearly-report
year: {year}
papers_count: {total}
finished_count: {finished}
concepts_count: {concepts_count}
methods_count: {methods_count}
---

# 🎯 年度总结 - {year}年

## 年度概览

| 指标 | 数值 |
|------|------|
| 阅读论文 | {total} 篇 |
| 完成阅读 | {finished} 篇 |
| 阅读中 | {reading} 篇 |
| 概念积累 | {concepts_count} 个 |
| 方法积累 | {methods_count} 个 |
| 月均阅读 | {total // 12 if total else 0} 篇 |

## 季度对比

| 季度 | 论文数 | 占比 |
|------|--------|------|
'''
    
    for q in range(1, 5):
        count = by_quarter[q]
        pct = (count / total * 100) if total > 0 else 0
        bar = "█" * int(pct / 10)
        content += f"| Q{q} | {count} | {bar} {pct:.0f}% |\n"
    
    content += "\n## 月度趋势\n\n```\n"
    
    for month in range(1, 13):
        count = by_month[month]
        bar = "▓" * min(count, 20)
        content += f"{month:2d}月 |{bar:<20} {count}\n"
    
    content += "```\n"
    
    content += f"""
## 年度回顾

### 研究主题

<!-- 本年度主要研究方向 -->

1. 
2. 
3. 

### 重要成果

<!-- 最有价值的收获 -->

1. 
2. 
3. 

### 能力成长

<!-- 学到的技能和方法 -->

- 

### 论文产出

<!-- 发表或撰写的论文 -->

- 

## 知识网络

### 核心概念

<!-- 最重要的概念 -->

- 

### 常用方法

<!-- 最常用的方法 -->

- 

## 反思与展望

### 做得好的地方

- 

### 需要改进的地方

- 

### 经验教训

- 

## {year + 1}年计划

### 研究目标

- [ ] 
- [ ] 
- [ ] 

### 学习计划

- [ ] 
- [ ] 

### 预期成果

- 

## 致谢

<!-- 感谢帮助过你的人 -->

---

> "The beginning of wisdom is the definition of terms." — Socrates

_由 Echo 自动生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}_

---

[[{year-1}年总结]] | [[{year+1}年计划]]
"""
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path

def main():
    """主函数"""
    today = datetime.now()
    year = today.year
    
    print("=" * 60)
    print(f"🎯 开始生成年度总结 - {year}年")
    print("=" * 60)
    
    # 获取年度笔记
    notes = get_year_notes(year)
    print(f"\n📚 本年度笔记: {len(notes)} 篇")
    
    # 生成报告
    report_path = generate_yearly_report(year, notes)
    print(f"\n✅ 年度总结已生成: {report_path}")
    
    print("\n" + "=" * 60)
    print("🎉 年度总结生成完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
