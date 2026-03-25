#!/usr/bin/env python3
"""
每日学习总结脚本
- 读取今日笔记
- 生成学习总结
- 更新概念库和方法库
"""

import os
import sys
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

PAPERVAULT = r"D:\PaperVault"
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
CONCEPTS_DIR = os.path.join(PAPERVAULT, "Concepts")
METHODS_DIR = os.path.join(PAPERVAULT, "Methods")
REPORTS_DIR = os.path.join(PAPERVAULT, "reports", "daily")

def get_today_notes():
    """获取今日笔记"""
    today = datetime.now().strftime("%Y-%m-%d")
    notes = []
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查日期
        if f"date_added: {today}" in content or f"date_added:{today}" in content:
            notes.append({
                "filename": filename,
                "path": filepath,
                "content": content
            })
    
    return notes

def extract_metadata(content):
    """提取笔记元数据"""
    metadata = {}
    
    # 提取 frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1]
            for line in frontmatter.strip().split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip().strip('"\'')
    
    return metadata

def extract_sections(content):
    """提取各章节内容"""
    sections = {}
    current_section = "header"
    current_content = []
    
    for line in content.split('\n'):
        if line.startswith('## '):
            if current_content:
                sections[current_section] = '\n'.join(current_content)
            current_section = line[3:].strip()
            current_content = []
        else:
            current_content.append(line)
    
    if current_content:
        sections[current_section] = '\n'.join(current_content)
    
    return sections

def analyze_notes(notes):
    """分析笔记"""
    analysis = {
        "total": len(notes),
        "by_status": defaultdict(int),
        "by_tag": defaultdict(int),
        "key_concepts": [],
        "key_methods": [],
        "summaries": []
    }
    
    for note in notes:
        metadata = extract_metadata(note['content'])
        sections = extract_sections(note['content'])
        
        # 统计状态
        status = metadata.get('status', 'unknown')
        analysis['by_status'][status] += 1
        
        # 统计标签
        tags = metadata.get('tags', '')
        for tag in re.findall(r'[\w-]+', tags):
            analysis['by_tag'][tag] += 1
        
        # 提取摘要
        summary = sections.get('摘要', sections.get('一句话总结', ''))
        if summary and len(summary) > 50:
            analysis['summaries'].append({
                "title": metadata.get('title', note['filename']),
                "summary": summary[:300]
            })
    
    return analysis

def generate_daily_summary(notes, analysis):
    """生成每日学习总结"""
    today = datetime.now().strftime("%Y-%m-%d")
    summary_path = os.path.join(REPORTS_DIR, f"{today}-summary.md")
    
    content = f'''---
type: daily-summary
date: {today}
notes_count: {len(notes)}
---

# 📝 每日学习总结 - {today}

## 学习概览

| 指标 | 数值 |
|------|------|
| 今日笔记 | {len(notes)} 篇 |
| 已完成 | {analysis['by_status'].get('finished', 0)} 篇 |
| 阅读中 | {analysis['by_status'].get('reading', 0)} 篇 |
| 待阅读 | {analysis['by_status'].get('unread', 0)} 篇 |

## 标签分布

'''
    
    for tag, count in sorted(analysis['by_tag'].items(), key=lambda x: -x[1])[:10]:
        content += f"- **{tag}**: {count} 篇\n"
    
    content += "\n## 论文摘要\n\n"
    
    for i, s in enumerate(analysis['summaries'][:5], 1):
        content += f"### {i}. {s['title'][:50]}\n\n"
        content += f"{s['summary']}\n\n"
    
    content += f"""## 今日收获

<!-- 在这里记录你今天的主要收获 -->

1. 
2. 
3. 

## 明日计划

<!-- 明天的学习计划 -->

- [ ] 
- [ ] 

## 备注

<!-- 其他备注 -->

---
_由 Echo 自动生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}_
"""
    
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return summary_path

def main():
    """主函数"""
    print("=" * 60)
    print("📝 开始每日学习总结")
    print("=" * 60)
    
    # 获取今日笔记
    notes = get_today_notes()
    print(f"\n📚 今日笔记: {len(notes)} 篇")
    
    if not notes:
        print("✅ 今日无新笔记")
        return
    
    # 分析
    analysis = analyze_notes(notes)
    print(f"   已完成: {analysis['by_status'].get('finished', 0)}")
    print(f"   阅读中: {analysis['by_status'].get('reading', 0)}")
    print(f"   待阅读: {analysis['by_status'].get('unread', 0)}")
    
    # 生成总结
    summary_path = generate_daily_summary(notes, analysis)
    print(f"\n✅ 总结已生成: {summary_path}")
    
    print("\n" + "=" * 60)
    print("🎉 每日总结完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
