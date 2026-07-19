# syntax=docker/dockerfile:1.7
# loom dev-container distribution source (rs) — generated INTO consumer templates by /sync-to-use; do not hand-edit the consumer copy.
# =============================================================================
# Kailash COC — Multi-CLI development environment (Rust SDK, binding consumers)
# -----------------------------------------------------------------------------
# One image for Python + Ruby developers consuming the Kailash Rust SDK through
# its bindings, driving development with Claude Code, Codex, or Gemini CLI.
#
# Design (see workspaces/docker-dev-environment/specs/ + 01-analysis/03-adrs):
#   - glibc base (Debian/Ubuntu) — PyO3 manylinux wheels + Magnus native gems
#     require glibc; Alpine/musl is rejected (ADR-02).
#   - Single-stage slim image — the Rust toolchain is OPT-IN (INCLUDE_RUST), so
#     there is no heavy build-only stage to drop (ADR-03 / base-image.md).
#   - Runtimes installed HERE, not via devcontainer Features — Features do not
#     apply to plain `docker compose`, which is a required entry path (FR-17).
#   - PUBLIC-REPO SAFE: zero secrets in any layer. Keys arrive only at runtime
#     via .env / host-mounted CLI config. No --build-arg carries a secret.
#   - Opt-in heavy ML/Align (INCLUDE_ML) and Rust toolchain (INCLUDE_RUST) keep
#     the default first-run lean.
# =============================================================================

# Pin by digest in production hardening; the version tag is the floor here.
# (NFR-07: resolve `docker buildx imagetools inspect` and replace with @sha256 in CI.)
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# --- Build args (NONE carry secrets) ---------------------------------------
ARG NODE_MAJOR=20
ARG KAILASH_PY_PACKAGE=kailash-enterprise
ARG KAILASH_RB_GEM=kailash
ARG INCLUDE_RUST=false
ARG INCLUDE_ML=false
# The devcontainers base ships a non-root `vscode` user (uid/gid 1000).
ARG REMOTE_USER=vscode

ENV DEBIAN_FRONTEND=noninteractive \
    # Out-of-repo install targets so the runtime bind-mount of the repo source
    # does NOT shadow them (journal/0005). The M2 overlays install into these
    # SAME locations so a no-rebuild `bin/dev setup` is requireable in the
    # same shell (NFR-12 shared-env invariant).
    VIRTUAL_ENV=/opt/venv \
    GEM_HOME=/opt/gems \
    GEM_PATH=/opt/gems \
    # BUNDLE_PATH is intentionally NOT set. Setting it (even to GEM_HOME) forces
    # bundler's isolated nested `<path>/ruby/<ver>/gems/` layout, which is NOT
    # on the default Gem.path — `ruby -e 'require "x"'` then fails in a plain
    # shell (peer-validated empirically). With BUNDLE_PATH unset, `bundle install`
    # installs system-wide into GEM_HOME (flat layout), so the overlay gem is
    # requireable in the same shell as the base gem.
    # Non-interactive GPG so `git commit -S` works in a headless container (FR-25).
    GPG_TTY=/dev/console
ENV PATH="${VIRTUAL_ENV}/bin:${GEM_HOME}/bin:/usr/local/share/npm-global/bin:${PATH}"

# --- OS packages (incl. gnupg — load-bearing for multi-operator signing) -----
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git gnupg pinentry-curses \
        build-essential pkg-config libssl-dev libffi-dev libyaml-dev \
        python3 python3-venv python3-dev python3-pip \
        ruby-full ruby-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# --- Node 20 LTS (Gemini runtime floor >=20; MCP guard engines >=18) ---------
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm config set prefix /usr/local/share/npm-global \
    && mkdir -p /usr/local/share/npm-global \
    && chown -R "${REMOTE_USER}:${REMOTE_USER}" /usr/local/share/npm-global

# --- The three driving CLIs (pinned to major/minor line — ADR-05) ------------
# 0.x packages: caret locks the MINOR (npm semantics), the right "major line" for 0.x.
RUN npm install -g --no-fund --no-audit \
        "@anthropic-ai/claude-code@^2" \
        "@openai/codex@^0.134" \
        "@google/gemini-cli@^0.43"

# --- Python venv + Rust-backed Kailash binding (out-of-repo, not shadowed) ---
RUN python3 -m venv "${VIRTUAL_ENV}" \
    && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir --upgrade pip \
    && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir "${KAILASH_PY_PACKAGE}"

