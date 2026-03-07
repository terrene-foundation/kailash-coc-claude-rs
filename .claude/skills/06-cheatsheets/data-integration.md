---
name: data-integration
description: "Data integration patterns for APIs, files, and databases. Use when asking 'data integration', 'integrate data', 'data sources', 'API integration', or 'file integration'."
---

# Data Integration

Data Integration guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `core-patterns`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Data Integration
- **Category**: core-patterns
- **Priority**: HIGH
- **Trigger Keywords**: data integration, integrate data, data sources, API integration, file integration

## Core Pattern

```python

# Data Integration implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Data-Integration Processing**: Extract, transform, load data from various sources with validation
- **Format Conversion**: CSV, JSON, XML, Parquet conversions with schema validation and type handling
- **API Integration**: REST, GraphQL, WebSocket integrations with authentication and error handling
- **Batch Processing**: High-volume data processing with streaming, pagination, and memory optimization
- **Data Quality**: Validation, deduplication, enrichment, normalization for clean data pipelines

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:
- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Tip 1**: Follow best practices from documentation
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference examples for complex cases

## Keywords for Auto-Trigger

<!-- Trigger Keywords: data integration, integrate data, data sources, API integration, file integration -->
