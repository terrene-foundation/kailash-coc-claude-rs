---
priority: 10
scope: path-scoped
paths:
  - "**/*.py"
  - "**/*.rs"
---

# Framework-First: Use the Highest Abstraction Layer


<!-- slot:neutral-body -->


Default to Engines. Drop to Primitives only when Engines can't express the behavior. Never use Raw.

**Why:** Engines encode hard-won composition patterns (validation, lifecycle, concurrency) that Primitives leave to the developer. Skipping Engines means reimplementing those patterns incorrectly.

## Four-Layer Hierarchy

```
Entrypoints  ->  Applications (aegis, aether), CLI (cli-rs), others (kz-engage)
Engines      ->  DataFlowEngine, NexusEngine, DelegateEngine/SupervisorAgent, GovernanceEngine
Primitives   ->  DataFlow, Nexus, BaseAgent, Signature, envelopes, FeatureStore
Specs        ->  CARE, EATP, CO, COC, PACT (standards/protocols/methodology)
```

Specs define -> Primitives implement building blocks -> Engines compose into opinionated frameworks -> Entrypoints are products users interact with.

| Framework    | Raw (never) — Python/Ruby anti-patterns       | Primitives (binding-exposed)                        | Engine (default)                                                        | Entrypoints              |
| ------------ | --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| **DataFlow** | `psycopg`, `sqlalchemy.text`, raw SQL strings | `DataFlow`, `@db.model`, `db.express`, nodes        | `DataFlowEngine.builder()` (validation, classification, query tracking) | aegis, aether, kz-engage |
| **Nexus**    | Raw HTTP frameworks, manual route handlers    | `Nexus()`, handlers, channels                       | `NexusEngine` (middleware stack, auth, K8s)                             | aegis, aether            |
| **Kaizen**   | `openai`, `anthropic` SDK calls               | `BaseAgent`, `Signature`                            | `DelegateEngine`, `SupervisorAgent`                                     | kaizen-cli-rs            |
| **PACT**     | Manual policy strings                         | Envelopes, D/T/R addressing                         | `GovernanceEngine` (thread-safe, fail-closed)                           | aegis                    |
| **ML**       | `sklearn`, `numpy`, `pandas` directly         | `FeatureStore`, `ModelRegistry`, `TrainingPipeline` | `AutoMLEngine`, `InferenceServer` (ONNX, drift, caching)                | aegis, aether            |
| **Align**    | `transformers`, `peft`, `trl` directly        | `AlignmentConfig`, `AlignmentPipeline`              | `align.train()`, `align.deploy()` (GGUF, Ollama, vLLM)                  | —                        |

The bindings give Python a Pythonic API that maps onto the Rust runtime under the hood. Your code is Python; the kailash-rs runtime executes underneath. You never write Rust. For canonical API paths in your project, consult the relevant framework specialist (dataflow-specialist, nexus-specialist, kaizen-specialist, mcp-specialist, pact-specialist, ml-specialist) — this rule intentionally avoids listing specific paths to prevent drift.

## DO / DO NOT

```python
# DO: Engine layer (DataFlowEngine for production)
engine = DataFlowEngine.builder("postgresql://...").build()

# DO NOT: Raw primitives for what Engine handles
builder = WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {"name": "Alice"})
runtime = LocalRuntime()
results, run_id = runtime.execute(builder.build())
```

```python
# DO: Engine layer (AutoMLEngine for end-to-end ML)
engine = AutoMLEngine(...)
engine.fit(X_train, y_train)
predictions = engine.predict(X_test)

# DO NOT: Manual fit-predict chain when AutoMLEngine handles it
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_train)
lr = LogisticRegression()
lr.fit(X_scaled, y_train)
predictions = lr.predict(scaler.transform(X_test))
```

## When Primitives Are Correct

- Complex multi-step workflows (node wiring, branching, sagas)
- Custom transaction control (savepoints, isolation levels)
- Custom agent execution model (DelegateEngine's loop doesn't fit)
- Performance-critical paths where workflow overhead matters

**Why:** Engines trade flexibility for safety. When the Engine's opinions conflict with the requirement, Primitives are the correct escape hatch -- but consult the framework specialist first.

**Always consult the framework specialist before dropping to Primitives.**

## Raw Is Always Wrong

