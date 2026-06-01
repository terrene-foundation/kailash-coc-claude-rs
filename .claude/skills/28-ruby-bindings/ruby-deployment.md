# Ruby Binding Deployment

Gem release reference for the Rust-backed kailash Ruby gem. Native-extension idioms with no Python/Rust analogue.

## Version Consistency — `version.rb` Is the Single Source

The gem version lives in exactly one Ruby constant, and the gemspec reads it back. Both must agree with the workspace version.

```ruby
# lib/kailash/version.rb
# frozen_string_literal: true

module Kailash
  VERSION = "1.4.0"
end
```

```ruby
# kailash.gemspec
require_relative "lib/kailash/version"

Gem::Specification.new do |spec|
  spec.name    = "kailash"
  spec.version = Kailash::VERSION   # NEVER a hardcoded literal here
  spec.authors = ["Example Author"]
  spec.summary = "Rust-backed workflow runtime for Ruby"
  spec.license = "Apache-2.0"
  spec.required_ruby_version = ">= 3.1"
  spec.extensions = ["ext/kailash/extconf.rb"]
end
```

A hardcoded `spec.version = "1.4.0"` in the gemspec drifts the moment `version.rb` is bumped without it — `Kailash::VERSION` reports one number and Bundler resolves another. Read the constant; never duplicate the literal.

Verify both agree before tagging:

```bash
ruby -Ilib -e 'require "kailash/version"; puts Kailash::VERSION'   # → 1.4.0
grep -r "1.4.0" lib/kailash/version.rb CHANGELOG.md
```

## Native-Extension Platform Matrix

The gem ships as **platform gems** — one precompiled binary per target so consumers never compile Rust at `bundle install` time. The canonical matrix:

| Platform string  | Target               |
| ---------------- | -------------------- |
| `arm64-darwin`   | Apple Silicon macOS  |
| `x86_64-darwin`  | Intel macOS          |
| `x86_64-linux`   | glibc Linux (x86-64) |
| `aarch64-linux`  | glibc Linux (ARM64)  |
| `x64-mingw-ucrt` | Windows (UCRT)       |

```ruby
# Rakefile — cross-compile each platform gem (rb-sys / rake-compiler-dock)
require "rb_sys/extensiontask"

GEMSPEC = Gem::Specification.load("kailash.gemspec")

RbSys::ExtensionTask.new("kailash", GEMSPEC) do |ext|
  ext.lib_dir = "lib/kailash"
  ext.cross_compile  = true
  ext.cross_platform = %w[
    arm64-darwin x86_64-darwin
    x86_64-linux aarch64-linux
    x64-mingw-ucrt
  ]
end
```

```bash
# Build the native extension locally, then verify it loads
bundle exec rake compile
ruby -e 'require "kailash"; puts Kailash::VERSION'   # loads the .bundle/.so
```

### Source-Protection — Platform Gems MUST NOT Ship Rust Source

A platform gem carries the **compiled** artifact only (`.bundle` on macOS, `.so` on Linux, `.dll`/`.so` on Windows). The Rust crate sources (`*.rs`, `Cargo.toml`, `Cargo.lock`, `target/`) MUST be excluded from the packaged platform gem — they bloat the gem, leak the implementation, and are useless to a consumer who cannot recompile.

```ruby
# kailash.gemspec — files list for a PLATFORM gem excludes Rust source
spec.files = Dir["lib/**/*.rb"] +
             Dir["lib/kailash/*.{bundle,so,dll}"] +   # compiled artifact ships
             %w[README.md CHANGELOG.md LICENSE]
# NO ext/**/*.rs, NO Cargo.toml, NO Cargo.lock, NO target/
```

Verify the packaged gem is source-clean before publishing:

```bash
gem build kailash.gemspec
gem unpack kailash-1.4.0-arm64-darwin.gem -t /tmp/inspect
# These MUST return nothing:
find /tmp/inspect -name "*.rs" -o -name "Cargo.toml" -o -name "Cargo.lock"
find /tmp/inspect -path "*/target/*"
```

A non-empty result means the gem leaks Rust source — fix the `spec.files` glob and rebuild. (The **source gem** — `ruby` platform — legitimately carries `ext/**/*.rs` so end users who lack a precompiled platform can build from source; only the per-platform binary gems are source-stripped.)

## Pre-Publish Validation Gate

Run the full suite against every supported Ruby version, then audit dependencies, before any push to RubyGems.

```bash
# Test + security audit (both MUST exit 0)
bundle exec rspec
bundle audit check --update

# Build + smoke-load the packaged gem (catches bad require paths / missing .bundle)
gem build kailash.gemspec
gem install ./kailash-1.4.0-arm64-darwin.gem
ruby -e 'require "kailash"; puts Kailash::VERSION'
```

`bundle audit` flags any gem in `Gemfile.lock` with a known CVE — a clean exit is a release precondition, not a courtesy. A gem that builds but fails to `require` (missing native extension, wrong load path) is unusable, and RubyGems forbids re-publishing a yanked version under the same number, so the smoke-load MUST happen before the push.

## RubyGems Publish

```bash
# Credentials come from ~/.gem/credentials (chmod 0600) or CI OIDC — NEVER inline
gem push kailash-1.4.0-arm64-darwin.gem
gem push kailash-1.4.0-x86_64-linux.gem
gem push kailash-1.4.0-aarch64-linux.gem
# ... one push per platform gem in the matrix
gem push kailash-1.4.0.gem    # the source (ruby-platform) gem last
```

```ruby
# ~/.gem/credentials  (mode 0600 — git-ignored, NEVER committed)
---
:rubygems_api_key: ${RUBYGEMS_API_KEY}
```

The API key reads from the environment / OIDC; a literal key in a committed file is permanently extractable from git history. Never publish while CI is red — a failing pipeline means known-broken native extensions reach every `bundle install` matching the version constraint.

## macOS Codesign After Local Compile

On macOS the freshly-built `.bundle` is unsigned, and Gatekeeper kills unsigned native extensions — `require "kailash"` then hangs indefinitely. After `rake compile` (or after copying the artifact into place), ad-hoc sign it:

```bash
bundle exec rake compile
codesign -fs - lib/kailash/kailash.bundle   # REQUIRED on macOS local builds
ruby -e 'require "kailash"; puts Kailash::VERSION'   # now loads instead of hanging
```

This is a local-development concern only; the published platform gems are signed by the CI release pipeline.
