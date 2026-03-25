# 使用指南

## 当前配置

你的 PaperVault 已经配置完成！定时任务已设置为：

| 任务 | 时间 | 状态 |
|------|------|------|
| 每日论文检索 | 08:00 | ✅ 已配置 |
| 每日学习总结 | 20:00 | ✅ 已配置 |
| 每周学习总结 | 周四 14:00 | ✅ 已配置 |
| 月度报告 | 月末 20:00 | ✅ 已配置 |
| 季度报告 | 季末 20:00 | ✅ 已配置 |
| 年度总结 | 12/31 20:00 | ✅ 已配置 |

## 配置文件位置

- **检索关键词**: `D:\PaperVault\config\keywords.json`
- **翻译 API**: `D:\PaperVault\config\translate.json` (已配置 Kimi API)
- **脚本目录**: `D:\PaperVault\scripts\`
- **报告目录**: `D:\PaperVault\reports\`

## 手动运行

```bash
# 运行论文检索
python D:\PaperVault\scripts\daily-search.py

# 生成每日总结
python D:\PaperVault\scripts\daily-summary.py

# 生成本周总结
python D:\PaperVault\scripts\weekly-summary.py
```

## 查看结果

- **每日报告**: `D:\PaperVault\reports\daily\`
- **论文笔记**: `D:\PaperVault\Papers\`
- **运行日志**: `D:\PaperVault\logs\`

## 修改关键词

编辑 `D:\PaperVault\config\keywords.json`:

```json
{
  "keywords": ["your research keywords here"],
  "max_papers_per_day": 15,
  "auto_import": true
}
```

## 修改翻译配置

编辑 `D:\PaperVault\config\translate.json`:

```json
{
  "provider": "kimi",
  "api_key": "your-api-key",
  "base_url": "https://api.moonshot.cn/v1",
  "model": "moonshot-v1-8k",
  "enabled": true
}
```

## 故障排除

### 没有新论文
1. 检查关键词是否匹配你的研究领域
2. 检查网络连接
3. 检查日志: `D:\PaperVault\logs\daily-search.log`

### 翻译失败
1. 检查 API key 是否正确
2. 检查 API 配额
3. 检查 `enabled` 是否为 `true`

### Zotero 导入失败
1. 确保 Zotero 正在运行
2. 检查 Connector 是否启用 (localhost:23119)

## 定时任务管理

### 查看所有任务
```
/cron list
```

### 手动触发任务
```
/cron run <job-id>
```

### 禁用/启用任务
```
/cron update <job-id> enabled=false
/cron update <job-id> enabled=true
```

## 技巧

### 临时增加检索量
```bash
python D:\PaperVault\scripts\daily-search.py --max 30
```

### 检索特定主题
```bash
python D:\PaperVault\scripts\daily-search.py --keywords "quantum computing,quantum ML"
```

### 重新生成某天的报告
```bash
python D:\PaperVault\scripts\daily-summary.py --date 2024-03-25
```
