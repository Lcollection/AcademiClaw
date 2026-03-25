---
name: PDF Reader
slug: pdf-reader
version: 1.0.0
homepage: https://clawhub.com/skills/pdf-reader
description: "深度阅读和分析 PDF 论文。支持 PDF 转 Markdown、智能摘要、关键信息提取、问答式学习、笔记生成。"
changelog: "Initial release"
metadata:
  clawdbot:
    emoji: "\U{1F4C4}"
    requires:
      bins: [python]
      llm: true
    os: [win32, darwin, linux]
    configPaths:
      - "{workspace}/PaperVault/Papers/"
---

## When to Use

Use this skill when you want to:
- Read and analyze PDF papers in depth
- Extract key information from PDFs
- Convert PDF to Markdown
- Ask questions about a paper
- Generate comprehensive notes

**Triggers:**
- User says "read this PDF", "read paper", "阅读这篇论文"
- User provides a PDF file or path
- User asks "analyze this paper", "分析这篇论文"
- User mentions "PDF to Markdown", "PDF 转 Markdown"
- User wants "paper summary", "论文摘要"

## Quick Start

### Read a PDF
```
阅读 PDF: D:\Papers\attention-is-all-you-need.pdf
```

### Read from arXiv
```
阅读 arXiv 论文: 2303.12345
```

### Ask Questions
```
这篇论文的主要贡献是什么？
```

### Manual Run
```bash
python {workspace}/PaperVault/scripts/pdf-reader.py --pdf path/to/paper.pdf
```

## Features

### 1. PDF to Markdown Conversion
Converts PDF to structured Markdown:

**Input**: PDF file
**Output**: `{paper-name}.md`

**Conversion includes**:
- Text extraction
- Section detection
- Figure/table references
- Equation formatting
- Reference linking

**Example Output**:
```markdown
---
title: "Attention Is All You Need"
arxiv_id: "1706.03762"
date_read: 2024-03-25
reading_time: 45min
difficulty: ⭐⭐⭐☆☆
---

# Attention Is All You Need

> [!abstract] 摘要
> The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...

## 1. Introduction

Recurrent neural networks, long short-term memory and gated recurrent neural networks...

### 1.1 Background

The Transformer uses multi-headed self-attention...

## 2. Model Architecture

![Model Architecture](figures/model-architecture.png)

### 2.1 Encoder and Decoder Stacks

**Encoder**: The encoder is composed of a stack of N = 6 identical layers...

**Decoder**: The decoder is also composed of a stack of N = 6 identical layers...

## 3. Attention

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

## 4. Experiments

| Model | BLEU | Training Time |
|-------|------|---------------|
| Transformer (big) | 28.4 | 3.5 days |
| Transformer (base) | 27.3 | 12 hours |

## Key Insights

1. Self-attention allows modeling of dependencies regardless of distance
2. Multi-head attention enables attending to information from different positions
3. Positional encoding is necessary since the model contains no recurrence

## Questions

- [ ] Why divide by sqrt(d_k)?
- [ ] How does multi-head attention work in detail?
- [ ] What are the computational complexity trade-offs?

## References

1. Vaswani et al. (2017) - This paper
2. Bahdanau et al. (2015) - Attention mechanism
3. Gehring et al. (2017) - Convolutional sequence models
```

### 2. Intelligent Summarization
Generates multiple levels of summaries:

**1-sentence summary**: "Proposes Transformer, a purely attention-based architecture for sequence transduction."

**1-paragraph summary**: "The paper introduces the Transformer model, which relies entirely on self-attention mechanisms without recurrence or convolution. It achieves state-of-the-art performance on machine translation tasks with significantly reduced training time."

**Key points summary**:
- Novel architecture based solely on attention
- Eliminates recurrence and convolution
- Achieves new SOTA on translation tasks
- More parallelizable and faster to train

### 3. Information Extraction
Extracts structured information:

**Contributions**:
```json
{
  "contributions": [
    "Proposed Transformer architecture",
    "Introduced multi-head self-attention",
    "Achieved SOTA on WMT 2014",
    "Reduced training time significantly"
  ]
}
```

**Methods**:
```json
{
  "methods": [
    {
      "name": "Scaled Dot-Product Attention",
      "equation": "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V",
      "purpose": "Compute attention weights efficiently"
    },
    {
      "name": "Multi-Head Attention",
      "description": "Run multiple attention operations in parallel",
      "benefit": "Attend to information from different positions"
    }
  ]
}
```

**Experiments**:
```json
{
  "experiments": [
    {
      "task": "Machine Translation",
      "dataset": "WMT 2014 English-German",
      "metric": "BLEU",
      "result": 28.4,
      "baseline": 26.4
    }
  ]
}
```

