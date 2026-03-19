---
name: deep-research
description: Conduct enterprise-grade research with multi-source synthesis, citation tracking, and verification. Use when user needs comprehensive analysis requiring 10+ sources, verified claims, or comparison of approaches. Triggers include "deep research", "comprehensive analysis", "research report", "compare X vs Y", or "analyze trends". Do NOT use for simple lookups, debugging, or questions answerable with 1-2 searches.
allowed-tools: WebSearch, Read, Write, Bash(python:*)
---

# Deep Research

Conduct comprehensive, citation-backed research through multi-phase pipeline.

## When to Use

**Use when:**
- Comprehensive analysis (10+ sources needed)
- Comparing technologies/approaches/strategies
- State-of-the-art reviews
- Multi-perspective investigation
- Technical decisions
- Market/trend analysis

**Do NOT use:**
- Simple lookups (use WebSearch)
- Debugging (use standard tools)
- 1-2 search answers

## Research Modes

| Mode | Time | Sources | Use Case |
|------|------|---------|----------|
| Quick | 2-5 min | 5-10 | Exploration, time-sensitive |
| Standard | 5-10 min | 15-30 | Most use cases [DEFAULT] |
| Deep | 10-20 min | 30-50 | Important decisions |
| UltraDeep | 20-45 min | 50-100 | Critical analysis |

## Workflow

### Phase 1: SCOPE
Define research boundaries:
- Core question
- Key sub-questions
- Required perspectives
- Success criteria

### Phase 2: PLAN
Formulate search strategy:
- Decompose into search angles
- Identify source types needed
- Plan parallel searches

### Phase 3: RETRIEVE
**CRITICAL: Parallel execution**

Launch 5-10 searches simultaneously:
```
[Single message with multiple parallel tool calls]
WebSearch #1: Core topic semantic
WebSearch #2: Technical keywords
WebSearch #3: Recent 2024-2025 filtered
WebSearch #4: Academic domains
WebSearch #5: Critical analysis
WebSearch #6: Industry trends
```

### Phase 4: TRIANGULATE
Verify claims with 3+ sources:
- Cross-reference facts
- Score source credibility
- Flag contradictions

### Phase 5: SYNTHESIZE
Generate novel insights:
- Identify patterns
- Draw connections
- Extract implications

### Phase 6: CRITIQUE
Red-team analysis:
- Challenge assumptions
- Identify gaps
- Consider alternatives

### Phase 7: REFINE
Address weaknesses:
- Fill gaps
- Strengthen claims
- Improve citations

### Phase 8: PACKAGE
Generate comprehensive report.

## Anti-Hallucination Protocol

**CRITICAL - Every claim must cite sources:**

- ✅ GOOD: "Smith et al. (2024) found a 23% reduction [1]."
- ❌ BAD: "Studies show significant improvement."
- ✅ GOOD: "According to FDA data... [2]"
- ❌ BAD: "Research suggests..."

**When uncertain:**
- Say "No sources found for X" rather than fabricating
- Mark inferences as "This suggests..." not "Research shows..."

## Report Structure

```markdown
# Research Report: [Topic]

## Executive Summary
[50-250 words, key findings only]

## Introduction
[Research question, scope, methodology]

## Main Findings
### Finding 1: [Title]
[300-500 words with citations [1], [2], [3]]

### Finding 2: [Title]
[300-500 words with citations]

...

## Synthesis & Insights
[Novel patterns and implications]

## Limitations & Caveats
[Gaps, assumptions, uncertainties]

## Recommendations
[Actionable next steps]

## Bibliography
[1] Author (Year). "Title". Publication. URL
[2] ...
```

## Quality Gates

- Minimum 10+ sources
- 3+ sources per major claim
- Executive summary <250 words
- Full citations with URLs
- No placeholders (TBD, TODO)
- Clear facts vs. analysis distinction

## Writing Standards

- **Narrative-driven**: Flowing prose, not bullet lists
- **Precision**: Exact numbers embedded in sentences
- **Economy**: No fluff, respect reader's time
- **Clarity**: Technical terms, avoid ambiguity

Example:
- Bad: "significantly improved" → Good: "reduced mortality 23% (p<0.01)"
- Bad: "• Market: $2.4B" → Good: "The market reached $2.4 billion in 2023 [1]."
