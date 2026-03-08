---
name: workflow-patterns
description: "Industry-specific workflow patterns and templates for finance, healthcare, logistics, manufacturing, retail, and common use cases like AI document processing, API integration, business rules, ETL, RAG, security, and project management. Use when asking about 'workflow examples', 'workflow templates', 'industry workflows', 'finance workflows', 'healthcare workflows', 'logistics workflows', 'manufacturing workflows', 'retail workflows', 'ETL workflows', 'RAG workflows', 'API workflows', 'document processing', 'business rules', or 'workflow patterns'."
---

# Kailash Workflows - Industry Patterns & Templates

Production-ready workflow patterns and templates for industry-specific use cases and common application patterns.

## Overview

Complete workflow patterns for:

- Industry-specific applications
- Common use case templates
- Production-ready patterns
- Best practice implementations

## Industry-Specific Patterns

### Finance

- **[workflow-industry-finance](workflow-industry-finance.md)** - Financial services workflows
  - Payment processing
  - Fraud detection
  - Risk assessment
  - Compliance reporting
  - Trade settlement
  - Credit scoring

### Healthcare

- **[workflow-industry-healthcare](workflow-industry-healthcare.md)** - Healthcare workflows
  - Patient data processing
  - Medical record management
  - Clinical decision support
  - Insurance claims
  - Lab result processing
  - HIPAA compliance

### Logistics

- **[workflow-industry-logistics](workflow-industry-logistics.md)** - Logistics workflows
  - Order fulfillment
  - Inventory management
  - Route optimization
  - Shipment tracking
  - Warehouse automation
  - Supply chain coordination

### Manufacturing

- **[workflow-industry-manufacturing](workflow-industry-manufacturing.md)** - Manufacturing workflows
  - Production planning
  - Quality control
  - Equipment monitoring
  - Maintenance scheduling
  - Supply chain management
  - Defect tracking

### Retail

- **[workflow-industry-retail](workflow-industry-retail.md)** - Retail workflows
  - Order processing
  - Inventory management
  - Customer service automation
  - Pricing optimization
  - Promotional campaigns
  - Returns processing

## Common Use Case Patterns

### AI & Document Processing

- **[workflow-pattern-ai-document](workflow-pattern-ai-document.md)** - AI document processing
  - Document classification
  - Entity extraction
  - Document summarization
  - OCR and parsing
  - Form processing
  - Multi-document analysis

## Important: Data Flow Syntax

Many pattern files use `{{node_id.output_port}}` shorthand in node config to show which data flows where. **This is pseudocode** — Kailash does NOT support template interpolation in node config. In real code, use `builder.connect()`:

```python
# Pseudocode shorthand in patterns:
#   "params": "{{validate.rows}}"
# Actual code:
builder.connect("validate", "rows", "target_node", "params")
```

Similarly, `{{input.xxx}}` references workflow-level inputs passed via `runtime.execute(workflow, {"xxx": value})`.

## Pattern Usage

### How to Use Patterns

1. **Select Pattern**: Choose relevant industry or use case
2. **Review Template**: Study the pattern structure
3. **Customize**: Adapt to your specific needs
4. **Test**: Follow testing best practices
5. **Deploy**: Use production deployment patterns

### Pattern Structure

Each pattern includes:

- **Overview**: Use case description
- **Architecture**: Workflow design
- **Nodes Used**: Required nodes
- **Configuration**: Parameter setup
- **Example Code**: Working implementation
- **Best Practices**: Production tips
- **Testing**: Test strategies

## When to Use This Skill

Use this skill when you need:

- Industry-specific workflow templates
- Production-ready starting points
- Common use case implementations
- Best practice examples
- Workflow design inspiration
- Pattern-based development

## Implementation Tips

### Starting from Patterns

```python
import kailash

# 1. Copy pattern template
builder = kailash.WorkflowBuilder()

# 2. Add nodes from pattern
builder.add_node("NodeType", "id", {...})

# 3. Customize parameters
# 4. Add industry-specific logic
# 5. Test with real data
```

### Combining Patterns

- Mix patterns for complex workflows
- Use common patterns as building blocks
- Adapt industry patterns to your domain
- Layer security patterns on all workflows

## Quick Patterns

### ETL Workflow

```python
builder.add_node("CSVProcessorNode", "extract", {"action": "read", "source_path": "data.csv"})
builder.add_node("JSONTransformNode", "transform", {"expression": "@"})
builder.add_node("SQLQueryNode", "load", {"query": "INSERT INTO target VALUES (?, ?)"})
builder.connect("extract", "rows", "transform", "data")
builder.connect("transform", "result", "load", "body")
```

### RAG Workflow

```python
builder.add_node("EmbeddingNode", "embed", {"model": "text-embedding-3-small"})
builder.add_node("VectorSearchNode", "search", {"collection": "documents", "top_k": 5})
builder.add_node("LLMNode", "generate", {"model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")})
```

## CRITICAL Warnings

| Rule                         | Reason                    |
| ---------------------------- | ------------------------- |
| ❌ NEVER hardcode secrets    | Use environment variables |
| ✅ ALWAYS validate inputs    | At workflow boundaries    |
| ❌ NEVER skip error handling | Required in production    |

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core workflow creation
- **[06-cheatsheets](../cheatsheets/SKILL.md)** - Pattern quick reference
- **[08-nodes-reference](../nodes/SKILL.md)** - Node reference
- **[02-dataflow](../../02-dataflow/SKILL.md)** - Database workflows
- **[03-nexus](../../03-nexus/SKILL.md)** - Workflow deployment
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Best practices

## Support

For workflow pattern help, invoke:

- `pattern-expert` - Workflow pattern selection and design
- `framework-advisor` - Architecture decisions
- `testing-specialist` - Pattern testing strategies
