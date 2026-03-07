---
name: kailash-installation
description: "Install and setup Kailash SDK with pip, poetry, or virtual environments. Use when asking 'install kailash', 'setup SDK', 'pip install', 'poetry add kailash', 'requirements.txt', 'installation guide', 'setup environment', 'verify installation', 'docker setup', or 'getting started'."
---

# Kailash SDK Installation & Setup

Complete guide for installing the Kailash SDK using pip, poetry, virtual environments, or Docker.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **Basic Install**: `pip install kailash-enterprise`
- **Poetry**: `poetry add kailash-enterprise`
- **With All Dependencies**: `pip install kailash-enterprise`
- **Python Requirement**: 3.8+
- **Verify**: Import `WorkflowBuilder` and `kailash.Runtime`

## Core Pattern

```bash
# Install Kailash SDK
pip install kailash-enterprise

# Verify installation
python -c "import kailash; print('Kailash installed successfully!')"
```

## Common Use Cases

- **Quick Start**: Install SDK for new project
- **Development Setup**: Create isolated development environment
- **Docker Deployment**: Setup infrastructure services
- **Team Collaboration**: Add SDK to existing project
- **Dependency Management**: Manage SDK version in requirements

## Step-by-Step Guide

### Option 1: Pip Installation (Simplest)
```bash
# Install latest version
pip install kailash-enterprise>=2.0.0

# All frameworks included (DataFlow, Nexus, Kaizen)
# No separate packages or extras needed
```

### Option 2: Poetry Installation (Recommended)
```bash
# Add to existing project
poetry add kailash-enterprise

# Or create new project
poetry new my-kailash-project
cd my-kailash-project
poetry add kailash-enterprise
poetry shell
```

### Option 3: Virtual Environment
```bash
# Create virtual environment
python -m venv kailash-env
source kailash-env/bin/activate  # Linux/Mac
# kailash-env\Scripts\activate  # Windows

# Install in virtual environment
pip install kailash-enterprise
```

### Option 4: Requirements.txt
```bash
# Add to requirements.txt
echo "kailash-enterprise>=2.0.0" >> requirements.txt

# Install from requirements
pip install -r requirements.txt
```

## Key Parameters / Options

| Installation Method | Use Case | Command |
|---------------------|----------|---------|
| **Basic pip** | Quick start, simple projects | `pip install kailash-enterprise` |
| **Poetry** | Team projects, dependency management | `poetry add kailash-enterprise` |
| **Virtual env** | Isolated development | `python -m venv env && pip install kailash-enterprise` |
| **Docker** | Production, infrastructure | `docker-compose up -d` |
| **With extras** | Full feature set | `pip install kailash-enterprise` |

## Common Mistakes

### ❌ Mistake 1: Missing Python Version
```bash
# Wrong - Python 3.7 or earlier
python --version  # Python 3.7.x (unsupported)
pip install kailash-enterprise  # May fail
```

### ✅ Fix: Use Python 3.8+
```bash
# Correct - Python 3.8 or later
python3.8 --version  # Python 3.8.x or higher
python3.8 -m pip install kailash-enterprise
```

### ❌ Mistake 2: ImportError After Installation
```bash
# Wrong - Installing in one environment, running in another
pip install kailash-enterprise  # System Python
python my_script.py  # Different Python interpreter
```

### ✅ Fix: Verify Correct Environment
```bash
# Correct - Same environment for install and run
which python  # Check current Python
pip list | grep kailash  # Verify installation
python my_script.py  # Now works
```

### ❌ Mistake 3: Wrong Package Name
```bash
# Wrong -- old package name
pip install kailash  # ERROR: package not found
```

### ✅ Fix: Install Correct Package
```bash
# Correct -- Rust-backed enterprise package
pip install kailash-enterprise
```

## Verification Test

```python
import kailash

reg = kailash.NodeRegistry()

# Test basic functionality
builder = kailash.WorkflowBuilder()
builder.add_node("PythonCodeNode", "test", {
    "code": "result = {'status': 'installed', 'version': '2.1.0'}"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

print("✅ Kailash SDK installed successfully!")
print(f"Test result: {result['results']['test']['result']}")
print(f"Run ID: {result['run_id']}")
```

## Related Patterns

- **For basic imports**: See [`kailash-imports`](#)
- **For first workflow**: See [`workflow-quickstart`](#)
- **For Docker setup**: See [`deploy-docker-quick`](#)
- **For troubleshooting**: See [`error-handling-patterns`](#)

## When to Escalate to Subagent

Use `sdk-navigator` subagent when:
- Installation fails with complex errors
- Need custom installation for enterprise environments
- Integrating with existing infrastructure
- Setting up CI/CD pipelines
- Configuring advanced deployment scenarios

Use `deployment-specialist` subagent when:
- Deploying to production environments
- Setting up Docker/Kubernetes infrastructure
- Configuring multi-environment deployments

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `ImportError: No module named 'kailash'` | Wrong Python environment | Verify: `pip list \| grep kailash`, reinstall if needed |
| `ModuleNotFoundError: pydantic` | Missing dependencies | Install: `pip install kailash-enterprise` |
| `Python version incompatible` | Python < 3.8 | Upgrade to Python 3.8+ |
| Docker services not starting | Port conflicts or Docker issues | Run: `docker-compose down -v && docker-compose up -d` |

## Quick Tips

- 💡 **Use virtual environments**: Isolate project dependencies to avoid conflicts
- 💡 **Check Python version first**: Ensure Python 3.8+ before installation
- 💡 **Install with [all] for development**: Get all optional dependencies upfront
- 💡 **Verify installation immediately**: Run test workflow to confirm setup
- 💡 **Use poetry for teams**: Better dependency management and reproducibility

## Version Notes

- String-based nodes are the recommended pattern
- Python 3.10+ required

## Keywords for Auto-Trigger

<!-- Trigger Keywords: install kailash, setup SDK, pip install, poetry add kailash, requirements.txt, installation guide, setup environment, verify installation, docker setup, getting started, kailash setup, how to install, SDK installation -->
