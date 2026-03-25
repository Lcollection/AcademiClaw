---
name: API Token Usage Tracker
slug: token-usage-tracker
version: 1.0.0
homepage: https://clawhub.com/skills/token-usage-tracker
description: "追踪和监控 LLM API Token 消耗，实时查看使用量、成本、配额。支持 OpenAI、Kimi、GLM 等多种 API。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F4CA}"
    requires:
      bins: [python]
      llm: false
    os: [win32, darwin, linux]
---

## When to Use

Use this skill when you want to:
- Check how many tokens you've used today/this week/this month
- Monitor API costs and spending
- View remaining quotas
- Track token usage across different models
- Analyze usage patterns

**Triggers:**
- User says "token usage", "API usage", "token 消耗", "API 使用量"
- User asks "how many tokens", "用了多少 token"
- User mentions "API cost", "API 成本", "配额"
- User wants to "check usage", "查看使用量"

## Quick Start

### Check Today's Usage
```
查看今天的 token 使用量
```

### Check Weekly Usage
```
查看本周的 API 使用情况
```

### Check Costs
```
计算本月的 API 成本
```

### Manual Run
```bash
python {workspace}/token-tracker/track-usage.py
```

## Features

### 1. Real-time Tracking
Tracks token usage in real-time:
- Input tokens
- Output tokens
- Total tokens
- Cached tokens (if applicable)

### 2. Cost Calculation
Calculates costs based on:
- Model-specific pricing
- Input/output token rates
- Cache rates (if applicable)
- Currency conversion

### 3. Usage Analytics
Provides insights on:
- Usage trends (daily/weekly/monthly)
- Most used models
- Peak usage times
- Cost distribution

### 4. Quota Monitoring
Monitors quotas:
- Remaining tokens
- Rate limits
- Quota warnings

### 5. Multi-Provider Support
Supports multiple providers:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Kimi (Moonshot)
- GLM (Zhipu AI)
- Custom providers

## Configuration

### Provider Config (config/providers.json)
```json
{
  "providers": {
    "openai": {
      "name": "OpenAI",
      "api_key": "sk-...",
      "base_url": "https://api.openai.com/v1",
      "models": {
        "gpt-4": {
          "input_cost": 0.03,
          "output_cost": 0.06,
          "currency": "USD"
        },
        "gpt-3.5-turbo": {
          "input_cost": 0.0015,
          "output_cost": 0.002,
          "currency": "USD"
        }
      }
    },
    "kimi": {
      "name": "Kimi",
      "api_key": "sk-...",
      "base_url": "https://api.moonshot.cn/v1",
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

### Usage Log Format (data/usage.json)
```json
{
  "usage": [
    {
      "timestamp": "2024-03-25T09:00:00Z",
      "provider": "kimi",
      "model": "moonshot-v1-8k",
      "input_tokens": 1500,
      "output_tokens": 500,
      "total_tokens": 2000,
      "cached_tokens": 0,
      "cost_usd": 0.0024,
      "session_id": "abc123"
    }
  ]
}
```

## Usage Report Example

```markdown
# 📊 API Token 使用报告 - 2024-03-25

## 今日概览

| 指标 | 数值 |
|------|------|
| 总请求数 | 42 |
| 输入 Tokens | 125,000 |
| 输出 Tokens | 35,000 |
| 总 Tokens | 160,000 |
| 成本 (USD) | $3.45 |

## 分模型统计

| 模型 | 请求数 | 输入 | 输出 | 成本 |
|------|--------|------|------|------|
| GPT-4 | 15 | 50K | 10K | $2.10 |
| GPT-3.5 | 20 | 60K | 20K | $0.13 |
| Kimi | 7 | 15K | 5K | $0.22 |

## 分时段统计

```
09:00-12:00: ████████ 40,000 tokens
12:00-15:00: ██████ 30,000 tokens
15:00-18:00: ████████ 35,000 tokens
18:00-21:00: ████████ 35,000 tokens
21:00-24:00: ████ 20,000 tokens
```

## 成本趋势（最近 7 天）

```
03/19: $2.50
03/20: $3.20
03/21: $2.80
03/22: $4.10
03/23: $3.50
03/24: $3.80
03/25: $3.45 ← Today
```

