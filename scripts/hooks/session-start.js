#!/usr/bin/env node
/**
 * Hook: session-start
 * Event: SessionStart
 * Purpose: Discover env config, validate model-key pairings, create .env if
 *          missing, output model configuration prominently.
 *
 * Framework-agnostic — works with any Kailash project.
 *
 * Exit Codes:
 *   0 = success (continue)
 *   2 = blocking error (stop tool execution)
 *   other = non-blocking error (warn and continue)
 */

const fs = require("fs");
const path = require("path");
const {
  parseEnvFile,
  discoverModelsAndKeys,
  ensureEnvFile,
  buildCompactSummary,
} = require("./lib/env-utils");
const {
  resolveLearningDir,
  ensureLearningDir,
  logObservation: logLearningObservation,
} = require("./lib/learning-utils");
const {
  detectActiveWorkspace,
  derivePhase,
  getTodoProgress,
  getSessionNotes,
} = require("./lib/workspace-utils");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    initializeSession(data);
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (error) {
    console.error(`[HOOK ERROR] ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
    process.exit(1);
  }
});

function initializeSession(data) {
  const session_id = (data.session_id || "unknown").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const cwd = data.cwd || process.cwd();
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const sessionDir = path.join(homeDir, ".claude", "sessions");
  const learningDir = resolveLearningDir(cwd);

  // Ensure directories exist
  [sessionDir].forEach((dir) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  });
  ensureLearningDir(cwd);

  // ── .env provision ────────────────────────────────────────────────────
  const envResult = ensureEnvFile(cwd);
  if (envResult.created) {
    console.error(
      `[ENV] Created .env from ${envResult.source}. Please fill in your API keys.`,
    );
  }

  // ── Parse .env ────────────────────────────────────────────────────────
  const envPath = path.join(cwd, ".env");
  const envExists = fs.existsSync(envPath);
  let env = {};
  let discovery = { models: {}, keys: {}, validations: [] };

  if (envExists) {
    env = parseEnvFile(envPath);
    discovery = discoverModelsAndKeys(env);
  }

  // ── Detect framework ──────────────────────────────────────────────────
  const framework = detectFramework(cwd);

  // ── Log observation ───────────────────────────────────────────────────
  try {
    const observationsFile = path.join(learningDir, "observations.jsonl");
    fs.appendFileSync(
      observationsFile,
      JSON.stringify({
        type: "session_start",
        session_id,
        cwd,
        timestamp: new Date().toISOString(),
        envExists,
        framework,
        models: discovery.models,
        keyCount: Object.keys(discovery.keys).length,
        validationFailures: discovery.validations
          .filter((v) => v.status === "MISSING_KEY")
          .map((v) => v.message),
      }) + "\n",
    );
  } catch {}

  // ── Load previous session ─────────────────────────────────────────────
  try {
    const sessionFile = path.join(sessionDir, `${session_id}.json`);
    const lastSessionFile = path.join(sessionDir, "last-session.json");
    if (fs.existsSync(sessionFile)) {
      /* loaded */
    } else if (fs.existsSync(lastSessionFile)) {
      /* loaded */
    }
  } catch {}

  // ── Output workspace status (human-facing, stderr only) ──────────────
  try {
    const ws = detectActiveWorkspace(cwd);
    if (ws) {
      const phase = derivePhase(ws.path, cwd);
      const todos = getTodoProgress(ws.path);
      const notes = getSessionNotes(ws.path);
      console.error(
        `[WORKSPACE] ${ws.name} | Phase: ${phase} | Todos: ${todos.active} active / ${todos.completed} done`,
      );
      if (notes) {
        const staleTag = notes.stale ? " (stale)" : "";
        console.error(`[WORKSPACE] Session notes${staleTag}: ${notes.age}`);
      }
    }
  } catch {}

  // ── Package freshness & COC sync check ──────────────────────────────
  try {
    checkPackageFreshness(cwd);
  } catch (e) {
    console.error(`[FRESHNESS] Check failed: ${e.message}`);
  }

  // ── Output model/key summary ──────────────────────────────────────────
  if (envExists) {
    const summary = buildCompactSummary(env, discovery);
    console.error(`[ENV] ${summary}`);

    // Detail each model-key validation
    for (const v of discovery.validations) {
      const icon = v.status === "ok" ? "✓" : "✗";
      console.error(`[ENV]   ${icon} ${v.message}`);
    }

    // Prominent warnings for missing keys
    const failures = discovery.validations.filter(
      (v) => v.status === "MISSING_KEY",
    );
    if (failures.length > 0) {
      console.error(
        `[ENV] WARNING: ${failures.length} model(s) configured without API keys!`,
      );
      console.error(
        "[ENV] LLM operations WILL FAIL. Add missing keys to .env.",
      );
    }
  } else {
    console.error(
      "[ENV] No .env file found. API keys and models not configured.",
    );
  }
}

/**
 * Check package freshness and COC sync status.
 * For BUILD repos: verify Cargo.lock is consistent.
 * For USE repos: verify installed SDK package is latest.
 * For all: check if COC template has newer commits.
 */
function checkPackageFreshness(cwd) {
  const { execSync } = require("child_process");

  // Detect repo type
  const isBuildRepo =
    fs.existsSync(path.join(cwd, "crates")) &&
    fs.existsSync(path.join(cwd, "bindings"));
  const hasPyproject = fs.existsSync(path.join(cwd, "pyproject.toml"));
  const hasCargoToml = fs.existsSync(path.join(cwd, "Cargo.toml"));
  const hasRequirements = fs.existsSync(path.join(cwd, "requirements.txt"));
  const hasGemfile = fs.existsSync(path.join(cwd, "Gemfile"));

  // For USE repos with Python: check kailash-enterprise version
  if (!isBuildRepo && (hasPyproject || hasRequirements)) {
    try {
      const installed = execSync(
        "pip show kailash-enterprise 2>/dev/null | grep Version | awk '{print $2}'",
        { encoding: "utf8", timeout: 10000 },
      ).trim();
      const latest = execSync(
        "pip index versions kailash-enterprise 2>/dev/null | head -1 | grep -oP '\\d+\\.\\d+\\.\\d+'",
        { encoding: "utf8", timeout: 15000 },
      ).trim();

      if (installed && latest && installed !== latest) {
        console.error(
          `[FRESHNESS] WARNING: kailash-enterprise ${installed} installed, but ${latest} is available. ` +
            `Run: pip install --upgrade kailash-enterprise`,
        );
      } else if (installed) {
        console.error(`[FRESHNESS] kailash-enterprise ${installed} (latest)`);
      }
    } catch {
      // pip commands may fail — non-fatal
    }
  }

  // For USE repos with Ruby: check kailash gem version
  if (!isBuildRepo && hasGemfile) {
    try {
      const installed = execSync(
        "gem list kailash --local 2>/dev/null | grep kailash | grep -oP '\\d+\\.\\d+\\.\\d+'",
        { encoding: "utf8", timeout: 10000 },
      ).trim();
      if (installed) {
        console.error(`[FRESHNESS] kailash gem ${installed}`);
      }
    } catch {}
  }

  // For BUILD repos: verify workspace version consistency
  if (isBuildRepo && hasCargoToml) {
    try {
      const cargoToml = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf8");
      const versionMatch = cargoToml.match(
        /\[workspace\.package\]\s*[\s\S]*?version\s*=\s*"([^"]+)"/,
      );
      if (versionMatch) {
        const wsVersion = versionMatch[1];
        // Check pyproject.toml version matches
        const pyprojectPath = path.join(
          cwd,
          "bindings",
          "kailash-python",
          "pyproject.toml",
        );
        if (fs.existsSync(pyprojectPath)) {
          const pyproject = fs.readFileSync(pyprojectPath, "utf8");
          const pyVersionMatch = pyproject.match(/version\s*=\s*"([^"]+)"/);
          if (pyVersionMatch && pyVersionMatch[1] !== wsVersion) {
            console.error(
              `[FRESHNESS] VERSION MISMATCH: Cargo.toml=${wsVersion}, pyproject.toml=${pyVersionMatch[1]}. ` +
                `Update pyproject.toml version before release!`,
            );
          }
        }
        console.error(`[FRESHNESS] Workspace version: ${wsVersion}`);
      }
    } catch {}
  }

  // Check COC template sync status (for USE repos)
  if (!isBuildRepo) {
    try {
      // Look for a .coc-sync-marker file that records last sync commit
      const markerPath = path.join(cwd, ".claude", ".coc-sync-marker");
      if (fs.existsSync(markerPath)) {
        const marker = fs.readFileSync(markerPath, "utf8").trim();
        const markerData = JSON.parse(marker);
        const lastSync = markerData.synced_at || "unknown";
        const templateCommit = markerData.template_commit || "unknown";
        console.error(
          `[COC-SYNC] Last synced: ${lastSync} (template: ${templateCommit})`,
        );

        // Check if sync is older than 7 days
        if (markerData.synced_at) {
          const syncDate = new Date(markerData.synced_at);
          const daysSince =
            (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 7) {
            console.error(
              `[COC-SYNC] WARNING: COC sync is ${Math.floor(daysSince)} days old. ` +
                `Run COC sync to get latest agents, skills, and rules from template.`,
            );
          }
        }
      } else {
        console.error(
          "[COC-SYNC] No sync marker found. Consider running COC sync to align with template.",
        );
      }
    } catch {}
  }
}

function detectFramework(cwd) {
  try {
    const files = fs.readdirSync(cwd);

    // ── Rust detection ──────────────────────────────────────────────────
    const rsFiles = files.filter((f) => f.endsWith(".rs")).slice(0, 10);
    for (const file of rsFiles) {
      try {
        const content = fs.readFileSync(path.join(cwd, file), "utf8");
        if (/use kailash_dataflow/.test(content)) return "kailash-dataflow";
        if (/use kailash_nexus/.test(content)) return "kailash-nexus";
        if (/use kailash_kaizen/.test(content)) return "kailash-kaizen";
        if (/use kailash_enterprise/.test(content)) return "kailash-enterprise";
        if (/use kailash_core/.test(content)) return "kailash-core";
      } catch {}
    }
    if (files.includes("Cargo.toml")) return "rust-sdk";

    // ── Python detection ────────────────────────────────────────────────
    for (const file of files.filter((f) => f.endsWith(".py")).slice(0, 10)) {
      try {
        const content = fs.readFileSync(path.join(cwd, file), "utf8");
        if (/@db\.model/.test(content) || /from dataflow/.test(content))
          return "dataflow";
        if (/from nexus/.test(content) || /Nexus\(/.test(content))
          return "nexus";
        if (/from kaizen/.test(content) || /BaseAgent/.test(content))
          return "kaizen";
      } catch {}
    }
    return "core-sdk";
  } catch {
    return "unknown";
  }
}
