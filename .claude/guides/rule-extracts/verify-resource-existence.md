# Verify Resource Existence — Extended Examples & Origin

Reference for `rules/verify-resource-existence.md`. The main rule keeps the load-bearing MUST/MUST NOT clauses; this extract carries the full BLOCKED-rationalization enumerations, extended DO/DO NOT examples, and the origin post-mortem.

## Rule 1 — Existence Check Precedes Permission Debugging

### Full DO / DO NOT examples

```bash
# DO — existence check first
$ gh api orgs/<org>/actions/hosted-runners
{"total_count":1,"runners":[{"name":"esperie-linux-arm",...}]}
# → no 16-core runner exists; the workflow step targeting it can never succeed
# → recommendation: delete the dead step (no PAT, no rotation, no debugging)

# DO NOT — chase permission scopes against an empty target
$ gh api orgs/<org>/actions/hosted-runners → 403
"Try scope A" → 403 → "Try scope B" → 403 → user fatigue → eventual deletion anyway
```

### Full BLOCKED rationalizations

- "The script obviously expects this resource to exist"
- "The 403 confirms the endpoint is real, just the permission is wrong"
- "Existence is implied by the documentation reference"
- "We can verify existence after we get the permission right"
- "The user already approved the credential workflow, no need to detour"
- "The previous engineer set this up, so the resource must be there"
- "It's faster to try the obvious credential fix first"

### Why (full)

A 403 says "you cannot access this thing" — it does NOT say the thing exists. GitHub (and most APIs) return 403 for both "missing permission to access an existing resource" AND "missing permission to even discover whether the resource exists" — the message is identical. Trial-and-error against the permission axis can succeed only when the resource is real; against an absent resource it produces unbounded rotation cycles. The existence check is a single read query that costs <1 second and resolves the recursion.

## Rule 2 — Existence Check Cites the Endpoint, Not the Documentation

### Full DO / DO NOT examples

```bash
# DO — verify against the live API
$ gh api orgs/<org>/actions/hosted-runners --jq '.runners[].name'

# DO — verify a database table actually exists
$ psql -c "\dt schema.table_name"

# DO — verify a secret slot is populated
$ gh secret list --repo <org>/<repo> | grep '^ORG_ADMIN_TOKEN'

# DO NOT — trust the comment block
$ grep -A 5 "16-core" .github/workflows/ci-queue-monitor.yml
# (the script targets a 16-core runner — but that's INTENT, not EXISTENCE)

# DO NOT — trust the spec / ADR / README
$ grep -l "rust-heavy" specs/ci-infrastructure.md
# (the spec describes a recommended pattern — but it may never have been wired)
```

### Full BLOCKED rationalizations

- "The README says it's deployed"
- "The spec mandates this resource"
- "The script wouldn't be checked in if the resource didn't exist"
- "Past commits reference setting it up"
- "Operators told me it was provisioned"

### Why (full)

Documentation, source comments, and operator memory all describe INTENT — what the system was supposed to look like at some point. None of them are evidence of CURRENT runtime state. A spec can mandate a 16-core runner that operations never actually provisioned; a script can target a database table that a half-finished migration left undefined; a workflow can read a secret that was rotated out of existence. The live API query is the only evidence; everything else is hearsay.

## Rule 3 — Default Disposition is Delete-Or-Stub, Not Provision

### Full DO / DO NOT examples

```yaml
# DO — resource doesn't exist; remove dependent step
- name: Auto-remove rust-heavy label from 16-core when idle
  # DELETED 2026-05-03: targeted runner does not exist in the org;
  # see PR #773 for removal rationale.

# DO NOT — auto-recommend provisioning a resource the user never asked for
"You should provision a 16-core runner so this step can succeed."
# (the user inherited this script; nobody asked for the runner; the step
#  was speculative-add. The right disposition is removal, not building
#  more infrastructure to feed the speculation.)
```

### Full BLOCKED rationalizations

- "The script is here, so someone wanted this feature"
- "It would be wasteful to delete; we might need it someday"
- "Provisioning is the more 'correct' fix"
- "Removing without a follow-up issue loses the design intent"

### Why (full)

Code that targets a non-existent resource is dead by definition — it cannot have ever worked. Treating it as live and recommending the user build infrastructure to make it work inverts the cost model: the user pays now for a capability they never requested, against the speculation that they might want it. Removal is the cheap, reversible disposition (revert is one command); provisioning is the expensive, durable commitment (server costs, secret rotation, monitoring). When the user genuinely wants the capability, they will say so; until then, dead code is dead.

## Origin (full post-mortem)

2026-05-03 ci-queue-monitor session — 6 consecutive PRs (#766, #769, #770, #771, #772, #773) + 2 user PAT-creation cycles spent debugging access to a 16-core GitHub-hosted runner that did not exist in the `esperie-enterprise` org.

The single command `gh api orgs/esperie-enterprise/actions/hosted-runners` at the first 403 (PR #765 verification) would have shown a one-runner list with no 16-core entry and shifted the disposition immediately to "delete the dead step."

Saved by the existence-check-first discipline (counterfactual): ~15 minutes of operator browser time, two unused PAT credentials, and roughly 5 PRs of cycle.

User feedback verbatim that triggered codification:

> "why the fuck are you wasting so much time and tokens on something that don't exist??????"
> "we have a shit ton of backlogs in /sweep that is waiting"

The failure mode is structural: a 403 against an absent resource looks identical to a 403 against an inaccessible-but-real resource. Without an existence check at the FIRST 403, the agent recurses on the permission axis indefinitely. The rule is the structural defense.

## Three-Layer Defense Detail

1. **Existence check FIRST** — `gh api`, `psql \dt`, `kubectl get`, `aws describe-*`, etc. One read query against the live system.
2. **If exists** — proceed with permission/scope debugging using the standard rules (see `rules/security.md`, `rules/ci-runners.md`).
3. **If absent** — default to removal of dependent code; provisioning ONLY on explicit user request.
