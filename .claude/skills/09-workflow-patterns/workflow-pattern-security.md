---
name: workflow-pattern-security
description: "Security workflow patterns (auth, encryption, audit). Use when asking 'security workflow', 'authentication', 'encryption workflow', or 'audit trail'."
---

# Security Workflow Patterns

Patterns for authentication, authorization, encryption, and audit workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`gold-security`](../../17-gold-standards/gold-security.md)

## Pattern: User Authentication Flow

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Validate credentials
builder.add_node("SQLQueryNode", "check_user", {
    "query": "SELECT id, password_hash, role FROM users WHERE email = ?",
    "params": ["{{input.email}}"]
})

# 2. Verify password
builder.add_node("EmbeddedPythonNode", "verify_password", {
    "code": "import bcrypt\nresult = bcrypt.verify(password, stored_hash)",
    "output_vars": ["result"]
})

# 3. Check authorization — ConditionalNode takes no config; inputs via connections
builder.add_node("ConditionalNode", "check_auth", {})

# 4. Generate JWT
builder.add_node("EmbeddedPythonNode", "generate_token", {
    "code": "import jwt\nresult = jwt.encode({'user_id': user_id, 'role': role}, secret, algorithm='HS256')",
    "output_vars": ["result"]
})

# 5. Audit log
builder.add_node("SQLQueryNode", "audit_success", {
    "query": "INSERT INTO audit_log (user_id, action, timestamp) VALUES (?, 'login', NOW())",
    "params": ["{{check_user.rows}}"]
})

builder.add_node("SQLQueryNode", "audit_failure", {
    "query": "INSERT INTO audit_log (email, action, timestamp) VALUES (?, 'failed_login', NOW())",
    "params": ["{{input.email}}"]
})

builder.connect("check_user", "rows", "verify_password", "inputs")
builder.connect("verify_password", "outputs", "check_auth", "condition")
builder.connect("check_auth", "result", "generate_token", "inputs")
builder.connect("generate_token", "outputs", "audit_success", "body")
builder.connect("check_auth", "result", "audit_failure", "body")
```

<!-- Trigger Keywords: security workflow, authentication, encryption workflow, audit trail, user auth -->
