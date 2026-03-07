---
name: validate-absolute-imports
description: "Validate absolute imports in SDK code. Use when asking 'check imports', 'import validation', or 'absolute imports'."
---

# Validate Absolute Imports

> **Skill Metadata**
> Category: `validation`
> Priority: `MEDIUM`

## Required Pattern

```python
# ✅ CORRECT: Absolute imports
import kailash

# ❌ WRONG: Relative imports
from ..workflow.builder import kailash.WorkflowBuilder
from .runtime import kailash.Runtime
```

## Validation Script

```bash
# Find relative imports in SDK code
grep -r "from \.\." kailash/ --include="*.py"
grep -r "from \." kailash/ --include="*.py" | grep -v "# type:"

# Should return empty (no results)
```

## Why Absolute Imports?

1. **Clarity** - Clear module origin
2. **Portability** - Works in any context
3. **IDE support** - Better autocomplete
4. **Testing** - Easier to mock/patch

## Documentation

- **Import Standards**: [`sdk-contributors/4-gold-standards/01-code-standards.md#imports`](../../../../sdk-contributors/4-gold-standards/01-code-standards.md)

<!-- Trigger Keywords: check imports, import validation, absolute imports, relative imports -->
