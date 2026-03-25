---
name: GitHub CLI
slug: github-cli
version: 1.0.0
homepage: https://clawhub.com/skills/github-cli
description: "GitHub CLI (gh) 自动化操作。管理仓库、Issues、Pull Requests、Workflows、Releases 等。支持所有 gh 命令。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F431}"
    requires:
      bins: [gh]
      llm: false
    os: [win32, darwin, linux]
---

## When to Use

Use this skill when you want to:
- Create, clone, or manage GitHub repositories
- Create and manage Issues and Pull Requests
- Run GitHub Actions workflows
- Create releases and manage secrets
- View repository information and statistics

**Triggers:**
- User says "create repo", "创建仓库", "new repository"
- User mentions "GitHub", "gh", "PR", "issue"
- User asks to "clone repo", "克隆仓库"
- User wants to "make PR", "创建 Pull Request"

## Quick Start

### Create a Repository
```
创建一个名为 my-project 的 GitHub 仓库
```

### Clone a Repository
```
克隆 username/repo 到本地
```

### Create an Issue
```
在 username/repo 创建一个 Issue: 添加登录功能
```

### Create a Pull Request
```
为 feature-branch 创建一个 PR
```

## Features

### 1. Repository Management

#### Create Repository
```bash
# 创建公开仓库
gh repo create my-project --public

# 创建私有仓库
gh repo create my-project --private

# 带描述创建
gh repo create my-project --description "My awesome project"

# 从模板创建
gh repo create my-project --template username/template-repo
```

**Usage:**
```
创建一个私有仓库，名称为 my-app
创建一个公开仓库，描述为 "A demo project"
```

---

#### Clone Repository
```bash
# 克隆仓库
gh repo clone username/repo

# 克隆到指定目录
gh repo clone username/repo my-local-dir
```

**Usage:**
```
克隆 facebook/react
克隆 username/repo 到 D:\projects\repo
```

---

#### List Repositories
```bash
# 列出我的仓库
gh repo list

# 列出指定用户的仓库
gh repo list username

# 限制数量
gh repo list --limit 30
```

**Usage:**
```
列出我的所有仓库
列出 microsoft 的前 20 个仓库
```

---

#### View Repository
```bash
# 查看仓库信息
gh repo view username/repo

# 在浏览器中打开
gh repo view username/repo --web
```

**Usage:**
```
查看 facebook/react 的信息
在浏览器中打开我的仓库
```

---

#### Delete Repository
```bash
# 删除仓库（需要确认）
gh repo delete username/repo
```

**Usage:**
```
删除 my-old-project 仓库
```

---

### 2. Issue Management

#### Create Issue
```bash
# 创建 Issue
gh issue create --title "Bug in login" --body "Description here"

# 带标签创建
gh issue create --title "Feature request" --label "enhancement"

# 分配给某人
gh issue create --title "Task" --assignee username
```

**Usage:**
```
创建一个 Issue: 标题 "修复登录Bug"，内容 "用户无法登录"
创建一个带 bug 标签的 Issue
```

---

#### List Issues
```bash
# 列出所有 Issues
gh issue list

# 按状态过滤
gh issue list --state open
gh issue list --state closed

# 按标签过滤
gh issue list --label bug

# 按分配者过滤
gh issue list --assignee username
```

**Usage:**
```
列出所有未关闭的 Issues
列出所有带 bug 标签的 Issues
```

---

#### View Issue
```bash
# 查看 Issue 详情
gh issue view 123

# 在浏览器中打开
gh issue view 123 --web
```

**Usage:**
```
查看 Issue #123 的详细信息
```

---

#### Close/Reopen Issue
```bash
# 关闭 Issue
gh issue close 123

# 重新打开 Issue
gh issue reopen 123
```

**Usage:**
```
关闭 Issue #123
重新打开 Issue #456
```

---

### 3. Pull Request Management

#### Create Pull Request
```bash
# 创建 PR（自动检测当前分支）
gh pr create

# 指定标题和描述
gh pr create --title "Add feature X" --body "Description"

# 指定基础分支
gh pr create --base main

# 指定审查者
gh pr create --reviewer username

# 指定分配者
gh pr create --assignee username

# 指定标签
gh pr create --label "enhancement"
```

**Usage:**
```
为当前分支创建 PR
创建一个 PR，标题 "添加登录功能"，审查者 @reviewer
```

---

#### List Pull Requests
```bash
# 列出所有 PRs
gh pr list

# 按状态过滤
gh pr list --state open
gh pr list --state closed
gh pr list --state merged

# 按作者过滤
gh pr list --author username

# 按标签过滤
gh pr list --label bug
```

**Usage:**
```
列出所有未合并的 PRs
列出我创建的所有 PRs
```

---

#### View Pull Request
```bash
# 查看 PR 详情
gh pr view 123

# 在浏览器中打开
gh pr view 123 --web

# 查看 PR 的 checks
gh pr view 123 --checks
```

**Usage:**
```
查看 PR #123 的详细信息
查看 PR #123 的 CI 状态
```

---

#### Review Pull Request
```bash
# 批准 PR
gh pr review 123 --approve

# 请求修改
gh pr review 123 --request-changes

# 评论
gh pr review 123 --comment "Looks good!"

# 添加审查评论
gh pr review 123 --body "Please fix the typo"
```

