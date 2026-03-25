#!/usr/bin/env python3
"""
季度报告生成脚本
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict

PAPERVAULT = r"D:\PaperVault"
REPORTS_DIR = os.path.join(PAPERVAULT, "reports", "quarterly")
MONTHLY_REPORTS = os.path.join(PAPERVAULT, "reports", "monthly")
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")

def get_quarter_range(year, quarter):
    """获取季度范围"""
    quarters = {
        1: (1, 3),
        2: (4, 6),
        3: (7, 9),
        4: (10, 12)
    }
    return quarters[quarter]

def get_quarter_notes(year, quarter):
    """获取季度笔记"""
    start_month, end_month = get_quarter_range(year, quarter)
    notes = []
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        if filename.startswith('.'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        
        if mtime.year == year and start_month <= mtime.month <= end_month:
            with open(filepath, 'r', encoding='utf-8') as f:
                notes.append({
                    "filename": filename,
                    "content": f.read(),
                    "mtime": mtime
                })
    
    return notes

def generate_quarterly_report(year, quarter, notes):
    """生成季度报告"""
    start_month, end_month = get_quarter_range(year, quarter)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{year}-Q{quarter}.md")
    
    # 统计
    total = len(notes)
    finished = sum(1 for n in notes if 'status: finished' in n['content'])
    completion_rate = (finished / total * 100) if total > 0 else 0
    
    # 按月分组
    by_month = defaultdict(list)
    for note in notes:
        month = note['mtime'].month
        by_month[month].append(note)
    
    content = f'''---
type: quarterly-report
period: {year}-Q{quarter}
year: {year}
quarter: {quarter}
months: "{start_month}-{end_month}"
papers_count: {total}
completion_rate: {completion_rate:.1f}
---

# 📊 季度报告 - {year}年Q{quarter}

## 季度概览

| 指标 | 数值 |
|------|------|
| 阅读论文 | {total} 篇 |
| 完成阅读 | {finished} 篇 |
| 完成率 | {completion_rate:.1f}% |
| 月均阅读 | {total // 3} 篇 |

## 月度分解

| 月份 | 论文数 | 完成 | 进度 |
|------|--------|------|------|
'''
    
    for month in range(start_month, end_month + 1):
        month_notes = by_month.get(month, [])
        month_finished = sum(1 for n in month_notes if 'status: finished' in n['content'])
        rate = (month_finished / len(month_notes) * 100) if month_notes else 0
        bar = "█" * int(rate / 10)
        content += f"| {month}月 | {len(month_notes)} | {month_finished} | {bar} {rate:.0f}% |\n"
    
    content += f"""
## 季度总结

### 研究重点

<!-- 本季度主要关注的研究方向 -->

1. 
2. 
3. 

### 主要成果

<!-- 最重要的收获 -->

- 

### 能力提升

<!-- 学到了什么新技能/方法 -->

- 

### 遇到的挑战

<!-- 遇到的困难和解决方案 -->

- 

## 下季度计划

### 研究目标

- [ ] 
- [ ] 
- [ ] 

### 学习计划

- [ ] 
- [ ] 

### 预期成果

- 

## 反思与改进

### 做得好的

- 

### 需要改进的

- 

### 具体措施

- 

---
_由 Echo 自动生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}_
"""
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path

def main():
    """主函数"""
    today = datetime.now()
    year = today.year
    quarter = (today.month - 1) // 3 + 1
    
    print("=" * 60)
    print(f"📊 开始生成季度报告 - {year}年Q{quarter}")
    print("=" * 60)
    
    # 获取季度笔记
    notes = get_quarter_notes(year, quarter)
    print(f"\n📚 本季度笔记: {len(notes)} 篇")
    
    # 生成报告
    report_path = generate_quarterly_report(year, quarter, notes)
    print(f"\n✅ 季度报告已生成: {report_path}")
    
    print("\n" + "=" * 60)
    print("🎉 季度报告生成完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
