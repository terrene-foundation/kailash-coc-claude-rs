---
priority: 0
scope: baseline
---

# Verify Resource Existence Before Debugging Access

See `.claude/guides/rule-extracts/verify-resource-existence.md` for full DO/DO NOT examples, BLOCKED-rationalization enumerations, and origin post-mortem.

When a tool fails with a permission error (HTTP 403, "access denied", "insufficient scope") against a named external resource, the FIRST diagnostic action MUST be to verify the resource exists. Recursing on the permission axis against an absent resource produces unbounded credential-rotation cycles.

## MUST Rules

### 1. Existence Check Precedes Permission Debugging

Any session responding to a 403/401/permission-denied against a named external resource MUST run an existence check against that resource as the first diagnostic action. Recommending PAT provisioning, scope expansion, or credential rotation BEFORE the existence check is BLOCKED.

**Why:** A 403 says "you cannot access this thing" — it does NOT say the thing exists. APIs return 403 for both "missing permission to access" AND "missing permission to discover existence" — identical message, opposite root cause. The existence check (one read query, <1 second) resolves the recursion.

### 2. The Existence Check MUST Cite The Endpoint, Not The Documentation

The verification command MUST be a live read against the same API surface the failing operation targets — NOT a grep against documentation, source comments, spec files, or the script's own intent statements. Trusting documentation as a proxy for runtime existence is BLOCKED.

**Why:** Documentation, source comments, and operator memory all describe INTENT. None are evidence of CURRENT runtime state. A spec can mandate a runner that operations never provisioned; a script can target a table left undefined by a half-finished migration; a workflow can read a secret that was rotated out of existence. The live API query is the only evidence; everything else is hearsay.

### 3. When Existence Check Fails, Default Disposition Is Delete-Or-Stub, Not Provision

If the existence check returns empty AND there is no active user request to provision the resource, the default disposition MUST be to delete the dependent code OR convert it to a no-op with a documented removal path. Recommending provisioning ("create the missing resource") is BLOCKED unless the user explicitly asked for that capability.

**Why:** Code targeting a non-existent resource is dead by definition — it cannot have ever worked. Removal is cheap and reversible; provisioning is expensive and durable (server costs, secret rotation, monitoring). Until the user asks for the capability, dead code is dead.

## MUST NOT

- Recommend credential creation (PAT, service account, API key) BEFORE the existence check has run

**Why:** Credential creation is operator-time-expensive and error-prone. Spending it on a non-existent target is the worst-case waste — operator spends real time to obtain a credential that unlocks nothing.

- Loop more than once on permission-scope variations against the same 403 without re-verifying existence

**Why:** Two consecutive failed scope attempts against the same 403 is the loud signal that the permission axis is the wrong axis. Existence check MUST fire automatically at the second failure if not at the first.

## Three-Layer Defense

1. Existence check FIRST — `gh api`, `psql \dt`, `kubectl get`, `aws describe-*`, etc.
2. If exists — proceed with permission/scope debugging (`rules/security.md`, `rules/ci-runners.md`).
3. If absent — default to removal; provisioning ONLY on explicit user request.

Origin: 2026-05-03 ci-queue-monitor session burned 6 PRs + 2 user PAT-creation cycles debugging access to a 16-core hosted runner that did not exist. One `gh api orgs/.../actions/hosted-runners` at the first 403 would have shifted disposition to "delete the dead step." See guide for full post-mortem.
