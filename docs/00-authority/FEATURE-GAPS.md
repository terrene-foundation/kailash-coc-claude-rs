# Feature Gap Analysis: Rust-Backed Python Binding (`kailash-enterprise`)

> **Date**: 2026-03-08 (Phase 17 complete — all gaps resolved)
> **Scope**: Complete API surface audit of `kailash-enterprise` Rust-backed Python binding
> **Method**: Runtime introspection via `import kailash` with `sys.path` filtered to exclude pure Python SDK
> **Total Exports**: 113+ types across 6 submodules
> **Test Count**: 1971 tests collected, 1955 passing (0 failures, 16 skips for optional features)

---

## Summary

| Framework  | Types              | Tests | Coverage | Status   |
| ---------- | ------------------ | ----- | -------- | -------- |
| Core SDK   | 6 core + 139 nodes | 100+  | 100%     | COMPLETE |
| DataFlow   | 18 types           | 200+  | 100%     | COMPLETE |
| Kaizen     | 50+ types          | 500+  | 100%     | COMPLETE |
| Nexus      | 20+ types          | 150+  | 100%     | COMPLETE |
| Enterprise | 25+ types          | 200+  | 100%     | COMPLETE |
| MCP        | 5+ types           | 50+   | 100%     | COMPLETE |

**All feature gaps identified on 2026-03-07 have been resolved in Phase 17 (P17-001 through P17-034).**

---

## 1. Core SDK (100%)

### All Types Verified Working

