---
name: nexus-config-options
description: "NexusConfig fields, Preset system, MiddlewareConfig for kailash-rs Nexus."
---

# Nexus Configuration Options (kailash-rs)

Configuration is object-based using `NexusConfig`, `Preset`, and `MiddlewareConfig`.

## NexusConfig

```python
from kailash.nexus import NexusConfig

config = NexusConfig(
    host="0.0.0.0",                       # Bind address (default: "0.0.0.0")
    port=3000,                             # Server port (default: 3000)
    # api_port=3000,                       # Alias for port
    cli_name="myapp",                      # CLI command name
    enable_api=True,                       # Enable API channel (default: True)
    enable_cli=True,                       # Enable CLI channel (default: True)
    enable_mcp=True,                       # Enable MCP channel (default: True)
    graceful_shutdown_timeout_secs=30,     # Shutdown timeout (default: 30)
)
```

### Using NexusConfig with NexusApp

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=8080, cli_name="myplatform"))
app.start()  # No args needed -- host/port come from config
```

### Using NexusConfig with Nexus (Low-Level)

```python
from kailash.nexus import Nexus, NexusConfig

nexus = Nexus(config=NexusConfig(port=3000, enable_mcp=False))
nexus.start()
```

## Preset System

Presets apply predefined middleware stacks:

```python
from kailash.nexus import NexusApp, NexusConfig, Preset

# String preset
app = NexusApp(
    config=NexusConfig(port=3000),
    preset="enterprise",
)

# Preset object
app = NexusApp(
    config=NexusConfig(port=3000),
    preset=Preset.enterprise(),
)

# On low-level Nexus
nexus = Nexus(preset=Preset.saas())
```

Available presets configure middleware stacks appropriate for each deployment scenario.

## MiddlewareConfig (Low-Level Nexus)

For fine-grained middleware control on the low-level `Nexus`:

```python
from kailash.nexus import Nexus, NexusConfig, MiddlewareConfig

nexus = Nexus(config=NexusConfig(port=3000))
nexus.set_middleware(MiddlewareConfig(...))
nexus.start()
```

## NexusApp Convenience Methods

`NexusApp` provides convenience methods that wrap common configuration:

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

# CORS
app.add_cors(origins=["https://example.com"])

# Rate limiting
app.add_rate_limit(max_requests=100, window_secs=60)
```

## Channel Configuration

Disable channels you do not need:

```python
# API only (no CLI, no MCP)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=False)

# API + MCP (no CLI)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=True)

# All channels (default)
config = NexusConfig()  # enable_api=True, enable_cli=True, enable_mcp=True
```

## Key Differences from kailash-py

| Aspect          | kailash-py                          | kailash-rs                                                 |
| --------------- | ----------------------------------- | ---------------------------------------------------------- |
| Config style    | Flat kwargs: `Nexus(api_port=8000)` | Object: `NexusConfig(port=3000)`                           |
| Default port    | 8000                                | 3000                                                       |
| Port field      | `api_port`                          | `port` (with `api_port` alias)                             |
| Channel control | `mcp_port`, separate flags          | `enable_api`, `enable_cli`, `enable_mcp`                   |
| CORS            | `cors_origins=[...]` kwarg          | `app.add_cors(origins=[...])` method                       |
| Rate limiting   | `rate_limit=1000` kwarg             | `app.add_rate_limit(max_requests=100, window_secs=60)`     |
| Presets         | `Nexus(preset="saas")`              | `NexusApp(preset="saas")` or `Nexus(preset=Preset.saas())` |

## Quick Reference

| Use Case               | Configuration                                                      |
| ---------------------- | ------------------------------------------------------------------ |
| Development            | `NexusApp()` -- all defaults                                       |
| Custom port            | `NexusApp(config=NexusConfig(port=8080))`                          |
| API only               | `NexusApp(config=NexusConfig(enable_cli=False, enable_mcp=False))` |
| Enterprise             | `NexusApp(config=NexusConfig(port=3000), preset="enterprise")`     |
| With CORS + rate limit | `app.add_cors([...])` then `app.add_rate_limit(...)`               |
