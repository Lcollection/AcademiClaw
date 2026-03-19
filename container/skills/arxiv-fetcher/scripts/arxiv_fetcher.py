#!/usr/bin/env python3
"""
arXiv Paper Fetcher

Fetch academic papers from arXiv by ID, DOI, or title search.

Usage:
    python arxiv_fetcher.py fetch <id_or_doi>
    python arxiv_fetcher.py search "<query>" [--max N]
    python arxiv_fetcher.py download <id> [--output path.pdf]
"""

import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET
import json
import re
import sys
import os
import time
from typing import Optional, List, Dict, Any

ARXIV_API = "http://export.arxiv.org/api/query"
ARXIV_PDF_BASE = "https://arxiv.org/pdf"

# Rate limiting
LAST_REQUEST_TIME = 0
MIN_REQUEST_INTERVAL = 3  # seconds


def rate_limit():
    """Ensure minimum interval between API requests."""
    global LAST_REQUEST_TIME
    elapsed = time.time() - LAST_REQUEST_TIME
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)
    LAST_REQUEST_TIME = time.time()


def parse_arxiv_id(input_str: str) -> str:
    """
    Extract arXiv ID from various formats.
    
    Supports:
    - New format: 2301.07041
    - Old format: hep-th/9901001
    - DOI: 10.48550/arXiv.2301.07041
    - URL: https://arxiv.org/abs/2301.07041
    - URL with version: https://arxiv.org/abs/2301.07041v2
    """
    input_str = input_str.strip()
    
    # DOI format: 10.48550/arXiv.2301.07041
    doi_match = re.search(r'10\.48550/arXiv\.(\d{4}\.\d{4,5}(?:v\d+)?)', input_str)
    if doi_match:
        return doi_match.group(1)
    
    # URL format: https://arxiv.org/abs/2301.07041
    url_match = re.search(
        r'arxiv\.org/(?:abs|pdf)/([a-z-]+/\d+|\d{4}\.\d{4,5})(?:v\d+)?',
        input_str
    )
    if url_match:
        return url_match.group(1)
    
    # Direct ID format: 2301.07041 or hep-th/9901001
    # New format with version: 2301.07041v2
    id_match = re.search(
        r'(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+/\d+)',
        input_str
    )
    if id_match:
        return id_match.group(1)
    
    return input_str


def parse_entry(entry: ET.Element, ns: dict) -> Dict[str, Any]:
    """Parse a single arXiv entry into a dictionary."""
    title_elem = entry.find('atom:title', ns)
    title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
    
    summary_elem = entry.find('atom:summary', ns)
    abstract = summary_elem.text.strip() if summary_elem is not None and summary_elem.text else ""
    
    published_elem = entry.find('atom:published', ns)
    published = published_elem.text[:10] if published_elem is not None and published_elem.text else ""
    
    updated_elem = entry.find('atom:updated', ns)
    updated = updated_elem.text[:10] if updated_elem is not None and updated_elem.text else ""
    
    # Authors
    authors = []
    for author in entry.findall('atom:author', ns):
        name_elem = author.find('atom:name', ns)
        if name_elem is not None and name_elem.text:
            authors.append(name_elem.text)
    
    # Categories
    categories = []
    for cat in entry.findall('atom:category', ns):
        term = cat.get('term')
        if term:
            categories.append(term)
    
    # arXiv ID from entry URL
    id_url_elem = entry.find('atom:id', ns)
    id_url = id_url_elem.text if id_url_elem is not None and id_url_elem.text else ""
    arxiv_id = id_url.split('/abs/')[-1] if '/abs/' in id_url else ""
    
    # Extract version if present
    version_match = re.search(r'(v\d+)$', arxiv_id)
    version = version_match.group(1) if version_match else "v1"
    base_id = arxiv_id.rsplit('v', 1)[0] if version_match else arxiv_id
    
    return {
        "id": arxiv_id,
        "base_id": base_id,
        "version": version,
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "categories": categories,
        "published": published,
        "updated": updated,
        "pdf_url": f"{ARXIV_PDF_BASE}/{arxiv_id}",
        "abs_url": f"https://arxiv.org/abs/{arxiv_id}",
        "doi": f"10.48550/arXiv.{base_id}"
    }


def fetch_paper(identifier: str) -> Dict[str, Any]:
    """
    Fetch paper metadata from arXiv.
    
    Args:
        identifier: arXiv ID, DOI, or URL
        
    Returns:
        Dictionary with paper metadata
    """
    arxiv_id = parse_arxiv_id(identifier)
    
    rate_limit()
    
    url = f"{ARXIV_API}?id_list={urllib.parse.quote(arxiv_id)}"
    
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            xml_data = response.read().decode('utf-8')
    except urllib.error.URLError as e:
        return {"error": f"Network error: {e}"}
    
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        return {"error": f"XML parse error: {e}"}
    
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entry = root.find('atom:entry', ns)
    if entry is None:
        return {"error": f"Paper not found: {identifier}"}
    
    return parse_entry(entry, ns)


