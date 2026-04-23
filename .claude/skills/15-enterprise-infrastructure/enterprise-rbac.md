# Enterprise RBAC Skill

RBAC configuration, role hierarchy, wildcard permissions, and Nexus integration.

## Usage

`/enterprise-rbac` -- Reference for RbacPolicy, role hierarchies, permission wildcards, and enforcement

## Core Concepts

- **Role**: A named group of permissions (e.g., `admin`, `viewer`, `editor`)
- **Permission**: A string identifying an action on a resource (e.g., `users:read`, `reports:write`)
- **Role Hierarchy**: A role can inherit all permissions of a parent role
- **Wildcards**: `*` matches any segment in a permission string

## Basic RBAC Setup

```rust
use kailash_enterprise::rbac::{RbacPolicy, Role, Permission};

let mut policy = RbacPolicy::new();

// Define roles with permissions
policy.add_role(Role::new("viewer")
    .with_permission("users:read")
    .with_permission("reports:read")
);

policy.add_role(Role::new("editor")
    .with_permission("users:read")
    .with_permission("users:write")
    .with_permission("reports:read")
    .with_permission("reports:write")
);

policy.add_role(Role::new("admin")
    .with_permission("*")  // Wildcard: grants ALL permissions
);

// Check a permission
let can_edit = policy.check_permission(&["editor"], "users:write");
assert!(can_edit);  // true

let can_admin = policy.check_permission(&["viewer"], "users:write");
assert!(!can_admin);  // false
```

## Role Hierarchy (Inheritance)

```rust
policy.add_role(Role::new("base_user")
    .with_permission("profile:read")
    .with_permission("profile:write")
);

policy.add_role(Role::new("member")
    .inherits("base_user")  // Gets all base_user permissions
    .with_permission("content:read")
);

policy.add_role(Role::new("premium_member")
    .inherits("member")    // Gets all member permissions (including base_user)
    .with_permission("content:write")
    .with_permission("analytics:read")
);

// premium_member has: profile:read, profile:write, content:read, content:write, analytics:read
```

## Wildcard Permissions

```rust
// Resource-level wildcard: all actions on "users"
policy.add_role(Role::new("user_admin")
    .with_permission("users:*")  // users:read, users:write, users:delete, etc.
);

// Action-level wildcard: "read" on all resources
policy.add_role(Role::new("read_only")
    .with_permission("*:read")  // users:read, reports:read, config:read, etc.
);

// Full wildcard: all permissions
policy.add_role(Role::new("superadmin")
    .with_permission("*")
);

// Nested wildcards
policy.add_role(Role::new("tenant_admin")
    .with_permission("tenant:*:*")  // All actions on all tenant resources
);
```

## Multi-Role Users

```rust
// Users can have multiple roles -- permissions are unioned
let roles = vec!["viewer".to_string(), "billing_admin".to_string()];

let can_read = policy.check_permission(&roles, "users:read");      // true (from viewer)
let can_bill = policy.check_permission(&roles, "billing:manage");   // true (from billing_admin)
let can_write = policy.check_permission(&roles, "users:write");     // false (neither role has it)
```

## Nexus Integration

```rust
use kailash_nexus::prelude::*;
use kailash_enterprise::rbac::RbacPolicy;

let mut rbac = RbacPolicy::new();
rbac.add_role(Role::new("admin").with_permission("*"));
rbac.add_role(Role::new("user").with_permission("profile:*"));

let app = Nexus::new()
    .preset(Preset::SaaS)
    .jwt_secret(std::env::var("JWT_SECRET").unwrap())
    .rbac_policy(rbac)

    // Require specific permission on a handler
    .handler("admin_panel", |auth: AuthContext| async move {
        // JWT middleware already verified the token
        // RBAC middleware checks "admin_panel:access" permission automatically
        // based on auth.roles
        Ok(json!({ "status": "ok" }))
    })

    // Explicit permission requirement
    .handler_with_permission("delete_user", "users:delete",
        |auth: AuthContext, user_id: String| async move {
            Ok(json!({ "deleted": user_id }))
        }
    );
```

## Permission Check in Handler

```rust
use kailash_nexus::auth::AuthContext;
use kailash_enterprise::rbac::RbacPolicy;
use std::sync::Arc;

let rbac = Arc::new(RbacPolicy::new(/* ... */));

app.handler("manage_resource", move |auth: AuthContext, action: String| {
    let rbac = Arc::clone(&rbac);
    async move {
        let permission = format!("resource:{}", action);
        if !rbac.check_permission(&auth.roles, &permission) {
            return Err(NexusError::forbidden(format!(
                "Permission denied: {}", permission
            )));
        }
        Ok(json!({ "action": action, "status": "executed" }))
    }
});
```

## Permission Naming Conventions

Use a consistent `resource:action` format:

| Pattern          | Meaning                       |
| ---------------- | ----------------------------- |
| `users:read`     | Read user records             |
| `users:write`    | Create or update user records |
| `users:delete`   | Delete user records           |
| `users:*`        | Any action on users           |
| `reports:export` | Export reports                |
| `admin:*`        | All admin actions             |
| `*`              | Everything (superadmin)       |
| `tenant:manage`  | Manage tenant settings        |

## Testing RBAC Policies

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn test_policy() -> RbacPolicy {
        let mut policy = RbacPolicy::new();
        policy.add_role(Role::new("viewer").with_permission("users:read"));
        policy.add_role(Role::new("admin").with_permission("*"));
        policy
    }

    #[test]
    fn viewer_can_read_but_not_write() {
        let policy = test_policy();
        assert!(policy.check_permission(&["viewer"], "users:read"));
        assert!(!policy.check_permission(&["viewer"], "users:write"));
    }

    #[test]
    fn admin_has_all_permissions() {
        let policy = test_policy();
        assert!(policy.check_permission(&["admin"], "users:read"));
        assert!(policy.check_permission(&["admin"], "reports:export"));
        assert!(policy.check_permission(&["admin"], "anything:arbitrary"));
    }

    #[test]
    fn no_roles_means_no_permissions() {
        let policy = test_policy();
        assert!(!policy.check_permission(&[], "users:read"));
    }
}
```

## Verify

```bash
PATH="$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" SDKROOT=$(xcrun --show-sdk-path) cargo test -p kailash-enterprise -- rbac --nocapture 2>&1
```
