#!/usr/bin/env python3
"""
定时任务调度器 - PaperVault
统一管理所有定时任务
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from pathlib import Path

PAPERVAULT = r"D:\PaperVault"
SCRIPTS_DIR = os.path.join(PAPERVAULT, "scripts")
SCHEDULE_FILE = os.path.join(PAPERVAULT, "data", "schedule-state.json")

TASKS = {
    "daily-search": {
        "script": "daily-search.py",
        "description": "每日论文检索",
        "default_time": "08:00"
    },
    "daily-summary": {
        "script": "daily-summary.py",
        "description": "每日学习总结",
        "default_time": "20:00"
    },
    "weekly-summary": {
        "script": "weekly-summary.py",
        "description": "每周学习总结",
        "default_time": "Thursday 14:00"
    },
    "monthly-report": {
        "script": "monthly-report.py",
        "description": "月度报告",
        "default_time": "月末 20:00"
    },
    "quarterly-report": {
        "script": "quarterly-report.py",
        "description": "季度报告",
        "default_time": "季度末 20:00"
    },
    "yearly-report": {
        "script": "yearly-report.py",
        "description": "年度总结",
        "default_time": "12月31日 20:00"
    }
}

def load_state():
    """加载调度状态"""
    if os.path.exists(SCHEDULE_FILE):
        with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"last_run": {}, "enabled": {}}

def save_state(state):
    """保存调度状态"""
    os.makedirs(os.path.dirname(SCHEDULE_FILE), exist_ok=True)
    with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def run_task(task_name):
    """运行指定任务"""
    if task_name not in TASKS:
        print(f"❌ 未知任务: {task_name}")
        return False
    
    task = TASKS[task_name]
    script_path = os.path.join(SCRIPTS_DIR, task["script"])
    
    if not os.path.exists(script_path):
        print(f"❌ 脚本不存在: {script_path}")
        return False
    
    print(f"\n{'='*60}")
    print(f"🚀 运行任务: {task['description']}")
    print(f"{'='*60}\n")
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=PAPERVAULT,
            capture_output=True,
            text=True,
            timeout=600  # 10分钟超时
        )
        
        if result.stdout:
            print(result.stdout)
        
        if result.returncode != 0:
            print(f"⚠️ 任务返回码: {result.returncode}")
            if result.stderr:
                print(f"错误: {result.stderr}")
            return False
        
        # 更新状态
        state = load_state()
        state["last_run"][task_name] = datetime.now().isoformat()
        save_state(state)
        
        return True
        
    except subprocess.TimeoutExpired:
        print("❌ 任务超时")
        return False
    except Exception as e:
        print(f"❌ 运行失败: {e}")
        return False

def list_tasks():
    """列出所有任务"""
    state = load_state()
    
    print("\n📋 PaperVault 定时任务")
    print("=" * 60)
    
    for name, task in TASKS.items():
        status = "✅ 启用" if state.get("enabled", {}).get(name, True) else "⏸️ 暂停"
        last_run = state.get("last_run", {}).get(name, "从未运行")
        if last_run != "从未运行":
            last_run = datetime.fromisoformat(last_run).strftime("%Y-%m-%d %H:%M")
        
        print(f"\n{task['description']}")
        print(f"  任务ID: {name}")
        print(f"  默认时间: {task['default_time']}")
        print(f"  状态: {status}")
        print(f"  上次运行: {last_run}")
    
    print("\n" + "=" * 60)

def enable_task(task_name, enabled=True):
    """启用/禁用任务"""
    state = load_state()
    if "enabled" not in state:
        state["enabled"] = {}
    state["enabled"][task_name] = enabled
    save_state(state)
    
    status = "启用" if enabled else "禁用"
    print(f"✅ 已{status}任务: {task_name}")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("""
PaperVault 定时任务调度器

用法:
  python schedule.py <command> [task]

命令:
  list              列出所有任务
  run <task>        运行指定任务
  enable <task>     启用任务
  disable <task>    禁用任务
  status            显示状态

任务:
  daily-search      每日论文检索
  daily-summary     每日学习总结
  weekly-summary    每周学习总结
  monthly-report    月度报告
  quarterly-report  季度报告
  yearly-report     年度总结
  all               运行所有任务
""")
        return
    
    command = sys.argv[1]
    
    if command == "list":
        list_tasks()
    
    elif command == "run":
        if len(sys.argv) < 3:
            print("❌ 请指定任务名称")
            return
        
        task_name = sys.argv[2]
        
        if task_name == "all":
            for name in TASKS:
                run_task(name)
        else:
            run_task(task_name)
    
    elif command == "enable":
        if len(sys.argv) < 3:
            print("❌ 请指定任务名称")
            return
        enable_task(sys.argv[2], True)
    
    elif command == "disable":
        if len(sys.argv) < 3:
            print("❌ 请指定任务名称")
            return
        enable_task(sys.argv[2], False)
    
    elif command == "status":
        list_tasks()
    
    else:
        print(f"❌ 未知命令: {command}")

if __name__ == "__main__":
    main()
