---
name: Diagram Generator
slug: diagram-generator
version: 1.0.0
homepage: https://clawhub.com/skills/diagram-generator
description: "生成各种类型的图表和流程图：流程图、时序图、类图、甘特图、思维导图等。支持 Mermaid、PlantUML、Graphviz 等格式。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F4CA}"
    requires:
      bins: []
      llm: true
    os: [win32, darwin, linux]
---

## When to Use

Use this skill when you want to:
- Create flowcharts and process diagrams
- Generate sequence diagrams
- Draw class diagrams or ER diagrams
- Create mind maps and organizational charts
- Visualize data with charts

**Triggers:**
- User says "draw a flowchart", "create diagram", "画流程图", "生成图表"
- User mentions "flowchart", "sequence diagram", "流程图", "时序图"
- User asks to "visualize process", "可视化流程"
- User provides a process description to visualize

## Quick Start

### Create a Flowchart
```
画一个用户登录的流程图
```

### Create a Sequence Diagram
```
生成一个用户下单的时序图
```

### Create a Mind Map
```
创建一个关于机器学习的思维导图
```

## Supported Diagram Types

### 1. Flowchart (流程图)
**Use for**: Process flows, decision trees, workflows

**Example**:
```mermaid
graph TD
    A[开始] --> B{是否登录?}
    B -->|是| C[进入主页]
    B -->|否| D[登录页面]
    D --> E[输入用户名密码]
    E --> F{验证通过?}
    F -->|是| C
    F -->|否| G[显示错误]
    G --> D
    C --> H[结束]
```

**Triggers**: "流程图", "flowchart", "process diagram"

---

### 2. Sequence Diagram (时序图)
**Use for**: API interactions, message flows, system communications

**Example**:
```mermaid
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    
    用户->>前端: 点击登录
    前端->>后端: POST /api/login
    后端->>数据库: 查询用户
    数据库-->>后端: 用户信息
    后端-->>前端: JWT Token
    前端-->>用户: 登录成功
```

**Triggers**: "时序图", "sequence diagram", "交互图"

---

### 3. Class Diagram (类图)
**Use for**: Object-oriented design, database schemas

**Example**:
```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +login()
        +logout()
    }
    
    class Order {
        +String id
        +Date createTime
        +Float total
        +addItem()
        +removeItem()
    }
    
    User "1" --> "*" Order : has
```

**Triggers**: "类图", "class diagram", "ER图"

---

### 4. Gantt Chart (甘特图)
**Use for**: Project timelines, task scheduling

**Example**:
```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 设计阶段
    需求分析     :a1, 2024-01-01, 7d
    UI设计       :a2, after a1, 5d
    section 开发阶段
    前端开发     :b1, after a2, 10d
    后端开发     :b2, after a2, 10d
    测试         :b3, after b1, 5d
```

**Triggers**: "甘特图", "gantt chart", "时间线"

---

### 5. Mind Map (思维导图)
**Use for**: Brainstorming, knowledge organization

**Example**:
```mermaid
mindmap
  root((机器学习))
    监督学习
      分类
        二分类
        多分类
      回归
        线性回归
        逻辑回归
    无监督学习
      聚类
        K-means
        层次聚类
      降维
        PCA
        t-SNE
    深度学习
      CNN
      RNN
      Transformer
```

**Triggers**: "思维导图", "mind map", "脑图"

---

### 6. Pie Chart (饼图)
**Use for**: Data distribution, percentages

**Example**:
```mermaid
pie showData
    title 项目时间分配
    "开发" : 45
    "测试" : 25
    "设计" : 15
    "会议" : 15
```

**Triggers**: "饼图", "pie chart", "占比图"

---

### 7. State Diagram (状态图)
**Use for**: State machines, object lifecycles

**Example**:
```mermaid
stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付 : 支付成功
    待支付 --> 已取消 : 取消订单
    已支付 --> 已发货 : 商家发货
    已发货 --> 已完成 : 确认收货
    已发货 --> 退款中 : 申请退款
    退款中 --> 已退款 : 退款成功
    已完成 --> [*]
    已取消 --> [*]
    已退款 --> [*]
```

**Triggers**: "状态图", "state diagram"

---

### 8. ER Diagram (实体关系图)
**Use for**: Database design, data modeling

**Example**:
```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        string id PK
        string name
        string email
    }
    ORDER {
        string id PK
        date created_at
        float total
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM {
        string id PK
        int quantity
        float price
    }
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT {
        string id PK
        string name
        float price
    }
```

**Triggers**: "ER图", "实体关系图", "database diagram"

---

## Output Formats

### 1. Mermaid (Default)
- **Pros**: Widely supported, GitHub/GitLab native rendering
- **Cons**: Limited styling options

