#!/usr/bin/env python3
"""
每日论文检索脚本
- 根据关键词搜索 arXiv
- 筛选高质量论文
- 导入到 Zotero
- 生成 Obsidian 笔记（含中文翻译）
"""

import os
import sys
import json
import requests
import feedparser
from datetime import datetime, timedelta
from pathlib import Path

# 配置
PAPERVAULT = r"D:\PaperVault"
CONFIG_FILE = os.path.join(PAPERVAULT, "config", "keywords.json")
TRANSLATE_CONFIG_FILE = os.path.join(PAPERVAULT, "config", "translate.json")
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
LOG_FILE = os.path.join(PAPERVAULT, "logs", "daily-search.log")
HISTORY_FILE = os.path.join(PAPERVAULT, "data", "search-history.json")

ZOTERO_LOCAL = "http://localhost:23119"

def load_translate_config():
    """加载翻译配置"""
    if os.path.exists(TRANSLATE_CONFIG_FILE):
        with open(TRANSLATE_CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "provider": "kimi",
        "api_key": "",
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "enabled": False
    }

def load_config():
    """加载配置"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "keywords": ["machine learning", "deep learning"],
        "max_papers_per_day": 10,
        "auto_import": True
    }

def load_history():
    """加载搜索历史"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"processed": []}

def save_history(history):
    """保存搜索历史"""
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

def search_arxiv(keywords, max_results=50):
    """搜索 arXiv"""
    base_url = "http://export.arxiv.org/api/query?"
    
    # 构建查询
    query = " OR ".join([f'all:"{kw}"' for kw in keywords])
    
    # 日期范围：最近7天
    params = {
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending"
    }
    
    url = base_url + "&".join([f"{k}={v}" for k, v in params.items()])
    
    try:
        resp = requests.get(url, timeout=30)
        feed = feedparser.parse(resp.text)
        return feed.entries
    except Exception as e:
        log(f"搜索失败: {e}")
        return []

def filter_papers(entries, history, max_papers=10):
    """筛选论文"""
    results = []
    
    for entry in entries:
        arxiv_id = entry.id.split("/")[-1]
        
        # 跳过已处理的
        if arxiv_id in history["processed"]:
            continue
        
        # 检查日期（最近7天）
        published = datetime(*entry.published_parsed[:6])
        if (datetime.now() - published).days > 7:
            continue
        
        results.append({
            "id": arxiv_id,
            "title": entry.title.replace("\n", " ").strip(),
            "authors": [a.name for a in entry.authors[:5]],
            "summary": entry.summary[:500] if hasattr(entry, 'summary') else "",
            "published": published.strftime("%Y-%m-%d"),
            "link": entry.link,
            "doi": f"10.48550/arXiv.{arxiv_id}" if "." in arxiv_id else None
        })
        
        if len(results) >= max_papers:
            break
    
    return results

def check_zotero():
    """检查 Zotero 是否运行"""
    try:
        resp = requests.get(f"{ZOTERO_LOCAL}/connector/ping", timeout=5)
        return resp.status_code == 200
    except:
        return False

def import_to_zotero(paper):
    """导入到 Zotero"""
    import uuid
    
    # 构建 BibTeX
    bibtex = f"""@article{{{paper['id'].replace('.', '_')},
    title = {{{paper['title']}}},
    author = {{{' and '.join(paper['authors'])}}},
    journal = {{arXiv preprint}},
    year = {{{paper['published'][:4]}}},
    doi = {{{paper.get('doi', '')}}},
    url = {{{paper['link']}}}
}}"""
    
    session_id = str(uuid.uuid4())
    url = f"{ZOTERO_LOCAL}/connector/import?session={session_id}"
    headers = {"Content-Type": "application/x-bibtex"}
    
    try:
        resp = requests.post(url, data=bibtex.encode('utf-8'), headers=headers, timeout=30)
        return resp.status_code == 200
    except:
        return False

