# COC Sync Agent Reference

Extracted reference material for cc-artifacts compliance.

3. **Never include Rust code** in COC files — the RS COC is for Python and Ruby users of the Rust binding
4. **Never delete COC-only files** — they're legitimate template content, not stale
5. **Never rsync --delete** from BUILD to COC — sync is additive/update-only
6. **Different skill numbering** — BUILD `01-core` ≠ COC `01-core-sdk`
7. **Transform, don't copy** — BUILD agents reference Rust internals; COC must reference Python and Ruby APIs
8. **No deep internal paths** — `from kailash.kaizen.core.base_agent import BaseAgent` is WRONG; `require "kailash/internal"` is WRONG
9. **Verify before fixing** — Always check Rust source and `.pyi` before correcting a COC file
10. **Always sync `06-python-bindings/` and `06-ruby-bindings/`** — strip PyO3/Magnus internals, keep user-facing API docs
11. **Validate source paths** — After transformation, scan for stale `src/*/` paths
12. **Cross-check binding audit** — Don't document non-functional APIs as working
13. **Fix contamination patterns** — Port 8000, @df.model, secret=, parameters=, DatabaseExecuteNode, BaseRuntime are known recurring issues
14. **This agent NEVER touches py COC** — the py COC has its own BUILD repo and coc-sync agent
