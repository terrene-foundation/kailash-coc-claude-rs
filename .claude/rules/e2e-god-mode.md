---
priority: 10
scope: path-scoped
paths:
  - "tests/e2e/**"
  - "**/*e2e*"
  - "**/*playwright*"
---

# E2E God-Mode Testing Rules


<!-- slot:neutral-body -->


### 1. Create ALL Missing Records

When a required record is missing (404, 403, empty response): create it immediately via API or direct DB. MUST NOT skip, document as "gap", or report as "expected behavior."

**Why:** Skipping missing records produces hollow test runs that never exercise the Rust runtime's actual CRUD paths, hiding FFI serialization bugs until production.

### 2. Adapt to Data Changes

Test data changes between runs. Query the API to discover actual records before testing. MUST NOT hardcode user emails, IDs, or other test data.

**Why:** Hardcoded IDs break whenever the Rust runtime's ID generation strategy changes (e.g., UUID v4 to ULID), turning every test into a false failure.

### 3. Implement Missing Endpoints

If an API endpoint doesn't exist and testing needs it: implement it immediately. MUST NOT document as "limitation."

**Why:** Documenting a missing endpoint as a limitation halts all dependent E2E coverage and defers the gap indefinitely, leaving the Rust handler untested.

### 4. Follow Up on Failures

When an operation fails gracefully (error displayed, no crash): investigate root cause and fix. MUST NOT report "graceful failure" and move on.

**Why:** "Graceful failure" in the Rust SDK often masks a caught panic or an `Err` variant that was silently converted to a default value -- the feature remains broken behind a polished error message.

### 5. Assume Correct Role

During multi-persona testing, log in as the role needed for each operation (admin for admin actions, restricted user for restricted views).

**Why:** Testing admin-only features as a superuser bypasses the Rust authorization middleware entirely, leaving permission-check bugs undetected until a real restricted user hits them.

## Pre-E2E Checklist

- Backend and frontend running
- .env loaded and verified
- Required users, resources, and access records exist (query API, create if missing)

<!-- /slot:neutral-body -->