### 4. Q&A Mode
Interactive question answering:

**User**: "What is the main innovation?"
**Assistant**: "The main innovation is replacing recurrent layers with self-attention mechanisms, allowing for more parallelization and better modeling of long-range dependencies."

**User**: "How does self-attention work?"
**Assistant**: "Self-attention computes relationships between all positions in a sequence simultaneously. For each position, it computes attention weights with respect to all other positions..."

**User**: "What are the limitations?"
**Assistant**: "Based on the paper and subsequent research: 1) Quadratic memory complexity for long sequences, 2) Position encoding may not generalize well, 3) Limited to fixed-length contexts..."

### 5. Note Generation
Generates comprehensive notes:

**Concept Notes**:
```markdown
# Self-Attention

## Definition
Self-attention is a mechanism that relates different positions of a single sequence...

## How It Works
1. Compute Query, Key, Value matrices
2. Calculate attention weights
3. Apply weights to values
4. Output weighted sum

## Why It Matters
- Captures long-range dependencies
- Highly parallelizable
- Interpretable attention patterns

## Applications
- Machine translation
- Text summarization
- Image generation

## Related Concepts
- [[Attention Mechanism]]
- [[Transformer]]
- [[Multi-Head Attention]]
```

**Method Notes**:
```markdown
# Multi-Head Attention

## Overview
Runs multiple self-attention operations in parallel...

## Implementation
```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        # ...
```

## Advantages
- Different heads can focus on different aspects
- More expressive than single attention
- Still computationally efficient

## Trade-offs
- More parameters
- Requires careful tuning
- May overfit on small datasets
```

## Reading Workflow

### Level 1: Quick Scan (5-10 min)
- Title and abstract
- Introduction
- Conclusion
- Key figures

**Output**: High-level understanding

### Level 2: Standard Read (30-60 min)
- All sections
- Important equations
- Key experiments
- Method details

**Output**: Detailed notes + questions

### Level 3: Deep Dive (2-4 hours)
- Every section in detail
- Derive equations
- Reproduce experiments
- Related work

**Output**: Comprehensive understanding + implementation

## Advanced Features

### Batch Processing
Process multiple PDFs:
```bash
python pdf-reader.py --dir D:\Papers\ --batch
```

### Comparison Mode
Compare multiple papers:
```
对比分析这两篇论文的异同
```

### Export Options
- **Markdown**: Default format
- **HTML**: With styling
- **PDF**: Annotated version
- **JSON**: Structured data

## Integration with Zotero

### Read from Zotero
```bash
python pdf-reader.py --zotero --query "attention mechanism"
```

### Save Back to Zotero
```bash
python pdf-reader.py --pdf paper.pdf --save-to-zotero
```

## Customization

### Custom Prompts
Create `prompts/custom-summary.txt`:
```
请从以下角度总结这篇论文：
1. 研究动机
2. 核心创新
3. 技术方案
4. 实验验证
5. 局限性
```

### Reading Templates
Create `templates/custom-template.md`:
```markdown
# {title}

## 一句话总结
{one_sentence_summary}

## 核心观点
{key_points}

## 技术细节
{technical_details}

## 我的思考
<!-- Your reflections -->
```

## Troubleshooting

### PDF Extraction Failed
```
Error: Cannot extract text from PDF
```
**Solutions**:
1. PDF might be scanned image - needs OCR
2. Try different extraction tool
3. Use `--ocr` flag

### Poor Quality Conversion
```
Warning: Many formatting errors
```
**Solutions**:
1. Check PDF quality
2. Use `--enhance` flag
3. Manual review needed

### LLM Rate Limit
```
Error: API rate limit exceeded
```
**Solution**: Wait or use different API key

## Best Practices

1. **Start with Abstract**: Always read abstract first
2. **Active Reading**: Take notes while reading
3. **Ask Questions**: Don't skip confusing parts
4. **Connect Knowledge**: Link to related papers
5. **Review Later**: Re-read important papers

## Keyboard Shortcuts (when using interactive mode)

| Key | Action |
|-----|--------|
| `n` | Next section |
| `p` | Previous section |
| `q` | Ask question |
| `s` | Save note |
| `h` | Highlight text |
| `f` | Find in paper |
| `Esc` | Exit |

## Related Skills

- `paper-fetcher` - Get papers to read
- `paper-summarizer` - Generate summaries
- `learning-reflector` - Reflect on reading
- `zotero-local` - Manage PDF library

## Future Enhancements

- [ ] Audio reading (TTS)
- [ ] Collaborative annotation
- [ ] Citation network visualization
- [ ] Automated fact-checking
- [ ] Multi-language support
