/**
 * fold-rule-9c — genesis-migration fold predicate.
 *
 * Shard A3 (workspaces/multi-operator-coc, design v11 §2.2 rule 9c +
 * R6-S-04 + R6-S-06).
 *
 * A `genesis-migration` record folds ONLY when ALL of the following
 * hold:
 *
 *   1. 2-of-N owner-co-signed — the primary signer plus at least one
 *      DISTINCT co-signer in content.co_signers, each resolving to an
 *      owner-role roster person. R6-S-04: degenerate self-sign is
 *      BLOCKED even under genuine genesis N=1 — a migration is the
 *      single most consequential event in the substrate's lifetime and
 *      MUST carry two distinct owner signatures. Genuine N=1 means the
 *      migration cannot proceed until a second owner is enrolled.
 *
 *   2. Carries a fresh `gh api repos/{owner}/{repo}` external-owner
 *      capture at content.gh_api_repo_owner_capture, validated via the
 *      gh-api-allowlist shape. The capture's owner.login MUST equal
 *      content.new_repo_owner — otherwise the capture is stale or
 *      forged and the migration is rejected.
 *
 *   3. Monotonically increments genesis_generation
 *      (content.to_genesis_generation > content.from_genesis_generation).
 *
 *   4. R6-S-06 latest-wins supersession — a verifying genesis-migration
 *      supersedes any prior trust root by rebasing foldState.trustRoot
 *      to the migration's post-migration anchor binding:
 *         repo_owner       = content.new_repo_owner
 *         repo_owner_kind  = content.new_repo_owner_kind
 *         genesis_generation = content.to_genesis_generation
 *
 * Style: CommonJS, zero-dep, matches sibling fold-genesis-anchor.js
 * shape. Consumes the engine dispatch ctx
 * ({ foldState, roster, acceptedSoFar }) and returns
 * { accepted, foldState, reason? } per coordination-log.js::_foldLog.
 */

"use strict";

const { canonicalSerialize, verify: cocVerify } = require("./coc-sign.js");
const {
  _allowlistRepoOwner,
  _isCaptureFresh,
  _verifyDistinctBoundCollaborators,
} = require("./gh-api-allowlist.js");
// F14 MED-3: route inline R5-S-04 (host_role:ci) + role checks through
// the single eligibility predicate so drift across rule 5 / 9b / 9c is
// closed structurally.
const { isEligibleSigner } = require("./eligibility.js");
// F14 C2 iter-3: case-insensitive owner-bind compare per GitHub server semantics.
const { loginsEqual } = require("./github-login.js");

/**
 * Resolve a verified_id to its roster person (if any).
 */
function _resolveRosterPerson(roster, verifiedId) {
  if (!roster || !roster.persons) return null;
  for (const [pid, person] of Object.entries(roster.persons)) {
    const keys = (person && person.keys) || [];
    for (const k of keys) {
      if (k && k.fingerprint === verifiedId) {
        return { person_id: pid, person };
      }
    }
  }
  return null;
}

/**
 * Re-derive the canonical bytes a co-signer covered. Same convention as
 * fold-rule-9b._coSignedBytes: each cosig is over the record core with
 * content.co_signers REMOVED.
 */
function _coSignedBytes(record) {
  const { sig, ...core } = record;
  const c = core.content || {};
  const { co_signers, ...contentForCoSig } = c;
  const baseForCoSig = Object.assign({}, core, { content: contentForCoSig });
  return canonicalSerialize(baseForCoSig);
}

/**
 * Verify a single co-signer entry. Same shape as fold-rule-9b
 * (owner-role, host_role != "ci", pubkey-bound, signature verifies).
 */
