# OpenClaw vs NanoClaw 架构差异详细分析

## 目录

1. [概述](#概述)
2. [核心理念差异](#核心理念差异)
3. [架构对比图](#架构对比图)
4. [详细架构分析](#详细架构分析)
5. [组件对比](#组件对比)
6. [插件系统](#插件系统)
7. [安全模型](#安全模型)
8. [数据流对比](#数据流对比)
9. [内存管理](#内存管理)
10. [可扩展性](#可扩展性)

---

## 概述

| 特性 | OpenClaw | NanoClaw | AcademiClaw |
|------|----------|----------|-------------|
| **定位** | 企业级/个人助理框架 | 轻量级个人助理 | 学术聚焦的极简助理 |
| **代码规模** | ~50万行代码 | ~500行核心代码 | 基于 NanoClaw |
| **依赖数量** | 70+ 依赖 | 最小依赖 | 与 NanoClaw 相同 |
| **配置文件** | 53个配置文件 | 零配置（代码定制） | 零配置（代码定制） |
| **安全模型** | 应用层权限检查 | OS级容器隔离 | OS级容器隔离 |
| **插件系统** | 完整插件API + 钩子 | Claude Code Skills | Claude Code Skills |

---

## 核心理念差异

### OpenClaw 理念

```
"功能丰富，配置驱动"
├── 多通道支持 (20+ 通道)
├── 插件生态系统
├── Web UI + 移动应用
├── 企业级功能 (Canvas, Browser, Nodes)
└── 配置文件驱动行为
```

**核心特点：**
- **大而全**：支持几乎所有主流消息平台
- **可配置**：通过 JSON 配置文件控制行为
- **插件化**：完整的插件 API 和钩子系统
- **多客户端**：Gateway + CLI + WebChat + macOS/iOS/Android 应用

### NanoClaw 理念

```
"小而美，代码驱动"
├── 单一进程架构
├── 容器隔离安全
├── 通道自注册
├── Claude Code Skills
└── 代码即配置
```

**核心特点：**
- **极简主义**：核心代码仅 500 行
- **安全第一**：容器隔离而非权限检查
- **可理解**：代码量小到可以完全理解
- **AI 原生**：Claude Code 引导一切

### AcademiClaw 理念

```
"学术聚焦，最小化定制"
├── 基于 NanoClaw
├── 学术工作流优化
├── 最小化安装
└── 教育导向
```

---

## 架构对比图

### OpenClaw 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OpenClaw Gateway                               │
│                       (WebSocket 控制平面)                               │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Plugins    │  │   Channels   │  │    Agents    │  │   Tools     │ │
│  │   (插件系统)  │  │  (20+ 通道)  │  │  (多Agent)   │  │ (Browser等) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        Pi Agent Runtime (RPC)                        │ │
│  │                    (Claude Agent SDK 集成)                          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
           │                              │                    │
           ▼                              ▼                    ▼
    ┌──────────┐                    ┌──────────┐       ┌──────────┐
    │   CLI    │                    │ WebChat  │       │ App Nodes│
    │  (命令行) │                    │  (Web界面)│       │(移动应用) │
    └──────────┘                    └──────────┘       └──────────┘

    钩子系统:
    - before_agent_start
    - agent_end
    - before_prompt_build
    - after_tool_call
    - pre_compact
    ...
```

### NanoClaw / AcademiClaw 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Single Node.js Process                           │
│                          (src/index.ts)                                 │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Channels   │  │Group Queue   │  │   Router     │  │   IPC       │ │
│  │ (自注册系统)  │  │ (消息队列)   │  │  (消息路由)   │  │ (进程通信)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        Container Runner                              │ │
│  │              (Docker/Apple Container 隔离)                          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    ┌──────────┐                    ┌──────────────────────┐
    │  SQLite  │                    │  Container Agent     │
    │ (消息DB) │                    │ (Claude Agent SDK)   │
    └──────────┘                    └──────────────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │ MCP Server  │
                                          │ (工具接口)   │
                                          └─────────────┘

    无钩子系统 - 直接函数调用
```

---

## 详细架构分析

### 1. 控制流差异

#### OpenClaw: WebSocket 控制平面

```typescript
// OpenClaw 使用 WebSocket 作为统一控制平面
Gateway (ws://127.0.0.1:18789)
    ├── CLI 客户端
    ├── WebChat UI
    ├── macOS 应用
    ├── iOS 节点
    ├── Android 节点
    └── 插件系统

// 消息通过 WebSocket 协议路由
interface GatewayMessage {
  type: 'agent_request' | 'tool_call' | 'event' | 'response';
  session_id: string;
  payload: unknown;
}
```

**特点：**
- 所有客户端通过 WebSocket 连接到 Gateway
- 统一的消息协议
- 支持多客户端并发
- 实时双向通信

#### NanoClaw: 直接函数调用 + SQLite 队列

```typescript
// NanoClaw 使用直接函数调用和文件系统 IPC
// src/index.ts - 核心消息循环

async function startMessageLoop(): Promise<void> {
  while (true) {
    // 1. 从 SQLite 获取新消息
    const { messages, newTimestamp } = getNewMessages(...);

    // 2. 按群组分组
    const messagesByGroup = groupByChatJid(messages);

    // 3. 处理每个群组的消息
    for (const [chatJid, groupMessages] of messagesByGroup) {
      const formatted = formatMessages(groupMessages);

      // 4. 发送到容器或排队等待
      if (queue.sendMessage(chatJid, formatted)) {
        // 管道到活动容器
      } else {
        // 排队等待新容器
        queue.enqueueMessageCheck(chatJid);
      }
    }

    await sleep(POLL_INTERVAL);
  }
}
```

**特点：**
- 单一进程处理所有逻辑
- SQLite 作为消息队列
- 文件系统 IPC (命名管道)
- 简单的轮询机制

### 2. 通道系统差异

#### OpenClaw: 统一通道接口

```typescript
// OpenClaw 通道架构
interface Channel {
  id: string;
  type: 'whatsapp' | 'telegram' | 'slack' | ...;

  // 统一的消息接口
  send(message: Message): Promise<void>;
  subscribe(handler: Handler): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // 元数据
  metadata: ChannelMetadata;
}

// 20+ 支持的通道
const CHANNEL_TYPES = [
  'whatsapp', 'telegram', 'slack', 'discord',
  'google_chat', 'signal', 'imessage', 'irc',
  'microsoft_teams', 'matrix', 'feishu', 'line',
  'mattermost', 'nextcloud_talk', 'nostr', ...
];
```

#### NanoClaw: 自注册通道工厂

```typescript
// NanoClaw 通道架构 (src/channels/registry.ts)
type ChannelFactory = (opts: ChannelOptions) => Channel | null;

// 通道通过工厂函数自注册
const channelFactories = new Map<string, ChannelFactory>();

export function registerChannel(
  name: string,
  factory: ChannelFactory
): void {
  channelFactories.set(name, factory);
}

// 启动时自动发现并连接有凭据的通道
for (const [name, factory] of channelFactories) {
  const channel = factory(channelOpts);
  if (channel) {
    channels.push(channel);
    await channel.connect();
  }
}
```

**差异对比：**

| 方面 | OpenClaw | NanoClaw |
|------|----------|----------|
| **注册方式** | 配置文件声明 | 工厂函数自注册 |
| **凭据管理** | Gateway 统一管理 | 环境变量 + 自动检测 |
| **通道数量** | 20+ 内置 | 按需 Skills 添加 |
| **扩展性** | 需修改核心代码 | 添加 Skill 即可 |

### 3. Agent 运行时差异

#### OpenClaw: Pi Agent RPC

```typescript
// OpenClaw Pi Agent Runtime
class PiAgentRuntime {
  // RPC 模式运行
  async runRPC(params: {
    prompt: string;
    tools: Tool[];
    hooks: Hook[];
    session: Session;
  }): Promise<AsyncIterable<Result>> {

    // 钩子系统干预
    for (const hook of hooks.before_agent_start) {
      await hook.execute(params);
    }

    // 运行 Agent
    for await (const result of this.agent.stream(params)) {
      // 后置钩子
      for (const hook of hooks.after_tool_call) {
        await hook.execute(result);
      }
      yield result;
    }

    // 结束钩子
    for (const hook of hooks.agent_end) {
      await hook.execute(finalState);
    }
  }
}
```

**特点：**
- RPC 模式与 Gateway 通信
- 丰富的钩子系统
- 工具流式传输
- 内置会话管理

#### NanoClaw: 容器隔离

```typescript
// NanoClaw Container Runner (src/container-runner.ts)
export async function runContainerAgent(
  group: RegisteredGroup,
  input: ContainerInput,
  onProcess: (proc: ChildProcess, containerName: string) => void,
  onOutput?: (output: ContainerOutput) => Promise<void>,
): Promise<ContainerOutput> {

  // 1. 构建卷挂载
  const mounts = buildVolumeMounts(group, input.isMain);
  //    - 主组: 项目根 (只读) + 群组文件夹 (读写)
  //    - 其他组: 仅群组文件夹 (读写) + 全局 (只读)

  // 2. 启动容器
  const container = spawn(CONTAINER_RUNTIME_BIN, [
    'run', '-i', '--rm',
    ...mountArgs,
    CONTAINER_IMAGE
  ]);

  // 3. 通过 stdin 传递配置 (包括密钥)
  container.stdin.write(JSON.stringify(input));

  // 4. 流式解析输出
  container.stdout.on('data', (data) => {
    // 解析 OUTPUT_START/END 标记对
    parseAndStreamOutput(data, onOutput);
  });

  // 5. 超时控制
  setTimeout(() => stopContainer(containerName), timeout);
}
```

**特点：**
- 容器级别隔离
- 文件系统沙盒
- 通过 stdin/stdout 通信
- 简单的标记协议

---

## 组件对比

### 消息存储

| 组件 | OpenClaw | NanoClaw |
|------|----------|----------|
| **主存储** | Pi Agent 内部 | SQLite |
| **会话存储** | Gateway 管理 | SQLite + 文件系统 |
| **消息格式** | JSONL | SQLite 表 |
| **持久化** | Gateway 负责 | src/db.ts |

### OpenClaw 数据库结构

```typescript
// OpenClaw 会话模型
interface Session {
  session_id: string;
  agent_id: string;
  created_at: Date;
  updated_at: Date;
  messages: Message[];
  metadata: SessionMetadata;

  // 会话操作
  activate(): void;
  deactivate(): void;
  reset(): void;
  compact(): Promise<Summary>;
}
```

### NanoClaw 数据库结构

```sql
-- NanoClaw SQLite 表结构

-- 消息表
CREATE TABLE messages (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_jid TEXT NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  is_from_me BOOLEAN,
  is_bot_message BOOLEAN
);

-- 注册群组表
CREATE TABLE registered_groups (
  jid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  folder TEXT NOT NULL,
  trigger TEXT NOT NULL,
  channel TEXT NOT NULL,
  is_main BOOLEAN,
  requires_trigger BOOLEAN
);

-- 会话状态表
CREATE TABLE router_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 计划任务表
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  group_folder TEXT NOT NULL,
  prompt TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  schedule_value TEXT NOT NULL,
  status TEXT NOT NULL,
  next_run TEXT
);
```

---

## 插件系统

### OpenClaw 插件架构

```typescript
// OpenClaw 插件接口
interface OpenClawPlugin {
  name: string;
  version: string;

  // 生命周期钩子
  onLoad(): Promise<void>;
  onUnload(): Promise<void>;

  // 事件钩子
  hooks: {
    before_agent_start?: HookCallback;
    agent_end?: HookCallback;
    before_prompt_build?: HookCallback;
    after_tool_call?: HookCallback;
    pre_compact?: HookCallback;
    // ... 更多钩子
  };

  // 工具定义
  tools?: ToolDefinition[];

  // 配置 Schema
  config?: JSONSchema;
}

// 插件加载器
class PluginLoader {
  async load(pluginPath: string): Promise<OpenClawPlugin> {
    const plugin = await import(pluginPath);
    await plugin.onLoad();

    // 注册钩子
    for (const [event, hook] of Object.entries(plugin.hooks)) {
      this.hookRegistry.register(event, hook);
    }

    // 注册工具
    for (const tool of plugin.tools || []) {
      this.toolRegistry.register(tool);
    }

    return plugin;
  }
}
```

**示例：memory-lancedb-pro 插件**

```typescript
// memory-lancedb-pro 作为 OpenClaw 插件
const plugin: OpenClawPlugin = {
  name: 'memory-lancedb-pro',
  version: '1.0.0',

  hooks: {
    // Agent 启动前自动回忆
    before_agent_start: async (input) => {
      const memories = await recall(input.prompt);
      return {
        hookSpecificOutput: {
          injected_context: `<relevant-memories>\n${memories}\n</relevant-memories>`
        }
      };
    },

    // Agent 结束后自动捕获
    agent_end: async (result) => {
      const extracted = extractMemories(result.conversation);
      await storeMemories(extracted);
    }
  },

  tools: [
    {
      name: 'memory_store',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          category: { type: 'string' },
          importance: { type: 'number' }
        }
      }
    },
    {
      name: 'memory_recall',
      input_schema: { ... }
    }
  ]
};
```

### NanoClaw Skills 系统

```markdown
# NanoClaw Skills (.claude/skills/*/SKILL.md)

---
name: add-whatsapp
description: Add WhatsApp as a channel
---

# Add WhatsApp Channel

## Phase 1: Pre-flight
### Check if already configured
```bash
grep -q "WHATSAPP_AUTH=" .env 2>/dev/null && echo "Configured" || echo "Not configured"
```

## Phase 2: Verify Code
```bash
test -f src/channels/whatsapp.ts && echo "WhatsApp channel exists" || echo "Installing..."
```

## Phase 3: Authentication
Tell the user:
> I need you to create a WhatsApp app:
> 1. Go to https://developers.facebook.com/apps
> ...
```

**特点：**
- 使用自然语言描述步骤
- Claude Code 解析并执行
- 无需编写插件代码
- 代码转换而非配置

**执行方式：**

```bash
# 用户在 Claude Code 中运行
claude
> /add-whatsapp

# Claude Code 自动:
# 1. 读取 SKILL.md
# 2. 执行 Phase 1 检查
# 3. 创建必要的文件
# 4. 修改现有代码
# 5. 安装依赖
# 6. 构建并测试
```

---

## 安全模型

### OpenClaw: 应用层权限

```typescript
// OpenClaw 权限系统
interface PermissionConfig {
  // 沙盒模式
  sandbox: {
    mode: 'off' | 'non-main' | 'all';
    allowlist: string[];  // 允许的工具
    denylist: string[];   // 拒绝的工具
  };

  // 通道权限
  channels: {
    whatsapp: {
      allowFrom: string[];     // 允许的发送者
      groups?: Record<string, { // 群组配置
        requireMention: boolean;
      }>;
    };
    // ...
  };

  // DM 策略
  dmPolicy: 'open' | 'pairing' | 'closed';
}

// 权限检查在应用层执行
function checkPermission(
  tool: string,
  session: Session
): boolean {
  const config = getPermissionConfig(session);

  if (config.sandbox.mode === 'all') {
    return config.sandbox.allowlist.includes(tool);
  }

  if (session.isMain) {
    return true;  // 主会话完全访问
  }

  return config.sandbox.allowlist.includes(tool);
}
```

**特点：**
- 权限检查在应用层
- 依赖配置文件正确性
- 主会话特殊对待
- 可选的 Docker 沙盒

### NanoClaw: 容器隔离

```typescript
// NanoClaw 安全模型
interface MountConfig {
  hostPath: string;
  containerPath: string;
  readonly: boolean;
}

function buildVolumeMounts(
  group: RegisteredGroup,
  isMain: boolean
): MountConfig[] {
  const mounts: MountConfig[] = [];

  if (isMain) {
    // 主组：项目根目录只读挂载
    mounts.push({
      hostPath: projectRoot,
      containerPath: '/workspace/project',
      readonly: true  // 只读！Agent 无法修改代码
    });

    // 群组文件夹可写
    mounts.push({
      hostPath: groupDir,
      containerPath: '/workspace/group',
      readonly: false
    });
  } else {
    // 其他组：仅自己的文件夹
    mounts.push({
      hostPath: groupDir,
      containerPath: '/workspace/group',
      readonly: false
    });

    // 全局记忆只读
    mounts.push({
      hostPath: globalDir,
      containerPath: '/workspace/global',
      readonly: true
    });
  }

  return mounts;
}
```

**安全边界：**

```
OpenClaw 安全边界:
┌─────────────────────────────────────────┐
│         应用层权限检查                    │
│  ┌───────────┐    ┌─────────────┐       │
│  │  Tool     │───▶│ Permission  │       │
│  │  Call     │    │   Check     │       │
│  └───────────┘    └─────────────┘       │
└─────────────────────────────────────────┘
         │
         ▼
    Host System

NanoClaw 安全边界:
┌─────────────────────────────────────────┐
│         Host System                     │
│  ┌───────────────────────────────────┐  │
│  │    Docker / Apple Container       │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │   Agent Process             │ │  │
│  │  │   │                           │ │
│  │  │   ▼                           │ │
│  │  │  挂载的文件系统                │ │
│  │  │  /workspace/group (读写)      │ │
│  │  │  /workspace/global (只读)     │ │
│  │  │  /workspace/project (只读)    │ │
│  │  └─────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**差异对比：**

| 方面 | OpenClaw | NanoClaw |
|------|----------|----------|
| **隔离级别** | 应用层 | OS 级 (容器) |
| **安全边界** | 权限检查 | 文件系统挂载 |
| **主机访问** | 主会话完全访问 | 仅挂载的目录 |
| **失败后果** | 配置错误 = 完全访问 | 容器逃逸才能访问 |
| **Bash 执行** | 主机直接执行 | 容器内执行 |

---

## 数据流对比

### OpenClaw 数据流

```
用户消息 (WhatsApp/Telegram/...)
         │
         ▼
    Channel Adapter
         │
         ▼
    Gateway WebSocket
         │
         ├──▶ before_agent_start 钩子
         │         │
         │         ▼
         │    插件预处理 (如 memory_recall)
         │
         ├──▶ Pi Agent (RPC)
         │         │
         │         ├──▶ Tool Call
         │         │         │
         │         │         ├──▶ after_tool_call 钩子
         │         │         │
         │         │         ▼
         │         │    工具执行 (Browser, Canvas, etc.)
         │         │
         │         ▼
         │    Result Stream
         │
         ├──▶ agent_end 钩子
         │
         ▼
    Channel Adapter
         │
         ▼
    用户收到回复
```

### NanoClaw 数据流

```
用户消息 (WhatsApp/Telegram/...)
         │
         ▼
    Channel.onMessage()
         │
         ▼
    storeMessage (SQLite)
         │
         ▼
    Message Polling Loop
         │
         ├──▶ 格式化消息 (formatMessages)
         │
         ├──▶ GroupQueue 检查
         │         │
         │         ├──▶ 有活动容器？
         │         │         │
         │         │         ├── Yes → 管道消息
         │         │         │
         │         │         └── No → 排队等待
         │
         ├──▶ runContainerAgent
         │         │
         │         ├──▶ Docker/Apple Container 启动
         │         │         │
         │         │         ├──▶ 挂载卷 (buildVolumeMounts)
         │         │         │
         │         │         ├──▶ stdin: 配置 + 提示
         │         │         │
         │         │         └──▶ stdout: 结果流
         │         │
         │         └──▶ Agent 执行
         │                   │
         │                   ├──▶ Claude Agent SDK
         │                   │
         │                   └──▶ MCP Server (工具)
         │
         └──▶ channel.sendMessage()
                   │
                   ▼
         用户收到回复
```

---

## 内存管理

### OpenClaw 内存系统

```typescript
// OpenClaw 会话内存
interface SessionMemory {
  session_id: string;

  // 上下文窗口
  messages: Message[];
  maxTokens: number;

  // 自动压缩
  compact(): Promise<void>;

  // 持久化
  save(): Promise<void>;
  load(): Promise<void>;

  // 元数据
  metadata: {
    created: Date;
    updated: Date;
    summary?: string;
  };
}

// 插件内存 (如 memory-lancedb-pro)
interface PluginMemory {
  // 向量 + BM25 混合检索
  recall(query: string, options?: RecallOptions): Promise<Memory[]>;

  // 存储记忆
  store(memory: MemoryInput): Promise<string>;

  // 作用域隔离
  scopes: {
    global: Memory[];
    'agent:{id}': Memory[];
    'custom:{name}': Memory[];
  };
}
```

### NanoClaw 内存系统

```typescript
// NanoClaw 内存 (基于文件系统)
interface GroupMemory {
  // 群组文件夹
  folder: string;

  // CLAUDE.md - 主记忆文件
  claudeMd: string;  // groups/{name}/CLAUDE.md

  // 对话历史
  conversations: string[];  // groups/{name}/conversations/

  // 学习记录
  learnings: {
    errors: string;    // .learnings/ERRORS.md
    learnings: string; // .learnings/LEARNINGS.md
  };

  // 会话持久化
  sessionId: string;  // 存储在 SQLite
}

// 加载方式
// 1. CLAUDE.md 自动加载
// 2. 全局 CLAUDE.md (groups/global/)
// 3. 会话恢复 (通过 session_id)
```

**内存加载流程对比：**

```
OpenClaw 内存加载:
┌─────────────────────────────────────────┐
│  1. Gateway 加载 Agent 配置             │
│  2. Plugin 钩子: before_agent_start    │
│  3. memory_recall 检索相关记忆          │
│  4. 注入 <relevant-memories> 上下文     │
│  5. Agent 开始处理                      │
└─────────────────────────────────────────┘

NanoClaw 内存加载:
┌─────────────────────────────────────────┐
│  1. 容器启动，挂载群组文件夹            │
│  2. Claude Agent SDK 自动加载           │
│     - /workspace/group/CLAUDE.md        │
│     - /workspace/global/CLAUDE.md (可选)│
│  3. session_id 恢复会话状态            │
│  4. Agent 开始处理                      │
└─────────────────────────────────────────┘
```

---

## 可扩展性

### OpenClaw 扩展方式

1. **编写插件**
```typescript
// plugins/my-plugin/index.ts
export default {
  name: 'my-plugin',
  hooks: { ... },
  tools: [ ... ]
};
```

2. **配置文件**
```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "enabled": true,
        "config": { ... }
      }
    }
  }
}
```

3. **添加通道**
```typescript
// channels/my-channel.ts
export class MyChannel extends ChannelBase {
  // 实现通道接口
}
```

### NanoClaw 扩展方式

1. **创建 Skill**
```markdown
# .claude/skills/my-feature/SKILL.md
---
name: my-feature
description: Add my custom feature
---

# Implementation Guide

## Step 1: Create file
\`\`\`bash
cat > src/my-feature.ts << 'EOF'
...
EOF
\`\`\`

## Step 2: Modify index.ts
...
```

2. **添加通道**
```markdown
# .claude/skills/add-my-channel/SKILL.md
---

# Add My Channel

## Step 1: Create channel file
\`\`\`typescript
// src/channels/my-channel.ts
export function createMyChannel(opts) {
  return {
    connect: async () => { ... },
    sendMessage: async (jid, text) => { ... }
  };
}
\`\`\`

## Step 2: Register channel
...
```

3. **修改代码**
```bash
# 直接让 Claude Code 修改
claude
> Add support for feature X
```

---

## 总结对比表

| 方面 | OpenClaw | NanoClaw | AcademiClaw |
|------|----------|----------|-------------|
| **架构类型** | 分布式网关 | 单体进程 | 单体进程 |
| **代码规模** | ~500,000 行 | ~500 行核心 | ~2,000 行 |
| **依赖数** | 70+ | 最小化 | 最小化 |
| **配置方式** | JSON 配置文件 | 代码定制 | 代码定制 |
| **通道支持** | 20+ 内置 | Skills 添加 | Skills 添加 |
| **插件系统** | 完整 Plugin API | Claude Code Skills | Claude Code Skills |
| **钩子系统** | 10+ 钩子事件 | 无 | 无 |
| **安全模型** | 应用层权限 | 容器隔离 | 容器隔离 |
| **Agent 隔离** | 可选 Docker | 始终容器 | 始终容器 |
| **会话管理** | Gateway 管理 | SQLite + 文件 | SQLite + 文件 |
| **内存系统** | Plugin 可扩展 | CLAUDE.md | CLAUDE.md |
| **UI 支持** | Web + 多平台 | CLI | CLI |
| **移动支持** | iOS/Android 节点 | 无 | 无 |
| **Browser 工具** | 内置 CDP 控制 | 无 | 无 |
| **Canvas** | 内置 | 无 | 无 |
| **语音支持** | Wake + Talk | 无 | 无 |
| **适用场景** | 企业/个人全功能 | 个人轻量级 | 学术研究 |
| **学习曲线** | 陡峭 | 平缓 | 平缓 |
| **可定制性** | 配置驱动 | 代码驱动 | 代码驱动 |
| **AI 原生** | 部分 | 完全 | 完全 |

---

## 架构选择建议

### 选择 OpenClaw 如果你需要：

- ✅ 多平台支持 (Web + iOS + Android)
- ✅ 丰富的内置工具 (Browser, Canvas, Nodes)
- ✅ 完整的插件生态系统
- ✅ 企业级功能和配置
- ✅ 多用户/多 Agent 协作

### 选择 NanoClaw/AcademiClaw 如果你需要：

- ✅ 简单可理解的代码库
- ✅ 强安全隔离 (容器级别)
- ✅ 轻量级部署
- ✅ 完全控制行为
- ✅ AI 原生体验 (Claude Code)
- ✅ 学术研究/个人使用

---

**文档版本: 1.0**
**创建日期: 2025-03-09**
**作者: AcademiClaw 开发团队**

**Sources:**
- [OpenClaw GitHub Repository](https://github.com/openclaw/openclaw)
- [NanoClaw GitHub Repository](https://github.com/qwibitai/nanoclaw)
- [memory-lancedb-pro Plugin](https://github.com/win4r/memory-lancedb-pro)
