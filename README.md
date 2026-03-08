这是一个上过学的龙虾你也可以叫他为AC（~~当然不是毙你文章的AC~~）

![](./assets/cover.svg)


# 这是个什么项目？

主要是OpenClaw目前过长冗余的代码和不是那么安全的权限管理，同时目标用户群体主要是面向科研工作者的这么一套claw系统，整个系统在本地部署的时候

同时NanoClaw的设计理念十分打动我，快速理解+安全风险隔离完美的解决我的主要担忧，以及更少的进程开销让我十分显想要尝试这个项目；

因此我们将NanoClaw作为基础模型架构

# 快速开始

```bash
git clone https://github.com/lcollection/nanoclaw.git
cd nanoclaw
calude
```

然后运行 `/setup`。Claude Code 会处理一切：依赖安装、身份验证、容器设置、服务配置

> 注意：**注意：** 以 `/` 开头的命令（如 `/setup`、`/add-whatsapp`）是 [Claude Code 技能](https://code.claude.com/docs/en/skills)。请在 `claude` CLI 提示符中输入，而非在普通终端中。
> 

# 设计理念

**小巧易懂**：单一进程，少量源文件。无微服务、无消息队列、无复杂抽象层。让 Claude Code 引导您轻松上手

**隔离保障安全**：智能体运行在 Linux 容器（在 macOS 上是 Apple Container，或 Docker）中。它们只能看到被明确挂载的内容。即便通过 Bash 访问也十分安全，因为所有命令都在容器内执行，不会直接操作您的宿主机

**代码量足够小**：没有繁杂的配置文件。想要不同的行为？直接修改代码。代码库足够小，这样做是安全的，保证每个代码文件都可以在个人控制之下

**国内支持**：原版的NanoClaw只提供了Telegram、whatsapp的支持，那么我们接入对于国内用户最为常用的即时通信软件：qq、微信、飞书和钉钉，使用更加方便

**学术支持**：相较于在多个窗口之间相互切换，我们提供一个更加便捷的学术科研环境，连接你的zotero、obsidian和notion等常用的学术工具，理解拓展更多的学术科研工作

**技能拓展**：贡献者不应该向代码库添加新功能（例如支持 Telegram）。相反，他们应该贡献像 `/add-telegram` 这样的 [Claude Code 技能](https://code.claude.com/docs/en/skills)，这些技能可以改造您的 fork。最终，您得到的是只做您需要事情的整洁代码

**记忆强化**：相较于过去传统的自动记忆，独立于系统之外的记忆系统会强化不少内容。


# 施工中...... 代码完善中