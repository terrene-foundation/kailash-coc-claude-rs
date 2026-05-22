# ci-runners Operator-Local Values — THIS DEPLOYMENT (gitignored)

Real concrete values for the kailash-rs self-hosted CI runbook on this
operator's deployment. **Gitignored — never committed, never synced**
(issue #260 / #252). Populated from the pre-#260 verbatim contents of
`ci-runners.md`. Schema: `ci-runners.operator.local.example.md`.

When executing a protocol in `ci-runners.md`, substitute these values for the
generic placeholders.

---

## Placeholders → real values (this deployment)

| Placeholder in `ci-runners.md` | Real value                                     |
| ------------------------------ | ---------------------------------------------- |
| `<org>`                        | esperie-enterprise                             |
| `<repo>`                       | kailash-rs                                     |
| `<runner-host-1>`              | Jacks-Mac-Studio                               |
| `<runner-host-2>`              | Esperies-Mini                                  |
| `<runner-host-3>`              | esperie-mac                                    |
| `<runner-host>`                | Jacks-Mac-Studio                               |
| `<runner-service-label>`       | actions.runner.esperie-enterprise-kailash-rs   |
| `<runner-name>`                | (per-host suffix, e.g. registered runner name) |
| `<runner-label-arm>`           | esperie-linux-arm                              |

## Reconstructed commands (real values substituted)

§4 — runner auto-update disconnect recovery:

```bash
gh api repos/esperie-enterprise/kailash-rs/actions/runners
```

§6 — zombie-job cancellation protocol:

```bash
# Step 1: enumerate runner state
gh api orgs/esperie-enterprise/actions/runners \
  --jq '.runners[] | {name, busy, status}'
# Step 2: cross-reference with the stuck run's jobs
gh api repos/esperie-enterprise/kailash-rs/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | {name, status, started_at, runner_name}'
# Step 4: kickstart the wedged service agent
# macOS:
launchctl kickstart -k "gui/$UID/actions.runner.esperie-enterprise-kailash-rs.<runner-name>"
# Linux (systemd):
sudo systemctl restart actions.runner.esperie-enterprise-kailash-rs.<runner-name>.service
```

Zombie-job runner examples (host names): Jacks-Mac-Studio, Esperies-Mini, esperie-mac.
§6 Origin host: Jacks-Mac-Studio (2026-04-20 phantom "Integration Tests" job).

§7 — idle-but-not-accepting runner protocol:

```bash
# Step 1: confirm diagnosis
gh api orgs/esperie-enterprise/actions/runners \
  --jq '.runners[] | {name, busy, status, labels: [.labels[].name]}'
# Step 3: de-register the idle runner
RUNNER_ID=$(gh api orgs/esperie-enterprise/actions/runners \
  --jq '.runners[] | select(.name == "<runner-name>") | .id')
gh api -X DELETE orgs/esperie-enterprise/actions/runners/$RUNNER_ID
```

§8 — tag-gated release jobs (`runs-on:` label substitution):

```yaml
runs-on: esperie-linux-arm
```

§8 Origin/Why hosts: the v3.20.3 / v3.20.4 / v3.20.5 tag-time bugs
(missing Docker, missing `gh` CLI) were on `esperie-linux-arm`.

§11 — release-cycle wall-clock note: ~45 min Mac Studio + bindings.
