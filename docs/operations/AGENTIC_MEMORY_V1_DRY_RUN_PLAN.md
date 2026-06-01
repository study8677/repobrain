# Agentic Memory v1 — repo-only dry-run plan (AM-2 — docs-only proposal)

**Status:** PROPOSED — proposal/checklist only.
**Authorisation level:** **none granted by this PR for any execution.** This document defines what a future repo-only dry run *would* do; it does not run anything, write anything, install anything, or change any setting. Anton's [DECISION 4585482069](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585482069) explicitly leaves Decision 5 (dry-run import authorisation) **NOT YET APPROVED**.

**Date opened:** 2026-06-01 (UTC).
**Operator Bridge thread:** [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
**Parent proposal:** `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` (merged via PR [#274](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/274) on 2026-06-01, commit `a49c2c47`).
**Parent ADR-lite:** `docs/decisions/20260531-agentic-memory-v1-foundation.md`.
**Companion ADR-lite (this packet):** `docs/decisions/20260601-agentic-memory-v1-dry-run-plan.md`.
**Phase mapping:** AM-1 §10 → Phase 1 (dry run on dev DB). This document specifies *what Phase 1 would look like*; **executing Phase 1 requires a separate, explicit Anton approval beyond the merge of this PR**.

---

## 0. One-paragraph summary

AM-1 §10 Phase 1 is a **read-only, repo-only, no-DB-write dry run** that reads a fixed allowlist of files and GitHub-API endpoints, classifies them into the `memory_*` row shapes proposed in AM-1 §3, and emits a structured report to disk for operator review. It does not create any database, run any migration, install any dependency, or import any external content (no Drive, no accounting, no client uploads). This document specifies, exactly, the input set, the per-source field map, the output format, the rollback story (trivially no-op since no state is touched), the verification method, and the explicit approval gate before any Phase 2 (DB migration on dev) can begin. **No code is added in this PR.**

---

## 1. Why this plan exists

AM-1 §10 sketched seven gated phases. Phase 1 is the smallest possible step that produces real evidence that:

- the source allowlist is implementable (paths, globs, GitHub endpoints all resolve);
- the `memory_*` field mapping is sound (every required column has a known source value);
- the secret-scrubber catches plausible-leak patterns before they enter any persistence layer;
- the operator can read the dry-run output and decide whether the schema fits before any Prisma migration is written.

Without this plan, the next step would either be "write the script and hope" (rejected — the schema review would happen mid-run) or "open a Prisma migration" (rejected by Decision 5 — not yet approved). This packet writes the plan first and leaves the script for a separate gate.

---

## 2. What this PR adds, and what it explicitly does NOT do

**This PR adds:**
- `docs/operations/AGENTIC_MEMORY_V1_DRY_RUN_PLAN.md` (this file).
- `docs/decisions/20260601-agentic-memory-v1-dry-run-plan.md` (companion ADR-lite).
- One JOURNAL row `JE-2026-06-01-2` (renumbered from `JE-2026-06-01-1` after the ERPNext Phase B-a closure PR #275 merged earlier the same day and claimed `JE-2026-06-01-1`).

**This PR does NOT change:**
- `prisma/schema.prisma` — no model added; no `memory_*` table created.
- `package.json`, `package-lock.json`, dependencies — none.
- Any runtime code under `pages/`, `api/`, `lib/`, `components/`, `scripts/`.
- Any GitHub Actions workflow, CI configuration, or required-check.
- Any `.env*` file, secret, or env var (no new placeholders, no rename).
- Any DNS / Vercel / Plausible / Telegram / Search Console / GitHub-settings configuration.
- Any tenant or factory data; no rows read at runtime; no rows written.
- Any client-facing surface (`/`, `/lead-rescue`, `/change`, Lux, etc.).

**Out of scope by parent decisions (still HELD):**
- Google Drive content of any kind (Decision 2 — HOLD).
- Accounting / FreshBooks / invoice bodies (Decision 3 — HOLD).
- Client raw uploads / shared docs / per-client folder content.
- Secrets / env / OAuth tokens / API keys.
- CMP ticket bodies that may contain tenant PII (deferred to v1.1 with per-tenant gate).
- Telemetry / automation event bodies (deferred to v1.1 with retention window decision).
- Email bodies in the n8n register (HELD).

---

## 3. Exact repo-derived sources to include

The dry run admits **only** the following sources. Anything not listed is excluded by default. Counts and sizes shown for sizing reference (observed 2026-06-01).

### 3.1 Local-repo sources (file system)

| Source class | Path glob (anchored at repo root) | Count | Size estimate | Notes |
|---|---|---|---|---|
| Operations docs | `docs/operations/**/*.md` | 23 (includes this file once merged) | ≈ 250 KB | excludes `*.bak`, `*.draft` |
| Strategy docs | `docs/strategy/**/*.md` | 1 | ≈ 18 KB | |
| Marketing doctrine + execution standards | `docs/marketing/**/*.md` | 12+ | ≈ 280 KB | includes the 6 standards docs from PR #256 |
| ADR-lite + JOURNAL + README | `docs/decisions/**/*.md` | 7 (including this packet's ADR + AM-1 ADR) | ≈ 90 KB | `JOURNAL.md` is ingested as one document but rows are also extracted into `memory_decisions` |
| Runbooks | `docs/runbooks/**/*.md` | growing | varies | flagged as `kind=runbook` in `memory_runbooks` |
| Compliance docs | `docs/compliance/**/*.md` | 1 | ≈ 12 KB | |
| Communications doctrine | `docs/communications/**/*.md` | 1 | ≈ 25 KB | |
| Execution / packet docs | `docs/execution/**/*.md` | growing | varies | covers AAP, autonomy framework, packet standard |
| Misc top-level docs | `docs/*.md` | 4 (`CORPFLOW_SHARED_TODO.md`, `EXECUTION_BRAIN_VS_HANDS.md`, `automation-framework.md`, `VERCEL_DEPLOYMENT.md`) | ≈ 180 KB | no recursion beyond this depth |
| Chat history | `artifacts/chat_history.md` | 1 | ≈ 165 KB at last count | append-only operator log |
| Visual asset manifests | `data/visual-assets/*.manifest.json` | growing | varies | parsed JSON, not raw bytes |
| Walkthrough YAML | `data/walkthroughs/**/*.yml` | 1 (LR-Proof-2 v1) | small | walkthrough script + provenance |
| Walkthrough provenance | `public/assets/video/lead-rescue/*.provenance.json` | 1 | small | metadata only (filename, SHA, captions); the MP4/VTT bytes are NOT ingested |
| n8n recipe docs | `docs/n8n/**/*.md` | 2 | ≈ 30 KB | |

**Total estimated repo footprint admitted to the dry run: ≈ 1.5 MB** (well under the 5 MB ceiling named in AM-1 §5).

**Excluded from the dry run by glob:**
- `node_modules/**`, `.next/**`, `.git/**`, `coverage/**`, `dist/**`, `build/**`, `.smoke-screenshots/**`, `public/assets/video/**/*.mp4`, `public/assets/video/**/*.vtt`, `public/assets/fonts/**`, `prisma/migrations/**` (kept for AM-1 v1.x — not v1).

### 3.2 GitHub-API sources (read-only)

GitHub access uses a **read-only, repo-scoped** token. The token is **not** in this PR. When Phase 1 is approved, the token classification becomes a separate small ADR (per AM-1 §2 row "GitHub PR metadata").

| Source class | Endpoint | Volume cap | Notes |
|---|---|---|---|
| PR metadata | `GET /repos/{owner}/{repo}/pulls?state=closed&per_page=100` (paged) | last 50 closed PRs only | title, body, labels, head/base, merge SHA, mergedAt, files-changed list (`pulls/{n}/files`) |
| PR delivery audits | scan PR bodies for `Delivery Reality Audit:` block | from the same 50-PR window | extracted as a structured sub-document |
| Operator Bridge thread | `GET /repos/{owner}/{repo}/issues/249` + `/issues/249/comments?per_page=100` (paged) | full history of issue #249 | metadata + bodies; bodies are scrubbed for secrets |

**GitHub-API hard limits:**
- Method ⊆ `{GET}` only. **No** `POST`, `PATCH`, `DELETE`, `PUT`.
- Endpoint allowlist is fixed in the script's source; the script aborts if asked to fetch any endpoint outside the allowlist.
- One run; no continuous polling; no webhook installation; no GitHub App creation.
- Rate-limit-aware; if exhausted, the run aborts and the partial output file is marked `partial=true` for operator review.

### 3.3 What is **never** read by this dry run

- Any path matching `**/*.env*`, `**/.env`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `id_*` (private keys), `*.kdbx`.
- Any external service: Google Drive, FreshBooks, Wise, PayPal, Stripe, Telegram, Plausible, Search Console, n8n's Postgres / Gmail OAuth, the production CorpFlow Postgres (`POSTGRES_URL`).
- Any `corpflow-exec-01` filesystem (no SSH calls during the dry run).
- Any tenant database row or any client folder.

---

## 4. Exact fields to ingest per source

Field names use the AM-1 §3 schema. Every column must have either a deterministic source (filesystem / GitHub API field) or a clearly-marked `null`. **No invented values.**

### 4.1 `memory_sources` (one row per source class on first run)

Populated from the §3.1 + §3.2 allowlist. 15 rows on day one (matching the AM-1 §1 inventory).

| Column | Source |
|---|---|
| `source_id` | slug from §3 row, e.g. `repo:docs/operations`, `repo:artifacts/chat_history`, `github:pr-metadata`, `github:bridge-249` |
| `class` | one of `markdown_doc`, `markdown_log`, `json_manifest`, `yaml_walkthrough`, `github_pr`, `github_issue_thread` |
| `display_name` | human label |
| `is_held` | `false` for these classes; HELD classes (Drive, accounting) **never** appear here |
| `description` | one-line provenance |

### 4.2 `memory_documents` (one row per file or PR or issue)

| Column | Source |
|---|---|
| `document_id` | UUID v4 generated by the dry-run script |
| `source_id` | FK to §4.1 row |
| `external_ref` | for files: repo-relative path (e.g. `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md`); for PRs: `pr:{number}`; for issue comments: `issue:{number}/comment:{id}` |
| `title` | for markdown: first H1 line; for JSON manifest: `name` field if present, else filename; for PR: PR title; for issue: issue title |
| `content_sha256` | SHA-256 of the canonicalised content (LF-normalised, trailing whitespace stripped, BOM stripped) |
| `byte_size` | length of canonicalised content |
| `imported_at` | ISO-8601 UTC at dry-run time |
| `last_seen_at` | same as `imported_at` for the first run |
| `superseded_by_document_id` | always `null` on first run |
| `metadata` | JSON: for markdown — `{frontmatter,headings_count,first_h1}`; for PR — `{state,merged_at,merge_sha,head_branch,base_branch,labels}`; for issue comments — `{author,posted_at,executor,decision_marker}` |
| `provenance` | JSON: `{collected_at, collector_version, allowlist_entry, github_api_etag (for GitHub sources)}` |

### 4.3 `memory_chunks` (deterministic chunker, no embeddings)

| Column | Source |
|---|---|
| `chunk_id` | UUID v4 |
| `document_id` | FK |
| `chunk_index` | 0-based per document |
| `text` | substring of the canonicalised body produced by the chunker (§5) |
| `token_estimate` | `gpt-3.5`-tokenizer estimate (deterministic, library-version-pinned in the future script) |
| `headings_path` | array of nearest-ancestor heading texts, e.g. `["AM-1","§3 Schema","memory_documents"]` |
| `created_at` | ISO-8601 UTC |

**Chunker policy (proposed):** headings-aware, **800-token soft cap**, no overlap, do not split inside a fenced code block or inside a markdown table. Chunks shorter than 50 tokens are merged with the next chunk under the same heading.

### 4.4 `memory_decisions` (one row per ADR + per JOURNAL row + per `### DECISION` bridge comment)

| Column | Source |
|---|---|
| `decision_id` | for ADR: filename slug (`20260531-agentic-memory-v1-foundation`); for JOURNAL row: the `JE-YYYY-MM-DD-n` cell; for bridge: `bridge-249-comment-{id}` |
| `kind` | `adr` \| `journal` \| `bridge_decision` |
| `summary` | first sentence of the body |
| `decided_at` | parsed date from the row/file |
| `decided_by` | "Anton" / "Assistant (Cursor)" / "Anton + Assistant (Cursor)" / GitHub login for bridge |
| `reversibility` | last column of JOURNAL rows; "Reversibility" section text for ADRs |
| `document_id` | FK to the parent `memory_documents` row |

### 4.5 `memory_prs` (one row per closed PR in the 50-PR window)

| Column | Source |
|---|---|
| `pr_number` | PR number |
| `title`, `state`, `merged_at`, `merge_commit_sha`, `head_branch`, `base_branch`, `author`, `labels` | PR API fields |
| `files_changed` | `pulls/{n}/files` response — array of `{path, additions, deletions, status}` |
| `delivery_audit_text` | extracted text between `Delivery Reality Audit:` and the next blank line / closing fence; `null` if not present |
| `document_id` | FK |

### 4.6 `memory_delivery_audits`

Parsed from `delivery_audit_text` using a strict regex:

| Column | Regex hook |
|---|---|
| `verdict` | `Final verdict:\\s*(COMPLETE\|PARTIAL\|FAILED)` |
| `commit_deployed` | `Commit deployed:\\s*([a-f0-9]{7,40})` |
| `production_deployment_id` | `Production deployment ID:\\s*([A-Za-z0-9_\\-]+)` |
| `live_urls_tested` | text after `Live URLs tested:` until the next bullet/newline; split on whitespace + commas |
| `expected_vs_actual` | text after `Expected vs actual result:` until the next bullet |
| `client_facing_flow_usable` | `Client-facing flow usable:\\s*(YES\|NO)` |
| `recorded_at` | PR `merged_at` |

If the regex fails on a row, the row is **skipped**, the PR keeps its `delivery_audit_text` raw, and the run reports the parse miss in §5.3.

### 4.7 `memory_bridge_threads` and `memory_bridge_comments`

One thread row for issue #249. Comments mapped 1:1 from `/issues/249/comments` with author, posted_at, body_sha256, executor (parsed from a `**Executor:**` line if present), decision_marker (`true` if body contains `### DECISION`).

### 4.8 `memory_marketing_atoms`, `memory_visual_assets`, `memory_walkthroughs`, `memory_runbooks`, `memory_transaction_refs`

- Marketing atoms: **0 rows** on first run — `docs/marketing/atoms/` does not exist yet (per JE-2026-05-28-4 footnote).
- Visual assets: one row per `data/visual-assets/*.manifest.json` (id, kind, licence, usage_slots, provenance).
- Walkthroughs: one row per walkthrough YAML (id, status, mp4_path, vtt_path, provenance).
- Runbooks: one row per `docs/runbooks/*.md`.
- Transaction refs: **0 rows** on first run — accounting bodies are HELD; metadata-only model is reserved but not populated.

### 4.9 `memory_query_log`

The dry run does not query memory; this table is **not populated** by Phase 1.

---

## 5. Dry-run output format

The dry run writes **only to the local filesystem**, into a fresh, gitignored output directory. **No database write of any kind.**

### 5.1 Output location and shape

```
.am1-dry-run/
  YYYYMMDD-HHMMSS/
    summary.md                  # operator-facing report (human-readable)
    report.json                 # machine-readable, full structure
    sources.csv                 # one row per memory_sources row
    documents.csv               # one row per memory_documents row
    chunks.csv                  # one row per memory_chunks row
    decisions.csv               # one row per memory_decisions row
    prs.csv                     # one row per memory_prs row
    delivery_audits.csv
    bridge_threads.csv
    bridge_comments.csv
    visual_assets.csv
    walkthroughs.csv
    runbooks.csv
    warnings.log                # secret-scrubber hits, parse misses, rate-limit retries
    run.manifest.json           # parameters, durations, counts, host info, allowlist hash
```

`.am1-dry-run/` is added to `.gitignore` **at execution time** (a one-line edit guarded by the same approval that authorises Phase 1; not in this PR).

### 5.2 `report.json` top-level keys

```json
{
  "run_id": "uuid",
  "started_at": "ISO-8601 UTC",
  "ended_at": "ISO-8601 UTC",
  "git_head_sha": "main HEAD at run time",
  "allowlist_sha256": "hash of the embedded allowlist",
  "tool_version": "scripts/agentic-memory/dry-run-import.mjs commit SHA",
  "counts": { "memory_sources": 15, "memory_documents": "...", "...": "..." },
  "warnings": { "secret_scrubber_hits": 0, "parse_misses": 0, "rate_limit_retries": 0 },
  "github_api": { "requests": "...", "rate_limit_remaining_at_end": "..." },
  "no_db_writes": true,
  "no_external_writes": true,
  "no_secrets_persisted": true
}
```

### 5.3 `summary.md` operator-facing report

A concise markdown file with:
- counts per `memory_*` table (matching what *would* land in v1 if Phase 4 were approved);
- top 10 largest `memory_documents` rows;
- a list of any document whose secret scrubber flagged a line (counts only; the lines themselves are **not** included in the summary);
- a list of PRs whose `delivery_audit_text` failed to parse;
- a "schema fit" panel that reports any column the dry run could not populate from the chosen sources.

### 5.4 Secret scrubber

The dry run runs every body through a deterministic scrubber **before** any persistence. The scrubber:

- Detects lines matching the case-insensitive pattern `(secret|token|password|api[_-]?key|bearer|authorization|x-api-key|access[_-]?key|private[_-]?key)\\s*[:=]`.
- Detects values matching `[A-Za-z0-9_\\-]{32,}` adjacent to such labels.
- **Replaces** the matched line with `[REDACTED:secret-scrubber:rule-{n}]` before chunking and writing.
- Emits a warning row in `warnings.log` recording `(document_id, line_offset, rule_id)` — never the matched bytes.

If the scrubber finds anything in the repo dry run, that is itself a finding: the operator should triage what the input is. Drive / accounting are not in scope, so any positive hit is in repo content.

---

## 6. Hard guarantees

The dry run is engineered to be **provably no-op** in every external surface that matters.

| Guarantee | How it is enforced |
|---|---|
| No production DB write | the script imports zero database libraries (no `@prisma/client`, no `pg`, no `mysql`); `package.json` is unchanged in Phase 1 |
| No production DB read | `POSTGRES_URL` is not read by the script; `.env*` files are excluded from the source allowlist |
| No external write | only HTTP method `GET` is used; the script aborts on any other method |
| No secrets persisted | secret scrubber runs before chunking; warnings record offsets only |
| No Drive / accounting / client content | not in the source allowlist; the script aborts if the allowlist is modified at runtime |
| No autonomous agent | the script is a one-shot CLI with deterministic exit on completion; it does not poll, schedule, or invoke any LLM |
| No vector store | no embedding library is imported; the schema does not include an `embedding` column at this phase |
| No DNS / Vercel / GitHub-settings change | none of those clients are imported |
| Rollback | delete `.am1-dry-run/` directory; no other state to revert |
| No-op on re-run | the same input produces the same `content_sha256` per document; if `report.json` already exists for the run timestamp, the script aborts rather than overwrite |

---

## 7. Verification method (what operator checks before approving Phase 2)

Operator (Anton) reviews `.am1-dry-run/<timestamp>/summary.md` and confirms:

1. **Counts look right.** `memory_sources = 15`; `memory_documents` is in the 200–400 range matching the repo + GitHub window; `memory_chunks` is bounded by the 800-token chunker policy.
2. **No secret-scrubber hits**, or, if there are hits, the operator decides whether to extend the allowlist exclusion or scrub the source.
3. **No parse misses on Delivery Reality Audit blocks** for PRs that should have one (post-PR-#251 era).
4. **`schema fit` panel is empty** — every column had a source.
5. **Spot-check 5 random documents** by grep-comparing `documents.csv` `external_ref` against the actual file content.
6. **`run.manifest.json` shows** `no_db_writes: true`, `no_external_writes: true`, `no_secrets_persisted: true`.

If any of (1)–(6) fails, Phase 1 is iterated; Phase 2 (Prisma migration on dev) cannot start until all six pass.

---

## 8. Operator approval gate (explicit)

Merging this PR **does not** authorise execution. Phase 1 execution requires:

1. A separate code PR adding `scripts/agentic-memory/dry-run-import.mjs` plus the one-line `.gitignore` edit. **Not in this PR.**
2. An explicit Anton DECISION on Operator Bridge #249 reading approximately: *"Decision 5 — dry-run import: APPROVED for the script described in `docs/operations/AGENTIC_MEMORY_V1_DRY_RUN_PLAN.md`."*
3. The dry-run script PR's CI must include a smoke test that proves the GitHub-API allowlist is enforced and that the secret scrubber rejects a synthetic positive case. (Test plan, not test code, lives here.)
4. After execution, Anton reviews `summary.md` per §7. Phase 2 is its own packet, opened only after Phase 1 passes review.

If any of these four steps is incomplete, **the dry run does not run**.

---

## 9. Phase mapping (where this packet sits)

| AM-1 §10 phase | Status after this PR |
|---|---|
| Phase 0 — proposal | **DONE** (PR #274 merged, commit `a49c2c47`) |
| Phase 1 — dry run on dev DB | **plan-only documented here**; *execution NOT YET approved* |
| Phase 2 — Prisma migration on dev | **gated**; depends on Phase 1 review |
| Phase 3 — first agent retrieval | gated |
| Phase 4 — production migration | gated; full Delivery Reality Audit |
| Phase 5 — embeddings (v1.1) | gated |
| Phase 6 — telemetry / CMP bodies (v1.2) | gated |
| Phase 7 — Drive / accounting bodies | gated; per-source decisions |

This PR is **strictly Phase-1-plan**; it does not advance any other phase.

---

## 10. Open questions for the next gate (do NOT block this PR)

1. **GitHub token classification.** Read-only repo-scope is the only acceptable choice; the token storage decision (Vercel env vs operator-only `.env.local`) is a small ADR before Phase 1 executes. Default proposal: operator-only `.env.local`, never committed, never in Vercel.
2. **Output retention.** How long do `.am1-dry-run/<timestamp>/` directories live on Anton's machine before they are deleted? Default proposal: kept until Phase 2 ships, then archived to a single tarball outside the repo and the live directory is deleted.
3. **Chat-history scope.** `artifacts/chat_history.md` is a single 165 KB file today. Is the dry run authorised to read it? Default proposal: yes — it is already in-repo and explicitly referenced as an AM-1 candidate source. Anton can opt out by listing it in a `dry-run-deny.txt` placed alongside the script.
4. **PR window size.** 50 closed PRs is a deliberately small first window. Should the dry run also include the 7 currently-open PRs? Default proposal: yes — no extra cost; clearer "what's in flight" signal.
5. **Operator Bridge thread cap.** Issue #249 has > 50 comments today. Default proposal: full thread is in scope; if the count exceeds 500 in the future, paginate at 500 and require operator opt-in for the remainder.

These are decided at the next gate, not at the merge of this PR.

---

## 11. Verification of this PR (docs-only)

- `npm run check:marketing-quality-gate`: expected green (no marketing standards docs touched).
- `npm test`: expected green (no code change).
- Lints: clean.
- Delivery reality (`.cursor/rules/delivery-reality.mdc` § docs-only): completion criterion = "merged on `main`" with no live customer-facing URL to probe by design. Production verification N/A.
