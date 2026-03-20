#!/usr/bin/env node
/**
 * Hook: validate-workflow
 * Event: PostToolUse
 * Matcher: Edit|Write
 * Purpose: Enforce Kailash SDK patterns, detect hardcoded models/keys in
 *          code files (Python, Ruby, TypeScript, JavaScript).
 *
 *   - Python files: BLOCK (exit 2) for stubs and hardcoded models without key
 *   - Ruby files:   BLOCK (exit 2) for stubs and hardcoded models without key
 *   - JS/TS files:  WARN only (exit 0)
 *
 * Polyglot -- validates Python/Ruby patterns for the Kailash SDK bindings.
 *
 * Exit Codes:
 *   0 = success / warn-only
 *   2 = blocking error (hardcoded model without key, stubs in production)
 *   other = non-blocking error
 */

const fs = require("fs");
const path = require("path");
const { parseEnvFile, getModelProvider } = require("./lib/env-utils");
const {
  logObservation: logLearningObservation,
} = require("./lib/learning-utils");

const TIMEOUT_MS = 5000;
const timeout = setTimeout(() => {
  console.error("[HOOK TIMEOUT] validate-workflow exceeded 5s limit");
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  clearTimeout(timeout);
  try {
    const data = JSON.parse(input);
    const result = validateFile(data);
    console.log(
      JSON.stringify({
        continue: result.continue,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          validation: result.messages,
        },
      }),
    );
    process.exit(result.exitCode);
  } catch (error) {
    console.error(`[HOOK ERROR] ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
    process.exit(1);
  }
});

// =====================================================================
// Main dispatcher
// =====================================================================

function validateFile(data) {
  const filePath = data.tool_input?.file_path || "";
  const cwd = data.cwd || process.cwd();

  const ext = path.extname(filePath).toLowerCase();

  const pyExts = [".py"];
  const rbExts = [".rb"];
  const jsExts = [".ts", ".tsx", ".js", ".jsx"];
  const configExts = [".yaml", ".yml", ".json", ".env", ".sh", ".toml"];

  const isPython = pyExts.includes(ext);
  const isRuby = rbExts.includes(ext);
  const isJs = jsExts.includes(ext);
  const isConfig = configExts.includes(ext);
  const isCode = isPython || isRuby || isJs;

  if (!isCode && !isConfig) {
    return {
      continue: true,
      exitCode: 0,
      messages: ["Not a code or config file -- skipped"],
    };
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return { continue: true, exitCode: 0, messages: ["Could not read file"] };
  }

  // Load .env once for key-validation
  const envPath = path.join(cwd, ".env");
  const env = fs.existsSync(envPath) ? parseEnvFile(envPath) : {};

  const messages = [];
  let shouldBlock = false;

  // -- Kailash Python-specific checks (.py only) ----------------------------
  if (isPython) {
    const pyBlocked = checkPythonPatterns(content, filePath, messages);
    if (pyBlocked) shouldBlock = true;
  }

  // -- Kailash Ruby-specific checks (.rb only) ------------------------------
  if (isRuby) {
    const rbBlocked = checkRubyPatterns(content, filePath, messages);
    if (rbBlocked) shouldBlock = true;
  }

  // -- Hardcoded model detection (code files only -- configs may list models intentionally)
  if (isCode) {
    const modelResult = checkHardcodedModels(
      content,
      filePath,
      env,
      isPython || isRuby,
    );
    messages.push(...modelResult.messages);
    if (modelResult.block) shouldBlock = true;
  }

  // -- Hardcoded API key detection (all file types including configs) -----
  checkHardcodedKeys(content, filePath, messages);

  // -- Stub/TODO/simulation detection (code files only) -------------------
  if (isCode) {
    const stubBlocked = checkStubsAndSimulations(
      content,
      filePath,
      messages,
      isPython,
      isRuby,
    );
    if (stubBlocked) shouldBlock = true;
  }

  if (messages.length === 0) {
    messages.push("All patterns validated");
  }

  // --- Observation logging (Phase 2: enriched learning) ---
  try {
    logFileObservations(content, filePath, cwd, messages);
  } catch {}

  return {
    continue: !shouldBlock,
    exitCode: shouldBlock ? 2 : 0,
    messages,
  };
}

// =====================================================================
// Kailash SDK pattern checks (Python)
// =====================================================================

function checkPythonPatterns(content, filePath, messages) {
  let blocked = false;

  // Anti-pattern: workflow.execute(runtime) -- wrong direction
  if (/workflow\s*\.\s*execute\s*\(\s*runtime/.test(content)) {
    messages.push(
      "WARNING: workflow.execute(runtime) found. Use rt.execute(wf) instead.",
    );
  }

  // Anti-pattern: builder.build() without registry
  if (/builder\.build\s*\(\s*\)/.test(content) && !isTestFile(filePath)) {
    messages.push(
      "WARNING: builder.build() called without registry. Use builder.build(reg).",
    );
  }

  // Anti-pattern: deprecated imports
  const deprecatedImports = [
    [/from\s+kailash\.runtime\s+import/, "from kailash.runtime import"],
    [
      /from\s+kailash\.workflow\.builder\s+import/,
      "from kailash.workflow.builder import",
    ],
    [/from\s+kailash\._kailash\s+import/, "from kailash._kailash import"],
    [/\bLocalRuntime\b/, "LocalRuntime (use kailash.Runtime instead)"],
    [/\bAsyncLocalRuntime\b/, "AsyncLocalRuntime (use kailash.Runtime instead)"],
    [/\bget_runtime\b/, "get_runtime (use kailash.Runtime(reg) instead)"],
  ];

  for (const [pattern, name] of deprecatedImports) {
    if (pattern.test(content) && !isTestFile(filePath)) {
      messages.push(
        `WARNING: Deprecated pattern "${name}" detected. Use current API.`,
      );
    }
  }

  // Anti-pattern: wrong package name
  if (/pip\s+install\s+kailash(?!\s*-enterprise)/.test(content)) {
    messages.push(
      'WARNING: "pip install kailash" found. Use "pip install kailash-enterprise".',
    );
  }

  // Check for os.environ without dotenv loading
  if (
    /os\.environ/.test(content) &&
    !/dotenv/.test(content) &&
    !/load_dotenv/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      "WARNING: os.environ used without dotenv. Ensure .env is loaded with load_dotenv().",
    );
  }

  // Check for hardcoded secret patterns in Python
  if (
    /(secret|password|token|api_key)\s*=\s*["'][^"']{8,}["']/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      'CRITICAL: Possible hardcoded secret in Python code. Use os.environ.get() or dotenv.',
    );
    blocked = true;
  }

  // Check for mocking in integration/e2e test files
  if (isTestFile(filePath)) {
    const isIntegrationTest =
      filePath.includes("/integration/") ||
      filePath.includes("/e2e/") ||
      filePath.includes("_integration") ||
      filePath.includes("_e2e");

    if (isIntegrationTest) {
      const mockPatterns = [
        [/@patch\s*\(/, "@patch()"],
        [/MagicMock\s*\(/, "MagicMock()"],
        [/unittest\.mock/, "unittest.mock"],
        [/from\s+mock\s+import/, "from mock import"],
        [/mocker\.patch/, "mocker.patch()"],
      ];
      for (const [pat, name] of mockPatterns) {
        if (pat.test(content)) {
          messages.push(
            `WARNING: ${name} detected in integration/e2e test. NO MOCKING in Tier 2-3 tests.`,
          );
        }
      }
    }
  }

  // Check for SQL injection patterns
  if (
    /f["'](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s/i.test(content) ||
    /["'](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s.*?\{/.test(content)
  ) {
    messages.push(
      "CRITICAL: f-string with SQL detected -- potential SQL injection. Use parameterized queries.",
    );
    blocked = true;
  }

  return blocked;
}

// =====================================================================
// Kailash SDK pattern checks (Ruby)
// =====================================================================

function checkRubyPatterns(content, filePath, messages) {
  let blocked = false;

  // Anti-pattern: builder.build without registry
  if (
    /builder\.build\s*(?:\(\s*\)|[^(])/.test(content) &&
    !/builder\.build\s*\(\s*\w/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      "WARNING: builder.build called without registry. Use builder.build(registry).",
    );
  }

  // Anti-pattern: symbol keys in config hashes (should be string keys)
  if (
    /Kailash::.*\.new\s*\(\s*\{[^}]*\w+:\s/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      'WARNING: Symbol keys in Kailash config hash. Use string keys: { "key" => value }.',
    );
  }

  // Anti-pattern: Timeout.timeout around execute
  if (/Timeout\.timeout.*execute/.test(content) && !isTestFile(filePath)) {
    messages.push(
      "WARNING: Timeout.timeout around execute won't interrupt Rust. Use RuntimeConfig#workflow_timeout= instead.",
    );
  }

  // Anti-pattern: missing close or block form
  if (
    /Kailash::Registry\.new\b/.test(content) &&
    !/\.close\b/.test(content) &&
    !/Registry\.open/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      "WARNING: Kailash::Registry.new without .close. Use Kailash::Registry.open { |reg| } block form.",
    );
  }

  // Anti-pattern: require "kailash/internal"
  if (/require\s+["']kailash\/internal["']/.test(content)) {
    messages.push(
      'WARNING: require "kailash/internal" is an internal module. Use require "kailash" only.',
    );
  }

  // Check for hardcoded secret patterns in Ruby
  if (
    /(secret|password|token|api_key)\s*=\s*["'][^"']{8,}["']/.test(content) &&
    !isTestFile(filePath)
  ) {
    messages.push(
      'CRITICAL: Possible hardcoded secret in Ruby code. Use ENV.fetch() or dotenv.',
    );
    blocked = true;
  }

  // Check for mocking in integration/e2e test files
  if (isTestFile(filePath)) {
    const isIntegrationTest =
      filePath.includes("/integration/") ||
      filePath.includes("/e2e/") ||
      filePath.includes("_integration") ||
      filePath.includes("_e2e");

    if (isIntegrationTest) {
      const mockPatterns = [
        [/allow\s*\(.*\)\s*\.to\s+receive/, "allow().to receive()"],
        [/expect\s*\(.*\)\s*\.to\s+receive/, "expect().to receive()"],
        [/\bdouble\s*\(/, "double()"],
        [/\binstance_double\s*\(/, "instance_double()"],
        [/\bclass_double\s*\(/, "class_double()"],
      ];
      for (const [pat, name] of mockPatterns) {
        if (pat.test(content)) {
          messages.push(
            `WARNING: ${name} detected in integration/e2e test. NO MOCKING in Tier 2-3 tests.`,
          );
        }
      }
    }
  }

  // Check for unsafe eval patterns
  const evalPatterns = [
    [/\beval\s*\(/, "eval()"],
    [/\binstance_eval\s*\(/, "instance_eval()"],
    [/\bclass_eval\s*\(/, "class_eval()"],
    [/\bKernel\.system\s*\(/, "Kernel.system()"],
    [/Marshal\.load\s*\(/, "Marshal.load()"],
  ];
  for (const [pat, name] of evalPatterns) {
    if (pat.test(content) && !isTestFile(filePath)) {
      messages.push(
        `REVIEW: ${name} detected in Ruby code. Verify this is not using user input.`,
      );
    }
  }

  return blocked;
}

// =====================================================================
// Hardcoded model name detection
// =====================================================================

/**
 * Regex patterns that match hardcoded model strings in code.
 * Each returns the captured model name in group 1.
 */
const MODEL_PREFIXES =
  "gpt|claude|gemini|deepseek|mistral|mixtral|command|o[134]|chatgpt|dall-e|whisper|tts|text-embedding|embed|rerank|hume|sonar|pplx|codestral|pixtral|palm";
const MODEL_PATTERNS = [
  // Python/Ruby/JS: model = "gpt-4" or model: "gpt-4"
  new RegExp(
    `model\\s*[=:]\\s*["'\`]((?:${MODEL_PREFIXES})(?:-[^"'\`]+)?)["'\`]`,
    "gi",
  ),
  // Dict/Hash/JSON: "model": "gpt-4" or 'model': 'gpt-4'
  new RegExp(
    `["'\`]model(?:_name)?["'\`]\\s*[=:]\\s*["'\`]((?:${MODEL_PREFIXES})(?:-[^"'\`]+)?)["'\`]`,
    "gi",
  ),
];

function checkHardcodedModels(content, filePath, env, shouldBlock) {
  const messages = [];
  let block = false;
  const lines = content.split("\n");

  for (const pattern of MODEL_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const modelName = match[1];
      const lineNum = content.substring(0, match.index).split("\n").length;
      const line = lines[lineNum - 1]?.trim() || "";

      // Skip comments (Python #, Ruby #, JS //)
      if (
        line.startsWith("#") ||
        line.startsWith("//") ||
        line.startsWith("*") ||
        line.startsWith("/*")
      ) {
        continue;
      }

      // Check if the model has a corresponding API key
      const info = getModelProvider(modelName);
      const hasKey = info
        ? info.keys.some((k) => env[k] && env[k].length > 5)
        : true; // unknown provider = don't block

      if (isTestFile(filePath)) {
        // Test code: warn only, never block
        messages.push(
          `WARNING: Hardcoded model "${modelName}" in test code at ${path.basename(filePath)}:${lineNum}. ` +
            `Consider reading from env in integration tests.`,
        );
      } else if (shouldBlock && !hasKey && info) {
        messages.push(
          `BLOCKED: Hardcoded model "${modelName}" at line ${lineNum} -- ` +
            `${info.keys.join(" or ")} not found in .env. ` +
            `Use os.environ["OPENAI_PROD_MODEL"] (Python) or ENV.fetch("OPENAI_PROD_MODEL") (Ruby).`,
        );
        block = true;
      } else {
        messages.push(
          `WARNING: Hardcoded model "${modelName}" at ${path.basename(filePath)}:${lineNum}. ` +
            `Prefer reading from .env.`,
        );
      }
    }
  }

  return { messages, block };
}

// =====================================================================
// Hardcoded API key detection
// =====================================================================

function checkHardcodedKeys(content, filePath, messages) {
  // Order matters: more specific prefixes first (sk-ant- before sk-)
  // Patterns match with or without quotes to catch keys in YAML, .env, shell scripts
  const keyPatterns = [
    [/["'`]?sk-ant-[a-zA-Z0-9_-]{20,}["'`]?/, "Anthropic API key"],
    [/["'`]?ant-api[a-zA-Z0-9_-]{20,}["'`]?/, "Anthropic API key"],
    [/["'`]?sk-proj-[a-zA-Z0-9_-]{20,}["'`]?/, "OpenAI API key"],
    [/["'`]?sk-[a-zA-Z0-9_-]{20,}["'`]?/, "OpenAI API key"],
    [/["'`]?pplx-[a-zA-Z0-9_-]{20,}["'`]?/, "Perplexity API key"],
    [/["'`]?AIzaSy[a-zA-Z0-9_-]{30,}["'`]?/, "Google API key"],
    [/["'`]?AKIA[0-9A-Z]{16}["'`]?/, "AWS Access Key"],
    [/["'`]?ghp_[a-zA-Z0-9]{36,}["'`]?/, "GitHub Personal Access Token"],
    [/["'`]?gho_[a-zA-Z0-9]{36,}["'`]?/, "GitHub OAuth Token"],
    [/["'`]?github_pat_[a-zA-Z0-9_]{22,}["'`]?/, "GitHub Fine-grained Token"],
    [/["'`]?sk_live_[a-zA-Z0-9]{20,}["'`]?/, "Stripe Live Key"],
    [/["'`]?sk_test_[a-zA-Z0-9]{20,}["'`]?/, "Stripe Test Key"],
    [/["'`]?xoxb-[a-zA-Z0-9-]{20,}["'`]?/, "Slack Bot Token"],
  ];

  // Skip key detection for test files
  if (isTestFile(filePath || "")) {
    return;
  }

  const seen = new Set();
  for (const [pattern, name] of keyPatterns) {
    if (pattern.test(content) && !seen.has(name)) {
      seen.add(name);
      messages.push(
        `CRITICAL: Hardcoded ${name} detected! Use os.environ (Python) or ENV.fetch (Ruby).`,
      );
    }
  }
}

// =====================================================================
// Stub / TODO / Simulation detection
// =====================================================================

/**
 * Detect stubs, TODOs, placeholders, naive fallbacks, and simulated services.
 *
 * BLOCKING (exit 2) for Python/Ruby production code -- stubs are NOT warnings.
 * See rules/zero-tolerance.md (Absolute Rule 2).
 *
 * Returns true if any blocking violation was found.
 */
function checkStubsAndSimulations(
  content,
  filePath,
  messages,
  isPython,
  isRuby,
) {
  // Skip test files -- stubs in tests are intentional fixture data
  if (isTestFile(filePath)) {
    return false;
  }

  const lines = content.split("\n");
  const isProductionLang = isPython || isRuby;

  // Blocking patterns -- these STOP the operation for Python/Ruby production code
  const blockingPatterns = [];

  if (isPython) {
    blockingPatterns.push(
      [
        /\braise\s+NotImplementedError\b/,
        "raise NotImplementedError -- IMPLEMENT the function fully",
      ],
      [
        /^\s*pass\s*$/,
        "bare pass statement -- IMPLEMENT the function body (verify context)",
      ],
    );
  }

  if (isRuby) {
    blockingPatterns.push(
      [
        /\braise\s+NotImplementedError\b/,
        "raise NotImplementedError -- IMPLEMENT the method fully",
      ],
      [
        /\braise\s+["']Not\s+(?:yet\s+)?implemented/i,
        'raise "Not implemented" -- IMPLEMENT the method fully',
      ],
    );
  }

  // Warning patterns -- flagged but not blocking (need human judgment)
  const warningPatterns = [
    [/\bTODO\b/, "TODO marker -- do it now, don't defer"],
    [/\bFIXME\b/, "FIXME marker -- fix it now, don't defer"],
    [/\bHACK\b/, "HACK marker -- implement properly"],
    [/\bSTUB\b/, "STUB marker -- implement the real logic"],
    [/\bXXX\b/, "XXX marker -- resolve this immediately"],
    [
      /\b(simulated?|fake|dummy|placeholder)\s*(data|response|result|value)/i,
      "simulated/fake data in production code",
    ],
  ];

  // Language-specific empty error handling
  if (isPython) {
    warningPatterns.push([
      /except\s*(?:\w+\s*)?:\s*\n\s*pass/,
      "empty except/pass block -- handle the error or propagate it",
    ]);
  }
  if (isRuby) {
    warningPatterns.push([
      /rescue\s*(?:=>?\s*\w+)?\s*\n\s*end/,
      "empty rescue block -- handle the error or propagate it",
    ]);
  }

  // JS empty catch
  warningPatterns.push([
    /catch\s*\([^)]*\)\s*\{\s*\}/,
    "empty catch block -- handle the error or propagate it",
  ]);

  const found = new Set();
  let hasBlocking = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    const isComment =
      trimmed.startsWith("#") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*");

    // For blocking patterns: only check non-comment code lines
    if (!isComment) {
      for (const [pattern, label] of blockingPatterns) {
        if (pattern.test(line) && !found.has(label)) {
          // For "bare pass", verify it's actually a function body placeholder
          // not a valid pass in a loop or conditional
          if (label.includes("bare pass")) {
            // Look backwards for a def/class line to confirm it's a stub
            let isStub = false;
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
              if (/^\s*(def|class)\s/.test(lines[j])) {
                isStub = true;
                break;
              }
            }
            if (!isStub) continue;
          }

          found.add(label);
          if (isProductionLang) {
            messages.push(
              `BLOCKED: ${label} at ${path.basename(filePath)}:${i + 1}. ` +
                `Stubs are NOT allowed. Implement fully or remove the function.`,
            );
            hasBlocking = true;
          } else {
            messages.push(
              `WARNING: ${label} at ${path.basename(filePath)}:${i + 1}.`,
            );
          }
        }
      }
    }

    // Check for TODO/FIXME/HACK/STUB/XXX -- these are violations even in comments
    for (const [pattern, label] of warningPatterns) {
      if (pattern.test(line) && !found.has(label)) {
        // Skip if the line is a rule file reference or documentation about the pattern
        if (
          trimmed.includes("rules/") ||
          trimmed.includes("Detection Patterns")
        ) {
          continue;
        }
        found.add(label);
        messages.push(
          `WARNING: ${label} at ${path.basename(filePath)}:${i + 1}.`,
        );
      }
    }
  }

  return hasBlocking;
}

// =====================================================================
// Observation logging for the learning system
// =====================================================================

/**
 * Detect patterns in the file content and log enriched observations.
 * Runs after validation; overhead is <5ms (fs.appendFileSync of JSONL lines).
 */
function logFileObservations(content, filePath, cwd, messages) {
  const basename = path.basename(filePath);

  // WorkflowBuilder / runtime.execute() -> workflow_pattern
  if (
    /WorkflowBuilder/.test(content) ||
    /runtime\s*\.\s*execute/.test(content) ||
    /rt\.execute/.test(content)
  ) {
    logLearningObservation(cwd, "workflow_pattern", {
      pattern_type: /WorkflowBuilder/.test(content)
        ? "workflow_builder"
        : "runtime_execute",
      file: basename,
    });
  }

  // add_node() calls -> node_usage
  const nodeMatches = content.match(/add_node\s*\(\s*["'](\w+)["']/g);
  if (nodeMatches && nodeMatches.length > 0) {
    const nodeTypes = [
      ...new Set(
        nodeMatches
          .map((m) => {
            const match = m.match(/add_node\s*\(\s*["'](\w+)["']/);
            return match ? match[1] : null;
          })
          .filter(Boolean),
      ),
    ];
    logLearningObservation(cwd, "node_usage", {
      node_types: nodeTypes,
      file: basename,
    });
  }

  // @db.model -> dataflow_model (Python)
  const modelMatches = content.match(/@db\.model[\s\S]*?class\s+(\w+)/g);
  if (modelMatches) {
    for (const m of modelMatches) {
      const nameMatch = m.match(/class\s+(\w+)/);
      if (nameMatch) {
        logLearningObservation(cwd, "dataflow_model", {
          model_name: nameMatch[1],
          file: basename,
        });
      }
    }
  }

  // Stubs/TODOs detected -> error_occurrence (stub_detected)
  if (
    messages.some((m) =>
      /TODO marker|FIXME marker|STUB marker|NotImplementedError/.test(m),
    )
  ) {
    logLearningObservation(cwd, "error_occurrence", {
      error_type: "stub_detected",
      file: basename,
    });
  }

  // Hardcoded model name detected -> error_occurrence (hardcoded_model)
  if (messages.some((m) => /Hardcoded model/.test(m))) {
    logLearningObservation(cwd, "error_occurrence", {
      error_type: "hardcoded_model",
      file: basename,
    });
  }
}

// =====================================================================
// Helpers
// =====================================================================

function isTestFile(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  return (
    // Python test patterns
    /^test_|_test\.py$|\.test\.|__tests__/.test(basename) ||
    basename === "conftest.py" ||
    // Ruby test patterns
    /_spec\.rb$/.test(basename) ||
    basename === "spec_helper.rb" ||
    basename === "rails_helper.rb" ||
    // JS test patterns
    /\.spec\.|\.test\./.test(basename) ||
    // Directory-based patterns
    filePath.includes("__tests__") ||
    filePath.includes("/tests/") ||
    filePath.includes("/test/") ||
    filePath.includes("/spec/") ||
    filePath.includes("/fixtures/")
  );
}
