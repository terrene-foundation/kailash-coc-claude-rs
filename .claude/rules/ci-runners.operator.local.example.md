# ci-runners Operator-Local Values — Schema / Template

Operator-local concrete values for the kailash-rs self-hosted CI runbook
(`.claude/variants/rs/rules/ci-runners.md`, rules §4/§6/§7/§11).

Copy this file to `ci-runners.operator.local.md` (same directory) and fill in
your real deployment values. `ci-runners.operator.local.md` is **gitignored and
is NEVER committed or synced** — it is the only place the operator-specific
runner hostnames, enterprise org slug, and macOS launchd service label live.
The shipped rule carries only generic placeholders + this schema, so no
operator/engagement identifiers appear in any synced `.claude/` artifact
(issue #260 / #252 disclosure class — same pattern as #255's
`repin-targets.local.json`).

When you execute a protocol in `ci-runners.md`, read THIS deployment's values
from your local file and substitute the placeholders into the commands.

Lines beginning with `#`/`>` (like this header) are documentation; the
key → value table below is the load-bearing content.

---

## Placeholders → operator values

| Placeholder in `ci-runners.md` | What it is                                                                                                                                                                                                                                                 | Example value        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `<org>`                        | GitHub org/enterprise slug that owns the self-hosted runners (used in `gh api orgs/<org>/...` and `gh api repos/<org>/<repo>/...`). NOT the Foundation slug.                                                                                               | `example-org`        |
| `<repo>`                       | Repository name under `<org>` (the kailash-rs repo on this deployment).                                                                                                                                                                                    | `kailash-rs`         |
| `<runner-host-1>`              | Hostname/registered name of the first self-hosted runner (largest / primary build host).                                                                                                                                                                   | `example-runner-1`   |
| `<runner-host-2>`              | Hostname/registered name of the second self-hosted runner.                                                                                                                                                                                                 | `example-runner-2`   |
| `<runner-host-3>`              | Hostname/registered name of the third self-hosted runner.                                                                                                                                                                                                  | `example-runner-3`   |
| `<runner-host>`                | Generic single-host reference where any one runner host applies (e.g. release-cycle wall-clock note in §11).                                                                                                                                               | `example-runner-1`   |
| `<runner-service-label>`       | launchd/systemd service-label stem for the runner agent, used by `launchctl kickstart -k "gui/$UID/<runner-service-label>.<runner-name>"` and `systemctl restart <runner-service-label>.<runner-name>.service`. Typically derived from `<org>` + `<repo>`. | `com.example.runner` |
| `<runner-name>`                | The per-runner suffix appended to the service label for a specific host (already a placeholder in the shipped rule; included here for completeness).                                                                                                       | `runner-1`           |
| `<runner-label-arm>`           | Self-hosted ARM runner LABEL used in `runs-on:` for tag-gated release jobs (§8). Typically an `<org>`-derived label, NOT a GitHub-hosted label. Distinct from `<runner-host>` (a host identity) — this is the dispatcher label a job targets.              | `example-linux-arm`  |

## Notes

- `<org>/<repo>` is the **non-Foundation** enterprise path. The canonical
  Foundation slug `terrene-foundation/...` is a DIFFERENT, legitimate value and
  is never templated — if a command targets a Foundation-owned repo it uses
  `terrene-foundation/...` verbatim in the shipped rule.
- The service label on macOS is the launchd job label registered by the runner
  installer; `launchctl print gui/$UID | grep -i runner` on the host reveals
  the exact stem for this deployment.
- Keep this file's structure identical to the schema above so a reader can map
  every placeholder mechanically.