function _verifyCoSigner(coSigner, record, roster) {
  if (!coSigner || typeof coSigner !== "object") {
    return { ok: false, reason: "co_signer entry not an object" };
  }
  if (typeof coSigner.verified_id !== "string" || !coSigner.verified_id) {
    return { ok: false, reason: "co_signer missing verified_id" };
  }
  if (typeof coSigner.sig !== "string" || !coSigner.sig) {
    return { ok: false, reason: "co_signer missing sig" };
  }
  const resolved = _resolveRosterPerson(roster, coSigner.verified_id);
  if (!resolved) {
    return {
      ok: false,
      reason: `co_signer verified_id ${coSigner.verified_id} not in roster`,
    };
  }
  // F14 MED-3: route through isEligibleSigner. genesis-migration is the
  // "migration" context per eligibility.js::CI_FOREVER_INELIGIBLE_CONTEXTS
  // — owner-role required AND host_role!=ci enforced with one audit
  // surface across rule 5 / 9b / 9c.
  const elig = isEligibleSigner(resolved.person, "migration");
  if (!elig.eligible) {
    return {
      ok: false,
      reason: `co_signer ${coSigner.verified_id} ineligible: ${elig.reason}`,
    };
  }
  const matchingKey = (resolved.person.keys || []).find(
    (k) => k.fingerprint === coSigner.verified_id,
  );
  if (!matchingKey) {
    return {
      ok: false,
      reason: `co_signer ${coSigner.verified_id} has no roster pubkey match`,
    };
  }
  const bytes = _coSignedBytes(record);
  let r;
  try {
    r = cocVerify(bytes, coSigner.sig, matchingKey.pubkey, {
      keyType: matchingKey.type,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `co_signer verify threw: ${err && err.message ? err.message : String(err)}`,
    };
  }
  if (!r || !r.ok) {
    return {
      ok: false,
      reason: `co_signer verify failed: ${r && r.reason ? r.reason : "unknown"}`,
    };
  }
  if (!r.valid) {
    return {
      ok: false,
      reason: `co_signer signature did not verify: ${r.reason || "invalid"}`,
    };
  }
  return { ok: true };
}

/**
 * Fold a candidate genesis-migration record.
 */
function foldGenesisMigration(record, ctx) {
  const state = (ctx && ctx.foldState) || { trustRoot: null };
  const roster = ctx && ctx.roster;

  // --- shape ---
  if (!record || typeof record !== "object") {
    return {
      accepted: false,
      foldState: state,
      reason: "record not an object",
    };
  }
  if (record.type !== "genesis-migration") {
    return {
      accepted: false,
      foldState: state,
      reason: `record.type != 'genesis-migration' (got: ${record.type})`,
    };
  }
  const c = record.content;
  if (!c || typeof c !== "object") {
    return { accepted: false, foldState: state, reason: "content missing" };
  }

  // --- field presence: new_repo_owner ---
  if (typeof c.new_repo_owner !== "string" || !c.new_repo_owner) {
    return {
      accepted: false,
      foldState: state,
      reason: "rule 9c: missing required field new_repo_owner",
    };
  }
  if (c.new_repo_owner_kind !== "user" && c.new_repo_owner_kind !== "org") {
    return {
      accepted: false,
      foldState: state,
      reason: `rule 9c: new_repo_owner_kind invalid: ${c.new_repo_owner_kind}`,
    };
  }

  // --- monotonic genesis_generation ---
  if (
    typeof c.from_genesis_generation !== "number" ||
    typeof c.to_genesis_generation !== "number" ||
    !Number.isInteger(c.from_genesis_generation) ||
    !Number.isInteger(c.to_genesis_generation)
  ) {
    return {
      accepted: false,
      foldState: state,
      reason: "rule 9c: from/to_genesis_generation must be integers",
    };
  }
  if (c.to_genesis_generation <= c.from_genesis_generation) {
    return {
      accepted: false,
      foldState: state,
      reason: `rule 9c: genesis_generation must increment monotonically (from=${c.from_genesis_generation}, to=${c.to_genesis_generation})`,
    };
  }

  // --- R6-S-04: 2-of-N co-sign requirement (no degenerate self-sign) ---
  if (!Array.isArray(c.co_signers) || c.co_signers.length === 0) {
    return {
      accepted: false,
      foldState: state,
      reason:
        "rule 9c: R6-S-04 — degenerate self-sign BLOCKED; 2-of-N owner co-signature required even under genuine genesis N=1. Migration cannot proceed until a second distinct owner is enrolled.",
    };
  }
  const distinctSigners = new Set([record.verified_id]);
  for (const co of c.co_signers) {
    const v = _verifyCoSigner(co, record, roster);
    if (!v.ok) {
      return {
        accepted: false,
        foldState: state,
        reason: `rule 9c: co-sign verification failed: ${v.reason}`,
      };
    }
    if (distinctSigners.has(co.verified_id)) {
      return {
        accepted: false,
        foldState: state,
        reason: `rule 9c: R6-S-04 — co_signer verified_id ${co.verified_id} not distinct from prior signer; degenerate self-sign rejected`,
      };
    }
    distinctSigners.add(co.verified_id);
  }
  if (distinctSigners.size < 2) {
    return {
      accepted: false,
      foldState: state,
      reason: `rule 9c: R6-S-04 — 2-of-N owner co-signature required; only ${distinctSigners.size} distinct signer(s)`,
    };
  }

  // --- fresh gh-api repo_owner capture ---
  const rawCapture = c.gh_api_repo_owner_capture;
  if (!rawCapture || typeof rawCapture !== "object") {
    return {
      accepted: false,
      foldState: state,
      reason:
        "rule 9c: missing required field gh_api_repo_owner_capture (fresh external-owner read)",
    };
  }
  // M3 HIGH-4 / F-7: capture_ts MUST be present on the raw capture (the
  // ceremony writer populates it). The allowlist re-derives it on output
  // but we validate the INPUT has it so replays of capture-less captures
  // are caught loudly.
  if (typeof rawCapture.capture_ts !== "string" || !rawCapture.capture_ts) {
    return {
      accepted: false,
      foldState: state,
      reason:
        "rule 9c: gh_api_repo_owner_capture missing required field capture_ts (HIGH-4: replay defense requires anchor)",
    };
  }
  // Run through the allowlist to validate shape AND strip unsupported fields.
  // Pass the raw capture's capture_ts through so the allowlist re-emits it
  // (the allowlist defaults to now() if no capture_ts is supplied; for
  // verification we want the BYTES the signer covered).
  const capture = _allowlistRepoOwner(rawCapture, {
    capture_ts: rawCapture.capture_ts,
  });
  if (!capture || !capture.owner || typeof capture.owner.login !== "string") {
    return {
      accepted: false,
      foldState: state,
      reason:
        "rule 9c: gh_api_repo_owner_capture malformed (owner.login missing after allowlist)",
    };
  }
  if (!loginsEqual(capture.owner.login, c.new_repo_owner)) {
    return {
      accepted: false,
      foldState: state,
      reason: `rule 9c: stale gh_api_repo_owner_capture — owner.login (${capture.owner.login}) does not match new_repo_owner (${c.new_repo_owner}); capture is stale or forged`,
    };
  }
  // M3 HIGH-4 / F-7: freshness predicate against record ts.
  const freshness = _isCaptureFresh(capture.capture_ts, record.ts);
  if (!freshness.fresh) {
    return {
      accepted: false,
      foldState: state,
      reason: `rule 9c: stale capture per freshness predicate: ${freshness.reason}`,
    };
  }

  // --- R6-S-06 latest-wins supersession — rebase trust root ---
  const newTrustRoot = {
    verified_id: record.verified_id,
    person_id: record.person_id,
    seq: record.seq,
    ts: record.ts,
    pinnedFacts: {
      repo_owner: c.new_repo_owner,
      repo_owner_kind: c.new_repo_owner_kind,
      // root_commit carries over from the prior trust root; migration
      // does not change the root commit. Inherit if available.
      root_commit:
        state.trustRoot && state.trustRoot.pinnedFacts
          ? state.trustRoot.pinnedFacts.root_commit
          : null,
    },
    genesis_generation: c.to_genesis_generation,
  };

  const newState = Object.assign({}, state, {
    trustRoot: newTrustRoot,
    genesis_generation: c.to_genesis_generation,
  });

  return { accepted: true, foldState: newState };
}

module.exports = {
  foldGenesisMigration,
  _internal: {
    _resolveRosterPerson,
    _coSignedBytes,
    _verifyCoSigner,
  },
};
