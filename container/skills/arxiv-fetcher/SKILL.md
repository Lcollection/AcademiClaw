---
name: arxiv-fetcher
description: >
  Fetch academic papers from arXiv by ID, DOI, or title search.
  Supports metadata retrieval and PDF download.
  Triggers: "arxiv", "paper", "论文", "preprint", "DOI".
allowed-tools: Bash(curl:*), Bash(python:*), Read, Write
---

# arXiv Paper Fetcher

Fetch academic papers from arXiv by ID, DOI, or title search.

## When to Use

- "Get paper 2301.07041 from arXiv"
- "Search arXiv for attention is all you need"
- "Fetch DOI 10.48550/arXiv.2301.07041"
- "Download PDF from arXiv 2301.07041"
- "arxiv 论文", "预印本"

## Quick Start

```bash
# Fetch by arXiv ID
arxiv-fetch 2301.07041

# Fetch by DOI
arxiv-fetch 10.48550/arXiv.2301.07041

# Search by title
arxiv-search "attention is all you need"

# Download PDF
arxiv-download 2301.07041
```

## API Reference

### arxiv-fetch

Fetch paper metadata by arXiv ID or DOI.

```bash
arxiv-fetch <id_or_doi>
```

**Examples:**
```bash
arxiv-fetch 2301.07041           # New format
arxiv-fetch hep-th/9901001       # Old format
arxiv-fetch 10.48550/arXiv.2301.07041  # DOI
```

**Output:**
```json
{
  "id": "2301.07041",
  "title": "Paper Title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "...",
  "categories": ["cs.AI", "cs.LG"],
  "published": "2023-01-17",
  "updated": "2023-01-18",
  "pdf_url": "https://arxiv.org/pdf/2301.07041",
  "abs_url": "https://arxiv.org/abs/2301.07041",
  "doi": "10.48550/arXiv.2301.07041"
}
```

### arxiv-search

Search arXiv by title, author, or abstract.

```bash
arxiv-search "<query>" [--max 10] [--category cs.AI]
```

**Options:**
- `--max N`: Maximum results (default: 10)
- `--category CAT`: Filter by category (e.g., cs.AI, physics)
- `--author NAME`: Filter by author

**Examples:**
```bash
arxiv-search "attention mechanism"
arxiv-search "transformer" --category cs.LG --max 5
arxiv-search "author:Vaswani" "attention"
```

### arxiv-download

Download PDF from arXiv.

```bash
arxiv-download <id> [--output path.pdf]
```

**Examples:**
```bash
arxiv-download 2301.07041
arxiv-download 2301.07041 --output paper.pdf
```

## DOI Support

arXiv DOIs follow the format: `10.48550/arXiv.<ID>`

```bash
# All equivalent:
arxiv-fetch 2301.07041
arxiv-fetch https://arxiv.org/abs/2301.07041
arxiv-fetch https://doi.org/10.48550/arXiv.2301.07041
arxiv-fetch 10.48550/arXiv.2301.07041
```

## Categories

Common arXiv categories:

| Category | Description |
|----------|-------------|
| cs.AI | Artificial Intelligence |
| cs.CL | Computation and Language (NLP) |
| cs.CV | Computer Vision |
| cs.LG | Machine Learning |
| cs.RO | Robotics |
| physics | Physics (various) |
| math | Mathematics |
| stat.ML | Statistics - Machine Learning |
| q-bio | Quantitative Biology |
| q-fin | Quantitative Finance |

## Python Implementation