| Type              | Constructor                                        | Methods                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NodeRegistry`    | `NodeRegistry()`                                   | `list_types()` (139 types), `has_type(name)`, `register_callback(name, fn, inputs, outputs)`                                                                                                                                         |
| `WorkflowBuilder` | `WorkflowBuilder()`                                | `add_node`, `add_node_auto_id`, `connect`, `add_connection` (alias), `build(registry)`, `enable_cycles(bool)`, `to_json`, `from_json(str)`, `get_node_ids`, `get_connections`                                                        |
| `Runtime`         | `Runtime(registry)` or `Runtime(registry, config)` | `execute(wf)`, `execute(wf, inputs)`, `execute_async(wf)`                                                                                                                                                                            |
| `RuntimeConfig`   | `RuntimeConfig(**kwargs)`                          | `debug`, `max_concurrent_nodes`, `node_timeout`, `workflow_timeout`, `enable_cycles`, `enable_monitoring`, `enable_audit`, `enable_security`, `enable_resource_limits`, `conditional_execution` (str), `connection_validation` (str) |
| `Workflow`        | From `builder.build(reg)`                          | `node_count`, `connection_count`, `level_count`, `to_json`, `to_definition`                                                                                                                                                          |

### Phase 17 Additions (P17-001, P17-002)

- Cyclic workflow support: `builder.enable_cycles(True)` + `RuntimeConfig(enable_cycles=True)`
- `add_connection()` alias for `connect()`
- BaseAgent convenience methods: `run()`, `extract_str()`, `extract_dict()`, `write_to_memory()`
- Mock LLM provider: `LlmClient(provider="mock")` / `LlmClient.mock()`

### 139 Built-in Node Types

All nodes verified via `NodeRegistry().list_types()`. See full list in `kailash.pyi`.

### Key Behavioral Notes

| Aspect         | Behavior                                                       |
| -------------- | -------------------------------------------------------------- |
| Registry       | `NodeRegistry()` explicit, passed to `build()` and `Runtime()` |
| `build()`      | `builder.build(registry)` — **consumes the builder**           |
| Execute return | `{"results": ..., "run_id": ..., "metadata": ...}` dict        |
| Async          | `await runtime.execute_async(wf)` or `asyncio.to_thread()`     |
| Custom nodes   | `register_callback(name, fn, inputs, outputs)`                 |
| Connect        | Both `connect()` and `add_connection()` work                   |

---

## 2. DataFlow (100%)

### All Types Available

| Type                  | Constructor                                      | Key Methods                                                                                        |
| --------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `DataFlow`            | `DataFlow(url)`                                  | Connects to database                                                                               |
| `DataFlowConfig`      | `DataFlowConfig(url)` or `DataFlowConfig.test()` | `database_url`, `max_connections`, `auto_migrate`, `test_mode`                                     |
| `DataFlowTransaction` | No public constructor                            | `commit`, `rollback`, `execute_raw`, `is_finished`                                                 |
| `ModelDefinition`     | `ModelDefinition(name, table)`                   | `field(name, type, **kwargs)` with `unique`, `index`, `references`                                 |
| `FieldType`           | Class methods                                    | `.integer()`, `.text()`, `.real()`, `.boolean()`, `.float()`, `.json()`, `.timestamp()`, `.uuid()` |
| `FieldDef`            | Via `model.field()`                              | Supports `unique`, `index`, `references` constraints                                               |
| `FilterCondition`     | `FilterCondition(column, operator)`              | All comparison operators                                                                           |
| `F`                   | `F("column_name")`                               | Pythonic filter builder                                                                            |
| `MigrationManager`    | `MigrationManager()` (no args)                   | Schema versioning, diff, apply(migration, dataflow), rollback                                      |
| `DataFlowExpress`     | `DataFlowExpress(url, auto_migrate=True)`        | Quick CRUD without workflow setup                                                                  |
| `DataFlowInspector`   | Static methods only (NO constructor)             | Schema inspection via `tables(df)`, `table_info(df, tbl)`, `indexes(df, tbl)`                      |

### Phase 17 Additions (P17-004 through P17-010)

- Parameterized `execute_raw()` with SQL injection prevention
- Field constraints: `unique`, `index`, FK `references`
- `auto_migrate` and `test_mode` on DataFlowConfig
- `DataFlowConfig.test()` convenience constructor
- `MigrationManager` for schema versioning
- `DataFlowExpress` for quick-setup CRUD
- `DataFlowInspector` for schema inspection
- DX tools: `LoggingConfig`, `SchemaCache`, `StrictMode`, `ValidationLayer`, `ErrorEnhancer`, `DebugAgent`

---

## 3. Kaizen (100%)

### All Types Available

**Core types**: `BaseAgent`, `Agent`, `AgentConfig`, `LlmClient`, `Signature`, `InputField`, `OutputField`, `ToolDef`, `ToolParam`, `ToolRegistry`, `SessionMemory`, `SharedMemory`, `CostTracker`, `HookManager`, `InterruptManager`, `ControlProtocol`, `AgentCheckpoint`, `InMemoryCheckpointStorage`, `FileCheckpointStorage`, `AgentCard`, `AgentRegistry`, `A2AProtocol`, `InMemoryMessageBus`, `OrchestrationRuntime`, `TrustLevel`, `TrustPosture`

**Agent subclasses**: `SimpleQAAgent`, `ReActAgent`, `RAGAgent`, `ChainOfThoughtAgent`, `CodeGenAgent`, `MemoryAgent`, `PlanningAgent`, `ConversationalAgent`, `ResearchAgent`, `ToolCallingAgent`

**Pipelines**: `SequentialPipeline`, `ParallelPipeline`, `EnsemblePipeline`, `RouterPipeline`, `SupervisorPipeline`, `MapReducePipeline`, `ChainPipeline`

### Phase 17 Additions (P17-011 through P17-019)

- `StructuredOutput` — JSON schema enforcement with auto-retry
- `PersistentMemory` — Cross-session state with file/SQLite storage
- `StreamingAgent` + `StreamHandler` — Token-by-token streaming
- New agent types: `ConversationalAgent`, `ResearchAgent`, `ToolCallingAgent`
- New pipelines: `MapReducePipeline`, `ChainPipeline`
- `ObservabilityManager`, `MetricsCollector`, `TracingManager`, `SpanContext`, `LogAggregator`
- `VisionProcessor`, `AudioProcessor`, `MultimodalOrchestrator`
- `SupervisorAgent`, `WorkerAgent`, `MultiAgentOrchestrator`, `AgentExecutor`
- DX tools: `JourneyOrchestrator`, `JourneyStep`, `UXHelper`, `DxTrustManager`, `UnifiedMemory`, `AgentInterrupt`
- Mock LLM: `LlmClient(provider="mock")` / `LlmClient.mock()`
- BaseAgent convenience: `run()`, `extract_str()`, `extract_dict()`, `write_to_memory()`

---

## 4. Nexus (100%)

### All Types Available

| Type               | Constructor                        | Key Methods                                                                          |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `NexusApp`         | `NexusApp()` or `NexusApp(config)` | `handler()` decorator, `start()`, `health_check()`, `add_cors()`, `add_rate_limit()` |
| `Nexus`            | `Nexus()` or `Nexus(config)`       | `handler()`, `start()`, `preset`, `set_middleware()`                                 |
| `NexusConfig`      | `NexusConfig(**kwargs)`            | `port`, `host`, `cli_name`, `enable_api/cli/mcp`                                     |
| `McpServer`        | `McpServer(name, version)`         | `register_tool`, `register_resource`, `register_prompt`, transport/auth methods      |
| `PluginManager`    | `PluginManager()`                  | `load`, `unload`, `reload`, `is_loaded`, `list`, `plugin_count`, `health_check_all`  |
| `WorkflowRegistry` | `WorkflowRegistry()`               | `register`, `get`, `remove`, `list`, `contains`, `count`, `execute`                  |
| `EventBus`         | `EventBus()`                       | `publish`, `subscribe`, `on`                                                         |
| `MiddlewareConfig` | `MiddlewareConfig()`               | `from_preset`, `with_cors`, `with_body_limit`, logging/security headers              |
| `HealthMonitor`    | Python wrapper                     | Continuous health monitoring with configurable checks                                |

### Phase 17 Additions (P17-020 through P17-025)

- NexusApp registration methods and lifecycle
- Middleware and plugin support
- `EventBus` pub/sub event system
- `PluginManager` for plugin lifecycle management
- `WorkflowRegistry` for workflow storage/retrieval/execution
- `HealthMonitor` for continuous health monitoring

---

## 5. Enterprise (100%)

### All Types Available

**Core RBAC/ABAC**: `RbacEvaluator`, `AbacEvaluator`, `CombinedEvaluator`, `Role`, `Permission`, `User`, `AbacPolicy`, `AccessDecision`, `RbacPolicy`, `RbacPolicyBuilder`, `RoleBuilder`

**Audit**: `AuditLogger`, `AuditFilter`

**Tenant**: `TenantRegistry`, `TenantInfo`, `TenantStatus`, `EnterpriseContext`, `EnterpriseTenantContext`, `TenantContext`

**Security**: `SecurityClassification`

**EATP/CARE**: `EatpPosture`, `CompetencyRequirement`, `HumanCompetency`, `ComplianceReport`, `ComplianceStatus`, `ResourceUsageSnapshot`, `VerificationConfig`, `VerificationResult`

### Phase 17 Additions (P17-026 through P17-029)

- `ComplianceManager` — Framework evaluation (GDPR, SOC2, HIPAA, PCI-DSS), custom rules, context-driven
- `PolicyEngine` — Policy CRUD, RBAC/ABAC evaluation, JSON loading, versioning, rollback
- `TokenManager` — JWT/opaque/API key lifecycle (create, validate, refresh, revoke)
- `SSOProvider` — SSO integration (SAML, OAuth2, OIDC), session management

---

## 6. MCP (100%)

### All Types Available

| Type                | Location                     | Methods                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `McpServer`         | `kailash.nexus.McpServer`    | `register_tool`, `register_resource`, `register_prompt`, `register_dynamic_resource`, `list_resources`, `list_prompts`, `read_resource`, `get_prompt`, `remove_resource`, `remove_prompt`, `resource_count`, `prompt_count`, `set_transport`, `set_sse_config`, `set_http_config`, `get_transport_config`, `with_auth`, `authenticate`, `disable_auth` |
| `McpApplication`    | `kailash.mcp.McpApplication` | `@app.tool()`, `@app.resource()`, `@app.prompt()` decorators, `tool_count`, `resource_count`, `prompt_count`                                                                                                                                                                                                                                           |
| Transport constants | `kailash.nexus.mcp`          | `STDIO`, `SSE`, `HTTP`                                                                                                                                                                                                                                                                                                                                 |
| `prompt_argument()` | `kailash.mcp`                | Helper for defining prompt arguments                                                                                                                                                                                                                                                                                                                   |

### Phase 17 Additions (P17-030 through P17-034)

- Standalone `kailash.mcp` module with `McpApplication` wrapper
- Resource decorator and listing
- Prompt decorator + `prompt_argument()` helper
- Server-side authentication
- Transport selection (stdio/SSE/HTTP)

---

## 7. Available Submodules

| Module                     | Status | Exports                  |
| -------------------------- | ------ | ------------------------ |
| `kailash`                  | OK     | 113+ types               |
| `kailash.dataflow`         | OK     | 18+ types                |
| `kailash.nexus`            | OK     | 25+ types                |
| `kailash.kaizen`           | OK     | 50+ types                |
| `kailash.kaizen.agents`    | OK     | 10 agent classes         |
| `kailash.kaizen.pipelines` | OK     | 7 pipeline classes       |
| `kailash.enterprise`       | OK     | 40+ types                |
| `kailash.mcp`              | OK     | McpApplication + helpers |
| `kailash.nexus.mcp`        | OK     | Transport constants      |
| `kailash.runtime`          | OK     | Compat shim              |
| `kailash.workflow`         | OK     | Compat shim              |

---

## 8. Constructor Notes

| Type                                  | Correct Constructor                                            |
| ------------------------------------- | -------------------------------------------------------------- |
| `AbacEvaluator`                       | `AbacEvaluator(policies_list)` — requires list of `AbacPolicy` |
| `CombinedEvaluator`                   | `CombinedEvaluator(rbac, abac)` — requires both evaluators     |
| `AbacPolicy`                          | `AbacPolicy("name", "allow")` — effect is string               |
| `RuntimeConfig.conditional_execution` | Accepts **str**, NOT bool                                      |
| `RuntimeConfig.connection_validation` | Accepts **str**, NOT bool                                      |
| `ToolDef`                             | `ToolDef(handler=fn)` — NOT `callback=`                        |

---

## 9. Resolved Gap History

All gaps identified on 2026-03-07 were resolved in Phase 17:

| Phase              | Items                       | Status   |
| ------------------ | --------------------------- | -------- |
| P17-001 to P17-003 | Core SDK quick wins         | RESOLVED |
| P17-004 to P17-010 | DataFlow enhancements       | RESOLVED |
| P17-011 to P17-019 | Kaizen agent enhancements   | RESOLVED |
| P17-020 to P17-025 | Nexus enhancements          | RESOLVED |
| P17-026 to P17-029 | Enterprise enhancements     | RESOLVED |
| P17-030 to P17-034 | MCP standalone module       | RESOLVED |
| P17-035 to P17-037 | Polish (stubs, tests, docs) | RESOLVED |
