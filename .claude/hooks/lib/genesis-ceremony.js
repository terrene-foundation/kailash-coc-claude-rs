/**
 * genesis-ceremony — the enrollment-ceremony state machine for shard A0b-2a.
 *
 * Architecture refs (workspaces/multi-operator-coc/02-plans/01-architecture.md):
 *   §2.3 — Genesis ceremony (R5-S-01 + R6-S-01; residual-bounded per journal/0117)
 *   §2.3 — Org-owned branch (R5-S-02)
 *   §2.2 — `genesis-anchor` record type
 *   §4.3 — `genesis-anchor-guard.js` row (this module is the ceremony, the guard
 *          is sibling .claude/hooks/genesis-anchor-guard.js — they coordinate)
 *   journal/0117 — co-owner-accepted genesis residual
 *
 * The 2 of 5 invariants this module holds (the other 3 are in
 * fold-genesis-anchor.js + genesis-anchor-guard.js):
 *
 *   (1) Enrollment ceremony — network-permitted, blocking, fail-CLOSED.
 *       Verifies (a) external owner == roster.genesis.repo_owner;
 *       (b) root_commit verification.verified == true with verified author
 *           == the repo-owner account;
 *       (c) roster declares exactly ONE `owner` person_id whose github_login
 *           resolves to that owner.
 *       If ANY of (a)/(b)/(c) fails OR network unavailable → fail-CLOSED.
 *       NO genesis-anchor record emitted on fail-CLOSED.
 *
 *   (2) Emit signed `genesis-anchor` record owner-bound — signed by the key
 *       whose github_login condition-(c) resolved to. Captures raw gh-api
 *       JSON for owner + root-commit verification (+ org-membership for
 *       repo_owner_kind=org) into the signed record content.
 *
 *   (5) Org-owned anchor variant (R5-S-02): when repo_owner_kind=org, ALSO
 *       verifies gh api orgs/{org}/memberships/{login} .role == "admin"
 *       AND captures it.
 *
 * Style: CommonJS, zero-dep. Network IO + signing IO are injected as
 * function parameters (ghApi, sign, transportAppend, now) so the module
 * is unit-testable without subprocess mocking.
 */

"use strict";

const cocSign = require("./coc-sign.js");
const ghApiAllowlist = require("./gh-api-allowlist.js");
const githubLogin = require("./github-login.js");
const { isUnenrolled } = require("./roster-schema-validate.js");

/**
 * Default sign function bound to coc-sign.js. Callers MAY override for
 * testing or to use a non-default key path. The signature returned is
 * a detached SSH or GPG signature over canonicalSerialize(record-without-sig).
 *
 * @param {Buffer} bytes - canonical-serialized record content
 * @param {object} opts - {keyType, keyPath, ...} per coc-sign.sign
 * @returns {{ok: boolean, sig?: string, error?: string, reason?: string}}
 */
function defaultSign(bytes, opts) {
  return cocSign.sign(bytes, opts);
}

/**
 * Validate the roster minimally for ceremony purposes. Returns null if OK
 * or a string error.
 */
function _validateRosterForCeremony(roster) {
  if (!roster || typeof roster !== "object") return "roster not an object";
  if (!roster.genesis || typeof roster.genesis !== "object")
    return "roster.genesis missing";
  const g = roster.genesis;
  if (typeof g.repo_owner !== "string" || !g.repo_owner)
    return "roster.genesis.repo_owner missing";
  if (g.repo_owner_kind !== "user" && g.repo_owner_kind !== "org") {
    return `roster.genesis.repo_owner_kind invalid: ${g.repo_owner_kind}`;
  }
  if (typeof g.root_commit !== "string" || !g.root_commit)
    return "roster.genesis.root_commit missing";
  if (!roster.persons || typeof roster.persons !== "object")
    return "roster.persons missing";
  return null;
}

/**
 * Resolve the genesis owner person_id in the roster. The roster MUST
 * declare EXACTLY ONE `owner` person_id whose github_login matches the
 * target (the repo_owner for kind=user, or the admin login for kind=org).
 *
 * Returns {ok: true, person_id, person} or {ok: false, reason}.
 *
 * PLACEHOLDER- person_ids are treated as unenrolled.
 */
