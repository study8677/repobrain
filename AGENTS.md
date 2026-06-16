<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CorpFlow AI Command Center — agent guide

This repository is the **CorpFlow AI Command Center**: **Next.js** (pages router), **Node** server/API routes, **Prisma** + **Postgres**, CMP/automation under `lib/cmp/` and `lib/automation/`. Ignore the **legacy Python / Antigravity template** section at the bottom unless you are explicitly working in `core/engine/` Python.

## Process (every commit / push)

1. **`docs/CORPFLOW_SHARED_TODO.md`** — § *Base process — commit, push, and documentation*.
2. **`.cursor/rules/commit-push-doc-constraints.mdc`** and **`.cursor/rules/security-sensitive-changes.mdc`** (always on).
3. **`.cursor/rules/delivery-reality.mdc`** and **`.cursor/rules/predeploy-decision-checks.mdc`** — **operational completion** requires **live production** verification; **CI green and merge are not sufficient** to call a customer-facing change done.
4. Security-sensitive edits: **`docs/operations/SECURITY_REVIEW_CHECKLIST.md`**.
5. Buyer-facing marketing, landing, intake, pricing, CTA, productized service, AI Lead Rescue, or visual-design work: **`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`** is mandatory and canonical. Review the change against that doctrine before merge.

**Do not treat as proof of delivery:** local tests only, CI success alone, merge to `main` alone, or `/api/factory/health` (or other internal endpoints) alone when the work affects **client-visible** URLs or flows. Record **deployment ID**, **deployed commit**, **live URLs tested**, and **Delivery Reality Audit** verdict (**COMPLETE / PARTIAL / FAILED**) per the rules above.

## Marketing / conversion doctrine

When work touches public marketing pages, landing pages, intake pages, pricing presentation, CTA wording, productized service offers, AI Lead Rescue, buyer-facing copy, or buyer-facing visual design, read and apply:

- **`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`** — brand / conversion doctrine (single offer rule, route after intent, AI Lead Rescue specifics).
- **`docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`** — Hook / Proof / Depth doctrine, dual-asset pattern, aesthetic standard.
- **`docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`** — required output header + content structure for every external-facing agent response.
- **`docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`** — attention/validation asset pairing, video/visual rules, proof density by funnel stage.
- **`docs/marketing/03_CONTENT_ATOM_SCHEMA.md`** — reusable structured marketing knowledge for AI retrieval.
- **`docs/marketing/04_DELIVERY_QUALITY_GATE.md`** — preflight checklist + 12/14 scoring model + handoff format.
- **`docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`** — four-layer enforcement (source-of-truth, prompt preamble, PR checklist, automated check).

Non-negotiable summary:

- Effectiveness beats decoration.
- Clarity beats cleverness.
- Conversion beats completeness.
- Primary CTAs must describe buyer intent, not internal process.
- Payment/routing complexity must come after buyer intent.
- For AI Lead Rescue, do not use **“Choose payment path”** as the primary CTA.
- Every external communication must combine attention + comprehension + proof + aesthetic discipline + a clear next action (Hook / Proof / Depth doctrine).
- Every attention asset must point to a validation asset (dual-asset pattern). Standalone hooks without a depth path are not shipped.
- **Stay above the line:** sell managed outcomes, vertical workflows, client-specific context, and secure accountable operations — **not** generic AI wrappers, generic chatbots, or generic AI agents. See **`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`**.
- **Before proposing new generic AI / tooling work, check `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` and `docs/strategy/GOOGLE_ACCELERATION_LANE.md`.** Google tools (AI Studio, Opal, NotebookLM, Pomelli, Gemini Canvas, Gemini image / Nano Banana, AI Studio multi-speaker audio) may be used to accelerate drafts, prototypes, training, decks, diagrams, and workflow sketches, but production work still requires repo / n8n / Vercel / Delivery Reality discipline, and sensitive client data is prohibited from these tools without a separate security / privacy review.
- **AI Lead Rescue commercial work (first paying pilots phase):** before proposing new funnels, paid ads, bulk email, chatbot expansion, sales-tier additions, CRM installs, or anything that re-shapes the public offer, **read the First-Paid-Pilots launch pack** — `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` (commercial playbook), `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md`, `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`, `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`, `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md`, `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`, plus the *From paid pilot to setup* section of `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`. The launch pack defines the **single offer** (USD 150 launch pilot), the warm-network outreach posture (no cold-scrape, no bulk send), the discovery flow, the pricing floor, the manual pro-forma path, and the no-guaranteed-revenue language. New commercial proposals that contradict the launch pack must update the launch pack first, then ship the contradicting work — never the other way round.

