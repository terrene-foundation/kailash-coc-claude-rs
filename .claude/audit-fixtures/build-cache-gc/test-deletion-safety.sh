#!/usr/bin/env bash
# Regression lock for build-cache-gc.js deletion-safety predicates
# (per cc-artifacts.md Rule 9 + hook-output-discipline.md Rule 4).
# Hardened-fix coverage: the load-bearing scope restriction is "deletion confined
# to /tmp + worktrees, proven cache only, no symlink escape" — the attack surface
# the 2026-06-20 security review required fixtures for.
#
# Run from the repo root:
#   bash .claude/audit-fixtures/build-cache-gc/test-deletion-safety.sh
#
# Predicates asserted:
#   (A) stray PROVEN cargo cache (CACHEDIR.TAG, no .git) + OLD mtime → DELETED
#   (B) target under a real checkout (.git present)                 → PRESERVED
#   (C) stray cargo cache + RECENT mtime (active-build guard)        → PRESERVED
#   (D) the live checkout's own target/                             → PRESERVED
#   (E) symlink whose leaf `target` is a link (planted redirect)    → PRESERVED  [CRIT-1]
#   (F) dir named `target` with NO cache marker (Maven/data dir)    → PRESERVED  [HIGH-1]
#   (G) symlink `target` whose realpath is OUTSIDE /tmp (escape)    → PRESERVED  [CRIT-1 confinement]
set -u
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
HOOK="$REPO/.claude/hooks/build-cache-gc.js"
TMP="/tmp/bcgc-fixture-$$"                     # MUST be under /tmp (a scan root)
SENTINEL="$(dirname "$0")/.sentinel-$$"        # OUTSIDE /tmp — confinement target
fail=0

node -c "$HOOK" 2>/dev/null || { echo "FAIL: $HOOK has a syntax error"; exit 1; }

cache() { mkdir -p "$1/debug"; : > "$1/CACHEDIR.TAG"; echo x > "$1/debug/a"; }  # a proven cargo cache

mkdir -p "$TMP" "$SENTINEL"
cache "$TMP/stray-old/target";        touch -t 202601010000 "$TMP/stray-old/target" "$TMP/stray-old/target/CACHEDIR.TAG" "$TMP/stray-old/target/debug"   # (A)
mkdir -p "$TMP/realco/.git";   cache "$TMP/realco/target";   touch -t 202601010000 "$TMP/realco/target"                                                 # (B)
cache "$TMP/stray-recent/target"                                                                                                                          # (C) recent (now)
mkdir -p "$TMP/evil";          cache "$SENTINEL/leaf-target"; touch -t 202601010000 "$SENTINEL/leaf-target" "$SENTINEL/leaf-target/CACHEDIR.TAG"
ln -s "$SENTINEL/leaf-target" "$TMP/evil/target"                                                                                                          # (E) leaf symlink
mkdir -p "$TMP/mavenish/target/classes"; echo x > "$TMP/mavenish/target/classes/a"; touch -t 202601010000 "$TMP/mavenish/target"                          # (F) no marker, no .git
cache "$SENTINEL/escape-target";  touch -t 202601010000 "$SENTINEL/escape-target" "$SENTINEL/escape-target/CACHEDIR.TAG"
mkdir -p "$TMP/escape"; ln -s "$SENTINEL/escape-target" "$TMP/escape/target"                                                                              # (G) escape symlink

echo "{\"cwd\":\"$REPO\",\"session_id\":\"fixture\"}" | node "$HOOK" >/dev/null 2>&1

chk() { if [ -d "$1" ]; then [ "$2" = 1 ] && echo "ok: $3" || { echo "FAIL: $3 should be DELETED"; fail=1; }
        else [ "$2" = 0 ] && echo "ok: $3" || { echo "FAIL: $3 should be PRESERVED"; fail=1; }; fi; }
chk "$TMP/stray-old/target"      0 "(A) stray-proven-cache deleted"
chk "$TMP/realco/target"         1 "(B) .git-checkout preserved"
chk "$TMP/stray-recent/target"   1 "(C) recent preserved (active guard)"
chk "$REPO/target"               1 "(D) live-checkout-target preserved"
chk "$SENTINEL/leaf-target"      1 "(E) leaf-symlink target preserved [CRIT-1]"
chk "$TMP/mavenish/target"       1 "(F) no-cache-marker target preserved [HIGH-1]"
chk "$SENTINEL/escape-target"    1 "(G) confinement-escape target preserved [CRIT-1]"

rm -rf "$TMP" "$SENTINEL"
[ "$fail" = 0 ] && echo "PASS: all deletion-safety predicates hold" || { echo "REGRESSION DETECTED"; exit 1; }
