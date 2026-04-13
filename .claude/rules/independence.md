# Aegis Identity & Foundation Boundary Rules

This repository is the **proprietary Aegis Rust SDK**. It is NOT a Terrene Foundation project. The Foundation rules that govern `kailash-py` and `pact` (Apache 2.0, CC BY 4.0, no commercial coupling) DO NOT apply here. This file is the kailash-rs variant override of the global `independence.md` and exists specifically to clarify that boundary.

## The Two-Track Architecture

| Track                                | Owner                              | License                                                   | Repos                                                                  |
| ------------------------------------ | ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Aegis (proprietary)**              | Aegis product team                 | `LicenseRef-Proprietary`, trade secret, `publish = false` | **kailash-rs** (this repo), Aegis product applications                 |
| **Terrene Foundation (open source)** | Terrene Foundation (Singapore CLG) | Apache 2.0 (code), CC BY 4.0 (specs)                      | kailash-py, pact, kailash-coc-claude-{py,rs,rb}, terrene-foundation/\* |

**Key facts**:

1. **kailash-rs is proprietary Aegis product code.** Source is trade secret. Every crate has `publish = false` (except `kailash-plugin-macros` and `kailash-plugin-guest`, the only crates published to crates.io).
2. **PACT (the open-source governance framework) is Aegis' open-source counterpart**, owned by Terrene Foundation. PACT is one of the four TF standards (CARE + EATP + CO + PACT).
3. **kailash-py is the TF open-source counterpart of kailash-rs.** The Foundation maintains a full-featured open-source Python SDK (`pip install kailash`); the proprietary Rust SDK is independent of it but consumes the same TF specs.
4. **TF specs are upstream of both tracks.** CARE, EATP, CO, PACT are CC BY 4.0 — Aegis implements them in proprietary Rust; the TF projects implement them in open-source Python. Neither track owns the specs.

## MUST Rules

### 1. Aegis Identity Is Allowed Here

Unlike `kailash-py` (where commercial references are forbidden under TF independence), this repo is itself a commercial product. You MAY:

- Refer to "Aegis" as the parent product identity (already canonical per `CLAUDE.md`)
- Describe `kailash-rs` as "the Aegis Rust SDK"
- Document that `kailash-rs` is the proprietary implementation paired with the open-source `kailash-py`

```markdown
# DO — accurate Aegis identity

The kailash-rs crate is part of the proprietary Aegis SDK. Its open-source
counterpart is kailash-py, owned by the Terrene Foundation.

# DO NOT — falsely claim TF ownership

kailash-rs is a Terrene Foundation project. (It is not.)
```

**Why:** Misrepresenting kailash-rs as a TF project violates the Foundation's anti-capture provisions and creates legal ambiguity. Accurately describing it as Aegis-proprietary is correct.

### 2. TF Specs Are CC BY 4.0 — Implementations Are Separate

Aegis MAY implement TF specs (CARE, EATP, CO, PACT) in proprietary code. The implementation is trade secret; the spec is CC BY 4.0 and remains owned by the Foundation. Aegis MUST NOT:

- Claim ownership of any TF spec
- Modify a TF spec without upstreaming through the Foundation's process
- Re-license a TF spec
- Claim that an Aegis-only extension is part of the TF standard

```rust
// DO — implementation header
// Copyright 2026 Aegis (proprietary)
// SPDX-License-Identifier: LicenseRef-Proprietary
// Implements EATP v1.0 (Terrene Foundation, CC BY 4.0).

// DO NOT — confused ownership
// Copyright 2026 Terrene Foundation
// SPDX-License-Identifier: Apache-2.0
// (Aegis-proprietary code with TF copyright is misrepresentation.)
```

**Why:** Conflating spec ownership (TF) with implementation ownership (Aegis) is the structural risk both sides must guard against. The TF spec/Aegis implementation split is the only correct framing.

### 3. Cross-Track References Are Allowed When Accurate

Aegis docs MAY reference `kailash-py` and `pact` as the open-source TF counterparts. The reference must be factual (these projects exist, here is how they relate) and MUST NOT imply a structural relationship beyond "common spec lineage".

