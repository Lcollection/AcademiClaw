#!/usr/bin/env python3
"""
学习反思生成器
- 分析学习内容
- 发现知识盲点
- 生成学习建议
- 优化学习策略
"""

import os
import sys
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

# 配置
PAPERVAULT = r"D:\PaperVault"
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
REFLECTIONS_DIR = os.path.join(PAPERVAULT, "reflections")
CONFIG_FILE = os.path.join(PAPERVAULT, "config", "translate.json")

def load_config():
    """加载配置"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"enabled": False}

def load_notes(days=7):
    """加载最近几天的笔记"""
    notes = []
    cutoff_date = datetime.now() - timedelta(days=days)
    
    if not os.path.exists(PAPERS_DIR):
        return notes
    
    for filename in os.listdir(PAPERS_DIR):
        if not filename.endswith('.md'):
            continue
        
        filepath = os.path.join(PAPERS_DIR, filename)
        stat = os.stat(filepath)
        file_time = datetime.fromtimestamp(stat.st_mtime)
        
        if file_time > cutoff_date:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                notes.append({
                    "filename": filename,
                    "path": filepath,
                    "content": content,
                    "date": file_time
                })
    
    return notes

def extract_tags(notes):
    """提取标签"""
    all_tags = []
    for note in notes:
        # 简单提取 frontmatter 中的 tags
        if 'tags:' in note['content']:
            lines = note['content'].split('\n')
            for line in lines:
                if line.strip().startswith('tags:'):
                    tags_str = line.split(':', 1)[1].strip()
                    # 提取标签
                    if '[' in tags_str:
                        tags_str = tags_str.replace('[', '').replace(']', '')
                        tags = [t.strip().strip('"').strip("'") for t in tags_str.split(',')]
                        all_tags.extend([t for t in tags if t])
                    break
    
    return Counter(all_tags)

def analyze_with_llm(notes_content, config):
    """使用 LLM 分析学习内容"""
    if not config.get("enabled") or not config.get("api_key"):
        return None
    
    prompt = f"""基于以下学习笔记，请进行深度反思：

{notes_content[:10000]}

请从以下角度分析：

## 核心收获
列出 3-5 个最重要的学习收获

## 知识连接
发现不同概念之间的联系

## 理解盲点
指出可能理解不完整的部分

## 学习建议
给出具体的学习建议

## 优先级调整
建议接下来应该优先学习什么

请用中文回答，简洁明了。"""

    try:
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": config.get("model", "moonshot-v1-8k"),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.5,
            "max_tokens": 2000
        }
        
        resp = requests.post(
            f"{config['base_url']}/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        else:
            print(f"❌ LLM 调用失败: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        return None

def generate_reflection_report(notes, tags, analysis, days):
    """生成反思报告"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # 标签统计
    tag_list = "\n".join([f"- **{tag}**: {count} 篇" for tag, count in tags.most_common(10)])
    
    content = f"""---
type: reflection
date: {date_str}
period: {days} days
notes_count: {len(notes)}
---

# 🧠 学习反思报告 - {date_str}

## 📊 学习概览

| 指标 | 数值 |
|------|------|
| 分析周期 | {days} 天 |
| 笔记数量 | {len(notes)} 篇 |
| 主要标签 | {len(tags)} 个 |
| 生成时间 | {timestamp} |

## 🏷️ 标签分布

{tag_list}

## 🎯 核心收获

{analysis if analysis else '*待补充*'}

## 📈 学习趋势

<!-- 在这里分析学习趋势 -->

## ❓ 知识盲点

<!-- 在这里记录发现的盲点 -->

## 💡 改进建议

<!-- 在这里记录改进建议 -->

## 📅 下周计划

- [ ] 
- [ ] 
- [ ] 

---
_由 Learning Reflector 自动生成于 {timestamp}_
"""
    
    return content

def main():
    parser = argparse.ArgumentParser(description='学习反思生成器')
    parser.add_argument('--days', type=int, default=7, help='分析最近几天的学习（默认 7 天）')
    parser.add_argument('--output', help='输出路径（可选）')
    parser.add_argument('--no-llm', action='store_true', help='跳过 LLM 分析')
    
    args = parser.parse_args()
    
    print(f"🔍 分析最近 {args.days} 天的学习...")
    
    # 加载笔记
    notes = load_notes(args.days)
    
    if not notes:
        print("⚠️ 没有找到笔记")
        return
    
    print(f"📚 找到 {len(notes)} 篇笔记")
    
    # 提取标签
    tags = extract_tags(notes)
    print(f"🏷️  提取了 {len(tags)} 个标签")
    
    # 准备内容
    notes_content = "\n\n".join([f"### {n['filename']}\n\n{n['content'][:1000]}..." for n in notes[:10]])
    
    # LLM 分析
    analysis = None
    if not args.no_llm:
        print("🤖 正在分析学习内容...")
        config = load_config()
        analysis = analyze_with_llm(notes_content, config)
        
        if analysis:
            print("✅ 分析完成")
        else:
            print("⚠️ 分析跳过")
    
    # 生成报告
    print("📝 生成反思报告...")
    report = generate_reflection_report(notes, tags, analysis, args.days)
    
    # 保存
    output_path = args.output
    if not output_path:
        os.makedirs(REFLECTIONS_DIR, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d")
        output_path = os.path.join(REFLECTIONS_DIR, f"{date_str}-reflection.md")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n✅ 反思报告已保存: {output_path}")
    
    # 显示分析结果
    if analysis:
        print(f"\n{'='*60}")
        print("🧠 学习分析")
        print('='*60)
        print(analysis)

if __name__ == "__main__":
    main()