function _resolveGenesisOwner(roster, targetLogin) {
  // F14 C2 iter-2 Q-MED-1: GitHub server semantics are case-insensitive on
  // logins. A strict `!==` allowed an attacker registering as "Alice" to
  // evade a lookup for "alice" (or vice versa). Same sibling-class as
  // PR #316 MED-4's gate-matrix + derive-n case-fold sweep.
  //
  // F14 C2 iter-3 SSOT consistency: route through githubLogin.loginsEqual
  // (was: hand-rolled String(...).toLowerCase() === ... — drifted from
  // sibling libs' approach). Adding a new normalization invariant
  // requires one edit (the helper) — not N edits across every site.
  const matches = [];
  for (const [pid, person] of Object.entries(roster.persons)) {
    if (isUnenrolled(pid)) continue;
    if (person.role !== "owner") continue;
    if (!githubLogin.loginsEqual(person.github_login, targetLogin)) continue;
    matches.push({ person_id: pid, person });
  }
  if (matches.length === 0) {
    return {
      ok: false,
      reason: `no genesis owner declared in roster: no person_id with role=owner has github_login=${targetLogin}`,
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      reason: `roster declares ${matches.length} owner person_ids with github_login=${targetLogin}; ceremony requires exactly one`,
    };
  }
  return {
    ok: true,
    person_id: matches[0].person_id,
    person: matches[0].person,
  };
}

/**
 * Find the signing key (by fingerprint) within the genesis-owner's keys.
 */
function _findSigningKey(person, fingerprint) {
  const keys = person.keys || [];
  for (const k of keys) {
    if (k.fingerprint === fingerprint) return k;
  }
  return null;
}

/**
 * Run the genesis enrollment ceremony.
 *
 * @param {object} opts
 * @param {object} opts.roster                 - parsed roster JSON
 * @param {{owner: string, name: string}} opts.repo - repo identification for gh api
 * @param {string} opts.signingKeyPath         - path to the SSH/GPG signing key
 * @param {string} opts.signingKeyFingerprint  - the verified_id (fingerprint) of the key
 * @param {function} opts.ghApi                - (endpoint: string) => {ok, status, body, error?}
 *                                                The ONLY mocked surface in tests; in production
 *                                                this is a wrapper around `gh api <endpoint>`.
 * @param {function} opts.transportAppend      - (record: object) => {ok, error?}
 *                                                Appends the signed record to the coordination log.
 * @param {function} [opts.now]                - () => ISO-8601 string; defaults to wall clock
 * @param {function} [opts.sign]               - override for coc-sign.sign; defaults to defaultSign
 * @param {"ssh"|"gpg"} [opts.keyType]         - signing key type; default "ssh"
 *
 * @returns {{ok: true, record: object} |
 *           {ok: false, error: string, reason: string, step: string}}
 *
 * Steps (each can fail-CLOSED):
 *   1. Roster shape sanity (pre-flight; not yet condition (c)).
 *   2. gh api repos/{owner}/{repo} → capture external owner, compare to
 *      roster.genesis.repo_owner (R5-S-01 condition (a) / R4-S-03).
 *   3. (org variant only) gh api orgs/{org}/memberships/{adminLogin} → role
 *      MUST be "admin"; the adminLogin is the github_login the signing
 *      person_id maps to. We pre-resolve it from the signing fingerprint.
 *   4. gh api repos/{owner}/{repo}/commits/{root_commit} → verification.verified
 *      MUST be true AND verified author MUST be the repo-owner account
 *      (R5-S-01 condition (b)).
 *   5. Resolve the genesis owner in the roster (condition (c)); the signing
 *      key MUST match that owner's declared keys.
 *   6. Build the canonical record content, sign, append. NO record is
 *      emitted on any prior failure.
 */
