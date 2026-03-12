# AcademiClaw 安全增强设计文档

**版本:** 1.0
**日期:** 2025-03-12
**状态:** 设计阶段

---

## 目录

1. [概述](#1-概述)
2. [威胁模型](#2-威胁模型)
3. [Credential Vault 设计](#3-credential-vault-设计)
4. [Prompt Injection 防御设计](#4-prompt-injection-防御设计)
5. [实施计划](#5-实施计划)
6. [API 参考](#6-api-参考)

---

## 1. 概述

### 1.1 背景

当前 AcademiClaw 系统存在两个主要安全考虑：

1. **凭证存储不安全** - API keys 和应用凭证以明文存储在 `.env` 文件中
2. **缺乏输入验证** - 用户消息直接传递给 Agent，存在提示注入风险

### 1.2 设计目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| **加密存储** | 凭证使用 AES-256-GCM 加密存储 | 高 |
| **密钥链集成** | 主密钥存储在系统密钥链中 | 高 |
| **注入检测** | 识别并阻止提示注入攻击 | 中 |
| **权限隔离** | 不同组使用不同的权限级别 | 中 |
| **审计日志** | 记录所有安全相关事件 | 低 |

### 1.3 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer                            │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Credential Vault │  │  Input Sanitizer                │ │
│  │  (AES-256-GCM)   │  │  (Pattern Detection)            │ │
│  └────────┬─────────┘  └──────────────┬──────────────────┘ │
└───────────┼───────────────────────────┼────────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│  Keychain Integration │   │   Policy Engine               │
│  (macOS/Linux)        │   │   (Permission Check)          │
└───────────────────────┘   └───────────────────────────────┘
```

---

## 2. 威胁模型

### 2.1 攻击向量

| 攻击类型 | 描述 | 当前风险 | 设计后 |
|----------|------|----------|--------|
| **凭证泄露** | .env 文件被意外提交到 Git | 高 | 低 |
| **文件系统访问** | 容器逃逸访问宿主机文件 | 中 | 低 |
| **提示注入** | 恶意用户操控 Agent 行为 | 中 | 低 |
| **权限提升** | 非主组获得主组权限 | 低 | 低 |
| **密钥链攻击** | 系统密钥链被破解 | 低 | 低 |

### 2.2 假设

1. **宿主机可信** - 假设运行 AcademiClaw 的机器未被入侵
2. **容器隔离** - Docker 容器提供足够的隔离
3. **密钥链安全** - 系统密钥链实现是安全的
4. **Agent 有界** - Claude Agent SDK 遵循工具使用限制

---

## 3. Credential Vault 设计

### 3.1 架构

```
┌────────────────────────────────────────────────────────────┐
│                     Credential Vault                        │
│                                                             │
│  ┌────────────────┐      ┌──────────────────────────────┐ │
│  │  Encrypted     │      │    System Keychain           │ │
│  │  Credentials   │◄─────┤    (Master Key)               │ │
│  │  File          │      │    - macOS: Keychain         │ │
│  │                │      │    - Linux: Secret Service    │ │
│  └────────────────┘      └──────────────────────────────┘ │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           Runtime Decryption (in-memory)              │ │
│  │  - Only decrypted when needed                         │ │
│  │  - Never written to disk                              │ │
│  │  - Cleared from memory after use                       │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 3.2 数据格式

**加密凭证文件** (`~/.config/academiclaw/vault.json`):

```json
{
  "version": 1,
  "algorithm": "aes-256-gcm",
  "keyDerivation": {
    "algorithm": "pbkdf2",
    "iterations": 100000,
    "salt": "base64_encoded_salt"
  },
  "credentials": {
    "ANTHROPIC_API_KEY": {
      "encrypted": "base64_encrypted_value",
      "authTag": "base64_auth_tag",
      "nonce": "base64_nonce"
    },
    "FEISHU_APP_SECRET": {
      "encrypted": "...",
      "authTag": "...",
      "nonce": "..."
    }
  }
}
```

### 3.3 加密流程

```typescript
// 1. 从密钥链获取主密钥
const masterKey = await keychain.get('academiclaw.master');

// 2. 使用主密钥加密凭证
const encrypted = encryptAES256GCM(masterKey, credentialValue);

// 3. 存储到 vault.json
vaultJson.credentials[key] = encrypted;
```

### 3.4 解密流程

```typescript
// 1. 从密钥链获取主密钥
const masterKey = await keychain.get('academiclaw.master');

// 2. 从 vault.json 读取加密凭证
const encrypted = vaultJson.credentials[key];

// 3. 解密（仅内存中）
const decrypted = decryptAES256GCM(masterKey, encrypted);

// 4. 注入到容器环境变量
containerEnv[key] = decrypted;

// 5. 清除内存中的明文
decrypted.fill(0);
```

### 3.5 密钥链集成

**macOS Keychain:**

```typescript
import { execSync } from 'child_process';

function setKeychainPassword(account: string, password: string): void {
  execSync(`security add-generic-password \
    -a "${account}" \
    -s "academiclaw" \
    -w "${password}" \
    -U`);
}

function getKeychainPassword(account: string): string | null {
  try {
    return execSync(`security find-generic-password \
      -a "${account}" \
      -s "academiclaw" \
      -w 2>/dev/null`).toString().trim();
  } catch {
    return null;
  }
}
```

**Linux Secret Service (using libsecret):**

```typescript
function setSecret(account: string, password: string): void {
  execSync(`secret-tool store \
    --label="AcademiClaw" \
    ${account} "${password}"`);
}

function getSecret(account: string): string | null {
  try {
    return execSync(`secret-tool lookup ${account}`).toString().trim();
  } catch {
    return null;
  }
}
```

### 3.6 API 设计

```typescript
// src/security/vault.ts

export interface CredentialVault {
  /**
   * 存储加密凭证
   */
  set(key: string, value: string): Promise<void>;

  /**
   * 获取解密后的凭证（仅内存）
   */
  get(key: string): Promise<string | null>;

  /**
   * 获取所有凭证（用于容器启动）
   * 返回环境变量对象，使用后立即清除
   */
  getAll(): Promise<Record<string, string>>;

  /**
   * 列出所有凭证键（不返回值）
   */
  list(): Promise<string[]>;

  /**
   * 删除凭证
   */
  delete(key: string): Promise<void>;

  /**
   * 重新加密金库（使用新的主密钥）
   */
  reencrypt(newMasterKey?: string): Promise<void>;
}

export interface VaultConfig {
  path: string;           // 金库文件路径
  keychainName: string;   // 密钥链服务名称
  masterKey?: string;     // 可选：显式主密钥（仅用于测试）
}
```

### 3.7 CLI 命令

```bash
# 初始化金库（生成主密钥并存储到密钥链）
academiclaw vault init

# 添加凭证
academiclaw vault set ANTHROPIC_API_KEY

# 列出凭证键
academiclaw vault list

# 删除凭证
academiclaw vault delete ANTHROPIC_API_KEY

# 重新加密
academiclaw vault reencrypt

# 验证金库完整性
academiclaw vault check
```

---

## 4. Prompt Injection 防御设计

### 4.1 架构

```
┌────────────────────────────────────────────────────────────┐
│                  Input Processing Pipeline                  │
│                                                             │
│  Input ──► ┌─────────────┐ ──► ┌──────────────┐ ──► Output │
│           │  Pattern     │     │   Policy      │            │
│           │  Detection   │     │   Engine      │            │
│           │  (Block)     │     │   (Filter)    │            │
│           └─────────────┘     └──────────────┘             │
│                  │                     │                     │
│                  ▼                     ▼                     │
│           ┌─────────────┐     ┌──────────────┐              │
│           │  Audit Log  │     │   Alert      │              │
│           │  (Blocked)  │     │   (Action)   │              │
│           └─────────────┘     └──────────────┘             │
└────────────────────────────────────────────────────────────┘
```

### 4.2 检测模式

**已知注入模式:**

```typescript
// src/security/patterns.ts

export const INJECTION_PATTERNS = [
  // 经典注入
  /ignore\s+(all\s+)?(previous\s+)?(instructions?|commands?)/i,
  /forget\s+(everything|all\s+previous)/i,
  /override\s+(your\s+)?(programming|instructions?)/i,
  /disregard\s+(the\s+)?(above|previous)/i,

  // 角色扮演
  /you\s+are\s+now/i,
  /act\s+as\s+(if\s+you\s+were)?\s*a/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /roleplay\s+as/i,

  // 系统指令
  /system\s*:\s*/i,
  /developer\s+mode/i,
  /admin\s+(mode|privileges)/i,
  /sudo/i,

  // 输出格式操控
  /print\s+(the\s+)?(system\s+)?prompt/i,
  /show\s+(your\s+)?instructions/i,
  /repeat\s+(everything|all\s+text)/i,

  // 编码/混淆尝试
  /base64\s*:/i,
  /rot13/i,
  /(encode|decode)\s*this/i,

  // 工具操控
  /(?:run|execute|call)\s+(?:bash|shell)/i,
  /(?:bypass|ignore)\s+(?:security|policy|restriction)/i,
];
```

### 4.3 策略引擎

```typescript
// src/security/policy.ts

export interface SecurityPolicy {
  maxMessageLength: number;
  allowedTools: string[];
  blockedDomains: string[];
  requireTrigger: boolean;
}

export const DEFAULT_POLICY: SecurityPolicy = {
  maxMessageLength: 10000,
  allowedTools: ['*'], // 所有工具允许
  blockedDomains: [],
  requireTrigger: false,
};

export const RESTRICTED_POLICY: SecurityPolicy = {
  maxMessageLength: 5000,
  allowedTools: ['Read', 'Grep', 'Glob'], // 只读工具
  blockedDomains: ['*'],
  requireTrigger: true,
};
```

### 4.4 输入处理流程

```typescript
// src/security/input-filter.ts

export class InputFilter {
  constructor(
    private patterns: InjectionPattern[],
    private policy: SecurityPolicy,
  ) {}

  /**
   * 处理用户输入
   * @returns 处理结果，如果被阻止则返回原因
   */
  process(input: string, context: SecurityContext): ProcessResult {
    // 1. 长度检查
    if (input.length > this.policy.maxMessageLength) {
      return {
        allowed: false,
        reason: 'Message too long',
        input: input.substring(0, this.policy.maxMessageLength),
      };
    }

    // 2. 模式检测
    const detected = this.detectPatterns(input);
    if (detected.length > 0) {
      this.auditLog('INJECTION_DETECTED', {
        patterns: detected,
        input,
        context,
      });
      return {
        allowed: false,
        reason: 'Potential injection detected',
        detectedPatterns: detected,
      };
    }

    // 3. 策略检查
    const policyCheck = this.checkPolicy(input, context);
    if (!policyCheck.allowed) {
      return policyCheck;
    }

    return { allowed: true, input };
  }

  private detectPatterns(input: string): string[] {
    const detected: string[] = [];
    for (const pattern of this.patterns) {
      if (pattern.regex.test(input)) {
        detected.push(pattern.name);
      }
    }
    return detected;
  }
}
```

### 4.5 工具权限矩阵

| 工具 | 主组 | 触发组 | 只读模式 |
|------|------|--------|----------|
| Read | ✓ | ✓ | ✓ |
| Write | ✓ | ✗ | ✗ |
| Edit | ✓ | ✗ | ✗ |
| Bash | ✓ | ✗ | ✗ |
| WebSearch | ✓ | ✓ | ✓ |
| Task | ✓ | ✗ | ✗ |
| send_message | ✓ | ✓ | ✓ |

### 4.6 审计日志

```typescript
// src/security/audit.ts

export interface AuditEvent {
  timestamp: string;
  type: 'INJECTION_DETECTED' | 'POLICY_VIOLATION' | 'VAULT_ACCESS';
  severity: 'low' | 'medium' | 'high';
  source: string; // chat_jid
  details: Record<string, unknown>;
}

export class AuditLogger {
  log(event: AuditEvent): void {
    const logPath = path.join(
      PROJECT_ROOT,
      'logs',
      `security-${new Date().toISOString().split('T')[0]}.log`,
    );
    fs.appendFileSync(logPath, JSON.stringify(event) + '\n');
  }
}
```

---

## 5. 实施计划

### 5.1 阶段划分

| 阶段 | 任务 | 优先级 | 预计工作量 |
|------|------|--------|------------|
| **Phase 1** | Credential Vault 基础实现 | 高 | 2-3 天 |
| **Phase 2** | 密钥链集成 | 高 | 1-2 天 |
| **Phase 3** | 注入检测模式 | 中 | 1 天 |
| **Phase 4** | 策略引擎 | 中 | 2 天 |
| **Phase 5** | 审计日志 | 低 | 1 天 |
| **Phase 6** | 测试和文档 | 高 | 2 天 |

### 5.2 Phase 1: Credential Vault 基础

**文件结构:**
```
src/security/
├── vault/
│   ├── index.ts           # 主入口
│   ├── crypto.ts          # AES-256-GCM 实现
│   ├── storage.ts         # 文件存储
│   └── types.ts           # 类型定义
```

**核心 API:**
```typescript
class CredentialVault {
  constructor(config: VaultConfig);
  init(): Promise<void>;           // 初始化金库
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  getAll(): Promise<Record<string, string>>;
  delete(key: string): Promise<void>;
  reencrypt(newKey?: string): Promise<void>;
}
```

### 5.3 Phase 2: 密钥链集成

**文件:**
```
src/security/keychain/
├── index.ts        # 平台检测和统一接口
├── darwin.ts       # macOS Keychain
└── linux.ts        # Linux Secret Service
```

**使用示例:**
```typescript
const keychain = createKeychain();
await keychain.set('academiclaw.master', generateKey());
const masterKey = await keychain.get('academiclaw.master');
```

### 5.4 Phase 3-4: 注入防御

**文件结构:**
```
src/security/filter/
├── index.ts           # InputFilter 主类
├── patterns.ts        # 注入模式定义
├── policy.ts          # 策略引擎
└── audit.ts           # 审计日志
```

**集成点:**
```typescript
// src/index.ts

const inputFilter = new InputFilter(PATTERNS, POLICY);

function onUserMessage(msg: NewMessage): void {
  const result = inputFilter.process(msg.content, {
    chatJid: msg.chat_jid,
    isMain: group.isMain,
  });

  if (!result.allowed) {
    logger.warn({ reason: result.reason }, 'Message blocked');
    sendMessage(msg.chat_jid, `Message blocked: ${result.reason}`);
    return;
  }

  // 继续处理...
}
```

### 5.5 迁移策略

**从 .env 迁移到 Vault:**

```bash
# 1. 初始化金库
academiclaw vault init

# 2. 从 .env 导入凭证
academiclaw vault import --from .env

# 3. 验证
academiclaw vault list

# 4. 删除 .env 中的敏感信息
# (保留非敏感配置)
```

### 5.6 向后兼容

**兼容模式:**
- 如果 vault.json 不存在，回退到 .env
- 如果密钥链不可用，提示用户输入主密钥
- 环境变量优先级：显式 > Vault > .env

---

## 6. API 参考

### 6.1 Vault API

```typescript
// 创建金库实例
const vault = new CredentialVault({
  path: '~/.config/academiclaw/vault.json',
  keychainName: 'academiclaw',
});

// 初始化（首次使用）
await vault.init();

// 存储凭证
await vault.set('ANTHROPIC_API_KEY', 'sk-ant-xxx');

// 获取凭证
const apiKey = await vault.get('ANTHROPIC_API_KEY');

// 获取所有（用于容器启动）
const envVars = await vault.getAll();
// { ANTHROPIC_API_KEY: 'sk-ant-xxx', ... }

// 删除凭证
await vault.delete('ANTHROPIC_API_KEY');
```

### 6.2 Filter API

```typescript
// 创建过滤器
const filter = new InputFilter(INJECTION_PATTERNS, POLICY);

// 处理输入
const result = filter.process(userMessage, {
  chatJid: 'oc_xxx@feishu',
  isMain: true,
  sender: 'user_123',
});

if (result.allowed) {
  // 处理 result.input
} else {
  // 记录 result.reason
}
```

### 6.3 CLI 命令

```bash
# Vault 管理
academiclaw vault init                    # 初始化金库
academiclaw vault set <KEY>               # 添加凭证
academiclaw vault get <KEY>               # 获取凭证（打印）
academiclaw vault list                    # 列出所有键
academiclaw vault delete <KEY>            # 删除凭证
academiclaw vault reencrypt               # 重新加密
academiclaw vault check                   # 完整性检查

# 安全管理
academiclaw security audit                # 查看审计日志
academiclaw security patterns             # 列出注入模式
academiclaw security policy               # 查看当前策略
```

---

## 7. 测试计划

### 7.1 单元测试

```typescript
// vault.test.ts
describe('CredentialVault', () => {
  it('should encrypt and decrypt correctly');
  it('should handle missing keys gracefully');
  it('should re-encrypt with new master key');
});

// filter.test.ts
describe('InputFilter', () => {
  it('should detect known injection patterns');
  it('should allow legitimate messages');
  it('should enforce policy restrictions');
});
```

### 7.2 集成测试

```typescript
// e2e/security.test.ts
describe('Security E2E', () => {
  it('should block injection attempts');
  it('should not interfere with normal operation');
  it('should log security events');
});
```

---

## 8. 依赖项

| 依赖 | 用途 | 版本 |
|------|------|------|
| `crypto` | Node.js 原生加密模块 | built-in |
| `node-keychain` | macOS Keybridge (可选) | ^1.0.0 |
| `secret-service` | Linux Secret Service (可选) | ^1.0.0 |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 主密钥丢失 | 无法访问凭证 | 密钥链备份；恢复模式 |
| 加密算法破解 | 凭证泄露 | 使用 AES-256-GCM；定期轮换 |
| 拒绝服务 | 合法消息被阻止 | 白名单；误报反馈 |
| 性能影响 | 延迟增加 | 缓存解密结果；异步处理 |

---

## 10. 附录

### 10.1 参考资料

- [OWASP Prompt Injection Cheat Sheet](https://github.com/OWASP/LLM-Project)
- [Apple Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [libsecret / Secret Service API](https://gnome.gitlab.org/libsecret/)
- [NIST Encryption Guidelines](https://csrc.nist.gov/projects/computer-security-resource-center)

### 10.2 术语表

| 术语 | 定义 |
|------|------|
| **Vault** | 加密凭证存储 |
| **Keychain** | 系统级密钥存储服务 |
| **Injection** | 恶意输入试图绕过限制 |
| **Policy** | 定义允许操作的规则集 |
| **Audit Log** | 安全事件记录 |

---

**文档版本历史:**
- v1.0 (2025-03-12) - 初始设计