**Usage:**
```
批准 PR #123
请求修改 PR #456
对 PR #789 添加评论
```

---

#### Merge Pull Request
```bash
# 合并 PR
gh pr merge 123

# Squash 并合并
gh pr merge 123 --squash

# Rebase 并合并
gh pr merge 123 --rebase

# 自动删除分支
gh pr merge 123 --delete-branch
```

**Usage:**
```
合并 PR #123
Squash 并合并 PR #456，然后删除分支
```

---

### 4. Workflow Management

#### List Workflows
```bash
# 列出所有 workflows
gh workflow list
```

**Usage:**
```
列出所有 GitHub Actions workflows
```

---

#### Run Workflow
```bash
# 运行 workflow
gh workflow run workflow-name

# 带参数运行
gh workflow run workflow-name -f param1=value1

# 指定分支
gh workflow run workflow-name --ref branch-name
```

**Usage:**
```
运行 CI workflow
运行 deploy workflow，参数 environment=production
```

---

#### View Workflow Run
```bash
# 查看 workflow 运行状态
gh run view

# 查看特定运行
gh run view run-id

# 实时查看日志
gh run watch
```

**Usage:**
```
查看最新的 workflow 运行状态
实时查看当前运行的 workflow 日志
```

---

### 5. Release Management

#### Create Release
```bash
# 创建 release
gh release create v1.0.0

# 带标题和描述
gh release create v1.0.0 --title "Version 1.0.0" --notes "Release notes"

# 上传文件
gh release create v1.0.0 --title "v1.0.0" dist/*

# 从标签创建
gh release create v1.0.0 --target main
```

**Usage:**
```
创建 v1.0.0 release
创建 v2.0.0 release，标题 "Major Update"，上传 build/ 目录
```

---

#### List Releases
```bash
# 列出所有 releases
gh release list
```

**Usage:**
```
列出所有 releases
```

---

#### View Release
```bash
# 查看 release 详情
gh release view v1.0.0

# 在浏览器中打开
gh release view v1.0.0 --web
```

**Usage:**
```
查看 v1.0.0 release 的详细信息
```

---

### 6. Secret Management

#### Set Secret
```bash
# 设置 secret
gh secret set SECRET_NAME

# 从文件读取
gh secret set SECRET_NAME < secret.txt

# 从环境变量
gh secret set SECRET_NAME --body "$MY_SECRET"
```

**Usage:**
```
设置 API_KEY secret
设置 DATABASE_URL secret
```

---

#### List Secrets
```bash
# 列出所有 secrets
gh secret list
```

**Usage:**
```
列出所有 secrets
```

---

#### Delete Secret
```bash
# 删除 secret
gh secret delete SECRET_NAME
```

**Usage:**
```
删除 OLD_API_KEY secret
```

---

## Advanced Usage

### Batch Operations

#### Create Multiple Issues
```bash
# 从文件批量创建
while read title; do
  gh issue create --title "$title" --body "Auto-created"
done < issues.txt
```

**Usage:**
```
批量创建 10 个 Issues
```

---

#### Close Multiple Issues
```bash
# 批量关闭
gh issue list --label "wontfix" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {}
```

**Usage:**
```
关闭所有带 wontfix 标签的 Issues
```

---

### Automation Scripts

#### Auto-create PR on Branch Push
```bash
#!/bin/bash
# .git/hooks/post-push

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ $branch == feature/* ]]; then
  gh pr create --title "$branch" --body "Auto-created PR"
fi
```

---

#### Daily Report
```bash
# 生成日报
echo "## Daily Report - $(date)"
echo "### Issues Closed"
gh issue list --state closed --limit 10
echo "### PRs Merged"
gh pr list --state merged --limit 10
```

---

## Configuration

### Authenticate
```bash
# 登录 GitHub
gh auth login

# 检查认证状态
gh auth status

# 刷新 token
gh auth refresh
```

### Set Default Repository
```bash
# 在仓库目录下自动设置
cd /path/to/repo

# 或手动设置
gh repo set-default username/repo
```

### Configure Editor
```bash
# 设置默认编辑器
gh config set editor "code --wait"
```

---

## Troubleshooting

### Authentication Failed
**Problem**: `gh: authentication required`
**Solution**: 
```bash
gh auth login
```

### Repository Not Found
**Problem**: `Could not resolve to a Repository`
**Solution**: Check repository name and your access permissions

### Rate Limit Exceeded
**Problem**: `API rate limit exceeded`
**Solution**: Wait or authenticate for higher limits

### Command Not Found
**Problem**: `gh: command not found`
**Solution**: 
```bash
# Windows
winget install GitHub.cli

# macOS
brew install gh

# Linux
sudo apt install gh
```

---

## Best Practices

1. **Use Templates**: Create issue/PR templates
2. **Add Labels**: Use labels for organization
3. **Link Issues**: Reference issues in PRs (#123)
4. **Review Before Merge**: Always review code
5. **Use Draft PRs**: For work in progress
6. **Delete Branches**: Clean up after merge

---

## Related Skills

- `git-operations` - Git commands
- `ci-cd` - Continuous integration
- `code-review` - Code review automation

## Resources

- **GitHub CLI Docs**: https://cli.github.com/manual/
- **GitHub API**: https://docs.github.com/rest
- **GitHub Skills**: https://skills.github.com/