def search_papers(
    query: str,
    max_results: int = 10,
    category: Optional[str] = None,
    author: Optional[str] = None,
    title_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Search arXiv papers.
    
    Args:
        query: Search query
        max_results: Maximum number of results
        category: Filter by category (e.g., cs.AI, cs.LG)
        author: Filter by author name
        title_only: Search only in titles
        
    Returns:
        List of paper metadata dictionaries
    """
    rate_limit()
    
    # Build search query
    search_parts = []
    
    if title_only:
        search_parts.append(f'ti:{query}')
    elif author:
        search_parts.append(f'au:{author}')
        search_parts.append(f'all:{query}')
    else:
        search_parts.append(f'all:{query}')
    
    if category:
        search_parts.insert(0, f'cat:{category}')
    
    search_query = ' AND '.join(search_parts)
    
    params = {
        'search_query': search_query,
        'max_results': max_results,
        'sortBy': 'relevance',
        'sortOrder': 'descending'
    }
    
    url = f"{ARXIV_API}?{urllib.parse.urlencode(params)}"
    
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            xml_data = response.read().decode('utf-8')
    except urllib.error.URLError as e:
        return [{"error": f"Network error: {e}"}]
    
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        return [{"error": f"XML parse error: {e}"}]
    
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    results = []
    for entry in root.findall('atom:entry', ns):
        paper = parse_entry(entry, ns)
        # Truncate abstract for search results
        if len(paper.get("abstract", "")) > 300:
            paper["abstract"] = paper["abstract"][:300] + "..."
        results.append(paper)
    
    return results


def download_pdf(
    identifier: str,
    output_path: Optional[str] = None,
    output_dir: str = "."
) -> Dict[str, Any]:
    """
    Download PDF from arXiv.
    
    Args:
        identifier: arXiv ID, DOI, or URL
        output_path: Full output path (optional)
        output_dir: Output directory if output_path not specified
        
    Returns:
        Dictionary with download status and path
    """
    arxiv_id = parse_arxiv_id(identifier)
    
    # Determine output path
    if output_path:
        full_path = output_path
    else:
        # Use arXiv ID as filename (replace / with _)
        safe_id = arxiv_id.replace('/', '_')
        full_path = os.path.join(output_dir, f"{safe_id}.pdf")
    
    # Create directory if needed
    os.makedirs(os.path.dirname(full_path) if os.path.dirname(full_path) else ".", exist_ok=True)
    
    pdf_url = f"{ARXIV_PDF_BASE}/{arxiv_id}"
    
    rate_limit()
    
    try:
        urllib.request.urlretrieve(pdf_url, full_path)
        return {
            "success": True,
            "arxiv_id": arxiv_id,
            "pdf_url": pdf_url,
            "saved_path": os.path.abspath(full_path)
        }
    except urllib.error.URLError as e:
        return {
            "success": False,
            "error": f"Download failed: {e}"
        }


def main():
    """CLI interface."""
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExamples:")
        print("  python arxiv_fetcher.py fetch 2301.07041")
        print("  python arxiv_fetcher.py fetch 10.48550/arXiv.2301.07041")
        print("  python arxiv_fetcher.py search \"attention is all you need\"")
        print("  python arxiv_fetcher.py search \"transformer\" --category cs.LG --max 5")
        print("  python arxiv_fetcher.py download 2301.07041")
        print("  python arxiv_fetcher.py download 2301.07041 --output paper.pdf")
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "fetch":
        if len(sys.argv) < 3:
            print("Usage: python arxiv_fetcher.py fetch <id_or_doi>")
            sys.exit(1)
        
        identifier = sys.argv[2]
        result = fetch_paper(identifier)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    elif cmd == "search":
        if len(sys.argv) < 3:
            print("Usage: python arxiv_fetcher.py search \"<query>\" [--max N] [--category CAT]")
            sys.exit(1)
        
        query = sys.argv[2]
        max_results = 10
        category = None
        author = None
        
        i = 3
        while i < len(sys.argv):
            if sys.argv[i] == "--max" and i + 1 < len(sys.argv):
                max_results = int(sys.argv[i + 1])
                i += 2
            elif sys.argv[i] == "--category" and i + 1 < len(sys.argv):
                category = sys.argv[i + 1]
                i += 2
            elif sys.argv[i] == "--author" and i + 1 < len(sys.argv):
                author = sys.argv[i + 1]
                i += 2
            elif sys.argv[i] == "--title":
                title_only = True
                i += 1
            else:
                i += 1
        
        results = search_papers(query, max_results, category, author)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    
    elif cmd == "download":
        if len(sys.argv) < 3:
            print("Usage: python arxiv_fetcher.py download <id> [--output path.pdf]")
            sys.exit(1)
        
        identifier = sys.argv[2]
        output_path = None
        
        if "--output" in sys.argv:
            idx = sys.argv.index("--output")
            if idx + 1 < len(sys.argv):
                output_path = sys.argv[idx + 1]
        
        result = download_pdf(identifier, output_path)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    else:
        print(f"Unknown command: {cmd}")
        print("Commands: fetch, search, download")
        sys.exit(1)


if __name__ == "__main__":
    main()
