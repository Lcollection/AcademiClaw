# GitHub CLI Skill 🐙

> GitHub CLI (gh) 自动化操作助手

[![Status](https://img.shields.io/badge/Status-Stable-brightgreen)]()
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)]()

## 📖 简介

GitHub CLI Skill 让你可以通过自然语言控制 GitHub，自动完成：
- 📦 仓库管理（创建、克隆、删除）
- 🐛 Issue 管理（创建、查看、关闭）
- 🔀 Pull Request 管理（创建、审查、合并）
- ⚙️ GitHub Actions 工作流
- 🚀 Release 发布
- 🔐 Secrets 管理

## 🎯 功能特性

### Repository Management
- ✅ 创建公开/私有仓库
- ✅ 克隆仓库到本地
- ✅ 查看仓库信息
- ✅ 列出仓库列表
- ✅ 删除仓库

### Issue Management
- ✅ 创建 Issue
- ✅ 查看 Issue 详情
- ✅ 列出 Issues（支持过滤）
- ✅ 关闭/重新打开 Issue
- ✅ 添加标签和指派

### Pull Request Management
- ✅ 创建 PR
- ✅ 查看 PR 详情
- ✅ 列出 PRs（支持过滤）
- ✅ 合并 PR
- ✅ 请求代码审查
- ✅ 添加评论

### Workflow Management
- ✅ 列出工作流
- ✅ 触发工作流运行
- ✅ 查看运行状态
- ✅ 下载运行日志

### Release Management
- ✅ 创建 Release
- ✅ 上传资源文件
- ✅ 查看 Release 列表
- ✅ 下载 Release 资源

### Secret Management
- ✅ 设置 Secret
- ✅ 列出 Secrets
- ✅ 删除 Secret

## 🚀 快速开始

### 1. 安装 GitHub CLI

#### Windows
```bash
winget install GitHub.cli
# 或使用 Chocolatey
choco install gh
```

#### macOS
```bash
brew install gh
```

#### Linux
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora
sudo dnf install gh

# Arch Linux
sudo pacman -S github-cli
```

### 2. 认证

```bash
# 登录 GitHub
gh auth login

# 检查状态
gh auth status
```

### 3. 开始使用

```
创建一个名为 my-project 的私有仓库
克隆 facebook/react 到本地
在 username/repo 创建一个 Issue
```

## 📝 使用示例

### 创建仓库

```
创建一个私有仓库，名称为 my-app，描述为 "My application"
```

**执行命令**:
```bash
gh repo create my-app --private --description "My application"
```

---

### 克隆仓库

```
克隆 facebook/react 到 D:\projects\react
```

**执行命令**:
```bash
gh repo clone facebook/react D:\projects\react
```

---

### 创建 Issue

```
在 username/repo 创建一个 Bug Issue，标题为 "登录失败"
```

**执行命令**:
```bash
gh issue create --repo username/repo --title "登录失败" --label "bug"
```

---

### 创建 Pull Request

```
为当前分支创建一个 PR，标题为 "添加用户认证功能"
```

**执行命令**:
```bash
gh pr create --title "添加用户认证功能" --body "实现了用户登录和注册功能"
```

---

### 触发工作流

```
触发 username/repo 的 CI 工作流
```

**执行命令**:
```bash
gh workflow run ci.yml --repo username/repo
```

---

### 创建 Release

```
为 username/repo 创建 v1.0.0 版本的 Release
```

**执行命令**:
```bash
gh release create v1.0.0 --repo username/repo --title "v1.0.0" --notes "首次发布"
```

---

## 🎨 高级用法

### 批量操作

#### 批量创建 Issues
```bash
# 从文件读取
while read title; do
  gh issue create --title "$title"
done < issues.txt
```

#### 批量关闭 Issues
```bash
# 关闭所有带特定标签的 Issues
gh issue list --label "wontfix" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}
```

---

### 自动化脚本

#### 自动创建 PR
```bash
#!/bin/bash
# 当推送 feature 分支时自动创建 PR

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ $branch == feature/* ]]; then
  gh pr create --title "$branch" --body "Auto-created PR"
fi
```

#### 生成日报
```bash
#!/bin/bash
# 生成每日工作报告

echo "## Daily Report - $(date)"
echo "### Issues Closed Today"
gh issue list --state closed --limit 10
echo "### PRs Merged Today"
gh pr list --state merged --limit 10
```

---

### CI/CD 集成

#### GitHub Actions 示例
```yaml
name: Auto PR
on:
  push:
    branches: [feature/*]

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Create PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr create --title "Auto PR" --body "Automatically created"
```

---

## ⚙️ 配置

### 设置默认编辑器
```bash
gh config set editor "code --wait"
```

### 设置默认仓库
```bash
cd /path/to/your/repo
gh repo set-default username/repo
```

### 配置 Git 协议
```bash
# 使用 SSH
gh config set git_protocol ssh

# 使用 HTTPS
gh config set git_protocol https
```

---

## 🔧 故障排除

### Q: 命令找不到？
```
bash: gh: command not found
```
**A**: 安装 GitHub CLI
```bash
# Windows
winget install GitHub.cli

# macOS
brew install gh

# Linux
sudo apt install gh
```

---

### Q: 认证失败？
```
gh: authentication required
```
**A**: 重新登录
```bash
gh auth login
```

---

### Q: 仓库找不到？
```
Could not resolve to a Repository
```
**A**: 检查仓库名称和你的访问权限

---

### Q: API 限流？
```
API rate limit exceeded
```
**A**: 等待或认证以获得更高的限额

---

## 📚 常用命令速查

| 功能 | 命令 |
|------|------|
| 创建仓库 | `gh repo create` |
| 克隆仓库 | `gh repo clone` |
| 查看仓库 | `gh repo view` |
| 创建 Issue | `gh issue create` |
| 列出 Issues | `gh issue list` |
| 创建 PR | `gh pr create` |
| 列出 PRs | `gh pr list` |
| 合并 PR | `gh pr merge` |
| 运行工作流 | `gh workflow run` |
| 创建 Release | `gh release create` |

---

## 🤝 最佳实践

1. ✅ **使用模板**: 创建 Issue/PR 模板
2. ✅ **添加标签**: 使用标签组织内容
3. ✅ **关联 Issue**: 在 PR 中引用 Issue (#123)
4. ✅ **代码审查**: 合并前始终审查
5. ✅ **使用 Draft PR**: 工作进行中时
6. ✅ **清理分支**: 合并后删除分支

---

## 📖 相关资源

- [GitHub CLI 官方文档](https://cli.github.com/manual/)
- [GitHub API 文档](https://docs.github.com/rest)
- [GitHub Skills](https://skills.github.com/)
- [GitHub Actions](https://github.com/features/actions)

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [GitHub CLI](https://cli.github.com/) - GitHub 官方命令行工具
- [OpenClaw](https://openclaw.ai) - AI Agent 平台

---

<div align="center">

**[⬆ 返回顶部](#github-cli-skill-)**

Made with 🐙 by Echo

</div>