When a Kailash framework exists for your use case, MUST NOT write raw code that duplicates framework functionality.

**Why:** Raw code bypasses the framework's validation, lifecycle management, and security controls, creating ungoverned paths that accumulate technical debt faster than any single session can repay.

## MUST: Specialist Consultation Before Dropping Below Engine Layer

This table extends the specialist delegation in `rules/agents.md` with pattern-level triggers. Writing any of the following without first consulting the named framework specialist is a `zero-tolerance.md` Rule 4 violation:

| Raw/Primitive pattern                                      | Specialist required |
| ---------------------------------------------------------- | ------------------- |
| Raw SQL strings (`SELECT`, `INSERT`, `ALTER`, `CREATE`)    | dataflow-specialist |
| Raw HTTP clients (`requests`, `httpx`, `fetch`, `reqwest`) | nexus-specialist    |
| Direct DB connections (`psycopg`, `aiosqlite.connect`)     | dataflow-specialist |
| Raw LLM API calls (`openai.chat.completions.create`)       | kaizen-specialist   |
| Direct MCP transport wiring                                | mcp-specialist      |
| Manual policy/envelope construction                        | pact-specialist     |

The specialist either confirms the framework cannot express the need (and the drop to primitives is documented), or redirects to the correct Engine/Primitive API.

```python
# DO — ask the specialist, get confirmation, document the exception
# (specialist confirmed: DataFlow auto-migrate cannot express partial index)
conn.execute("CREATE INDEX CONCURRENTLY idx_active ON users (id) WHERE active = true")

# DO NOT — bypass without asking
conn.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (name, email))
# ↑ db.express.create("User", {...}) handles this — no specialist needed, no raw SQL needed
```

**Why:** Without a mandatory specialist gate, agents default to the pattern they know (raw SQL, raw HTTP) rather than the framework pattern they should learn. This is the single highest-leverage fix for the "bypass DataFlow and directly connect" failure mode.

## Framework Version-Stable Integration — Drive The Data, Not The Dispatch

When integrating with an external framework's lifecycle hook (FastAPI / Starlette lifespan, aiohttp on_startup, Axum layer, Rails initializer, Rack middleware), if the framework exposes BOTH (a) a dispatch method name AND (b) a list/dict of registered handlers, the data structure is the stable surface across versions. Dispatch method names drift — underscore-prefix transitions, removal, renames — the registration list is what the framework's own internal dispatcher iterates.

Integrations MUST iterate the registered-handlers data structure, NOT call the dispatch method by name.

```python
# DO — iterate the on_startup / on_shutdown list (what FastAPI's _DefaultLifespan does internally)
@asynccontextmanager
async def lifespan(app):
    for handler in app.router.on_startup:
        await handler() if inspect.iscoroutinefunction(handler) else handler()
    yield
    for handler in app.router.on_shutdown:
        await handler() if inspect.iscoroutinefunction(handler) else handler()

# DO NOT — call the dispatch method by name
@asynccontextmanager
async def lifespan(app):
    await app.router.startup()   # AttributeError on builds where only _startup exists
    yield
    await app.router.shutdown()  # same drift hazard
```

**BLOCKED rationalizations:**

- "The method name has been stable for years"
- "The framework's docs show the method-name form"
- "We'll pin the framework version to avoid the drift"
- "The list form is an internal detail, we should use the public API"
- "If the method is renamed, we'll rename our call"

**Why:** Framework-integration code runs in every production instance; a single `AttributeError` on a renamed dispatch method crashes every service at lifespan boot with zero type-checker signal. The registered-handlers list is the data the framework's OWN internal dispatcher iterates — it cannot be removed without breaking the framework's own hooks, so it is strictly more stable than any dispatch method name. "Pin the framework version" is an anti-pattern: it creates a treadmill where every dependency upgrade re-triggers the same failure mode. Drive the data; don't call the dispatch.

Origin: kailash-py issue #531 / PR #533 (2026-04-19) — kailash-nexus 2.1.0 called `app.router.startup()` / `.shutdown()` as if stable across FastAPI versions; some production FastAPI builds exposed only `_startup`; every 2.1.0 service crashed at uvicorn lifespan. Fix (2.1.1): iterate the `on_startup` / `on_shutdown` lists directly.

<!-- /slot:neutral-body -->
