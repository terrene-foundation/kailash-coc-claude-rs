---
name: kailash-rs-alignment
description: "Kailash RS alignment reference — 20-crate workspace layout, ML crate patterns, PyO3 bindings, transport parity, cross-SDK feature table for kailash-rs contributors."
---

# Kailash RS Alignment — Cross-SDK Reference

Workspace architecture, ML crate patterns, binding conventions, and cross-SDK parity reference for kailash-rs contributors.

## Skill Index

| #   | File                    | Purpose                                                          |
| --- | ----------------------- | ---------------------------------------------------------------- |
| 1   | `crate-structure.md`    | 20-crate workspace layout, how to add a new crate                |
| 2   | `kailash-ml-crate.md`   | ML crate architecture: traits, DataSet, engines, backends        |
| 3   | `pyo3-bindings.md`      | PyO3 binding patterns, Arrow zero-copy, async bridging           |
| 4   | `transport-parity.md`   | Intentional Python↔Rust transport divergence, EventBus semantics |
| 5   | `cross-sdk-features.md` | Feature parity table: Rust-first, Python-first, Python-only      |
