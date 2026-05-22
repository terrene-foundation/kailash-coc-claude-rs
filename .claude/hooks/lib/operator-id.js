/**
 * operator-id — identity resolver for multi-operator COC (shard A1).
 *
 * Architecture refs (workspaces/multi-operator-coc/02-plans/01-architecture.md):
 *   §2.1 — `display_id` / `verified_id` / `person_id`; resolveIdentity(cwd)
 *          returns all three.
 *   §6.1 — un-rostered key runs at L2_SUPERVISED, blocked into
 *          /whoami --register.
 *
 * The 3 invariants this module holds:
 *   1. resolveIdentity(cwd) 3-tier resolution
 *        (a) signing-key fingerprint (verified_id) discovery — from explicit
 *            opts.signingKeyPath, `git -C <repo> config user.signingkey`,
 *            or null on absence;
 *        (b) roster lookup — load .claude/operators.roster.json, find the
 *            persons[] entry whose keys[] fingerprint matches;
 *        (c) identity tuple — { verified_id, person_id, display_id, role,
 *            host_role, posture, blocked_into? }.
 *   2. Un-rostered key  → posture: L2_SUPERVISED, blocked_into:
 *      "/whoami --register".
 *      No signing key   → posture: L2_SUPERVISED, blocked_into:
 *      "configure signing key, then run /whoami --register".
 *   3. Cache layer at .claude/operator-id is HINT-ONLY:
 *      - present + valid + verified_id matches current fingerprint → use it
 *      - absent / corrupt / mismatched verified_id → re-derive AND rewrite
 *      Cache tampering is harmless because every call re-validates against
 *      the live signing-key fingerprint.
 *
 * Style: CommonJS to match sibling .claude/hooks/lib/* modules. No external
 * deps. Spawns ssh-keygen / git as subprocesses (the OS tools are the
 * canonical implementation; see coc-sign.js's "Own the Stack" rationale).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROSTER_REL = path.join(".claude", "operators.roster.json");
const CACHE_REL = path.join(".claude", "operator-id");
const L2_SUPERVISED = "L2_SUPERVISED";
const UNROSTERED_BLOCKED_INTO = "/whoami --register";
const NO_KEY_BLOCKED_INTO =
  "configure signing key, then run /whoami --register";

// ---- test-only counter (resetable; used by integration test) ----------------
let _deriveCount = 0;

// ---- helpers ----------------------------------------------------------------

function _readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return { ok: false, reason: "absent" };
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return { ok: false, reason: `read failed: ${err.message}` };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, reason: `parse failed: ${err.message}` };
  }
}

/**
 * Resolve the SSH key fingerprint via `ssh-keygen -lf <pubkey>` (canonical
 * Tier-2 invocation). Returns the SHA256:base64 token or null on any failure.
 * Matches coc-sign.js's SSH-substrate convention; GPG path uses the supplied
 * key identifier directly (the gpg key id IS the verified_id).
 */
function _fingerprintFromKey(keyPath, keyType) {
  if (!keyPath || typeof keyPath !== "string") return null;
  if (keyType === "gpg") {
    // For GPG the keyPath is a key identifier (uid/fingerprint/email) per
    // coc-sign.js's contract. The verified_id IS that identifier.
    return keyPath;
  }
  // SSH: derive fingerprint from the pubkey file. Accept either the
  // private-key path or the .pub path.
  const candidates = [];
  if (keyPath.endsWith(".pub")) {
    candidates.push(keyPath);
  } else {
    candidates.push(`${keyPath}.pub`, keyPath);
  }
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const r = spawnSync("ssh-keygen", ["-lf", candidate], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (r.status === 0) {
      const out = r.stdout.toString().trim();
      const parts = out.split(/\s+/);
      if (parts.length >= 2 && parts[1].startsWith("SHA256:")) {
        return parts[1];
      }
    }
  }
  return null;
}

/**
 * Discover the active signing key path. Order:
 *   1. Explicit opts.signingKeyPath (test-injected or caller-supplied).
 *   2. `git -C <repoDir> config user.signingkey` (unless opts.gitConfigSigningKey
 *      is explicitly null — test override to suppress ambient git config).
 * Returns { keyPath, keyType } or { keyPath: null }.
 */