def translate_to_chinese(text, text_type="摘要"):
    """将文本翻译成中文"""
    config = load_translate_config()
    
    if not text or not config.get("enabled", False) or not config.get("api_key"):
        return None
    
    prompt = f"""请将以下英文{text_type}翻译成中文，保持专业术语的准确性。只输出翻译结果，不要加任何解释。

英文原文：
{text}

中文翻译："""

    try:
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": config.get("model", "moonshot-v1-8k"),
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 2000
        }
        
        resp = requests.post(
            f"{config['base_url']}/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        
        if resp.status_code == 200:
            result = resp.json()
            return result["choices"][0]["message"]["content"].strip()
        else:
            log(f"   ⚠️ 翻译失败 (HTTP {resp.status_code})")
            return None
    except Exception as e:
        log(f"   ⚠️ 翻译出错: {e}")
        return None

def generate_note(paper):
    """生成 Obsidian 笔记（含中文翻译）"""
    safe_title = "".join(c if c.isalnum() or c in (' ', '-', '_') else '' for c in paper['title'])
    safe_title = safe_title[:80].strip()
    
    # 翻译标题和摘要
    title_cn = translate_to_chinese(paper['title'], "标题")
    summary_cn = translate_to_chinese(paper['summary'], "摘要")
    
    # 构建中文翻译部分
    translation_section = ""
    if title_cn or summary_cn:
        translation_section = "\n## 🇨🇳 中文翻译\n\n"
        if title_cn:
            translation_section += f"**标题**: {title_cn}\n\n"
        if summary_cn:
            translation_section += f"**摘要**: {summary_cn}\n\n"
    
    content = f'''---
title: "{paper['title']}"
title_cn: "{title_cn or ''}"
arxiv_id: "{paper['id']}"
authors: {json.dumps(paper['authors'], ensure_ascii=False)}
year: {paper['published'][:4]}
doi: "{paper.get('doi', '')}"
tags: [daily-search, auto-import]
status: "unread"
date_added: {datetime.now().strftime('%Y-%m-%d')}
source: "daily-search"
---

# {paper['title']}

> [!info] 文献信息
> - **作者**: {'; '.join(paper['authors'])}
> - **发布日期**: {paper['published']}
> - **arXiv**: [{paper['id']}]({paper['link']})
> - **DOI**: {paper.get('doi', 'N/A')}
{f'- **中文标题**: {title_cn}' if title_cn else ''}

## 摘要

{paper['summary']}
{translation_section}
## 待阅读

- [ ] 阅读全文
- [ ] 提取核心观点
- [ ] 关联相关概念

## 笔记

<!-- 在这里记录你的阅读笔记 -->

'''
    
    note_path = os.path.join(PAPERS_DIR, f"{safe_title}.md")
    
    # 避免覆盖
    counter = 1
    while os.path.exists(note_path):
        note_path = os.path.join(PAPERS_DIR, f"{safe_title}_{counter}.md")
        counter += 1
    
    with open(note_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return {
        "path": note_path,
        "title_cn": title_cn,
        "has_translation": bool(title_cn or summary_cn)
    }

def log(message):
    """记录日志"""
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"[{timestamp}] {message}\n")
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode('ascii', errors='replace').decode('ascii'))

def main():
    """主函数"""
    log("=" * 60)
    log("🔍 开始每日论文检索")
    log("=" * 60)
    
    # 加载配置
    config = load_config()
    history = load_history()
    
    log(f"📚 关键词: {', '.join(config['keywords'])}")
    log(f"📊 每日上限: {config['max_papers_per_day']} 篇")
    
    # 检查 Zotero
    zotero_ok = check_zotero()
    if zotero_ok:
        log("✅ Zotero 运行中")
    else:
        log("⚠️ Zotero 未运行，跳过导入")
    
    # 搜索
    log("\n🔍 搜索 arXiv...")
    entries = search_arxiv(config['keywords'], max_results=100)
    log(f"   找到 {len(entries)} 篇论文")
    
    # 筛选
    papers = filter_papers(entries, history, config['max_papers_per_day'])
    log(f"   筛选后 {len(papers)} 篇新论文")
    
    if not papers:
        log("✅ 今日无新论文")
        return
    
    # 处理论文
    results = []
    for i, paper in enumerate(papers, 1):
        log(f"\n📄 [{i}/{len(papers)}] {paper['title'][:50]}...")
        
        # 导入 Zotero
        if zotero_ok and config.get('auto_import', True):
            if import_to_zotero(paper):
                log("   ✅ 导入 Zotero 成功")
            else:
                log("   ⚠️ 导入 Zotero 失败")
        
        # 生成笔记（含翻译）
        note_info = generate_note(paper)
        note_path = note_info["path"]
        log(f"   📝 笔记: {os.path.basename(note_path)}")
        
        # 显示翻译状态
        if note_info["has_translation"]:
            log("   🌐 已翻译成中文")
        else:
            log("   ⚠️ 翻译跳过（API 未配置）")
        
        # 记录
        history["processed"].append(paper['id'])
        results.append({
            "title": paper['title'],
            "title_cn": note_info.get("title_cn", ""),
            "note": os.path.basename(note_path),
            "arxiv": paper['link']
        })
    
    # 保存历史
    # 只保留最近1000条
    history["processed"] = history["processed"][-1000:]
    save_history(history)
    
    # 生成今日报告
    report_path = generate_daily_report(results)
    
    log("\n" + "=" * 60)
    log("🎉 每日检索完成！")
    log(f"   📚 处理论文: {len(papers)} 篇")
    log(f"   📝 今日报告: {report_path}")
    log("=" * 60)

def generate_daily_report(results):
    """生成每日报告"""
    today = datetime.now().strftime("%Y-%m-%d")
    report_dir = os.path.join(PAPERVAULT, "reports", "daily")
    os.makedirs(report_dir, exist_ok=True)
    
    report_path = os.path.join(report_dir, f"{today}.md")
    
    content = f'''---
type: daily-report
date: {today}
papers_count: {len(results)}
---

# 📊 每日论文报告 - {today}

## 概览

- **日期**: {today}
- **新增论文**: {len(results)} 篇
- **来源**: arXiv 每日检索

## 论文列表

| # | 标题 | 中文标题 | 笔记 | arXiv |
|---|------|----------|------|-------|
'''
    
    for i, r in enumerate(results, 1):
        title_cn = r.get('title_cn', '')[:30] + '...' if r.get('title_cn') else '-'
        content += f"| {i} | [[{r['note'].replace('.md', '')}\\|{r['title'][:35]}...]] | {title_cn} | {r['note']} | [链接]({r['arxiv']}) |\n"
    
    content += f'''
## 待办事项

- [ ] 浏览今日新增论文
- [ ] 标记感兴趣的方向
- [ ] 深入阅读重点论文

## 备注

<!-- 在这里添加你的备注 -->

---
_由 Echo 自动生成于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}_
'''
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path

if __name__ == "__main__":
    main()
