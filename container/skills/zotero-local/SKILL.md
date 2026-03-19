---
name: zotero-local
description: >
  本地 Zotero 数据库完整管理技能。支持增删改查、PDF 文件读取和学习。
  使用场景：(1) 管理文献库 (2) 搜索和查询文献 (3) 读取 PDF 并分析 (4) 导出引用 (5) 批量操作。
  触发词："zotero", "文献", "论文", "PDF", "引用", "搜索"。
allowed-tools: Bash(sqlite3:*), Bash(python:*), Read, Write
---

# Zotero 本地完整管理

**完整的本地文献库管理：增删改查 + PDF 学习**

## 前提条件

### 1. 数据库位置

```bash
# 默认位置
Windows: C:\Users\<用户名>\Zotero\zotero.sqlite
macOS: ~/Zotero/zotero.sqlite
Linux: ~/Zotero/zotero.sqlite

# 自定义位置（检查配置）
配置文件: %APPDATA%\Zotero\Zotero\Profiles\*\prefs.js
查找: extensions.zotero.dataDir
```

### 2. 数据库结构

```bash
# 主要表
items           - 文献主表
itemData        - 文献数据
itemDataValues  - 数据值
itemTypes       - 文献类型
fields          - 字段定义
creators        - 作者信息
tags            - 标签
collections     - 集合
itemAttachments - 附件信息
```

### 3. 安全机制

```bash
# ⚠️ 重要：操作前必须备份
cp /path/to/zotero.sqlite /path/to/zotero_backup_$(date +%Y%m%d_%H%M%S).sqlite

# 建议使用事务
BEGIN TRANSACTION;
-- 你的操作
COMMIT; -- 或 ROLLBACK; 如果出错
```

---

## 一、查询操作（SELECT）

### 1.1 基础搜索

#### 按标题搜索
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT
    items.key,
    itemDataValues.value as title,
    itemTypes.typeName,
    items.dateAdded
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
WHERE fields.fieldName = 'title'
    AND itemDataValues.value LIKE '%关键词%'
ORDER BY items.dateAdded DESC
LIMIT 20;
"
```

#### 按作者搜索
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT DISTINCT
    items.key,
    itemDataValues.value as title,
    creators.firstName || ' ' || creators.lastName as author
FROM items
JOIN itemCreators ON items.itemID = itemCreators.itemID
JOIN creators ON itemCreators.creatorID = creators.creatorID
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
WHERE fields.fieldName = 'title'
    AND (creators.firstName LIKE '%作者%' OR creators.lastName LIKE '%作者%')
ORDER BY items.dateAdded DESC
LIMIT 20;
"
```

#### 按标签搜索
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT DISTINCT
    items.key,
    itemDataValues.value as title,
    GROUP_CONCAT(DISTINCT tags.name) as tags
FROM items
JOIN itemTags ON items.itemID = itemTags.itemID
JOIN tags ON itemTags.tagID = tags.tagID
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
WHERE fields.fieldName = 'title'
    AND tags.name LIKE '%标签%'
GROUP BY items.itemID
ORDER BY items.dateAdded DESC
LIMIT 20;
"
```

### 1.2 高级查询

#### 多条件组合
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT DISTINCT
    items.key,
    itemDataValues.value as title,
    GROUP_CONCAT(DISTINCT tags.name) as tags
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
LEFT JOIN itemTags ON items.itemID = itemTags.itemID
LEFT JOIN tags ON itemTags.tagID = tags.tagID
WHERE fields.fieldName = 'title'
    AND items.dateAdded > date('now', '-1 year')
    AND (itemDataValues.value LIKE '%AI%' OR itemDataValues.value LIKE '%机器学习%')
GROUP BY items.itemID
ORDER BY items.dateAdded DESC
LIMIT 50;
"
```

#### 查找重复文献
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT
    itemDataValues.value as title,
    COUNT(*) as duplicates,
    GROUP_CONCAT(items.key) as keys
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
WHERE fields.fieldName = 'title'
GROUP BY LOWER(itemDataValues.value)
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;
"
```

### 1.3 统计分析

#### 文献类型统计
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT
    itemTypes.typeName,
    COUNT(*) as count
FROM items
JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
GROUP BY items.itemTypeID
ORDER BY count DESC;
"
```

#### 年度趋势
```bash
sqlite3 /path/to/zotero.sqlite "
SELECT
    substr(itemDataValues.value, 1, 4) as year,
    COUNT(*) as count
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
WHERE fields.fieldName = 'date'
    AND itemDataValues.value IS NOT NULL
    AND itemDataValues.value != ''
GROUP BY year
ORDER BY year DESC
LIMIT 20;
"
```

---

## 二、PDF 文件读取和学习

### 2.1 查找 PDF 路径

```bash
# 查找文献的 PDF 附件
sqlite3 /path/to/zotero.sqlite "
SELECT
    items.key,
    itemDataValues.value as title,
    itemAttachments.key as attachment_key,
    itemAttachments.path as pdf_path
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
JOIN itemAttachments ON items.itemID = itemAttachments.parentItemID
WHERE fields.fieldName = 'title'
    AND itemAttachments.contentType = 'application/pdf'
    AND itemDataValues.value LIKE '%关键词%';
"
```

### 2.2 PDF 路径解析

Zotero 的 PDF 路径格式：
- **相对路径**: `storage:ABC12345/paper.pdf`
- **绝对路径**: `C:\Users\...\Zotero\storage\ABC12345\paper.pdf`

```python
import os

def resolve_pdf_path(attachment_path, zotero_data_dir):
    """解析 Zotero PDF 路径"""

    # 处理 storage: 格式
    if attachment_path.startswith('storage:'):
        relative = attachment_path.replace('storage:', '')
        return os.path.join(zotero_data_dir, 'storage', relative)

    # 已经是绝对路径
    elif os.path.isabs(attachment_path):
        return attachment_path

    # 相对路径
    else:
        return os.path.join(zotero_data_dir, attachment_path)
```

---

## 三、最佳实践

### 3.1 安全操作

1. ⚠️ 操作前必须备份数据库
2. 使用事务保护写操作
3. 关闭 Zotero 再操作（或使用副本）
4. 记录操作日志

### 3.2 性能优化

```sql
-- 在副本上创建索引加速查询
CREATE INDEX idx_title ON itemDataValues(value);
CREATE INDEX idx_date ON items(dateAdded);

-- 优化数据库
VACUUM;
ANALYZE;
```

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 搜索 | `SELECT ... WHERE title LIKE '%关键词%'` |
| 统计 | `SELECT typeName, COUNT(*) FROM items GROUP BY itemTypeID` |
| PDF 路径 | `SELECT path FROM itemAttachments WHERE ...` |
| 备份 | `cp zotero.sqlite backup.sqlite` |
