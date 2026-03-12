# NanoClaw 飞书频道技能

[English](README.md)

为 [NanoClaw](https://github.com/anthropics/nanoclaw) 添加[飞书](https://www.feishu.cn/)消息频道支持。直接在飞书中与你的 Claude 助手对话。

## 功能特性

- WebSocket 长连接（无需公网 URL）
- 文本消息收发
- 媒体消息占位符（图片、文件、语音、视频）
- 自动获取发送者姓名（通过飞书通讯录 API）
- 自动获取群组名称（通过飞书群组 API）
- 支持群聊和私聊
- @提及检测
- 完整测试覆盖（24 个测试）

## 前置要求

- 已安装并运行 [NanoClaw](https://github.com/anthropics/nanoclaw)
- 创建了飞书自建应用并启用机器人功能

## 安装

在 NanoClaw 项目目录中运行：

```bash
npx tsx scripts/apply-skill.ts .claude/skills/add-feishu
npm run build
```

或使用 Claude Code 技能命令：

```
/add-feishu
```

## 飞书应用配置

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 点击**创建自建应用**
3. 在**凭证与基础信息**中，复制 **App ID** 和 **App Secret**
4. 在**权限管理**中添加以下权限：
   - `im:message` — 读取和发送消息
   - `im:message.receive_v1` — 接收消息事件
   - `contact:user.base:readonly` — 读取用户基本信息
   - `im:chat:readonly` — 读取群组信息
5. 在**事件订阅**中订阅 `im.message.receive_v1` 事件
6. 在**事件订阅** > **订阅方式**中选择**使用长连接接收事件/回调**
7. 启用**机器人**功能
8. 发布应用

## 环境配置

在 `.env` 文件中添加：

```bash
FEISHU_APP_ID=cli_你的应用ID
FEISHU_APP_SECRET=你的应用密钥
```

重启 NanoClaw，然后在飞书中向机器人发送消息。从日志中获取 Chat ID 并注册。

## 架构说明

本技能遵循 NanoClaw 的频道架构：

```
src/channels/feishu.ts      # FeishuChannel 类（实现 Channel 接口）
src/channels/feishu.test.ts # 单元测试（24 个测试）
src/channels/index.ts       # 自动注册入口（修改以导入 feishu）
```

`FeishuChannel` 类在启动时通过 `registerChannel()` 自动注册。消息通过飞书 WebSocket SDK 接收，并通过 NanoClaw 的标准消息管道路由。

## 技术细节

- **SDK**: `@larksuiteoapi/node-sdk` v1.59.0
- **代码行数**: 238 行（实现）+ 433 行（测试）
- **测试覆盖**: 连接生命周期、消息处理、媒体类型、错误处理
- **JID 格式**: `fs:oc_xxxxxxxx`（飞书 Chat ID）

## 基于

为 [NanoClaw](https://github.com/anthropics/nanoclaw) 构建，作者 Gavriel（MIT 协议）。

## 开源协议

MIT