```python
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import json
import re

ARXIV_API = "http://export.arxiv.org/api/query"

def parse_arxiv_id(input_str: str) -> str:
    """Extract arXiv ID from various formats."""
    # DOI format: 10.48550/arXiv.2301.07041
    doi_match = re.search(r'10\.48550/arXiv\.(\d{4}\.\d{4,5})', input_str)
    if doi_match:
        return doi_match.group(1)
    
    # URL format: https://arxiv.org/abs/2301.07041
    url_match = re.search(r'arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5}|[a-z-]+/\d+)', input_str)
    if url_match:
        return url_match.group(1)
    
    # Direct ID format
    id_match = re.search(r'(\d{4}\.\d{4,5}|[a-z-]+/\d+)', input_str)
    if id_match:
        return id_match.group(1)
    
    return input_str

def fetch_paper(identifier: str) -> dict:
    """Fetch paper metadata from arXiv."""
    arxiv_id = parse_arxiv_id(identifier)
    
    url = f"{ARXIV_API}?id_list={arxiv_id}"
    
    with urllib.request.urlopen(url) as response:
        xml_data = response.read().decode('utf-8')
    
    root = ET.fromstring(xml_data)
    
    # Namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entry = root.find('atom:entry', ns)
    if entry is None:
        return {"error": "Paper not found"}
    
    # Parse entry
    title = entry.find('atom:title', ns).text.strip()
    summary = entry.find('atom:summary', ns).text.strip()
    published = entry.find('atom:published', ns).text[:10]
    updated = entry.find('atom:updated', ns).text[:10]
    
    authors = []
    for author in entry.findall('atom:author', ns):
        name = author.find('atom:name', ns).text
        authors.append(name)
    
    categories = []
    for cat in entry.findall('atom:category', ns):
        categories.append(cat.get('term'))
    
    # arXiv ID from entry
    id_url = entry.find('atom:id', ns).text
    arxiv_id = id_url.split('/abs/')[-1]
    
    return {
        "id": arxiv_id,
        "title": title,
        "authors": authors,
        "abstract": summary,
        "categories": categories,
        "published": published,
        "updated": updated,
        "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}",
        "abs_url": f"https://arxiv.org/abs/{arxiv_id}",
        "doi": f"10.48550/arXiv.{arxiv_id}"
    }

def search_papers(query: str, max_results: int = 10, category: str = None) -> list:
    """Search arXiv papers."""
    params = {
        'search_query': f'all:{query}',
        'max_results': max_results
    }
    
    if category:
        params['search_query'] = f'cat:{category} AND all:{query}'
    
    url = f"{ARXIV_API}?{urllib.parse.urlencode(params)}"
    
    with urllib.request.urlopen(url) as response:
        xml_data = response.read().decode('utf-8')
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    results = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns).text.strip()
        summary = entry.find('atom:summary', ns).text.strip()
        
        id_url = entry.find('atom:id', ns).text
        arxiv_id = id_url.split('/abs/')[-1]
        
        authors = []
        for author in entry.findall('atom:author', ns)[:3]:
            authors.append(author.find('atom:name', ns).text)
        
        results.append({
            "id": arxiv_id,
            "title": title,
            "authors": authors,
            "abstract": summary[:300] + "...",
            "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}"
        })
    
    return results

def download_pdf(arxiv_id: str, output_path: str = None) -> str:
    """Download PDF from arXiv."""
    arxiv_id = parse_arxiv_id(arxiv_id)
    
    if output_path is None:
        output_path = f"{arxiv_id.replace('/', '_')}.pdf"
    
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
    
    urllib.request.urlretrieve(pdf_url, output_path)
    
    return output_path

# CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: arxiv-fetcher.py <command> [args]")
        print("Commands: fetch, search, download")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "fetch":
        result = fetch_paper(sys.argv[2])
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == "search":
        query = sys.argv[2]
        max_results = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        results = search_papers(query, max_results)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    
    elif cmd == "download":
        arxiv_id = sys.argv[2]
        output = sys.argv[3] if len(sys.argv) > 3 else None
        path = download_pdf(arxiv_id, output)
        print(f"Downloaded to: {path}")
```

## Example Workflow

### 1. Search for papers

```bash
python arxiv-fetcher.py search "large language models" 5
```

### 2. Fetch specific paper

```bash
python arxiv-fetcher.py fetch 2303.08774
```

### 3. Download PDF

```bash
python arxiv-fetcher.py download 2303.08774 gpt4.pdf
```

## Integration with Zotero

After downloading, add to Zotero:

```bash
# Download PDF
python arxiv-fetcher.py download 2301.07041

# Use zotero-local skill to add to library
# (requires Zotero with local API enabled)
```

## Notes

- arXiv API has rate limits (3 seconds between requests recommended)
- Old format IDs: `hep-th/9901001`
- New format IDs: `2301.07041`
- DOI format: `10.48550/arXiv.<ID>`
