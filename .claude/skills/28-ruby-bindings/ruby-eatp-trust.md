# Ruby Binding EATP & Trust-Plane Idioms

Ruby crypto, serialization, and trust-record hygiene for the kailash EATP / trust-plane surface. These are the Ruby-specific idioms — frozen `Struct`, constant-time comparison, key-zeroing under the native extension, symlink-safe reads — that have no direct Python/Rust analogue.

## Frozen Data Types — `Struct` + `#to_h` + `.from_hash`

Trust records are immutable value objects. Use a keyword-init `Struct` (or a plain class with `attr_reader`), NEVER `OpenStruct` or a mutable `Hash`. Every type carries `#to_h` and a `.from_hash` class method for round-trip serialization across the SDK boundary.

```ruby
# frozen_string_literal: true

VerificationResult = Struct.new(:status, :timestamp, :details, keyword_init: true) do
  def to_h
    { status: status.to_s, timestamp: timestamp.iso8601, details: details }
  end

  def self.from_hash(hash)
    new(
      status:    hash[:status].to_sym,
      timestamp: Time.parse(hash[:timestamp]),
      details:   hash[:details],
    )
  end
end

result = VerificationResult.new(status: :approved, timestamp: Time.now, details: {})
JSON.generate(result.to_h)   # enums → string value, timestamps → iso8601
```

`OpenStruct` allocates a method per attribute and is ~10x slower than `Struct` — deprecated in Ruby 3.4+ for exactly this reason. Symbols serialize to Ruby-specific `:symbol` notation that the Python and Rust SDKs cannot parse, so enums emit their **string** value and timestamps emit `.iso8601`.

## `# frozen_string_literal: true` Pragma

Every trust-plane / EATP source file opens with the frozen-string pragma. Without it, each string literal in a hot verification loop allocates a fresh mutable object, multiplying GC pressure.

```ruby
# frozen_string_literal: true
# (top line of every lib/kailash/trust/*.rb and lib/kailash/eatp/*.rb file)
```

## Immutable Trust Context — `attr_reader` + `.freeze`

Constraint and policy objects MUST be frozen after construction and expose `attr_reader` (never `attr_accessor`). An unfrozen policy can be mutated at runtime, silently tampering with governance constraints that must be fixed once set.

```ruby
# frozen_string_literal: true

class ClearancePolicy
  attr_reader :max_cost, :allowed_resources

  def initialize(max_cost:, allowed_resources:)
    raise ArgumentError, "max_cost must be finite" unless max_cost.to_f.finite?
    @max_cost          = max_cost.to_f
    @allowed_resources = allowed_resources.dup.freeze
    freeze   # whole object immutable after init
  end
end

policy = ClearancePolicy.new(max_cost: 5.0, allowed_resources: ["read"])
policy.frozen?   # => true
```

## Ed25519 Signing via the `ed25519` Gem

Ed25519 is the EATP-mandated signature algorithm across all three SDKs; a different curve breaks cross-SDK verification. Use the `ed25519` gem.

```ruby
# frozen_string_literal: true
require "ed25519"

signing_key = Ed25519::SigningKey.generate
verify_key  = signing_key.verify_key

message   = JSON.generate(record.to_h)
signature = signing_key.sign(message)

# Verification raises Ed25519::VerifyError on mismatch (fail-closed)
verify_key.verify(signature, message)
```

HMAC is an optional integrity overlay only — it proves a holder of the shared key touched the message, NOT origin authenticity. HMAC alone is NEVER sufficient for external verification.

## Constant-Time Comparison — `OpenSSL.fixed_length_secure_compare`

Comparing an HMAC digest (or any secret) with `==` short-circuits on the first differing byte, leaking the digest one character at a time through a timing side-channel. Use OpenSSL's constant-time comparison instead.

```ruby
require "openssl"

# DO — constant-time, equal-length inputs
OpenSSL.fixed_length_secure_compare(stored_digest, computed_digest)

# DO NOT — short-circuits; timing side-channel
stored_digest == computed_digest
stored_digest != computed_digest
```

