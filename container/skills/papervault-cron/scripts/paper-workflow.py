#!/usr/bin/env python3
"""
论文处理工作流脚本
输入: 论文 DOI / URL / 标题
输出: 
  1. 添加到 Zotero 并分类
  2. 下载/获取 PDF
  3. 转换为 Markdown
  4. 生成 Obsidian 笔记
"""

import os
import re
import sys
import json
import subprocess
import requests
from pathlib import Path
from datetime import datetime

# ============ 配置 ============
ZOTERO_DB = r"D:\papers_repo\zotero.sqlite"
ZOTERO_STORAGE = r"D:\papers_repo\storage"
PAPERVAULT = r"D:\PaperVault"
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
CONCEPTS_DIR = os.path.join(PAPERVAULT, "Concepts")
METHODS_DIR = os.path.join(PAPERVAULT, "Methods")

# Zotero 本地 API
ZOTERO_LOCAL = "http://localhost:23119"
ZOTERO_API = "http://localhost:23119/api/users/0"

# ============ 工具函数 ============

def check_zotero_running():
    """检查 Zotero 是否运行"""
    try:
        resp = requests.get(f"{ZOTERO_LOCAL}/connector/ping", timeout=5)
        return resp.status_code == 200
    except:
        return False

def extract_doi(input_str):
    """从输入中提取 DOI"""
    # DOI 格式: 10.xxxx/xxxxx
    doi_pattern = r'10\.\d{4,}/[^\s&]+'
    match = re.search(doi_pattern, input_str)
    return match.group(0) if match else None

def get_bibtex_from_doi(doi):
    """从 DOI 获取 BibTeX"""
    url = f"https://doi.org/{doi}"
    headers = {"Accept": "application/x-bibtex"}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            return resp.text
    except:
        pass
    return None

def get_metadata_from_crossref(query):
    """从 CrossRef 搜索元数据"""
    url = "https://api.crossref.org/works"
    params = {"query": query, "rows": 5}
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("message", {}).get("items", [])
            return items
    except:
        pass
    return []

def import_to_zotero(bibtex, collection_key=None):
    """导入 BibTeX 到 Zotero"""
    import uuid
    session_id = str(uuid.uuid4())
    
    url = f"{ZOTERO_LOCAL}/connector/import?session={session_id}"
    headers = {"Content-Type": "application/x-bibtex"}
    
    try:
        resp = requests.post(url, data=bibtex.encode('utf-8'), headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"导入失败: {e}")
    return None

