---
name: ruby-bindings
description: "Magnus Ruby binding patterns for Kailash Rust SDK. Use when asking about 'Ruby binding', 'Magnus', 'rb-sys', 'gem kailash', 'Ruby wrapper', 'GVL release', or 'block-based lifecycle'."
---

# Ruby Bindings -- Quick Reference

Magnus-based binding distributed as `kailash` gem. Uses block-based resource lifecycle with GVL release for concurrent execution.

## Key Facts

| Item              | Value                                   |
| ----------------- | --------------------------------------- |
| **Gem name**      | `kailash`                               |
| **Require**       | `require 'kailash'`                     |
| **Rust crate**    | `bindings/kailash-ruby/`                |
| **FFI framework** | Magnus 0.8 / rb-sys 0.9                 |
| **Library type**  | cdylib (.bundle on macOS, .so on Linux) |

## Block-Based Lifecycle

Ruby binding uses block-based resource management (no manual close):

```ruby
require 'kailash'

Kailash::Registry.open do |reg|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NoOpNode", "n1", {})
  wf = builder.build(reg)

  Kailash::Runtime.open(reg) do |rt|
    result = rt.execute(wf, {})
    puts result.results
  end
end
```

## GVL Strategy

- Workflow executor runs **without** the GVL (`without_gvl`)
- Callback nodes reacquire the GVL (`with_gvl`) to call Ruby blocks
- This allows concurrent workflow execution alongside Ruby threads

## Registered Modules

| Module                     | Key Classes                        |
| -------------------------- | ---------------------------------- |
| `Kailash::Registry`        | Node registry with `open` block    |
| `Kailash::WorkflowBuilder` | DAG builder                        |
| `Kailash::Runtime`         | Execution engine with `open` block |
| `Kailash::Value`           | Value mapping (Rust <-> Ruby)      |

## Skill Files

| File                         | Content                |
| ---------------------------- | ---------------------- |
| `ruby-quickstart.md`         | Getting started guide  |
| `ruby-cheatsheet.md`         | Common patterns        |
| `ruby-common-mistakes.md`    | Pitfalls and fixes     |
| `ruby-custom-nodes.md`       | Callback node patterns |
| `ruby-framework-bindings.md` | Framework Ruby API     |
| `ruby-gold-standards.md`     | Binding quality rules  |
| `ruby-available-nodes.md`    | Node list for Ruby     |

## Related

- **ruby-binding** agent -- Magnus implementation specialist
- **ruby-pattern-expert** agent -- Debugging Magnus errors
- **ruby-gold-standards** agent -- Ruby binding compliance validation
