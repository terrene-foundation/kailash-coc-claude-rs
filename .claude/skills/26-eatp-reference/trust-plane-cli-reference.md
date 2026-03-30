# Trust-Plane CLI Reference

## Binary

The `attest` binary is the trust-plane CLI. Requires the `cli` feature flag:

```bash
cargo build -p trust-plane --features cli
# or
cargo run -p trust-plane --features cli --bin attest -- <command>
```

## Commands (17)

### Project Lifecycle

#### `init`

Initialize a new trust project directory.

```bash
attest init /path/to/trust-dir --name "Project Alpha"
```

Creates directory structure, generates Ed25519 keypair, writes initial manifest.

#### `status`

Display project status and constraint summary.

```bash
attest status /path/to/trust-dir
```

Shows: enforcement mode, active constraints, shadow mode status, delegate count, held action count.

#### `migrate`

Migrate project directory layout to current version.

```bash
attest migrate /path/to/trust-dir
```

#### `repair`

Repair trust directory (with dry-run option).

```bash
attest repair /path/to/trust-dir --dry-run  # Preview changes
attest repair /path/to/trust-dir             # Apply fixes
```

### Decision & Milestone Recording

#### `decide`

Record a decision with constraint enforcement.

```bash
attest decide /path/to/trust-dir \
  --action "deploy-v2" \
  --decision-type implementation \
  --rationale "Approved by security team"
```

Returns the verdict (AutoApproved, Flagged, Held, Blocked).

#### `decisions`

List recorded decisions.

```bash
attest decisions /path/to/trust-dir
attest decisions /path/to/trust-dir --format json
```

#### `milestone`

Record a project milestone.

```bash
attest milestone /path/to/trust-dir \
  --name "v2.0 Release" \
  --description "Production deployment complete"
```

### Delegation

#### `delegate`

Create or manage delegation records.

```bash
attest delegate /path/to/trust-dir \
  --delegator admin \
  --delegate worker-001 \
  --scope finance \
  --capabilities "llm_call,tool_call"
```

Supports cascade revocation via `--revoke <delegation-id>`.

### Constraint Management

#### `template`

Manage constraint templates.

```bash
attest template list                    # List built-in + custom templates
attest template show financial-strict   # Show template details
attest template apply financial-strict /path/to/trust-dir
```

### Shadow Mode

#### `shadow`

Shadow mode operations.

```bash
# Enable shadow mode with candidate config
attest shadow enable /path/to/trust-dir --template strict-v2

# View shadow report
attest shadow report /path/to/trust-dir

# View per-action divergence details
attest shadow details /path/to/trust-dir
attest shadow details /path/to/trust-dir --format json

# Promote candidate to production
attest shadow promote /path/to/trust-dir

# Disable shadow mode (discard candidate)
attest shadow disable /path/to/trust-dir
```

**Security note**: The `details` subcommand sanitizes action names before terminal output (strips ASCII control characters 0x00-0x1F, 0x7F) to prevent terminal injection.

### Audit & Verification

#### `audit`

Start or stop audit sessions.

```bash
attest audit start /path/to/trust-dir
attest audit stop /path/to/trust-dir
```

#### `export`

Export audit trail.

```bash
attest export /path/to/trust-dir --format json > audit.json
attest export /path/to/trust-dir --format html > audit.html
```

#### `verify`

Verify project integrity (chain, signatures, hash links).

```bash
attest verify /path/to/trust-dir
```

### Holds

#### `holds`

Manage held actions.

```bash
attest holds list /path/to/trust-dir
attest holds approve /path/to/trust-dir --hold-id <uuid> --reason "Reviewed"
attest holds reject /path/to/trust-dir --hold-id <uuid> --reason "Rejected"
```

### Diagnostics

#### `diagnose`

Run constraint quality diagnostics.

```bash
attest diagnose /path/to/trust-dir
```

Reports: coverage gaps, overly broad constraints, unused templates, potential conflicts.

#### `conformance`

Run EATP conformance testing.

```bash
attest conformance /path/to/trust-dir
```

Reports conformance level: Compatible, Conformant, or Complete.

### Mirror Records

#### `mirror`

Mirror record management and competency mapping.

```bash
attest mirror /path/to/trust-dir --type execution
attest mirror /path/to/trust-dir --type escalation
```

## Testing CLI Commands

```bash
# Run all CLI tests
cargo test -p trust-plane --features cli

# Run specific CLI test
cargo test -p trust-plane --features cli cli::commands::shadow
```

16 shadow-mode-specific CLI tests; 629 total trust-plane tests (with cli,mcp features).
