# Cargo Workspace Reference

Reference material for the /cargo command.

### Dependency Policies (cargo-deny)

```bash
# Check all policies
cargo deny check

# Check licenses only
cargo deny check licenses

# Check for advisories (security)
cargo deny check advisories

# Check for banned crates
cargo deny check bans

# Check dependency sources
cargo deny check sources
```

## Crate Dependency Graph

```
kailash-value (no deps, no_std optional)
  ^
kailash-core (kailash-value, tokio, serde)
  ^
kailash-nodes (kailash-core, kailash-value)
  ^
kailash-plugin (kailash-core, libloading)
  ^
kailash-capi (kailash-core, kailash-value)
  ^         ^          ^
  |         |          |
kailash-dataflow   kailash-nexus   kailash-kaizen
(sqlx)             (axum)          (reqwest)
  ^                  ^               ^
  |                  |               |
# ... (see skill reference for full example)
```

## Feature Flag Patterns

### Defining Features

```toml
[features]
default = ["sqlite"]
sqlite = ["sqlx/sqlite"]
postgres = ["sqlx/postgres"]
mysql = ["sqlx/mysql"]
full = ["sqlite", "postgres", "mysql"]

# Feature for optional functionality
tracing-support = ["dep:tracing-subscriber"]
```

### Conditional Compilation

```rust
// In Rust source
#[cfg(feature = "postgres")]
pub mod postgres;

#[cfg(feature = "sqlite")]
pub mod sqlite;

#[cfg(all(feature = "postgres", feature = "sqlite"))]
pub fn migrate_all() { /* ... */ }
```

### Building with Features

```bash
# Default features
cargo build -p kailash-dataflow

# Specific features
cargo build -p kailash-dataflow --features "postgres"

# No default features
cargo build -p kailash-dataflow --no-default-features --features "postgres"

# All features
cargo build -p kailash-dataflow --all-features
```

## Publishing Crates

### Pre-Publish Checklist

```bash
# 1. Verify all tests pass
cargo test --workspace

# 2. Run clippy
cargo clippy --workspace --all-targets -- -D warnings

# 3. Check formatting
cargo fmt --all -- --check

# 4. Run audit
cargo audit

# 5. Dry-run publish
cargo publish -p kailash-value --dry-run
```

### Publishing Order (respect dependency graph)

```bash
# Publish in dependency order
cargo publish -p kailash-value
cargo publish -p kailash-core
cargo publish -p kailash-nodes
cargo publish -p kailash-plugin
cargo publish -p kailash-capi
cargo publish -p kailash-dataflow
cargo publish -p kailash-nexus
cargo publish -p kailash-kaizen
```

### Version Management

```bash
# Use cargo-release for automated versioning
cargo install cargo-release

# Bump version for a single crate
cargo release patch -p kailash-core --execute

# Bump version for entire workspace
cargo release minor --workspace --execute

# Dry-run (preview changes)
cargo release patch --workspace
```

## Cargo Configuration (.cargo/config.toml)

```toml
[build]
# Use faster linker
# rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[alias]
w = "watch"
t = "test --workspace"
c = "clippy --workspace --all-targets -- -D warnings"
```

## Useful Cargo Plugins

```bash
# Install commonly used tools
cargo install cargo-watch        # Auto-rebuild on file changes
cargo install cargo-audit        # Security vulnerability scanning
cargo install cargo-deny         # Dependency policy checking
cargo install cargo-outdated     # Find outdated dependencies
cargo install cargo-release      # Automated version management
cargo install cargo-tarpaulin    # Code coverage
cargo install sccache            # Shared compilation cache

# Usage
cargo watch -x "check --workspace"          # Watch and check
cargo watch -x "test --workspace"           # Watch and test
cargo watch -x "clippy --workspace"         # Watch and lint
```

## Related Commands

- `/build` - Build patterns and cross-compilation
- `/test` - Testing strategies
- `/validate` - Clippy, rustfmt, audit compliance
