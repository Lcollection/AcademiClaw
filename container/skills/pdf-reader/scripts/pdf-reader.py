#!/usr/bin/env python3
"""
PDF 阅读器
- PDF 转 Markdown
- 智能摘要
- 关键信息提取
- 问答式学习
"""

import os
import sys
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime

# 配置
PAPERVAULT = r"D:\PaperVault"
PAPERS_DIR = os.path.join(PAPERVAULT, "Papers")
NOTES_DIR = os.path.join(PAPERVAULT, "Notes")
CONFIG_FILE = os.path.join(PAPERVAULT, "config", "translate.json")

def load_config():
    """加载配置"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"enabled": False}

def extract_pdf_text(pdf_path):
    """提取 PDF 文本"""
    try:
        # 尝试使用 PyPDF2
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except ImportError:
        print("⚠️ PyPDF2 未安装，尝试其他方法...")
        
    try:
        # 尝试使用 pdfplumber
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    except ImportError:
        print("❌ 请安装 PyPDF2 或 pdfplumber: pip install PyPDF2")
        return None

def summarize_with_llm(text, config):
    """使用 LLM 总结"""
    if not config.get("enabled") or not config.get("api_key"):
        return None
    
    prompt = f"""请分析以下论文内容，提取关键信息：

{text[:8000]}

请从以下角度总结：
1. 研究动机
2. 核心创新
3. 技术方案
4. 实验结果
5. 局限性

请用中文回答，每部分简洁明了（1-2 句话）。"""

    try:
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": config.get("model", "moonshot-v1-8k"),
            "messages": [{"role": "user", "content": prompt}],
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
            return resp.json()["choices"][0]["message"]["content"]
        else:
            print(f"❌ LLM 调用失败: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ 总结失败: {e}")
        return None

def generate_markdown(pdf_path, text, summary):
    """生成 Markdown 笔记"""
    pdf_name = Path(pdf_path).stem
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    content = f"""---
title: "{pdf_name}"
source: "{pdf_path}"
date_read: {datetime.now().strftime('%Y-%m-%d')}
reading_time: estimated
difficulty: TBD
---

# {pdf_name}

> [!info] 论文信息
> - **文件**: {pdf_path}
> - **阅读时间**: {timestamp}
> - **状态**: 已阅读

## 📝 智能摘要

{summary if summary else '*待补充*'}

## 📄 原文内容

{text}

## 🎯 核心观点

<!-- 在这里记录核心观点 -->

## 💡 我的思考

<!-- 在这里记录你的思考 -->

## ❓ 疑问

<!-- 在这里记录疑问 -->

## 📚 相关论文

<!-- 在这里添加相关论文链接 -->

---
_由 PDF Reader 自动生成于 {timestamp}_
"""
    
    return content

def main():
    parser = argparse.ArgumentParser(description='PDF 阅读器')
    parser.add_argument('--pdf', required=True, help='PDF 文件路径')
    parser.add_argument('--output', help='输出路径（可选）')
    parser.add_argument('--no-summary', action='store_true', help='跳过 LLM 总结')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf):
        print(f"❌ 文件不存在: {args.pdf}")
        return
    
    print(f"📖 正在阅读: {args.pdf}")
    
    # 提取文本
    print("📄 提取文本...")
    text = extract_pdf_text(args.pdf)
    
    if not text:
        print("❌ 文本提取失败")
        return
    
    print(f"✅ 提取了 {len(text)} 个字符")
    
    # 智能总结
    summary = None
    if not args.no_summary:
        print("🤖 生成智能摘要...")
        config = load_config()
        summary = summarize_with_llm(text, config)
        
        if summary:
            print("✅ 摘要生成完成")
        else:
            print("⚠️ 摘要生成跳过")
    
    # 生成 Markdown
    print("📝 生成笔记...")
    markdown = generate_markdown(args.pdf, text, summary)
    
    # 保存
    output_path = args.output
    if not output_path:
        pdf_name = Path(args.pdf).stem
        output_path = os.path.join(PAPERS_DIR, f"{pdf_name}-notes.md")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(markdown)
    
    print(f"\n✅ 笔记已保存: {output_path}")
    
    # 显示摘要
    if summary:
        print(f"\n{'='*60}")
        print("📊 智能摘要")
        print('='*60)
        print(summary)

if __name__ == "__main__":
    main()
