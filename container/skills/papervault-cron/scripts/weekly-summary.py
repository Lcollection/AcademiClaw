#!/usr/bin/env python3
"""
每周学习总结脚本
- 汇总过去7天的笔记
- 提取关键概念和方法
- 生成周报
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
REPORTS_DIR = os.path.join(PAPERVAULT, "reports", "weekly")

def get_week_notes():
    """获取过去7天的笔记"""
    notes = []
    week_ago = datetime.now() - timedelta(days=7)
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        if filename.startswith('.'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        
        # 检查修改时间
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        if mtime < week_ago:
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        notes.append({
            "filename": filename,
            "path": filepath,
            "content": content,
            "mtime": mtime
        })
    
    return sorted(notes, key=lambda x: x['mtime'], reverse=True)

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

def extract_links(content):
    """提取 wikilinks"""
    # 匹配 [[link]] 或 [[link|text]]
    links = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', content)
    return [l for l in links if l.strip()]

def analyze_week(notes):
    """分析本周笔记"""
    analysis = {
        "total": len(notes),
        "by_status": defaultdict(int),
        "by_tag": defaultdict(int),
        "concepts": defaultdict(int),
        "methods": defaultdict(int),
        "papers": [],
        "all_links": []
    }
    
    for note in notes:
        metadata = extract_metadata(note['content'])
        links = extract_links(note['content'])
        analysis['all_links'].extend(links)
        
        # 统计
        status = metadata.get('status', 'unknown')
        analysis['by_status'][status] += 1
        
        tags = metadata.get('tags', '')
        for tag in re.findall(r'[\w-]+', tags):
            analysis['by_tag'][tag] += 1
        
        # 记录论文
        title = metadata.get('title', note['filename'])
        if len(title) > 10:  # 过滤太短的
            analysis['papers'].append({
                "title": title,
                "status": status,
                "tags": tags,
                "links": links[:5]
            })
    
    # 统计链接（概念和方法）
    for link in analysis['all_links']:
        link_lower = link.lower()
        if any(kw in link_lower for kw in ['method', '方法', 'algorithm', '算法']):
            analysis['methods'][link] += 1
        elif any(kw in link_lower for kw in ['concept', '概念', 'term', '术语']):
            analysis['concepts'][link] += 1
    
    return analysis

def generate_weekly_report(notes, analysis):
    """生成周报"""
    today = datetime.now()
    week_start = today - timedelta(days=7)
    
    report_name = f"{week_start.strftime('%Y-%m-%d')}_to_{today.strftime('%Y-%m-%d')}"
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"{report_name}.md")
    
    content = f'''---
type: weekly-report
period: {report_name}
start_date: {week_start.strftime('%Y-%m-%d')}
end_date: {today.strftime('%Y-%m-%d')}
papers_count: {len(notes)}
---

# 📊 周报 - {week_start.strftime('%m/%d')} ~ {today.strftime('%m/%d')}

## 本周概览

| 指标 | 数值 |
|------|------|
| 阅读论文 | {len(notes)} 篇 |
| 已完成 | {analysis['by_status'].get('finished', 0)} 篇 |
| 阅读中 | {analysis['by_status'].get('reading', 0)} 篇 |
| 新增概念 | {len(analysis['concepts'])} 个 |
| 新增方法 | {len(analysis['methods'])} 个 |

## 研究方向分布

'''
    
    for tag, count in sorted(analysis['by_tag'].items(), key=lambda x: -x[1])[:10]:
        bar = "█" * min(count, 10)
        content += f"- **{tag}**: {bar} {count}\n"
    
    content += "\n## 核心论文\n\n"
    
    # 按状态排序，finished 在前
    sorted_papers = sorted(analysis['papers'], 
                          key=lambda x: (0 if x['status'] == 'finished' else 1, x['title']))
    
    for i, paper in enumerate(sorted_papers[:10], 1):
        status_icon = "✅" if paper['status'] == 'finished' else "📖" if paper['status'] == 'reading' else "📚"
        content += f"{i}. {status_icon} [[{paper['title'][:50]}]]\n"
    
    content += "\n## 高频概念\n\n"
    
    for concept, count in sorted(analysis['concepts'].items(), key=lambda x: -x[1])[:10]:
        content += f"- [[{concept}]] ({count}次)\n"
    
    content += "\n## 常用方法\n\n"
    
    for method, count in sorted(analysis['methods'].items(), key=lambda x: -x[1])[:10]:
        content += f"- [[{method}]] ({count}次)\n"
    
    content += f"""
## 本周总结

### 主要收获

1. 
2. 
3. 

### 遇到的问题

- 

### 下周计划

- [ ] 
- [ ] 
- [ ] 

## 知识网络

```mermaid
graph TD
    A[本周学习] --> B[核心论文]
    B --> C[关键概念]
    B --> D[重要方法]
    C --> E[应用场景]
    D --> F[实现细节]
```

---
_由 Echo 自动生成于 {today.strftime("%Y-%m-%d %H:%M:%S")}_
"""
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path

def main():
    """主函数"""
    print("=" * 60)
    print("📊 开始每周学习总结")
    print("=" * 60)
    
    # 获取本周笔记
    notes = get_week_notes()
    print(f"\n📚 本周笔记: {len(notes)} 篇")
    
    if not notes:
        print("✅ 本周无新笔记")
        return
    
    # 分析
    analysis = analyze_week(notes)
    print(f"   已完成: {analysis['by_status'].get('finished', 0)}")
    print(f"   阅读中: {analysis['by_status'].get('reading', 0)}")
    print(f"   概念数: {len(analysis['concepts'])}")
    print(f"   方法数: {len(analysis['methods'])}")
    
    # 生成周报
    report_path = generate_weekly_report(notes, analysis)
    print(f"\n✅ 周报已生成: {report_path}")
    
    print("\n" + "=" * 60)
    print("🎉 每周总结完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
