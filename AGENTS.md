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

## GitHub research for coding

Use the authenticated `gh` CLI as a read-only research tool before guessing at an implementation or root cause; do not use it to mutate repositories unless explicitly requested.

- Find implementation examples with `gh search code "<symbol-or-pattern>" --repo OWNER/REPO --language <lang> --limit 20 --json path,repository,textMatches,url`. Narrow with `--filename`, `--extension`, `--owner`, or `--match file|path`. Code search uses GitHub's legacy API search engine, so verify important results in the source.
- Find known bugs, regressions, and maintainer explanations with `gh search issues "<error-or-symptom>" --repo OWNER/REPO --state all --include-prs --limit 50 --json number,title,state,repository,url`, then inspect candidates with `gh issue view NUMBER --repo OWNER/REPO --comments`.
- Find fixes and design decisions with `gh search prs "<error-or-symptom>" --repo OWNER/REPO --state all --limit 50 --json number,title,state,repository,url`, then use `gh pr view NUMBER --repo OWNER/REPO --comments` and `gh pr diff NUMBER --repo OWNER/REPO`.
- Trace when/how behavior changed with `gh search commits "<keyword>" --repo OWNER/REPO --limit 50 --json sha,commit,repository,url`; inspect the relevant commit or files with `gh api`.
- For details not exposed by `gh search`, use read-only REST/GraphQL calls such as `gh api repos/{owner}/{repo}/issues/NUMBER/comments --paginate` or `gh api repos/{owner}/{repo}/pulls/NUMBER/files --paginate`. Use `--json`, `--jq`, or `--template` to keep output small and machine-readable; use `--slurp` when combining pages.
- Build a root-cause chain: reproduce the symptom → search the exact error and distinctive symbols → inspect duplicate issues and linked/merged PRs → inspect the fixing diff and nearby commits → compare the fix with the local call path and all callers. Treat a matching title as a lead, not proof.
- Search qualifiers can be passed as query terms (`state:closed`, `is:merged`, `label:bug`, `path:...`). If a query contains a leading `-` qualifier, use `--` before the query (and PowerShell's `--%` when required).
- `gh api` defaults to GET, but adding request fields can switch it to POST; keep research calls read-only and double-check the endpoint before using any write method.

