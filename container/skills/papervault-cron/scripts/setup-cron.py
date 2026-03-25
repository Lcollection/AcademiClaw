#!/usr/bin python3
"""
自动配置 OpenClaw 定时任务
"""
import json
import os

# PaperVault 路径
PAPERVAULT = r"D:\PaperVault"
SCRIPTS_DIR = os.path.join(PAPERVAULT, "scripts")

# 定时任务配置
CRON_JOBS = [
    {
        "name": "每日论文检索",
        "schedule": {"kind": "cron", "expr": "0 8 * * *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\daily-search.py 进行每日论文检索"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "每日学习总结",
        "schedule": {"kind": "cron", "expr": "0 20 * * *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\daily-summary.py 进行每日学习总结"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "每周学习总结",
        "schedule": {"kind": "cron", "expr": "0 14 * * 4", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\weekly-summary.py 进行每周学习总结"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "月度报告",
        "schedule": {"kind": "cron", "expr": "0 20 28-31 * *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\monthly-report.py 生成月度报告（检查是否为月末最后一天）"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "季度报告-3月",
        "schedule": {"kind": "cron", "expr": "0 20 31 3 *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\quarterly-report.py 生成Q1季度报告"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "季度报告-6月",
        "schedule": {"kind": "cron", "expr": "0 20 30 6 *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\quarterly-report.py 生成Q2季度报告"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "季度报告-9月",
        "schedule": {"kind": "cron", "expr": "0 20 30 9 *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\quarterly-report.py 生成Q3季度报告"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "季度报告-12月",
        "schedule": {"kind": "cron", "expr": "0 20 31 12 *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\quarterly-report.py 生成Q4季度报告"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    },
    {
        "name": "年度总结",
        "schedule": {"kind": "cron", "expr": "0 20 31 12 *", "tz": "Asia/Shanghai"},
        "payload": {"kind": "agentTurn", "message": f"运行 {SCRIPTS_DIR}\\yearly-report.py 生成年度总结"},
        "sessionTarget": "isolated",
        "delivery": {"mode": "none"},
        "enabled": True
    }
]

def generate_cron_config():
    """生成 cron.json 配置文件"""
    config = {
        "jobs": CRON_JOBS
    }
    
    output_path = os.path.join(PAPERVAULT, "cron.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 已生成: {output_path}")
    return output_path

def print_manual_instructions():
    """打印手动配置说明"""
    print("\n" + "="*60)
    print("手动配置定时任务")
    print("="*60)
    print("\n在 OpenClaw 中逐个添加以下定时任务:\\n")
    
    for job in CRON_JOBS:
        print(f"\n### {job['name']}")
        print(f"- Cron 表达式: `{job['schedule']['expr']}`")
        print(f"- 时区: {job['schedule']['tz']}")
        print(f"- 消息: {job['payload']['message']}")
    
    print("\n" + "="*60)
    print("或使用 OpenClaw 的 cron 工具:")
    print("  /cron list")
    print("  /cron add \"任务名\" \"cron表达式\" \"消息\"")
    print("="*60)

def main():
    print("="*60)
    print("PaperVault 定时任务配置")
    print("="*60)
    
    # 生成配置文件
    config_path = generate_cron_config()
    
    # 打印手动配置说明
    print_manual_instructions()
    
    print(f"\n💡 提示: 配置文件已保存到 {config_path}")
    print("   你可以直接将此文件内容导入到 OpenClaw 的 cron 系统中")

if __name__ == "__main__":
    main()