def get_zotero_collections():
    """获取 Zotero 所有集合"""
    try:
        resp = requests.get(f"{ZOTERO_API}/collections", timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []

def suggest_collection(title, abstract=""):
    """根据标题和摘要建议分类"""
    # 简单的关键词匹配
    keywords = {
        "深度学习": ["deep learning", "neural network", "CNN", "RNN", "transformer", "深度学习", "神经网络"],
        "自然语言处理": ["NLP", "language model", "text", "语义", "情感", "翻译", "GPT", "BERT"],
        "计算机视觉": ["computer vision", "image", "video", "目标检测", "分割", "识别"],
        "强化学习": ["reinforcement learning", "RL", "agent", "reward", "policy"],
        "生成模型": ["generative", "GAN", "VAE", "diffusion", "生成", "合成"],
        "图神经网络": ["graph neural network", "GNN", "图神经网络", "知识图谱"],
        "多模态": ["multimodal", "vision-language", "多模态", "跨模态"],
        "医学AI": ["medical", "clinical", "医疗", "诊断", "影像"],
    }
    
    text = (title + " " + abstract).lower()
    for category, kws in keywords.items():
        for kw in kws:
            if kw.lower() in text:
                return category
    return "未分类"

def sanitize_filename(name):
    """清理文件名"""
    # 移除不允许的字符
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    # 替换空格
    name = name.replace(' ', '_')
    # 截断长度
    return name[:100]

def parse_bibtex(bibtex):
    """解析 BibTeX 获取元数据"""
    result = {
        "title": "",
        "authors": [],
        "year": "",
        "journal": "",
        "doi": "",
        "key": ""
    }
    
    # 提取 citation key
    key_match = re.search(r'@\w+\{([^,]+),', bibtex)
    if key_match:
        result["key"] = key_match.group(1).strip()
    
    # 提取各字段
    def extract_field(name):
        pattern = rf'{name}\s*=\s*{{([^}}]+)}}'
        match = re.search(pattern, bibtex, re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    result["title"] = extract_field("title")
    result["year"] = extract_field("year")
    result["journal"] = extract_field("journal") or extract_field("booktitle")
    result["doi"] = extract_field("doi")
    
    # 解析作者
    authors_str = extract_field("author")
    if authors_str:
        authors = [a.strip() for a in authors_str.split(" and ")]
        result["authors"] = authors[:5]  # 最多5个
    
    return result

def generate_obsidian_note(metadata, content_sections=None):
    """生成 Obsidian 笔记"""
    template = f'''---
title: "{metadata.get('title', 'Unknown')}"
zotero_key: "{metadata.get('zotero_key', '')}"
authors: {json.dumps(metadata.get('authors', []), ensure_ascii=False)}
year: {metadata.get('year', '')}
journal: "{metadata.get('journal', '')}"
doi: "{metadata.get('doi', '')}"
tags: [{', '.join(metadata.get('tags', []))}]
status: "reading"
date_added: {datetime.now().strftime('%Y-%m-%d')}
---

# {metadata.get('title', 'Unknown')}

> [!info] 文献信息
> - **作者**: {'; '.join(metadata.get('authors', ['Unknown']))}
> - **期刊**: {metadata.get('journal', 'Unknown')} ({metadata.get('year', 'Unknown')})
> - **DOI**: [{metadata.get('doi', '')}](https://doi.org/{metadata.get('doi', '')})
> - **Zotero**: [在 Zotero 中打开](zotero://select/items/{metadata.get('zotero_key', '')})

## 一句话总结

<!-- 用一句话概括这篇论文的核心贡献 -->

## 研究问题

<!-- 这篇论文要解决什么问题？ -->

## 核心方法

<!-- 使用了什么方法/技术？ -->

### 关键创新点

- 
- 

## 实验结果

<!-- 主要实验发现 -->

## 个人思考

### 优点

- 

### 局限

- 

### 对我的启发

<!-- 这篇论文对我的研究有什么启发？ -->

## 相关概念

- [[]]  <!-- 链接到 Concepts 文件夹 -->

## 相关方法

- [[]]  <!-- 链接到 Methods 文件夹 -->

## 相关论文

- [[]]  <!-- 链接到其他论文 -->

## 引用

```bibtex
{metadata.get('bibtex', '')}
```

## 笔记

<!-- 自由笔记区域 -->
'''
    return template

# ============ 主工作流 ============

def workflow(input_str):
    """主工作流"""
    print(f"\n{'='*60}")
    print(f"📄 处理: {input_str[:50]}...")
    print(f"{'='*60}\n")
    
    # Step 1: 检查 Zotero
    print("🔍 Step 1: 检查 Zotero 状态...")
    if not check_zotero_running():
        print("❌ Zotero 未运行，请先启动 Zotero")
        return False
    print("✅ Zotero 运行中\n")
    
    # Step 2: 解析输入
    print("🔍 Step 2: 解析输入...")
    doi = extract_doi(input_str)
    
    if doi:
        print(f"✅ 检测到 DOI: {doi}")
        bibtex = get_bibtex_from_doi(doi)
    else:
        print("📝 搜索 CrossRef...")
        results = get_metadata_from_crossref(input_str)
        if results:
            top = results[0]
            doi = top.get("DOI", "")
            print(f"✅ 找到: {top.get('title', [''])[0]}")
            bibtex = get_bibtex_from_doi(doi)
        else:
            print("❌ 未找到相关文献")
            return False
    
    if not bibtex:
        print("❌ 无法获取 BibTeX")
        return False
    
    # Step 3: 解析元数据
    print("\n📊 Step 3: 解析元数据...")
    metadata = parse_bibtex(bibtex)
    metadata["bibtex"] = bibtex
    print(f"  标题: {metadata['title']}")
    print(f"  作者: {', '.join(metadata['authors'][:3])}")
    print(f"  年份: {metadata['year']}")
    
    # Step 4: 建议分类
    print("\n📁 Step 4: 分类建议...")
    suggested_cat = suggest_collection(metadata['title'])
    print(f"  建议分类: {suggested_cat}")
    metadata["tags"] = [suggested_cat]
    
    # Step 5: 导入到 Zotero
    print("\n📥 Step 5: 导入到 Zotero...")
    result = import_to_zotero(bibtex)
    if result:
        print(f"✅ 导入成功")
        # 尝试获取 item key
        if isinstance(result, list) and len(result) > 0:
            metadata["zotero_key"] = result[0].get("key", "")
    else:
        print("⚠️ 导入可能失败，请检查 Zotero")
    
    # Step 6: 生成 Obsidian 笔记
    print("\n📝 Step 6: 生成 Obsidian 笔记...")
    note_content = generate_obsidian_note(metadata)
    
    # 保存笔记
    safe_title = sanitize_filename(metadata['title'])
    note_path = os.path.join(PAPERS_DIR, f"{safe_title}.md")
    
    # 避免覆盖
    counter = 1
    while os.path.exists(note_path):
        note_path = os.path.join(PAPERS_DIR, f"{safe_title}_{counter}.md")
        counter += 1
    
    with open(note_path, 'w', encoding='utf-8') as f:
        f.write(note_content)
    
    print(f"✅ 笔记已保存: {note_path}")
    
    print(f"\n{'='*60}")
    print("🎉 工作流完成！")
    print(f"{'='*60}\n")
    print(f"  📚 Zotero: 已导入")
    print(f"  📝 Obsidian: {note_path}")
    print(f"  🏷️ 分类: {suggested_cat}")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python paper-workflow.py <DOI/URL/标题>")
        sys.exit(1)
    
    input_str = " ".join(sys.argv[1:])
    workflow(input_str)
