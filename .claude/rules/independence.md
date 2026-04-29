---
priority: 0
scope: baseline
---

# Foundation Independence Rules


<!-- slot:neutral-body -->


This repository is a **proprietary product** that implements open standards published by the Terrene Foundation. The Foundation rules that govern `kailash-py` (Apache 2.0, CC BY 4.0, no commercial coupling) DO NOT apply here. This file is the variant override of the global `independence.md`.

See `.claude/guides/rule-extracts/independence-rs.md` for the boundary table, full key facts, extended examples, BLOCKED rationalizations, and the relationship-to-other-rules cross-reference list.

**Boundary in one line**: TF owns specs (CC BY 4.0) + open-source SDKs (Apache 2.0); this product owns its proprietary Rust codebase (`LicenseRef-Proprietary`, `publish = false`).

## MUST Rules

### 1. Proprietary Identity Is Allowed Here

Unlike `kailash-py`, this repo IS a commercial product. You MAY describe the product, reference TF standards it implements, and describe the SDK it ships (`kailash-enterprise`). You MUST NOT claim Foundation ownership or endorsement.

```markdown
# DO — accurate identity

This product ships kailash-enterprise, implementing TF standards in proprietary code.

# DO NOT — endorsement framing

kailash-enterprise is a Terrene Foundation project.
```

**Why:** Misrepresenting proprietary code as a TF project violates anti-capture provisions and creates legal ambiguity.

### 2. TF Specs Are CC BY 4.0; Implementations Are Separate

This product MAY implement TF specs (CARE, EATP, CO, PACT) in proprietary code. The implementation is trade secret; the spec stays Foundation-owned. MUST NOT claim ownership of any TF spec, modify it without upstreaming, re-license it, or claim a product extension is part of the standard.

```rust
// DO — accurate header
// Copyright 2026 [Product Entity] (proprietary)
// SPDX-License-Identifier: LicenseRef-Proprietary
// Implements EATP v1.0 (Terrene Foundation, CC BY 4.0).
// DO NOT — confused ownership (Apache-2.0 + TF copyright on proprietary code)
```

**Why:** Conflating spec ownership (TF) with implementation ownership (product) is the structural risk both sides must guard against.

### 3. Cross-Track References Must Be Generic

Docs MAY reference `kailash-py` and `pact` as TF open-source projects, factually. MUST NOT imply structural relationship, partnership, or paired-product framing ("counterpart", "officially paired", etc.).

```markdown
# DO — generic, factual reference

TF publishes open standards; this product independently implements them in Rust.

# DO NOT — paired-product framing

kailash-rs is the proprietary counterpart of kailash-py.
```

**Why:** "Counterpart" / "paired" implies a bilateral agreement. The accurate framing is: standards are public, anyone can implement them, multiple independent implementations exist.

### 4. Proprietary Code MUST NOT Be Claimed As TF Code

License headers, package metadata, and docs MUST never claim a proprietary crate is "open source" / "Foundation-owned" / under "Apache 2.0". `LicenseRef-Proprietary` SPDX identifier is mandatory; `Apache-2.0` is BLOCKED on every proprietary crate. `publish = false` is mandatory; `publish = true` on a proprietary crate is BLOCKED (would leak source to crates.io).

```toml
# DO — proprietary crate
license = "LicenseRef-Proprietary"
publish = false
# DO NOT — would leak source under unagreed license
license = "Apache-2.0"
publish = true
```

**Why:** A single mis-licensed Cargo.toml that ships to crates.io leaks the source under a license the company never agreed to. The `LicenseRef-Proprietary` + `publish = false` pair is the structural defense. BLOCKED rationalizations (full list in extract): "Apache 2.0 is more permissive, what's the harm?" / "open-source-friendly even if internal" / "we can re-license later".

### 5. The Two Crates That ARE Open-Source

`kailash-plugin-macros` and `kailash-plugin-guest` are the only crates that publish to crates.io. They MUST be Apache 2.0 OR MIT. They contain only the plugin SDK API surface — no product runtime code, no proprietary algorithms.

```toml
# DO — plugin SDK is genuinely open source
name = "kailash-plugin-guest"
license = "Apache-2.0 OR MIT"
publish = true
```

**Why:** Third-party plugin authors compile against `kailash-plugin-guest` to produce binaries that load into the product runtime. The plugin SDK is a deliberate, narrow open-source carve-out — not a precedent for opening other crates.

## MUST NOT

- Apply the `kailash-py` Foundation independence rules verbatim to this repo (this variant rule replaces the global)
- Frame this product as having a special or bilateral relationship with the Foundation
- Use "the SDK" to mean this repo — the SDK is `kailash-enterprise`, what the product ships
- Add Apache 2.0 license headers to proprietary source files

**Why:** Each pattern erodes the proprietary/Foundation boundary in a specific direction; see extract for the per-clause Why and the cross-reference list to `release.md` / `security.md` / `terrene-naming.md`.

<!-- /slot:neutral-body -->