function runEnrollmentCeremony(opts) {
  const o = opts || {};
  const {
    roster,
    repo,
    signingKeyPath,
    signingKeyFingerprint,
    ghApi,
    transportAppend,
  } = o;
  const now = o.now || (() => new Date().toISOString());
  const sign = o.sign || defaultSign;
  const keyType = o.keyType || "ssh";

  // Step 1: roster pre-flight
  const rosterErr = _validateRosterForCeremony(roster);
  if (rosterErr) {
    return {
      ok: false,
      error: "roster invalid",
      reason: rosterErr,
      step: "1-roster-preflight",
    };
  }
  if (!repo || typeof repo !== "object" || !repo.owner || !repo.name) {
    return {
      ok: false,
      error: "repo identification missing",
      reason: "opts.repo MUST be {owner, name}",
      step: "1-roster-preflight",
    };
  }
  // HIGH-3 (M0 security review): validate endpoint inputs BEFORE
  // interpolation. Prevents path traversal / shell metachars / URL query
  // injection from contaminating the gh-api endpoint string.
  const repoOwnerValid = githubLogin.validateGithubLogin(repo.owner);
  if (!repoOwnerValid.valid) {
    return {
      ok: false,
      error: "repo.owner invalid",
      reason: `repo.owner ${repoOwnerValid.reason}`,
      step: "1-roster-preflight",
    };
  }
  const repoNameValid = githubLogin.validateGithubRepoName(repo.name);
  if (!repoNameValid.valid) {
    return {
      ok: false,
      error: "repo.name invalid",
      reason: `repo.name ${repoNameValid.reason}`,
      step: "1-roster-preflight",
    };
  }
  // Same validation for the roster-declared owner (used in endpoint
  // construction at step 3 + comparison at step 2).
  if (!roster.genesis || typeof roster.genesis.repo_owner !== "string") {
    // already caught by _validateRosterForCeremony above; defensive guard.
    return {
      ok: false,
      error: "roster.genesis.repo_owner missing",
      reason: "defensive: roster.genesis.repo_owner not a string",
      step: "1-roster-preflight",
    };
  }
  const declaredOwnerValid = githubLogin.validateGithubLogin(
    roster.genesis.repo_owner,
  );
  if (!declaredOwnerValid.valid) {
    return {
      ok: false,
      error: "roster.genesis.repo_owner invalid",
      reason: `roster.genesis.repo_owner ${declaredOwnerValid.reason}`,
      step: "1-roster-preflight",
    };
  }
  if (!signingKeyPath || !signingKeyFingerprint) {
    return {
      ok: false,
      error: "signing key not configured",
      reason:
        "opts.signingKeyPath + opts.signingKeyFingerprint are required (zero-tolerance.md Rule 3 — no silent fallback)",
      step: "1-roster-preflight",
    };
  }
  if (typeof ghApi !== "function") {
    return {
      ok: false,
      error: "ghApi callable missing",
      reason: "opts.ghApi must be a function (endpoint) => {ok,status,body}",
      step: "1-roster-preflight",
    };
  }
  if (typeof transportAppend !== "function") {
    return {
      ok: false,
      error: "transportAppend callable missing",
      reason: "opts.transportAppend must be a function (record) => {ok}",
      step: "1-roster-preflight",
    };
  }

  const repoOwnerKind = roster.genesis.repo_owner_kind;
  const declaredOwner = roster.genesis.repo_owner;
  const declaredRoot = roster.genesis.root_commit;

  // Step 2: gh api repos/{owner}/{repo} → external owner check
  let ownerCapture;
  try {
    const r = ghApi(`repos/${repo.owner}/${repo.name}`);
    if (!r || !r.ok) {
      return {
        ok: false,
        error: "gh api repos call failed",
        reason: `gh api repos/${repo.owner}/${repo.name} → status ${r && r.status} body ${JSON.stringify(r && r.body)}`,
        step: "2-gh-api-owner",
      };
    }
    if (!r.body || !r.body.owner || typeof r.body.owner.login !== "string") {
      return {
        ok: false,
        error: "gh api repos response malformed",
        reason: `expected body.owner.login; got ${JSON.stringify(r.body)}`,
        step: "2-gh-api-owner",
      };
    }
    const externalOwner = r.body.owner.login;
    // F14 C2 iter-4 HIGH-R4-1: route through loginsEqual (was strict
    // `!==`). GitHub server-side login semantics are case-INSENSITIVE
    // (same root cause as iter-2 Q-MED-1 + iter-3 SSOT sweep). A roster
    // declaring "alice" with gh-api returning "Alice" is the SAME
    // identity; strict `!==` aborts the ceremony → trust root never
    // establishes → all downstream guards hard-block. Same bug class
    // as fold-genesis-anchor.js step (the iter-3 fix); iter-4 closes
    // the local-var-assigned variant.
    if (!githubLogin.loginsEqual(externalOwner, declaredOwner)) {
      return {
        ok: false,
        error: "owner_mismatch",
        reason: `gh api owner mismatch: roster declares '${declaredOwner}', gh api returned '${externalOwner}' (R5-S-01 condition (a) / R4-S-03)`,
        step: "2-gh-api-owner",
      };
    }
    // HIGH-1 (M0 security review): allowlist response capture. Drops
    // description / homepage / billing_email / private / etc. that
    // would otherwise become permanent in signed records.
    // M3 HIGH-4 / F-7: capture_ts anchored to capture moment for downstream
    // freshness predicate (fold-rule-9c).
    ownerCapture = ghApiAllowlist._allowlistRepoOwner(r.body, {
      capture_ts: new Date().toISOString(),
    });
  } catch (err) {
    return {
      ok: false,
      error: "gh api repos call threw",
      reason: `network unavailable or ghApi threw: ${err && err.message ? err.message : String(err)}`,
      step: "2-gh-api-owner",
    };
  }

  // Step 3-pre: pre-resolve the genesis owner person from the roster so we
  // know the github_login to use for org admin check + the signing key bind.
  // For repo_owner_kind=user, the target login is declaredOwner.
  // For repo_owner_kind=org, the target login is the admin login — but we
  // can't know it without looking up which person_id's signing key matches
  // the fingerprint. So we first find the person whose key matches, then
  // verify they are owner-role AND (for org) their github_login is admin.
  let signingPerson = null;
  let signingPersonId = null;
  for (const [pid, person] of Object.entries(roster.persons)) {
    if (isUnenrolled(pid)) continue;
    if (_findSigningKey(person, signingKeyFingerprint)) {
      signingPerson = person;
      signingPersonId = pid;
      break;
    }
  }
  if (!signingPerson) {
    return {
      ok: false,
      error: "signing key not in roster",
      reason: `signing key fingerprint ${signingKeyFingerprint} does not match any non-PLACEHOLDER person_id in the roster`,
      step: "3-signing-key-bind",
    };
  }
  if (signingPerson.role !== "owner") {
    return {
      ok: false,
      error: "signing key not owner-role",
      reason: `signing key resolves to person_id ${signingPersonId} with role=${signingPerson.role}; only role=owner may sign genesis-anchor`,
      step: "3-signing-key-bind",
    };
  }

  // Step 3: org-owned variant — admin-membership check
  let orgMembershipCapture = null;
  if (repoOwnerKind === "org") {
    const adminLogin = signingPerson.github_login;
    // HIGH-3 (M0 security review): validate adminLogin BEFORE interpolation.
    const adminValid = githubLogin.validateGithubLogin(adminLogin);
    if (!adminValid.valid) {
      return {
        ok: false,
        error: "signing person's github_login invalid",
        reason: `signing person.github_login ${adminValid.reason}`,
        step: "3-org-admin",
      };
    }
    try {
      const r = ghApi(`orgs/${declaredOwner}/memberships/${adminLogin}`);
      if (!r || !r.ok) {
        return {
          ok: false,
          error: "org membership check failed",
          reason: `gh api orgs/${declaredOwner}/memberships/${adminLogin} → status ${r && r.status} body ${JSON.stringify(r && r.body)}`,
          step: "3-org-admin",
        };
      }
      if (!r.body || r.body.role !== "admin") {
        return {
          ok: false,
          error: "not an org admin",
          reason: `gh api orgs/${declaredOwner}/memberships/${adminLogin} role is '${r.body && r.body.role}', not 'admin' (R5-S-02)`,
          step: "3-org-admin",
        };
      }
      // HIGH-1: allowlist org-membership capture.
      // M3 HIGH-4: anchor capture_ts.
      orgMembershipCapture = ghApiAllowlist._allowlistOrgMembership(r.body, {
        capture_ts: new Date().toISOString(),
      });
    } catch (err) {
      return {
        ok: false,
        error: "org membership call threw",
        reason: `network unavailable or ghApi threw: ${err && err.message ? err.message : String(err)}`,
        step: "3-org-admin",
      };
    }
  }

  // Step 4: gh api commits/{root_commit} → verification.verified == true
  // + verified author == repo-owner account.
  let rootCommitCapture;
  try {
    const r = ghApi(`repos/${repo.owner}/${repo.name}/commits/${declaredRoot}`);
    if (!r || !r.ok) {
      return {
        ok: false,
        error: "gh api root-commit call failed",
        reason: `gh api commits/${declaredRoot} → status ${r && r.status} body ${JSON.stringify(r && r.body)}`,
        step: "4-root-commit",
      };
    }
    const body = r.body || {};
    const commit = body.commit || {};
    const verification = commit.verification || {};
    if (verification.verified !== true) {
      return {
        ok: false,
        error: "root_commit verification unverified",
        reason: `gh api commits/${declaredRoot} .commit.verification.verified is ${verification.verified} (reason: ${verification.reason}); R5-S-01 condition (b) requires verified=true`,
        step: "4-root-commit",
      };
    }
    // For repo_owner_kind=user we require commit.author or verification to
    // be associated with the declared owner. For org-owned we accept the
    // verified flag + the org-admin signer.
    if (repoOwnerKind === "user") {
      const authorName = commit.author && commit.author.name;
      const authorLogin = body.author && body.author.login;
      // F14 C2 iter-4 HIGH-R4-1: route through loginsEqual (was strict
      // `===`). Same case-insensitive identity invariant as Step 2 above:
      // root-commit author "Alice" / "alice" / "ALICE" are the same
      // GitHub account. Strict `===` would abort the ceremony when the
      // user's gh-api capture casing differs from the roster's
      // repo_owner casing — even though the underlying identity is
      // identical. authorName is checked the same way (the Name field
      // is conventionally a display name but GitHub returns the login
      // for accounts without a display name, so the same case-sensitivity
      // applies).
      const matches =
        githubLogin.loginsEqual(authorLogin, declaredOwner) ||
        githubLogin.loginsEqual(authorName, declaredOwner);
      if (!matches) {
        return {
          ok: false,
          error: "root_commit verified author mismatch",
          reason: `verified author (login=${authorLogin}, name=${authorName}) is not the declared owner '${declaredOwner}'`,
          step: "4-root-commit",
        };
      }
    }
    // HIGH-1: allowlist commit-verification capture.
    // M3 HIGH-4: anchor capture_ts.
    rootCommitCapture = ghApiAllowlist._allowlistCommitVerification(body, {
      capture_ts: new Date().toISOString(),
    });
  } catch (err) {
    return {
      ok: false,
      error: "gh api commits call threw",
      reason: `network unavailable or ghApi threw: ${err && err.message ? err.message : String(err)}`,
      step: "4-root-commit",
    };
  }

  // Step 5: resolve genesis owner (condition (c)) — exactly ONE owner in
  // roster whose github_login is the target.
  const targetLogin =
    repoOwnerKind === "user" ? declaredOwner : signingPerson.github_login;
  const ownerResolution = _resolveGenesisOwner(roster, targetLogin);
  if (!ownerResolution.ok) {
    return {
      ok: false,
      error: "no genesis owner declared",
      reason: ownerResolution.reason,
      step: "5-condition-c",
    };
  }
  // The signing person_id MUST match the resolved genesis-owner person_id.
  if (ownerResolution.person_id !== signingPersonId) {
    return {
      ok: false,
      error: "signing key not the resolved genesis owner",
      reason: `signing fingerprint maps to ${signingPersonId}; condition-(c)-resolved genesis owner is ${ownerResolution.person_id}`,
      step: "5-condition-c",
    };
  }

  // Step 6: build, sign, append. The record core is canonical-serialized
  // and signed; the resulting record carries the detached signature.
  const content = {
    genesis: {
      repo_owner: declaredOwner,
      repo_owner_kind: repoOwnerKind,
      root_commit: declaredRoot,
      genesis_generation: roster.genesis.genesis_generation || 0,
    },
    gh_api_owner_capture: ownerCapture,
    gh_api_root_commit_capture: rootCommitCapture,
  };
  if (orgMembershipCapture) {
    content.gh_api_org_membership_capture = orgMembershipCapture;
  }
  const recordCore = {
    type: "genesis-anchor",
    verified_id: signingKeyFingerprint,
    person_id: signingPersonId,
    seq: 0,
    prev_hash: null,
    ts: now(),
    content,
  };

  let bytes;
  try {
    bytes = cocSign.canonicalSerialize(recordCore);
  } catch (err) {
    return {
      ok: false,
      error: "canonicalSerialize threw",
      reason: err && err.message ? err.message : String(err),
      step: "6-serialize",
    };
  }

  const signResult = sign(bytes, { keyType, keyPath: signingKeyPath });
  if (!signResult || !signResult.ok) {
    return {
      ok: false,
      error: signResult && signResult.error ? signResult.error : "sign failed",
      reason: signResult && signResult.reason ? signResult.reason : "unknown",
      step: "6-sign",
    };
  }
  const record = { ...recordCore, sig: signResult.sig };

  const appendResult = transportAppend(record);
  if (!appendResult || !appendResult.ok) {
    return {
      ok: false,
      error: "transport append failed",
      reason:
        appendResult && appendResult.error
          ? appendResult.error
          : "unknown transport append error",
      step: "6-append",
    };
  }

  return { ok: true, record };
}

module.exports = {
  runEnrollmentCeremony,
  _internal: {
    _validateRosterForCeremony,
    _resolveGenesisOwner,
    _findSigningKey,
  },
};
