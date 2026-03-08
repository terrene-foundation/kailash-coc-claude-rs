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
    "parameters": ["{{input.email}}"]
})

# 2. Verify password
builder.add_node("EmbeddedPythonNode", "verify_password", {
    "code": "import bcrypt\nresult = bcrypt.verify(input, stored_hash)",
    "output_vars": ["result"]
})

# 3. Check authorization
builder.add_node("ConditionalNode", "check_auth", {
    "condition": "{{verify_password.match}} == true",
    "true_branch": "generate_token",
    "false_branch": "audit_failure"
})

# 4. Generate JWT
builder.add_node("EmbeddedPythonNode", "generate_token", {
    "code": "import jwt\nresult = jwt.encode({'user_id': user_id, 'role': role}, secret, algorithm='HS256')",
    "output_vars": ["result"]
})

# 5. Audit log
builder.add_node("SQLQueryNode", "audit_success", {
    "query": "INSERT INTO audit_log (user_id, action, timestamp) VALUES (?, 'login', NOW())",
    "parameters": ["{{check_user.id}}"]
})

builder.add_node("SQLQueryNode", "audit_failure", {
    "query": "INSERT INTO audit_log (email, action, timestamp) VALUES (?, 'failed_login', NOW())",
    "parameters": ["{{input.email}}"]
})

builder.connect("check_user", "password_hash", "verify_password", "stored_hash")
builder.connect("verify_password", "match", "check_auth", "condition")
builder.connect("check_auth", "result", "generate_token", "input")
builder.connect("generate_token", "token", "audit_success", "parameters")
builder.connect("check_auth", "result", "audit_failure", "trigger")
```

<!-- Trigger Keywords: security workflow, authentication, encryption workflow, audit trail, user auth -->