`fixed_length_secure_compare` raises `ArgumentError` if the two inputs differ in length — pre-hash both sides to a fixed-width digest (e.g. SHA-256) before comparing so length itself is never a signal. (`OpenSSL.secure_compare` exists for variable-length inputs but leaks length; prefer the fixed-length form on digests.)

## Key-Material Zeroing Under the Native Extension

Ruby strings are heap-allocated and GC-managed — a private key handed to the Rust layer persists in the Ruby heap until collected, surfacing in core dumps and heap inspections. After registering the key with the native key manager, overwrite the Ruby string in place and drop the reference.

```ruby
# frozen_string_literal: true

private_key = read_key_material   # mutable String (NOT a frozen literal)
key_mgr.register_key(key_id, private_key)   # native extension copies into Rust-owned memory

# Zero the Ruby-side copy in place, then release it
private_key.replace("\0" * private_key.bytesize)
private_key = nil
```

`String#replace` mutates the existing buffer (so the cleartext is overwritten where it lived), unlike reassignment which leaves the old buffer for the GC. The key material the native extension needs is already copied into Rust-owned memory by `register_key`; the Ruby-side string is now safe to clobber.

## Symlink-Safe Reads — `safe_read_json`

Bare `File.read` follows symlinks, letting an attacker redirect a trust-plane read to an arbitrary file outside the store directory. Route every record read through the locking helper, which refuses to follow symlinks.

```ruby
# DO — no-symlink-follow read
data = Kailash::Trust::Locking.safe_read_json(path)

# DO NOT — follows symlinks out of the store
data = JSON.parse(File.read(path))
```

Validate every externally-sourced record ID before composing a path, so `../../../etc/passwd` traversal cannot escape the store:

```ruby
Kailash::Trust::Locking.validate_id(record_id)
path = File.join(store_dir, "#{record_id}.json")
```

## Atomic Writes via `FileUtils`

A crash mid-`File.write` truncates the record, corrupting it with no recovery path. Write to a temp file, `fsync`, then atomically rename into place — the helper wraps this; the manual idiom is below for reference.

```ruby
require "fileutils"
require "tempfile"

# DO — atomic write through the trust-plane helper
Kailash::Trust::Locking.atomic_write(path, JSON.generate(record.to_h))

# Equivalent manual idiom (same-filesystem temp + atomic rename)
dir = File.dirname(path)
Tempfile.create("trust", dir) do |tmp|
  tmp.write(JSON.generate(record.to_h))
  tmp.flush
  tmp.fsync
  File.chmod(0o600, tmp.path)          # owner read/write only
  FileUtils.mv(tmp.path, path)         # atomic on the same filesystem
end
```

`File.chmod(0o600, ...)` keeps the record world-unreadable so decision records, HMAC keys, and governance state are not exposed to any local process. `FileUtils.mv` within one filesystem is a single `rename(2)` — the reader sees either the old file or the complete new file, never a half-written one.

## Fail-Closed Error Handling

Trust errors inherit from `Kailash::Trust::TrustError` and carry structured `#details`. Unknown or error states MUST deny — a permissive fallback turns every untested state into an access grant.

```ruby
# frozen_string_literal: true

class TrustError < Kailash::Error
  attr_reader :details

  def initialize(message, details: {})
    @details = details.dup.freeze
    super(message)
  end
end

def evaluate(ctx)
  cost = ctx.fetch("cost", 0.0).to_f
  return :blocked unless cost.finite? && cost >= 0   # NaN/negative → deny
  # ... decision logic ...
rescue Kailash::Trust::RecordNotFoundError => e
  logger.warn("trust record missing: #{e.message}")
  :blocked                                            # fail-closed, never silently permit
end
```

`Float::NAN < 0` and `Float::NAN > limit` both evaluate to `false` in Ruby, so a NaN cost silently passes every range check — guard numeric constraint fields with `.finite?` before any comparison. Rescue the specific `Kailash::Trust::RecordNotFoundError`, not bare `KeyError`, so an unrelated Hash-key miss is not masked as "record not found". Trust state escalates monotonically (`:auto_approved → :flagged → :held → :blocked`) and never downgrades — a downgrade path lets a compromised agent reset itself to `:auto_approved`.
