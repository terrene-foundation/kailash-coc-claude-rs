---
skill: nexus-handler-support
description: Register handler functions as multi-channel workflows using nexus.handler() or ClosureHandler with typed parameters
priority: HIGH
tags: [nexus, handler, workflow, closure, function]
---

# Nexus Handler Support

Register functions directly as multi-channel workflows using `ClosureHandler` and the Nexus handler API.

## When to Use

- Service orchestration (database, external APIs)
- Async operations (requires `tokio`)
- Custom business logic handlers
- Full Rust access with typed parameters

## Quick Reference

### Closure Handler Pattern

```rust
use kailash_nexus::prelude::*;

let mut nexus = Nexus::new();

nexus.handler("greet", ClosureHandler::new(|inputs: ValueMap| async move {
    let name = inputs.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("World");
    let greeting = inputs.get("greeting")
        .and_then(|v| v.as_str())
        .unwrap_or("Hello");
    Ok(Value::from(format!("{greeting}, {name}!")))
}));

nexus.start().await?;
```

### Separate Handler Registration

```rust
use kailash_nexus::prelude::*;

fn process_order_handler() -> ClosureHandler<impl Fn(ValueMap) -> impl Future<Output = Result<Value, NexusError>>> {
    ClosureHandler::new(|inputs: ValueMap| async move {
        // process order logic
        Ok(Value::from("order processed"))
    })
}

let mut nexus = Nexus::new();
nexus.handler("process_order", process_order_handler());
nexus.start().await?;
```

## API

### nexus.handler()

```rust
nexus.handler(
    name: &str,                          // Required: workflow name
    func: impl HandlerFn + 'static,     // Required: handler implementation
) -> &mut Self
```

### nexus.handler_with_description()

```rust
nexus.handler_with_description(
    name: &str,                          // Required: workflow name
    func: impl HandlerFn + 'static,     // Required: handler implementation
    description: &str,                   // Required: documentation
    tags: &[&str],                       // Required: categorization
) -> &mut Self
```

### ClosureHandler::with_params()

```rust
ClosureHandler::with_params(
    func: F,                             // Required: async closure
    params: Vec<HandlerParam>,           // Required: typed parameter definitions
)
```

## Parameter Type Mapping

| Rust Type               | HandlerParamType | Required         |
| ----------------------- | ---------------- | ---------------- |
| `String`/`&str`         | `Str`            | Yes (no default) |
| `i64`                   | `Int`            | Yes (no default) |
| `f64`                   | `Float`          | Yes (no default) |
| `bool`                  | `Bool`           | Yes (no default) |
| `ValueMap`              | `Map`            | Yes (no default) |
| `Vec<Value>`            | `List`           | Yes (no default) |
| With `.required(false)` | Any              | No               |
| With `.with_default(v)` | Any              | No               |

## Core SDK: ClosureHandler with Params

For typed parameter definitions:

```rust
use kailash_nexus::prelude::*;

let handler = ClosureHandler::with_params(
    |inputs: ValueMap| async move {
        let x = inputs.get("x")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        Ok(Value::from(x * 2))
    },
    vec![
        HandlerParam::new("x", HandlerParamType::Int),
    ],
);

let mut nexus = Nexus::new();
nexus.handler("double", handler);
```

## Common Patterns

### Database Operations

```rust
use kailash_nexus::prelude::*;

nexus.handler("get_user", ClosureHandler::new(|inputs: ValueMap| async move {
    let user_id = inputs.get("user_id")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| NexusError::HandlerError("missing user_id".into()))?;
    let pool = get_db_pool().await;
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| NexusError::HandlerError(e.to_string()))?;
    match user {
        Some(u) => Ok(Value::from(u.to_value_map())),
        None => Ok(Value::Null),
    }
}));
```

### External API Calls

```rust
use kailash_nexus::prelude::*;

nexus.handler("fetch_data", ClosureHandler::new(|inputs: ValueMap| async move {
    let url = inputs.get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| NexusError::HandlerError("missing url".into()))?
        .to_string();
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await
        .map_err(|e| NexusError::HandlerError(e.to_string()))?;
    let body: serde_json::Value = resp.json().await
        .map_err(|e| NexusError::HandlerError(e.to_string()))?;
    Ok(Value::from(body.to_string()))
}));
```

### Endpoint Registration (HTTP Routes)

```rust
use kailash_nexus::prelude::*;

nexus.endpoint(
    "/api/users",
    &[HttpMethod::Get],
    ClosureHandler::new(|_: ValueMap| async { Ok(Value::from("users")) }),
);
```

## Migration: Raw Workflow to Handler

### Before (verbose)

```rust
let mut builder = WorkflowBuilder::new("process");
builder.add_node("PythonCodeNode", "process", &config);
let workflow = builder.build(&registry)?;
nexus.register("process", workflow);
```

### After (concise)

```rust
nexus.handler("process", ClosureHandler::new(|inputs: ValueMap| async move {
    let data = inputs.get("data").cloned().unwrap_or(Value::Null);
    // Direct Rust logic — no sandbox restrictions
    Ok(process_data(data).await?)
}));
```

## Handler Registry

Introspect registered handlers:

```rust
// Access handler metadata
let handlers = nexus.handlers();
for h in handlers {
    println!("name={}, description={:?}, tags={:?}",
        h.name(), h.description(), h.tags());
}
println!("Total handlers: {}", nexus.handler_count());
```

## Best Practices

1. **Use handlers for service orchestration** - they provide full Rust access with typed inputs
2. **Define HandlerParams** - used for schema generation and validation
3. **Return Value** - non-Value returns should be converted via `Value::from()`
4. **Use async closures for I/O** - leverage tokio's async runtime
5. **Add descriptions** - appear in API docs and MCP tools

## Related Skills

- [nexus-workflow-registration](#) - All registration patterns
- [nexus-quickstart](#) - Basic Nexus setup
- [nexus-dataflow-integration](#) - DataFlow integration

## Full Documentation
