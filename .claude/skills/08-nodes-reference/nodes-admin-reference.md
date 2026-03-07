---
name: nodes-admin-reference
description: "Admin nodes reference (AdminUser, AdminDB, Role, Permission). Use when asking 'admin node', 'AdminUser', 'AdminDB', 'role management', or 'permission check'."
---

# Admin Nodes Reference

Complete reference for administrative and access control nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `LOW`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (admin workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available admin nodes: UserManagementNode, RoleManagementNode,
#   PermissionCheckNode, AccessControlNode
```

## User Management

### UserManagementNode
```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("UserManagementNode", "user_mgmt", {
    "operation": "create",
    "user_data": {
        "username": "john_doe",
        "email": "john@example.com",
        "roles": ["user", "editor"]
    }
})
```

## Role Management

### RoleManagementNode
```python
builder.add_node("RoleManagementNode", "role_mgmt", {
    "operation": "assign",
    "user_id": "user_123",
    "role": "admin"
})
```

## Permission Checking

### PermissionCheckNode
```python
builder.add_node("PermissionCheckNode", "perm_check", {
    "user_id": "user_123",
    "resource": "documents",
    "action": "write"
})
```

## Access Control

### AccessControlNode
```python
builder.add_node("AccessControlNode", "access_control", {
    "operation": "verify",
    "user_id": "user_123",
    "resource_id": "doc_456",
    "required_permission": "read"
})
```

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: admin node, AdminUser, AdminDB, role management, permission check, UserManagementNode, RoleManagementNode -->