## 配额警告

⚠️ **Kimi API**: 本月已使用 78% 配额
- 已用: 780,000 tokens
- 总配额: 1,000,000 tokens
- 剩余: 220,000 tokens

## 建议

1. 考虑使用 GPT-3.5 替代 GPT-4 以降低成本（简单任务）
2. Kimi API 接近配额上限，建议控制使用
3. 高峰时段 09:00-12:00，可考虑错峰使用
```

## Commands

### Check Usage
```bash
# 今日使用
python track-usage.py --today

# 本周使用
python track-usage.py --week

# 本月使用
python track-usage.py --month

# 自定义时间范围
python track-usage.py --start 2024-03-01 --end 2024-03-25
```

### Check Costs
```bash
# 计算成本
python track-usage.py --calculate-cost

# 按模型分组
python track-usage.py --group-by model

# 按日期分组
python track-usage.py --group-by date
```

### Export Reports
```bash
# 导出为 JSON
python track-usage.py --export json

# 导出为 CSV
python track-usage.py --export csv

# 导出为 Markdown
python track-usage.py --export markdown
```

## Integration with OpenClaw

### Automatic Logging
Automatically logs usage when OpenClaw makes API calls:

```python
# In your OpenClaw config
{
  "hooks": {
    "usage-logger": {
      "enabled": true,
      "log_path": "{workspace}/token-tracker/data/usage.json"
    }
  }
}
```

### Real-time Dashboard
View usage in real-time:
```bash
python dashboard.py --port 8080
```

Then open `http://localhost:8080` in your browser.

## Pricing Reference

### OpenAI (as of 2024)
| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| GPT-4 Turbo | $0.01/1K | $0.03/1K | $0.003/1K | $0.005/1K |
| GPT-4 | $0.03/1K | $0.06/1K | - | - |
| GPT-3.5 Turbo | $0.0005/1K | $0.0015/1K | - | - |

### Kimi (Moonshot)
| Model | Input | Output |
|-------|-------|--------|
| moonshot-v1-8k | ¥0.012/1K | ¥0.012/1K |
| moonshot-v1-32k | ¥0.024/1K | ¥0.024/1K |
| moonshot-v1-128k | ¥0.06/1K | ¥0.06/1K |

### GLM (Zhipu AI)
| Model | Input | Output |
|-------|-------|--------|
| glm-4 | ¥0.1/1K | ¥0.1/1K |
| glm-4-flash | Free | Free |

## Advanced Features

### Budget Alerts
Set budget limits and receive alerts:
```json
{
  "budgets": {
    "daily": 5.00,
    "weekly": 30.00,
    "monthly": 100.00
  },
  "alerts": {
    "email": "your@email.com",
    "webhook": "https://..."
  }
}
```

### Cost Optimization Suggestions
Get AI-powered suggestions to reduce costs:
```
python track-usage.py --optimize
```

### Comparative Analysis
Compare usage across periods:
```
python track-usage.py --compare last-week,this-week
```

## Troubleshooting

### No Usage Data Found
```
Error: No usage data available
```
**Solution**: Ensure usage logging is enabled in OpenClaw config.

### API Key Invalid
```
Error: Cannot fetch quota information
```
**Solution**: Check API key in `config/providers.json`.

### Incorrect Cost Calculation
```
Warning: Cost calculation may be inaccurate
```
**Solution**: Update pricing data in config file.

## Best Practices

1. **Check Daily**: Monitor usage at the end of each day
2. **Set Budgets**: Configure budget alerts to avoid overspending
3. **Optimize Models**: Use cheaper models for simple tasks
4. **Cache Tokens**: Take advantage of caching when available
5. **Review Weekly**: Analyze weekly trends to optimize usage

## Related Skills

- `cost-optimizer` - AI-powered cost optimization
- `quota-manager` - Manage and allocate API quotas
- `usage-analytics` - Advanced usage analytics

## Future Enhancements

- [ ] Web dashboard with real-time charts
- [ ] Slack/Discord notifications
- [ ] Cost prediction based on usage patterns
- [ ] Multi-user support
- [ ] Budget sharing across teams
