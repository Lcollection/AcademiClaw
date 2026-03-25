# Token Usage Tracker Skill

> 📊 追踪和监控 LLM API Token 消耗

## 功能特性

### ✅ 实时追踪
- 记录每次 API 调用的 token 使用量
- 区分输入/输出 tokens
- 计算实际成本

### ✅ 成本计算
- 支持多种模型定价
- 自动汇率转换
- 精确到小数点后 6 位

### ✅ 使用报告
- 每日/每周/每月报告
- 按模型分组统计
- 按提供商分组统计

### ✅ 多提供商支持
- OpenAI (GPT-4, GPT-3.5, etc.)
- Kimi (Moonshot)
- GLM (Zhipu AI)
- 自定义提供商

## 快速开始

### 查看今日使用
```
查看今天的 token 使用量
```

或运行：
```bash
python track-usage.py --today
```

### 查看本周使用
```bash
python track-usage.py --week
```

### 查看本月使用
```bash
python track-usage.py --month
```

## 报告示例

```
============================================================
📊 API Token 使用报告 - TODAY
============================================================

## 📈 概览

| 指标 | 数值 |
|------|------|
| 总请求数 | 1 |
| 输入 Tokens | 2,000 |
| 输出 Tokens | 800 |
| 总 Tokens | 2,800 |
| 成本 (USD) | $0.0048 |

## 🤖 按模型统计

| 模型 | 请求数 | 输入 | 输出 | 成本 |
|------|--------|------|------|------|
| kimi/moonshot-v1-8k | 1 | 2,000 | 800 | $0.0048 |

## 🏢 按提供商统计

| 提供商 | 请求数 | 输入 | 输出 | 成本 |
|--------|--------|------|------|------|
| kimi | 1 | 2,000 | 800 | $0.0048 |

============================================================
```

## 手动记录使用

```bash
python track-usage.py --log kimi moonshot-v1-8k 2000 800 session-001
```

## 配置

### 提供商配置 (config/providers.json)

```json
{
  "providers": {
    "kimi": {
      "name": "Kimi (Moonshot)",
      "models": {
        "moonshot-v1-8k": {
          "input_cost": 0.012,
          "output_cost": 0.012,
          "currency": "CNY"
        }
      }
    }
  }
}
```

### 预算配置

```json
{
  "budgets": {
    "daily_usd": 10.00,
    "weekly_usd": 50.00,
    "monthly_usd": 200.00
  }
}
```

## 定价参考

### OpenAI (2024)
| 模型 | 输入 | 输出 |
|------|------|------|
| GPT-4 Turbo | $0.01/1K | $0.03/1K |
| GPT-4 | $0.03/1K | $0.06/1K |
| GPT-3.5 Turbo | $0.0005/1K | $0.0015/1K |
| GPT-4o | $0.005/1K | $0.015/1K |

### Kimi (Moonshot)
| 模型 | 输入 | 输出 |
|------|------|------|
| moonshot-v1-8k | ¥0.012/1K | ¥0.012/1K |
| moonshot-v1-32k | ¥0.024/1K | ¥0.024/1K |
| moonshot-v1-128k | ¥0.06/1K | ¥0.06/1K |

### GLM (Zhipu AI)
| 模型 | 输入 | 输出 |
|------|------|------|
| glm-4 | ¥0.1/1K | ¥0.1/1K |
| glm-4-flash | 免费 | 免费 |
| glm-5 | 免费（当前）| 免费（当前）|

## 集成到 OpenClaw

### 自动记录

在 OpenClaw 配置中添加 hook:

```json
{
  "hooks": {
    "usage-logger": {
      "enabled": true,
      "script": "D:\\.openclaw\\workspace\\skills\\token-usage-tracker\\scripts\\track-usage.py"
    }
  }
}
```

## 高级功能（计划中）

- [ ] Web 实时仪表板
- [ ] Slack/Discord 通知
- [ ] 成本预测
- [ ] 多用户支持
- [ ] 团队预算共享

## 故障排除

### 没有使用数据
```
Error: No usage data available
```
**解决**: 确保已记录使用数据，或检查 `data/usage.json` 文件。

### 成本计算不准确
```
Warning: Cost calculation may be inaccurate
```
**解决**: 更新 `config/providers.json` 中的定价数据。

## 最佳实践

1. **每日检查**: 每天结束时查看使用情况
2. **设置预算**: 配置预算提醒，避免超支
3. **优化模型**: 简单任务使用更便宜的模型
4. **利用缓存**: 尽可能使用 prompt 缓存
5. **每周回顾**: 分析每周趋势，优化使用

## 相关 Skills

- `cost-optimizer` - AI 驱动的成本优化
- `quota-manager` - API 配额管理
- `usage-analytics` - 高级使用分析

---

*创建于 2026-03-25 by Echo*
