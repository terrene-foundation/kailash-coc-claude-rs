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
builder.add_node("DatabaseQueryNode", "check_user", {
    "query": "SELECT id, password_hash, role FROM users WHERE email = ?",
    "parameters": ["{{input.email}}"]
})

# 2. Verify password
builder.add_node("TransformNode", "verify_password", {
    "input": "{{input.password}}",
    "stored_hash": "{{check_user.password_hash}}",
    "transformation": "bcrypt.verify(input, stored_hash)"
})

# 3. Check authorization
builder.add_node("ConditionalNode", "check_auth", {
    "condition": "{{verify_password.match}} == true",
    "true_branch": "generate_token",
    "false_branch": "audit_failure"
})

# 4. Generate JWT
builder.add_node("TransformNode", "generate_token", {
    "input": {"user_id": "{{check_user.id}}", "role": "{{check_user.role}}"},
    "transformation": "jwt.encode(input, secret, algorithm='HS256')"
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
builder.connect("check_auth", "output_true", "generate_token", "input")
builder.connect("generate_token", "token", "audit_success", "parameters")
builder.connect("check_auth", "output_false", "audit_failure", "trigger")
```

<!-- Trigger Keywords: security workflow, authentication, encryption workflow, audit trail, user auth -->