If a marketing surface looks polished but the intended buyer does not understand the offer, trust the path, and know exactly what to do next, the change is **PARTIAL**, not complete.

### Marketing, sales, and client-facing delivery standard

Any workstream that affects prospect-facing or client-facing communication must apply the mandatory standards in `docs/marketing/`. This includes websites, landing pages, social copy, email, proposals, decks, onboarding, help content, and client updates.

Agents and contributors must enforce the Hook / Proof / Depth doctrine, the dual-asset pattern, the Agent Output Contract, and the Delivery Quality Gate before handoff or release.

## Git note (default branch `main`)

If Git says **`ambiguous argument 'main'`**, a tracked path named **`main`** may exist at the repo root — see **`docs/operations/GIT_AND_MAIN_BRANCH.md`**. Prefer **`refs/heads/main`** in commands when needed.

## Must-read (by topic)

| Topic | Doc |
|--------|-----|
| Priorities & checklist | `docs/CORPFLOW_SHARED_TODO.md` |
| **Autonomous execution — work packet structure** | **`docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`** |
| **Autonomous execution — what may run without further approval, what must stop and ask** | **`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`** |
| **Autonomous execution — current approved queue** | **`docs/execution/WEEKEND_EXECUTION_QUEUE.md`** |
| **Autonomous execution — migrate recurring jobs off the laptop** | **`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`** |
| **Website quality scoring (per-tenant audit)** | **`docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`** |
| **Analytics / Search Console / indexing per surface** | **`docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`** |
| **Per-client migration audit (identity, login, marketing, off-laptop)** | **`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`** |
| **Operator Bridge v1 — coordination protocol (ChatGPT ↔ Anton ↔ Cursor + Codex Cloud)** — coordination issue **#249** | **`docs/operations/OPERATOR_BRIDGE_V1.md`** |
| **Operator Bridge — day-to-day runbook (how Cursor / Codex Cloud post STATUS to #249)** | **`docs/runbooks/OPERATOR_BRIDGE.md`** |
| **Delivery Acceleration v1 — multi-executor protocol (Cursor + Codex Cloud + future internal agent)** | **`docs/execution/DELIVERY_ACCELERATION_V1.md`** |
| **Codex Cloud install — operator playbook (Packet 7.2: pre-flight, OpenAI key, GitHub App least-privilege, bot username, first-packet smoke, rollback)** | **`docs/runbooks/CODEX_CLOUD_INSTALL.md`** |
| Marketing / conversion doctrine (brand, single-offer rule, AI Lead Rescue) | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| **AI Lead Rescue — First-Paid-Pilots launch pack** (commercial side, mandatory before any new AI Lead Rescue funnel / pricing / outreach / CRM proposal) — playbook, outreach scripts, 15-min discovery call, manual-pro-forma pricing, prospect-list template, post-payment onboarding, *From paid pilot to setup* | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md`, `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`, `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`, `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md`, `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`, `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| **Marketing execution standards (mandatory for all prospect/client-facing work — Hook / Proof / Depth + Agent Output Contract + Delivery Quality Gate)** | **`docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`**, **`docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`**, **`docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`**, **`docs/marketing/03_CONTENT_ATOM_SCHEMA.md`**, **`docs/marketing/04_DELIVERY_QUALITY_GATE.md`**, **`docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`** |
| Marketing / conversion doctrine | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| **Strategy source captures** — index for distilled external strategy material (videos, podcasts, essays). The README itself is the index; individual captures are **task-conditional reading**, not mandatory for every task. Read a capture only when working on the area it informs, or when proposing a doctrine change. Doctrine changes never happen inside a capture. | `docs/strategy/sources/README.md` |
| Delivery reality (live prod = done) | `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc` |
| Production bar (reliable, secure, observable) | `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` |
| **Above-the-Line Strategy Doctrine** — **mandatory strategic evaluation lens** for any new offer, feature, marketing claim, or technical build. CorpFlowAI competes **above the commodity line** (managed outcomes, vertical workflows, proprietary client context, trust-heavy / secure workflows, owned distribution) and uses generic AI as **leverage**, not as the moat. AI Lead Rescue is a **wedge** into managed lead / growth operations, not the destination. | **`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`** |
| **Google Acceleration Lane** — operating doc that bounds use of Google AI tools (AI Studio, Opal, NotebookLM, Pomelli, Gemini Canvas, Gemini image / Nano Banana, AI Studio multi-speaker audio) for internal acceleration only. Drafts / prototypes / training / decks / diagrams / workflow sketches allowed; production stays on CorpFlowAI app + GitHub + Vercel + Postgres + n8n + ERPNext. Sensitive client data prohibited without separate security / privacy review. **Read this before proposing new generic AI / tooling work.** | **`docs/strategy/GOOGLE_ACCELERATION_LANE.md`**, **`docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md`** |
| Host / apex / login / tenancy | `docs/operations/TENANT_CLIENT_LOGIN.md` |
| **Postgres provider (Neon — sole approved)** — required when touching DB env vars or diagnosing DB issues. **Neon is the only approved Postgres provider for production. Prisma Accelerate / `db.prisma.io` is deprecated and must not appear in active runtime configuration. Any `db.prisma.io` reference is configuration drift; see `docs/operations/POSTGRES_PROVIDER.md` §4a/§4b/§5b for the playbook.** | `docs/operations/POSTGRES_PROVIDER.md` |
| Outbound email / communications — required when adding any send-mail capability or comms event | `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` |
| Security review triggers | `docs/operations/SECURITY_REVIEW_CHECKLIST.md` |
| Incident / rotation stub | `docs/runbooks/SECURITY_OR_INCIDENT.md` |
| Brain vs hands / automation | `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/automation-framework.md` |
| n8n forward | `docs/n8n/automation-forward-recipe.md` |
| CMP API surface | `lib/cmp/README.md` |
| Vercel / cron / Technical Lead / Bugbot | `docs/VERCEL_DEPLOYMENT.md` |
| Factory control loop (off-laptop drift monitor) | `docs/operations/FACTORY_CONTROL_LOOP.md` |
| **Monitoring & 24/7 execution architecture (canonical single component map — § 2 surface table of all 12 monitors, § 3 schedule grid, § 4 alert routing, § 5 live-endpoint floor, § 6 known blind spots, § 8 incident decision tree, § 9 add-a-monitor recipe, § 11 status + future packets + `corpflow-exec-01` posture)** | **`docs/operations/MONITORING_ARCHITECTURE.md`** |
| **Server agent access & execution boundary (canonical — names the three execution layers L1 laptop brain / L2 cloud hands / L3 box hands; § 5.5 named-narrow-packet-gated carve-outs (Uptime Kuma is the first and only authorized exception as of 2026-06-15); § 6 canonical-absence list of surfaces that do NOT exist on `corpflow-exec-01-u69678` plus the § 5.5 exception clarifier; § 7 `HOST_MISMATCH` semantics; § 8 per-class decision tree; § 9 anti-patterns including the 2026-06-04 handoff mistake; § 10 gate for lifting any § 5.3 hard rule)** | **`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`** |
| **Uptime Kuma on `corpflow-exec-01-u69678` — authorization packet + install runbook (the first and only authorized § 5.5 carve-out as of 2026-06-15; ADR + packet doc + `MONITORING_ARCHITECTURE.md` § 2 Monitor # 13 row authorized-pending-install + § 11.1 + § 11.2 follow-up `kuma-on-exec01-install`; loopback `127.0.0.1:3001` only via SSH local-port-forward; Kuma's own Telegram bot independent of the in-repo `TELEGRAM_BOT_TOKEN`; zero CorpFlow secrets on the box; install runbook authored 2026-06-16 — `JE-2026-06-16-1` — at `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` with 14 sections / operator-paste shell blocks / K1–K5 verification block / § 12 evidence template / § 13 closure update points / not yet executed at L3).** **Read these four together when proposing any new self-hosted tool on the box (Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, additional monitoring, additional self-hosted tool of any kind):** the carve-out is for Kuma alone; sameness is not authorization; the install runbook explicitly does not widen this carve-out (§ 1.4 scope checklist maps 1:1 onto the user-stated boundaries from PR #367). | **`docs/decisions/20260615-uptime-kuma-on-exec01.md`**, **`docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md`**, **`docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md`**, **`docs/operations/SELF_HOSTED_OPS_STACK_V1.md`** § 3 |
| **ERPNext production-shell setup recipe v1 (operator-paste runbook implementing the § 5.4 L1/L2/L3 collaboration pattern for `ERPNext-Production-Shell-Setup-Host-Agent-1` per `JE-2026-06-04-1`; 22 sections, ~750 lines; sandbox-preserving — separate Docker project `erpnext-production`, separate site `corpflowai-production.localhost`, separate credentials file `~/.erpnext-production-credentials`, separate host port `8081` vs sandbox `8080`; defensive forbidden-wording assertions on Print Format HTML; 25-row verification checklist V1–V25; NOT yet executed on `corpflow-exec-01-u69678`)** | **`docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`** |
| **ERPNext Print Designer evaluation v1 (decision artefact — recommends Frappe Print Designer + Chrome PDF backend as the long-term answer for client-facing ERPNext PDFs; Option A GO via separate `ERPNext-PrintDesigner-Install-1` packet; B/C/D NO-GO; E TRANSITIONAL-only; diagnoses the `wkhtmltopdf ConnectionRefusedError` as a Docker `host_name` issue, fixed under `JE-2026-06-04-5`; defines two future packets — Packet 1 = host_name fix (~10 min, executed 2026-06-04), Packet 2 = full Print Designer install (~3 hours, deferred pending separate authorisation))** | **`docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md`** |
| Delivery verdict + 24/7 alerts (CMP per-ticket) | `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` |
| Production pulse runtime endpoint (DB reachability JSON) | `docs/operations/PRODUCTION_PULSE_V1.md` |
| Analytics / Search Console / indexing — operational rollout plan (apex → Lux → future tenants) | `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` |
| **Analytics v1 (Plausible) — canonical doc + adapter design** | **`docs/analytics/CORPFLOW_ANALYTICS_V1.md`** |
| **Search Console + indexing operator playbook** | **`docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`** |
| **Website quality reporting standard (cadence, thresholds, client-facing wording)** | **`docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md`** |
| **Website quality system v1 (canonical scoring — 10 dimensions × 10 points; supersedes the 5-dim framework as of 2026-05-27)** | **`docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`** |
| **Client performance reporting model (design-only v1 — what clients eventually see monthly; gated on apex SC + Plausible + first client-facing surface)** | **`docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md`** |
| **Search Console execution packet — apex first (bounded operator packet; Lux deferred)** | **`docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md`** |
| Env placeholders | `.env.template` |
| ADR-lite decisions | `docs/decisions/README.md` |
| Compliance starter | `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` |
| **ERPNext accounting sandbox plan v1** — consulted when ERPNext / invoicing / bank-reconciliation / VAT work is in scope. **Task-conditional reading**, not mandatory per task. Plan-only — no install, no production setup. | `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` |
| **ERPNext sandbox install runbook** — consulted alongside the plan when actually installing the sandbox. Operator owns capacity-resize, billing, secrets, DNS, ERPNext admin password; Cursor owns SSH-driven install per `JE-2026-05-29-1`. Phase B is HELD on `corpflow-exec-01` capacity until `JE-2026-05-29-2` is resolved. | `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` |

## Autonomous execution framework (v1)

CorpFlow operates a bounded autonomy model: Anton approves work **packets** once, and Cursor (or a contractor under the same rules) may execute approved work up to the next gate without further line-by-line approval. Treat the three docs above as canonical for any "should I do this without asking?" decision.

- **Packet structure** (`docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`): every approved packet has Goal, Definition of Done, Scope, Constraints, Risks, Allowed actions, Approval gates, Verification evidence, Rollback plan, Owner, and a Status block.
- **What is allowed without further approval** (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2): read-only inspection, docs updates, branch creation, tests/builds, Preview deploys, PR creation, evidence capture, non-production verification.
- **What requires Anton's explicit approval** (same doc, §3): production deploy, secret changes, DNS, billing/payment, destructive DB changes, tenant migration, auth/security logic, client-facing email automation, or anything touching real client data beyond read-only verification.
- **Current queue** (`docs/execution/WEEKEND_EXECUTION_QUEUE.md`): Goals 1–5 — Goal 1 *Stabilize permanent infrastructure*; Goal 2 *Apply audit findings + first off-laptop migration*; Goal 3 *Website quality scoring*; Goal 4 *Per-tenant migration audit (Lux first)*; Goal 5 *Analytics / Search Console / indexing plan*. All current packets are docs-only or read-only by design.
- **Migration discipline** (`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`): every packet that moves recurring work off Anton's laptop must satisfy the checklist (credential placement, parameterization, idempotency, retries, audit trail, schedule, rollback, doc updates).
- **Quality scoring** (`docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`): five dimensions (conversion, performance, accessibility, SEO, trust) scored 0–20 each.
- **Analytics / Search Console / indexing** (`docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`): per-surface checklist for analytics install, SC verification, sitemap, indexing requests, and `noindex` discipline on private surfaces.
- **Per-tenant migration audit** (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`): identity/routing, login boundary, marketing surface, analytics, off-laptop posture — read-only, evidence-shape standardized.

When in doubt, stop at the gate, post evidence, and ask. `delivery-reality.mdc` still applies: only **live verified** is `COMPLETE`.

## Build / test (app)

```bash
npm ci
npm test
npm run build
```

Prisma client generates on `postinstall` / `npm ci`. CI runs Python tests under `core/engine/tests/` plus `npm test`, `npm audit`, and `npm run build` (see `.github/workflows/test.yml`).

### CI / supply chain (maintainers)

- Third-party Actions in workflows that install tooling or touch GitHub API are **pinned to full commit SHAs** (see YAML comments). Bump intentionally after review.
- Groq chat/completions use **`lib/server/groq-client.js`** — one URL + `resolveGroqModel('primary' | 'technical_lead_rephrase')` (TL rephrase: optional `CORPFLOW_TECHNICAL_LEAD_LLM_MODEL`, else built-in default — not `GROQ_MODEL_NAME`).
- **CMP action gates:** tenant session actions go through `requireDormantGate` / `requireFactoryMasterOnly` in `lib/cmp/router.js` — high-impact routes (`promote-merge`, `approve-build`, factory-only repair) stay separated from read-only analysis.

## Cursor Bugbot (optional, free tier)

Enable **[Cursor Bugbot](https://cursor.com/docs/bugbot#setup)** on the GitHub repo for PR-level review comments. Use it as a **fast second pair of eyes** alongside **Agent CI**; it does **not** replace deterministic checks or the **Technical Lead observer** (evidence persisted in Postgres — see below).

<!-- Optional tracked onboarding URL (same doc anchor): https://track.pstmrk.it/3s/cursor.com%2Fdocs%2Fbugbot%23setup/I76j/74HEAQ/AQ/1556dd49-ceef-4739-bd8c-e16116455257/1/rFvvTlI3G-#setup -->

## Technical Lead Phase A (observer) — how to proceed

**What it is today:** read-only cycles for **Approved / Build** tickets — `console_json` + GitHub PR/compare/check-runs + optional Vercel preview deployment rows + optional factory health. Outputs **gaps + summary** into **`technical_lead_audits`** (not only PR chatter).

**Operational checklist (production):**

1. **Schema:** `npx prisma migrate deploy` on the live DB (or `ensure-schema` if you rely on idempotent DDL); confirm table `technical_lead_audits` exists.
2. **Vercel env:** `CORPFLOW_CRON_SECRET` / **`CRON_SECRET`** (same value), GitHub + `GITHUB_REPO`/`CMP_GITHUB_*` as today, **`CORPFLOW_FACTORY_HEALTH_URL`** (origin or full health URL), **`VERCEL_*`** aligned with `promote-status` / `vercel-preview.js`.
3. **Cron:** `vercel.json` already schedules `/api/cron/technical-lead` daily — verify Vercel shows successful invocations after deploy.
4. **Read results:** `GET /api/factory/technical-lead/audits?ticket_id=…` (factory master) or query Postgres; locally `npm run technical-lead:run`.

**Phase B (implemented):** `technical-lead-latest` CMP action + **Factory oversight** panel on `/change`; **`config/technical-lead-checklist.v1.json`** (`disabled_rule_ids`); optional Groq rephrase via **`CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY`** (writes **`evidence_json.llm_summary_rephrase`** only; DB `summary_text` stays deterministic).

**Next (Phase C ideas):** richer gap detail in UI (expandable), per-tenant checklist paths, or ticket-level checklist overrides.

## Legacy: Python engine (`core/engine/`)

Some workflows still run **pytest** on `core/engine/tests/`. Only follow the Antigravity-style instructions below when editing that tree.

<details>
<summary>Legacy Antigravity / Python template (expand if needed)</summary>

- Optional reads: `mission.md`, `.antigravity/rules.md`, `CONTEXT.md`, `.cursorrules`
- Setup: `python -m venv venv`, `pip install -r requirements.txt`, `pip install -r core/engine/requirements.txt`
- Tests: `pytest core/engine/tests/`

</details>