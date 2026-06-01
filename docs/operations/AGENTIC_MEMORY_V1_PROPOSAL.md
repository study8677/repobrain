# Agentic Memory v1 — proposal (docs-only)

**Status:** PROPOSED — docs-only review. **No** runtime, schema, migration, import, embedding, vector store, Drive/accounting/client content, autonomous agent, secrets, env, provider, or server-setting changes are authorised by this PR. Any future implementation requires a separate Anton approval per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.

**Date opened:** 2026-05-31 (UTC).
**Operator Bridge thread:** [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
**Parent decisions:**
- DECISION 4581634391 (2026-05-30) — weekend instruction authorising read-only research/audit.
- DECISION 4585482069 (2026-05-31) — accepts the AM-1 first STATUS and approves this docs-only PR.
**Companion ADR-lite:** `docs/decisions/20260531-agentic-memory-v1-foundation.md`.

---

## 0. One-paragraph summary

CorpFlow's institutional memory currently lives in many places (this repo, GitHub, an Operator Bridge issue, the Drive, accounting, client folders, ad-hoc operator notes) and is **only retrievable by humans reading them**. AM-1 is a phased proposal to build a single **agent-readable** memory backed by Postgres (Neon, the only approved provider per `docs/operations/POSTGRES_PROVIDER.md`), starting with an **import-only, repo-scoped, no-embeddings** dry run and growing in small gated steps. Drive, accounting, and client-sensitive material are explicitly **HELD** until a separate per-source decision. This document is the schema and policy review surface; nothing in this PR ships code, secrets, or DB changes.

---

## 1. Source inventory (what exists today, where, how big, who owns it)

Numbers below are observed at the time of writing (2026-05-31). They are an inventory, not an import target.

| # | Class | Location | Volume | Sensitivity | Update cadence | Owner |
|---|---|---|---|---|---|---|
| 1 | In-repo markdown docs | `docs/`, `artifacts/` | **142 files**, **≈ 1.48 MB** | low | per commit | repo / agents |
| 2 | Chat history log | `artifacts/chat_history.md` | **≈ 164 KB**, 318 lines | low | manual append per session | agents per `.cursor/rules/chat-history-cadence.mdc` |
| 3 | ADR-lite + JOURNAL | `docs/decisions/` | 6 files (5 ADRs + JOURNAL + README) | low | per decision | repo |
| 4 | Operator Bridge thread | GitHub issue #249 | **54 comments** at last count, growing | low–medium (operator ops) | weekly / per packet | GitHub |
| 5 | PR metadata + delivery audits | GitHub PRs | **265 closed**, **7 open** at last count | low–medium | per PR | GitHub |
| 6 | Marketing doctrine | `docs/marketing/` (incl. `BRAND_AND_CONVERSION_DOCTRINE.md`, 6 standards docs from PR #256) | ~12 files | low | rare | repo |
| 7 | Visual asset manifests | `data/visual-assets/*.manifest.json` | growing | low | per asset | repo |
| 8 | Walkthrough YAML / MP4 / VTT / provenance | `data/walkthroughs/`, `public/assets/video/` | LR-Proof-2 v1 set | low | per walkthrough | repo |
| 9 | Strategy + production-grade docs | `docs/strategy/` | 1 canonical doc | low | rare | repo |
| 10 | Compliance / data map | `docs/compliance/` | 1 doc | medium (named subprocessors) | per change | repo |
| 11 | Telemetry + automation events (DB) | Postgres `telemetry_events`, `automation_events` | live | medium (operational) | continuous | runtime |
| 12 | CMP tickets + technical-lead audits (DB) | Postgres `cmp_tickets`, `technical_lead_audits` | live | medium | continuous | runtime |
| 13 | Google Drive (CorpFlow + clients) | external | unknown to this audit | **HIGH** (mixed PII / client) | ad-hoc | Anton |
| 14 | Accounting / FreshBooks / invoices | external (FreshBooks etc.) | unknown to this audit | **HIGH** (financial PII) | per invoice | Anton |
| 15 | Client manual uploads / shared docs | mixed (Drive, email, attachments) | unknown | **HIGH** (per-client) | ad-hoc | Anton |

**Cross-check vs the first STATUS:** the first STATUS estimated 201 markdown files ≈ 1.6 MB across the whole repo (including `node_modules`-adjacent and root-level READMEs). The narrower number above (142 / 1.48 MB) is the directory-scoped count for `docs/` + `artifacts/` only — the candidate first-import surface. Both views are correct; the smaller scope is what AM-1 v1 actually plans to admit.

---

## 2. Data classification (what may eventually be admitted, and what stays out)

Each row below is a policy stance, not a commitment to import.

| Class | Status for AM-1 v1 | Reason | Future-step gate |
|---|---|---|---|
| In-repo markdown (`docs/`, `artifacts/`, `docs/decisions/`, `docs/marketing/`) | candidate | already public-in-repo; low risk | none — covered by this proposal once accepted |
| Chat history (`artifacts/chat_history.md`) | candidate | append-only operator log | none |
| Visual asset manifests + walkthrough YAML | candidate | structured metadata only, no client PII | none |
| ADR-lite + JOURNAL | candidate | high-value decision context | none |
| GitHub PR metadata (title, body, labels, reviewers, files-changed list, merge state, deployment commit) | candidate | factual; no secrets | one ADR addition: GitHub-token classification (read-only, repo scope) |
| Operator Bridge #249 comments (metadata + bodies) | candidate | operator decisions, not client content | same GitHub-token gate |
| Telemetry + automation event headers (event type, timestamp, ticket id) | **deferred to v1.1** | needs schema design for time-series window | separate ADR before any DB import |
| CMP ticket bodies | **deferred to v1.1** | may contain tenant PII; need per-tenant policy | separate ADR + tenant gate |
| Email bodies (n8n register) | **HELD** | client PII | per-event policy + retention limit before any import |
| Google Drive content | **HELD** (Decision 2 of parent DECISION) | mixed PII / client / financial | per-folder allowlist + DLP pass before import |
| Accounting / transactional bodies | **HELD** (Decision 3) | financial PII; metadata-only model allowed | metadata-only schema is OK; bodies require separate decision |
| Client raw uploads / attachments | **HELD** | per-client scope undefined | separate per-tenant decision |
| Secrets / env / API keys / passwords | **NEVER** | obvious | n/a |

The HELD set is **never** imported by AM-1 v1. The proposal models `memory_transaction_refs` as a metadata pointer only — it stores ticket id, currency, amount, timestamp, status, and source-system reference, but **never** invoice bodies, line items, banking details, or customer card data.

---

## 3. Proposed `memory_*` schema (concept-level — no migration in this PR)

Naming follows Prisma snake_case convention used throughout `prisma/schema.prisma`. Field types are sketches; the actual Prisma model would add `@id`, `@unique`, `@@index`, and `created_at`/`updated_at` defaults consistent with existing models. **No migration is proposed by this PR.**

### 3.1 Tables

1. **`memory_sources`** — one row per known source class (15 rows on day one, matching the inventory).
   - Columns: `source_id` (text PK), `class` (text), `display_name` (text), `is_held` (bool), `description` (text), `created_at`, `updated_at`.
2. **`memory_documents`** — top-level units (1 doc = 1 markdown file, 1 GitHub issue, 1 PR, 1 chat history append, 1 walkthrough YAML, etc.).
   - Columns: `document_id` (uuid PK), `source_id` (FK), `external_ref` (text — repo path / PR number / issue+comment id / etc.), `title` (text), `content_sha256` (text), `byte_size` (int), `imported_at` (timestamptz), `last_seen_at` (timestamptz), `superseded_by_document_id` (uuid nullable), `metadata` (jsonb), `provenance` (jsonb).
3. **`memory_chunks`** — chunked text for retrieval (e.g. ~1000-token windows, deterministic chunker, no embeddings yet).
   - Columns: `chunk_id` (uuid PK), `document_id` (FK), `chunk_index` (int), `text` (text), `token_estimate` (int), `headings_path` (text[]), `created_at`.
4. **`memory_decisions`** — one row per ADR-lite + journal entry (link, not copy).
   - Columns: `decision_id` (text PK — e.g. `JE-2026-05-31-1` or ADR filename slug), `kind` (`adr` | `journal` | `bridge_decision`), `summary` (text), `decided_at` (date), `decided_by` (text), `reversibility` (text), `document_id` (FK to `memory_documents`).
5. **`memory_prs`** — GitHub PR metadata.
   - Columns: `pr_number` (int PK), `title`, `state`, `merged_at`, `merge_commit_sha`, `head_branch`, `base_branch`, `author`, `labels` (text[]), `files_changed` (jsonb), `delivery_audit_text` (text — quoted from PR body if present), `document_id` (FK).
6. **`memory_delivery_audits`** — distilled `Delivery Reality Audit:` blocks.
   - Columns: `audit_id` (uuid PK), `pr_number` (FK), `verdict` (`COMPLETE` | `PARTIAL` | `FAILED`), `commit_deployed`, `production_deployment_id`, `live_urls_tested` (text[]), `expected_vs_actual` (text), `client_facing_flow_usable` (bool), `recorded_at`.
7. **`memory_bridge_threads`** — long-lived coordination issues (e.g. #249).
   - Columns: `thread_id` (int PK = issue number), `title`, `state`, `last_indexed_comment_id` (bigint), `metadata` (jsonb), `document_id` (FK).
8. **`memory_bridge_comments`** — individual comments on bridge threads.
   - Columns: `comment_id` (bigint PK), `thread_id` (FK), `author`, `posted_at`, `body_sha256`, `executor` (text — e.g. `Cursor`, `anton-via-chatgpt`, `Codex Cloud`), `decision_marker` (bool — true if comment text contains `### DECISION`), `document_id` (FK).
9. **`memory_marketing_atoms`** — future home for `CF-MKT-NNNN` content atoms (PR #256 schema).
   - Columns: `atom_id` (text PK), `kind` (`offer` | `proof` | `hook` | `cta` | `caption` | …), `payload` (jsonb), `document_id` (FK), `created_at`, `superseded_by_atom_id` (text nullable).
10. **`memory_visual_assets`** — index over `data/visual-assets/*.manifest.json`.
    - Columns: `asset_id` (text PK), `kind` (text), `licence`, `usage_slots` (text[]), `provenance` (jsonb), `document_id` (FK).
11. **`memory_walkthroughs`** — index over walkthrough YAML + generated MP4/VTT.
    - Columns: `walkthrough_id` (text PK), `status`, `mp4_path`, `vtt_path`, `provenance` (jsonb), `document_id` (FK).
12. **`memory_runbooks`** — `docs/runbooks/` and `docs/operations/` files flagged as runbook.
    - Columns: `runbook_id` (text PK = path), `title`, `surface` (text — e.g. `factory`, `tenant`, `analytics`), `last_reviewed_at`, `document_id` (FK).
13. **`memory_query_log`** — every retrieval query an agent runs.
    - Columns: `query_id` (uuid PK), `agent_id` (text), `prompt` (text), `top_k_returned` (int), `document_ids` (uuid[]), `tokens_returned` (int), `recorded_at`.
14. **`memory_transaction_refs`** — **METADATA ONLY** placeholder for the eventually-allowed accounting layer.
    - Columns: `ref_id` (text PK), `system` (text — e.g. `freshbooks`), `external_id`, `currency`, `amount_minor` (int), `status`, `dated_at`, `linked_ticket_id` (text nullable), `document_id` (nullable). **No bodies, no line items, no PII fields.**

### 3.2 Indexes (sketch)

- `memory_documents (source_id, external_ref)` unique.
- `memory_documents (content_sha256)` for dedup.
- `memory_chunks (document_id, chunk_index)` unique.
- `memory_decisions (decided_at desc)`.
- `memory_prs (merged_at desc)`, `memory_prs (state)`.
- `memory_bridge_comments (thread_id, posted_at desc)`.
- `memory_query_log (agent_id, recorded_at desc)`.

### 3.3 What this schema deliberately does NOT include

- **No `embedding` column** anywhere. Vector retrieval is a separate v1.x decision; it would add `pgvector` + a model choice + a re-embed cadence.
- **No raw email body, no Drive blob, no client attachment storage.**
- **No tenant PII fields** beyond what is already in source rows we link to.
- **No factory secret material**, automation tokens, or webhook bodies.

---

## 4. Hold-list (explicitly out of scope for v1)

Per Decisions 2 + 3 of the parent DECISION:

- **Google Drive content** — file bodies, metadata-by-file, per-client folder migrations. Future approval must name folders.
- **Accounting bodies** — invoice PDFs, line items, payment instruments, banking info. Metadata-only model is allowed (`memory_transaction_refs`) but no body import.
- **Client raw uploads** — attachments, manual emails, shared docs.
- **Secrets / env / OAuth tokens** — never in any memory table.
- **CMP ticket bodies** with potential tenant PII — deferred to v1.1 with a per-tenant gate.
- **Telemetry / automation event bodies** — deferred to v1.1 with a retention window decision.

---

## 5. Safe first import — what the dry run *would* admit (NOT YET APPROVED)

Anton's Decision 5 explicitly **does not yet approve** any dry run. This section is a *plan* for the next gate — it is what we would propose **after** schema review.

**Import set (estimated total < 5 MB):**
- `docs/**/*.md` and `artifacts/chat_history.md` — covered by `memory_documents` + `memory_chunks`.
- `docs/decisions/*.md` and the JOURNAL rows — covered by `memory_decisions`.
- GitHub PR metadata for the most recent N (≈ 50) closed PRs — title, body, files-changed list, merge commit, deployment commit if recorded, and any `Delivery Reality Audit:` block — covered by `memory_prs` + `memory_delivery_audits`.
- Operator Bridge #249 metadata + comment bodies — covered by `memory_bridge_threads` + `memory_bridge_comments`.
- Visual asset manifests + walkthrough YAML provenance — covered by `memory_visual_assets` + `memory_walkthroughs`.

**Hard limits on the dry run (when approved):**
- Read-only against external sources; no GitHub writes, no Drive access, no accounting access.
- A single one-shot script lives in `scripts/agentic-memory/dry-run-import.mjs` (path is a placeholder; the script is **not** in this PR).
- Output writes to a **separate Postgres database/schema** (e.g. Neon `corpflow_memory_dev`) that is not used by any production runtime.
- Rollback = drop the dev schema; no production state touched.

---

## 6. Retrieval use cases (the why)

A representative first set of seven queries an agent should be able to answer locally without scrolling chat:

1. *"Show every decision about Lead Rescue pricing or payment in the last 30 days."*
   - Shape: `memory_decisions` joined to `memory_documents` on `decided_at >= now() - interval '30 days'` and `summary ILIKE '%lead rescue%'` + path filter for `lr-` ADRs and chat-history bullets.
2. *"List all PRs that touched `pages/_document.js` and report their delivery verdicts."*
   - Shape: `memory_prs` joined to `memory_delivery_audits` filtering `files_changed @> '[{"path":"pages/_document.js"}]'`.
3. *"What is the canonical Postgres provider rule, and where is the playbook?"*
   - Shape: `memory_documents` content search inside `docs/operations/POSTGRES_PROVIDER.md` and the AGENTS.md row that references it.
4. *"Has anyone decided whether OBS is still a fallback for walkthrough video?"*
   - Shape: `memory_decisions` + `memory_documents` text-search across `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` and the chat-history entry that retired it.
5. *"What did Anton instruct on Drive scope this weekend, and is the instruction still active?"*
   - Shape: `memory_bridge_comments` filtered by `thread_id=249` and `decision_marker=true`, ordered by `posted_at desc`.
6. *"What is the current AM-1 schema proposal status, and which ADR captures the foundation decision?"*
   - Shape: `memory_documents` for `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` joined to `memory_decisions` via the ADR slug.
7. *"List every visual asset whose manifest claims `licence: ai_generated`."*
   - Shape: `memory_visual_assets` filter on the manifest licence field.

Retrieval in v1 is **lexical** (Postgres full-text + `ILIKE`). Embeddings come in a later packet.

---

## 7. Privacy and security risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Accidental import of a HELD class (Drive / accounting / client uploads) | low if the dry run script is allowlist-driven | dry run reads only from a fixed allowlist of repo paths + GitHub repo scope; HELD sources are not even reachable from the script |
| Content leak through query log | low (queries are operator-only) | `memory_query_log` does not store the response body, only document_ids and token counts |
| Schema drift between proposal and migration | medium | Anton signs off on the schema in this PR before any Prisma migration is written |
| Privileged data in PR bodies (secrets accidentally pasted) | low | dry run filter scrubs lines matching `(?i)(secret|token|password|api[_-]?key)\\s*[:=]` before persistence |
| Cross-tenant leak via CMP ticket import | n/a — CMP bodies are deferred to v1.1 | not imported in v1 |
| Stale memory misleading future agents | medium | `memory_documents.last_seen_at` plus a `superseded_by_document_id` chain; chat-history append rule already covers chronology |
| Increased blast radius if the memory DB is breached | low–medium | the memory DB is segregated from `POSTGRES_URL`; access is least-privilege; no write path from the live app |
| Vendor lock | low | Postgres + jsonb + text only — portable to any Postgres |
| Cost growth | low | < 100 MB projected at v1, well under any Neon free / starter limit |

---

## 8. Dry-run plan (NOT YET APPROVED — for the next gate)

When Anton authorises the dry run separately:

1. Open a code PR adding `scripts/agentic-memory/dry-run-import.mjs` (parameterised: `--source repo|github-prs|bridge-249`, `--dry-run` default).
2. Run against `corpflow_memory_dev` — a separate Neon DB, **not** the production `POSTGRES_URL`.
3. Produce a written report: rows-per-table, total bytes, time, warnings (e.g. PR bodies that tripped the secret scrubber).
4. Anton reviews; if accepted, gate 2 = ship the Prisma migration to **dev only**, repeat dry run on the migrated schema.
5. Production migration is its own separate gate after the dev import is validated.

Each step ships in its own PR with the standard Delivery Reality Audit closure.

---

## 9. Server capacity findings (post-upgrade)

Probe ran 2026-05-31 22:47 UTC against `root@5.78.213.185` using the existing configured ed25519 key (`~/.ssh/id_ed25519`), with the read-only allowlist Anton specified in DECISION 4585482069 (Decision 1). Hard limits respected: no deletes, no installs, no service restarts, no setting changes.

| Metric | Value |
|---|---|
| Hostname | `corpflow-exec-01-u69678` |
| OS / kernel | Ubuntu 24.04 / `6.8.0-117-generic` x86_64 |
| vCPU | **4** |
| RAM total | **7,751 MiB (≈ 7.6 GiB)** |
| RAM used | 1,229 MiB |
| RAM available | 6,521 MiB (84% headroom) |
| Swap | 2,047 MiB total, 0 used |
| Disk `/` | **150 GB**, 9.7 GB used, **135 GB available (7% used)** |
| Boot EFI | 253 MB, 146 K used |
| Docker overlays | 9 active (Elestio at `/opt/elestio`) |
| `/var` size | 20 GB (mostly `/var/lib`, includes Docker layers) |
| `/srv` size | empty |
| `/opt` size | 17 MB total |
| `/root` size | 212 K |

**Interpretation.** The upgraded box is a Hetzner CX32-class machine (4 vCPU / 8 GB RAM / 150 GB SSD). For AM-1 v1 (whose entire footprint is a few MB of repo markdown plus PR / bridge metadata), capacity is **not the constraint**. Even with a future v1.1 that adds `pgvector` embeddings over a larger corpus, the projected footprint stays well under 1 GB. Memory-wise, AM-1 v1 imposes no daemon footprint on this host — the database lives on Neon, not on `corpflow-exec-01`.

**Plan-tier recommendation:** **no change to the server plan tier and no change to the Neon plan tier is required for AM-1 v1.** Re-evaluate when (a) embeddings ship, or (b) bodies of telemetry / automation / accounting are admitted, or (c) a separate weekend packet places the dry-run runner on this box. Per Decision 6, this is a recommendation; Anton confirms or defers as a separate decision.

---

## 10. Implementation phases (proposal — each phase is its own gate)

| Phase | Scope | Approval | Surface affected |
|---|---|---|---|
| **0 — proposal** | this PR | Anton merges docs-only PR | none (docs) |
| **1 — dry run on dev DB** | `scripts/agentic-memory/dry-run-import.mjs`, `corpflow_memory_dev` Neon DB | separate Anton approval | dev-only DB |
| **2 — Prisma migration on dev** | `memory_*` tables on dev | separate approval | dev-only DB |
| **3 — first agent retrieval** | one read-only retrieval CLI (no UI) for the seven queries in §6 | separate approval | local CLI; reads dev DB |
| **4 — production migration** | same `memory_*` tables on production Neon | separate approval, full Delivery Reality Audit | prod DB; no client-facing surface |
| **5 — embeddings (v1.1)** | `pgvector` + chunk embeddings + retrieval ranking | separate ADR + approval | prod DB |
| **6 — telemetry + CMP bodies (v1.2)** | per-source ingest of telemetry / automation / CMP bodies | separate ADR per source | prod DB |
| **7 — Drive / accounting bodies** | per-folder, per-system, with DLP | separate per-source decision per Decision 2/3 | external + prod DB |

Each phase re-applies the standard delivery reality rules (`.cursor/rules/delivery-reality.mdc`).

---

## 11. What this PR does and does not change

**This PR adds:**
- `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` (this file).
- `docs/decisions/20260531-agentic-memory-v1-foundation.md` (companion ADR-lite).
- One JOURNAL row `JE-2026-05-31-1` recording the docs-only proposal landing.

**This PR does NOT change:**
- `prisma/schema.prisma` — no model added, no migration written.
- `package.json`, `package-lock.json`, dependencies — none.
- Any runtime code under `pages/`, `api/`, `lib/`, `components/`, `scripts/`.
- Any `.env*` file, secret, or env var (no new placeholders, no rename).
- Any GitHub Actions workflow.
- Any CI / Vercel / DNS / Plausible / Telegram / Search Console configuration.
- Any tenant or factory data; no rows written; no rows read at runtime.
- Any client-facing surface (`/`, `/lead-rescue`, `/change`, Lux, etc.).

**Verification surface:** `npm test` and the marketing-quality-gate check are expected to pass unchanged (this PR only adds two new docs and appends one journal row — no existing markers, env vars, or code paths are touched).

---

## 12. Open questions that this PR does NOT decide

Listed for the next gate; do not block this docs-only merge.

1. Will `memory_*` tables live on the existing `POSTGRES_URL` Neon database, a separate database within the same Neon project, or a separate Neon project? (Default proposal: separate database within the same project — `corpflow_memory`.)
2. What is the chunker policy — fixed token count, headings-aware, or hybrid? (Default proposal: headings-aware, 800-token soft cap, no overlap.)
3. Who is the first agent consumer — a CLI, an existing CMP route, or a new internal endpoint? (Default proposal: a read-only Node CLI under `scripts/agentic-memory/`.)
4. Cadence of incremental re-import — on every push to `main`, nightly cron, or manual? (Default proposal: manual until v1.x stabilises.)
5. Does the retrieval log (`memory_query_log`) count as telemetry under `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`? (Default proposal: no — it is operator/agent introspection, not customer comms.)
