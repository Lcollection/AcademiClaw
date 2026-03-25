# 📊 Diagram Generator 示例

## 示例 1: 用户登录流程图

```mermaid
graph TD
    A[用户访问网站] --> B{已登录?}
    B -->|是| C[进入主页]
    B -->|否| D[显示登录页面]
    D --> E[输入用户名密码]
    E --> F{验证通过?}
    F -->|是| G[生成 JWT Token]
    G --> C
    F -->|否| H[显示错误提示]
    H --> D
    C --> I[浏览内容]
    I --> J{需要操作?}
    J -->|是| K{有权限?}
    K -->|是| L[执行操作]
    K -->|否| M[提示权限不足]
    J -->|否| N[退出登录]
    N --> O[结束]
    
    style A fill:#e1f5fe
    style C fill:#d4edda
    style H fill:#f8d7da
    style L fill:#d4edda
    style M fill:#fff3cd
```

---

## 示例 2: API 请求时序图

```mermaid
sequenceDiagram
    participant C as 客户端
    participant L as 负载均衡器
    participant S1 as 服务器1
    participant S2 as 服务器2
    participant DB as 数据库
    participant R as Redis缓存
    
    C->>L: HTTP GET /api/users
    L->>S1: 转发请求
    S1->>R: 查询缓存
    R-->>S1: 缓存未命中
    S1->>DB: SELECT * FROM users
    DB-->>S1: 返回数据
    S1->>R: 写入缓存
    S1-->>L: 返回响应
    L-->>C: 200 OK
    
    Note over C,R: 总耗时: 120ms
```

---

## 示例 3: 系统架构图

```mermaid
graph TB
    subgraph 客户端层
        A[Web App]
        B[Mobile App]
        C[Desktop App]
    end
    
    subgraph API网关层
        D[Kong Gateway]
    end
    
    subgraph 服务层
        E[用户服务]
        F[订单服务]
        G[支付服务]
        H[通知服务]
    end
    
    subgraph 数据层
        I[(MySQL)]
        J[(Redis)]
        K[(MongoDB)]
    end
    
    subgraph 外部服务
        L[邮件服务]
        M[短信服务]
        N[支付网关]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    D --> F
    D --> G
    D --> H
    
    E --> I
    E --> J
    F --> I
    F --> J
    G --> K
    H --> L
    H --> M
    G --> N
    
    style D fill:#ff9800,color:#fff
    style E fill:#4caf50,color:#fff
    style F fill:#4caf50,color:#fff
    style G fill:#4caf50,color:#fff
    style H fill:#4caf50,color:#fff
```

---

## 示例 4: 类图

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String email
        +String password_hash
        +DateTime created_at
        +login() bool
        +logout() void
        +update_profile() bool
    }
    
    class Order {
        +String id
        +String user_id
        +List~OrderItem~ items
        +Decimal total
        +OrderStatus status
        +DateTime created_at
        +add_item() void
        +remove_item() void
        +checkout() bool
    }
    
    class Product {
        +String id
        +String name
        +String description
        +Decimal price
        +Int stock
        +update_stock() void
    }
    
    class Payment {
        +String id
        +String order_id
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +process() bool
        +refund() bool
    }
    
    User "1" --> "*" Order : places
    Order "1" --> "*" Product : contains
    Order "1" --> "1" Payment : has
```

---

## 示例 5: 甘特图

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求调研           :a1, 2024-01-01, 7d
    需求文档           :a2, after a1, 5d
    section 设计阶段
    架构设计           :b1, after a2, 7d
    UI/UX设计          :b2, after a2, 10d
    数据库设计         :b3, after b1, 5d
    section 开发阶段
    后端开发           :c1, after b3, 20d
    前端开发           :c2, after b2, 20d
    API集成            :c3, after c1, 5d
    section 测试阶段
    单元测试           :d1, after c1, 10d
    集成测试           :d2, after c3, 7d
    用户测试           :d3, after d2, 5d
    section 部署上线
    环境准备           :e1, after d3, 3d
    正式上线           :e2, after e1, 1d
```

---

## 示例 6: 状态图

```mermaid
stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付 : 支付成功
    待支付 --> 已取消 : 取消订单
    已支付 --> 已发货 : 商家发货
    已发货 --> 已收货 : 确认收货
    已收货 --> 已评价 : 提交评价
    已评价 --> [*]
    已取消 --> [*]
    
    已支付 --> 退款中 : 申请退款
    退款中 --> 已退款 : 退款成功
    已退款 --> [*]
```

---

## 示例 7: 饼图

```mermaid
pie showData
    title 技术栈使用比例
    "JavaScript" : 40
    "Python" : 25
    "Java" : 20
    "Go" : 10
    "其他" : 5
```

---

## 示例 8: 思维导图

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
        图像识别
        目标检测
      RNN
        自然语言处理
        时间序列
      Transformer
        GPT
        BERT
    强化学习
      Q-Learning
      Policy Gradient
```

---

## 如何使用这些示例

1. **复制 Mermaid 代码**
2. **粘贴到支持 Mermaid 的编辑器**:
   - Mermaid Live Editor: https://mermaid.live/
   - VS Code (安装 Mermaid 插件)
   - Obsidian (原生支持)
   - GitHub/GitLab Markdown
3. **修改内容和样式**
4. **导出为 PNG/SVG/PDF**

---

## 快速生成流程图

告诉 Echo 你想要什么样的流程图：

```
画一个用户注册的流程图
生成一个微服务架构的系统图
创建一个订单处理的时序图
画一个数据库 ER 图
```

Echo 会自动生成 Mermaid 代码！