### 2. PlantUML
- **Pros**: More diagram types, powerful
- **Cons**: Requires server to render

### 3. Graphviz DOT
- **Pros**: Highly customizable
- **Cons**: Complex syntax

### 4. ASCII Art
- **Pros**: Works everywhere
- **Cons**: Limited visual appeal

## Usage Examples

### Example 1: User Authentication Flow
```
用户: 画一个用户认证的流程图，包括登录、注册、找回密码
```

**Generated**:
```mermaid
graph TD
    A[访问网站] --> B{已登录?}
    B -->|是| C[进入主页]
    B -->|否| D[选择操作]
    D --> E[登录]
    D --> F[注册]
    D --> G[找回密码]
    
    E --> H[输入邮箱密码]
    H --> I{验证成功?}
    I -->|是| C
    I -->|否| J[显示错误]
    J --> E
    
    F --> K[填写注册信息]
    K --> L[发送验证邮件]
    L --> M[激活账户]
    M --> E
    
    G --> N[输入邮箱]
    N --> O[发送重置链接]
    O --> P[设置新密码]
    P --> E
    
    C --> Q[退出登录]
    Q --> A
```

---

### Example 2: API Request Flow
```
用户: 生成一个微服务架构中用户下单的时序图
```

**Generated**:
```mermaid
sequenceDiagram
    participant C as 客户端
    participant G as API网关
    participant O as 订单服务
    participant P as 支付服务
    participant I as 库存服务
    participant N as 通知服务
    
    C->>G: POST /api/orders
    G->>O: 创建订单
    O->>I: 检查库存
    I-->>O: 库存充足
    O->>P: 创建支付
    P-->>O: 支付链接
    O-->>G: 订单创建成功
    G-->>C: 返回订单信息
    
    C->>P: 完成支付
    P->>O: 支付回调
    O->>I: 扣减库存
    O->>N: 发送通知
    N-->>C: 订单确认通知
```

---

### Example 3: System Architecture
```
用户: 画一个电商系统的架构图
```

**Generated**:
```mermaid
graph TB
    subgraph 客户端
        A[Web App]
        B[Mobile App]
    end
    
    subgraph 接入层
        C[CDN]
        D[负载均衡]
    end
    
    subgraph 应用层
        E[用户服务]
        F[商品服务]
        G[订单服务]
        H[支付服务]
    end
    
    subgraph 数据层
        I[(MySQL)]
        J[(Redis)]
        K[(MongoDB)]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    
    E --> I
    F --> I
    F --> J
    G --> I
    G --> J
    H --> K
```

---

## Tools Integration

### View Diagrams

1. **Online Viewers**:
   - Mermaid Live Editor: https://mermaid.live/
   - PlantUML Online: https://www.plantuml.com/plantuml
   
2. **VS Code Extension**:
   - Install "Markdown Preview Mermaid Support"
   
3. **Obsidian**:
   - Native Mermaid support
   
4. **GitHub/GitLab**:
   - Native rendering in Markdown files

### Export Options

```bash
# Export to PNG
mmdc -i diagram.mmd -o diagram.png

# Export to SVG
mmdc -i diagram.mmd -o diagram.svg

# Export to PDF
mmdc -i diagram.mmd -o diagram.pdf
```

## Advanced Features

### Custom Styling
```mermaid
graph TD
    A[Start] --> B[Process]
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#f66,stroke-width:2px
```

### Subgraphs
```mermaid
graph TB
    subgraph One
        A --> B
    end
    subgraph Two
        C --> D
    end
    B --> C
```

### Click Events
```mermaid
graph TD
    A --> B
    click A "https://example.com" "Tooltip"
    click B "https://example.com" "Tooltip"
```

## Troubleshooting

### Diagram Not Rendering
**Problem**: Mermaid code shows as plain text
**Solution**: 
- Check syntax is correct
- Use Mermaid Live Editor to validate
- Ensure viewer supports Mermaid

### Complex Diagrams
**Problem**: Diagram too complex
**Solution**:
- Break into multiple diagrams
- Use subgraphs
- Simplify the flow

## Best Practices

1. **Keep it Simple**: One concept per diagram
2. **Use Clear Labels**: Avoid abbreviations
3. **Consistent Direction**: Top-down or left-right
4. **Color Coding**: Use colors to group related items
5. **Validate**: Test in Mermaid Live Editor first

## Related Skills

- `code-documenter` - Document code with diagrams
- `architecture-designer` - Design system architectures
- `data-visualizer` - Visualize data with charts

## Future Enhancements

- [ ] Auto-generate from code
- [ ] Interactive diagrams
- [ ] Animated flows
- [ ] Diagram templates library
- [ ] Multi-language labels
