#!/usr/bin/env node
// Audit fixtures for .claude/bin/lib/strip-build-internal.mjs.
//
// Per rules/cc-artifacts.md Rule 9, every mechanical audit tool MUST
// ship with at least one committed fixture per scope-restriction
// predicate. This runner exercises:
//   (a) the helper's built-in self-test (inline fixtures; count asserted
//       by the helper itself — see SELF_TEST_FIXTURES)
//   (b) external-file fixtures that real /sync emissions would hit,
//       so a future refactor that drops in-source fixtures still has
//       a separate audit trail on disk.
//   (c) idempotence over a DISCOVERED corpus, with a non-vacuity floor.
//   (d) the repo-class scope restriction on the workspace-name derivation.
//
// Exits non-zero on any failure.
//
// OPTIONAL: `--module <abs-path>` points ONLY the section-4 scoping probe at a
// different copy of the helper. Sections 1–3 always exercise this repo's helper.
// It exists so the section-4 red/green poles can be run on the SAME harness
// against a pre-fix and post-fix helper; it is not used by any automated caller.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  stripBuildInternalReferences,
} from "../../bin/lib/strip-build-internal.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

let failures = 0;
function check(name, cond, detail = "") {
  const tag = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`${tag}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 1. Run the helper's inline self-test as a sub-process to assert
//      the canonical pattern set still passes — failure here means
//      a code change broke one of the codified Phase-4 patterns.
import { spawnSync } from "node:child_process";
const helperPath = path.resolve(
  __dirname,
  "..",
  "..",
  "bin",
  "lib",
  "strip-build-internal.mjs",
);
const selftest = spawnSync("node", [helperPath, "--selftest"], {
  encoding: "utf8",
});
check(
  "helper --selftest exits 0",
  selftest.status === 0,
  selftest.stdout.trim(),
);

// ── 2. External-file fixtures: each fixture-NN-<name>.md has a
//      sibling .expected file containing the post-strip content.
const fixturesDir = __dirname;
const inputs = fs
  .readdirSync(fixturesDir)
  .filter((f) => /^fixture-\d{2}-.*\.md$/.test(f))
  .sort();

for (const fn of inputs) {
  const inputPath = path.join(fixturesDir, fn);
  const expectedPath = inputPath.replace(/\.md$/, ".expected");
  if (!fs.existsSync(expectedPath)) {
    check(`fixture ${fn} has .expected sibling`, false);
    continue;
  }
  const input = fs.readFileSync(inputPath, "utf8");
  const expected = fs.readFileSync(expectedPath, "utf8");
  const { stripped } = stripBuildInternalReferences(input);
  check(`fixture ${fn}`, stripped === expected, stripped === expected ? "" : `mismatch (len in=${input.length} expected=${expected.length} actual=${stripped.length})`);
}

// ── 3. Idempotence check: running the strip twice on a real source
//      file produces the same result as running it once. This is the
//      structural invariant that makes the helper safe to wire into
//      composeArtifactBody without worrying about double-emission.
//
//      The sample corpus is DISCOVERED from the tracked tree, not hardcoded.
//      The previous version read ONE fixed path
//      (`.claude/agents/management/coc-sync.md`). That path still resolves HERE,
//      but the assertion's worth depended on that one file happening to contain
//      strippable content — an unpinned accident, and a path that is simply
//      absent in the repos this helper also ships to.
//
//      It also asserts NON-VACUITY: idempotence over content the strip does not
//      touch is trivially true and proves nothing, so the check requires at
//      least one file the strip actually rewrites, and fails loudly at zero.
const corpusFiles = execFileSync(
  "git",
  ["ls-files", ".claude/rules", ".claude/agents", ".claude/commands", ".claude/skills"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\n")
  .filter((f) => f.endsWith(".md"));

// The shipped fixture inputs are ALWAYS part of the sample. They contain
// strippable content by construction — that is what makes them fixtures — so
// the non-vacuity floor is structural rather than dependent on the live corpus
// happening to carry loom-internal references. Without this anchor, a repo
// whose corpus had been thoroughly cleaned would rewrite zero files and the
// suite would go red for being "vacuous" when nothing was actually wrong.
// Live corpus files are additional, real-world coverage on top.
const fixtureInputs = inputs.map((fn) =>
  path.relative(repoRoot, path.join(fixturesDir, fn)),
);
const idempotenceSample = [...fixtureInputs, ...corpusFiles];

let stripRewrote = 0;
const idempotenceBreaks = [];
for (const rel of idempotenceSample) {
  let source;
  try {
    source = fs.readFileSync(path.join(repoRoot, rel), "utf8");
  } catch {
    continue; // listed but unreadable (e.g. a deleted-but-staged path)
  }
  const once = stripBuildInternalReferences(source).stripped;
  if (once === source) continue; // strip is a no-op here; proves nothing
  stripRewrote++;
  const twice = stripBuildInternalReferences(once).stripped;
  if (once !== twice) idempotenceBreaks.push(rel);
}

check(
  "idempotence sample is non-vacuous (>=1 file the strip rewrites)",
  stripRewrote > 0,
  stripRewrote > 0
    ? `${stripRewrote} file(s)`
    : "the strip rewrote NOTHING — not even the shipped fixture inputs, which " +
      "contain strippable content by construction. The strip itself is broken.",
);
check(
  `idempotent over ${stripRewrote} rewritten corpus file(s)`,
  idempotenceBreaks.length === 0,
  idempotenceBreaks.length === 0 ? "" : `not idempotent on: ${idempotenceBreaks.join(", ")}`,
);

// ── 4. Repo-class scope restriction on the workspace-name derivation.
//
//      This helper SHIPS: `.claude/bin/lib/strip-build-internal.mjs` resolves
//      `action: copy, reason: always_include` on the py / rs / base lanes, so it
//      executes at BUILD repos and downstream consumers, not only at loom.
//      Deriving the loom-workspace name set from the live `workspaces/` dir is
//      only meaningful AT LOOM (type `coc-source`). Anywhere else that directory
//      holds the CONSUMER's own workspaces.
//
//      The two failure identities this pins, both observed on the pre-fix helper:
//        CANONICAL-UNDERSTRIP — a canonical loom workspace name STOPPED stripping
//                               at a non-loom repo (the derived set REPLACED the
//                               canonical one), so loom-internal paths leak.
//        CONSUMER-OVERSTRIP   — the consumer's OWN workspace path was rewritten
//                               to "(loom-internal reference)", corrupting their
//                               real content.
//
//      Probed against a synthetic `coc-project` tree in a temp dir, so the
//      assertion holds regardless of which repo this runner is executing in.
const moduleFlagIdx = process.argv.indexOf("--module");
const moduleUnderTest =
  moduleFlagIdx >= 0 && process.argv[moduleFlagIdx + 1]
    ? path.resolve(process.argv[moduleFlagIdx + 1])
    : helperPath;

if (moduleUnderTest !== helperPath) {
  console.log(`      (section 4 module under test: ${moduleUnderTest})`);
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "strip-scope-"));
const fakeRepo = path.join(sandbox, "consumer-repo");
const consumerWs = "acme-consumer-engagement";
fs.mkdirSync(path.join(fakeRepo, ".claude", "bin", "lib"), { recursive: true });
fs.mkdirSync(path.join(fakeRepo, "workspaces", consumerWs), { recursive: true });
fs.writeFileSync(
  path.join(fakeRepo, ".claude", "VERSION"),
  JSON.stringify({ version: "1.0.0", type: "coc-project" }, null, 2),
);
fs.copyFileSync(
  moduleUnderTest,
  path.join(fakeRepo, ".claude", "bin", "lib", "strip-build-internal.mjs"),
);

// Positive control: the probe must be exercising a tree that really reads as a
// non-loom consumer. If this is wrong, everything below passes for the wrong
// reason.
const fakeClass = JSON.parse(
  fs.readFileSync(path.join(fakeRepo, ".claude", "VERSION"), "utf8"),
).type;
check(
  "scope probe control: synthetic tree reads as a non-loom repo",
  fakeClass === "coc-project",
  `type=${fakeClass}`,
);

try {
  const consumerMod = await import(
    pathToFileURL(
      path.join(fakeRepo, ".claude", "bin", "lib", "strip-build-internal.mjs"),
    ).href
  );
  const strip = consumerMod.stripBuildInternalReferences;

  const canonicalCite =
    "See `workspaces/multi-cli-coc/02-plans/07-spec.md` for the spec.";
  const consumerCite = `Put plans under \`workspaces/${consumerWs}/02-plans/\` here.`;

  const canonicalOut = strip(canonicalCite).stripped;
  const consumerOut = strip(consumerCite).stripped;

  check(
    "CANONICAL-UNDERSTRIP: canonical loom workspace still strips at a non-loom repo",
    canonicalOut !== canonicalCite,
    canonicalOut !== canonicalCite
      ? ""
      : `CANONICAL-UNDERSTRIP — 'workspaces/multi-cli-coc/...' survived VERBATIM at a ` +
        `coc-project repo. The derived set REPLACED the canonical names instead of ` +
        `unioning with them, so every canonical loom path under-strips to zero. Got: ${JSON.stringify(canonicalOut)}`,
  );

  check(
    "CONSUMER-OVERSTRIP: consumer's own workspace path is preserved verbatim",
    consumerOut === consumerCite,
    consumerOut === consumerCite
      ? ""
      : `CONSUMER-OVERSTRIP — the consumer's own 'workspaces/${consumerWs}/' path was ` +
        `rewritten as if it were loom-internal. Got: ${JSON.stringify(consumerOut)}`,
  );
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

console.log("");
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