# Rust-path assertion (closes C2 / HIGH-1 — specs/bindings-runtime.md). The pure-Python
# look-alike `kailash` would resolve `import kailash` but NOT the `kailash-enterprise`
# dist-name; fail the build loudly if the wrong package was resolved.
RUN "${VIRTUAL_ENV}/bin/python" -c \
    "import importlib.metadata as m; assert m.version('${KAILASH_PY_PACKAGE}'); import kailash"

# --- Ruby Magnus binding (out-of-repo GEM_HOME, not shadowed) ----------------
# Install bundler into GEM_HOME so `bundle` lands in /opt/gems/bin (on PATH);
# the default-gem bundler under the system ruby tree is NOT on PATH. Pinned to
# the `~> 4.0` major line so a future bundler-major bump cannot silently change
# the verified flat-layout contract. The M2 overlay path (`Gemfile.user`) drives
# bundle.
RUN set -eux; \
    gem install bundler -v '~> 4.0' --no-document; \
    # Pin the gem FLOOR to 4.3.1 — the first release that ships a per-Ruby-ABI
    # fat gem (kailash-rs#1151). Below 4.3.1 the single precompiled .so links
    # libruby-3.1 and is unloadable on this image's Ruby 3.2 regardless of the
    # reconciliation below; the floor turns that into a loud build failure.
    gem install "${KAILASH_RB_GEM}" -v '>= 4.3.1' --no-document; \
    # Debian/Ubuntu soname reconciliation: the 4.3.1 fat-gem native ext links the
    # vanilla-Ruby soname `libruby.so.X.Y`, but Debian/Ubuntu name the shared lib
    # `libruby-X.Y.so.X.Y` (LIBRUBY_SO). Bridge with a symlink + ldconfig so the
    # precompiled ext resolves libruby at load time. Arch-agnostic (amd64+arm64)
    # via rbconfig. REMOVE when an upstream gem ships without the vanilla-soname
    # NEEDED entry (tracked at kailash-rs#1151).
    rubyabi="$(ruby -e 'print RbConfig::CONFIG["ruby_version"][/\d+\.\d+/]')"; \
    archlibdir="$(ruby -e 'print RbConfig::CONFIG["archlibdir"]')"; \
    libruby_so="$(ruby -e 'print RbConfig::CONFIG["LIBRUBY_SO"]')"; \
    ln -sf "${archlibdir}/${libruby_so}" "${archlibdir}/libruby.so.${rubyabi}"; \
    ldconfig; \
    # Ruby-path assertion (parallel to the Python Rust-path assertion above): the
    # binding must LOAD, not merely install. Fails the build loudly on regression.
    ruby -e 'require "kailash"' && echo "ruby require \"kailash\" OK"

# --- OPT-IN Rust toolchain (source builds / SDK-source dev only — ADR-03) ----
# Install into out-of-home /opt/cargo + /opt/rustup so the toolchain is OWNED BY
# and ON-PATH FOR the non-root `vscode` runtime user. A default rustup install as
# root lands in /root/.cargo (unreadable + off-PATH for vscode) — the opt-in layer
# would otherwise ship non-functional for the user the container runs as. (R2 M1 fix.)
ENV CARGO_HOME=/opt/cargo \
    RUSTUP_HOME=/opt/rustup
ENV PATH="${CARGO_HOME}/bin:${PATH}"
RUN if [ "${INCLUDE_RUST}" = "true" ]; then \
        curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal \
            --default-toolchain stable --no-modify-path \
        && "${CARGO_HOME}/bin/cargo" --version \
        && "${CARGO_HOME}/bin/rustc" --version \
        && chown -R "${REMOTE_USER}:${REMOTE_USER}" "${CARGO_HOME}" "${RUSTUP_HOME}"; \
    fi

# --- OPT-IN heavy ML/Align layer (torch-class, multi-GB — ADR-12) ------------
# Dependency-agnostic: gated by the flag, not by a frozen package list.
RUN if [ "${INCLUDE_ML}" = "true" ]; then \
        "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir kailash-ml kailash-align; \
    fi

# Hand the out-of-repo install targets to the non-root user.
RUN chown -R "${REMOTE_USER}:${REMOTE_USER}" "${VIRTUAL_ENV}" "${GEM_HOME}"

USER ${REMOTE_USER}
WORKDIR /workspace

# Source (incl. .claude/ + .codex-mcp-guard/) is BIND-MOUNTED at runtime, not COPYed —
# keeps the image source-agnostic and avoids rebuild-on-every-edit. The guard's
# node_modules installs at runtime (bin/dev / postCreate), never baked (journal/0005).

CMD ["sleep", "infinity"]
