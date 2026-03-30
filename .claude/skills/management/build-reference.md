# Build Reference

Reference material for the /build command.

## Language Bindings

### Python (PyO3)

```bash
# Build Python wheel with maturin
cd bindings/kailash-python
maturin develop          # Debug build, install in active venv
maturin build --release  # Build release wheel

# Build with specific Python version
maturin build --release --interpreter python3.11
```

### Node.js (napi-rs)

```bash
# Build Node.js native addon
cd bindings/kailash-node
npm run build            # Debug build
npm run build:release    # Release build

# Or directly with napi
napi build --release
```

### WebAssembly (wasm-bindgen)

```bash
# Build WASM target
cd bindings/kailash-wasm
wasm-pack build --target web       # For web browsers
wasm-pack build --target nodejs    # For Node.js
wasm-pack build --target bundler   # For bundlers (webpack, etc.)
```

## Cross-Compilation

```bash
# Add a target
rustup target add x86_64-unknown-linux-gnu
rustup target add aarch64-unknown-linux-gnu
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Cross-compile
cargo build --workspace --release --target x86_64-unknown-linux-gnu
cargo build --workspace --release --target aarch64-unknown-linux-gnu

# Cross-compile with cross (recommended for Linux targets on macOS)
cross build --workspace --release --target x86_64-unknown-linux-gnu
```

## Feature Flags

### Workspace-Level Features

```toml
# Cargo.toml (workspace root)
[workspace.features]
default = ["sqlite"]
postgres = ["kailash-dataflow/postgres"]
sqlite = ["kailash-dataflow/sqlite"]
full = ["postgres", "sqlite", "redis"]
```

### Crate-Level Features

```bash
# Build with specific features
cargo build -p kailash-dataflow --features "postgres"
cargo build -p kailash-core --features "async-runtime"

# Build with no default features
cargo build -p kailash-value --no-default-features

# Build with all features
cargo build -p kailash-core --all-features
```

## Build Profiles

### Cargo.toml Profile Configuration

```toml
[profile.dev]
opt-level = 0
debug = true

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = "symbols"
panic = "abort"

[profile.bench]
inherits = "release"
debug = true
```

## Incremental Builds

```bash
# Enable incremental compilation (default in dev)
CARGO_INCREMENTAL=1 cargo build

# Disable for CI (more reproducible)
CARGO_INCREMENTAL=0 cargo build --release

# Clean build artifacts
cargo clean

# Clean only a specific crate
cargo clean -p kailash-core
```

## Build Troubleshooting

| Issue             | Solution                                                   |
| ----------------- | ---------------------------------------------------------- |
| Slow builds       | Use `cargo check` for type-checking, `sccache` for caching |
| Linker errors     | Install platform linker (e.g., `lld` for faster linking)   |
| Feature conflicts | Use `cargo tree -e features` to diagnose                   |
| Dependency issues | Run `cargo update` or check `Cargo.lock`                   |

```bash
# Use faster linker (add to .cargo/config.toml)
# [target.x86_64-unknown-linux-gnu]
# linker = "clang"
# rustflags = ["-C", "link-arg=-fuse-ld=lld"]

# Shared compilation cache
cargo install sccache
export RUSTC_WRAPPER=sccache
```

## Related Commands

- `/cargo` - Workspace and dependency management
- `/test` - Testing strategies
- `/validate` - Clippy, rustfmt, audit compliance
