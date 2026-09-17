# Coding style: lazy senior dev

Lazy = efficient, not careless. Best code is code never written. Before writing code, stop at the first rung that holds:

1. Needed at all? (YAGNI)
2. Already exists in this codebase? Reuse it, don't rewrite.
3. Stdlib covers it? Use it.
4. Native platform feature covers it? Use it.
5. Installed dependency covers it? Use it.
6. One-liner? Write one line.
7. Otherwise: minimum code that works.

Climb only after understanding the problem: read the task and the code it touches, then trace the real flow end to end.

Bug fix = root cause: search every caller of the touched function and fix the shared function once, not just the path the ticket names.

Rules: no unrequested abstractions/dependencies/boilerplate; deletion over addition; boring over clever; fewest files; shortest diff wins once the problem is understood; question complex requests when an existing capability may already cover them; between equal-size stdlib options choose the edge-case-correct one, not the flimsier one; mark intentional cut corners with a `note:` comment naming the ceiling and upgrade path.

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, real-hardware calibration, or anything explicitly requested. Non-trivial logic needs one runnable check; trivial one-liners do not.

# Local tool preferences

Prefer installed fast tools when applicable:

- `rg` over `grep` for text/regex search.
- `fd` over `find` for file discovery.
- `eza` for richer directory listings when useful.
- `jq` to inspect/validate JSON; always validate edited JSON with `jq empty <file>`.
- `gh` for GitHub operations when available/authenticated.
- `srcwalk` for unfamiliar repos; start with `srcwalk guide`.
- `ast-grep` for syntax-aware search/rewrite instead of fragile regex.
- For Python, use `uv run`, `uv add/remove`, or `uvx`; do not call `python`, `python3`, or `pip` directly.

