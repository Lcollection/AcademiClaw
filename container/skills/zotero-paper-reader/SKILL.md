---
name: zotero-paper-reader
description: Read and analyze academic papers from Zotero library. Use when the user requests to read, access, or analyze a paper by title, author, or topic from their Zotero library. Automatically searches Zotero, converts PDFs to markdown, and provides analysis.
allowed-tools: Bash(python:*), Bash(pymupdf:*), Read, WebSearch
---

# Zotero Paper Reader

Read and analyze academic papers directly from the Zotero library.

## When to Use

- "Read this paper from Zotero"
- "Find and read [paper title]"
- "Access [author name] paper"
- "Get the paper about [topic]"
- "Convert [paper] from Zotero to markdown"

## Workflow

### Step 1: Search Zotero Library

Search for the paper using SQLite:

```bash
sqlite3 ~/Zotero/zotero.sqlite "
SELECT
    items.key,
    itemDataValues.value as title,
    itemTypes.typeName
FROM items
JOIN itemData ON items.itemID = itemData.itemID
JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
JOIN fields ON itemData.fieldID = fields.fieldID
JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
WHERE fields.fieldName = 'title'
    AND itemDataValues.value LIKE '%关键词%'
ORDER BY items.dateAdded DESC
LIMIT 10;
"
```

### Step 2: Get PDF Attachment

```bash
sqlite3 ~/Zotero/zotero.sqlite "
SELECT
    itemAttachments.key,
    itemAttachments.path
FROM itemAttachments
WHERE parentItemID = (
    SELECT itemID FROM items WHERE key = 'ITEM_KEY'
)
AND contentType = 'application/pdf';
"
```

### Step 3: Convert PDF to Markdown

Use PyMuPDF to extract text:

```python
import fitz  # PyMuPDF

def pdf_to_markdown(pdf_path, output_path):
    """Convert PDF to Markdown"""
    doc = fitz.open(pdf_path)
    markdown_content = []

    for page_num, page in enumerate(doc, 1):
        text = page.get_text()
        markdown_content.append(f"## Page {page_num}\n\n{text}\n\n")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(''.join(markdown_content))

    doc.close()
    return output_path

# Usage
pdf_to_markdown("~/Zotero/storage/ABC123/paper.pdf", "paper.md")
```

### Step 4: Read and Analyze

Read the converted markdown file:

```python
# For large papers, read in sections
with open("paper.md", 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Read abstract and introduction (first 300-500 lines)
content = ''.join(lines[:500])
```

Provide the user with:
1. Paper metadata (title, authors, publication year)
2. Brief summary of the abstract
3. Main findings or sections of interest
4. Offer to read specific sections

## PDF Processing Tools

### Install PyMuPDF
```bash
pip install pymupdf
```

### Extract Text Only
```python
import fitz
doc = fitz.open("paper.pdf")
for page in doc:
    print(page.get_text())
```

### Extract with Formatting
```python
import fitz
doc = fitz.open("paper.pdf")
for page in doc:
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        if "lines" in block:
            for line in block["lines"]:
                for span in line["spans"]:
                    print(span["text"])
```

### Extract Images
```python
import fitz
doc = fitz.open("paper.pdf")
for page_num, page in enumerate(doc):
    images = page.get_images()
    for img_index, img in enumerate(images):
        xref = img[0]
        base_image = doc.extract_image(xref)
        with open(f"image_{page_num}_{img_index}.png", "wb") as f:
            f.write(base_image["image"])
```

## Example Usage

**User request:** "Read the paper 'Attention Is All You Need' from my Zotero library"

1. Search: Find paper by title
2. Get attachment: Find PDF path
3. Convert: Extract text to markdown
4. Analyze: Summarize key findings
5. Report: Provide structured summary

## Notes

- For large papers (>40k tokens), read in sections
- PyMuPDF handles most PDF formats well
- Some scanned PDFs may require OCR (use pytesseract)
- Complex layouts (multi-column) may need additional processing