function _discoverSigningKey(repoDir, opts) {
  // Explicit null in opts disables a tier (test determinism).
  if (Object.prototype.hasOwnProperty.call(opts, "signingKeyPath")) {
    if (opts.signingKeyPath === null) {
      // Caller explicitly disabled the explicit-path tier. Fall through to
      // git config unless that too is disabled.
    } else if (typeof opts.signingKeyPath === "string" && opts.signingKeyPath) {
      return { keyPath: opts.signingKeyPath, keyType: opts.keyType || "ssh" };
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(opts, "gitConfigSigningKey") &&
    opts.gitConfigSigningKey === null
  ) {
    return { keyPath: null };
  }
  // git -C <repoDir> config user.signingkey
  const r = spawnSync(
    "git",
    ["-C", repoDir, "config", "--get", "user.signingkey"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  if (r.status === 0) {
    const val = r.stdout.toString().trim();
    if (val) {
      // git's user.signingkey can be an SSH key path OR a GPG key id.
      // Heuristic: existence as a file → SSH; otherwise GPG.
      const exists = fs.existsSync(val) || fs.existsSync(`${val}.pub`);
      return { keyPath: val, keyType: exists ? "ssh" : "gpg" };
    }
  }
  return { keyPath: null };
}

/**
 * Search the roster for a persons[] entry whose keys[] include the given
 * fingerprint. Returns the person record + person_id, or null on miss.
 */
function _findPersonByFingerprint(roster, fingerprint) {
  if (!roster || typeof roster !== "object") return null;
  const persons = roster.persons || {};
  for (const personId of Object.keys(persons)) {
    const person = persons[personId];
    if (!person || !Array.isArray(person.keys)) continue;
    for (const key of person.keys) {
      if (key && key.fingerprint === fingerprint) {
        return { personId, person };
      }
    }
  }
  return null;
}

/**
 * Write the cache file. Best-effort; cache write failures NEVER fail the
 * resolver (the cache is hint-only).
 */
function _writeCache(cachePath, identity) {
  try {
    // M9.1 R3 Sec-R3-S-05 — cache writeback reduced to `verified_id` only.
    // Per the M9.1 R1 Sec-ID-1 reframe, authority fields (person_id /
    // role / host_role / display_id) are ALWAYS re-derived from the live
    // roster on read; storing them in the cache is dead-data on disk and
    // a non-zero forensic surface (a reader could be misled into thinking
    // authority WAS cached). The cache's sole purpose is the ssh-keygen
    // trust-anchor short-circuit, which only needs `verified_id`.
    const payload =
      JSON.stringify({
        verified_id: identity.verified_id,
      }) + "\n";
    // MED-2 (M0 security review): cache contains the verified_id
    // (signing-key fingerprint) — sensitive identity material. Restrict
    // to the file owner only.
    fs.writeFileSync(cachePath, payload, { mode: 0o600 });
  } catch {
    // best-effort
  }
}

// M9.1 R4 Sec-R4-S-03 — `_readCache` was removed as dead code. The M9.1
// R1 Sec-ID-1 reframe removed the cache fast-path (roster is ALWAYS
// re-walked for authority); no caller invokes `_readCache` post-fix.
// Dead authentication-adjacent functions invite future caller wiring
// that re-introduces the cache-poisoning class M5 iter-6's
// `readCache identity-guard` (per `journal/0131`) was designed to close.
// If a future fingerprint-only short-circuit becomes necessary, it MUST
// be re-introduced with explicit forensic review and a fresh
// authority-binding contract — never as a silent re-wire of dead code.

// ---- public API -------------------------------------------------------------

/**
 * Resolve the active operator's identity at `cwd`.
 *
 * Returns an identity object:
 *   { verified_id, person_id, display_id, role, host_role, posture?, blocked_into? }
 *
 * On the happy path (rostered key) posture is omitted (the caller / gate
 * layer applies repo_floor + per-operator posture — that's C1's job).
 * On the L2_SUPERVISED branches (un-rostered key, or no key configured)
 * posture: "L2_SUPERVISED" + blocked_into: <next action> are populated.
 *
 * @param {string} repoDir — repo root containing .claude/operators.roster.json
 * @param {object} [opts]
 *   - signingKeyPath {string|null}  explicit key path; null disables this tier
 *   - keyType {"ssh"|"gpg"}         default "ssh"
 *   - gitConfigSigningKey {null}    pass null to suppress ambient git config
 *
 * @returns {object}
 */
function resolveIdentity(repoDir, opts) {
  const o = opts || {};
  const cachePath = path.join(repoDir, CACHE_REL);
  const rosterPath = path.join(repoDir, ROSTER_REL);

  // ---- Tier 1: signing-key fingerprint discovery --------------------------
  const { keyPath, keyType } = _discoverSigningKey(repoDir, o);
  if (!keyPath) {
    // No signing key configured anywhere. L2_SUPERVISED + setup action.
    return {
      verified_id: null,
      person_id: null,
      display_id: null,
      role: null,
      host_role: null,
      posture: L2_SUPERVISED,
      blocked_into: NO_KEY_BLOCKED_INTO,
    };
  }
  const fingerprint = _fingerprintFromKey(keyPath, keyType);
  if (!fingerprint) {
    // Key was nominally configured but we could not derive a fingerprint
    // (file missing, ssh-keygen failed). Same disposition as "no key" —
    // the operator MUST repair their setup before participating.
    return {
      verified_id: null,
      person_id: null,
      display_id: null,
      role: null,
      host_role: null,
      posture: L2_SUPERVISED,
      blocked_into: NO_KEY_BLOCKED_INTO,
    };
  }

  // ---- Cache fast-path ----------------------------------------------------
  // M9.1 R1 Sec-ID-1 — the cache is the TRUST-ANCHOR cache only: it skips
  // the ssh-keygen subprocess when the cached verified_id matches the
  // live fingerprint. Authority (person_id / role / host_role) is ALWAYS
  // re-derived from the live roster, NEVER trusted from the cache. The
  // roster IS the authoritative binding per architecture §2.1; a cached
  // person_id/role binding can be stale (e.g., key revoked-then-rotated,
  // roster --depart removed the binding) and the cache MUST NOT restore
  // it on the next session. Fingerprint match = identity-key still
  // legitimate; roster walk = "what authority does this key currently
  // hold?"
  // ---- Tier 2: roster lookup (full re-derivation, ALWAYS) -----------------
  _deriveCount += 1;
  const rosterRead = _readJsonSafe(rosterPath);
  // A roster that is absent OR malformed counts as "no rostered persons" —
  // the key is un-rostered by definition. Surfaces L2_SUPERVISED so the
  // operator runs --register (which fixes the roster file too).
  const roster = rosterRead.ok ? rosterRead.value : null;
  const match = roster ? _findPersonByFingerprint(roster, fingerprint) : null;

  let identity;
  if (match) {
    identity = {
      verified_id: fingerprint,
      person_id: match.personId,
      display_id: match.person.display_id || null,
      role: match.person.role || null,
      host_role: match.person.host_role || null,
    };
  } else {
    identity = {
      verified_id: fingerprint,
      person_id: null,
      display_id: null,
      role: null,
      host_role: null,
      posture: L2_SUPERVISED,
      blocked_into: UNROSTERED_BLOCKED_INTO,
    };
  }

  // ---- Cache write-back (best-effort; failure does NOT fail the resolve) -
  _writeCache(cachePath, identity);

  return identity;
}

module.exports = {
  resolveIdentity,
  // Constants exposed for callers (e.g. whoami no-args command body that
  // reproduces the blocked_into text) and for downstream shards.
  L2_SUPERVISED,
  UNROSTERED_BLOCKED_INTO,
  NO_KEY_BLOCKED_INTO,
  // Test-only counters. NOT part of the supported API.
  _test_getDeriveCount: () => _deriveCount,
  _test_resetDeriveCount: () => {
    _deriveCount = 0;
  },
};