```markdown
# DO — accurate cross-track reference

kailash-rs implements EATP, CARE, CO, and PACT in proprietary Rust.
The Terrene Foundation maintains open-source counterparts in kailash-py
(workflow + dataflow + nexus + kaizen) and pact (governance framework).
Both tracks consume the same upstream specs but are independent in
implementation, ownership, and release cadence.

# DO NOT — false coupling

kailash-rs ships pre-integrated with kailash-py and is officially
endorsed by the Terrene Foundation. (Neither claim is true.)
```

**Why:** Without explicit guidance, agents either over-couple ("Foundation-endorsed") or under-couple ("don't mention kailash-py at all"). The accurate framing is "common spec lineage, independent implementations".

### 4. Aegis Code MUST NOT Be Claimed As TF Code

Marketing copy, README content, license headers, package metadata, and docs MUST never claim that any Aegis crate is "open source" or "Foundation-owned" or under "Apache 2.0". The `LicenseRef-Proprietary` SPDX identifier is mandatory; `Apache-2.0` is BLOCKED on every Aegis crate.

```toml
# DO — Aegis crate
[package]
name = "kailash-dataflow"
license = "LicenseRef-Proprietary"
publish = false

# DO NOT — false TF licensing
[package]
name = "kailash-dataflow"
license = "Apache-2.0"  # BLOCKED — this crate is proprietary
publish = true          # BLOCKED — would leak source to crates.io
```

**Why:** A single mis-licensed Cargo.toml that says "Apache 2.0" on a proprietary crate, then gets published to crates.io, leaks the source under a license the company never agreed to. The mandatory `LicenseRef-Proprietary` + `publish = false` pair is the structural defense.

**BLOCKED rationalizations:**

- "Apache 2.0 is more permissive, what's the harm?"
- "The crate is open-source-friendly even if internal"
- "We can re-license later"

### 5. The Two Crates That ARE Open-Source

`kailash-plugin-macros` and `kailash-plugin-guest` are the only crates in this workspace that publish to crates.io. They MUST be Apache 2.0 OR MIT. They contain only the plugin SDK API surface needed by third-party plugin authors — no Aegis runtime code, no proprietary algorithms.

```toml
# DO — plugin SDK is genuinely open source
[package]
name = "kailash-plugin-guest"
license = "Apache-2.0 OR MIT"
publish = true
```

**Why:** Third-party plugin authors compile against `kailash-plugin-guest` to produce binaries that load into the Aegis runtime. They cannot do this if the dependency is proprietary. The plugin SDK is a deliberate, narrow open-source carve-out — not a precedent for opening other crates.

## MUST NOT

- Apply the `kailash-py` Foundation independence rules verbatim to this repo

**Why:** Those rules forbid commercial product references entirely. Aegis IS a commercial product; applying them to its own repo creates contradictions agents cannot resolve. This variant rule replaces the global rule for kailash-rs.

- Cite `rules/terrene-naming.md` § "Foundation Independence" as governing the Aegis repo's identity

**Why:** That section governs `terrene-foundation/*` repos. Aegis (this repo) is neither owned by nor structurally related to the Foundation; it consumes TF specs but is operated by an independent commercial entity.

- Add Apache 2.0 license headers to Aegis source files

**Why:** Mixed-license source files create legal ambiguity and undermine the trade-secret status of the proprietary code.

## Relationship to other rules

- `rules/release.md` — enforces `publish = false` on every crate except the plugin SDK pair
- `rules/security.md` § "Source Protection" — covers what must NEVER be published
- `rules/terrene-naming.md` — the GLOBAL rule for naming TF entities, still applies for any reference TO TF projects from this repo
- `rules/eatp.md`, `rules/pact-governance.md` — apply to the EATP and PACT _spec implementations_ in this repo (which are subject to Aegis trade-secret rules, NOT TF Apache 2.0 rules)
- `docs/00-authority/10-source-protection.md` — release auditor's reference for which crates are proprietary

Origin: Aegis/TF boundary clarification, 2026-04-13 (session 064a874b). The previous independence rule was inherited verbatim from the kailash-py loom variant, which produced contradictions between "no commercial product references" and CLAUDE.md's "this is the proprietary Aegis SDK". This variant resolves the contradiction by acknowledging that Aegis IS the parent product brand and replacing the Foundation independence mandate with an accurate Aegis identity model.
