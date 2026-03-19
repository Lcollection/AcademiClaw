---
name: data-analysis
description: Analyze datasets to extract insights, identify patterns, and generate reports. Use when exploring data, creating visualizations, or performing statistical analysis. Handles CSV, JSON, SQL queries, and Python pandas operations.
allowed-tools: Bash(python:*), Read, Write
---

# Data Analysis

Analyze datasets to extract insights, identify patterns, and generate reports.

## When to Use

- **Data exploration**: Understand a new dataset
- **Report generation**: Derive data-driven insights
- **Quality validation**: Check data consistency
- **Decision support**: Make data-driven recommendations

## Prerequisites

```bash
# Install required packages
pip install pandas numpy matplotlib seaborn scipy
```

## Step 1: Load and Explore Data

```python
import pandas as pd
import numpy as np

# Load CSV
df = pd.read_csv('data.csv')

# Basic info
print(df.info())
print(df.describe())
print(df.head(10))

# Check missing values
print(df.isnull().sum())

# Data types
print(df.dtypes)
```

## Step 2: Data Cleaning

```python
# Handle missing values
df['column'].fillna(df['column'].mean(), inplace=True)
df.dropna(subset=['required_column'], inplace=True)

# Remove duplicates
df.drop_duplicates(inplace=True)

# Type conversions
df['date'] = pd.to_datetime(df['date'])
df['category'] = df['category'].astype('category')

# Remove outliers (IQR method)
Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
df = df[(df['value'] >= Q1 - 1.5*IQR) & (df['value'] <= Q3 + 1.5*IQR)]
```

## Step 3: Statistical Analysis

```python
# Descriptive statistics
print(df['numeric_column'].describe())

# Grouped analysis
grouped = df.groupby('category').agg({
    'value': ['mean', 'sum', 'count'],
    'other': 'nunique'
})
print(grouped)

# Correlation
correlation = df[['col1', 'col2', 'col3']].corr()
print(correlation)

# Pivot table
pivot = pd.pivot_table(df,
    values='sales',
    index='region',
    columns='month',
    aggfunc='sum'
)
```

## Step 4: Visualization

```python
import matplotlib.pyplot as plt
import seaborn as sns

# Histogram
plt.figure(figsize=(10, 6))
df['value'].hist(bins=30)
plt.title('Distribution of Values')
plt.savefig('histogram.png')

# Boxplot
plt.figure(figsize=(10, 6))
sns.boxplot(x='category', y='value', data=df)
plt.title('Value by Category')
plt.savefig('boxplot.png')

# Heatmap (correlation)
plt.figure(figsize=(10, 8))
sns.heatmap(correlation, annot=True, cmap='coolwarm')
plt.title('Correlation Matrix')
plt.savefig('heatmap.png')

# Time series
plt.figure(figsize=(12, 6))
df.groupby('date')['value'].sum().plot()
plt.title('Time Series of Values')
plt.savefig('timeseries.png')
```

## Step 5: Derive Insights

```python
# Top/bottom analysis
top_10 = df.nlargest(10, 'value')
bottom_10 = df.nsmallest(10, 'value')

# Trend analysis
df['month'] = df['date'].dt.to_period('M')
monthly_trend = df.groupby('month')['value'].sum()
growth = monthly_trend.pct_change() * 100

# Segment analysis
segments = df.groupby('segment').agg({
    'revenue': 'sum',
    'customers': 'nunique',
    'orders': 'count'
})
segments['avg_order_value'] = segments['revenue'] / segments['orders']
```

## Output Format

```markdown
# Data Analysis Report

## 1. Dataset Overview
- Dataset: [name]
- Records: X,XXX
- Columns: XX
- Date range: YYYY-MM-DD ~ YYYY-MM-DD

## 2. Key Findings
- Insight 1
- Insight 2
- Insight 3

## 3. Statistical Summary
| Metric | Value |
|--------|-------|
| Mean | X.XX |
| Median | X.XX |
| Std dev | X.XX |

## 4. Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
```

## Best Practices

1. **Understand first**: Learn structure before analysis
2. **Incremental**: Move from simple to complex
3. **Visualize**: Use charts to spot patterns
4. **Validate**: Always verify assumptions
5. **Document**: Record analysis process

## Constraints

### Required (MUST)
1. Preserve raw data (work on copy)
2. Document analysis process
3. Validate results

### Prohibited (MUST NOT)
1. Expose sensitive personal data
2. Draw unsupported conclusions

## SQL Alternative

For databases, use SQL queries:

```sql
-- Basic stats
SELECT
    COUNT(*) as total_rows,
    COUNT(DISTINCT column) as unique_values,
    MIN(value) as min_val,
    MAX(value) as max_val,
    AVG(value) as avg_val
FROM table_name;

-- Grouped analysis
SELECT
    category,
    COUNT(*) as count,
    AVG(value) as avg_value
FROM table_name
GROUP BY category
ORDER BY count DESC;
```
