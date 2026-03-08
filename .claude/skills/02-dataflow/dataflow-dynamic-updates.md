# DataFlow Dynamic Updates with EmbeddedPythonNode

**Multi-output EmbeddedPythonNode** enables natural, intuitive dynamic update patterns.

## TL;DR

```python
# NEW: Multi-output pattern
builder.add_node("EmbeddedPythonNode", "prepare", {
    "code": """
filter_data = {"id": summary_id}
summary_markdown = updated_text
edited_by_user = True
"""
})

builder.add_node("SummaryUpdateNode", "update", {})
builder.connect("prepare", "filter_data", "update", "filter")
builder.connect("prepare", "summary_markdown", "update", "summary_markdown")
builder.connect("prepare", "edited_by_user", "update", "edited_by_user")
```

## What Changed

**EmbeddedPythonNode** now supports exporting multiple variables without nesting in `result`.

### Before (Legacy Pattern)
```python
# Forced to nest everything in 'result'
result = {
    "filter": {"id": summary_id},
    "fields": {"summary_markdown": updated_text}
}
```

### After (Current Pattern)
```python
# Natural variable definitions
filter_data = {"id": summary_id}
summary_markdown = updated_text
```

## Full Example

```python
import kailash

reg = kailash.NodeRegistry()

df = kailash.DataFlow("postgresql://...")

@db.model
class ConversationSummary:
    id: str
    summary_markdown: str
    topics_json: str
    edited_by_user: bool

# Dynamic update workflow
builder = kailash.WorkflowBuilder()

builder.add_node("EmbeddedPythonNode", "prepare_update", {
    "code": """
import json

# Prepare filter
filter_data = {"id": summary_id}

# Prepare updated fields with business logic
summary_markdown = generate_markdown(raw_text)
topics_json = json.dumps(extract_topics(raw_text))
edited_by_user = True
"""
})

builder.add_node("ConversationSummaryUpdateNode", "update", {})

# Clean, direct connections
builder.connect("prepare_update", "filter_data", "update", "filter")
builder.connect("prepare_update", "summary_markdown", "update", "summary_markdown")
builder.connect("prepare_update", "topics_json", "update", "topics_json")
builder.connect("prepare_update", "edited_by_user", "update", "edited_by_user")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), {
    "summary_id": "summary-123",
    "raw_text": "Conversation text..."
})
```

## Backward Compatibility

Legacy patterns still work 100%:

```python
# This still works fine
result = {"filter": {...}, "fields": {...}}
builder.connect("prepare", "result.filter", "update", "filter")
builder.connect("prepare", "result.fields", "update", "fields")
```

## Benefits

✅ Natural variable naming
✅ Matches developer mental model
✅ Less nesting, cleaner code
✅ Full DataFlow benefits retained (no SQL needed!)

## See Also

- OPTIMAL_SOLUTION_MULTI_OUTPUT.md
- STRATEGIC_SOLUTION_DYNAMIC_UPDATES.md
