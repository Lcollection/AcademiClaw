# GitHub CLI Skill 使用示例

## 1. 创建仓库

### 输入
```
创建一个私有仓库，名称为 my-awesome-project，描述为 "An awesome project"
```

### 执行
```bash
gh repo create my-awesome-project --private --description "An awesome project"
```

### 输出
```
✓ Created repository username/my-awesome-project
```

---

## 2. 克隆仓库

### 输入
```
克隆 facebook/react 到 D:\projects\react
```

### 执行
```bash
gh repo clone facebook/react D:\projects\react
```

### 输出
```
Cloning into 'D:\projects\react'...
✓ Cloned repository facebook/react
```

---

## 3. 创建 Issue

### 输入
```
在 username/repo 创建一个 Bug Issue，标题为 "登录页面加载缓慢"
```

### 执行
```bash
gh issue create --repo username/repo --title "登录页面加载缓慢" --label "bug"
```

### 输出
```
Creating issue in username/repo
✓ Created issue #123
https://github.com/username/repo/issues/123
```

---

## 4. 创建 Pull Request

### 输入
```
为 feature/user-auth 分支创建一个 PR，标题为 "添加用户认证功能"
```

### 执行
```bash
gh pr create --base main --head feature/user-auth --title "添加用户认证功能"
```

### 输出
```
Creating pull request for feature/user-auth into main in username/repo
✓ Created pull request #45
https://github.com/username/repo/pull/45
```

---

## 5. 查看工作流

### 输入
```
列出 username/repo 的所有 GitHub Actions 工作流
```

### 执行
```bash
gh workflow list --repo username/repo
```

### 输出
```
WORKFLOW               NAME               STATE    PATH
ci.yml                 CI                 active  .github/workflows/ci.yml
deploy.yml             Deploy             active  .github/workflows/deploy.yml
```

---

## 6. 触发工作流

### 输入
```
触发 username/repo 的 CI 工作流
```

### 执行
```bash
gh workflow run ci.yml --repo username/repo
```

### 输出
```
✓ Created workflow run
```

---

## 7. 创建 Release

### 输入
```
为 username/repo 创建 v2.0.0 版本的 Release
```

### 执行
```bash
gh release create v2.0.0 --repo username/repo --title "v2.0.0" --notes "## New Features\n\n- Feature 1\n- Feature 2"
```

### 输出
```
✓ Created release v2.0.0
https://github.com/username/repo/releases/tag/v2.0.0
```

---

## 8. 设置 Secret

### 输入
```
在 username/repo 中设置 API_KEY secret
```

### 执行
```bash
gh secret set API_KEY --repo username/repo
# 然后输入 secret 值
```

### 输出
```
✓ Set secret API_KEY
```

---

## 9. 查看仓库信息

### 输入
```
查看 facebook/react 的详细信息
```

### 执行
```bash
gh repo view facebook/react
```

### 输出
```
facebook/react
A declarative, efficient, and flexible JavaScript library for building user interfaces.

   223k  stars
   46.5k watching
   45.9k forks

      description: A declarative, efficient, and flexible JavaScript library for building user interfaces.
         homepage: https://react.dev
           license: MIT
            topics: javascript, library, react, frontend, user-interface

View this repository on GitHub: https://github.com/facebook/react
```

---

## 10. 批量操作示例

### 输入
```
批量关闭所有带 wontfix 标签的 Issues
```

### 执行
```bash
# 先列出
gh issue list --label "wontfix" --json number --jq '.[].number'

# 然后关闭
gh issue list --label "wontfix" --json number --jq '.[].number' | xargs -I {} gh issue close {}
```

### 输出
```
Closing issue #123...
✓ Closed issue #123
Closing issue #124...
✓ Closed issue #124
```

---

## 11. 自动化脚本示例

### 创建日报脚本

```bash
#!/bin/bash
# save as daily-report.sh

REPO=${1:-username/repo}
DATE=$(date +%Y-%m-%d)

echo "# Daily Report - $DATE"
echo ""
echo "## Issues Closed Today"
gh issue list --repo $REPO --state closed --limit 10 --json number,title,updatedAt --jq '.[] | "- #\(.number): \(.title)"'

echo ""
echo "## PRs Merged Today"
gh pr list --repo $REPO --state merged --limit 10 --json number,title,mergedAt --jq '.[] | "- #\(.number): \(.title)"'

echo ""
echo "## Active PRs"
gh pr list --repo $REPO --state open --limit 10

echo ""
echo "## Open Issues"
gh issue list --repo $REPO --state open --limit 10
```

**使用**:
```bash
chmod +x daily-report.sh
./daily-report.sh username/repo
```

---

## 12. CI/CD 集成示例

### GitHub Actions 工作流

```yaml
name: Auto Create PR

on:
  push:
    branches: [feature/*]

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create Pull Request
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          BRANCH=$(git rev-parse --abbrev-ref HEAD)
          TITLE="Feature: ${BRANCH#feature/}"
          BODY="Auto-created PR for ${BRANCH}"
          
          gh pr create \
            --title "$TITLE" \
            --body "$BODY" \
            --base main \
            --draft
```

---

## 更多示例

查看 [GitHub CLI 官方文档](https://cli.github.com/manual/) 获取更多命令和用法。
