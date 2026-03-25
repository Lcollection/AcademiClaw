#!/usr/bin/env python3
"""
API Token 使用追踪器
- 追踪 token 消耗
- 计算成本
- 生成使用报告
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

# 配置
WORKSPACE = r"D:\.openclaw\workspace"
TRACKER_DIR = os.path.join(WORKSPACE, "token-usage-tracker")
CONFIG_FILE = os.path.join(TRACKER_DIR, "config", "providers.json")
DATA_FILE = os.path.join(TRACKER_DIR, "data", "usage.json")

# 默认价格（每 1K tokens，单位：USD）
DEFAULT_PRICING = {
    "openai": {
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006}
    },
    "kimi": {
        "moonshot-v1-8k": {"input": 0.0017, "output": 0.0017},  # ¥0.012 ≈ $0.0017
        "moonshot-v1-32k": {"input": 0.0034, "output": 0.0034},
        "moonshot-v1-128k": {"input": 0.0085, "output": 0.0085}
    },
    "zai": {
        "glm-4": {"input": 0.014, "output": 0.014},  # ¥0.1 ≈ $0.014
        "glm-4-flash": {"input": 0.0, "output": 0.0},  # Free
        "glm-5": {"input": 0.0, "output": 0.0}  # Assume free for now
    }
}

def load_usage_data():
    """加载使用数据"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"usage": []}

def save_usage_data(data):
    """保存使用数据"""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def log_usage(provider, model, input_tokens, output_tokens, session_id=None):
    """记录使用"""
    data = load_usage_data()
    
    # 计算成本
    cost_usd = calculate_cost(provider, model, input_tokens, output_tokens)
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "provider": provider,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "cost_usd": cost_usd,
        "session_id": session_id
    }
    
    data["usage"].append(entry)
    save_usage_data(data)
    
    return entry

def calculate_cost(provider, model, input_tokens, output_tokens):
    """计算成本"""
    pricing = DEFAULT_PRICING.get(provider, {}).get(model, {"input": 0, "output": 0})
    
    input_cost = (input_tokens / 1000) * pricing.get("input", 0)
    output_cost = (output_tokens / 1000) * pricing.get("output", 0)
    
    return round(input_cost + output_cost, 6)

def get_usage_report(period="today"):
    """获取使用报告"""
    data = load_usage_data()
    
    # 确定时间范围
    now = datetime.now()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=365)  # All time
    
    # 过滤数据
    usage = []
    for entry in data["usage"]:
        try:
            entry_time = datetime.fromisoformat(entry["timestamp"])
        except:
            continue
        
        if entry_time >= start:
            usage.append(entry)
    
    # 统计
    stats = {
        "period": period,
        "total_requests": len(usage),
        "total_input_tokens": sum(e["input_tokens"] for e in usage),
        "total_output_tokens": sum(e["output_tokens"] for e in usage),
        "total_tokens": sum(e["total_tokens"] for e in usage),
        "total_cost_usd": sum(e["cost_usd"] for e in usage),
        "by_model": defaultdict(lambda: {"requests": 0, "input": 0, "output": 0, "cost": 0}),
        "by_provider": defaultdict(lambda: {"requests": 0, "input": 0, "output": 0, "cost": 0})
    }
    
    for entry in usage:
        model_key = f"{entry['provider']}/{entry['model']}"
        stats["by_model"][model_key]["requests"] += 1
        stats["by_model"][model_key]["input"] += entry["input_tokens"]
        stats["by_model"][model_key]["output"] += entry["output_tokens"]
        stats["by_model"][model_key]["cost"] += entry["cost_usd"]
        
        stats["by_provider"][entry['provider']]["requests"] += 1
        stats["by_provider"][entry['provider']]["input"] += entry["input_tokens"]
        stats["by_provider"][entry['provider']]["output"] += entry["output_tokens"]
        stats["by_provider"][entry['provider']]["cost"] += entry["cost_usd"]
    
    return stats

def format_report(stats):
    """格式化报告"""
    report = []
    report.append(f"\n{'='*60}")
    report.append(f"📊 API Token 使用报告 - {stats['period'].upper()}")
    report.append(f"{'='*60}\n")
    
    # 概览
    report.append("## 📈 概览\n")
    report.append(f"| 指标 | 数值 |")
    report.append(f"|------|------|")
    report.append(f"| 总请求数 | {stats['total_requests']:,} |")
    report.append(f"| 输入 Tokens | {stats['total_input_tokens']:,} |")
    report.append(f"| 输出 Tokens | {stats['total_output_tokens']:,} |")
    report.append(f"| 总 Tokens | {stats['total_tokens']:,} |")
    report.append(f"| 成本 (USD) | ${stats['total_cost_usd']:.4f} |")
    report.append("")
    
    # 按模型统计
    if stats["by_model"]:
        report.append("## 🤖 按模型统计\n")
        report.append("| 模型 | 请求数 | 输入 | 输出 | 成本 |")
        report.append("|------|--------|------|------|------|")
        
        for model, data in sorted(stats["by_model"].items(), key=lambda x: x[1]["cost"], reverse=True):
            report.append(
                f"| {model} | {data['requests']:,} | "
                f"{data['input']:,} | {data['output']:,} | "
                f"${data['cost']:.4f} |"
            )
        report.append("")
    
    # 按提供商统计
    if stats["by_provider"]:
        report.append("## 🏢 按提供商统计\n")
        report.append("| 提供商 | 请求数 | 输入 | 输出 | 成本 |")
        report.append("|--------|--------|------|------|------|")
        
        for provider, data in sorted(stats["by_provider"].items(), key=lambda x: x[1]["cost"], reverse=True):
            report.append(
                f"| {provider} | {data['requests']:,} | "
                f"{data['input']:,} | {data['output']:,} | "
                f"${data['cost']:.4f} |"
            )
        report.append("")
    
    report.append(f"{'='*60}\n")
    
    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='API Token 使用追踪器')
    parser.add_argument('--today', action='store_true', help='查看今日使用')
    parser.add_argument('--week', action='store_true', help='查看本周使用')
    parser.add_argument('--month', action='store_true', help='查看本月使用')
    parser.add_argument('--all', action='store_true', help='查看所有使用')
    parser.add_argument('--log', nargs=5, metavar=('PROVIDER', 'MODEL', 'INPUT', 'OUTPUT', 'SESSION'),
                       help='记录使用: provider model input_tokens output_tokens session_id')
    
    args = parser.parse_args()
    
    if args.log:
        provider, model, input_tok, output_tok, session_id = args.log
        entry = log_usage(provider, model, int(input_tok), int(output_tok), session_id)
        print(f"✅ 已记录: {entry['total_tokens']} tokens, ${entry['cost_usd']:.6f}")
        return
    
    # 确定时间范围
    period = "today"
    if args.week:
        period = "week"
    elif args.month:
        period = "month"
    elif args.all:
        period = "all"
    
    # 获取报告
    stats = get_usage_report(period)
    report = format_report(stats)
    
    print(report)

if __name__ == "__main__":
    main()
