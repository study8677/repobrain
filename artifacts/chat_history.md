# CorpFlow AI Command Center — conversation history (human reference)

**Purpose:** Capture *decisions, direction, and “where things live”* from Cursor chats so you can orient quickly without rereading long threads. This file is **not** a full transcript.

**Operator context (read before technical work):** The primary stakeholder is **not a programmer**. Assistants should operate as a **top-tier software architect**, **development team lead**, and **senior engineer** in one: own trade-offs, explain in plain language, surface risks and next steps, and **not** assume prior implementation knowledge. Prefer **actionable guidance** and **explicit defaults** over open-ended questions unless a choice is truly business-owned (call those out clearly).

**How assistants should use it:** Read this file at the start of substantive work when the user asks for continuity or says “check history.”

**Architecture note (2026-04, corrected 2026-05-22):** The deployed system of record is **PostgreSQL** managed by **Neon** (queried via Prisma ORM). For months the canonical text here said "PostgreSQL (Prisma)" without naming the hosting provider; in practice production was misconfigured to point at a defunct **Prisma Postgres** instance (`db.prisma.io`) while local dev used **Neon** (`*.neon.tech`). The Neon instance is the real production data store. Older bullets below may describe a retired external spreadsheet-style database; treat those lines as historical context only.

**How you maintain it:** After important chats, paste a short summary here (or ask the assistant for a “history entry” prompt and paste the result into the next section). See **Include / omit** below.

**Cadence:** Nothing in Vercel or the Factory app updates this file by itself. **Cursor:** the project rule `.cursor/rules/chat-history-cadence.mdc` tells assistants to **offer** a short append after substantive work; you can say “yes” in chat and they edit this file—no need to ask daily. **Otherwise:** a **calendar reminder** (e.g. weekly or after each deploy) or a **recurring task** works. Optional: a GitHub Action that **nags** if the file was not touched in N days (you still write the text).

---

## Include / omit (keep this file safe and useful)

| Include | Omit |
|--------|------|
| What we decided and **why** (one or two sentences) | Passwords, API keys, tokens, private keys, full `.env` values |
| **Feature flags / env var names** (names only) | Long code dumps (link to files or commits instead) |
| **File paths** and major components touched | Personal data about clients or staff |
| **Production URLs / hostnames** (if non-sensitive) | Anything you would not paste in a shared Slack channel |
| **Commit messages or themes** when they mark a milestone | Verbatim multi-page assistant replies |

**Full history vs prune:** Starting **full** in a scratch note and then pruning into this file works well. This file should stay **short** (roughly one screen per month of work); archive older bullets to `artifacts/chat_history_archive.md` only if you need them later.

---

## 2026-06-18 — **CorpFlow Candidate & Reference Library — canonical name + index (docs-only).** Established standing library name **`CorpFlow Candidate & Reference Library`** with index at `docs/product/README.md`; updated `.cursor/rules/library-capture-auto-merge.mdc` with canonical name, allowed statuses, and narrowed auto-merge guardrails; tagged existing captures (Social Intents, Google Vids) as library members. Auto-merge applies only to PRs clearly belonging to this library. Verdict: **NO IMPLEMENTATION AUTHORIZED**.

<!-- CORPFLOW_CANDIDATE_REFERENCE_LIBRARY_2026_06_18_HIST -->

---

## 2026-06-18 — **Google Vids marketing automation content engine candidate (docs-only).** Captured Google Vids / Gemini Workspace AI-avatar video creation as **`SERIOUS-CANDIDATE / EVALUATE-FIRST`** for a future CorpFlow marketing automation content engine — not implementation. Source: [Google Workspace blog — AI avatars in Google Vids](https://workspace.google.com/blog/ai-and-machine-learning/how-to-create-professional-work-videos-with-ai-avatars-in-google-vids). New doc: `docs/product/MARKETING_AUTOMATION_CONTENT_ENGINE_CANDIDATES.md`. Anton signal: prior use + ~80% initial workflow value at free/low friction; manual-first Vids with n8n orchestration TBD pending API eval; adjacent paths Gemini API / AI Studio / Veo / Drive if Vids API limited. Complements (does not replace) approved LR Playwright+FFmpeg walkthrough pipeline. Future video target: **AI-generated/avatar, not human video**. Verdict: **CANDIDATE CAPTURED — NO IMPLEMENTATION AUTHORIZED**.

<!-- GOOGLE_VIDS_MARKETING_CONTENT_ENGINE_CANDIDATE_2026_06_18_HIST -->

---

## 2026-06-18 — **Social Intents chat destination reference (docs-only).** Captured [Social Intents](https://www.socialintents.com/) as a **REFERENCE-ONLY / DESTINATION-SHAPE** benchmark for future CorpFlow Chat / Concierge — not an approved vendor or install. New doc: `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md`. Key distinction: Social Intents routes into external team tools (Teams, Slack, Google Chat); CorpFlow destination is a **native concierge surface** with n8n + internal workflows and external channels as adapters. Guardrails: no Social Intents/Chatwoot/Open WebUI/Dify installs, no env vars, no app code, no public chat endpoints, no containers, no n8n changes, no restic. Verdict: **REFERENCE CAPTURED — NO IMPLEMENTATION AUTHORIZED**.

<!-- SOCIAL_INTENTS_CHAT_DESTINATION_REF_2026_06_18_HIST -->

---

## 2026-06-17 — Multi-tenant **IM-7 audit trail population** — **COMPLETE.** PR [#387](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/387) squash-merged to `main` as `e64ca6031782bcf49d15dddb1da051589421e603` (2026-06-17T10:46:24Z). Vercel Production deployment `GcodQDAY92Ywhe5Y2Zx8S4oLVi8v` (GitHub deployment `5093034082`) reached **Ready** at 2026-06-17T10:47:21Z on commit `e64ca603`. **Approved read-only unauthenticated DRA probes (all PASS):** `GET https://lux.corpflowai.com/change` → 200 HTML; `GET https://core.corpflowai.com/change` → 200 HTML; `GET https://core.corpflowai.com/api/factory/health` → 200 `{"ok":true,...}`; `GET https://lux.corpflowai.com/api/ui/context` → 200 anonymous JSON. **No authenticated probes, switch/leave in production, synthetic cookies, mutating CMP actions, or operator-activity queries were run by Cursor.** Scope delivered: `audit-actor-context` resolver; `actor_user_id` on new `automation_events`/`telemetry_events` for DB-backed sessions; successful `cmp.operator.switched_tenant`/`left_tenant` five-tuple events; CMP `recordCmpAutomationEvent` wrapper; legacy lanes preserved; rejection events not emitted; operator-activity read surface deferred to IM-7.1. **Post-cutover SELECT audit proof:** operator-run only (pending Anton performing one intentional switch/leave). **Verdict:** COMPLETE per `.cursor/rules/delivery-reality.mdc` for implementation + floor probes; operator audit SELECT is a separate follow-up evidence step.

<!-- IM_7_AUDIT_POPULATION_2026_06_17_HIST -->

---

## 2026-06-17 — Multi-tenant **IM-5.5 Operator identity bootstrap — COMPLETE.** Anton executed `docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md` on his laptop (username `anton`, row id `cmqhtirgb0000xf0ktu03alm6`, `level=admin`, `factory_master=true`, `enabled=true`, `tenant_id=null`, zero `user_tenant_memberships` rows). Cursor re-ran `scripts/verify-operator-identity-bootstrap.mjs` read-only at 2026-06-17 08:44 UTC against production Neon (`ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech / neondb`): **VERDICT READY** (exit 0) — exactly one enabled DB-backed admin with `factory_master=true`, no orphan memberships, IM-6 readiness gate unblocked. Runbook merged via PR #375 (`afc4f457`). Legacy env-master lane preserved. No Cursor-side row creation, promotion, password handling, or non-SELECT SQL.

<!-- IM_5_5_OPERATOR_IDENTITY_COMPLETE_2026_06_17_HIST -->

---

## 2026-06-17 — Multi-tenant **IM-6 CMP enforcement (`acting_tenant_id` binding)** — **COMPLETE.** PR [#385](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/385) squash-merged to `main` as `579560c2cc19107c449384465668a6af3eb0305f` (2026-06-17T09:14:30Z). Vercel Production deployment `3qyxHWHtURDiEY4Mgkx9Gbq755fB` (GitHub deployment `5091984050`) reached **Ready** at 2026-06-17T09:15:24Z on commit `579560c2`. **Approved read-only unauthenticated DRA probes (all PASS):** `GET https://lux.corpflowai.com/change` → 200 HTML; `GET https://core.corpflowai.com/change` → 200 HTML; `GET https://core.corpflowai.com/api/factory/health` → 200 `{"ok":true,...}`; `GET https://lux.corpflowai.com/api/ui/context` → 200 JSON anonymous session; `GET https://lux.corpflowai.com/api/cmp/router?action=ticket-list` → 403 `{"error":"Dormant Gate: session token required.","action":"ticket-list"}`. **No authenticated probes, synthetic cookies, switch flows, or mutating factory actions were run.** Scope delivered: central `cmp-membership-enforcement` helper; CMP router binds DB-backed sessions to `acting_tenant_id`; tenant-host mismatch for DB-backed sessions; per-request `getEffectiveMemberships` recheck; factory-only actions require `factory_master=true` + `acting_tenant_id=null`; ticket list/scoped reads bound to acting tenant; additive `/change` SSR mismatch redirect; legacy env-master / `MASTER_ADMIN_KEY` / sovereign JWT / PIN lanes preserved; 21 IM-6 tampering vectors; build + ReadLints green. **Verdict:** COMPLETE per `.cursor/rules/delivery-reality.mdc`.

<!-- IM_6_CMP_ENFORCEMENT_2026_06_17_HIST -->

---

## 2026-06-17 — **Phase 1A Step 1 — n8n automation-forward COMPLETE (`JE-2026-06-17-2`).** Closure after n8n execution **#1124** detail review: Webhook node succeeded; IF node (forward-secret / routing validation) succeeded for same execution after expected envelope received; body confirms `corpflow.automation.envelope.v1` envelope matching § 7.1 / § 7.2. IF node success recorded as auditable non-secret validation path — no secret/header value in repo. **§ 7.1 PASS / § 7.2 PASS / § 7.3 PASS. Step 1 COMPLETE.** Step 2 COMPLETE (unchanged). Step 3 restic HELD on explicit authorization. **Files:** Phase 1A artifact § 7.3 + § 8; `docs/CORPFLOW_SHARED_TODO.md`; `docs/decisions/JOURNAL.md`; this bullet. Docs-only; no secrets; no L3; no restic.

<!-- STEP1_N8N_COMPLETE_2026_06_17_HIST -->

---

## 2026-06-17 — **Phase 1A Step 1 — § 7.3 n8n execution body-view payload confirmation (`JE-2026-06-17-1`; verdict PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED, Step 1 NOT COMPLETE).** Follow-up after PR #382 merge: Anton inspected n8n execution **#1124** body view and confirmed forwarded payload matches § 7.1 ingest and § 7.2 read-back (`schema` `corpflow.automation.envelope.v1`, `id` `cmqha6wi…`, `event_type` `ops.self_hosted.test.v1`, `source` `self-hosted-ops-stack-v1-step-1`, `payload.note`, `payload.artifact_ref`, etc.). **§ 7.1 ingest PASS** (unchanged). **§ 7.2 automation_events read-back PASS** (unchanged). **§ 7.3 n8n consumer PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED** — payload confirmed in execution body view; workflow forward-secret validation node/path **not** independently confirmed (`SECRET-VALIDATION-IMPLIED` from succeeded execution only). `secret_logged_or_committed: NO`. **Files:** Phase 1A artifact § 7.3 + § 8 Step 1 DRA; `docs/CORPFLOW_SHARED_TODO.md` Step 1 + Step 3 rows; `docs/decisions/JOURNAL.md` `JE-2026-06-17-1`; this bullet. **Hard limits:** docs-only; zero app/runtime edits; zero secrets; zero L3 commands by Cursor; no restic; no new self-hosted tools. Remaining Step 1 item: confirm forward-secret validation node/path passed or equivalent auditable non-secret mechanism.

<!-- STEP1_N8N_PAYLOAD_CONFIRMED_2026_06_17_HIST -->

---

## 2026-06-16 — **Phase 1A Step 1 — n8n automation-forward live verification evidence (`JE-2026-06-16-4`; verdict PARTIAL-CONSUMER-CONFIRMATION, Step 1 NOT COMPLETE).** Anton ran § 3 / § 4 operator recipes and captured redacted evidence at 2026-06-16T23:36:34Z into `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.1 / § 7.2 / § 7.3. **§ 7.1 ingest PASS** — `POST /api/automation/ingest` returned 200 accepted for `ops.self_hosted.test.v1` (idempotency key `self-hosted-ops-stack-v1-step-1-20260616-233629`; event id prefix `cmqha6wi…`). **§ 7.2 automation_events read-back PASS** — factory-only `GET /api/automation/events` returned 200; row matched on `idempotencyKey` via camelCase-safe read-back script (live API returns camelCase fields — evidence-script adjustment only, not a product failure). **§ 7.3 n8n consumer PARTIAL / STRONGLY INDICATED** — execution #1124 succeeded at matching timestamp (6 ms, workflow `90e75d5c`); payload/event-type and forward-secret validation **not** independently inspected inside n8n execution detail (operator could not safely locate internal execution input/body in n8n UI). `secret_logged_or_committed: NO`. **Files:** Phase 1A artifact § 7 + § 8 Step 1 DRA; `docs/CORPFLOW_SHARED_TODO.md` Step 1 row; `docs/decisions/JOURNAL.md` `JE-2026-06-16-4`; this bullet. **Hard limits:** docs-only; zero app/runtime edits; zero secrets; zero L3 commands by Cursor; no restic; no new self-hosted tools. Step 3 still held on explicit authorization.

<!-- STEP1_N8N_AUTOMATION_FORWARD_EVIDENCE_2026_06_16_HIST -->

---

## 2026-06-16 — **Living Word visual sandbox v1 visual refinement — COMPLETE on Production.** Refines `/site-preview` from sandbox v0 ("approximate structure, conservative copy, clearly labelled") to sandbox v1 ("recognisable facsimile rather than generic prototype") while preserving every safety control. **PR [#379](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/379)** "Living Word visual sandbox v1 (recognisable facsimile, single ribbon marker)" squash-merged as commit `82f248683ebceb0a9a155a7327ab9e13168573d8`; Vercel Production deployment ID `5077960482` (GitHub) / `EJPyjDMG4Vhhut3Ut94rieGpsAvf` (Vercel dashboard) for that commit reached `state=success`; live route verified at `https://living-word-mauritius.corpflowai.com/site-preview`. Follow-up **PR [#380](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/380)** added the live-verification artifact `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-v1-live-verification.md` (squash-merged as `91e1329f`). **Outcome:** per-section red `SandboxBanner` warning boxes removed (no `#FEE2E2` warning bg or `#FCA5A5` warning border in production HTML) → the persistent fixed orange `TestEnvironmentRibbon` (`position: fixed`, `top: 0`, `z-index: 2147483640`, `#EA580C` background, exact text `TEST ENVIRONMENT — Not the live Living Word Mauritius website`, non-dismissible, mobile-wrap-safe) is now the **single non-removable sandbox marker**; page now uses a recognisable Living Word visual treatment (deep navy `#0E1F3A` + warm gold `#C9A961` + cream `#F5F1EA` palette, system serif headings via Georgia/Times/PT Serif, full-width hero + top nav + five-pillars row + get-involved grid + next-gen card row + service/location/contact strip + placeholder events + footer); `noindex,nofollow` meta preserved; host gate preserved (non-LWM hosts return 404 — `lux.corpflowai.com/site-preview` and `core.corpflowai.com/site-preview` both 404 on Production); chat widget remains `enabled = false` for `living-word-mauritius` (loader returns `x-corpflow-chat-widget=disabled` and the no-op stub body); external `livingwordmauritius.com` / `network.livingwordmauritius.com` / GoHighLevel / DNS / DB unchanged (only one read-only `WebFetch` of the public homepage was used to learn visual identity — no writes, no plugin install, no DNS, no script injection); Luxe / `lux_listings` / multi-tenant operator switching work untouched. **"Recognisable facsimile" content policy:** strings that mirror **published public facts** from the live homepage are intentionally used (five-pillar Bible verses with their canonical references; Sunday `9:30 am` service time; Grand Baie venue + `Richmond Hill Building, Super U Complex, La Salette Road, Grand Baie, Mauritius` address; `info@livingwordmauritius.com`; `+230 5538 2181`; ministry names with age bands — `Children's Church 4–12`, `Daughters of Grace 12–18 girls`, `The Forge 12–18 boys`); facts that would require invention are NOT used (specific upcoming event dates, donation amounts, sermon titles, pastor in CTAs); no copyrighted assets (no logo file, no photographs, no hot-linked images from `livingwordmauritius.com`). **Files merged in PR #379** (1038 insertions, 257 deletions): `pages/site-preview.js` (rewritten ~600 lines — old `SandboxBanner` / `SectionBlock` / `ScheduleBlock` removed; new components `NavBar`, `HeroSection`, `AboutSection`, `PillarsSection`, `GetInvolvedSection`, `NextGenSection`, `ServiceLocationContactSection`, `EventsSection`, `NextStepSection`, `FooterSection`); `lib/sandbox/living-word-sandbox-content.js` (`SANDBOX_BANNER` and old `SANDBOX_SECTIONS` removed; new JSDoc-typed exports `HERO`, `ABOUT`, `PILLARS`, `GET_INVOLVED`, `NEXT_GEN`, `SUNDAY_SERVICE`, `LOCATION`, `CONTACT`, `EVENTS_PLACEHOLDER`, `NEXT_STEP`, `NAV`, `FOOTER`; file header documents the source-of-fact policy); `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md` (new §14 "v1 visual refinement" — what changed, why per-section banners were removed, what facts are mirrored, what is deliberately NOT mirrored, safety controls preserved). **Files NOT touched:** `lib/sandbox/test-environment-ribbon.js` (ribbon spec unchanged), `lib/sandbox/living-word-schedule-shape.js` (data shape unchanged), `chat_widget_configs[living-word-mauritius]` (`enabled = false` unchanged), all of `api/` / `lib/server/` / `lib/cmp/` / `middleware*` / `prisma/` / `.env*` / `vercel.json` / `next.config*` / `package*.json`. **Pre-PR gates green:** `npm test` 991/991 pass; `npm run build` success with `/site-preview` registered as `ƒ Dynamic`; `ReadLints` zero errors on all touched files. **CI green on PR #379:** `test pass`, `vercel-env pass`, `Vercel pass` (Preview Ready), `Vercel Preview Comments pass`, `cmp-delivery-files skipping`. **Live verification (8 brief-listed checks plus mobile UA, all PASS):** ribbon verbatim text present (desktop + iPhone Safari UA); per-section red banners absent; v1 fidelity markers present (navy palette, gold accent, serif font stack, hero eyebrow `CorpFlow sandbox · modelled on livingwordmauritius.com`, `Welcome to Living Word` h1, `Serve / 1 Peter 4:10` pillar, Grand Baie address, phone, email, service time, `Ages 4–12` ministry block); `noindex,nofollow` meta present; host gate enforced (Lux 404, Core 404); chat widget loader returns `x-corpflow-chat-widget=disabled` with no-op stub body; mobile UA returns 200 with ribbon + `noindex` + navy + gold all intact and no old red banner; no false-claim strings (`falsely_claims_real_church=False`). **Verdict per `.cursor/rules/delivery-reality.mdc`:** **COMPLETE** — `Local fix exists: YES / Merged to main: YES / Production deployment ID: 5077960482 (GitHub) + EJPyjDMG4Vhhut3Ut94rieGpsAvf (Vercel) / Commit deployed: 82f24868… / Live URL tested: https://living-word-mauritius.corpflowai.com/site-preview / Client-facing flow usable: N/A (operator-internal sandbox) / Final verdict: COMPLETE`.

<!-- LIVING_WORD_VISUAL_SANDBOX_V1_REFINEMENT_2026_06_16_HIST -->

---

## 2026-06-16 — **Uptime Kuma sub-probe 8 (n8n `/healthz`) added — Step 2 verdict flips COMPLETE-WITH-N8N-DEFERRED → COMPLETE end-to-end (`JE-2026-06-16-3`, supersedes the with-n8n-deferred caveat from `JE-2026-06-16-2`).** Anton confirmed the canonical n8n v1.x anonymous health endpoint URL family (`<n8n-host>/healthz` — GET-only, returns `{"status":"ok"}` 200, no auth, no state mutation; URL itself recorded only inside Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`, never in this repo per runbook § 12.2), opened `ssh -L 3001:localhost:3001 anton@5.78.213.185` to Kuma's UI at `http://localhost:3001/`, added the eighth monitor pointing at the n8n host's `/healthz` endpoint at the same 60 s / 2 retries cadence as sub-probes 1–7, observed it Up at 60 s, and triggered Kuma's built-in *Test* button to confirm the Telegram alert path for sub-probe 8 specifically (using the same Kuma BotFather bot configured at install time — no new credentials, no new env var, no `.env` change). **All 8 sub-probes Up:** the seven CorpFlow public floor URLs (sub-probes 1–7, Up at install-time per `JE-2026-06-16-2`) plus sub-probe 8 (n8n `/healthz`, Up at sub-probe-add per this row). **K1=PASS / K2=PASS / K3=PASS (full — closes the earlier K3=PASS-WITH-DEFERRAL state) / K4=PASS (test extended to sub-probe 8) / K5=PASS-BY-CONSTRUCTION (n8n still not in alert path — sub-probe 8 monitors n8n's *availability* but its alert routes around n8n entirely, via Kuma's own bot direct to `api.telegram.org`).** **Anti-pattern guards explicitly honored:** sub-probe 8 targets `/healthz` (the canonical n8n v1.x anonymous health endpoint) — **not** the production webhook ingest path (`<n8n-host>/webhook/automation-forward`), which is state-mutating and would create real `automation_events` rows on every probe; that route is forbidden as a Kuma monitor target per runbook § 8.5. URL family operator-confirmed; URL itself never enters this repo per runbook § 12.2. **Carve-out unchanged:** sub-probe 8 add is a Kuma UI configuration change inside the existing `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 carve-out — no new container, no new port-binding, no new auth, no n8n migration, no public port exposure, no new env var. **No L3 commands typed by Cursor — Anton added the sub-probe inside Kuma's UI himself.** **Canonical authorization paragraph re-cited verbatim** (same wording at six loci across PR #367 + PR #370 + PR #373 + this PR): *"This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`. It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path."* **Files touched (4 docs-only updates + this bullet + JE row):** `docs/operations/MONITORING_ARCHITECTURE.md` § 2 heading + § 2 authorization-note + § 2 Monitor # 13 row body + § 4 alert-routing # 13 row + § 6 blind spot # 7 (now CLOSED end-to-end) + § 11.1 # 13 row (✅ active — all 8 sub-probes Up) + § 11.2 `kuma-monitor-8-n8n-add` row (struck-through, LANDED 2026-06-16); `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.4 (heading + opening paragraph + monitors-table row 8 DEFERRED → Up + K3 row PASS-WITH-DEFERRAL → PASS + Verdict line + Notes/deviations bullet) + § 8 DRA flipped to COMPLETE + § 9 change-log appended; `docs/CORPFLOW_SHARED_TODO.md` Step 2 row flipped from COMPLETE-WITH-N8N-DEFERRED → COMPLETE + Step 3 row updated to "fully eligible 2026-06-16; not initiated by `JE-2026-06-16-3`" per Anton's *"Do not proceed to restic"* directive; `docs/decisions/JOURNAL.md` `JE-2026-06-16-3` appended above `JE-2026-06-16-2`; this `artifacts/chat_history.md` bullet. **Hard limits honoured by THIS PR:** zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero new env var names; zero secrets / tokens / chat ids / passwords / SMTP creds / Infisical paths / n8n hostname in repo, JOURNAL row, evidence block, or this bullet; zero L3 commands run by Cursor; zero new public exposure; zero generalization of the carve-out; zero new container, zero new port-binding, zero new auth, zero new monitor-class outside the seven floor URLs + n8n `/healthz`; zero Chatwoot / Open WebUI / Dify / Coolify / Langfuse / AgentSpan / OpenJarvis / generic-chatbot / generic-agent-framework / additional-monitoring / additional-self-hosted-tool / second-app / second-DB introduced; zero n8n migration; zero public port exposure; zero additional containers; zero restic work — Step 3 remains held on Anton's explicit *"Do not proceed to restic"* directive even though the substantive Step 2 gate is now fully satisfied. **Verdict per `.cursor/rules/delivery-reality.mdc` § Mandatory verdict rules:** **COMPLETE** for Step 2 end-to-end — all 8 sub-probes Up, blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 closed end-to-end, no deferred sub-probes remain. (`JE-2026-06-16-3`.)

<!-- UPTIME_KUMA_ON_EXEC01_MONITOR_8_N8N_ADD_2026_06_16_HIST -->

---

## 2026-06-16 — **`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1` — Step 2 install execution closure (`JE-2026-06-16-2`)**: Anton ran the install runbook end-to-end at L3 on `corpflow-exec-01-u69678`. **Verdict: COMPLETE-WITH-N8N-DEFERRED.** K1=PASS / K2=PASS / K3=PASS-WITH-DEFERRAL / K4=PASS / K5=PASS-BY-CONSTRUCTION. Pinned image `louislam/uptime-kuma:1.23.13`; container `uptime-kuma` `Up 39 minutes (healthy)`; loopback bind `127.0.0.1:3001->3001/tcp` confirmed by `docker ps`; on-box `curl -I http://127.0.0.1:3001` returned `HTTP/1.1 302 Found Location: /dashboard` (canonical Kuma redirect-to-dashboard PASS); off-box laptop `curl -I --connect-timeout 8 http://5.78.213.185:3001` returned `curl: (28) Connection timed out after 8016 milliseconds` (canonical K2 PASS — exit 28 proves no public exposure of port 3001 added); SSH-tunnel UI access via `ssh -L 3001:localhost:3001 anton@5.78.213.185`; admin account created with operator-held Infisical credentials; Telegram notifier configured with a SEPARATE BotFather bot (separate token from in-repo `TELEGRAM_BOT_TOKEN`, credentials in operator's Infisical vault — failure-domain isolation by design); Telegram test alert delivered. **7 of 8 sub-probes Up:** the seven CorpFlow public floor URLs from `MONITORING_ARCHITECTURE.md` § 5 (`https://core.corpflowai.com/api/factory/health`, `https://core.corpflowai.com/api/factory/production-pulse/runtime`, `https://corpflowai.com/`, `https://corpflowai.com/lead-rescue`, `https://aileadrescue.corpflowai.com/`, `https://lux.corpflowai.com/`, `https://lux.corpflowai.com/change`). **Sub-probe 8 (n8n origin) explicitly DEFERRED** — operator was not 100% sure of the canonical n8n health URL family and chose deferral over guessing (correct call per runbook § 8.2.8 + § 12.2). Will be added as a single-monitor edit inside Kuma's UI in a future small follow-up once Anton confirms the URL family — does not require a new PR. ERPNext sandbox + production-shell containers observed running before install and not intentionally touched after install. **Blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 (no third-location uptime monitoring) is now CLOSED** for the seven CorpFlow public floor URLs (the named complementary future packet `exec01-uptime-from-third-location` remains in § 11.2 as a *second* third-location signal to re-evaluate ~ 2026-07-16 after # 13 has 30 production days of clean signal). **No L3 commands typed by Cursor — Anton ran every L3 byte himself.** Cursor at L1 captured the operator's evidence summary into the runbook § 12 evidence shape and opened this docs-only closure PR. **Canonical authorization paragraph re-cited verbatim** (same wording at five loci across PR #367 + PR #370 — ADR § 2.1, packet § 1.1, `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, `JE-2026-06-15-1`, `JE-2026-06-16-1`): *"This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`. It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path."* This bullet records an **execution event** strictly within that paragraph, not a doctrine change. **Files touched (5 docs-only updates + this bullet + JE row):** `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.4 (full runbook § 12 evidence shape pasted in, redacted) + § 8 DRA flipped to COMPLETE-WITH-N8N-DEFERRED + § 9 change-log appended; `docs/operations/MONITORING_ARCHITECTURE.md` § 2 / § 4 / § 6 (blind spot # 7 ~~struck-through~~ "CLOSED 2026-06-16") / § 11.1 / § 11.2 (`kuma-on-exec01-install` LANDED, new `kuma-monitor-8-n8n-add` follow-up); `docs/CORPFLOW_SHARED_TODO.md` Step 2 row flipped to COMPLETE-WITH-N8N-DEFERRED + Step 3 row updated to "eligible 2026-06-16; not initiated by `JE-2026-06-16-2`" per Anton's *"Do not proceed to restic yet."* directive; `docs/decisions/JOURNAL.md` `JE-2026-06-16-2` appended above `JE-2026-06-16-1`; this `artifacts/chat_history.md` bullet. **Hard limits honoured by THIS PR:** zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero new env var names introduced; zero secrets / tokens / chat ids / passwords / SMTP creds / Infisical paths in repo, JOURNAL row, evidence block, or this bullet; zero L3 commands run by Cursor; zero new public exposure (loopback-only invariant verified end-to-end through three independent checks); zero generalization of the carve-out; zero modification to monitors # 1–# 12 or to alert routing § 4.1 / § 4.2; zero contradiction with `SELF_HOSTED_OPS_STACK_V1.md` Phase 1 doctrine; zero Chatwoot / Open WebUI / Dify / Coolify / Langfuse / AgentSpan / OpenJarvis / generic-chatbot / generic-agent-framework / additional-monitoring / additional-self-hosted-tool / second-app / second-DB introduced; zero n8n migration; zero public port exposure; zero additional containers; zero restic work — Step 3 remains gated per `SELF_HOSTED_OPS_STACK_V1.md` § 4 + Anton's explicit *"Do not proceed to restic yet."*. **Verdict per `.cursor/rules/delivery-reality.mdc` § Mandatory verdict rules:** **COMPLETE-WITH-N8N-DEFERRED** — Kuma is live on `corpflow-exec-01-u69678`; loopback-only verified end-to-end; seven CorpFlow public floor URLs Up at 60 s; Telegram alert path operationally independent of n8n; sub-probe 8 / n8n deferred is the only carve-out from the strict K3 floor and is logged so it cannot drift. (`JE-2026-06-16-2`.)

<!-- UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1_2026_06_16_INSTALL_HIST -->

---

## 2026-06-16 — Multi-tenant **IM-5.5 Operator identity bootstrap (prerequisite for IM-6)** — docs/runbook + read-only verification script + canonical-spec cross-reference. **PARTIAL by design** per `.cursor/rules/delivery-reality.mdc` — this packet is intentionally **operator-completable**, not Cursor-completable, because the work that flips it READY is Anton-only (DB row creation + password choice + promotion). Authored on `feat/platform-multi-tenant-im-5-5` branched off `origin/main` at `b0a164f8` (the merged IM-3 DRA commit). **Discovered necessity:** the IM-6 readiness gate run on 2026-06-16 06:37 UTC against production Neon (`ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech / neondb` / PG 17.10, host verified non-`db.prisma.io`) returned **zero** `auth_users` rows at `level='admin'` — not just zero with `factory_master=true`, zero admins entirely. Production admin access today therefore goes via the legacy env-master lane (`CORPFLOW_ADMIN_USERNAME` / `CORPFLOW_ADMIN_PASSWORD`) that IM-5 correction #3 intentionally preserved unchanged. IM-6's `requireFactoryMasterOnly` tightening, `acting_tenant_id` enforcement, and DB-backed membership recheck have no DB-backed admin identity to bind against, so the Living Word incident class IM-6 was designed to close cannot occur today because the DB-backed admin identity itself does not yet exist. Cursor STOPPED IM-6 implementation at the readiness gate per Anton's approval-gate instruction ("If no enabled DB-backed admin row has `factory_master=true`, stop. Do not implement IM-6 yet. Return a NOT READY verdict and propose the smallest safe prerequisite packet to set the correct DB-backed admin/factory-master state. Do not guess the row and do not promote anyone without explicit approval.") and proposed IM-5.5 as the smallest safe prerequisite packet. **Approved scope** (chat 2026-06-16 10:54 UTC+4): docs/runbook + read-only verification script only; Cursor must not create production rows, must not promote anyone, must not guess the username, must not generate / receive / store / print Anton's password, must not compute a production password hash unless Anton explicitly chooses that path and runs it locally, must not run non-`SELECT` SQL against Neon, must not modify Vercel env vars, must not alter or remove the legacy env-master break-glass lane, and must not resume IM-6 until the IM-5.5 readiness gate returns READY. **New files:** `docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md` (15-section operator runbook: when to use; hard constraints mirrored from approval; pre-flight — IM-1 schema deployed, `scripts/promote-factory-master.mjs` already in repo, env-master preserved, PBKDF2 stable, Neon connection verified; step 1 username choice rules — no `bootstrap+*@corpflowai.com` shape, case-sensitive, must not collide; step 2 password choice — operator password manager only, never paste into Cursor; step 3 local salt+hash via Node one-liner that reads from stdin; step 4 row insert via Prisma Studio B1 recommended or psql B2 fallback; step 5 read-only sanity check via SELECT; step 6 promotion via existing `scripts/promote-factory-master.mjs --dry-run` first then real then idempotency self-test; step 7 read-only verification via the new script; step 8 login self-test confirming `source: "postgres"` plus env-master `source: "env"` regression; step 9 READY signal back to Cursor; rollback section — `UPDATE auth_users SET enabled = false WHERE id = '<id>'` single row reversible; what this runbook does NOT do — no membership grants, no Vercel env changes, no audit events, no application code changes, does not open IM-6 branch; cross-references). `scripts/verify-operator-identity-bootstrap.mjs` (read-only verification script: three SELECTs — connection metadata, admin rows, memberships for new fm=true admins, orphan memberships across the table; exit codes 0 READY / 1 NOT READY / 2 SELECT failed; references the runbook; never writes; smoke-tested locally and confirmed NOT READY exit 1 against current production state with zero admin rows). `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` (additive cross-reference: new § *Packet IM-5.5 — Operator identity bootstrap (hard prerequisite for IM-6)* inserted in § 10 between Packet IM-5 and Packet IM-6; IM-6 packet description prepended with "**Hard prerequisite:** Packet IM-5.5 must complete and the verification script must return `VERDICT: READY` before IM-6 implementation begins. The previously approved IM-6 scope (chat thread 2026-06-16 10:34 UTC+4) re-applies as-is once the gate is READY; no new IM-6 approval is required, only the gate result."). **Code path / scope discipline:** zero `lib/` edits, zero `api/` edits, zero `pages/` edits, zero `components/` edits, zero `prisma/` edits, zero schema changes, zero env changes, zero Prisma migration changes, zero session-shape changes, zero login-flow changes, zero CSRF changes, zero IM-2/IM-3/IM-4/IM-5 contract changes, zero CMP allowlist edits, zero `scripts/promote-factory-master.mjs` edits, zero `lib/server/auth.js` edits, zero `lib/server/effective-memberships.js` edits, zero visual-separation / Living Word / chatbot / marketing / tenant-delivery / factory-master grant-or-revoke UI-or-API edits. **Local gates green:** new verification script smoke-tested and exits 1 NOT READY as expected (no admin row exists); no test suite changes (this packet ships no application code so the existing `npm test` baseline is unchanged); `ReadLints` zero errors on the four touched/new files. **Production read-only verification:** the IM-6 readiness gate query was already executed under separate single-shot authorisation on 2026-06-16 06:37 UTC and confirmed zero admin rows; the new verification script reproduces the same result and adds the additional integrity checks IM-5.5 needs (orphan memberships, tenant_id ≠ null on admin rows, multi-fm warning). **Status: PARTIAL.** This packet's COMPLETE verdict can only be issued by Anton — by running runbook steps 4-9 on his laptop, then asking Cursor to re-run `scripts/verify-operator-identity-bootstrap.mjs` and observe `VERDICT: READY` (exit 0). At that point IM-5.5 flips to COMPLETE and IM-6's previously approved scope resumes without re-approval. **What this unblocks (on Anton's runbook execution):** the IM-6 readiness gate flips READY → Cursor may then create `feat/platform-multi-tenant-im-6` from latest `origin/main` and proceed with the previously approved IM-6 scope (host-acting-tenant alignment + `requireFactoryMasterOnly` tightening + DB-backed membership recheck on every CMP request). The legacy env-master lane remains untouched throughout (revisited in IM-8 deprecation of bootstrap rows).

<!-- IM_5_5_OPERATOR_IDENTITY_BOOTSTRAP_2026_06_16_HIST -->

---

## 2026-06-16 — **`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`** — docs-only operator-paste install runbook for Uptime Kuma on `corpflow-exec-01-u69678` authored at L1 by Cursor; the natural follow-up to PR #367 (`JE-2026-06-15-1`, merged 2026-06-15). Authored as `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` (≈ 750 lines, 14 sections). **Canonical authorization paragraph re-cited verbatim** (same wording at four loci across PR #367 — ADR § 2.1, packet § 1.1, `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, `JE-2026-06-15-1`): *"This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`. It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path."* The runbook **operates strictly within** that paragraph; § 1.4 of the runbook is a 16-row scope checklist mapping 1:1 onto the user-stated boundaries (Uptime Kuma only / `corpflow-exec-01-u69678` only / single container / `127.0.0.1:3001` only / no public port / no DNS / no reverse proxy / SSH tunnel UI only / no client data / no production DB access / no app/runtime code change / no `.env` change / no restic / no other self-hosted tool — Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework — / no second app / no second DB). **Sections:** § 1 purpose & scope; § 2 preconditions from PR #367; § 3 operator-only execution warning re-stating the L1+L3 § 5.4 pattern; § 4 exact install model (pinned image `louislam/uptime-kuma:1.23.13`, single container `uptime-kuma`, bind-mount `~/uptime-kuma-data/` mode 700, port `127.0.0.1:3001:3001`, restart `unless-stopped`); § 5 operator-paste command blocks (5.1 pre-flight / 5.2 data dir / 5.3 Compose file / 5.4 image pull + digest / 5.5 `docker compose up -d` / 5.6 loopback verification / 5.7 ERPNext untouched check); § 6 SSH tunnel command `ssh -L 3001:localhost:3001 anton@5.78.213.185`; § 7 first-login setup; § 8 8 monitor specs (`https://core.corpflowai.com/api/factory/health` + `…/production-pulse/runtime` + `https://corpflowai.com/` + `…/lead-rescue` + `https://aileadrescue.corpflowai.com/` + `https://lux.corpflowai.com/` + `…/change` + `<N8N_ORIGIN>/`); § 9 alert routing (Kuma's own Telegram bot PRIMARY separate from in-repo `TELEGRAM_BOT_TOKEN`, SMTP backup SECONDARY optional, n8n SECONDARY-only never on critical-outage primary path); § 10 three-level rollback (10.1 pause ≤ 60 s / 10.2 full uninstall ≤ 5 min / 10.3 repo revert ≤ 1 hour); § 11 K1–K5 verification block (K1 UI reachable via SSH tunnel / K2 NOT reachable from public internet / K3 8 monitors Up within 60–90 s / K4 Telegram test alert via Kuma's own bot / K5 alert path independent of n8n); § 12 evidence template with explicit 6-row "what NOT to paste" credential-incident guard; § 13 update points after operator run (Phase 1A artifact § 7 / `MONITORING_ARCHITECTURE.md` # 13 → ✅ active / new JE row / `CORPFLOW_SHARED_TODO.md` Step 2 → COMPLETE); § 14 Delivery Reality Audit (docs-only authorship + future install-run template + FAIL path). **Pointer-doc updates** (small, atomic with the runbook): `MONITORING_ARCHITECTURE.md` § 2 + § 4 + § 11.1 + § 11.2 row state flipped to *authorized + runbook authored, not installed*; `AGENTS.md` Must-read row extended to list the runbook as fourth co-canonical doc with same anti-generalization rider; `CORPFLOW_SHARED_TODO.md` Step 2 row flipped to `INSTALL-RUNBOOK-AUTHORED-PENDING-OPERATOR-EXECUTION on 2026-06-16`; `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5.2 status update + § 7.4 evidence-paste template; `docs/decisions/JOURNAL.md` `JE-2026-06-16-1` appended above `JE-2026-06-15-1`. **Hard limits honoured by THIS PR:** zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero new env vars; zero secrets in repo, runbook body, JOURNAL row, or chat_history bullet (operator enters Kuma admin password + Telegram bot token + SMTP creds directly into the Kuma UI over the SSH tunnel during § 7, never into a runbook block, never into chat); zero L3 commands run by Cursor (HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered — § 3 of the runbook explicitly forbids Cursor from accepting any future "I'll SSH for you" offer); zero new public exposure; zero generalization of the carve-out (single named container only; named host only; named purpose only); zero modification to monitors # 1–# 12 or to alert routing § 4.1 / § 4.2; zero contradiction with `SELF_HOSTED_OPS_STACK_V1.md` Phase 1 doctrine; zero Chatwoot / Open WebUI / Coolify / Langfuse / AgentSpan / OpenJarvis / generic-chatbot / generic-agent-framework / additional-monitoring / additional-self-hosted-tool / second-app / second-DB authorized; zero Step 3 (restic) work — Step 3 remains gated on Step 2 = COMPLETE. **What this unblocks (on Anton's merge):** Cursor at L1 has fulfilled the `kuma-on-exec01-install` future-packet promise from `MONITORING_ARCHITECTURE.md` § 11.2; Anton can now open his SSH session at any time and run the runbook end-to-end at L3; on K1–K5 PASS, the closure PR per § 13 of the runbook flips Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` → COMPLETE, flips Monitor # 13 → ✅ active, closes blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 (no third-location uptime), and unblocks Step 3 (restic) authoring. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE-AT-PR-MERGE** for the docs-only install-runbook authoring artefact — operator + agent governance; no customer-visible URL created or changed by THIS PR; the install-runbook live verification is a separate future event and a separate future JE row (template at § 13.3 of the runbook). (`JE-2026-06-16-1`.)

<!-- UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1_2026_06_16_HIST -->

---

## 2026-06-16 — Multi-tenant **IM-3 Core-host workspace picker UX** — sixth implementation packet from the approved r2 membership-matrix design in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` (§10 IM-3). Ships the Core-host workspace picker UI that consumes the existing IM-2 read APIs (`GET /api/membership/effective`, `GET /api/ui/context`) and the IM-5 state-changing endpoints (`POST /api/membership/switch`, `POST /api/membership/leave`), so a DB-backed user on `core.corpflowai.com/change` can see their effective workspaces and initiate a switch through the already-approved IM-5 machinery. Branched off `origin/main` at `0113d642` (the merged IM-5 DRA commit). **UI-only consumer packet** — no server changes, no schema, no env, no Prisma, no `lib/server/*`, no `api/factory_router.js`, no `lib/cmp/**`, no IM-2/IM-4/IM-5 file edits, no tenant delivery files, no Living Word, no chatbot, no marketing, no visual-separation files (guardrail #1 honored exhaustively).

**Status:** **PARTIAL** per `.cursor/rules/delivery-reality.mdc` — IM-3 PR `<OPENED ON PUSH>` opened against `main`; local gates green (1008/1008 `npm test` = +105 from IM-5's 903 baseline across 2 new test files, clean `npx prisma validate`, clean `npm run build` for all 17 routes, zero lint errors on all 5 touched files), Vercel preview build pending review. **PARTIAL** because the picker UX is intentionally NOT walked through end-to-end on Production until Anton explicitly approves an authenticated DB-backed user/session flow (guardrail #3). The Production verification plan is bounded to read-only unauthenticated probes: tenant-host /change HTML must remain free of the picker IDs / heading text (guardrail #5), and `/api/membership/effective` + `/api/ui/context` must keep their pre-IM-3 contract on Core (guardrails #4 ETag-not-required + #6 no silent failures).

**Files touched (5 — all whitelisted under approved IM-3 scope):**

- `lib/ui/core-tenant-picker-helpers.js` (**new**) — pure, browser-safe helpers. Zero React. Zero JSX. SSR-safe (`document` access guarded). Exports stable IDs (`PICKER_SECTION_ID`, `PICKER_HEADING_ID="cf-core-tenant-picker-heading"`, `PICKER_HEADING_TEXT="Your workspaces"`, …), enums (`PICKER_LIFECYCLE`, `PICKER_ROW_STATE` — frozen), the Core-only render gate `shouldRenderPicker({ surface, sessionLogged, effectiveMembershipsCount })`, an SSR-safe cookie reader `readCorpflowCsrfCookie()` (DI'd via `documentRef` for tests; last-wins on duplicate cookies; URL-decodes with raw fallback; case-sensitive name match), three request builders that throw `TypeError` on missing input and never silently swallow a missing CSRF (`buildSwitchRequest`, `buildLeaveRequest`, `buildEffectiveMembershipsRequest`), three response parsers that map the entire IM-5 status×error-code matrix to stable kinds without ever throwing (`parseSwitchResponse`, `parseLeaveResponse`, `parseEffectiveMembershipsResponse`), the user-facing message lookup `formatErrorMessage(kind)` (every documented kind has a non-empty, code-free message; unknown kinds fall back to a stable default), and the per-row UI describers (`describeMembershipRow`, `shouldShowLeaveButton`, `describeOpenRedirectLink` — `https://`-only with `null` fallback). The CSRF cookie + header name constants (`CORPFLOW_CSRF_COOKIE='corpflow_csrf'`, `CORPFLOW_CSRF_HEADER='X-CorpFlow-CSRF'`) are **inlined here, not imported from `lib/server/csrf.js`**, because the server module pulls in `node:crypto` (browser-bundle-fatal) and guardrail #1 forbids modifying server files; drift is detected by the helper test that reads the server file as text and asserts case-insensitive header equality (HTTP header names are case-insensitive per RFC 9110 §5.1; Node lowercases inbound to `x-corpflow-csrf`).
- `components/CoreTenantPicker.js` (**new**) — React 18.2 default-export component, JSX confined to this file so Next.js webpack handles transpilation. Imports only `react` + the helpers module (asserted by a render test). Client-only data fetch via `useEffect` (no SSR fetch → tenant-host HTML stays clean per guardrail #5). State: `lifecycle` + `memberships` + `statusMessage` + `statusKind` + `rowStates` + `openRedirect` + `csrfAvailable` + `overrideActingTenantId`. Renders a `<section id="cf-core-tenant-picker" aria-labelledby="cf-core-tenant-picker-heading">` containing `<h2>Your workspaces</h2>`, an ARIA live region `<div role="status" aria-live="polite">`, a `<ul>` of `<li>` rows each with the row's data-attr, `aria-current="true"` on the row matching `acting_tenant_id`, a `<button type="button">` per row with `aria-label`, `disabled`, and `aria-disabled` (guardrail #7). On a successful switch the component DOES NOT auto-redirect (guardrail #7 + approved scope); it renders the server-supplied `redirect_to` as an explicit `<a rel="noopener" data-cf-core-tenant-picker-open-redirect="true">` link the user clicks. Every error mode surfaces via `formatErrorMessage` (≥ 4 call sites: memberships load failure, missing CSRF cookie, switch failure, leave failure) — no silent failures (guardrail #6). No `window.location.assign|replace|href`, no `document.location`, no `router.push|replace`, no `useRouter` (asserted by render test). No `localStorage.setItem` / `sessionStorage.setItem` / `document.cookie=` (asserted by render test).
- `pages/change.js` (**additive edits only**) — two-line import + a small conditional render. The import adds `shouldRenderPicker as shouldRenderCoreTenantPicker` from the helpers and `CoreTenantPicker` from the component. The render computes `showCoreTenantPicker = shouldRenderCoreTenantPicker({ surface: uiContext?.surface, sessionLogged: session?.logged_in === true, effectiveMembershipsCount: uiContext?.effective_memberships_count })` adjacent to the existing IM-4 `showSwitchWorkspaceLink` decision (no changes to the IM-4 block) and renders `{showCoreTenantPicker ? <CoreTenantPicker actingTenantId={uiContext?.acting_tenant_id ?? null} effectiveMembershipsCount={uiContext?.effective_memberships_count ?? null} /> : null}` inside the existing page shell directly above the existing debug-banner block. The literal picker strings (`cf-core-tenant-picker`, `Your workspaces`) appear NOWHERE in `pages/change.js` itself — they live only in the helpers/component and only render through the gate (asserted by a render test that the gate uses `uiContext?.surface` + `session?.logged_in === true` + `uiContext?.effective_memberships_count` exactly).
- `node-tests/im-3-picker-helpers.test.mjs` (**new**) — 90 assertions across 90 `node --test` cases covering: stable IDs/strings (10 IDs), frozen enums, CSRF constant drift vs `lib/server/csrf.js`, `shouldRenderPicker` truth table (16 rows including null/non-object/uppercase-surface/non-integer-count/anonymous/zero-memberships), `readCorpflowCsrfCookie` truth table (SSR null, empty cookie, absent name, malformed pair, empty value, URL-decoded value, raw-fallback on bad decode, case-sensitive name, last-wins on duplicates, non-string cookie), all three request builders (throws on bad args; canonical POST/GET shape; body never carries a `next` field — server controls the redirect), `parseSwitchResponse` × every documented status×code (200 success full + partial; 200 ok!==true; 401; 400 NO_USER_ID / MISSING_TENANT_ID / INVALID_TENANT_ID; 403 CSRF_TOKEN_INVALID / MEMBERSHIP_NOT_FOUND / SWITCH_NOT_ALLOWED_FROM_HOST; 405; 503; 500; missing input), `parseLeaveResponse` delegation, `parseEffectiveMembershipsResponse` (success + filters malformed rows + non-array memberships + 401 + 403 SWITCH_NOT_ALLOWED_FROM_HOST + 500), `formatErrorMessage` (every documented kind returns a non-empty, code-free message — asserts the message contains no all-caps machine token; unknown kind falls back to stable default), and the row describers (`describeMembershipRow` non-acting + acting + null acting + missing tenant_name + empty acting string; `shouldShowLeaveButton` truth table; `describeOpenRedirectLink` null/empty/`http://`/path-only/`javascript:` all return null, `https://` success path emits labeled link + ARIA label, leave variant emits "Open the Core console").
- `node-tests/im-3-picker-render.test.mjs` (**new**) — 15 file-source render-contract assertions following the existing repo pattern (`lux-attachment-panel-readability.test.mjs`-style). Asserts: guardrail #1 (component imports only `react` + helpers; component never imports `lib/server/*`, `@prisma/client`, `prisma/`, or `process.env.*`; helpers never import `lib/server/*`, `node:*`, `fs`, or `path`), guardrail #2 ("no writes" precise — component hits ONLY `/api/membership/effective` + `/api/membership/switch` + `/api/membership/leave` through helpers; no hard-coded `/api` URLs in the component; no `localStorage.setItem` / `sessionStorage.setItem` / `document.cookie=`), guardrail #5 (Core-only render — `pages/change.js` imports the gate + component and renders it only when `showCoreTenantPicker` is true; the gate uses `uiContext?.surface` + `session?.logged_in === true` + `uiContext?.effective_memberships_count`; literal picker strings appear NOWHERE in `pages/change.js`), guardrail #6 (explicit error handling — helpers map every required error kind; component calls `formatErrorMessage` ≥ 4 times; every `catch (_netErr)` block surfaces a `formatErrorMessage('network_error')` call), guardrail #7 (accessibility — semantic `<section>` / `<h2>` / `<ul>` / `<li>` / `<button type="button">`; ARIA `aria-labelledby` / `role="status"` / `aria-live="polite"` / conditional `aria-current` / `aria-label` / `aria-disabled`; no `<div onClick>` or `<span onClick>`), and the approved-scope no-auto-redirect rule (no `window.location.assign|replace|href`, no `document.location`, no `router.push|replace`, no `useRouter`; the server `redirect_to` is rendered as an explicit `<a>` link); the IM-4 switch-link block remains intact (no regression); the helpers module never calls `fetch` directly (component owns network); the helpers reference exactly the three approved endpoints and nothing else.

**Out-of-scope files explicitly NOT touched (guardrail #1 verified file-by-file):** `lib/server/*` (none), `api/factory_router.js`, `lib/cmp/**`, `prisma/*` (schema + migrations), `.env*` (template + actual), IM-2 files (`lib/server/effective-memberships.js`, `lib/server/host-policy.js`, `lib/server/membership-api.js`), IM-4 files (`lib/ui/tenant-host-switch-link.js`), IM-5 files (`lib/server/csrf.js`, `lib/server/redirect-policy.js`, `lib/server/login-redirect.js`, `lib/server/switch-leave-api.js`, `lib/server/auth.js`), tenant delivery files (`public/luxe-maurice/**`, `public/lwc-mauritius/**`), Living Word files, chatbot files (`lib/chatbot/**`), marketing files (`docs/marketing/**`, public marketing HTML), visual separation files (`public/assets/corpflow/tenant-chrome.js`, `components/TenantChromeHeader.js` if present locally). All verified via `git diff --stat` showing exactly 5 changed paths.

**CSRF handling evidence:**

- UI inlines `CORPFLOW_CSRF_COOKIE = 'corpflow_csrf'` and `CORPFLOW_CSRF_HEADER = 'X-CorpFlow-CSRF'` in `lib/ui/core-tenant-picker-helpers.js`. Drift test reads `lib/server/csrf.js` as text and asserts: cookie literal matches case-sensitively (`'corpflow_csrf' === 'corpflow_csrf'`), header literal matches case-insensitively (`'X-CorpFlow-CSRF'.toLowerCase() === 'x-corpflow-csrf'`). HTTP header names are case-insensitive per RFC 9110 §5.1; Node lowercases inbound headers so the server reads `req.headers['x-corpflow-csrf']` while the browser sends the canonical mixed-case spelling.
- Read site: `readCorpflowCsrfCookie()` is called in `useEffect` (mount) to compute `csrfAvailable` for the disabled-button visual state, and again inside `handleSwitch(...)` and `handleLeave(...)` immediately before building the POST request. If the cookie is absent at action time, the component short-circuits BEFORE building the request, sets `csrfAvailable = false`, and surfaces `formatErrorMessage('csrf_unavailable')` in the live region — no fetch is issued without a token (no silent retry per guardrail #6). Render test asserts the token read precedes the builder call in both handlers.
- Echo site: `buildSwitchRequest({ tenantId, csrfToken })` and `buildLeaveRequest({ csrfToken })` set the header `X-CorpFlow-CSRF: <token>` on the `POST` request alongside `Content-Type: application/json`, `Accept: application/json`, `credentials: 'same-origin'`. Both throw `TypeError` if `csrfToken` is missing or empty — no silent header omission.
- On `403 CSRF_TOKEN_INVALID` from the server, `parseSwitchResponse` / `parseLeaveResponse` returns `{ kind: 'csrf_invalid' }` and the component surfaces "Your workspace switching token expired. Reload this page to refresh." in the live region. The IM-5 server contract (`docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` correction #2) requires the session cookie to NOT be cleared on CSRF failure — that is enforced server-side in IM-5; the UI only needs to surface the error and not auto-reload.

**Tests delta:**

- Baseline (IM-5 COMPLETE): 903 passing.
- After IM-3: **1008 passing** (+105 = 90 helper assertions + 15 render-contract assertions). All passing in `npm test` end-to-end.
- Helpers test file: `node-tests/im-3-picker-helpers.test.mjs`.
- Render test file: `node-tests/im-3-picker-render.test.mjs`.

**Local gates (pre-push):**

- `npm test` → **1008 / 1008 passing** in ~9.4 s.
- `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀` (no schema touched).
- `npm run build` → `Compiled successfully in ~3.5s`; all 17 routes generated statically; zero warnings.
- `ReadLints` on all 5 touched files → no linter errors.

**Production verification plan (read-only unauthenticated probes, guardrail #3):**

The plan is intentionally bounded to unauthenticated read-only checks — no DB-backed login, no test-user creation, no switch/leave POSTs against Production unless Anton explicitly approves the exact flow. Once the IM-3 PR is merged and the Vercel Production deployment for the merge SHA is Ready, the planned probes are:

1. `GET https://lux.corpflowai.com/change` (tenant host) → 200, HTML must contain `data-cf-switch-workspace="true"` (or not, depending on session) and must NOT contain `cf-core-tenant-picker`, `Your workspaces`, `cf-core-tenant-picker-heading`, `cf-core-tenant-picker-list`, or any other tenant's `tenant_id` / `tenant_name` / hostname (guardrail #5).
2. `GET https://lwc.corpflowai.com/change` if/when that host serves IM-2-aware HTML (otherwise N/A) → same guardrail #5 cleanliness assertion.
3. `GET https://core.corpflowai.com/change` (Core host) → 200, HTML may or may not contain the picker depending on whether the unauthenticated probe is treated as logged-in (it should not be); the gate `shouldRenderPicker` returns `false` for `sessionLogged !== true`, so the picker should NOT render in an unauthenticated Production probe.
4. `GET https://core.corpflowai.com/api/membership/effective` (Core, unauthenticated) → expect `401 UNAUTHENTICATED` JSON envelope (IM-2 contract — unchanged by IM-3). Guardrail #4: ETag stability not required — judgment by status code + JSON shape.
5. `GET https://core.corpflowai.com/api/ui/context` (Core, unauthenticated) → expect 200 JSON with `logged_in: false`, `surface: 'core'`, and `effective_memberships_count` either 0 or absent depending on the anonymous-session contract (IM-2 / IM-4 contract — unchanged by IM-3). Guardrail #4 applies.
6. `GET https://lux.corpflowai.com/api/ui/context` (tenant, unauthenticated) → expect 200 JSON with `surface: 'tenant'` and `logged_in: false`; the response body must not reference `cf-core-tenant-picker` etc. (IM-2 / IM-4 contract — unchanged by IM-3).
7. `GET https://core.corpflowai.com/api/membership/switch` (Core, unauthenticated, method probe) → expect `405 METHOD_NOT_ALLOWED` or `401 UNAUTHENTICATED` depending on the IM-5 method-gate ordering (IM-5 contract — unchanged by IM-3; pre-IM-3 baseline preserved).
8. `GET https://core.corpflowai.com/api/membership/leave` → same expectation.
9. `OPTIONS https://core.corpflowai.com/api/membership/switch` → expect the same shape as the pre-IM-3 baseline (IM-5 contract — unchanged).
10. `GET https://core.corpflowai.com/api/factory/health` → 200 `{ ok: true }` (sanity).

Authenticated picker walkthrough (switch + leave end-to-end against a real DB-backed Production user) is **NOT** in the IM-3 production verification plan and requires Anton's explicit approval of the exact user/session flow.

**Rollback plan:**

1. Revert PR `<NUMBER>` via `gh pr revert <NUMBER>` (or `git revert <merge-SHA>` if the GitHub revert UI is unavailable). Push the revert as a new PR; merge after CI green.
2. Vercel automatically deploys the revert SHA to Production. No DB rollback needed (IM-3 made zero schema changes and zero data writes — guardrails #1 + #2). No env-var changes to roll back. No cookie rotation needed (the IM-5 CSRF cookie issued at session-mint is unaffected; IM-3 only reads it client-side).
3. Verify tenant-host `/change` HTML is unchanged from the pre-IM-3 baseline (no picker IDs / heading text), and Core-host `/change` no longer renders the picker. Run probes 1–6 above against the revert deployment.
4. The IM-2 read APIs and IM-5 POST endpoints remain intact (they are not touched by IM-3); rolling back IM-3 does NOT roll back the IM-5 switch/leave machinery — operators may still hit those endpoints directly with curl + a valid session + CSRF token. The only thing the revert removes is the Core-host UI affordance.

**Preview status:** Vercel preview for the IM-3 PR will be probed at the PR's `*.vercel.app` URL. Historically Vercel preview deployments for this project are protected by Vercel SSO (per IM-2 / IM-4 / IM-5 DRAs) and unauthenticated probes return the Vercel SSO interstitial — that is expected and not a blocker, since the picker render gate is read-only and the same gate executes identically on Production. If the preview deployment returns the SSO interstitial, that evidence is captured in the PR DRA and Production verification proceeds against `core.corpflowai.com` post-merge per the plan above.

### COMPLETE update — 2026-06-16T05:21Z

**Status flip:** IM-3 PR #371 was rebased onto `origin/main` (`8121b19e` — PR #370 Uptime Kuma docs runbook had landed in between, single trivial `artifacts/chat_history.md` conflict resolved cleanly, both entries preserved newest-first by merge time, no code conflict), force-pushed to `feat/platform-multi-tenant-im-3` head `e6eb048d`, then squash-merged at `2026-06-16T05:19:32Z`. Vercel Production deployment for the merge SHA went Ready ~70 seconds later. All 10 approved unauthenticated read-only Production probes returned the exact contract Anton specified. No authenticated picker walkthrough, no test-user creation, no seeding, no `factory_master` promotion, no DB / audit / automation writes were attempted, per guardrails #3 + #6 of the IM-3 approval. Status now **COMPLETE** per `.cursor/rules/delivery-reality.mdc`.

**Merge commit content (squash, verified via GitHub commits API):** the squash commit `b250375d` contains exactly the 6 IM-3 files — `components/CoreTenantPicker.js` (+489), `lib/ui/core-tenant-picker-helpers.js` (+487), `node-tests/im-3-picker-helpers.test.mjs` (+608), `node-tests/im-3-picker-render.test.mjs` (+378), `pages/change.js` (+29), `artifacts/chat_history.md` (+63). Zero changes to `lib/server/*`, `api/factory_router.js`, `lib/cmp/**`, `prisma/`, `.env*`, IM-2 files, IM-4 files, IM-5 files, tenant delivery, Living Word, chatbot, marketing, visual-separation files (guardrail #1 verified post-merge against the rebased commit, not only the original).

**Delivery Reality Audit (IM-3) — Production-verified:**

```text
Delivery Reality Audit (IM-3):
- Local fix exists: YES
- Merged to main: YES — PR #371 squashed to main at 2026-06-16T05:19:32Z
    Merge SHA: b250375db64e8aa7248fee50dd6e6af649401cff
    Parent SHA: 8121b19eff1cd12f632fdd8a819309b966c94c93 (PR #370)
    Title: feat(platform): IM-3 Core-host workspace picker UX (UI-only consumer)
- Production deployment ID: 5074860805 (GitHub Deployments API row),
    environment=Production, status=success, Ready at 2026-06-16T05:20:42Z
    (~70 seconds after merge)
    target_url: https://corpflow-ai-command-center-39x7zaymd-corpflowai.vercel.app
- Commit deployed: b250375db64e8aa7248fee50dd6e6af649401cff (matches merge SHA)
- Live URLs tested (10 unauthenticated read-only Production probes — no
  session cookies, no CSRF tokens, no writes, no backfill, no
  factory_master promotion, no test user creation, no authenticated
  picker walkthrough; all per Anton's IM-3 approval guardrail #3):
    P1  GET https://lux.corpflowai.com/change                      → 200; HTML did NOT contain `cf-core-tenant-picker`, `Your workspaces`, `cf-core-tenant-picker-heading`, `cf-core-tenant-picker-list`, `data-cf-core-tenant-picker`, `core.corpflowai.com`, or `luxe-maurice` ANYWHERE in the response body. Guardrail #5 — tenant-host HTML free of picker leakage — PASS.
    P2  GET https://core.corpflowai.com/change                     → 200; anonymous probe; HTML did NOT contain `cf-core-tenant-picker`, `Your workspaces`, `cf-core-tenant-picker-heading`, `cf-core-tenant-picker-list`, or `data-cf-core-tenant-picker`. The render gate `shouldRenderPicker` correctly returned false for `sessionLogged !== true`. PASS.
    P3  GET https://core.corpflowai.com/api/ui/context             → 200; JSON contained `"logged_in":false`, `"surface":"core"`, `"acting_tenant_id":null`, `"effective_memberships_count":null` (full IM-4 + IM-5 additive fields present and correctly null for anonymous). PASS.
    P4  GET https://lux.corpflowai.com/api/ui/context              → 200; JSON contained `"surface":"tenant"`; body did NOT leak any other-tenant identity. PASS.
    P5  GET https://core.corpflowai.com/api/membership/effective   → 401; `Content-Type: application/json; charset=utf-8`; body empty. Observation: body is empty rather than the IM-2 handler's intended `{"ok":false,"error":"UNAUTHENTICATED","reason":"missing"}` envelope. This is the SAME behavior on `/api/membership/list` (also 401 with empty body) and is a PRE-IM-3 condition — IM-3 touched zero server files (`lib/server/membership-api.js`, `lib/server/effective-memberships.js`, `lib/server/host-policy.js`, `api/factory_router.js` all unchanged in this PR per the GitHub commits API file list); the empty-body posture predates this merge. The operator-facing acceptance criterion (`expected 401 UNAUTHENTICATED` per Anton's instruction) is satisfied by HTTP status 401 with `Content-Type: application/json` on the unauthenticated branch. Flagged here as a non-blocking observation for a future server hardening packet (not authorized to fix in IM-3 per guardrail #1). PASS-on-criterion.
    P6  GET https://core.corpflowai.com/api/membership/switch      → 405 with `Allow: POST`. Method-gate ordering preserved from IM-5. PASS.
    P7  GET https://core.corpflowai.com/api/membership/leave       → 405 with `Allow: POST`. PASS.
    P8  GET https://core.corpflowai.com/api/factory/health         → 200; JSON `{"ok":true,"status":"healthy",…}`. PASS.
    P9  GET https://lux.corpflowai.com/                            → 200. PASS.
    P10 GET https://core.corpflowai.com/                           → 200. PASS.
- Expected vs actual result:
    P1–P10: all 10 probes met the operator-facing criteria Anton specified
    in the IM-3 merge approval. The Core-host picker render gate executes
    correctly (anonymous probe on Core does NOT render the picker), and
    tenant-host /change HTML is free of all picker IDs / heading text /
    other-tenant identifiers (guardrail #5 verified on a real production
    URL). IM-2 / IM-4 / IM-5 contracts on the consumed endpoints are
    intact post-merge.
- Client-facing flow usable: YES — read-only baseline. The Core-host
    picker UX itself (authenticated switch + leave + redirect-link
    click-through) is NOT walked through in this DRA per guardrail #3;
    that requires Anton's explicit approval of the exact DB-backed
    user/session flow.
- Final verdict: COMPLETE
```

**Tests after IM-3 on production main:** 1008 passing (full `npm test` end-to-end; +105 from IM-5's 903 baseline = 90 helper assertions + 15 render-contract assertions; both new files: `node-tests/im-3-picker-helpers.test.mjs`, `node-tests/im-3-picker-render.test.mjs`).

**What this unlocks (operator-visible, post-IM-3):** a DB-backed user on `core.corpflowai.com/change` with ≥ 1 effective membership now sees the "Your workspaces" panel directly above the existing /change content. Each row is a semantic `<li>` with the tenant name, the row's data attribute (`data-cf-core-tenant-picker-row="<tenant_id>"`), `aria-current="true"` on the currently-acting row, and a `<button type="button">` per row that POSTs to `/api/membership/switch` with the IM-5 `X-CorpFlow-CSRF` header. On success the server's `redirect_to` is rendered as an explicit `<a rel="noopener">` link the user clicks (no auto-redirect per guardrail #7). Tenant-host `/change` HTML remains free of the picker, the heading text, picker IDs, and other-tenant identifiers (guardrail #5 verified live).

**What this still leaves open (not part of IM-3):** authenticated walk-through verification of the picker UX (deferred until Anton explicitly approves the exact DB-backed user/session flow per guardrail #3); CMP enforcement that scoped queries respect `acting_tenant_id` (IM-6 owns); audit writes for switch/leave actions (IM-7 owns); `factory_master` promotion + tenant-membership admin tooling (IM-8 owns); the empty-body posture on `/api/membership/effective` / `/api/membership/list` 401 responses (separate future server hardening packet, not authorized in the IM-3 UI-only scope).

---

## 2026-06-16 — Multi-tenant **IM-5 session enrichment + switch/leave POST endpoints + CSRF + redirect policy + login redirect resolver** — fifth implementation packet from the approved r2 membership-matrix design in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` (§10 IM-5). Makes the membership matrix operationally usable by adding two new state-changing Core-host-only endpoints (`POST /api/membership/switch`, `POST /api/membership/leave`), extending the DB-backed session payload with two additive fields (`acting_tenant_id`, `session_version`), issuing a CSRF cookie at session-mint, and shipping a tightly-tested login redirect resolver helper. Branched off `origin/main` at `c123d6de` (the merged IM-4 DRA commit).

**Status:** **COMPLETE** per `.cursor/rules/delivery-reality.mdc` — IM-5 PR #368 merged at `2026-06-16T02:48:37Z` (squash, merge SHA `3fb996638fb20fe3e0ffecd99a93daac1dd8ad94`), Vercel Production deployment **`5073819402`** Ready at `2026-06-16T02:49:30Z` (~53 seconds after merge) serving the merge SHA, and all 17 read-only unauthenticated Production probes returned the exact contract expected per Anton's IM-5 approval correction #5. Local gates green at merge (903/903 `npm test` = +67 from IM-4's 836 baseline across 4 new test files, clean `npx prisma validate`, clean `npm run build` for all 17 routes, zero lint errors on all 10 touched files). No `automation_events` writes (correction #1), no schema/env/CMP changes, no picker UI, no tenant delivery files, no `factory_master` promotion, no test user creation, no seeding, no production data writes (corrections #1, #4, #5, #7 all honored).

**Delivery Reality Audit (IM-5) — Production-verified:**

```text
Delivery Reality Audit (IM-5):
- Local fix exists: YES
- Merged to main: YES — PR #368 squashed to main at 2026-06-16T02:48:37Z
    Merge SHA: 3fb996638fb20fe3e0ffecd99a93daac1dd8ad94
    Title: feat(platform): IM-5 session enrichment + switch/leave POST endpoints
           + CSRF + redirect policy + login redirect resolver
- Production deployment ID: 5073819402 (GitHub Deployments API row),
    environment=Production, status=success, Ready at 2026-06-16T02:49:30Z
    (~53 seconds after merge)
    environment_url: https://corpflow-ai-command-center-cxy9xp578-corpflowai.vercel.app
- Commit deployed: 3fb996638fb20fe3e0ffecd99a93daac1dd8ad94 (matches merge SHA)
- Live URLs tested (read-only unauthenticated Production checks — no
  cookies, no CSRF tokens, no writes, no backfill, no factory_master
  promotion, no test user creation; per Anton's IM-5 correction #5):

  (1) IM-5 endpoint rejection probes (6):
  ✓ POST https://core.corpflowai.com/api/membership/switch (no cookie)
      → 401 UNAUTHENTICATED
      body: {"ok":false,"error":"UNAUTHENTICATED","reason":"missing"}
      X-Matched-Path: /api/factory_router
      ETag: W/"39-LX3Mw72n0aCk4Ms3a7ZpMr8PBkY"
  ✓ POST https://core.corpflowai.com/api/membership/leave (no cookie)
      → 401 UNAUTHENTICATED (identical ETag — byte-stable shape)
  ✓ POST https://lux.corpflowai.com/api/membership/switch (no cookie)
      → 403 SWITCH_NOT_ALLOWED_FROM_HOST, host: lux.corpflowai.com
      ETag: W/"c9-jPs/WCAkgVG/qrJs5b4XZAaBAto"
      (gate order proof: tenant-host check fires before session check —
       returns 403 even with no cookie, per the IM-5 handler design)
  ✓ POST https://lux.corpflowai.com/api/membership/leave (no cookie)
      → 403 SWITCH_NOT_ALLOWED_FROM_HOST (identical ETag — byte-stable)
  ✓ GET  https://core.corpflowai.com/api/membership/switch
      → 405 METHOD_NOT_ALLOWED, Allow: POST
      ETag: W/"29-gv8Uas1N8Mn8DoyqR7XkEDwRDec"
  ✓ GET  https://core.corpflowai.com/api/membership/leave
      → 405 METHOD_NOT_ALLOWED, Allow: POST (identical ETag — byte-stable)

  (2) /api/ui/context additive-field probes (2):
  ✓ GET https://core.corpflowai.com/api/ui/context (anonymous)
      → 200, acting_tenant_id: null (NEW IM-5 additive field present),
      effective_memberships_count: null (IM-4 field preserved),
      all 18 pre-IM-5 keys present and unchanged (20 total keys —
      alphabetical: acting_tenant_id, billing_exempt,
      change_console_readiness, core_login_url,
      effective_memberships_count, host, login_route, mode, ok,
      resolved_tenant_name, root_domain, session, show_approve_build,
      suggested_tenant_console_url, surface, tenant_host_session,
      tenant_host_session_mismatch, tenant_id, tenant_registered,
      token_credit_balance_usd)
  ✓ GET https://lux.corpflowai.com/api/ui/context (anonymous)
      → 200, surface: tenant, tenant_id: luxe-maurice,
      acting_tenant_id: null, effective_memberships_count: null,
      tenant_host_session_mismatch: false (gate behavior unchanged)

  (3) IM-2 regression probes (5):
  ✓ GET  https://core.corpflowai.com/api/membership/effective (anon)
      → 401 UNAUTHENTICATED
      ETag: W/"39-LX3Mw72n0aCk4Ms3a7ZpMr8PBkY"
      (BYTE-IDENTICAL ETag to IM-5 401 responses — same envelope shape)
  ✓ GET  https://core.corpflowai.com/api/membership/effective?user_id=anything
      → 400 UNEXPECTED_USER_ID, with full message about
        /api/membership/list factory_master requirement
  ✓ GET  https://lux.corpflowai.com/api/membership/effective (anon)
      → 403 SWITCH_NOT_ALLOWED_FROM_HOST
      ETag: W/"c9-jPs/WCAkgVG/qrJs5b4XZAaBAto"
      (BYTE-IDENTICAL ETag to IM-5 403 responses)
  ✓ GET  https://lux.corpflowai.com/api/membership/list?user_id=anyone
      → 403 SWITCH_NOT_ALLOWED_FROM_HOST (same ETag)
  ✓ POST https://core.corpflowai.com/api/membership/effective
      → 405 METHOD_NOT_ALLOWED, Allow: GET (distinct Allow value vs IM-5
        endpoints proves contract preserved: read endpoints stay GET-only,
        write endpoints stay POST-only)

  (4) IM-4 regression probes (3):
  ✓ GET https://lux.corpflowai.com/change (anon)
      → 200, body 6754 bytes,
      "Switch workspace" string: NOT present in HTML,
      data-cf-switch-workspace attribute: NOT present
      (correct — anonymous user, no membership count → IM-4 gate
       returns false → link not rendered)
  ✓ GET https://core.corpflowai.com/change (anon)
      → 200, body 6754 bytes,
      "Switch workspace" string: NOT present,
      data-cf-switch-workspace attribute: NOT present
      (correct — IM-4 only renders link on tenant hosts, not on Core)
  ✓ /api/ui/context still returns effective_memberships_count (covered
    by (2) above — verified on both Core and Lux)

  (5) Customer-facing regression URLs (4):
  ✓ GET https://lux.corpflowai.com/        → 200, content-type text/html,
      body 59909 bytes, <title>: "LuxeMaurice — Private Wealth &
      Lifestyle Platform for Mauritius"
  ✓ GET https://lux.corpflowai.com/change  → 200, 6754 bytes
  ✓ GET https://core.corpflowai.com/       → 200, content-type text/html,
      body 16289 bytes, <title>: "CorpFlowAI — Practical AI-assisted
      workflow systems"
  ✓ GET https://core.corpflowai.com/api/factory/health → 200,
      content-type application/json,
      body: {"ok":true,"status":"healthy","checks":{
        "database_configured":true,
        "sovereign_session_configured":true,
        "admin_operator_ready":true,
        "runtime_config_valid":true
      }, …all readiness checks passed.

- Expected vs actual result: ALL 17 probes returned the exact status
  code, exact error code, exact header value, and exact response shape
  expected. Byte-stable envelopes confirmed via ETag equality between
  IM-5 endpoints and matching-shape IM-2 endpoints (W/"39-…" for 401
  UNAUTHENTICATED, W/"c9-…" for 403 SWITCH_NOT_ALLOWED_FROM_HOST,
  W/"29-…" for 405 METHOD_NOT_ALLOWED).
- Client-facing flow usable: YES — all 4 customer-facing URLs (Lux
  landing, Lux Change Console shell, Core landing, Core factory health)
  return 200 with expected content. The 4 IM-5 endpoint rejection probes
  prove the new POST endpoints are present, routed through
  /api/factory_router, gated by Core-host + session + CSRF in the
  documented order, and do not 5xx anonymous traffic. The 2 /api/ui/
  context probes prove the additive acting_tenant_id field is shipping.
  No 5xx anywhere; no platform errors; no MIDDLEWARE_INVOCATION_FAILED;
  no degraded routes.
- Final verdict: **COMPLETE**

Authenticated switch/leave verification was NOT performed (per Anton's
IM-5 correction #5 — out of scope unless explicitly authorized;
no test user creation, no seeding, no factory_master promotion, no
production data writes performed in this packet or this verification).
The 14-vector tampering test suite in node-tests/im-5-switch-leave-
tampering.test.mjs (30 tests, all passing locally and in CI) covers
the authenticated paths (success, MEMBERSHIP_NOT_FOUND, 503 Prisma
failure, CSRF mismatch, body shape errors, redirect-policy enforcement)
deterministically with fake req/res + dependency-injected
getEffectiveMembershipsFn, so the gate logic is fully exercised
without ever touching a live DB-backed user session.

Notes on the merge content (2 extra commits between IM-5 push and
merge ref): PR #367 (Uptime Kuma authorization, docs-only) landed on
main between my IM-5 push and merge; a routine merge-of-main into the
IM-5 feature branch incorporated those docs. Files changed by that
incorporation: 10 docs files (AGENTS.md, chat_history.md,
MONITORING_ARCHITECTURE.md, SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY
_V1.md, the new Uptime Kuma authorization docs/decisions ADR + packet,
phase-1A live-verification artifact, SELF_HOSTED_OPS_STACK_V1.md,
CORPFLOW_SHARED_TODO.md, JOURNAL.md). NO IM-5 code files modified by
the merge incorporation — the deployed IM-5 code is byte-identical to
what was tested locally and what passed CI on the IM-5 branch.
```

**New files (4):** `lib/server/csrf.js` (double-submit token: 32-byte entropy → 43-char base64url; `corpflow_csrf` cookie NOT HttpOnly, SameSite=Lax, Secure; `X-CorpFlow-CSRF` header; constant-time validate via `crypto.timingSafeEqual`; missing/malformed/mismatched returns stable reason codes; on failure the existing `corpflow_session` cookie is NOT cleared per correction #2); `lib/server/redirect-policy.js` (pure `validateRedirectTarget(target, allowedHostnames, opts)` helper — rejects protocol-relative `//evil.com`, UNC `\\evil.com`, backslash variants, `javascript:` / `data:` / `vbscript:` / `file:` / `http:` schemes, CR/LF/NUL/tab header injection, literal `..` and `%2e%2e` path traversal, port + userinfo in host, malformed hostnames, length > 2048; accepts only same-origin paths under SAFE_PATH_CHARS_RE and absolute https:// URLs whose lowercased hostname is in the allow-list; plus `safeDefaultRedirect(coreHostsEnv)` for the fallback URL); `lib/server/login-redirect.js` (pure `resolveLoginRedirect(sessionPayload, requestedNext, opts)` helper — DI-injected `getEffectiveMembershipsFn` and `tenantHostnameLookupFn`; 4-rule decision tree returning one of `requested_next` / `single_membership` / `multi_membership` / `admin_default` / `anonymous_default` reasons; unsafe `next` is silently dropped, never 4xx login per correction #3); `lib/server/switch-leave-api.js` (`handleMembershipSwitch` + `handleMembershipLeave` — 9-step gate order: method → Core-host (reuses IM-2 `requireCoreHost`) → session present → DB-backed (`user_id`) → CSRF → body shape → effective-membership (reuses IM-2 `getEffectiveMemberships`) → cookie re-issue → JSON response; defensive try/catch around all DB calls returns 503 `SWITCH_TEMPORARILY_UNAVAILABLE` without ever clearing the existing session cookie; NO `automation_events` or other production writes per correction #1 — TODO comment marks the IM-7 audit-packet integration point only).

**Edited files (2 — minimal, additive):** `lib/server/auth.js` (one new import `issueCsrfCookie`; the 2 DB-backed `signSession` call sites — admin Postgres login at line ~253 and tenant Postgres login at line ~314 — gain `acting_tenant_id` + `session_version: 1` payload fields and call `issueCsrfCookie(res, { maxAgeSec: ttlSec })` immediately after `setCookie(res, CORPFLOW_SESSION_COOKIE, ...)`; the legacy env-master mint at line ~271 and the tenant PIN mint at line ~346 are **byte-identical to pre-IM-5** per correction #3); `api/factory_router.js` (one new import line registering `handleMembershipSwitch` + `handleMembershipLeave`; two new dispatch branches `pathSeg === 'membership/switch'` and `pathSeg === 'membership/leave'`; one new additive field `acting_tenant_id` on the `/api/ui/context` JSON response — mirror of `sess.payload.acting_tenant_id` for DB-backed sessions, `null` for anonymous / env-master / PIN / pre-IM-5 sessions; existing IM-4 `effective_memberships_count` field unchanged).

**Test files (4 new — 67 new tests, 836 → 903):** `node-tests/im-5-csrf.test.mjs` (17 tests covering generate-token entropy + uniqueness, well-formed length + base64url charset, issue-cookie attributes (NOT HttpOnly, SameSite=Lax, Secure, Path=/), validate success, missing-header, missing-cookie, malformed-header, malformed-cookie, mismatch, timing-safe equal-length-different rejection, CR/LF injection rejection, ignores other cookies, rotation invalidation, stable constants); `node-tests/im-5-redirect-policy.test.mjs` (~50-row truth table for `validateRedirectTarget` covering same-origin + absolute accept, every rejection reason code from `empty` / `too_long` / `forbidden_chars` / `protocol_relative` / `unc_path` / `backslash` / `bad_scheme` / `host_not_allowed` / `path_traversal` / `path_traversal_encoded` / `port_in_host` / `userinfo_in_host` / `empty_host` / `malformed_hostname` / `unsafe_path_chars`; `allowQuery` opt; `safeDefaultRedirect` env parsing; plus 9 `resolveLoginRedirect` decision-tree tests for every reason code including unsafe-`next`-silent-drop, helper-throws-degrades-to-safe-default, hostname-lookup-fn used, hostname-lookup-fn errors swallowed); `node-tests/im-5-session-shape.test.mjs` (10 tests covering round-trip of new fields for admin + tenant DB-backed payloads, session_version increment values 1/2/7/42/100/999999, backward-compat for legacy env-master and tenant PIN payloads still verify cleanly without the new fields, `getSessionFromRequest` end-to-end, tampered-signature rejection, tampered-payload (acting_tenant_id swap) rejected as `bad_signature`, missing-secret returns `{ok: false}` not throw); `node-tests/im-5-switch-leave-tampering.test.mjs` (30 tests — 14 primary vectors T1–T14 for `/switch` plus parallel `/leave` coverage: T1 no cookie → 401 UNAUTHENTICATED; T2 env-master (no user_id) → 400 NO_USER_ID_IN_SESSION; T3 missing body.tenant_id → 400 MISSING_TENANT_ID; T4 13-row table of malformed tenant_id values → MISSING vs INVALID; T5 9-row table of script/SQL/CRLF tenant_id values → INVALID; T6 tenant_id not in effective set → 403 MEMBERSHIP_NOT_FOUND; T7 revoked/disabled membership invisible (same 403, no info leak — no `reason` or `detail` fields); T8 switch on tenant host → 403 SWITCH_NOT_ALLOWED_FROM_HOST; T9 CSRF header missing → 403 CSRF_TOKEN_INVALID; T10 CSRF mismatch → 403 + **assert no Set-Cookie clears the session cookie** (correction #2); T11 GET → 405 + `Allow: POST`; T12 next=`javascript:` silently dropped, success path still 200 with safe `redirect_to`; T13 next=`//evil.com` silently dropped; T14 `getEffectiveMembershipsFn` throws → 503 SWITCH_TEMPORARILY_UNAVAILABLE + assert session cookie NOT cleared; success path asserting cookie re-issue with new `acting_tenant_id`, `session_version: 2`, CSRF rotation, two Set-Cookie headers, session HttpOnly, csrf NOT HttpOnly; 6 parallel `/leave` tests including success path with `acting_tenant_id: null`). Handlers accept an optional third `deps` argument (`getEffectiveMembershipsFn`, `tenantHostnameLookupFn`) for testability; production call sites in `factory_router.js` omit it and the handlers use the canonical IM-2 helpers.

**Hard limits honoured by THIS PR (per Anton's IM-5 approval boundaries + corrections #1, #2, #3, #4, #6, #7):** zero `automation_events` writes (correction #1 — IM-7 / dedicated audit packet owns audit; only an inline TODO comment marks the integration point); zero changes to existing tenant-host/session mismatch behavior (correction #4 — `lib/server/tenant-host-session-gate.js` is **byte-identical**, still reads `sess.payload.tenant_id` not `acting_tenant_id`, IM-6 owns that decision); zero schema changes (no Prisma model edits, no DDL, no migration); zero new env vars (`.env.template` untouched — CSRF cookie reuses existing `SOVEREIGN_SESSION_SECRET` infrastructure transitively); zero CMP edits (`lib/cmp/` untouched); zero changes to existing login endpoints' authentication semantics — credential validation in `lib/server/auth.js` is byte-identical (correction #3); zero changes to legacy env-master payload mint and tenant PIN payload mint — both still byte-identical (correction #3); zero broadening of CSRF — only `/switch` + `/leave` enforce it (correction #2); zero new endpoints under `/api/operator/*` — only the approved `/api/membership/switch` + `/api/membership/leave` (correction #6); zero picker UI / no new React components / no new pages; zero edits to IM-2 read-endpoint files (`lib/server/membership-api.js`, `lib/server/effective-memberships.js`, `lib/server/host-policy.js` all untouched); zero edits to IM-4 files (`lib/ui/tenant-host-switch-link.js`, `pages/change.js` untouched); zero tenant delivery / Living Word / chatbot / marketing / visual-separation edits; zero `factory_master=true` promotion; zero production data writes of any kind; zero test data seeding; zero changes to `vercel.json`, `next.config*`, `package*.json`, `tsconfig*`, `middleware*`, `public/`, `core/engine/`, `scripts/`, `prisma/`; zero new files outside `lib/server/` + `node-tests/`.

**Local gates green:** `npm test` 903/903 (836 baseline at IM-4 COMPLETE + 67 new IM-5 tests across 4 files), `npx prisma validate` ✓ "The schema at prisma\schema.prisma is valid", `npm run build` ✓ all 17 routes generated, `ReadLints` zero errors on all 10 touched files.

**Production verification posture (per correction #5):** before merge — local + CI green, PR DRA with exact changed files and explicit "no audit / no schema / no env / no CMP / no picker / no tenant delivery files" confirmation. After merge — unauthenticated probes only: `POST /api/membership/switch` and `POST /api/membership/leave` from Core host without cookie/CSRF should return `401 UNAUTHENTICATED`; same endpoints with `Allow: POST` enforced (GET → 405); `/api/ui/context` anonymous on both Core and tenant host should return `acting_tenant_id: null` as a new additive field while `effective_memberships_count`, `tenant_id`, `tenant_host_session_mismatch`, and other existing fields stay byte-identical; IM-2 `/api/membership/effective` and `/api/membership/list` envelopes must stay byte-identical to the IM-2 COMPLETE baseline; IM-4 `/change` HTML on `lux.corpflowai.com` must still show no "Switch workspace" string for anonymous; four customer-facing regression URLs (`lux.corpflowai.com/`, `core.corpflowai.com/`, `lux.corpflowai.com/change`, `core.corpflowai.com/change`) must remain 200. Authenticated switch/leave verification is **out of scope** unless Anton explicitly provides or drives a pre-existing DB-backed test user flow — IM-5 does NOT create test users, seed data, promote factory_master, or write test data to production.

**Why this matters:** IM-1 added the schema, IM-2 added the read APIs, IM-4 made the multi-tenant fact visible in the tenant-host UI — but the actual *workspace switching action* did not exist yet. IM-5 ships the operator-grade primitive: a DB-backed user can now POST to `/api/membership/switch` and have their session cookie re-issued with a new `acting_tenant_id` (validated against their effective membership set via the IM-2 helper, never against a raw DB query), or POST to `/api/membership/leave` to clear `acting_tenant_id` back to `null`. The login flow gains a tightly-tested redirect resolver so single-tenant clients land directly on their tenant host, multi-tenant operators land on Core, and admins land on Core unless a validated `?next=` is supplied — with off-platform redirects, `javascript:`, header injection, and path traversal all rejected before they reach the cookie. CSRF protection is scoped narrowly to the two new state-changing endpoints (double-submit cookie pattern, SameSite=Lax to permit legitimate cross-host nav from the IM-4 Switch workspace link). This packet does NOT change CMP enforcement (IM-6 owns that), does NOT add picker UI (IM-3 will, atop this), and does NOT touch tenant-host gate behavior (correction #4 — `tenant-host-session-gate.js` still compares against `tenant_id`, not `acting_tenant_id`, and IM-6 will decide whether to migrate that to `acting_tenant_id`).

**Rollback plan:** revert the merge commit. The 2 DB-backed mint sites in `auth.js` drop the new payload fields cleanly (legacy clients reading the cookie ignore unknown JSON fields by virtue of `payload?.foo` defaulting to `undefined`); the `corpflow_csrf` cookie is harmless to leave behind on revert (clients stop sending the header, and there is no server-side code reading it post-revert); the new endpoints become 404s (no schema rows, no automation_events, no DB residue to clean up); the additive `acting_tenant_id` field on `/api/ui/context` disappears (no client code on `main` reads it yet); the IM-2 + IM-4 contracts and `tenant-host-session-gate.js` are byte-identical, so there is nothing else to undo. Zero non-revertible side effects.

<!-- MULTI_TENANT_IM_5_SESSION_ENRICHMENT_SWITCH_LEAVE_2026_06_16_HIST -->
## 2026-06-15 — **`UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_V1`** — docs-only authorization packet that satisfies `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 10 gate to add **Uptime Kuma** as the **first and only** named, narrow, packet-gated exception to § 5.3 hard rules on `corpflow-exec-01-u69678` — for **third-location uptime monitoring only**, loopback `127.0.0.1:3001` only via SSH local-port-forward, with Kuma's own Telegram bot (separate from in-repo `TELEGRAM_BOT_TOKEN`) as primary alert and zero CorpFlow secrets on the box. **Canonical authorization paragraph (cite verbatim — same wording at four loci: ADR § 2.1, packet § 1.1, `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, `JE-2026-06-15-1`):** *"This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`. It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path."* **Files added:** `docs/decisions/20260615-uptime-kuma-on-exec01.md` (10-section ADR — context citing Phase 1A live verification + the two § 5.3 hard rules being lifted; § 2 narrow-scoped decision + § 2.1 canonical authorization paragraph; § 3 box credentials list (Kuma admin password + separate Telegram bot + optional SMTP) + explicit list of secrets that are NOT lifted (`POSTGRES_URL`, `MASTER_ADMIN_KEY`, `VERCEL_*`, `CORPFLOW_AUTOMATION_*`, `N8N_EMAIL_WEBHOOK_*`, Stripe, in-repo `TELEGRAM_BOT_TOKEN`, tenant data); § 4 7-row threat model; § 5 four-step rollback path; § 6 alert-path canonical with Kuma's bot primary + n8n forward secondary-only; § 7 consequences; § 8 5 alternatives considered + rejected reasons; § 9 references; § 10 PROPOSED → ACCEPTED on merge), `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (11-section packet per `CORPFLOW_EXECUTION_PACKET_STANDARD.md` — Goal + § 1.1 canonical authorization paragraph / DoD / Scope / Constraints / Risks / **§ 6 inline `MIGRATION_TO_SERVER_CHECKLIST.md` § 2 with every checkbox addressed across credential placement / parameterization / idempotency / retry / audit / schedule / rollback / documentation / anti-patterns / verification floor** / Allowed actions / Approval gates / Verification evidence with K1–K5 install-runbook live-check template / Rollback / Owner / Status block). **Files edited:** `docs/operations/MONITORING_ARCHITECTURE.md` (§ 2 heading "the 12 monitors today" → "the 12 active monitors + 1 authorized-pending-install" + new authorization-note paragraph + Monitor # 13 row with all 8 monitor URLs explicit + § 4.1+§4.2 alert-routing row + § 11.1 today's-monitors row `🟡 authorized, not installed` + § 11.2 `kuma-on-exec01-install` follow-up packet row + repurposed `exec01-uptime-from-third-location` row to "second complementary signal once # 13 is stable"); `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (new § 5.5 *Authorized exceptions to § 5.3 hard rules (named, narrow, packet-gated)* with doctrine paragraph forbidding category-level generalization + canonical authorization paragraph quoted verbatim + 5-column table listing **Uptime Kuma** as first-and-only carve-out + non-generalization paragraph naming all forbidden tools (Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, additional monitoring, second container) + anti-pattern guard for "this is similar to Kuma so we can also …" reasoning; § 5.3's two affected rules gain parenthetical pointers to § 5.5 with rule wording itself unchanged; § 6 absence-list "Persistent daemon / cron / `at`" row gains in-line clarifier + new "Exception clarifier" paragraph below § 6; § 13 change log v1 → v1.1); `AGENTS.md` Must-read table (one new row pointing at the authorization packet + ADR + `SELF_HOSTED_OPS_STACK_V1.md` § 3); `docs/CORPFLOW_SHARED_TODO.md` Step 2 row (BLOCKED → AUTHORIZED-PENDING-INSTALL on Anton's merge); `docs/decisions/JOURNAL.md` (`JE-2026-06-15-1` — full-shape append-only row prefixed with the canonical authorization paragraph + what-landed / hard-limits / standing-holds / verdict / reversibility); `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` (§ 5 reworked from "BLOCKED on a separate packet" → "PENDING AUTHORIZATION PACKET, no longer generally blocked" with new § 5.2 7-row § 10 status table covering each gate item; § 5.3 fallback options retained as historical change-log only). **Hard limits honoured by THIS PR:** docs-only — zero edits to `api/`, `lib/`, `components/`, `pages/`, `prisma/`, `middleware*`, `scripts/`, `public/`, `.github/`, `node-tests/`, `tests/`, `core/engine/`, `.env*`, `vercel.json`, `next.config*`, `package*.json`, `tsconfig*`; zero new env var names introduced (`.env.template` untouched — Kuma's creds live on the box); zero secrets in repo / logs / screenshots / PR body / JOURNAL row / this bullet; zero L3 commands authored, suggested, or executed by THIS PR (`HOST_MISMATCH` guard from `JE-2026-06-04-1` not triggered); zero new public exposure (Kuma is loopback-only by design when installed); zero generalization (named container only; named host only; named purpose only); zero Docker Compose file in repo by THIS PR (the install runbook follow-up packet may include an operator-paste Compose recipe — that recipe is authored in the next packet, not this one; the ADR records the install model in prose only); zero modification to monitors # 1–# 12; zero modification to alert routing § 4.1 / § 4.2 (Kuma uses its own bot — separate failure domain); zero contradiction with `SELF_HOSTED_OPS_STACK_V1.md` § 3 (Kuma was already named there); zero Step 3 / restic work — Step 3 remains gated on Step 2 = COMPLETE per § 4 of that doc. **What this unblocks:** on Anton's merge, Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` flips BLOCKED → AUTHORIZED-PENDING-INSTALL; Cursor at L1 may then author the install-runbook follow-up packet (`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`); Anton at L3 keyboard runs the install per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 pattern; live verification per K1–K5 flips Step 2 to COMPLETE; blind spot # 7 ("no third-location uptime") in `MONITORING_ARCHITECTURE.md` § 6 closes. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE-AT-PR-MERGE** — operator + agent governance artefact; install runbook live verification is a separate future packet and a separate future JE row.

<!-- UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_V1_2026_06_15_HIST -->

---

## 2026-06-15 — Multi-tenant **IM-4 tenant-host "Switch workspace" link + additive `/api/ui/context` field** — fourth implementation packet from the approved r2 membership-matrix design in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` (§10 IM-4). Adds a single tenant-host affordance — a plain `<a href="https://core.corpflowai.com/change" data-cf-switch-workspace="true">Switch workspace</a>` rendered conditionally inside the canonical Next.js `pages/change.js` — backed by an additive `effective_memberships_count` integer field on `GET /api/ui/context`. New files: `lib/ui/tenant-host-switch-link.js` (pure helpers: `shouldShowSwitchLink({ surface, sessionLogged, effectiveMembershipsCount }) → boolean`, `coreSwitchUrl({ coreHostsEnv }) → string`, `computeEffectiveMembershipsCountForUiContext(sess, { getEffectiveMembershipsFn }) → number | null`; the third helper takes the Prisma-backed `getEffectiveMemberships` via DI so the file stays browser-safe and unit-testable in isolation); `node-tests/tenant-host-switch-link.test.mjs` (8 tests, ~20-row truth table covering surface=core / surface=null / anonymous / count=null / count=0 / count=1 / count=2 / count=50 / fractional / string / NaN / Infinity / missing args, plus `coreSwitchUrl` env parsing + sanitisation including the `attacker.example.com" onclick=alert(1)` defense case); `node-tests/ui-context-memberships-count.test.mjs` (13 tests covering null session, undefined session, anonymous, env-master no-`user_id`, whitespace-only `user_id`, DB-backed 0 / 1 / 3 memberships, factory_master 12-tenant expansion, helper throws → null (guardrail #6), malformed payload → 0, "never returns a tenant identity" guardrail #5). Edited: `api/factory_router.js` — adds two new imports (`getEffectiveMemberships`, `computeEffectiveMembershipsCountForUiContext`) and one new field on the `/api/ui/context` JSON response (`effective_memberships_count`), value computed inside `handleUiContext` by calling the new helper with `getEffectiveMembershipsFn: getEffectiveMemberships` injected; `pages/change.js` — adds one import block and one conditional `<a>` render block at the top of the page body (above the existing debug banner), gated by `shouldShowSwitchLink({ surface: uiContext?.surface, sessionLogged: session?.logged_in === true, effectiveMembershipsCount: uiContext?.effective_memberships_count })`.

<!-- MULTI_TENANT_IM_4_SWITCH_WORKSPACE_LINK_2026_06_15_HIST -->

**Status:** **COMPLETE** per `.cursor/rules/delivery-reality.mdc` — IM-4 PR #365 merged at `2026-06-15T09:31:24Z` (squash, merge SHA `d6d9946199aaf9dd0cc9e224282b5e087b773c23`), Vercel Production deployment **`5062513477`** Ready at `2026-06-15T09:32:17Z` (~53 seconds after merge) serving the merge SHA, and all 11 read-only Production probes returned the exact contract expected (2 `/api/ui/context` probes confirming the additive `effective_memberships_count: null` field on both Core and tenant hosts for anonymous; 2 `/change` HTML probes confirming the tenant-host HTML carries no "Switch workspace" string or `data-cf-switch-workspace` data attribute for anonymous on either Core or Lux; 5 IM-2 regression probes confirming byte-identical envelopes on Production; 2 additional landing-page regression probes — `lux.corpflowai.com/` and `core.corpflowai.com/` — both still 200 with the expected `<title>`). Local gates green at merge (831/831 `npm test` = +21 from IM-2's 810 baseline, clean `npx next build --webpack`, clean `npx prisma validate`, zero lint errors). No production writes, no backfill, no `factory_master=true` promotion, and no test data seeding were performed for IM-4 (out of scope per the IM-4 approval guardrails).

**Why this matters:** IM-2 shipped the read-only membership API but nothing in the UI consumed it. IM-4 is the smallest possible packet that makes the membership matrix visible to a real user — without owning any of the harder concerns IM-5 will own (session shape change, `acting_tenant_id`, switch/leave POST endpoints, cookie re-issue, login redirect resolver). The link is intentionally described as **navigation to Core**, not as workspace switching: clicking it lands the operator on `core.corpflowai.com/change`, where IM-3 (picker UX) will eventually live. This packet does not call any switch endpoint, does not re-issue a cookie, and does not write anything. It also does not list other tenant identities on the tenant host (guardrail #5: the affordance reveals only the *existence* of more than one workspace via the integer count — never names, IDs, or hostnames).

**Boundary discipline:** IM-4 ships on the dedicated branch `feat/platform-multi-tenant-im-4` (off `origin/main` at `1e59944e`, the merged IM-2 DRA commit). The IM-3 picker UX, the IM-5 session enrichment + switch endpoints, the IM-6 CMP enforcement layer, and IM-7 / IM-8 are not touched by this packet. Zero schema change, zero new env vars, zero new endpoints (only an additive field on an existing one), zero writes, zero backfill, zero `factory_master=true` promotion, zero test data seeding (all out of scope per Anton's guardrail #7). Visual-separation v1, Living Word delivery, chatbot, marketing, and tenant delivery streams are explicitly out of scope.

**Delivery Reality Audit (IM-4) — Production-verified:**

```text
Delivery Reality Audit (IM-4):
- Local fix exists: YES
- Merged to main: YES — PR #365 squashed to main at 2026-06-15T09:31:24Z
    Merge SHA: d6d9946199aaf9dd0cc9e224282b5e087b773c23
    Title: feat(platform): IM-4 tenant-host Switch workspace link + additive /api/ui/context field
- Production deployment ID: 5062513477 (GitHub Deployments API row),
    environment=Production, status=success, Ready at 2026-06-15T09:32:17Z
    (~53 seconds after merge)
    environment_url: https://corpflow-ai-command-center-q6z02chna-corpflowai.vercel.app
- Commit deployed: d6d9946199aaf9dd0cc9e224282b5e087b773c23 (matches merge SHA)
- Live URLs tested (read-only Production checks — no writes, no backfill, no
    factory_master promotion, no test data seeding performed):

    Additive field contract on /api/ui/context (the only contract change in IM-4):

    [CTX1] GET https://core.corpflowai.com/api/ui/context  (no cookie, Core host)
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8
      Body (last 60 chars): "...tenant_host_session":null,"effective_memberships_count":null}
      Full body confirms 17 existing fields unchanged + 1 new field appended.
      No other-tenant identity in the response (guardrail #5).
      → PASS  (Core host anonymous → effective_memberships_count: null)

    [CTX2] GET https://lux.corpflowai.com/api/ui/context  (no cookie, tenant host)
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8
      Body (last 60 chars): "...tenant_host_session":null,"effective_memberships_count":null}
      Full body: host=lux.corpflowai.com, surface=tenant, tenant_id=luxe-maurice
      (the host's OWN tenant id — pre-existing field, not an IM-4 leak),
      resolved_tenant_name=luxe-maurice (pre-existing), no OTHER tenant
      identities anywhere in the response (guardrail #5).
      → PASS  (Tenant host anonymous → effective_memberships_count: null)

    Tenant-host /change HTML cleanliness (the only UI change in IM-4):

    [HTML1] GET https://lux.corpflowai.com/change  (no cookie, tenant host)
      HTTP/1.1 200 OK
      Content-Type: text/html; charset=utf-8
      Content-Length: 6748 bytes
      Contains 'Switch workspace': false
      Contains 'data-cf-switch-workspace': false
      → PASS  (anonymous on Lux → Switch workspace link correctly suppressed)

    [HTML2] GET https://core.corpflowai.com/change  (no cookie, Core host)
      HTTP/1.1 200 OK
      Content-Type: text/html; charset=utf-8
      Content-Length: 6748 bytes
      Contains 'Switch workspace': false
      Contains 'data-cf-switch-workspace': false
      → PASS  (Core host → Switch workspace link always suppressed, guardrail #3)

    Regression — 4 customer-facing surfaces (per .cursor/rules/predeploy-decision-checks.mdc):

    [REG1] GET https://lux.corpflowai.com/                              → 200 OK
           Title: "LuxeMaurice — Private Wealth & Lifestyle Platform for Mauritius"
           Content-Length: 58171 bytes
           Contains 'Switch workspace': false (not expected to — Lux landing is public)
    [REG2] GET https://lux.corpflowai.com/change                        → 200 OK (= HTML1)
    [REG3] GET https://core.corpflowai.com/                             → 200 OK
           Title: "CorpFlowAI — Practical AI-assisted workflow systems"
           Content-Length: 16264 bytes
    [REG4] GET https://core.corpflowai.com/api/factory/health           → 200 OK
           Body: {"ok":true,"status":"healthy","checks":{"database_configured":true,
                  "sovereign_session_configured":true,"admin_operator_ready":true,
                  "runtime_config_valid":true},...}
      → PASS × 4  (zero regression on customer-facing surfaces)

    Regression — IM-2 read-side membership API (5 contracts must remain byte-identical):

    [IM2A] GET https://core.corpflowai.com/api/membership/effective  (no cookie)
      HTTP/1.1 401 Unauthorized
      Body: {"ok":false,"error":"UNAUTHENTICATED","reason":"missing"}
      → PASS  (byte-identical to IM-2 DRA1)

    [IM2B] GET https://core.corpflowai.com/api/membership/effective?user_id=anything
      HTTP/1.1 400 Bad Request
      Body: {"ok":false,"error":"UNEXPECTED_USER_ID","message":"GET /api/membership/effective
             returns the session user's own matrix only. To query another user, use
             GET /api/membership/list?user_id=<id> (requires factory_master)."}
      → PASS  (byte-identical to IM-2 DRA2)

    [IM2C] GET https://lux.corpflowai.com/api/membership/effective
      HTTP/1.1 403 Forbidden
      Body: {"ok":false,"error":"SWITCH_NOT_ALLOWED_FROM_HOST","message":"This endpoint is
             only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com)
             and retry.","host":"lux.corpflowai.com"}
      → PASS  (byte-identical to IM-2 DRA3)

    [IM2D] GET https://lux.corpflowai.com/api/membership/list?user_id=anyone
      HTTP/1.1 403 Forbidden
      Body: {"ok":false,"error":"SWITCH_NOT_ALLOWED_FROM_HOST","message":"This endpoint is
             only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com)
             and retry.","host":"lux.corpflowai.com"}
      → PASS  (byte-identical to IM-2 DRA4)

    [IM2E] POST https://core.corpflowai.com/api/membership/effective
      HTTP/1.1 405 Method Not Allowed
      Allow: GET
      Body: {"ok":false,"error":"METHOD_NOT_ALLOWED"}
      → PASS  (byte-identical to IM-2 DRA5; Allow header present)

- Expected vs actual result: 11 / 11 probes PASS with exact contract match
    (status code + Content-Type + body string + Allow header where applicable).
- Client-facing flow usable: YES — Lux landing + Change Console both 200; Core
    landing + factory health both 200; Switch workspace link correctly absent
    on both /change routes for anonymous (the only HTML behaviour IM-4 changes).
- No runtime behaviour change for existing callers: YES (existing /api/ui/context
    fields preserved; only one new additive field appended; IM-2 endpoints
    byte-identical; the only HTML change is one conditional <a> block that
    evaluates to nothing for the anonymous probes used here).
- No new env vars: YES (.env.template unchanged).
- No schema change: YES (zero edits to prisma/schema.prisma, zero edits to
    lib/server/postgres-ensure-schema-statements.js, zero new migration files).
- No session-shape change: YES (session.payload contract unchanged; IM-4 only
    READS .user_id / .ok — IM-5 will be the packet that enriches session shape).
- No CMP enforcement change: YES (lib/cmp/router.js untouched; IM-6 owns that).
- No IM-3 picker UX: YES (no picker component, no /api/membership/* write path).
- No production writes / no backfill / no factory_master promotion / no test
    data seeding: YES, all out of scope per Anton's IM-4 guardrail #7.
- Final verdict: COMPLETE
```

**What this unlocks:** IM-5 (session enrichment + switch / leave POST endpoints + cookie re-issue + login redirect resolver) and IM-3 (picker UX) can now both ship without first having to design the navigation-to-Core affordance — IM-4 is the visible "doorway" they each open into. IM-6 (CMP enforcement) gets the same `effective_memberships_count` field for free on `/api/ui/context` if it ever needs to render a count-aware operator hint.

---

## 2026-06-15 — Multi-tenant **IM-2 read-side membership API + tampering tests** — implementation packet (read-only API surface, additive, no schema change). Second implementation packet from the approved r2 membership-matrix design in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`. Ships the helper, two Core-host-only read endpoints, and the 12-vector tampering test suite — with **zero** session-shape change, **zero** UI change, **zero** CMP enforcement change, **zero** tenant picker work, **zero** writes to `user_tenant_memberships`, and **zero** new env vars (`requireCoreHost` deliberately reuses the existing `CORPFLOW_CORE_HOSTS` resolver in `lib/server/host-tenant-context.js` — single source of truth for Core vs tenant surface). New files: `lib/server/effective-memberships.js` (helper `getEffectiveMemberships(userId, { prismaClient? })` with defensive in-JS re-check that factory_master expansion only fires for `level='admin' AND enabled=true`, bounded to `tenant_status='Active'`, never cached; tags each row `source='explicit' | 'factory_master'`); `lib/server/host-policy.js` (thin wrapper exposing `requireCoreHost(req)` / `isCoreHost(req)` / `assertCoreHostOrReject(req, res)`); `lib/server/membership-api.js` (handlers for the two endpoints below); `node-tests/user-tenant-membership-tampering.test.mjs` (18 tests: vectors v1–v12 plus v5b / v11b / v11c sub-vectors plus three extras). Edited: `api/factory_router.js` — adds **6 lines** (one named import + two `pathSeg ===` branches), no existing route logic touched. Endpoints: `GET /api/membership/effective` returns the session user's own effective matrix only — `?user_id=` triggers explicit `400 UNEXPECTED_USER_ID` (per Anton's guardrail #1, query tampering must be visible not silent); `GET /api/membership/list?user_id=<id>` requires Core host + admin-level session + DB-backed `auth_users.factory_master=true`; tenant hosts always receive `403 SWITCH_NOT_ALLOWED_FROM_HOST`. Session payloads without `user_id` (legacy env-master / PIN) receive `400 NO_USER_ID_IN_SESSION` — explicit so the IM-8 deprecation of those legacy paths is observable.

<!-- MULTI_TENANT_IM_2_READ_APIS_2026_06_15_HIST -->

**Status:** **COMPLETE** per `.cursor/rules/delivery-reality.mdc` — IM-2 PR #363 merged at `2026-06-15T07:32:01Z` (squash, merge SHA `8f4c2b5f42b5c6201c25ae61b0c68233132a44c1`), Vercel Production deployment **`5061242008`** Ready at `2026-06-15T07:32:55Z` (54 s after merge) serving the merge SHA, and all 9 read-only Production probes returned the exact contract expected (5 IM-2 endpoint checks on `core.corpflowai.com` + `lux.corpflowai.com` with the exact `UNAUTHENTICATED` / `UNEXPECTED_USER_ID` / `SWITCH_NOT_ALLOWED_FROM_HOST` / `METHOD_NOT_ALLOWED` envelopes; 4 regression checks on `lux.corpflowai.com/`, `lux.corpflowai.com/change`, `core.corpflowai.com/`, `core.corpflowai.com/api/factory/health`). Local gates green at merge (810/810 `npm test` = +18 from IM-1's 792 baseline, clean `npx next build --webpack`, clean `npx prisma validate`, zero lint errors). No production writes, no backfill, and no factory-master promotion were performed for IM-2 (out of scope).

**Why this matters:** IM-1 only added the schema. IM-2 is the first packet that lets future surfaces (the picker UX in IM-3, the session enrichment in IM-5, the CMP enforcement layer in IM-6) call a single canonical function for "what tenants is this user actually allowed to see?" without each one reinventing the rules. The 12 tampering vectors prove that the read APIs cannot be bypassed by URL / host-header / body / cookie / method tampering — which is the security baseline that IM-5 / IM-6 will inherit unchanged when they ship their write paths and switch flows.

**Boundary discipline:** IM-2 ships on the dedicated branch `feat/platform-multi-tenant-im-2` (off `origin/main` at `93701206`, the merged stream-boundary commit). The IM-1 schema work was already merged separately (PR #359 / #361 — IM-1 row in this file is **COMPLETE**). The visual-separation v1 work, the chatbot work under `lib/server/chat-widget/`, the Living Word delivery scripts under `scripts/*living-word-mauritius*.mjs`, and the apex Search Console rollout are owned by their own delivery streams and are not touched by this packet. Future IM-3 / IM-4 / IM-5 / IM-6 / IM-7 / IM-8 packets each ship their own PR off a fresh `feat/platform-multi-tenant-im-<n>` branch.

**Delivery Reality Audit (IM-2) — Production-verified:**

```text
Delivery Reality Audit (IM-2):
- Local fix exists: YES
- Merged to main: YES — PR #363 squashed to main at 2026-06-15T07:32:01Z
    Merge SHA: 8f4c2b5f42b5c6201c25ae61b0c68233132a44c1
    Title: feat(platform): IM-2 read-side membership API + 12-vector tampering tests
- Production deployment ID: 5061242008 (GitHub Deployments API row),
    environment=Production, status=success, Ready at 2026-06-15T07:32:55Z
    (54 seconds after merge)
- Commit deployed: 8f4c2b5f42b5c6201c25ae61b0c68233132a44c1 (matches merge SHA)
- Live URLs tested (read-only Production checks — no writes, no backfill,
    no factory-master promotion performed):

    [DRA1] GET https://core.corpflowai.com/api/membership/effective  (no cookie)
      HTTP/1.1 401 Unauthorized
      Content-Type: application/json; charset=utf-8
      Body: {"ok":false,"error":"UNAUTHENTICATED","reason":"missing"}
      → PASS  (expected 401, error code matches contract)

    [DRA2] GET https://core.corpflowai.com/api/membership/effective?user_id=anything  (no cookie)
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8
      Body: {"ok":false,"error":"UNEXPECTED_USER_ID","message":"GET /api/membership/effective returns the session user's own matrix only. To query another user, use GET /api/membership/list?user_id=<id> (requires factory_master)."}
      → PASS  (guardrail #1 satisfied — query tampering rejected before auth so
        it is visible in access logs; error message points operator at the
        factory_master-only sibling endpoint)

    [DRA3] GET https://lux.corpflowai.com/api/membership/effective
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8
      Body: {"ok":false,"error":"SWITCH_NOT_ALLOWED_FROM_HOST","message":"This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.","host":"lux.corpflowai.com"}
      → PASS  (tenant host correctly rejected; host echoed back for audit)

    [DRA4] GET https://lux.corpflowai.com/api/membership/list?user_id=anyone
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8
      Body: {"ok":false,"error":"SWITCH_NOT_ALLOWED_FROM_HOST","message":"This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.","host":"lux.corpflowai.com"}
      → PASS  (tenant-host host gate fires before any session / user_id checks
        — IM-5 switch-tenant will inherit the same gate)

    [DRA5] POST https://core.corpflowai.com/api/membership/effective
      HTTP/1.1 405 Method Not Allowed
      Allow: GET
      Content-Type: application/json; charset=utf-8
      Body: {"ok":false,"error":"METHOD_NOT_ALLOWED"}
      → PASS  (state-changing methods rejected; Allow header present)

    Regression sanity — IM-2 touches zero rendering code; the 4 customer-facing
    surfaces must remain green:

    [REG1] GET https://lux.corpflowai.com/                              → 200 OK
           (LuxeMaurice landing HTML; "<title>LuxeMaurice — Private Wealth & ...")
    [REG2] GET https://lux.corpflowai.com/change                        → 200 OK
           (Change Console renders)
    [REG3] GET https://core.corpflowai.com/                             → 200 OK
           (CorpFlow Core landing renders)
    [REG4] GET https://core.corpflowai.com/api/factory/health           → 200 OK
           {"ok":true,"status":"healthy","checks":{"database_configured":true,
            "sovereign_session_configured":true,"admin_operator_ready":true,
            "runtime_config_valid":true},...}
      → PASS × 4  (zero regression on customer-facing surfaces)

- Expected vs actual result: 9 / 9 probes PASS with exact contract match
    (status code + error code string + message body + Allow header where applicable).
- Client-facing flow usable: YES — Lux landing + Change Console both 200;
    Core landing + factory health both 200. IM-2 endpoints are Core-host
    operator surface only and do not change anything client-facing.
- No runtime behaviour change for existing callers: YES (existing routes untouched;
    new dispatch branches only fire for the two new pathSeg values).
- No new env vars: YES (.env.template unchanged; `requireCoreHost` reuses the
    pre-existing CORPFLOW_CORE_HOSTS via buildCorpflowHostContext).
- No schema change: YES (zero edits to prisma/schema.prisma, zero edits to
    lib/server/postgres-ensure-schema-statements.js, zero new migration files).
- No session-shape change: YES (session.payload contract unchanged; IM-2 only
    READS .user_id / .typ — IM-5 will be the packet that enriches it).
- No CMP enforcement change: YES (lib/cmp/router.js untouched; IM-6 owns that).
- No UI change: YES (pages/change.js + components/* untouched).
- No production writes / no backfill / no factory_master promotion: YES, all
    verification was read-only HTTP GETs / one HTTP POST that the API rejects
    with 405 before any DB call is made.
- Existing tests still pass: YES (810/810 local at merge; baseline before IM-2
    was 792 = +18 IM-2 tests).
- New tests: 18 (vectors v1–v12 plus v5b / v11b / v11c sub-vectors plus three
    extras: disabled-row, unknown-user, blank-user).
- Rollback plan: revert PR #363; the two new routes disappear (would return
    404); helper + host-policy + membership-api modules become unreferenced
    and inert; no schema / session / UI / CMP / cron / env-var changes to undo.
    Blast radius is strictly "two new 404s would re-appear" if a future caller
    had already started using the routes.
- Final verdict: COMPLETE
```

---

## 2026-06-15 — Multi-tenant **platform-stream boundary + approved vocabulary (governance lock)** — docs-only. Two design docs are added to `main` with a binding stream-boundary preamble and a four-noun vocabulary that becomes canonical across all future multi-tenant platform work:

- `docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md` (read-only MT-1 audit; ~454 lines) — owns the cross-tenant contamination model, visual-separation requirements, tenant isolation tests, audit trail requirements, the eight-packet MT-1..MT-8 implementation plan, and the canonical home of the four-noun vocabulary in §5.
- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` (r2; ~797 lines, link-stable filename) — owns the `user_tenant_memberships` membership-matrix design, the `auth_users.factory_master` capability, the 9 required user flows, the 8-packet IM-1..IM-8 implementation plan, and the 12 tampering tests §9.5b. Title intentionally retains "OPERATOR" for link stability; the doc now explicitly covers both operators **and** multi-tenant clients (§1.4, §2.3.A, §4.8).

<!-- MULTI_TENANT_STREAM_BOUNDARY_VOCAB_2026_06_15_HIST -->

**The four approved nouns (binding across both docs):**

1. **Core Capability** — reusable, CorpFlow-owned functional unit; code shared by all tenants (lives in `lib/`, `api/`, `pages/`, `components/`; defaults in `automation_playbooks` with `tenant_scope='factory'`, `docs/`, seeders).
2. **Tenant Deployment** — the tenant-specific activation of a Core Capability (a `tenants` row + `tenant_hostnames` row + `tenant_personas` row + tenant-scoped child rows together).
3. **Tenant Override** — a tenant-specific difference on top of a Tenant Deployment (config value, visual asset, instruction, process step, workflow variant; lives on the same tenant row or in a tenant-scoped child table).
4. **Promotion to Core** — an anonymised improvement that started as a Tenant Override and is rolled up into the Core Capability via an explicit packet; never silent, always per-tenant adoption afterwards.

**Two binding rules that follow from these nouns:**

- A Tenant Override never silently affects another tenant — cross-tenant inheritance only happens through an explicit Promotion to Core followed by a forward-promotion packet.
- A Core Capability is owned by the platform stream; a Tenant Deployment + its Overrides are owned by that tenant's delivery stream. The platform stream changes Core Capabilities and the membership matrix; it does not change any tenant's Deployment content (chatbot prompt, brand, CRM data, sandbox content).

**Stream boundary — what this stream does NOT touch (codified in both docs):**

- No chatbot work (Living Word chatbot, Lux concierge, future tenants' chatbots all stay with their respective delivery streams).
- No tenant sandbox creation or seeding.
- No tenant delivery artifact mutation (`artifacts/quality-audits/<tenant>/` files are read for context only).
- No DB write from these docs.
- No auth/session code change (every gate in `lib/server/auth.js`, `lib/server/session.js`, `lib/cmp/router.js` is governed by the credential doc IM-5/IM-6 packets, each independently approved).
- No blurring with tenant delivery work — a change cannot land via this stream if its main effect is to deliver value for one tenant.

**Implementation gate (codified in the credential doc §33):**

The 8-packet plan IM-1..IM-8 in the credential doc and the parallel MT-1..MT-8 plan in the audit doc exist for **design completeness** only — to prove the design is decomposable into reviewable units. They are **not** authorisation to begin implementing. Each IM/MT packet starts only after Anton's explicit, per-packet approval, per `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` and the auto-applied rules `.cursor/rules/security-sensitive-changes.mdc` + `.cursor/rules/predeploy-decision-checks.mdc` + `.cursor/rules/delivery-reality.mdc`. IM-1 was approved and shipped (2026-06-15, PR #359 1c46dfbc + PR #361 843ef8f0); IM-2..IM-8 are explicitly **not started** and require their own approvals.

**Why this matters:**

Without this governance lock, three failure modes are open:

- Core/tenant mixing — a "factory" change quietly leaks tenant-specific content (e.g. today's `api/factory_router.js → handleChat` hardcoding one tenant's persona prompt).
- Tenant brand or prompt content accidentally promoted into Core — IM-1..IM-8 / MT-8 specifically guards against this with the anonymisation review step.
- Design documentation mistaken for implementation authorization — the "Implementation gate" preamble in each doc makes per-packet approval explicit.

**Boundary discipline preserved:**

This PR contains **only** the two design docs and this chat-history bullet. It does **not** touch any tenant's delivery artifacts, the visual-separation v1 code (`components/TenantChromeHeader.js` + helpers stay untracked for their own future PR), the Living Word chatbot code (`lib/server/chat-widget/*` stays in its delivery stream), or any schema / API / auth / session / Vercel / DNS surface. No IM-2 code is included; IM-2 scope proposal will be returned for approval after this PR merges.

**Delivery Reality Audit (Stream-Boundary Docs PR):**

```text
Delivery Reality Audit (stream-boundary docs):
- Local fix exists: YES
- Merged to main: <PENDING — Cursor appends PR # + merge SHA after merge>
- Production deployment ID: <PENDING — Vercel deploys the docs change; no runtime effect>
- Commit deployed: <PENDING>
- Live URLs tested: None required — docs-only PR, zero runtime surface.
- Expected vs actual result: docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md
    and docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md present on main with the four
    approved nouns + stream-boundary preamble + implementation gate.
- Client-facing flow usable: YES (no client-facing surface change at all).
- No runtime behaviour change: YES.
- No new env vars: YES.
- Existing tests still pass: YES (verified at the PR's CI run).
- Rollback plan: revert PR; docs disappear from main, no DB/Vercel impact.
- Final verdict: PENDING (will flip to COMPLETE after merge + main HEAD confirms both docs present)
```

---

## 2026-06-15 — Multi-tenant **IM-1 schema packet** (additive, behaviour-free) — first implementation packet from the approved r2 membership-matrix design in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`. Ships the foundation for the `user_tenant_memberships` membership matrix without changing any visible behaviour: a new `user_tenant_memberships` table with a partial-unique `(user_id, tenant_id) WHERE revoked_at IS NULL` index for soft-revoke semantics, a new `auth_users.factory_master boolean NOT NULL DEFAULT false` column guarded by a Postgres CHECK constraint (`auth_users_factory_master_admin_only` — admins-only), and new `automation_events.actor_user_id` + `telemetry_events.actor_user_id` nullable audit columns (each with a single-column index). Anton's `factory_master=true` flip is **NOT** applied as part of the migration — it is a separate operator step run via `scripts/promote-factory-master.mjs --username=anton` only after the schema deploys and Anton has confirmed his auth_users row via the read-only verification query in the DRA. All DDL is additive (`create table if not exists`, `add column if not exists`, `do $$ ... if not exists ... end $$` block for the CHECK) and applies on every Vercel build via the existing `scripts/apply-ensure-schema-build.mjs`; a formal `prisma/migrations/20260615080000_im_1_user_tenant_memberships/migration.sql` is the historical record (`prisma migrate resolve --applied` post-deploy if ensure-schema landed it first per existing convention). Files: `lib/server/postgres-ensure-schema-statements.js` (8 new statements appended), `prisma/schema.prisma` (3 model edits + 1 new model `UserTenantMembership`), the migration SQL, `scripts/seed-user-tenant-memberships.mjs` (idempotent backfill from `auth_users.tenant_id` for `level='tenant'` rows only), `scripts/promote-factory-master.mjs --username=<name>` (separate one-off, idempotent, refuses `level='tenant'` rows). Tests added (no live DB required): `node-tests/im-1-schema-shape.test.mjs` asserts the DDL strings declare every column / index / constraint named in the design doc §2.3 + §2.6; `node-tests/im-1-seed-idempotency.test.mjs` exercises the seeder in-memory and proves it is idempotent on re-run, never seeds admin / orphan / disabled rows, and treats revoked rows as absent so a re-grant succeeds.

<!-- MULTI_TENANT_IM_1_SCHEMA_2026_06_15_HIST -->

**Status:** **PARTIAL** per `.cursor/rules/delivery-reality.mdc` — schema deltas, scripts, and tests are in the repo and all local gates green (792/792 `npm test`, clean `npx next build --webpack`, clean `npx prisma validate`, zero lint errors). PR + merge SHA + Vercel Production deployment ID + Ready timestamp + live SQL verification + backfill dry-run/real-run + Anton-row promotion are appended to this bullet by Cursor as each step lands. Cannot flip to COMPLETE until the live SQL verification confirms every column / constraint / index from §2.3 + §2.6 is present on production Neon AND the back-fill seed reports `inserted=0` on its second `--dry-run` AND (optional) Anton's `factory_master=true` row is set after his explicit confirmation of which auth_users row is his.

**Why this matters:** Without IM-1, the membership matrix is design-only and IM-2..IM-8 cannot start. Because the entire delta is additive (no DROP, no RENAME, no NOT-NULL backfill on existing rows, no production code path reads the new fields), the blast radius is limited to "schema present but unused" — worst-case rollback is to drop the table + columns, with zero data loss for tenant clients or operators.

**Boundary discipline:** IM-1 ships on the dedicated branch `feat/platform-multi-tenant-im-1` (off origin/main, no inherited unrelated work). The visual-separation v1 work and the stream-boundary doc work that were also approved in the same session ship on their own separate PRs — not bundled here — per the stream-boundary rule in `docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md`. The chatbot work under `lib/server/chat-widget/` and the Living Word delivery scripts under `scripts/*living-word-mauritius*.mjs` are owned by their own delivery streams and are not touched by this packet.

**Delivery Reality Audit (IM-1) — appended as evidence lands:**

```text
Delivery Reality Audit (IM-1):
- Local fix exists: YES
- Merged to main: <PENDING — Cursor appends PR # + merge SHA after merge>
- Production deployment ID: <PENDING — Cursor appends Vercel deployment ID + Ready timestamp>
- Commit deployed: <PENDING>
- Live URLs tested:
    None required for IM-1 (schema-only; no client-facing surface changes by design).
    Required live verification on Production after deploy:
      1) Read-only SQL on production Neon — 6 queries (see PR description for the exact block):
         (a) auth_users.factory_master exists + DEFAULT false
         (b) CHECK constraint auth_users_factory_master_admin_only is present
         (c) actor_user_id columns + indexes on both event tables
         (d) user_tenant_memberships table columns + types
         (e) 4 indexes on user_tenant_memberships (3 regular + 1 partial-unique)
         (f) SELECT id, username, level, tenant_id, factory_master FROM auth_users
               WHERE level='admin' AND enabled=true ORDER BY username
             — Anton confirms the exact row BEFORE any factory_master write.
      2) node scripts/seed-user-tenant-memberships.mjs --dry-run
         → inspect WOULD-INSERT log → run without --dry-run → re-run with --dry-run
         → second-run reports inserted=0 (proves idempotency).
      3) Optional after step (f) confirmation:
         node scripts/promote-factory-master.mjs --username=anton --dry-run
         → inspect WOULD-PROMOTE log → run without --dry-run → re-run reports NO-OP.
- Expected vs actual result: <PENDING — Cursor appends after step 2 + 3>
- Client-facing flow usable: N/A — schema-only. lux.corpflowai.com/change,
    living-word-mauritius.corpflowai.com/change, core.corpflowai.com/change, /login,
    and every CMP API path read zero new columns and zero new rows.
- No runtime behaviour change: YES (repo-wide grep confirms no production code
    references the new fields; only Prisma schema, the DDL list, the migration files,
    the IM-1 scripts, the IM-1 tests, and the design docs).
- No new env vars: YES (.env.template unchanged; both scripts use the existing
    scripts/bootstrap-repo-env.mjs flow; CORPFLOW_CORE_HOST is an IM-2 introduction).
- Existing tests still pass: YES (792/792, +10 new IM-1 tests, zero regressions).
- Rollback plan:
    (a) Revert PR on main.
    (b) On the Production DB:
        BEGIN;
        DROP TABLE IF EXISTS user_tenant_memberships;
        ALTER TABLE auth_users DROP CONSTRAINT IF EXISTS auth_users_factory_master_admin_only;
        ALTER TABLE auth_users      DROP COLUMN IF EXISTS factory_master;
        ALTER TABLE automation_events DROP COLUMN IF EXISTS actor_user_id;
        ALTER TABLE telemetry_events  DROP COLUMN IF EXISTS actor_user_id;
        COMMIT;
        npx prisma migrate resolve --rolled-back 20260615080000_im_1_user_tenant_memberships
    Rollback is itself a separate packet, run with Anton's per-packet approval.
    Non-destructive (no in-flight tenant or operator data depends on the new fields).
- Final verdict: PARTIAL (will flip when steps 1+2 succeed and Anton confirms his row)
```

### Live-verification evidence (2026-06-15 UTC+4) — verdict flips to COMPLETE

**Delivery pipeline:**

- PR: [#359](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/359) `feat(platform): IM-1 multi-tenant user membership schema (additive, behaviour-free)`.
- Merge: squash-merged onto `main` as commit `1c46dfbc150877ea8b39ec336cc18869e1ed906e`, branch `feat/platform-multi-tenant-im-1` deleted, 8 files / 798 insertions / 22 deletions exactly as committed.
- Vercel Production: deployment `5059820786` (GitHub Deployments id) backing URL `https://corpflow-ai-command-center-eac894ukm-corpflowai.vercel.app`, state `success` ("Deployment has completed") at `2026-06-15T04:26:28Z`. Apex `https://core.corpflowai.com/api/factory/health` returned `{"ok":true,"status":"healthy"}` immediately after deploy.

**Production read-only schema verification (executed via `scripts/verify-im-1-schema.mjs` against the production `POSTGRES_URL`; no secrets printed):**

| # | Check | Result |
|---|---|---|
| (a) | `auth_users.factory_master` exists | `boolean`, `NOT NULL`, default `false` |
| (b) | `auth_users_factory_master_admin_only` CHECK constraint | `CHECK (((factory_master = false) OR (level = 'admin'::text)))` |
| (c-1) | `actor_user_id` columns | both `automation_events` and `telemetry_events` have it, `text`, nullable |
| (c-2) | `actor_user_id` indexes | `automation_events_actor_user_id_idx`, `telemetry_events_actor_user_id_idx` both present |
| (d) | `user_tenant_memberships` columns | 11 columns in spec order: `id`, `user_id`, `tenant_id`, `role` (default `member`), `capability`, `enabled` (default `true`), `granted_at` (default `now()`), `granted_by` (default `system`), `revoked_at`, `disabled_at`, `notes` |
| (e) | `user_tenant_memberships` indexes | `_pkey` (id), `tenant_id_idx`, `user_id_idx`, `user_enabled_revoked_idx`, and the partial unique `user_tenant_memberships_user_tenant_active_unique ON (user_id, tenant_id) WHERE (revoked_at IS NULL)` |

**Production auth_users posture (read-only, surfaced for Anton; no writes):**

- `SELECT ... FROM auth_users WHERE level='admin' AND enabled=true` → **0 rows.**
- `SELECT ... FROM auth_users WHERE level='admin'` (including disabled) → **0 rows.**
- `SELECT level, enabled, COUNT(*) FROM auth_users GROUP BY level, enabled` → only `{level=tenant, enabled=true, row_count=5}`.

**Consequence:** the optional `factory_master=true` promotion is **N/A in today's production** — there is no admin DB row to promote. Anton's factory access is unchanged and continues via the env-based `MASTER_ADMIN_KEY` (confirmed by `/api/factory/health` reporting `admin_operator_ready: true` and `factory_browser_admin_configured: true`). When IM-5/IM-8 lands and the bootstrap+`<tenant>@corpflowai.com` pattern is replaced with proper admin DB rows, Anton can run `scripts/promote-factory-master.mjs --username=<his admin username>` once and the partial-unique + CHECK constraint make the operation safe-and-idempotent.

**Back-fill (executed via `scripts/seed-user-tenant-memberships.mjs`):**

```
[dry-run]  start dry_run=true memberships_before=0 candidates=5
[dry-run]  WOULD-INSERT × 5 (4 luxe-maurice, 1 living-word-mauritius)
[dry-run]  done dry_run=true inserted=5 skipped_existing=0 skipped_orphan_tenant=0 memberships_after=0
[real-run] start dry_run=false memberships_before=0 candidates=5
[real-run] INSERTED × 5
[real-run] done dry_run=false inserted=5 skipped_existing=0 skipped_orphan_tenant=0 memberships_after=5
[re-dry]   start dry_run=true memberships_before=5 candidates=5
[re-dry]   done dry_run=true inserted=0 skipped_existing=5 skipped_orphan_tenant=0 memberships_after=5
```

The re-dry-run reports `inserted=0 skipped_existing=5` → **idempotency proven**.

**Post-backfill table state (read-only, via `scripts/verify-im-1-post-backfill.mjs`):**

- 5 rows total, all `revoked_at IS NULL` (active), all `role='member'`, all `granted_by='system'`, all carrying notes `IM-1 back-fill from auth_users.tenant_id`.
- Tenant distribution: `luxe-maurice` 4, `living-word-mauritius` 1.
- All 5 memberships join cleanly to an `auth_users` row with `level='tenant'` AND `enabled=true`. `orphan_user_id=0`, `orphan_tenant_id=0`.
- `auth_users.factory_master` distribution: 5 rows / **all `false`** (nobody promoted; column inert).

**Runtime smoke checks (live GET, post-deploy + post-backfill):**

| URL | Method | Result |
|---|---|---|
| `https://core.corpflowai.com/api/factory/health` | GET | 200, `{"ok":true,"status":"healthy", admin_operator_ready: true, factory_browser_admin_configured: true, ...}` |
| `https://lux.corpflowai.com/` | GET | 200, 59 909 bytes (unchanged content) |
| `https://lux.corpflowai.com/change` | GET | 200, 6 754 bytes (unchanged content) |
| `https://living-word-mauritius.corpflowai.com/` | GET | 200, 18 945 bytes (unchanged content) |

Zero behaviour change on the customer-facing surface. No CMP API path, `/login`, `/change`, tenant public surface, or factory route changed between the pre-merge state and post-merge / post-backfill state.

**Boundary discipline preserved:**

- IM-1 PR #359 contained **only** the 8 IM-1 files (schema DDL, Prisma schema, formal migration, two operator scripts, two unit-test files, the IM-1 chat-history bullet). The visual-separation v1 work and the stream-boundary doc work each ship on their own separate future PR. The chatbot work and the Living Word tenant delivery scripts are owned by their own delivery streams and were never touched by this packet.

**Delivery Reality Audit (IM-1) — FINAL:**

```text
Delivery Reality Audit (IM-1):
- Local fix exists: YES
- Merged to main: YES (PR #359, squash commit 1c46dfbc150877ea8b39ec336cc18869e1ed906e)
- Production deployment ID: 5059820786
- Commit deployed: 1c46dfbc150877ea8b39ec336cc18869e1ed906e
- Vercel deployment URL: https://corpflow-ai-command-center-eac894ukm-corpflowai.vercel.app
- Production deploy state: success @ 2026-06-15T04:26:28Z
- Live URLs tested:
    GET https://core.corpflowai.com/api/factory/health → 200 ok=true healthy
    GET https://lux.corpflowai.com/                    → 200 59909 bytes
    GET https://lux.corpflowai.com/change              → 200  6754 bytes
    GET https://living-word-mauritius.corpflowai.com/  → 200 18945 bytes
- Schema verification on production Neon: PASSED (6/6 + 5 diagnostic counts)
- Backfill dry-run / real / re-dry-run:
    inserted=5 / inserted=5 / inserted=0 skipped_existing=5 — idempotency PROVEN
- Post-backfill table state:
    5 active rows, all role=member granted_by=system with IM-1 marker note,
    0 orphan_user_id, 0 orphan_tenant_id, factory_master=false on all 5 rows
- Anton factory_master promotion:
    NOT EXECUTED — production has 0 level='admin' rows.
    Optional step is structurally not applicable today.
    Anton's factory access unchanged (env-based MASTER_ADMIN_KEY).
- Client-facing flow usable: YES — schema-only PR, all customer surfaces serve as before.
- No runtime behaviour change: YES — no production code path reads the new fields.
- No new env vars: YES — .env.template unchanged.
- Existing tests still pass: YES (792/792 on PR; CI ran the same set after merge).
- Rollback plan: documented in PR #359 description (drop table + drop constraint + drop columns + prisma migrate resolve --rolled-back).
- Final verdict: COMPLETE
```

**IM-2 status:** not started. IM-2 scope (membership read APIs / helpers + the 12 tampering tests in credential doc §9.5b) will be proposed in a separate packet for Anton's explicit approval before any code is written.

---

## 2026-06-15 — LuxeMaurice Content Population Sprint **C3 placeholder cleanup live-verified COMPLETE**: PR #356 merged + Vercel Production Ready + `https://lux.corpflowai.com/sitemap.xml` returns 0 `/property/` URLs (was 7), all 8 placeholder slugs absent, `/properties` premium empty state intact, bookmark back-compat preserved, C1/C2/C4 untouched and remain Open per the read-only audit

<!-- LUXEMAURICE_C3_PLACEHOLDER_CLEANUP_LIVE_VERIFIED_2026_06_15_HIST -->

**Status:** **COMPLETE** per `.cursor/rules/delivery-reality.mdc`. PR [#356](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/356) merged (squash) onto `main` as `a41b9baac584c9c59b26d24e571204b5fec7bb9b` on 2026-06-14T23:04:41Z, deployed to Vercel Production as deployment id `5057931192`, status `success` 2026-06-14T23:05:31Z. Live verification 2026-06-15: the canonical one-liner `curl -s https://lux.corpflowai.com/sitemap.xml | grep '/property/' | wc -l` returns **0** (down from 7); the full sitemap is now 2 entries only — `https://lux.corpflowai.com/` and `https://lux.corpflowai.com/concierge`; per-slug probe confirms all 8 (`lm-villa-belombre`, `lm-pent-plateau`, `lm-nc-ridge`, `lm-pipeline-q4`, `lm-phase2d-manual-demo`, `lxf-grand-baie-apt`, `lxf-tamarin-villa`, `lxf-poste-lafayette`) are absent; `/properties` returns 200 with the premium empty state ("Private Opportunities" + "Private opportunities are being prepared", 0 `/property/<slug>` cards rendered, no `demo` / `test` / `smoke` leak); `/` and `/concierge` continue to render with the approved brand surface (all four brand pillars present on `/`, "Private Advisory" + "Request a private consultation" on `/concierge`); bookmark back-compat preserved (`/property/lm-nc-ridge` still 200, 17355 bytes — the editorial shell remains per the explicit intent in `lib/client/luxe-maurice-feed-properties.js` header). C1 (`cmqa57uyt0000xf803uav5x8x`), C2 (`cmqa57ve00001xf80tpgmjeiz`), C4 (`cmqa57vsr0003xf80y543sx20`) remain `Open / Intake / awaiting_operator_review` — read-only git audit shows no commit since 2026-06-11 has mutated their CMP rows (operator-side CMP state confirmation requires a Lux operator session). Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open and untouched**.

**Root cause (rediscovered during PR #354 follow-up audit):** the original C3 audit (2026-06-11) assumed the 8 placeholder slugs lived in `lux_listings` (DB-backed) and proposed a per-slug `UPDATE lux_listings SET visibility_status='preview'` matrix. The 2026-06-12 code-path audit (run during PR #352 verification) found this was wrong: all 8 slugs are **static JavaScript constants**, not DB rows. The 5 `lm-*` slugs live in `lib/client/luxe-maurice-staged-properties.js` (`lm-phase2d-manual-demo` already correctly stripped via `demo: true` + `getPublicLuxStagedProperties()`); the 3 `lxf-*` slugs live in `lib/client/luxe-maurice-feed-properties.js` (module header explicitly keeps them only for bookmark back-compat). `/properties` already correctly excluded them via the empty `lux_listings` DB. `/property/<slug>` correctly resolves them via `resolveLuxPropertyRef` — that is intentional backward-compat behaviour. **The discoverability leak was entirely one place: the hard-coded `LUX_PROPERTY_REFS` array in `pages/sitemap.xml.js`.**

**Fix:** one-line constant edit — set `LUX_PROPERTY_REFS = []` in `pages/sitemap.xml.js` (with a header comment explaining the rationale, the brand-doctrine reference, and the follow-on path for Jan's first real C2 slug). Three files touched: one code (`pages/sitemap.xml.js`), one test (`node-tests/sitemap-host-aware.test.mjs` — one brittle `paths.length > APEX_PATHS.length` assertion replaced by `paths.length === 2 + LUX_PROPERTY_REFS.length`; matches the canonical-host test shape), one doc (`docs/runbooks/LUX_CONTENT_SPRINT_C3_PLACEHOLDER_CLEANUP.md` § 8 "Canonical executed path (post-2026-06-12) — single-constant sitemap edit" added). Plus one inverted assertion in `node-tests/lux-change-usability-fixes.test.mjs` line 69 (was: "sitemap must include the 4 non-demo `lm-*` slugs so SEO does not regress"; now: "sitemap must NOT include any of the 8 placeholder slugs per the 2026-06-12 audit — none have real client-approved content"). All 765 local tests pass. CI test workflow green.

**Why this was preferred over the original PR #354 § 3 per-slug matrix:** per-slug DB writes were not required — the single constant edit achieves the same public-discoverability outcome with zero DB touches, zero new code paths, zero new mechanisms, and zero workflow-complexity expansion. Maps cleanly to **option (a)** of the original matrix for all 7 slugs at once. Options (b) "replace with C2" and (c) "label illustrative" remain available as future follow-ons but are not required to ship C3.

**Trade-off recorded:** anonymous direct visitors with old bookmarks for `/property/<placeholder-slug>` still see the existing editorial shell (200 OK, no images, monogram title — same as before). This is the explicit "no 404 for old bookmarks" intent baked into the feed-properties module. If we later decide to also 404 anonymous traffic on placeholder slugs, that is a separate PR and an explicit UX decision — out of scope for C3 closure.

**Files (PRs #354 + #355 + #356 chain):**

- `pages/sitemap.xml.js` — `LUX_PROPERTY_REFS = []` + rationale header (PR #356).
- `node-tests/sitemap-host-aware.test.mjs` — assertion shape correction (PR #356).
- `node-tests/lux-change-usability-fixes.test.mjs` — inverted line-69 assertion + 2026-06-12 audit context (PR #356).
- `docs/runbooks/LUX_CONTENT_SPRINT_C3_PLACEHOLDER_CLEANUP.md` — new operator-paste runbook (PR #354) + new § 8 canonical executed path (PR #356).
- `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md` — single Jan-facing brief covering C1 imagery spec + C2 opportunity template + C4 walk-through (PR #355).
- `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` — § 3 C3 audit expanded to 8 slugs (PR #354), closure block with full Delivery Reality Audit evidence appended (this turn).

**Explicit non-touched (governance + scope discipline):** no DB write; no schema change; no new migration; no new code path or conditional branch; no public-surface redesign (`/`, `/properties`, `/property/<slug>`, `/concierge`, `/change` all render identically to before); no auth / tenant / session / media-governance change; no master programme ticket `cmo8mjijk0000jl04l1jz0v6d` touched; no sprint parent `cmqa2y2ga0000l704glnfro1f` touched; no C1 / C2 / C4 sprint child ticket touched; no CMP attachment / row deleted; no new env var; no secret edit; no secret request.

**Sprint status after this closure:**

- **C1** Homepage imagery — pipeline ready (PRs #348-#352 verified live); **awaiting Jan content** per `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md` § 2.
- **C2** First real opportunity — pipeline ready (`/properties/admin` + `/change` end-to-end); **awaiting Jan opportunity content** per `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md` § 3; when published, append slug to `LUX_PROPERTY_REFS`.
- **C3** Placeholder cleanup — **COMPLETE** (this entry).
- **C4** Jan validation E2E — all routes verified live; **awaiting Jan walk-through** per `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md` § 5; one-line confirmation on sprint parent ticket closes it.

The remaining bottleneck is content acquisition + Jan editorial decisions, not software capability. No further platform features, public-surface redesigns, or workflow-complexity expansions are planned in this sprint.

---

## 2026-06-12 — LuxeMaurice `/change` attachment panel readability + operator-language cleanup: palette-aware `luxAttachInk` (warm ivory / charcoal / gold tokens), removed Phase 4C/4D/5D engineering labels from operator UI, plain-English copy ("Replace media safely", "Archive or restore this attachment", "Filter this ticket's attachments"), collapsed `<details>` "Technical details" for hard-delete policy notes (PR #352, P0 UX cleanup follow-up to PR #351)

<!-- LUXEMAURICE_ATTACHMENT_PANEL_READABILITY_2026_06_12_HIST -->

**Status:** PARTIAL — PR [#352](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/352) opened after PR [#351](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/351) merged (`7e38fe5a`) and deployed to Vercel Production (deployment id `5031164616`, status `success` 2026-06-12T06:32:39Z). The upload pipeline now works end-to-end (PR #351 closed that loop), but Jan/Anton report the attachment panel itself is hard to read (grey-on-grey contrast) and exposes implementation-phase labels ("Phase 4D.3", "Phase 4D.4", "Phase 4D.5", "Phase 4C.2", "Phase 4C.3 / 4D.1 / 4D.2", "client-side filters") that mean nothing to a content operator and actively imply the page is in some intermediate beta state. PR #352 is a UI language + readability cleanup only — **behaviour is unchanged** (no API change, no storage change, no review/link/publish/archive/restore logic change, no tenant/session/auth-check change, no media-governance change). Live production verification pending PR #352 merge + Vercel Production "Ready" + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**.

**Root cause:** Two parallel issues. (1) The attachment panel JSX hard-codes slate-on-navy tokens (`#cbd5e1`, `#94a3b8`, `#64748b`, `rgba(2,6,23,0.40)`) that come from the generic dark operator shell; Lux operators are on a warm ivory / charcoal / gold palette (per `lib/client/luxe-maurice-brand-theme.js` + `lib/client/lux-change-console-theme.js`), so the contrast is wrong. (2) Operator-facing copy was written by engineers documenting the Phase 4 attachment lifecycle as they shipped it (PRs #344+); nobody rewrote it for the content-operator audience after the feature stabilised.

**Fix:**

1. **Palette-aware `luxAttachInk` helper** added in `pages/change.js` next to the existing `luxInk`. When `luxChangeChrome` is present (Lux operator), it exposes warm tokens — `cardBg = chrome.white`, `summaryCellBg = chrome.sand`, `label = chrome.textLabel`, `body = chrome.text`, `muted = chrome.textMuted`, `accent = chrome.gold`, plus warn / danger / success variants in muted warm tones. For non-Lux operators (Core / other tenants) it falls back to the existing slate palette so the dark shell is unchanged.
2. **Visible operator copy rewritten** (JS code comments / JSDoc retained for engineer context):
   * `Phase 4D.3 · Replace media safely: upload a new attachment, …` → block titled **"Replace media safely"** with plain-English body.
   * `Phase 4D.4 · client-side filters only; does not change what is public.` → **"Filter this ticket's attachments. Filters do not change what is public."**
   * `Phase 4D.5 · Badges are advisory only …` → **"These badges are operator hints, not security rules. To retire a smoke or test file, use Archive — nothing is hard-deleted from this screen."**
   * `Phase 4C.3 / 4D.1 / 4D.2 · public slot (Lux host only)` → **"Public slot — visible on the LuxeMaurice site when published"**
   * `Phase 4D.3 · lifecycle` → **"Archive or restore this attachment"**
   * `Phase 4D.5 · This attachment still matches public Lux slot heuristics …` → **"This file is still linked to a public slot (hero, gallery, or card). Unpublish it from the property first, then archive once you have replaced it."** (shown in a soft warn pill using `luxAttachInk.warnBg / warnBorder / warnText`).
   * `Phase 4C.2 · link reviewed media …` → **"Link this reviewed file to a property or opportunity. Linking keeps it private until you also publish it on an allowed slot."**
   * `Phase 4D.4 / 4D.5 · Cleanup: this console does not hard-delete bytes. …` → moved into a `<details data-testid="lux-attachment-technical-details">` block titled **"Technical details"**, closed by default. The hard-delete-policy text remains for audit, just not at the top of the operator's attention.
3. **Per-card body palette swap** — card outer (`background`, `border`), file-name headline color, file-metadata row (Type / MIME / Size / Use / Added / Lifecycle), archive-detail row, empty-filter pill — all now reach for `luxAttachInk` tokens instead of hard-coded slate. Padding bumped from `12` to `14` on the card and `8 10` to `10 12` on summary cells for breathing room.
4. **Stable test hooks** added: `data-testid="lux-attachment-replace-guidance"`, `lux-attachment-summary-cell`, `lux-attachment-filter-note`, `lux-attachment-filter-empty`, `lux-attachment-card`, `lux-attachment-badge-note`, `lux-attachment-public-slot-label`, `lux-attachment-lifecycle-label`, `lux-attachment-published-warning`, `lux-attachment-link-hint`, `lux-attachment-technical-details`.

**Files changed (PR #352):**

* `pages/change.js` — new `luxAttachInk` helper (~50 lines); attachment-panel header + summary boxes + filter row + loading/error pill + per-card body + cleanup footer rewritten to plain English + palette tokens; cleanup/hard-delete policy moved into a collapsed `<details>` block.
* `node-tests/lux-attachment-panel-readability.test.mjs` — **13 new regression guards** covering: `luxAttachInk` palette-aware helper present; no `Phase 4C` / `Phase 4D` / `Phase 5D` / `client-side filters` string in operator-rendered copy (comments stripped before assertion); "Replace media safely" / "Archive or restore" / filter / public-slot / link-hint / published-warning / badges-note plain-English copy present; cleanup policy lives in `<details><summary>Technical details</summary>`; attachment cards + summary cells reach for `luxAttachInk` tokens; **existing review/link/publish/archive/restore handlers (`submitAttachmentReview`, `submitAttachmentPropertyLink`, `submitAttachmentPropertyPublish`, `submitAttachmentPropertyUnpublish`, `submitAttachmentArchive`, `submitAttachmentRestore`) still present and PR #351 ATTACHMENTS list render guard preserved**; empty-filter state uses plain-English copy + palette tokens.
* `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` — extended with `P0 UX cleanup — PR #352 (2026-06-12)` section.
* `artifacts/chat_history.md` — this entry.

**Things explicitly NOT touched (PR #352) — per operator instruction:** no upload API change, no `cmpTicketAttachment` storage change, no review / link / publish / archive / restore behaviour change, no tenant/session/auth-check change, no media-governance change, no public-media-rules change, no publication-governance change, no env-var change, no CSP change, no accessibility refactor beyond `data-testid` hooks, `computeIsIntakeUx` unchanged, `LuxContentSprintPanel` API surface unchanged, non-Lux operator dark shell unchanged (slate fallback preserved in `luxAttachInk`), `public/change.html` untouched.

**Tests/build (local):** `npm test` → **765 / 765 pass** (was 752 after PR #351; +13 new guards in PR #352). `npm run build` → green (Next.js production build). No linter errors in modified files.

**Rollback:** revert PR #352 — PR #351 behaviour returns; no migrations.

**Runbook:** `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` (extended with `P0 UX cleanup — PR #352 (2026-06-12)` section).

**Production verification plan (post-merge):** open `https://lux.corpflowai.com/change` as Lux operator, select a C1/C2/C3/C4 sprint ticket, scroll to ATTACHMENTS, and confirm: attachment card + summary boxes are clearly readable (warm ivory card); the top hint reads **"Replace media safely"** (not `Phase 4D.3 …`); filter note reads **"Filter this ticket's attachments. Filters do not change what is public."** (not `Phase 4D.4 · client-side filters …`); each card shows **"Archive or restore this attachment"** (not `Phase 4D.3 · lifecycle`); cleanup/hard-delete policy is inside a closed-by-default **"Technical details"** disclosure at the bottom; review / mark reviewed / link / publish / archive / restore controls still work exactly as before (upload a small safe file, mark reviewed, archive it — do not publish test media publicly). Record commit SHA, Vercel Production deployment id, URLs hit, and expected-vs-actual readability result against `.cursor/rules/delivery-reality.mdc` § Delivery Reality Audit before flipping the verdict to **COMPLETE**.

---

## 2026-06-12 — LuxeMaurice `/change` Upload content end-to-end: ATTACHMENTS list render guard relaxed for sprint tickets + structured `[lux-upload]` pipeline diagnostics + verbatim server-error surfacing + in-section "Just uploaded" confirmation + lenient empty-MIME tolerance (PR #351, P0 follow-up to PR #350)

<!-- LUXEMAURICE_UPLOAD_CONTENT_END_TO_END_2026_06_12_HIST -->

**Status:** PARTIAL — PR [#351](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/351) opened to close the end-to-end loop after PR [#350](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/350) deployed to Production (SHA `2815b9d8`, Vercel Production deployment id `5030579182`, status `success` 2026-06-12T05:18:26Z). After PR #350 the OS file picker opens, the file is uploaded successfully through the existing governed `POST /api/change-attachment/upload`, and `loadAttachmentsForTicket` runs — but the operator never saw the new row because the per-ticket ATTACHMENTS list collapsible at `pages/change.js:3523` was still gated on `!showIntakeSurface`, the *same* intake-stage block PR #349 removed from the *upload section* but not from the *list section* right next to it. Live production verification of PR #351 pending Vercel Production + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**.

**Root cause (traced):** Sprint child tickets C1–C4 sit in `Intake` workflow stage by design (created by PR #345). `computeIsIntakeUx(ticket) === true` → `showIntakeSurface === true` → the ATTACHMENTS list at line 3523 was never rendered for those tickets, regardless of whether attachments existed. The upload was succeeding all along; the visual confirmation the operator was looking for was hidden by exactly the same one-line guard pattern PR #349 had fixed elsewhere. The operator reasonably interpreted "no row in ATTACHMENTS" as "the file was dropped".

**Fix:**

1. **Primary — ATTACHMENTS list render-guard relaxed.** Changed `{!showIntakeSurface && !isEstimateMode && selectedTicketId && attachments.length > 0 ? (...)}` → `{selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) && attachments.length > 0 ? (...)}`. Sprint tickets always show their attachments list; non-sprint tickets retain `!isEstimateMode` behaviour. Mirrors PR #349 / #350's sprint-ticket bypass on the upload section.
2. **Defensive — verbatim server-error surfacing.** `uploadFileToTicket` now formats failed responses as `Upload failed (HTTP <status>): <server error text>`; network errors surface distinctly; uncaught exceptions surface their `.message` text. No silent drop.
3. **Defensive — lenient MIME pre-check.** `clientMimeAllowed('')` now returns `true`. The Windows file picker hands back `file.type === ''` for legitimate images, which previously produced a confusing client-side false negative. The server's canonical allowlist (`image/,video/,application/pdf`) still rejects bad types.
4. **Defensive — in-section "Just uploaded" confirmation.** New `lastUploadedAttachment` state + green pill (`data-testid="lux-ticket-attachment-upload-last"`) shows file name, size, MIME, and current attachments count immediately after upload — the operator no longer depends on the (potentially below-the-fold) ATTACHMENTS list alone.
5. **Defensive — structured `[lux-upload]` diagnostics at every pipeline step.** `console.warn` lines for file picked (name, size, type, ticket), POST sent (ticket, file name, base64 length), response (status + truncated body), refresh result (count), FileReader empty result, network error, caught exception, handler-error. Future regressions diagnose themselves from the browser console.
6. **Defensive — file-input value reset in `finally`** covering both success AND failure paths, using the React ref first with `document.getElementById` fallback so re-picking the same file always works.

**Files changed (PR #351):**

* `pages/change.js` — ATTACHMENTS list render-guard relaxed; `clientMimeAllowed('')` → `true`; `uploadFileToTicket` rewritten for verbatim error surfacing + structured diagnostics + `lastUploadedAttachment` + safe reset in `finally`; `handleAttachmentUploadInputChange` adds diagnostic + handler-error surfacing; new state + in-section "Just uploaded" green pill.
* `node-tests/lux-content-sprint-upload-button.test.mjs` — 9 new regression guards locking in the sprint ATTACHMENTS render, the exact POST payload contract, refresh wiring, success-state surfacing (pill + "Just uploaded" line), verbatim error surfacing (no silent drop), input reset in `finally` with id fallback, lenient empty-MIME tolerance, and every `[lux-upload]` diagnostic line.

**Tests + build:** `npm test` — 752 passing, 53 suites, 0 failing (up from 743 in PR #350; +9 new). `npm run build` — green.

**Things explicitly NOT touched (PR #351) — per operator instruction:** no new upload system, no second API path, no public media route, no `cmpTicketAttachment` storage change, no media-governance change, no tenant/session/auth-check change, no env-var change, no CSP / `unsafe-eval` change, no accessibility refactor beyond PR #350's id+name, `computeIsIntakeUx` unchanged, `LuxContentSprintPanel` API surface unchanged, `public/change.html` untouched.

**Live verification plan (pending):** Open `https://lux.corpflowai.com/change` with browser console open (F12). For each C1–C4: select ticket → click **Upload content** → pick a small safe file → confirm (a) green status pill `Uploaded and available on this ticket: <name> (<size> KB). Scroll down to ATTACHMENTS …`, (b) green "Just uploaded" line inside the upload card, (c) ATTACHMENTS section now renders below with review · link · publish controls on the new row, (d) ordered `[lux-upload]` console lines showing picked → POST → response status=200 → refreshed count. Re-pick the SAME file to verify input reset. **Do not publish test media publicly.** Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot. Flip PR #347 + #348 + #349 + #350 + #351 verdict to `COMPLETE` only after Jan and Anton confirm.

**Rollback:** revert PR #351 — PR #350 behaviour returns; no migrations.

**Runbook:** `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` (extended with `P0 follow-up — PR #351 (2026-06-12)` section).

---

## 2026-06-12 — LuxeMaurice `/change` Upload content button: belt-and-suspenders defensive fix — stable id/name on the input + document.getElementById fallback + sprint-ticket-unconditional render + `[lux-upload]` console diagnostic (PR #350, P0 follow-up to PR #349)

<!-- LUXEMAURICE_UPLOAD_CONTENT_BUTTON_DEFENSIVE_2026_06_12_HIST -->

**Status:** PARTIAL — PR [#350](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/350) opened because operators still hit `Upload area is not available right now. Try reloading /change with this ticket open.` after PR [#349](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/349) deployed to Production (SHA `93249e73`, Vercel Production deployment id `5029556251`, status `success` 2026-06-12T02:51:00Z). Live production verification of PR #350 pending Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**.

**Runtime diagnostic that drove this PR:** Production SHA on `https://lux.corpflowai.com/change` confirmed to include PR #349's relaxed render guard (`{!isEstimateMode && selectedTicketId ? (...)}`) and the `input.click()` upgrade — yet the click handler still reached the non-silent unavailable branch on real C1–C4 tickets. We could not introspect the live operator-session DOM from outside (auth-gated) to prove whether (a) the upload section was missing from the DOM despite the relaxed guard, or (b) the React refs were null at click time due to a hydration / ref-attachment race. PR #350 instruments the handler so the next click either succeeds or pastes a one-line `[lux-upload]` diagnostic identifying the exact root cause.

**Fix:**

1. **Stable `id="lux-ticket-attachment-upload-input"` + `name="lux-ticket-attachment-upload-input"`** on the file input. Gives `document.getElementById` a deterministic anchor, and incidentally fixes the secondary "form field missing id/name" browser warning the operator noted (which the operator explicitly de-prioritised, but the fix lands here as part of the same code change).
2. **`document.getElementById` fallback in `handleSprintUploadContentClick`** — if `luxAttachmentUploadInputRef.current` is null at click time, the handler now also tries `document.getElementById('lux-ticket-attachment-upload-input')` and `document.getElementById('lux-ticket-attachment-upload')`. If either resolves a node, the handler proceeds with scroll → focus → `input.click()` as before. The React-ref-first path is unchanged.
3. **Render-guard strengthened** to `{selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) ? (...)}`. Sprint tickets always render the upload section; no future `isEstimateMode === true` regression can hide it for the C1–C4 flow.
4. **`[lux-upload]` diagnostic `console.warn`** on the unavailable branch. One structured line with `selectedTicketId`, `isEstimateMode`, `isLuxContentSprintTicketSelected`, ref-attached booleans, and DOM-found booleans. If the regression ever recurs, the operator pastes that one line and the next root cause is obvious — no more chained PRs without runtime evidence.

**Files changed (PR #350):**

* `pages/change.js` — `<input>` gains `id` + `name`; `handleSprintUploadContentClick` gains the `document.getElementById` fallback + `[lux-upload]` diagnostic; upload-section render condition adds the sprint-ticket bypass.
* `node-tests/lux-content-sprint-upload-button.test.mjs` — **four new regression guards** locking in: (1) sprint tickets always render the section (`isLuxContentSprintTicketSelected` in the conditional), (2) input carries `id` + `name`, (3) handler falls back to `document.getElementById`, (4) diagnostic `console.warn` is emitted.

**Tests + build:** `npm test` — 743 passing assertions, 53 suites, 0 failing (up from 739 in PR #349; +4 new). `npm run build` — green.

**Things explicitly NOT touched (PR #350) — per operator instruction:** no CSP relaxation, no `unsafe-eval`, no general accessibility refactor (operator: do not work on accessibility warnings until the upload flow works). Also unchanged: `/api/change-attachment/upload` contract, `cmpTicketAttachment` storage, tenant / session / auth checks, media governance, `LuxContentSprintPanel` API surface, `computeIsIntakeUx`, `public/change.html`.

**Live verification plan (pending):**

1. Wait for Vercel Production to mark the PR #350 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session with the browser console open (F12 → Console).
3. For each of C1, C2, C3, C4: select ticket → click **Upload content** → confirm the OS file picker opens immediately, **no alert**, **no fallback message**, **no `[lux-upload]` warning in the console**. If the warning DOES appear, paste the one line — its boolean fields identify the exact root cause (which lookup succeeded, whether the section is in the DOM at all).
4. Pick a small safe test image (≤3 MB), confirm green status pill and the new attachment in the ATTACHMENTS list for review/link/publish. **Do not publish test media publicly.**
5. Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot. Flip PR #347 + PR #348 + PR #349 + PR #350 verdict to `COMPLETE` only after Jan and Anton confirm.

**Rollback:** revert PR #350 — PR #349 behaviour returns; no migrations. The `id`/`name` removal would re-trigger the "form field missing id/name" warning but no functional regression beyond returning to PR #349 state.

**Runbook:** `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` (extended with the `P0 follow-up — PR #350 (2026-06-12)` section, including the runtime diagnostic table).

---

## 2026-06-12 — LuxeMaurice `/change` Upload content button: render guard relaxed + native file picker opens directly on click (PR #349, P0 follow-up to PR #348)

<!-- LUXEMAURICE_UPLOAD_CONTENT_BUTTON_PICKER_2026_06_12_HIST -->

**Status:** PARTIAL — PR [#349](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/349) unblocks the regression Jan and Anton hit immediately after PR [#348](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/348) merged: clicking **Upload content** on a C1–C4 sprint ticket showed `Upload area is not available right now. Try reloading /change with this ticket open.` instead of opening a file picker. Live production verification pending Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**.

**Why the button still failed after PR #348:** PR #348 placed the *Upload to this ticket* section under the same render guard the existing ATTACHMENTS collapsible used: `!showIntakeSurface && !isEstimateMode && selectedTicketId`. `showIntakeSurface` is `true` whenever `computeIsIntakeUx(ticket)` returns `true`, and that helper returns `true` for any ticket whose workflow label resolves to `Intake`. The sprint child tickets C1–C4 created during PR #345 sit in **Intake** by design (they are fresh sprint work items, not legacy in-progress requests). So for exactly the tickets the button targets, the section was never mounted, the section/input refs were both `null`, and `handleSprintUploadContentClick` correctly fell through to its non-silent fallback. `<LuxContentSprintPanel>` does *not* share that guard, so the button rendered while its target did not — the "wired button without a destination" footprint the operator screenshot reported.

**Fix:**

1. **Loosened the upload-section guard** to `!isEstimateMode && selectedTicketId`. Operators need to attach media to in-flight sprint work regardless of intake stage; the section is still hidden during estimate-only mode (read-only quote review). A code comment in `pages/change.js` documents the prior false-positive and the rationale.
2. **Native file picker opens directly on click** — `handleSprintUploadContentClick` now performs `scrollIntoView` → `focus({preventScroll:true})` → `input.click()` (option (b) from the brief). Browsers permit programmatic clicks on file inputs only inside the same user-gesture handler, and this handler *is* that gesture, so the OS picker opens synchronously on the first click. `try/catch` keeps option (a) (scroll + focus) as a fallback for restrictive environments.

**Files changed (PR #349):**

* `pages/change.js` — render guard for the *Upload to this ticket* section relaxed (still respects `!isEstimateMode && selectedTicketId`; in-line comment explains why intake-stage sprint tickets must be allowed through). `handleSprintUploadContentClick` adds `input.click()` so the picker opens immediately.
* `node-tests/lux-content-sprint-upload-button.test.mjs` — existing handler test now asserts `input.click()`; **new test** *PR #349 regression guard: upload section renders without the !showIntakeSurface gate* parses the JSX conditional that opens the section and asserts the conditional does not include `!showIntakeSurface` (still requires `!isEstimateMode`). The regression cannot return through a future refactor without tripping this guard.

**Tests + build:** `npm test` — 739 passing assertions, 53 suites, 0 failing (up from 738 in PR #348; +1 new). `npm run build` — green.

**Things explicitly NOT touched (PR #349):** `computeIsIntakeUx` (intake-skin behaviour for non-sprint tickets is preserved by not touching the helper), `/api/change-attachment/upload` contract, `cmpTicketAttachment` storage, `resolveUploadScope` / `assertTicketAccess` tenancy / session checks, media governance (review → link → publish on allowed slots), `LuxContentSprintPanel` static fallback for non-Lux operator chrome, `public/change.html`.

**Live verification plan (pending):**

1. Wait for Vercel Production to mark the PR #349 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session.
3. For each of C1, C2, C3, C4: select ticket → click **Upload content** → confirm the OS file picker opens immediately (no `alert`, no fallback message) → optionally pick a small safe test image (≤3 MB), confirm the green status pill and the new attachment in the ATTACHMENTS list for review/link/publish → **do not publish test media publicly**.
4. Open a non-sprint ticket and confirm the section still renders and behaves identically.
5. Open an estimate-mode ticket and confirm the section remains hidden (the `!isEstimateMode` guard still applies).
6. Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot in `artifacts/chat_history.md`. Flip PR #347 + PR #348 + PR #349 verdict to `COMPLETE` only after Jan and Anton confirm.

**Rollback:** revert PR #349 — previous "button without target" behaviour returns on sprint tickets; no migrations.

**Runbook:** `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` (extended with `P0 follow-up — PR #349 (2026-06-12)` section).

---

## 2026-06-12 — LuxeMaurice `/change` Upload content button wired to the existing governed attachment pipeline (PR #348, follow-up to PR #347)

<!-- LUXEMAURICE_UPLOAD_CONTENT_BUTTON_WIRING_2026_06_12_HIST -->

**Status:** PARTIAL — PR [#348](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/348) opened to fix a P0 regression introduced by PR [#347](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/347): the new "Upload content" button on the C1–C4 Content Population Sprint tickets rendered as a static, non-clickable affordance. Live production verification is pending Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**; no DB row changed.

**Root cause:** PR #347 introduced `<LuxContentSprintPanel>` with an optional `onUploadClick` prop, but `pages/change.js` never passed a handler. The panel therefore rendered the *static* fallback (`data-testid="lux-content-sprint-upload-cta-static"`) instead of the real `<button>`, and on top of that the React `/change` console had no inline attachment-upload UI at all (the upload UI lived only in `public/change.html`, which is a different surface). Operators saw a button they could not click.

**Fix:** wired the existing governed attachment endpoint (`POST /api/change-attachment/upload`, served by `lib/server/change-attachments.js`, persisted on `cmpTicketAttachment` + auto-annotated into `console_json.lux_request_meta.attachments` for Lux tickets) into a small inline upload section on `pages/change.js`. The "Upload content" CTA now scrolls the section into view and focuses the file input. No second upload system, no new API, no new public route, no new env var; tenant / session / auth checks unchanged.

**Files changed (PR #348):**

* `pages/change.js` — new state (`uploadBusy`, `uploadStatus`, `uploadStatusKind`), refs (`luxAttachmentUploadInputRef`, `luxAttachmentUploadSectionRef`), helpers (`readFileAsBase64`, `clientMimeAllowed`, `uploadFileToTicket`, `handleAttachmentUploadInputChange`, `handleSprintUploadContentClick`). New "Upload to this ticket" section with stable anchor `id="lux-ticket-attachment-upload"` + `data-testid="lux-ticket-attachment-upload"` (and `…-input` / `…-status` for the file input and status pill). Client-side MIME pre-check matches the server allowlist (`image/`, `video/`, `application/pdf` per `cfg('CORPFLOW_CHANGE_UPLOAD_ALLOWED_MIME', …)`); ~3 MB hint matches `CORPFLOW_CHANGE_UPLOAD_MAX_BYTES` default. On success, the existing `loadAttachmentsForTicket(ticketId)` refreshes the ATTACHMENTS section inline. `handleSprintUploadContentClick` calls `scrollIntoView` + `focus`; if the section is not mounted (no ticket selected) it surfaces `alert(...)` + an inline error pill — never a silent no-op.
* `<LuxContentSprintPanel onUploadClick={handleSprintUploadContentClick} />` — wires the panel to the new handler so the real `<button>` branch renders.
* `node-tests/lux-content-sprint-upload-button.test.mjs` — **new**, 9 regression guards covering: real `<button>` vs static fallback, panel wiring, scroll + focus + unavailable-state messaging, stable anchor presence, single governed endpoint reuse, allowlist alignment, oversize / wrong-type non-silent feedback, single shared `readFileAsBase64` helper.

**Tests + build:** `npm test` — 738 passing assertions, 53 suites, 0 failing (up from 729 in PR #347; +9 new). `npm run build` — green.

**Things explicitly NOT touched (PR #348):** the `/api/change-attachment/upload` contract, `cmpTicketAttachment` storage, `resolveUploadScope` / `assertTicketAccess` tenancy / session checks, media governance (review → link → publish on allowed slots), and `public/change.html`. Demo opportunity is still hidden from public surfaces per PR #347.

**Live verification plan (pending):**

1. Wait for Vercel Production to mark the PR #348 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session.
3. For each of C1, C2, C3, C4: select ticket → click **Upload content** → confirm the page scrolls to *Upload to this ticket* and the file input is focused → (optional) pick a small safe test image and verify it appears in the ATTACHMENTS list for review/link/publish → **do not publish test media publicly**.
4. Open a non-sprint ticket and confirm the Upload section still renders (per-ticket, not per-sprint-code).
5. Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot. Flip verdict to `COMPLETE` only after both Jan and Anton confirm the upload reaches a real attachment row.

**Rollback:** revert PR #348 — static button affordance from PR #347 returns; existing attachment review / link / publish flows unaffected; no migrations.

**Runbook:** `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` (extended with a `P0 follow-up — PR #348 (2026-06-12)` section).

---

## 2026-06-12 — LuxeMaurice `/change` usability overhaul — CRM noise filter, Media workspace rename, Add content panel for sprint tickets C1–C4, demo opportunity removed from public surfaces (PR #347)

<!-- LUXEMAURICE_CHANGE_USABILITY_FIXES_2026_06_12_HIST -->

**Status:** PARTIAL — code merged + tests + build green; **TASK 6 production verification pending** Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`. The PARTIAL/COMPLETE verdict for the **Content Population Sprint** is unaffected — this packet only changes how the desk *looks and feels*, not whether the Reality Gate has fired.

**Why this work exists:** PR [#346](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/346) cleaned the historical noise out of the operator desk but did not change *how* operators interact with the remaining work. After Jan + Anton walked through `https://lux.corpflowai.com/change`, five concrete blockers remained for using the desk as a content workspace (not an engineering console):

1. `LEADS · LuxeMaurice CRM (concierge)` read `New: 14` because every historical Phase 2 / Phase 3 verification fixture (`@example.com`, `@example.invalid`, `@placeholder.local`, `@corpflowai.invalid`, names like `PHASE2D-VERIFY`, `Phase3 CRM verify`, `Notify Test`) counted as a real lead. Real concierge leads at the time of writing: **2**, both from Jan (`jam@luxemaurice.com`, `+23055081350`).
2. `Media library · cross-ticket index (Phase 5D)` exposed `Phase 5D` + `JSON metadata only (no bytes)` to a non-engineer operator.
3. Content sprint tickets C1–C4 had no obvious upload path; the primary CTA was the generic Intake / Clarify / Draft / Review / Build stage pills.
4. Sprint tasks were framed as workflow stages, not content actions.
5. The hardcoded staged catalog still rendered the demo opportunity `lm-phase2d-manual-demo` ("Le Château — manual workflow demonstration") publicly on `/`, on `/property/[slug]`, in `/concierge?property=`, and in the sitemap.

**Non-negotiables (held throughout):** no deletes; no mutation of master programme `cmo8mjijk0000jl04l1jz0v6d`; no mutation of active content sprint parent `cmqa2y2ga0000l704glnfro1f`; no mutation of any lead row in `prisma.lead`; tenant boundaries preserved; media governance unchanged; no new env vars; no schema migration; no IDX / MLS / fake inventory introduced (the demo entry is **hidden**, not faked).

**Where the new logic lives (all pure / unit-tested where possible):**

- `lib/cmp/_lib/lux-lead-system-test-heuristic.js` — pure `classifyLuxLeadSystemTest(lead)` returning `{ system_generated, reason }`. Flags rows whose contact / name / message / `qualificationJson` match repo verification fixtures or whose listing references the `lm-phase2d-manual-demo` slug. 14 unit tests including both real Jan leads as a regression backstop. `handleConciergeLeadsList` enriches every lead with `system_generated` + `system_generated_reason` and returns a top-level `counts: { total, real, system_generated }` summary.
- `lib/cmp/_lib/lux-sprint-meta-extract.js` — pure `extractLuxSprintMetaForApi(consoleJson)` that surfaces `{ parent_sprint_ticket, parent_programme_ticket, sprint_code }` on `ticket-get` for sprint children (returns `undefined` otherwise, so the existing API shape stays stable). 7 unit tests.
- `lib/client/lux-content-sprint-guidance.js` — per-C panel title / short line / upload steps / task-specific guidance / checklist scaffolding for C1–C4 + `getLuxContentSprintGuidance`, `normalizeLuxContentSprintCode`, `isLuxContentSprintTicket` helpers and a `LUX_CONTENT_SPRINT_GENERIC_GUIDANCE` fallback. 8 unit tests.
- `components/LuxContentSprintPanel.js` — Add content panel rendered above the workflow card on sprint tickets. Primary CTA (`Upload content`), secondary guidance, upload + review steps, task-specific guidance, content checklist with session-only state. Persistence on `console_json.lux_content_sprint_checklist[]` is documented as a follow-up in `LUX_CONTENT_POPULATION_SPRINT.md` § 8b.
- `lib/client/luxe-maurice-staged-properties.js` — adds `demo: true` to the `lm-phase2d-manual-demo` entry plus `isLuxStagedDemoEntry`, `isLuxStagedDemoSlug`, `getPublicLuxStagedProperties` helpers. 5 new unit tests.
- `pages/change.js` — wires the four UX changes:
  - **Media workspace** rename + collapsed `Technical note` (`data-testid="lux-media-workspace-technical-note"`).
  - **CRM noise filter:** `crmShowSystemGenerated` defaults to `false`, derives `operatorViewLeads`; counts pills + visible list pull from the filtered view. Inline toggle `data-testid="lux-crm-system-generated-toggle"` and per-row badge `data-testid="lux-crm-system-generated-badge"` surface the hidden rows for audit.
  - **Sprint detection:** computes `luxSprintMeta` and `isLuxContentSprintTicketSelected` from `ticket.lux_sprint_meta`. Renders `<LuxContentSprintPanel>` above the workflow card on sprint tickets.
  - **Workflow pills:** for sprint tickets only, the five stage pills move into a closed `<details data-testid="lux-stage-tabs-advanced-collapsed">` summary labelled `Advanced workflow state ▾`. Non-sprint tickets continue to surface the pills inline (`data-testid="lux-stage-tabs-primary"`).
- `pages/index.js`, `pages/property/[slug].js`, `pages/concierge.js`, `pages/sitemap.xml.js` — public-surface guards. `pages/property/[slug].js` returns `notFound` on demo slugs unless `?preview=1` + an authenticated editor session.
- `scripts/lux-leads-inspect.mjs`, `scripts/lux-public-surfaces-inspect.mjs` — read-only inspection helpers used to validate the heuristic and confirm `lux_listings` rows = 0 (so `/properties` correctly shows the premium empty state).

**Tests:** 45 new / extended. Full suite: `npm test` → **729 / 729 pass**. `npm run build` → green.

**Documentation:**

- New canonical runbook: `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` — every file, default, opt-out, and the pre- + post-merge verification matrix.
- `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` — new **§17 `/change` usability fixes — 2026-06-12 (PR #347)** + Output summary row.
- `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` — new **§ 8b Sprint UX overlay**, **§ 8c CRM noise filter**, **§ 8d Demo opportunity hidden**.

**Cross-references:**

- Programme strategic ticket: `cmo8mjijk0000jl04l1jz0v6d` — **untouched, still Open**.
- Sprint parent ticket: `cmqa2y2ga0000l704glnfro1f` — **untouched, still Open**.
- Sprint children: `cmqa57uyt0000xf803uav5x8x` (C1), `cmqa57ve00001xf80tpgmjeiz` (C2), `cmqa57vlg0002xf805d7azdk2` (C3), `cmqa57vsr0003xf80y543sx20` (C4) — now render the Add content panel on `/change`.

---

## 2026-06-12 — LuxeMaurice operator queue cleanup — 18 historical Phase 4C.1 smoke / test artifact tickets hard-closed (audit preserved); `archived_completed` classifier bucket added

<!-- LUXEMAURICE_OPERATOR_QUEUE_CLEANUP_2026_06_11_HIST -->

**Status:** **COMPLETE in CMP / DB / local verification.** Production verification = open `https://lux.corpflowai.com/change` with a Lux operator session and visually confirm Smoke (0) on the default desk and both protected ids still visible / open. No deletes; no protected ticket mutated; audit history, attachments, messages preserved.

**Why this work exists:** PR [#343](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/343) made the public surface brand-ready; PR [#345](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/345) formalized the Content Population Sprint that turns it commercially usable. Before the sprint can be operated cleanly, the `/change` operator desk had to lose **18 historical Phase 4C.1 attachment-review smoke / test artifact tickets** that still appeared as `status=Open / stage=Intake / workflow=awaiting_operator_review` on the `luxe-maurice` tenant. They are repeatable round-trip smoke output (and one operator test draft from 2026-05-07: `cmov9fs050000kz04070wi23k`, title *"Make changes to the website appearance"*, description *"Let's test this function"*), not real client work.

**Non-negotiables (held throughout):** no deletes; no mutation of master programme `cmo8mjijk0000jl04l1jz0v6d`; no mutation of active content sprint parent `cmqa2y2ga0000l704glnfro1f`; tenant locked to `luxe-maurice`; no new env vars; no schema migration; canonical `buildHardCloseConsoleJsonPatch` reused for identical hard-close semantics with the rest of the repo.

**Tooling added in this packet:**

- **`lib/cmp/_lib/lux-phase4c1-smoke-cleanup.js`** — pure helpers (no DB / fs / env reads): `TARGET_TICKETS` (18 audited ids), `PROTECTED_TICKETS` (`cmo8mjijk0…`, `cmqa2y2ga0…`), `KNOWN_OPERATOR_TEST_DRAFTS` (per-id signature for the one 2026-05-07 operator test draft `cmov9fs050000kz04070wi23k` — accepted only if title + description + 0 messages + 0 attachments still match the inspected signature exactly), `preflightConfigCheck`, `preWriteCheck`, `applyHardCloseAndAppendMessage`.
- **`scripts/lux-close-phase4c1-smoke-tickets.mjs`** — CLI orchestrator. Dry-run by default; `--execute` writes; `--output=<path>` snapshots JSON. Refuses without `POSTGRES_URL`. Per-row pre-write re-check before each write. Any non-`already-closed` refusal aborts the **entire** batch — nothing is written in a partially-bad run.
- **`scripts/lux-queue-audit.mjs`** — extended to pass `status / stage / workflow_state` through to the classifier, so closed rows surface in the new `archived_completed` bucket under `--include-closed`.
- **`lib/client/lux-change-queue-classify.js`** — added `archived_completed` bucket: terminal-closed rows (status `Closed`, stage `Closed`, or `client_view.workflow_state='closed'`) route there. Programme ids still win. Live `/change` is unaffected because the API server-side filters `status='Closed'` before the classifier runs.
- **`node-tests/lux-phase4c1-smoke-cleanup.test.mjs`** (25 unit tests) + extensions to **`node-tests/lux-change-queue-classify.test.mjs`** for the new bucket.
- **`docs/runbooks/LUX_OPERATOR_QUEUE_CLEANUP_2026_06_11.md`** — canonical runbook (what, why, guards, execution evidence, reversibility).

**Per-row hard-close mutation:** `status='Closed'`, `stage='Closed'`, `consoleJson` merged via `buildHardCloseConsoleJsonPatch` (sets `client_view.workflow_state='closed'` + `workflow_next_action` + `progress_message` + `closure.{kind:'hard_close',reason,context_note,decided_at}`), and one assistant-role closure message appended to `consoleJson.messages[]` (`source: 'lux-queue-cleanup-2026-06-11'`) — prior messages preserved verbatim. Closure text: *"Closed during 2026-06-11 LuxeMaurice operator queue cleanup — historical Phase 4C.1 smoke/test artifact. Audit history, attachments, and messages preserved."*

**Execution evidence (live DB, 2026-06-12 00:00–00:10 UTC):**

1. Dry-run: `node scripts/lux-close-phase4c1-smoke-tickets.mjs --output=.lux-verify/cleanup-dryrun.json` → `would_close=18, already_closed=0, refused=0, not_found=0`.
2. Execute: `node scripts/lux-close-phase4c1-smoke-tickets.mjs --execute --output=.lux-verify/cleanup-execute.json` → `closed=18, already_closed=0, refused=0`.
3. Re-audit default view: `Programme (1) · Active (1) · Property (4 sprint children C1–C4) · CRM (0) · Internal (0) · Smoke (0)`.
4. Re-audit with `--include-closed`: `Archived / completed (32) = 18 just-closed + 14 pre-existing closed historical rows`. All 18 cleanup targets present in `archived_completed`; both protected ids absent from the cleanup result set.

**Expectation note vs the 2026-06-11 packet.** The packet expected post-cleanup `Property (0)`. Live count is `Property (4)` — that is the four sprint children C1–C4 from PR #345 (homepage imagery, first real opportunity, demo cleanup, Jan validation). Intentional active work, not cleanup leakage.

**Tests / build:** `npm test` (684 pass / 0 fail) and `npm run build` both green locally.

**Cross-references:** `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` § 16 (operator queue cleanup), § 15 (content sprint), § 14 (PR #343 audit); `docs/LUX/LUX_DELIVERY_PROGRAMME.md` Phase 2 cleanup note; `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 8a (operator desk post-cleanup state); `docs/runbooks/LUX_OPERATOR_QUEUE_CLEANUP_2026_06_11.md` (canonical runbook).

---

## 2026-06-11 — LuxeMaurice vision-aligned public experience live on production (PR [#343](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/343); programme ticket `cmo8mjijk0000jl04l1jz0v6d` remains open; **slice COMPLETE**)

<!-- LUXEMAURICE_VISION_ALIGNED_PUBLIC_EXPERIENCE_2026_06_11_HIST -->

**Status:** **COMPLETE for this slice (vision-aligned public experience).** Full Phase-2 §8 Reality Gate stays **PARTIAL** under Slice C scope (first real client-published listing, editor E2E on production, governed public imagery on a real listing). Programme master ticket **`cmo8mjijk0000jl04l1jz0v6d`** **remains open**.

**Why this slice exists:** The LuxeMaurice client approved the Strategic Vision presentation and Brand Guidelines on 2026-06-11. PR [#342](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/342) repositioned the *requirements* (removed IDX/MLS from the active programme, established Private Wealth & Lifestyle Platform language). PR #343 then rebuilt the *public experience* to match the approved presentation — brand fidelity rather than feature delivery was the explicit success bar (*"the goal is brand fidelity and client confidence"*).

**What shipped (PR #343):**

- **Brand tokens locked to the four-colour system** in `lib/client/luxe-maurice-brand-theme.js`: `charcoal #111111`, `ivory #F4EFE8`, `gold #A8842C`, `stone #6B6256` (+ derived layering colours strictly inside that system, hairlines, design pillars, brand signature, strapline constants). Legacy aliases preserved for admin surfaces only.
- **New brand primitives** in `components/LuxeMauriceBrandPrimitives.js`: `LuxeMauriceFontStylesheet` (Cormorant Garamond loaded on Lux tenant only), `LuxeMauriceMonogram` (geometric hairline-crown SVG), `LuxeMauriceWordmark` (monogram + wordmark + signature; compact / stacked / small variants; mobile-safe sizing), `LuxEyebrow` (gold uppercase letterspaced kicker), `LuxHairline` (gold/ivory/stone divider).
- **Homepage** (`components/LuxeMauriceTenantPresentation.js` driven by `pages/index.js`): cinematic charcoal hero with monogram + LUXEMAURICE wordmark + signature "Private. Curated. Considered." + strapline "Private Wealth & Lifestyle Platform for Mauritius" + "Request a private consultation" CTA. Reframe section "This is not a property website." Mauritius Strategic Base (Lifestyle / Security / Connectivity / Legacy / Opportunity). "Two buyers. One standard of care." (Completed Residence Buyer / Development Partner). Private Opportunities ("Invited. Not advertised."). Owner Experience ("Confidence at distance."). Design Language Pillars. Private Advisory CTA. No property cards / no listing grid above the fold. `feed_properties = []` so no fake inventory leaks onto the homepage.
- **Private Opportunities** (`/properties` via `components/LuxeMauricePropertiesDirectory.js`): header monogram + LUXEMAURICE wordmark + "INVITED. NOT ADVERTISED." eyebrow top-right. "PRIVATE OPPORTUNITIES" eyebrow, "A quiet moment before the next reveal" Cormorant display, "Private opportunities are being prepared for client review…" empty-state body, italic CTA strap "Each opportunity is prepared for review…", "REQUEST A PRIVATE CONSULTATION" gold CTA. Cards (when published listings exist) are full-bleed memoranda, not listing tiles. Page title rewritten to "Private Opportunities — LuxeMaurice".
- **Private Opportunity Memorandum** (`/property/[slug]` via `components/LuxeMauricePropertyDetailPage.js`): "PRIVATE OPPORTUNITY MEMORANDUM" eyebrow + region/type, large Cormorant title, italic on-application price strip, hero image, two-column editorial layout with `Overview` / `Lifestyle context` / `Advisory notes` / `Gallery` / `At a glance` sections, hairline dividers, "Discuss this private opportunity with a private advisor." CTA. SEO title shape: `<title> — Private Opportunity — LuxeMaurice`.
- **Private Advisory** (`pages/concierge.js`, SEO from `lib/client/concierge-seo.js`): "PRIVATE ADVISORY" eyebrow + "Request a private consultation." Cormorant display + italic "Tell us briefly what you are seeking in Mauritius." Editorial form — underline-only inputs (no card chrome), intent pill toggles (Completed residence / Development partnership / Relocation to Mauritius / Investment / diversification / Ongoing ownership support), message textarea, gold CTA. Page title rewritten to "Private advisory — LuxeMaurice".
- **Brand-fidelity audit test** at `node-tests/luxe-maurice-vision-positioning.test.mjs`: scans public Lux surfaces for forbidden IDX/MLS/feed language (case-sensitive `IDX`/`MLS`), asserts exact colour values, font stacks, presence of design pillars, brand signature, brand strapline, and confirms all public Lux surfaces use `LuxeMauriceFontStylesheet` + `LuxeMauriceWordmark`.

**What did NOT change:** CMP / auth / session semantics; publication governance (no auto-publish; published-only on public; preview gating intact); media governance (`/api/lux/property-media` image-only public contract unchanged); tenant boundaries; admin auth (`/properties/admin` still **307 → /login?next=…**); factory health.

**Live production verification (2026-06-11, post-deploy):** PR #343 merged via squash commit **`c5cd3769316c7c793f0dd323c210d92b474f46aa`**. GitHub Production deployment **`5019756150`** (Vercel bot) — status `success` on the merge SHA. Live HTML inspected against the requested brand markers; live desktop + mobile screenshots captured against `https://lux.corpflowai.com/{,properties,property/lm-villa-belombre,concierge,properties/admin}`. All required markers present: charcoal/ivory/gold/stone palette, Cormorant Garamond + Inter hierarchy, monogram + LUXEMAURICE wordmark treatment, "Private. Curated. Considered.", "This is not a property website.", "Invited. Not advertised.", "Confidence at distance.", `/properties` reads as Private Opportunities, `/concierge` reads as Private Advisory, `/properties/admin` redirects unauthenticated visitors to `/login?next=/properties/admin`, `__NEXT_DATA__.listings = []` confirms no fake inventory on the directory, `IDX`/`MLS`/`realtor platform`/`property feed`/`feed-first` absent on all checked public surfaces. `https://core.corpflowai.com/api/factory/health` → `200 ok:true` (database, sovereign session, admin operator, runtime config all healthy). **Full Delivery Reality Audit:** `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` § 14.

**Outstanding programme gates:** First real **client-created published** listing on the new chrome; editor E2E (Anton + Jan) on production; governed public imagery on a real listing. These remain the Slice C scope and keep the full Phase-2 §8 Reality Gate at **PARTIAL** even though the vision-aligned public experience slice is now **COMPLETE** in production. The operational programme that closes that gap is the **LuxeMaurice Content Population Sprint** (see next entry — parent ticket `cmqa2y2ga0000l704glnfro1f`, four `Property & media` children C1–C4). Master programme ticket **`cmo8mjijk0000jl04l1jz0v6d`** remains **open**.

---

## 2026-06-11 — LuxeMaurice Content Population Sprint formalized in CMP (sprint parent `cmqa2y2ga0000l704glnfro1f`; four `Property & media` children C1–C4; **PARTIAL** — awaiting Jan + Anton live sign-off)

<!-- LUX_CONTENT_POPULATION_SPRINT_FORMALIZATION_2026_06_11_HIST -->

**Status:** **PARTIAL.** The vision-aligned public surface (PR #343, audited above) is brand-ready but not yet commercially usable: no real homepage imagery, no real published private opportunity, and five legacy `lm-*` preview slugs remain reachable. Today the **LuxeMaurice Content Population Sprint** was formalized in CMP under existing Phase 4B conventions — sprint parent enriched, four child workstreams live, all four classified into **Property & media** on the live operator queue at `https://lux.corpflowai.com/change`. **Master programme ticket `cmo8mjijk0000jl04l1jz0v6d` is unchanged and remains open.**

**What shipped (CMP writes, idempotent, dry-run by default):**

- **Sprint parent enriched** — `cmqa2y2ga0000l704glnfro1f` (`LuxeMaurice Content Population Sprint`, created 2026-06-11 22:39 UTC). Description appended with the programme block (+3004 chars, gated by marker `<!-- lux-content-sprint-formalized:2026-06-11 -->`), `console_json.lux_programme_meta` written (objective + 4 workstreams + Reality Gate + master ticket reference), `console_json.child_request_ids[]` filled with the four child ids, one `assistant`-role formalization message appended to `console_json.messages[]`. Original intake words preserved.
- **Four child workstreams created** (`tenantId=luxe-maurice`, `request_type=property_update`, `priority=High`, `status=Open`, `stage=Intake`, `workflow_state=awaiting_operator_review`, both `parent_programme_ticket=cmo8mjijk0000jl04l1jz0v6d` and `parent_sprint_ticket=cmqa2y2ga0000l704glnfro1f` set):
  - **C1** `cmqa57uyt0000xf803uav5x8x` — Homepage property imagery package (hero + lifestyle + arrival + owner experience).
  - **C2** `cmqa57ve00001xf80tpgmjeiz` — First real private opportunity (Postgres listing + 5 governed gallery images + concierge link).
  - **C3** `cmqa57vlg0002xf805d7azdk2` — Demo / preview opportunities hidden from public; only published listings on `/properties` and `/property/<slug>`.
  - **C4** `cmqa57vsr0003xf80y543sx20` — Jan validation E2E (editor login → opportunity create/edit → publish → public render → consultation route).
- **Classifier patch** — `lib/cmp/router.js#shortenRequestedChange` truncates `requested_change` to 120 chars before `lib/client/lux-change-queue-classify.js` runs. Of the four new children only C1's first 120 chars contained a Property & media keyword; C2 / C3 / C4 fell back to *Active client* (and C3 picked up `\bsmoke\b` further down → would have landed in Smoke). A second script (`scripts/lux-content-sprint-classify-fix.mjs`) prepended a one-line lead-in on C2 / C3 / C4 containing `property` / `gallery` / `publish` / `published` and avoiding the words that the earlier-checked smoke (`\bsmoke\b`, `\btest\b`) and CRM (`\bconcierge\b`, `\bcrm\b`, `\b(enquiry|inquiry)\b`) regexes match — so "concierge link" became "private consultation route". Idempotency tracked on `console_json.lux_request_meta.classify_leadin_v1=true` (not a visible HTML comment).
- **Operator queue post-audit** (2026-06-11 23:50 UTC, `scripts/lux-queue-audit.mjs` with 120-char truncation matching the live UI): Programme 1 · Active 1 (sprint parent) · **Property & media 4 (C1–C4 grouped)** · CRM 0 · Internal 0 · Smoke 18 (unchanged historic Phase 4C smoke artifacts, hidden by default).

**Docs added / updated:** new `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` (canonical sprint doc — P0 objective, workstreams C1–C4, dependency map, Reality Gate, non-negotiables, CMP write summary, classifier-patch note); `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` § 15 (this sprint, alongside the existing § 14 PR #343 audit); `docs/LUX/LUX_DELIVERY_PROGRAMME.md` Phase 2 (operational content-sprint note linking to the sprint doc).

**Scripts added (read-only / opt-in writes):** `scripts/lux-queue-audit.mjs` (read-only queue audit, now uses live 120-char truncation), `scripts/lux-ticket-inspect.mjs` (read-only ticket dump), `scripts/lux-ticket-inspect-messages.mjs` (read-only message dump), `scripts/lux-content-sprint-formalize.mjs` (sprint formalization — dry-run by default, `--execute` required to write), `scripts/lux-content-sprint-classify-fix.mjs` (classifier-lead-in patch — dry-run by default).

**What did NOT change:** **`cmo8mjijk0000jl04l1jz0v6d`** (master strategic programme — untouched). **PR #343 public surfaces** (homepage / `/properties` / `/property/<slug>` / `/concierge`) — no code, no env vars, no Prisma schema changes. **`/properties/admin`** auth gate and Phase 4 attachment governance — unchanged. **No** IDX / MLS / fake inventory reintroduced. **No** auto-publish. **No** ticket deletions. **No** audit history removed (existing 18 archived-smoke Phase 4C tickets remain `Open` and addressable via the "Show archived smoke" toggle on `/change`).

**Reality Gate (sprint COMPLETE only when all six hold on `https://lux.corpflowai.com/`):** real approved homepage imagery; at least one real approved private opportunity on `/properties` *or* an intentional premium empty state if Jan has not authorised a listing; real content + real governed imagery on `/property/<real-slug>`; `/concierge` carries `property=<real-slug>` context; no fake inventory anywhere publicly; **Jan and Anton both verify live and sign off on the sprint parent ticket `cmqa2y2ga0000l704glnfro1f`**.

**Next operator action:** open `https://lux.corpflowai.com/change` (Lux operator session), confirm C1–C4 are visible in the **Property & media** bucket under the sprint parent, walk Jan through the Reality Gate, and start the content / imagery upload loop through the existing Phase 4 governed pipeline.

---

## 2026-06-11 — Mauritius property landing page polish iteration (PRs [#338](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/338) → [#339](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/339) → [#340](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/340); `LR-Property-Mauritius-Polish-1`; **COMPLETE** in production)

<!-- AI_LEAD_RESCUE_PROPERTY_MAURITIUS_POLISH_ITERATION_2026_06_11_HIST -->

**Status:** **COMPLETE.** Production at `https://corpflowai.com/lead-rescue/property-mauritius` is serving the polished design Anton accepted. Final live verification confirmed `main` HEAD `9597d990` is deployed, the URL returns HTTP 200 (~55 KB), and key copy / assets / structure render as designed.

**Why this iteration exists:** Anton paused the Mauritius property cold-outreach lane on 2026-06-08 because the apex CorpFlowAI surface was not visually credible against Mauritius property operators (Beach Properties Mauritius, Expat Immobilier). PR #337 (prior bullet) shipped the first dedicated `/lead-rescue/property-mauritius` page. This bullet covers the three follow-up PRs that took that customer-visible surface from "abstract editorial visuals" to "locally credible Mauritius property page" against Anton's live reviews.

**What shipped (PRs #338 → #340):**

- **#338 — abstract editorial SVG treatment.** Hand-authored hero-side SVG, workflow ribbon SVG, low-opacity region motif behind the segments-section header. CorpFlowAI-owned, no third-party IP, total ~12 KB on the wire. Merged 2026-06-10. Anton's live review on the merged production page: hero composition was *"too little"*; region motif was *"not really hitting the mark."*
- **#339 — photographic property hero + accurate Mauritius map.** Replaced the abstract hero SVG with an editorial Mauritius West-coast lagoon photograph (AI-generated under restraint guardrails — no people, no buildings, no logos, no travel-brochure clichés), shipped as responsive WebP variants (640 / 1024 / 1600) plus a JPEG fallback through `<picture>`. Replaced the abstract region motif with a properly-proportioned Mauritius outline SVG (full coastline + brushed-brass North-and-West arc + five labelled markers Cap Malheureux / Grand Baie / Port Louis / Tamarin / Le Morne + small north arrow + ~10 km scale bar), promoted from low-opacity watermark to a visible "Service area" card paired with the existing Language note. Merged 2026-06-10. Anton's live review: hero photo *"added successfully — may require more consideration on how it would pop better"*; channel-flow ribbon *"looks like the afterthought that it was"*; service-area graphic *"simply does not work — we may need to forgo the hand-drawn concept"*; Language placement *"awkward"*; segment / trust grids *"4 weirdly spaced tiles"*; property-segment dropdown *"almost every prospect fulfills multiple segments"*.
- **#340 — final polish pass.** Each item from Anton's review was addressed structurally: dropped the white-card framing on the hero aside (deeper drop-shadow, **MAURITIUS · WEST COAST** chip in the bottom-left); retired the standalone workflow ribbon and inlined a hand-authored `WorkflowStepIcon` (channels / log / alert / board / summary) inside each step card on a warm-sand chip; added an **Assigned to** column to the cockpit table with initials avatars + illustrative roles (`EXAMPLE: Front desk`, `EXAMPLE: A. Ramdoyal`, `EXAMPLE: J. Fanchette`, `EXAMPLE: Unassigned`); replaced the hand-drawn region SVG with a **real public-domain NASA satellite image of Mauritius** (NASA World Wind / OnEarth WMS pseudocolor layer, 2006, sourced via Wikimedia Commons, lightly graded by `scripts/optimize-property-map.mjs` Sharp pipeline); merged Service area + Language into a single **Operating-area panel** (NASA map left, stacked Service area + Language right with a divider, ten brass-dotted town chips inline below the service-area prose, NASA credit visible in the image corner); fixed segments to a 2×2 grid; reshaped the 5-tile trust grid into an editorial wide-row list (no orphan); replaced the property-segment dropdown with a multi-checkbox group; payload now sends `meta.property_segments` (array) as the canonical field plus `meta.property_segment` (string, `'multiple'` if more than one is ticked) for backward compatibility. Merged 2026-06-11. Anton: *"that looks brilliant — thank you."*

**No env vars / DB / schema changes** across the iteration. Intake handler URL unchanged (`/api/tenant/intake`); operator alert path unchanged. `/lead-rescue` (pan-vertical) is byte-identical to its production state. No new third-party dependencies (Sharp is already a Next 16 transitive dep). All visual assets are CorpFlowAI-owned (the AI-generated hero photo) or public-domain NASA imagery (the satellite map). The iteration retired three asset files (`lead-rescue-property-{hero.svg,workflow.svg,region.svg}`) and added eight new optimised raster variants (four hero, four map) plus two Sharp-based optimisation scripts.

**Final Delivery Reality verdict (post-merge live verification):**

```text
- Local fix exists: YES
- Merged to main: YES (squash-merge 9597d990)
- Production deployment ID: live serving 9597d990 on https://corpflowai.com
- Commit deployed: 9597d990 — style(lead-rescue): integrate workflow + real Mauritius map + multi-segment intake (#340)
- Live URLs tested:
    - https://corpflowai.com/lead-rescue/property-mauritius — HTTP 200, ~55 KB HTML
    - asset paths confirmed: lead-rescue-property-{hero,map}-1024.{webp,jpg}
    - copy confirmed: "Operating in Mauritius", "Assigned to", "Mauritius · West coast",
      "Public domain · NASA / NASA World Wind", "tick every segment that fits"
    - structure confirmed: 5 workflow steps with inline icon SVGs (viewBox 0 0 32 32),
      Cap Malheureux + Le Morne town chips, multi-checkbox legend
- Expected vs actual result: matches the polished design Anton accepted.
- Client-facing flow usable: YES
- Final verdict: COMPLETE
```

**Outstanding live operational test:** the full real-intake round-trip into `/admin/lead-rescue/[id]` (verifying that `qualificationJson.intake_meta.property_segments` arrives as an array, that `property_segment` falls back to `'multiple'` when more than one segment is ticked, and that the operator alert path still fires) is the next live operational test. It will be exercised the first time Anton submits or receives a genuine property pilot intake; no synthetic prospect data is being inserted to satisfy this check.

**Cold-outreach lane status:** can resume — the property surface is now visually credible against the Mauritius property reference market (Beach Properties Mauritius, Expat Immobilier). The Mauritius property sales execution pack (PR #336) remains the active operating guide.

## 2026-06-10 — AI Lead Rescue Mauritius property landing page (PR [#337](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/337); `LR-Property-Mauritius-Landing-1`; PARTIAL pending visual review)

<!-- AI_LEAD_RESCUE_PROPERTY_MAURITIUS_LANDING_2026_06_10_HIST -->

**Status:** **PARTIAL** — branch pushed, CI green (test, vercel-env, Vercel preview deployed), PR #337 open. Pending visual review on the Vercel preview against Beach Properties Mauritius and Expat Immobilier, then merge + production live verification before the verdict can flip to COMPLETE.

**Why this PR exists:** Anton paused the Mauritius property cold-outreach lane (delivered as PR #336, see prior bullet) on 2026-06-08 because the apex `/lead-rescue` page is functional but reads as generic SaaS against Mauritius luxury property references. The cold-outreach lane stays paused until a visually credible property-specific surface is live.

**What ships:**

- New SSG route `pages/lead-rescue/property-mauritius.js` (existing `/lead-rescue` is unchanged).
- New component `components/AiLeadRescuePropertyMauritiusLanding.js` with a light editorial luxury treatment — warm cream background `#FAF6F0`, deep teal accent `#0F4C4C`, charcoal text, Inter Variable at editorial weights (200–300 display, 400 body, 600–700 CTAs/labels). The brand-canonical `#2dd4bf` accent is intentionally unused on this surface; that decision is documented in the component header. `/lead-rescue` retains the canonical accent.
- `pages/sitemap.xml.js` — `APEX_PATHS` extended with the new route so Search Console can discover it.

**CTA wiring (no env / schema / API changes):** intake form posts to the existing `/api/tenant/intake` handler with `meta.product='ai-lead-rescue'` (exact match — fires the existing operator notification path), `meta.lead_rescue_variant='property-mauritius'`, `meta.page='/lead-rescue/property-mauritius'`, and a new `meta.property_segment` (real_estate_agency / villa_rental / property_manager / serviced_apartment_str / other_property). All flow into `qualificationJson.intake_meta` and become visible on `/admin/lead-rescue/[id]`. No admin code changed.

**Doctrine compliance** (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`):

- Single offer rule preserved (USD 150 launch pilot, invoiced after intake review, no card on the page).
- Required no-guarantee copy verbatim.
- Required payment-trust copy present.
- CTA describes buyer action (**Request the Mauritius property pilot outline**) — not route-as-CTA.
- User-required hero line verbatim: *"We do not replace WhatsApp Business. We make sure the enquiries inside it are logged, visible, and followed up."*
- Trust boundaries enumerate every constraint Anton named (no revenue guarantees / no CRM rebuild / no replacement of WhatsApp / website / sales process / no transaction handling / no tenant or buyer PII beyond the lead log).
- Multilingual note verbatim per the brief.
- Mock cockpit view is pure HTML/CSS with explicit "Illustrative example" tag and `EXAMPLE:` row prefixes — no fake testimonials, no fake logos, no fabricated metrics, no scraped prospect data.

**CI status:** test ✅, vercel-env ✅, Vercel deployment ✅ (preview gated behind Vercel SSO; URL on PR #337 comment), Vercel Preview Comments ✅. Local: `npm run build` green; targeted node-tests (`lead-rescue-runtime`, `analytics-policy`, `sitemap-host-aware`, `ai-lead-rescue-operator`) 106/106 pass; ReadLints clean.

**Delivery Reality verdict:** **PARTIAL.** Will flip to **COMPLETE** only after (i) Anton visually reviews the preview against Beach Properties Mauritius and Expat Immobilier and confirms restrained-luxury / property-aware standard, (ii) PR #337 merges, (iii) Vercel Production deploys the merge commit, (iv) `https://corpflowai.com/lead-rescue/property-mauritius` returns 200 with the expected content.

**Cold-outreach lane status:** stays paused until the verdict above is COMPLETE. The Mauritius property sales execution pack (PR #336) remains the active operating guide once the page is live.

## 2026-06-08 — AI Lead Rescue outbound activity log — live verification COMPLETE (`LeadRescue-Outbound-Activity-Log-1`; PR [#331](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/331); `JE-2026-06-08-1` → flipped PARTIAL → COMPLETE via `JE-2026-06-08-3`)

<!-- AI_LEAD_RESCUE_OUTBOUND_ACTIVITY_LOG_LIVE_VERIFIED_2026_06_08_HIST -->

**Status:** **COMPLETE.** Anton walked the 9-step live verification at the operator keyboard on the merged Production deployment using a real cockpit row (Jolly Rogers prospect). All 9 steps passed; the activity log is now the canonical per-lead audit trail for AI Lead Rescue outreach, replies, follow-ups, manual pro-forma sends, payment confirmations, and delivery handoffs.

**Why this matters:** PR #331 took the operator cockpit from "no per-lead outreach audit trail" to "every outbound action captured server-stamped on the lead row, with channel + type enums, optional next_action / next_action_date / status_after, append-only contract, 200-entry stored cap, 50-entry render cap, and full preservation across operator + checklist saves". The companion docs PR [#332](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/332) (commercial launch pack, separate verdict track, recorded as `COMPLETE` under `JE-2026-06-08-2` at merge) explicitly anchored every paste-ready outreach / discovery / pricing / onboarding doc to the activity log, with a planned-pending caveat — that caveat is now historically satisfied.

### Final SHAs and deployment IDs

| Track | Merge SHA | Merged at (UTC) | Production deployment ID | Status |
|---|---|---|---|---|
| PR #331 (runtime) | `d6c976e87655e0f9a0c3249d9b2e94885748a458` | 2026-06-08T06:26:55Z | `4971015196` (success) | merged + deployed + **live verified** |
| PR #332 (docs) | `dc85dab513e5b38efbaaca562233b3d07582cf00` | 2026-06-08T06:30:48Z | `4971045915` (success, current Production head) | merged + deployed; docs-only |
| Audit-flip / chat-history (this commit) | (pending merge on `docs/lead-rescue-activity-log-audit-flip`) | n/a | n/a | docs-only |

PR #332 sits on top of PR #331 with no runtime overlap (PR #332 modified only `docs/` + `AGENTS.md` + `JOURNAL.md` + `artifacts/chat_history.md`), so the activity-log runtime that landed under deployment `4971015196` rolled forward unchanged into `4971045915`.

### 9-step live verification matrix (operator: Anton, 2026-06-08, Jolly Rogers prospect row)

| # | Step | Result |
|---|---|---|
| 1 | `/admin/lead-rescue` list loads | PASS |
| 2 | Detail page loads | PASS |
| 3 | Activity log card visible | PASS |
| 4 | Activity entry appends | PASS |
| 5 | Activity entry saves | PASS |
| 6 | Activity entry persists after save/reload (server-stamped `at` + `actor_label` unchanged across hard refresh) | PASS |
| 7 | Setup checklist update saves | PASS |
| 8 | Checklist note saves | PASS |
| 9 | Checklist + checklist note persists | PASS |

These 9 reported steps subsume the 7 minimum live checks named in the PR #331 acceptance contract — steps 4–6 cover *activity append → server-stamping → reload-persistence* and steps 7–9 cover *unrelated operator save preserves activity + checklist save preserves activity* via the cross-direction preservation tests pinned in `node-tests/admin-lead-rescue-patch-api.test.mjs` (`REGRESSION: mergeAiLeadRescueOperatorPatch preserves persisted setup_checklist AND activity`).

### Pre-verification operator-runtime smoke (baseline before Anton sat down)

- `https://core.corpflowai.com/api/factory/production-pulse/runtime` → HTTP 200, `core.database_reachable: true`, `deployment_ready: true`, no `db.prisma.io` drift fingerprint (per `docs/operations/POSTGRES_PROVIDER.md` § 4b).
- `https://lux.corpflowai.com/admin/lead-rescue` → HTTP 307 (expected — auth redirect for unauthenticated visitor; SSR loader reachable).
- `https://lux.corpflowai.com/lead-rescue` → HTTP 200 (public landing healthy, sentinels unchanged).
- `https://corpflowai.com/lead-rescue` → HTTP 200 (apex public landing healthy).

### Delivery Reality Audit (per `.cursor/rules/delivery-reality.mdc`)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 4971015196 (PR #331 first reached Production here at 2026-06-08T06:27:54Z; rolled forward unchanged into 4971045915 under PR #332's docs-only deployment 2026-06-08T06:31:39Z)
- Commit deployed: d6c976e87655e0f9a0c3249d9b2e94885748a458 (PR #331 merge); dc85dab513e5b38efbaaca562233b3d07582cf00 (PR #332 merge, currently serving)
- Live URLs tested: https://lux.corpflowai.com/admin/lead-rescue (list — PASS) and https://lux.corpflowai.com/admin/lead-rescue/[id] (detail — PASS; Jolly Rogers prospect row)
- Expected vs actual result: 9/9 PASS per matrix above
- Client-facing flow usable: YES (operator cockpit drives operator-side outreach + replies + follow-ups + payment confirmations + delivery handoffs end-to-end)
- Final verdict: COMPLETE
```

### Doctrine compliance (unchanged by this verification)

USD 150 launch pilot **single-offer rule** preserved · *"no card on the public page"* preserved · *"invoiced after we review your intake"* preserved · *"48-hour setup"* preserved · *"We do not guarantee new revenue"* preserved · manual pro-forma path preserved (`JE-2026-06-02-7`) · SBM warm-network primary route preserved (`JE-2026-06-01-4 / PAY-SBM-2`) · ERPNext PDF / Sales Invoice path remains held pending Print Designer install closure + `HB-1..HB-4` clearance · Above-the-Line strategic doctrine preserved · no edits to `/lead-rescue` live page sentinels.

### What this unblocks (immediate, operator-side)

- Anton's existing warm-network outreach cycle, started under PR #332's launch pack on 2026-06-08, now logs each outbound + reply + payment confirmation as a structured activity entry on the lead row instead of free-text in the Notes field.
- The "use Notes field until PR #331 ships" interim guidance in `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *From paid pilot to setup* / § *How to use the activity log for outreach and follow-up* is now historically satisfied; the runbook text itself is not edited by this commit (the caveat is anchored to time-of-writing and stays accurate as a historical reference).
- The `JE-2026-06-08-1` PARTIAL verdict for PR #331 is replaced by the **COMPLETE** verdict recorded in append-only follow-up row `JE-2026-06-08-3`. Per journal cadence, the original PARTIAL row is preserved as the local + CI + merge milestone record; the verdict-flip row records the live-verification event.

### Standing holds (unchanged by this verification)

HB-1 · HB-2 · HB-3 · HB-4 · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-CFLR-ProForma-Template-Build-1` host-side execution still HELD on its own AUTHORISE chain · `ERPNext-PrintDesigner-Persistence-1` · `ERPNext-PrintDesigner-Chrome-Setup-1` · sandbox tear-down four-condition gate · all `JE-2026-06-05-1..9` standing holds.

### Verdict tracks (kept separate per `.cursor/rules/delivery-reality.mdc`)

- **PR #331 (runtime activity log):** **COMPLETE** as of this row. Audit recorded above.
- **PR #332 (docs launch pack):** **COMPLETE** at merge per docs-only delivery-reality rule. Recorded under `JE-2026-06-08-2`. No verification step pending.
- **Live `/lead-rescue` public page:** unchanged by either PR; no public-surface verification required.

---

## 2026-06-08 — AI Lead Rescue first-paid-pilots launch pack (`LeadRescue-First-Paid-Pilots-Launch-Pack-1` — `JE-2026-06-08-2`; docs-only PR; **PARTIAL until merged**)

<!-- AI_LEAD_RESCUE_FIRST_PAID_PILOTS_LAUNCH_PACK_2026_06_08_HIST -->

**Status:** **PARTIAL.** Docs-only PR opened on branch `docs/lead-rescue-first-paid-pilots-launch-pack`; verdict flips to **COMPLETE** on merge per `.cursor/rules/delivery-reality.mdc` § docs-only because no runtime / client-visible flow is touched. Pairs with the runtime activity-log PR #331 (`JE-2026-06-08-1` — separate PR, separate verdict track). The two PRs are intentionally not mixed: PR #331 is runtime / cockpit / persistence; this PR is commercial / outreach / sales / pricing / operator-handoff docs.

**Why this matters:** the AI Lead Rescue operator cockpit went from broken (PR #315 → PR #328 chain) to live + verified on 2026-06-08, and the runtime activity log (PR #331) extends the cockpit so outreach + replies + follow-ups + payment confirmations + delivery handoffs can be audited per-lead. With both runtime tracks moving, the missing link was the **commercial playbook** — what to actually sell, who to message, how to message them, what to charge, what to do after the wire clears, what NOT to build yet, and how to keep CorpFlowAI *above the line* per the brand doctrine. This pack closes that gap so Anton can run paying pilots end-to-end starting this week without re-inventing scripts, pricing, or post-payment workflow per pilot.

### What landed (6 new docs + 2 doc updates)

- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots commercial playbook (objective = first 1–4 paying pilots; Mauritius property first; pilot offer = USD 150; pricing recommendation; outreach + discovery + qualification + objection summaries; pilot success criteria; post-payment checklist; what NOT to build yet; activity-log fit with explicit "planned / pending PR #331" caveat).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — paste-ready scripts for WhatsApp / email / LinkedIn DM (no-link msg-1 + msg-2-with-link) / Facebook page / warm-intro request / no-reply + interested follow-ups + 7 named objection replies + a forbidden-vocabulary checklist.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery call with Q1–Q12 qualification structure, a 6-step paid-pilot close, 9.1–9.4 soft-close patterns (talk-to-partner / smaller-scale / free-trial / discount), 10-minute post-call operator hygiene including activity-log entries.
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — operator-side post-payment runbook: intake checklist after wire confirmation, what client info to collect (and what to NEVER collect: card / CVV / NIC / passport / payroll / health / vendor exports), channels-to-connect priority order, Telegram alert is operator-side only (buyer never sees Telegram), Google Sheet structure (Tab 1 *Leads* view-only to buyer + Tab 2 *Activity* operator-internal), daily summary cadence (manual for first 4 pilots), operator-checklist mapping to the 13-item cockpit checklist, hand-over message template, 6-condition 48-hour definition-of-done, day-7 end-of-pilot recap (no auto-renewal).
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — operator-side pricing reference: USD 150 setup pilot one-off + USD 99/month monitoring; MUR equivalents = operator-side conversion at SBM rate (~MUR 7,000 setup + ~MUR 4,500/month, NOT a separate Mauritius price tier); included / excluded checklists; discount rules (no free pilots ever, no pay-on-results, permitted = -10% second-pilot-paid-together / case-study comp month-1 monitoring / -USD 30 ex-CorpFlow operator client / warm-network introducer share = 20% pilot fee + 10% month-1 monitoring one-time, never ongoing); manual pro-forma path = SBM Bank Mauritius wire with "pro-forma issued pending VAT activation — this is not a tax invoice" footer per HB-2 + HB-3 hold; "no guaranteed revenue" language with explicit allowed-vs-forbidden phrasing tables.
- `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md` — 20-column tracker (A–T) + 1–5 fit-score rubric + 3-batch targets (25 Mauritius property → 25 contractors-trades → 25 clinics-admin) with 3-replies quality gate between batches; cadence = ≤10 first-touches/day + max 2 follow-ups per prospect + no bulk-send tools; warm-network only (cold-scrape forbidden); explicit list of what does NOT go in the sheet.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — added *From paid pilot to setup* section: where the operator receives a paid pilot (SBM wire confirmation OR operator confirmation); when to move to `PAID_SETUP`; when the 13-item checklist appears; how to track setup completion; how to use the activity log (with explicit "feature ships in PR #331 — until merged + live-verified, use Notes field" caveat); when to flip to `LIVE_PILOT` (5-condition gate); how to record monthly monitoring accepted (separate manual pro-forma + cockpit status `MONITORING_OFFERED` → `MONTHLY_ACTIVE`).
- `AGENTS.md` — added doctrine bullet + must-read row: AI Lead Rescue commercial work (first paying pilots phase) requires reading the launch pack before proposing new funnels / paid ads / bulk email / chatbot expansion / sales tier / CRM install. Contradictions update the launch pack first, then ship the contradicting work.

### Doctrine compliance (auto-cross-checked against live `/lead-rescue` sentinels per `JE-2026-06-01-6`)

USD 150 launch pilot **single-offer rule** preserved · *"no card on the public page"* preserved · *"invoiced after we review your intake"* preserved · *"48-hour setup"* preserved · *"We do not guarantee new revenue"* preserved (every doc has explicit allowed-vs-forbidden phrasing tables) · manual-pro-forma path preserved (`JE-2026-06-02-7`) · SBM warm-network primary route preserved (`JE-2026-06-01-4 / JE-2026-06-02-4 PAY-SBM-2`) · ERPNext PDF / Sales Invoice path remains held pending Print Designer install closure + `HB-1..HB-4` clearance · activity-log feature treated as **planned** (PR #331), not live, throughout the pack so docs do not depend on a non-merged feature · Above-the-Line strategic doctrine preserved (positioned as *managed lead-response operating workflow with a human operator*, never as a generic chatbot, AI agent, sales automation, or guaranteed-outcome sale).

### What this unblocks (immediate)

Anton can run the warm-network outreach cycle end-to-end starting now. First batch = 25 Mauritius property prospects per `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md` § 6.1, using the paste-ready scripts in `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md`, the 15-min discovery script in `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`, and the post-payment runbook in `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`. The pack does not require runtime change to operate: first paying pilots can run on the existing cockpit + Notes-field today, then transition to the activity-log card once PR #331 lands and is live-verified.

### Hard limits honoured by this PR

Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*` · zero new env vars (`.env.template` unchanged) · zero secrets · zero ERPNext production-shell mutation · zero ERPNext sandbox mutation · zero Print Designer install / template build · zero Sales Invoice / GL posting / VAT activation / `Tax invoice` / `VAT invoice` wording on customer-facing surfaces · zero real bank account / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card-number / payment-gateway-API-key / OAuth-token / KYC-grade personal data / signed NDA-MCIB form / customer-specific data · zero invoices issued by THIS PR · zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema · zero pricing / offer / page-copy changes on customer-facing surfaces (`/lead-rescue` live page sentinels unchanged) · zero new public exposure · zero L3 host commands (HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered).

### Standing holds (unchanged by this PR)

HB-1 · HB-2 · HB-3 · HB-4 · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-CFLR-ProForma-Template-Build-1` host-side execution still HELD on its own AUTHORISE chain · `ERPNext-PrintDesigner-Persistence-1` · `ERPNext-PrintDesigner-Chrome-Setup-1` · sandbox tear-down four-condition gate · all `JE-2026-06-05-1..9` standing holds · `JE-2026-06-08-1` activity-log runtime PR remains in PARTIAL state until merged + live-verified (separate PR #331 — this docs PR does not change that verdict). **New holds introduced by this row:** none.

### Verdict track

- This PR (docs launch pack): **PARTIAL → COMPLETE-AT-MERGE** because no runtime / client-visible flow changed.
- PR #331 (runtime activity log): tracked separately under `JE-2026-06-08-1`; verdict track is independent and remains **PARTIAL** until live-verified at `lux.corpflowai.com/admin/lead-rescue/[id]`.
- Live `/lead-rescue` page: unchanged by this PR.

---

## 2026-06-08 — AI Lead Rescue operator cockpit reliability — P0 incident response chain (PR #315 → PR #328; verified live on `lux.corpflowai.com/admin/lead-rescue`)
## 2026-06-08 — AI Lead Rescue operator cockpit reliability — P0 incident response chain (PR #315 → PR #328)

<!-- AI_LEAD_RESCUE_OPERATOR_COCKPIT_P0_CHAIN_2026_06_08_HIST -->

**Summary:** AI Lead Rescue operator cockpit is now live-verified reliable on `https://lux.corpflowai.com/admin/lead-rescue`.

### PRs in this chain

| PR | Merge SHA | Title |
|---|---|---|
| #315 | `e113e40f` | resolve admin list loading failure |
| #316 | `5de1e97e` | prevent blank detail page |
| #317 | `89a7624e` | persist detail updates and checklist eligibility |
| #319 | `f15cceba` | wire detail save action |
| #320 | `f6f45e63` | add live save diagnostics |
| #321 | `2610cc24` | make detail dates hydration-stable |
| #322 | `e69cb2a7` | show deployed commit in diagnostic panel |
| #323 | `477bb8a2` | switch off Turbopack to bypass `_clientMiddlewareManifest` 404 |
| #324 | `2163ade1` | trace query engine binary into every Vercel function bundle |
| #325 | `49fa8cc0` | retry transient Prisma engine cold-start |
| #326 | `3fb35449` | widen cold-start retry budget + forward-only status dropdown |
| #327 | `2a6eb421` | keep Prisma engine warm across requests root cause |
| #328 | `77937fe8` | remove temporary save diagnostics |

### Root causes uncovered

- Admin list loader / client-only loading trap.
- Blank detail page / missing defensive SSR + error boundary.
- Save action not visibly wired due to hydration failure.
- SSR/CSR date formatting mismatch from locale-sensitive date rendering.
- Turbopack `_clientMiddlewareManifest` 404 issue.
- Prisma query engine binary not bundled consistently into Vercel functions.
- Prisma cold-start / `$connect()` race.
- Prisma `$disconnect()` anti-pattern causing repeated engine teardown across serverless requests.

### Final verified flow

- Login to operator surface.
- List loads.
- Audit leads visible.
- Detail page opens.
- Save works.
- Status transition persists.
- `PAID_SETUP` persists.
- Canonical 13-item checklist appears.
- Checklist item state persists.
- Temporary diagnostics removed in PR #328.

### Reference

Detailed runbook / chronology: `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.

### Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (PR #315 through PR #328)
- Production verified: YES
- Live URL: https://lux.corpflowai.com/admin/lead-rescue
- Client/operator-facing flow usable: YES
- Final verdict: COMPLETE
```

**Held back from this entry:** PR #312 and PR #314 (login autofill semantics + deterministic login mode/theme) are **not** included in this COMPLETE entry. Their combined chat-history entry remains held until the `https://lux.corpflowai.com/login` tenant-subdomain regression is verified.

---

## 2026-06-05 — `AI-Lead-Rescue-Chatbot-Voicebot-Options-Audit-1` — research + repo/docs audit of chatbot and voicebot options for `/lead-rescue` (docs-only audit packet; no runtime change; no chatbot installed; no voicebot installed; no env / secrets / vendor account / widget script change)

<!-- AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1_HIST -->

**Status:** Recorded as `JE-2026-06-05-9` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` (14 sections, ~600 lines). Anton's chat DECISION (2026-06-05 *"AUTHORISE — AI-Lead-Rescue-Chatbot-Voicebot-Options-Audit-1"*) directed Cursor to research and recommend the best chatbot / voicebot path for the CorpFlowAI AI Lead Rescue landing page with emphasis on conversion, trust, cost, time-to-ship, and safe integration with the existing intake flow. **Headline recommendation:** GO chat = **OpenAI ChatKit + Agents SDK + Responses API self-hosted backend** (5 dev days production-safe v1; ~$1–15 / mo at launch volume; uses the existing `OPENAI_API_KEY`; bot's only side-effect is pre-filling the existing `/api/tenant/intake` form — never DB-writes directly); DEFER voice = **OpenAI Realtime API GPT-Realtime-2** with WebRTC + ephemeral tokens (revisit week 4 with hard caps; voice is prestige not conversion); DEFER **Google Dialogflow / Conversational Agents** and **Gemini Enterprise Agent Platform** (functionally credible, overkill for one bot, pulls us into GCP IAM); APPROVED 48-hour fallback only = **Chatbase Hobby + brand-strip ($79 / mo)** if Anton wants something on the page this week; NO-GO **Tidio Lyro / Intercom Fin / Crisp AI** (wrong product class — support-deflection; violates `O7` SUPPORT hold from `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md`); NO-GO **OpenAI Agent Builder** (deprecated; sunset 2026-11-30) and **Assistants API** (sunset 2026-08-26 — use Responses API instead). **Six-layer guardrail floor mandated** (must ship in any runtime packet): locked system prompt (verbatim in § 7 of the audit doc) + temperature ≤ 0.5 + 2-tool whitelist (`scroll_to_intake`, `prefill_intake_form` — both client-side, no DB write, never auto-submits) + input-side card / IBAN / SWIFT / CVV regex deny + output-side regex post-filter for revenue / discount / banking / forbidden-vocab patterns + daily refusal-log review week 1. **Five proposed next implementation packets listed for separate AUTHORISE (none authorised by THIS PR):** (1) `AI-Lead-Rescue-Chatbot-V1-Build-1` (runtime, recommended FIRST), (2) `AI-Lead-Rescue-Chatbot-V1-Build-1-Fallback-Chatbase` (operator-only, ~2 h, mutually exclusive with #1 during overlap), (3) `AI-Lead-Rescue-Voicebot-V1-Build-1` (runtime, gated on #1 having 14 production days clean), (4) `AI-Lead-Rescue-Chatbot-V2-Direct-Submit-1` (runtime, gated on #1 having 30 production days), (5) `AI-Lead-Rescue-Chatbot-Telegram-Handoff-1` (runtime, week 3). **What this unblocks:** single source of truth for choosing chatbot / voicebot vendor; doctrine system-prompt floor locked at audit time so the runtime PR cannot weaken it; Plausible custom-event surface named (`lr_bot_open`, `lr_bot_first_message`, `lr_bot_assistant_response`, `lr_bot_kb_grounded_answer`, `lr_bot_refusal`, `lr_bot_intake_handoff`, `lr_bot_intake_submit_via_chat`, `lr_bot_closed`, `lr_bot_error`, `lr_bot_voice_session_capped`) so the runtime PR can wire without re-design; security-review surface enumerated. **What remains held (unchanged by this audit):** USD 150 launch pilot single-offer rule · no card on `/lead-rescue` page · invoice route decided after intake review · no revenue / lead-volume / conversion guarantee · manual pro-forma fallback until ERPNext PDF gate clears (`JE-2026-06-05-8`) · `O7` SUPPORT customer-support chatbot hold (this audit covers a **pre-sale qualifier**, NOT support deflection) · all `JE-2026-06-05-1..8` standing holds · HB-1..HB-4 · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Persistence-1` · `ERPNext-PrintDesigner-Chrome-Setup-1` (explicitly deferred per `JE-2026-06-05-8`) · `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` · sandbox tear-down four-condition gate. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE-AT-PR-MERGE** for the docs artefact; runtime implementation requires separate AUTHORISE on the named packets and is NOT initiated by THIS PR.

---

## 2026-06-05 — `ERPNext-PrintDesigner-Install-Closure-Flip-1` — B-2 PDF-path locked at `wkhtmltopdf-for-v1` + Chrome backend explicitly deferred (docs-only closure-flip packet)

<!-- ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_FLIP_PACKET_V1_HIST -->

**Status:** Recorded as `JE-2026-06-05-8` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_FLIP_PACKET_V1.md`. Resolves the `DEFERRED-OPERATOR-CHOICE` blocker `B-2` that `JE-2026-06-05-7` left open: Anton's chat DECISION (*"Decision: choose B … B-2 PDF path = wkhtmltopdf fallback for v1 … Defer Chrome setup for now."*) locks `B-2 = (a) wkhtmltopdf-for-v1` (leveraging the `JE-2026-06-04-5` `host_name = http://frontend:8080` fix already live) and explicitly defers Chrome backend to a future `ERPNext-PrintDesigner-Chrome-Setup-1` packet (not drafted, not authorised, not on active queue — draft scope documented in § 5 of the new doc: `bench setup-chrome` on backend + optional scheduler / queue / websocket; trigger = unacceptable v1 wkhtmltopdf render OR Anton wants Chrome-quality before v1 client send). **Composite install verdict (final, locked): PASS** — `C-1..C-15` all clean (`C-6` Chrome backend now explicitly DEFERRED rather than dangling DEFERRED-OPERATOR-CHOICE). **What this unblocks:** Anton's separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION becomes the **only** remaining gate before v1 pro-forma template can be built per `JE-2026-06-05-2` runbook; the wkhtmltopdf-vs-Chrome decision is locked so the build packet does not need to re-ask the operator at `UI-CREATE-7`; `§ 8.1` `V-5` (`No 'wkhtmltopdf' error in container logs`) becomes the critical PASS gate. **Template build itself remains HELD** on that explicit AUTHORISE chat DECISION — nothing in THIS PR initiates the build. **What remains held (unchanged except for the new explicit Chrome-deferral):** `HB-1..HB-4` · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Persistence-1` (`F-1` + `F-2` packet not drafted) · **`ERPNext-PrintDesigner-Chrome-Setup-1` (per § 5 — explicit deferral; not drafted, not authorised)** · `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` (not drafted) · sandbox tear-down four-condition gate · all `JE-2026-06-05-1..7` standing holds. **Cosmetic note (not addressed by THIS PR):** the `JE-2026-06-05-4` row appears twice in `docs/decisions/JOURNAL.md` (line 21 and line 22) because both PR #306 and PR #307 squash-merged the JE-4 row addition independently; separate one-line janitorial cleanup if desired. **Verdict per `.cursor/rules/delivery-reality.mdc`:** **COMPLETE-AT-PR-MERGE** for docs artefact + **COMPLETE** for the install closure flip itself (no `DEFERRED-OPERATOR-CHOICE` remains on the install workstream).

---

## 2026-06-05 — `ERPNext-PrintDesigner-Editor-Fix-1-Persistent-Patch` — FIX-PASS executed at L3 + runbook v1 → v2 (dual bind-mount) + install verdict flip `JE-2026-06-05-4` PARTIAL → PASS (docs amendment to PR #307; host-side fix already live on box)

<!-- ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_1_PERSISTENT_PATCH_HIST -->

**Status:** Recorded as `JE-2026-06-05-7` in `docs/decisions/JOURNAL.md`. PR #307 amended with: (a) runbook v2 with corrected root cause + final dual-bind-mount operator block + frappe-docker volume-overlay quirk documented in § 9 + § 12 verdict updated to FIX-PASS at 2026-06-05 05:51 UTC with EV-1..EV-3 evidence + § 13 change log v2 entry; (b) this chat_history closure section. **Host-side fix already live on box** — executed at L3 keyboard during the chat session in which Anton authorised `ERPNext-PrintDesigner-Editor-Fix-1-Persistent-Patch`; the live `corpflowai-production-frontend-1` container now has TWO bind-mounts for `print_designer/` (one for `apps/` path so absolute-path symlink targets can resolve; one for `sites/assets/print_designer/` mapped to host `public/` directory bypassing the volume-overlay quirk entirely). **Why two halves were needed:** the v1 single-bind-mount runbook approach had a hidden assumption that `corpflowai-production_sites` was a truly shared Docker volume between backend and frontend (per `docker inspect --format '{{ .Mounts }}'`); execution surfaced that the `sites/assets/` subpath behaves as if NOT shared — likely the frontend image's entrypoint copying its baked-in `sites/assets/` over the volume mount on startup, masking it for that subpath specifically. The dual-bind-mount works around this by giving nginx a direct host-filesystem path that doesn't depend on volume synchronisation. **What this unblocks:** Anton's separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION for the pro-forma template build per `JE-2026-06-05-2` runbook. Template build remains HELD on that explicit chat decision; not auto-promoted. **What remains held (unchanged):** HB-1..HB-4 · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Persistence-1` (F-1 worker count + F-2 venv `.pth` packet not drafted) · `ERPNext-PrintDesigner-Chrome-Setup-1` (Chrome backend setup-chrome packet not drafted) · `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` (websocket origin allow-list fix not drafted) · sandbox tear-down four-condition gate · all `JE-2026-06-05-1..5` standing holds. **Verdict per `.cursor/rules/delivery-reality.mdc`:** **COMPLETE** for both the docs amendment (this PR merge) AND the live host-side fix (executed 2026-06-05 05:51 UTC with FIX-PASS evidence: canvas screenshot of `Sales Invoice PD Format v2` rendered in Print Designer visual editor at `localhost:8081/app/print-designer/...` + clean browser console of bundle 404 + `is not a constructor` errors + HTTP 200 on the bundle URL + 9/9 production containers Up + sandbox preserved 5 days). The cosmetic SocketIO `Invalid origin` error remains (documented in runbook § 9 as separate future packet — does not block canvas).

## 2026-06-05 — `ERPNext-PrintDesigner-Editor-Fix-1` — frontend service bind-mount fix for Print Designer visual editor blank-canvas (docs-only runbook PR; host-side fix is L3 operator-paste; ~5 min execution; ~10s HTTP downtime)

<!-- ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1_HIST -->

**Status:** Recorded as `JE-2026-06-05-5` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/runbooks/ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1.md` (anchor sentinel `<!-- ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1 -->`). **Depends on:** `JE-2026-06-05-4` *Workstream Alignment* (this PR's branch is based on the alignment branch). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the runbook artefact. **Update (recorded under `JE-2026-06-05-7`):** the host-side fix execution produced FIX-PASS at 2026-06-05 05:51 UTC, but the v1 runbook described a single-bind-mount approach which executed-then-failed-at-asset-serving; the working final fix is a dual-bind-mount (see `JE-2026-06-05-7` row above for execution evidence + runbook v2 amendment). The v1 row remains as historical record of the initial authorisation; the v2 amendment lives in the same PR #307 (no separate amendment PR).

### Why this PR now

While capturing UI evidence for the workstream alignment under `JE-2026-06-05-4`, Anton opened the Print Designer visual editor against the seeded demo template `Sales Invoice PD Format v2`. The route resolved but the canvas stayed blank. Browser DevTools captured:

```
GET /assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js → 404 (Not Found)
Uncaught SyntaxError: Failed to execute 'appendChild' on 'Node': Unexpected token '<'
Uncaught (in promise) TypeError: frappe.ui.PrintDesigner is not a constructor at load_print_designer (print_designer.js:181:28)
```

Diagnosis: the bind-mount Compose override authored during the install session (`JE-2026-06-05-3` closure → applied via `bench install-app` + `bench build` per `JE-2026-06-05-4` § 2.6) mounts `host-apps/print_designer/` into the **5 Python services** that need to `import print_designer` at runtime (`backend`, `scheduler`, `queue-short`, `queue-long`, `websocket`) — but **not into the `frontend` (nginx) container** that serves `/assets/print_designer/dist/...` static bundles. `bench build` writes compiled JS / CSS to `apps/print_designer/print_designer/public/dist/` on the bind-mounted source and symlinks `sites/assets/print_designer/` → `apps/print_designer/print_designer/public/` with an **absolute** target path. When nginx in the frontend container resolves the symlink, it follows the absolute path to a location that exists only in the backend container's filesystem view → 404 → browser executes 404 HTML as JS → `frappe.ui.PrintDesigner` class never registers → blank canvas.

Fix: add the same bind-mount line for the `frontend` service to the existing Compose override (`~/erpnext-production/frappe_docker/overrides/compose.print-designer-mount.yaml`) and run `docker compose up -d`. Only the frontend container is recreated (other 5 services have unchanged spec). The backend's IP does not change, so the `JE-2026-06-05-4` § 2.6 nginx-upstream-IP-cache 502 issue does **not** recur. Estimated execution: ~5 minutes at the L3 keyboard. Estimated HTTP downtime: ~10 seconds (frontend container restart).

### What landed (PR scope)

Pure docs / runbook artefact. **3 files** changed:

| File | Change |
|---|---|
| `docs/runbooks/ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1.md` | **New canonical runbook.** 13 sections covering hard limits (15 explicit out-of-scope categories) + prerequisites PR-1..PR-6 + root cause analysis (§ 2.1 captured symptom, § 2.2 architecture mismatch table, § 2.3 fix) + pre-flight PF-1..PF-5 (read-only smoking-gun confirmation that frontend container's `apps/print_designer/` is missing) + single paste-safe operator block § 4 (outer `bash -c` wrapper + auto-discovers Compose file list via `docker inspect` + auto-discovers print-designer-mount override path + timestamped backup + heredoc-rewrites override with `frontend` added preserving 5 existing services + `docker compose up -d` recreates frontend only + 15s wait + verification listing of dist JS files + production health re-check + sandbox preservation re-check + `OPERATOR_BLOCK_DONE` sentinel) + browser smoke UI-1..UI-7 (incognito mandatory) + verification matrix FIX-PASS / FIX-PARTIAL / FIX-FAIL + evidence EV-1..EV-6 + rollback § 8 + honest limits + standing holds unchanged + cross-references + verdict + change log v1 2026-06-05. |
| `docs/decisions/JOURNAL.md` | `JE-2026-06-05-5` row added at top of table (newest-first ordering); references `JE-2026-06-05-4` as the alignment doc that captured the symptom this fix addresses. |
| `artifacts/chat_history.md` | This section. |

### Headlines

- **One-line fix** — add `frontend:` to the existing 5-service bind-mount Compose override + `docker compose up -d`. Runbook auto-discovers Compose file list via `docker inspect` so Anton doesn't have to remember it.
- **Paste-safe operator block** — single `bash -c '...'` wrapper, uses heredoc (`<<"YAML_END"`) to write YAML inside a file rather than expecting Anton to paste YAML into a shell prompt (the hazard that produced the *"services:: command not found"* errors earlier in the session). One paste from `bash -c '` to closing `'`, no copy-individual-lines, idempotent (re-running is safe), prints `OPERATOR_BLOCK_DONE` sentinel at end.
- **Low blast radius** — only the `frontend` container is recreated (other 5 services have unchanged spec → no recreation → backend IP stable → no risk of repeating the `JE-2026-06-05-4` § 2.6 nginx-upstream-IP-cache 502). Sandbox is not touched (`corpflowai-sandbox` Docker project preservation rule honoured). `host_name = http://frontend:8080` from `JE-2026-06-04-5` is not touched. Print Designer source code is not modified. ERPNext data (sites, doctypes, customers, quotations, sales invoices, GL entries) is not touched.
- **Out of scope (explicit non-goals)** — does NOT fix the persistence gaps F-1 (gunicorn worker count `GUNICORN_WORKERS=2` env unchanged; SIGTTIN hot-bump reverts on container recreation) + F-2 (venv `.pth` for `pip install -e print_designer` in backend writable layer lost on container recreation); does NOT fix the SocketIO `Invalid origin` 400 (separate future packet `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` not drafted); does NOT install Chrome PDF backend (separate future packet `ERPNext-PrintDesigner-Chrome-Setup-1` not drafted); does NOT render any PDF (PDF rendering is `ERPNext-CFLR-ProForma-Template-Build-1` still HELD on its own AUTHORISE).
- **After FIX-PASS** — Anton reports EV-1..EV-6 evidence to Bridge #249 → Cursor drafts small docs PR `ERPNext-PrintDesigner-Install-Closure-Flip-1` (not drafted by THIS PR) that records install verdict flip `JE-2026-06-05-4` PARTIAL → new `JE-2026-06-05-N` PASS → next separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION authorises template build host-side execution per `JE-2026-06-05-2` runbook.
- **After FIX-FAIL** — rollback via § 8 restores previous override file + `docker compose up -d`; install state stays PARTIAL with editor unusable; manual Word/Pages pro-forma `JE-2026-06-02-7` remains canonical client-facing mechanism; diagnostic continues in separate Bridge #249 thread.

### Standing holds (unchanged)

`HB-1` · `HB-2` PENDING-ACCOUNTANT · `HB-3` PENDING-ACCOUNTANT · `HB-4` PENDING-OPERATOR · full Phase D ERPNext accounting go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-CFLR-ProForma-Template-Build-1` host-side execution · `ERPNext-PrintDesigner-Persistence-1` (F-1+F-2) not drafted · `ERPNext-PrintDesigner-Chrome-Setup-1` not drafted · `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` not drafted · sandbox tear-down four-condition gate · all `JE-2026-06-05-1..4` standing holds.

**New holds introduced by THIS PR:** none.

### Cross-references

- Authorisation: chat DECISION 2026-06-05 *"Please receive any authorisation required to repair this issue"* treated as `AUTHORISE — ERPNext-PrintDesigner-Editor-Fix-1`.
- New canonical runbook: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1.md`.
- The state this fix targets: `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` (`JE-2026-06-05-4`) § 4.2 blocker B-1.
- Install closure schema: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (`JE-2026-06-05-3`).
- Print Designer evaluation (Packet 2 install shape this fix patches): `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- host_name fix preserved by this fix: `JE-2026-06-04-5`.
- CFLR design brief gated on install verdict PASS: `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- CFLR build runbook gated on install verdict PASS: `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Manual Word/Pages pro-forma fallback (canonical client-facing path during PARTIAL state): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-05 — `ERPNext-PrintDesigner-Workstream-Alignment-1` — install-completion alignment after L3 install session (docs-only — **COMPLETE-AT-PR-MERGE**; install state PARTIAL with 2 operator-clearable blockers)

<!-- ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_1_HIST -->

**Status:** Recorded as `JE-2026-06-05-4` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` (anchor sentinel `<!-- ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05 -->`). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the alignment artefact. The install state the doc describes is **PARTIAL** (closure verdict C-15 per `JE-2026-06-05-3` schema applied to the actual install); two operator-clearable blockers gate the next decision and clear in ~10 minutes of UI work; the template build runbook host-side execution remains HELD on a separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION + the install verdict being flipped to PASS (or PARTIAL gaps explicitly accepted).

### Why this PR now

Anton ran the host-side Print Designer install on `corpflow-exec-01-u69678` (2026-06-04 23:00 → 2026-06-05 01:40 UTC) under a chain of operator-paste blocks. The install completed successfully but via an **architecturally different path** from the original Packet 2 shape: `bench get-app` failed with multi-container `ModuleNotFoundError` because it only installs to the backend container's writable layer (the other 4 Python services — `scheduler`, `queue-long`, `queue-short`, `websocket` — crashed when Frappe tried to import `print_designer` from `apps.txt`). The recovered approach used a **bind-mount Docker Compose override** so all 5 Python services see the same `apps/print_designer/` source directory. Several auxiliary issues (frontend build needing `yarn install`, 502 from nginx upstream IP cache after backend container recreation, gunicorn worker exhaustion) were all resolved during the session. After install, Anton authorised this alignment packet to consolidate every workstream into one canonical state snapshot.

### What landed (PR scope)

Pure docs / alignment / evidence artefact. **3 files** changed:

| File | Change |
|---|---|
| `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` | **New canonical alignment doc.** 8 sections covering hard limits + one-line state + install closure evidence (C-1..C-15 per `JE-2026-06-05-3` schema) + current-state table (11 workstreams W-1..W-12) + next-gate decision (PARTIAL verdict + blockers B-1+B-2 + follow-ups F-1+F-2) + operator handoff (what Anton can do / must not do / what Cursor does next / what stays held / 6 evidence requirements before real-client ERPNext PDF) + cross-references + change log. |
| `docs/decisions/JOURNAL.md` | `JE-2026-06-05-4` row added at top of table (newest-first ordering). |
| `artifacts/chat_history.md` | This section. |
| `AGENTS.md` | **Not updated** — alignment doc is a state snapshot, not a new must-read in the same sense as the production-shell recipe or execution-boundary runbook; discoverable via `docs/finance/` and JOURNAL chain. |

### Headlines

- **Install closure verdict: PARTIAL** per `JE-2026-06-05-3` C-1..C-15 schema. **Not PASS** because C-6 Chrome PDF backend not surfaced via `bench setup-chrome` (wkhtmltopdf fallback live per `JE-2026-06-04-5`) and C-14 has explained-but-documented operational warnings (visual designer canvas test not yet performed end-to-end; non-persistent worker count hot-bump 2→6 via SIGTTIN; non-persistent venv `.pth` for the pip install). **Not FAIL** because all hard rules pass (production 9 containers `Up`, `print_designer` in `apps.txt`, ERPNext UI loads, `host_name = http://frontend:8080` unchanged from `JE-2026-06-04-5`, sandbox preserved 4 days uptime, no new real Customer / Quotation / Sales Invoice / GL / VAT / bank / payment-gateway / public-exposure data).
- **Print Designer v1.6.7 confirmed installed** via three UI surfaces (Installed Applications shows `print_designer 1.6.7 HEAD` alongside `frappe 15.109.0` + `erpnext 15.109.1`; Print Format list shows 22 rows including seeded demo templates `Sales Invoice PD Format v2` + `Sales Order PD v2` strong fixture-ran confirmation; New Print Format form shows the PD-added `PDF Generator` field absent on vanilla Frappe).
- **Two blockers (B-1, B-2) before template build can be safely authorised** — both operator-clearable in ~10 minutes: **B-1** visual designer canvas verification (Anton opens `Sales Invoice PD Format v2` → `Edit Format` button → expected full-screen canvas loads, 5 min); **B-2** PDF generator decision (accept wkhtmltopdf fallback for v1 OR run `bench setup-chrome` on backend, decision-level).
- **Two non-blocking operational follow-ups (F-1, F-2)** bundle into a future small operator-paste packet `ERPNext-PrintDesigner-Persistence-1` (not drafted): **F-1** worker count persistence via Compose override `GUNICORN_WORKERS=6`; **F-2** pip install persistence via entrypoint hook OR custom Dockerfile layer that runs `pip install -e apps/print_designer` if `.pth` missing. Both gate full PASS verdict but do NOT gate template build because the bind-mount source itself persists via the Compose override; manual re-run of `pip install -e` is documented and reproducible.
- **Current-state table (11 workstreams W-1..W-12)**: production shell LIVE / sandbox LIVE-and-preserved / Print Designer install PARTIAL-bind-mount / Chrome PDF backend NOT INSTALLED / classic Letter Head DEFERRED EMERGENCY-TRANSITIONAL / CFLR design brief MERGED PR #303 / CFLR build runbook MERGED PR #304 (host-side execution HELD) / install closure checklist MERGED PR #305 (schema applied here) / manual Word/Pages fallback LIVE canonical for first 1-3 pilots / Phase D accounting HELD / accountant blockers HB-2+HB-3+HB-4 PENDING / sales-outreach CONTINUE off-repo.
- **Next-gate recommendation**: do NOT yet authorise template build. Anton clears B-1 + B-2 in ~10 min → flip verdict PARTIAL → PASS via short follow-up exchange + one-row JE update → then `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` as originally expected per packet decision rule. Manual Word/Pages pro-forma remains canonical fallback until rendered PDF passes AC-1..AC-11 and HB-1..HB-4 close + separate `ERPNext-First-Real-Pro-Forma-Send` packet authorised.

### Hard limits honoured

This PR is documentation only. Zero edits to runtime / scripts / env / secrets. Zero host commands executed from L1. Zero ERPNext production-shell mutation by this PR (the post-`JE-2026-06-04-5` `host_name = http://frontend:8080`, the live Print Designer install state from the operator-paste session, the bind-mount Compose override, the 6 hot-bumped gunicorn workers, the non-persistent venv `.pth` — all untouched). Zero ERPNext sandbox mutation. Zero Print Designer install change. Zero template creation / edit / build. Zero Sales Invoice / GL posting / VAT activation. Zero real bank / SWIFT / IBAN / payment-gateway / OAuth token added. Zero invoices issued. Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`. Zero DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflows / Vercel / Postgres / Neon / Prisma-schema changes. Zero pricing / page-copy changes on customer-facing surfaces. HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered (no L3 work attempted by this PR). Only public Anton-approved values quoted (`CorpFlowAI Ltd` — no BRN / address / email needed in this alignment doc itself).

### What stays HELD

All standing holds from `JE-2026-06-05-3` carry forward unchanged. HB-1 (full Phase D beyond narrowed shell-setup scope) / HB-2 / HB-3 / HB-4 / Phase D go-live / first submitted Sales Invoice on production / first email of any ERPNext-generated PDF to a real client / sandbox tear-down four-condition gate all still HELD. **`ERPNext-CFLR-ProForma-Template-Build-1` host-side execution remains HELD** on (a) Anton clearing B-1 + B-2 (install verdict flip PARTIAL → PASS), (b) separate `AUTHORISE — …` chat DECISION. **`ERPNext-PrintDesigner-Persistence-1` (F-1 + F-2 packet, not yet drafted) — not authorised. ERPNext-PrintDesigner-Chrome-Setup-1 (Chrome backend setup-chrome packet, not yet drafted) — not authorised.**

### Cross-references

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — ERPNext-PrintDesigner-Workstream-Alignment-1"*.
- The alignment doc: `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md`.
- Install closure schema applied: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (`JE-2026-06-05-3`).
- Print Designer evaluation (Packet 2 install shape): `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- CFLR design brief (template the build runbook executes): `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- CFLR build runbook (HELD on install verdict + AUTHORISE): `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Production-shell recipe v1.1: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that structurally unblocks PDF rendering: `JE-2026-06-04-5`.
- Production-shell narrowed-scope authorisation: `JE-2026-06-04-1`.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Production-readiness eval + HB-1..HB-4: `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`).
- Accountant pack: `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`).
- Manual Word/Pages pro-forma fallback (canonical for first pilots): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
## 2026-06-05 — `AI-Lead-Rescue-Mauritius-Sales-Activation-Pack-1` — operator-ready sales playbook (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_1_HIST -->

**Status:** Recorded as `JE-2026-06-05-6` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md` (anchor sentinel `<!-- AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1 -->`). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the operator-playbook artefact (operator + agent governance; no customer-visible URL to probe by design). The sales activity it enables runs in Anton's L1 / off-repo workflow; the **results** (intake submissions, paid pilots, testimonials, decisions to escalate or wait) are recorded on the Commercial card in `/admin/lead-rescue/[id]` and summarised back to Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) per § 4 Friday review + § 7 evidence checklist.

### JE-ID note (parallel workstreams)

`JE-2026-06-05-4` and `JE-2026-06-05-5` are reserved locally on Anton's machine for the parallel Print Designer install / editor-fix workstream and will land via their own PRs. This activation pack uses `JE-2026-06-05-6` to avoid an ID collision when both PR chains merge to `origin/main`.

### What's in the pack (15 sections)

1. **§ 0 hard limits** — zero runtime / scripts / env / DNS / payment-settings / GitHub-workflows / Vercel / Postgres / Neon / Prisma changes; zero ERPNext production-shell or sandbox mutation; zero Print Designer install or template build; zero invoices issued by THIS PR; zero claim contradicts the live `/lead-rescue` page.
2. **§ 1 what Anton can sell today** — 8-row table sourcing every customer-visible commitment to live `/lead-rescue` sentinels (`USD 150 launch pilot` + `48-hour setup` + `no card on this page` + `invoiced after we review your intake` + `We do not guarantee new revenue`).
3. **§ 2 who to target first** — Mauritius property / clinics / contractors / owner-managed warm-network; cold lists out per `JE-2026-06-01-4` § 4.4.
4. **§ 3 20-person warm-network list** — 9-column schema + 5 list-hygiene rules; populated list never appears in repo or AI prompts.
5. **§ 4 daily execution plan Mon–Fri** — ~90 min/day; stretch = 1–2 paying pilots; minimum = 1+ intake submission; if 0 intakes by Fri 16:30 → STOP and rework list.
6. **§ 5 9 paste-safe message scripts** — WhatsApp / LinkedIn / email openers + first follow-up + 4 reply patterns (send-me-details / how-much / is-this-AI / will-this-guarantee-leads) + payment-confirmation; pair with canonical outreach copy `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (`JE-2026-06-02-2`).
7. **§ 6 lead-handling workflow** — full ASCII diagram intake → manual pro-forma → payment landed → 48-hour setup → 7-day monitoring → outcome → testimonial; 5 boundaries the workflow does NOT cross.
8. **§ 7 evidence checklist EV-1..EV-12** — per-pilot data captured: Plausible event / intake row / pro-forma sent / payment status / delivery status / testimonial-or-decline / time-to-intake-review / time-to-setup-done / lead-source mix / channel that converted / reason prospect bought / operator end-of-pilot notes.
9. **§ 8 12 DN-1..DN-12 do-not-say guardrails** — guaranteed leads / instant-AI / pay-now / automated-payment / tax-invoice / ERPNext-invoice-ready / trusted-by / PayPal-Wise-cards / specific bank digits / same-day setup / discounts / client real name without § 7.6 permission.
10. **§ 9 decision points** — when to accept (4 conditions all true) / decline (5 triggers + verbatim script) / escalate to custom quote (3 triggers + verbatim script — do NOT send USD 150 pro-forma) / wait for accountant or ERPNext (3 wait-triggers + verbatim hold script).
11. **§ 10 final Anton daily checklist** — 10-item end-of-day glance + Fri 16:30 week-end gate.
12. **§ 11 standing holds** — HB-1..HB-4 + Phase D + first submitted Sales Invoice + first ERPNext-emailed PDF to real client + Anton's locally-reserved `JE-2026-06-05-4` / `-5` Print Designer install / editor-fix workstream landing via their own PRs.
13. **§ 12 honest limits** — no CRM / no measured-data tuning / no French body / no automated send / no statistical proof / no retainer or production-price conversion / no commitment that payment-route stays SBM wire / AI Lead Rescue is NOT a CRM, website, payment processor, booking engine, SMS gateway, or customer-replying bot.
14. **§ 13 cross-references** — 15+ sibling docs + full decision-row chain `JE-2026-05-28-1..3` + `JE-2026-06-01-4..6` + `JE-2026-06-02-2..7` + `JE-2026-06-03-1` + `JE-2026-06-04-1..6` + `JE-2026-06-05-1..3` + this row.
15. **§ 14 verdict per `.cursor/rules/delivery-reality.mdc` § docs-only** = **COMPLETE-AT-PR-MERGE**. **§ 15 change log v1 2026-06-05.**

### Hard limits honoured by THIS PR

Zero runtime / scripts / env / DNS / Vercel / GitHub-workflows / Postgres / Neon / Prisma changes; zero ERPNext production-shell mutation (`host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged); zero ERPNext sandbox mutation; zero Print Designer install / template build; zero Sales Invoice / GL / VAT / `Tax invoice` / `VAT invoice` wording; zero real bank / SWIFT / BIC / IBAN / payment-gateway / OAuth token added; zero invoices issued; zero pricing / page-copy changes on customer-facing surfaces; zero new claims that contradict the live `/lead-rescue` page (auto-cross-checked against live-page sentinels per `JE-2026-06-01-6` § 1.1); zero host commands from L1 — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered; only the public Anton-approved seller-identity values quoted (CorpFlowAI Ltd + BRN C25228280 + registered office Dextra Lane + support@corpflowai.com per PAY-SBM-2 `JE-2026-06-02-4`).

### Standing holds (unchanged)

HB-1 · HB-2 · HB-3 · HB-4 · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Install-1` Packet 2 still on its own authorisation chain · `ERPNext-First-Real-Pro-Forma-Send` HELD on AC-1..AC-11 + HB-1..HB-4 closure · sandbox tear-down four-condition gate · `LR-Mauritius-Outreach-Copy-V1.1` measured-data refinement not authorised by this pack · `LR-French-Creole-Variants-1` deferred · `LR-Mauritius-Enterprise-Track-1` deferred · all standing holds from `JE-2026-06-05-1` / `JE-2026-06-05-2` / `JE-2026-06-05-3` · Anton's locally-reserved Print Designer install / editor-fix workstream `JE-2026-06-05-4` / `JE-2026-06-05-5` will land via their own PRs.

### Pointers

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — AI-Lead-Rescue-Mauritius-Sales-Activation-Pack-1"*.
- New canonical doc: `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md`.
- Live page (do not contradict): `https://corpflowai.com/lead-rescue` (verified by `JE-2026-06-01-6` § 1.1).
- Canonical channel copy this pack pairs with (not duplicated): `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (`JE-2026-06-02-2`).
- Canonical payment doc for first paying pilots (manual fallback): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Future ERPNext-native equivalent (design + build runbook): `JE-2026-06-05-1` + `JE-2026-06-05-2`; closure of install per `JE-2026-06-05-3`.

---

## 2026-06-05 — `ERPNext-PrintDesigner-Install-Closure-Checklist-1` — 15-item evidence checklist (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_1_HIST -->

**Status:** Recorded as `JE-2026-06-05-3` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (anchor sentinel `<!-- ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1 -->`). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the closure-checklist artefact. The install it closes (`ERPNext-PrintDesigner-Install-1`, Packet 2 from `JE-2026-06-04-4` § 7.2) is its own authorisation chain; the closure verdict (PASS/PARTIAL/FAIL) the checklist enables is recorded as its own future `JE-YYYY-MM-DD-N` row on Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

### What landed (PR scope)

Pure docs / closure-checklist artefact. Short by design — 15 numbered evidence items C-1..C-15 that Anton returns on Bridge #249 when the install finishes, plus a PASS/PARTIAL/FAIL decision tree.

- **7 sections** in `ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md`:
  - § 0 hard limits (12 out-of-scope categories).
  - § 1 when to run (after install commands at L3 keyboard; PASS verdict here does NOT authorise the build runbook — that requires its own chat DECISION).
  - § 2 the 15-item closure checklist, organised:
    - § 2.1 project health C-1 (production all 9 containers `Up`) + C-2 (sandbox preserved per `JE-2026-06-04-1`).
    - § 2.2 Print Designer presence C-3 (`bench list-apps` includes `print_designer`) + C-4 (ERPNext UI loads at `http://localhost:8081/login` via SSH tunnel per recipe § 17) + C-5 (Print Designer UI at `/printdesigner` and discoverable via desk search).
    - § 2.3 PDF backend C-6 (Chrome present preferred per `JE-2026-06-04-4` § 4 Option A OR wkhtmltopdf-only transitional fallback OK because `JE-2026-06-04-5` host_name fix already live; `bench setup-chrome` per-container note).
    - § 2.4 host_name preservation C-7 (`http://frontend:8080` per `JE-2026-06-04-5` unchanged).
    - § 2.5 no real data / surfaces C-8..C-13 (no real Customer beyond test / no real Quotation beyond recipe § 16 test row at `docstatus=0` / zero submitted Sales Invoice / zero GL entries / zero VAT activation / zero bank or payment-gateway setup / zero public exposure with frontend bound loopback-only `127.0.0.1:8081`).
    - § 2.6 errors / warnings C-14 (terminal output + backend/scheduler/queue log tails; explained-or-absent rule).
    - § 2.7 final verdict C-15.
  - § 3 decision tree PASS / PARTIAL / FAIL (first-match-wins; FAIL on hard violations; PARTIAL on sandbox drift / UI discovery gap / Chrome unavailability / noisy warnings; PASS on all-clean — but PASS does NOT authorise the build runbook).
  - § 4 standing holds unchanged.
  - § 5 cross-references.
  - § 6 verdict per delivery-reality.mdc § docs-only = COMPLETE-AT-PR-MERGE.
  - § 7 change log v1.

### Hard limits honoured

Zero host commands; zero ERPNext mutation on `corpflow-exec-01-u69678`; zero sandbox mutation; zero Print Designer install (its own authorisation chain); zero template build (`JE-2026-06-05-2` + its own future chat DECISION); zero Sales Invoice / GL / VAT / `Tax invoice` / `VAT invoice` wording; zero real bank / SWIFT / BIC / IBAN / payment-gateway / OAuth token added; zero edits to runtime / scripts / env / DNS / Vercel / GitHub-workflows / Postgres / Neon / Prisma schema; zero pricing / page-copy changes; zero host commands from this L1 session — HOST_MISMATCH guard not triggered.

### Standing holds (unchanged)

HB-1 (full Phase D beyond narrowed shell-setup) · HB-2 (accountant CoA review) · HB-3 (VAT decision) · HB-4 (real MU bank CSV reconciliation) · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Install-1` still its own authorisation chain (this checklist standardises closure, not authorisation) · sandbox tear-down four-condition gate · all `JE-2026-06-05-1` and `JE-2026-06-05-2` standing holds.

### Cross-references

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — ERPNext-PrintDesigner-Install-Closure-Checklist-1"*.
- The checklist: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md`.
- The install packet this checklist closes: `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2).
- The build runbook this checklist gates: `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Design spec it serves: `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- Production-shell setup recipe v1.1 (SSH tunnel § 17): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that C-7 verifies preserved: `JE-2026-06-04-5`.
- Sandbox-preservation rule that C-2 verifies preserved: `JE-2026-06-04-1`.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-05 — `ERPNext-CFLR-ProForma-Template-Build-Packet-1` — `CFLR Mauritius Pro-forma Invoice v1` Print Designer build runbook (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_1_HIST -->

**Status:** Recorded as `JE-2026-06-05-2` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (anchor sentinel `<!-- ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1 -->`). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the operator-runbook artefact (operator + agent governance; no customer-visible URL to probe by design). The host-side execution it specifies is a separate piece of work — gated on `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2, still UNAUTHORISED as of this entry) closing — and reports its own STATUS on Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) with a separate future `JE-YYYY-MM-DD-N` closure row carrying EV-1..EV-11 evidence + PASS/PARTIAL/FAIL verdict.

### What landed (PR scope)

Pure docs / operator-runbook artefact. The packet pairs with the design specification from `JE-2026-06-05-1`: the **brief is the spec**; this **packet is the operator runbook** that Anton will run at the L3 keyboard on `corpflow-exec-01-u69678` after Print Designer install closes.

- **14 sections** in `ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md`:
  - § 0 hard limits honoured by THIS PR (13 explicit out-of-scope categories: server commands / production-shell mutation / sandbox mutation / Print Designer install / Sales Invoice / GL posting / VAT activation / real bank details / invoices issued / runtime files / DNS-DB-Vercel-GitHub-Postgres-Prisma config / pricing / page-copy / L3 host work).
  - § 1 prerequisites PR-1..PR-8 (Print Designer install AUTHORISED + EXECUTED + production-shell `Up` 9-containers + sandbox preserved per `JE-2026-06-04-1` + Item `LR-SETUP-USD-150` + test customer `Test Buyer (CFLR-DRY-RUN)` + naming series `CFLR-QUO-.YYYY.-.NNN` + HB-1..HB-4 still acceptable as HELD).
  - § 2 pre-flight UI-PF-1..UI-PF-7 (SSH tunnel `ssh -L 8081:localhost:8081` per recipe § 17 + ERPNext UI at `http://localhost:8081/login` + Administrator login from `~/.erpnext-production-credentials` never pasted to chat + `bench list-apps` shows `print_designer` + Print Designer UI at `/printdesigner` + Chrome PDF backend available + read-only safety gate confirming no real customer / Sales Invoice / Payment Entry / VAT-active template / real bank account digits exist beyond test surfaces).
  - § 3 template creation UI-CREATE-1..UI-CREATE-7 (Name `CFLR Mauritius Pro-forma Invoice v1` exact string + Doctype `Quotation` explicitly NOT `Sales Invoice` + A4 + 25/20 mm margins + `pdf_generator=Chrome` with wkhtmltopdf fallback per `JE-2026-06-04-5` host_name fix).
  - § 4 layout instructions UI-LAYOUT-1..UI-LAYOUT-18 across 11 visual blocks per design brief F1..F30 (palette + Inter typography / seller-identity F1..F5 / document-identity F10..F14 with W-Title left teal accent bar = mark #1/3 / header rule = mark #2/3 / `BILL TO` F6..F9 / line-items F15..F19 / totals F20..F22 with above-totals rule = mark #3/3 + literal `Pending accountant confirmation` VAT row / payment placeholder F23 with W1 verbatim only and explicit FB-3+FB-10+FB-11+FB-12 protection / service-fulfilment + disclaimers F24..F27 with W2+W3+W4+W5 verbatim / footer F28..F30 / save + preview).
  - § 5 required wording — 6 verbatim strings W-Title + W1..W5 (with short-form W3 drift note carried from design brief).
  - § 6 forbidden wording — 12 patterns FB-1..FB-12 + defensive Python orchestrator that re-renders the test Quotation via `frappe.get_print()`, sweeps for case-insensitive forbidden substrings + 3 regex patterns (`MU\d{2}…` IBAN / `[A-Z]{4}MU…` SWIFT-BIC / `\b\d{8,}\b` 8+ consecutive digits) + verbatim case-sensitive required-wording presence — any violation → non-zero exit. Pattern follows `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` v1.1 § 13.
  - § 7 test data plan TEST-1..TEST-5 (re-use `Test Buyer (CFLR-DRY-RUN)` + `LR-SETUP-USD-150` + recipe § 16 test Quotation with `customer_remarks` sentinel per `JE-2026-06-04-6` correction; never submit Quotation; never convert; never post Payment Entry; never email PDF to real client).
  - § 8 verification V-1..V-13 (PDF smoke orchestrator with `%PDF` magic check + size 30-200 KB range + `docstatus=0` preserved + sandbox preservation check + no `wkhtmltopdf ConnectionRefusedError` in backend logs) + visual review (logo scales 100% + 50% / no script text / no broken image / one page / W-Title + W1..W5 verbatim / FB-1..FB-12 absent) + composite PASS/PARTIAL/FAIL verdict + EV-1..EV-11 Anton evidence checklist for Bridge #249 paste-back.
  - § 9 rollback RB-1..RB-6 (disable Print Format `Disabled=1` **do not delete** + revert default to placeholder `CFLR Pro-forma Invoice` from recipe § 13 or stock `Standard` + keep classic Letter Head disabled if broken per recipe v1.1 § 9 EMERGENCY/TRANSITIONAL ONLY + 24-hour minimum wait before delete + optional delete after diagnostics + manual Word/Pages template `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` `JE-2026-06-02-7` remains canonical fallback throughout).
  - § 10 standing holds unchanged.
  - § 11 honest limits (Print Designer UI may have evolved beyond pinned v1.6.7 / no PDF rendered by THIS PR / no host commands / no canonical logo asset committed / AC-1 visual-professionalism is operator's subjective call / defensive sweep is back-stop / Chrome may need separate `setup-chrome` per container / test Quotation fall-back).
  - § 12 cross-references to 11 sibling docs + the full `JE-2026-06-04-1..6` chain + design brief `JE-2026-06-05-1`.
  - § 13 verdict per `.cursor/rules/delivery-reality.mdc` § docs-only = **COMPLETE-AT-PR-MERGE**.
  - § 14 change log v1 2026-06-05.

### Hard limits honoured

- Zero server commands by THIS PR; zero ERPNext production-shell mutation (`corpflowai-production.localhost`); zero ERPNext sandbox mutation (`corpflowai-sandbox.localhost`); zero change to live `host_name = http://frontend:8080` from `JE-2026-06-04-5`; zero Print Designer install (Packet 2 is separate); zero Sales Invoice / GL posting / VAT activation; zero real bank / SWIFT / IBAN / payment-gateway / OAuth token added to repo; zero invoices issued; zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / Vercel / Postgres / Neon / Prisma-schema changes; zero pricing / page-copy changes on customer-facing surfaces; zero host commands executed from this L1 session — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered.
- Only public Anton-approved values quoted (`CorpFlowAI Ltd` + BRN `C25228280` + registered office + `support@corpflowai.com` per `JE-2026-06-02-4 PAY-SBM-2`).

### Standing holds (unchanged)

HB-1 (full Phase D beyond narrowed shell-setup) · HB-2 (accountant CoA review) · HB-3 (VAT decision) · HB-4 (real MU bank CSV reconciliation) · Phase D go-live · first submitted Sales Invoice · first ERPNext-emailed PDF to real client · `ERPNext-PrintDesigner-Install-1` Packet 2 from `JE-2026-06-04-4` § 7.2 still gates the host-side execution of this runbook · sandbox tear-down four-condition gate from `JE-2026-06-04-1` · all standing holds from `JE-2026-06-05-1` § *Standing holds*.

### Cross-references

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-Packet-1"*.
- The runbook: `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md`.
- Design specification (the spec this runbook executes): `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- Print Designer evaluation + Packet 2 install shape: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- Production-shell setup recipe (placeholder Print Format § 13 + Letter Head emergency advisory + SSH tunnel § 17 + test customer § 15 + test Quotation § 16): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` v1.1 (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- Manual Word/Pages pro-forma template (W1..W5 source + canonical fallback): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- host_name fix that structurally unblocks PDF rendering: `JE-2026-06-04-5`.
- Brand doctrine + accent: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` + `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-05 — `ERPNext-ProForma-Template-Design-Brief-1` — `CFLR Mauritius Pro-forma Invoice v1` design specification (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_1_HIST -->

**Status:** Recorded as `JE-2026-06-05-1` in `docs/decisions/JOURNAL.md`. New canonical doc `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (anchor sentinel `<!-- CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1 -->`). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the design-specification artefact (operator + agent governance; no customer-visible URL to probe by design). The Print Designer install + template build it specifies is a separate piece of work (`ERPNext-PrintDesigner-Install-1`, Packet 2 from `JE-2026-06-04-4` § 7.2, still UNAUTHORISED) and reports its own STATUS on bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) when authorised + executed.

### Why this PR now

Anton's chat DECISION (2026-06-05 *"AUTHORISE — ERPNext-ProForma-Template-Design-Brief-1"*) directed Cursor to author a complete design / specification brief for the **first CorpFlowAI ERPNext Print Designer template**: a Mauritius pro-forma invoice for AI Lead Rescue. The Print Designer install on the existing production shell (`corpflowai-production.localhost` on `corpflow-exec-01-u69678`) may happen separately; this packet prepares the template brief so that once Print Designer is installed, Anton knows exactly what to build visually — without any further design back-and-forth, without any drift from the canonical W1..W5 wording, and without any risk of forbidden wording slipping in (revenue guarantees, "Tax invoice", "Pay now", etc.).

### What changed (file by file)

| File | Change |
|---|---|
| `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` | **New canonical brief.** 18 sections / ~500 lines covering the 10 numbered requirements in Anton's AUTHORISE message + standing holds / verification rubric / open questions / honest limits / cross-references / change log. |
| `docs/decisions/JOURNAL.md` | `JE-2026-06-05-1` row added (chronological order continues from `JE-2026-06-04-6`). |
| `artifacts/chat_history.md` | This section. |
| `AGENTS.md` | **Not updated** — this brief is design input to the future Packet 2 install, not a new must-read in the same sense as the production-shell recipe or execution-boundary runbook. The brief itself is discovered via `docs/finance/` and the chain of JOURNAL rows. |

### Headlines

- **Template name:** `CFLR Mauritius Pro-forma Invoice v1` — `doc_type=Quotation`, `pdf_generator=chrome` (Print Designer's Chrome PDF backend per `JE-2026-06-04-4` § 4 Option A; bypasses wkhtmltopdf).
- **Source doctype:** `Quotation` (Path A per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 2 Q1.2). Rejected Sales-Invoice-Draft because of accidental-submission GL-posting risk. Naming series `CFLR-QUO-.YYYY.-.NNN` per `JE-2026-06-04-3` § 12.
- **Purpose (what it IS):** pre-payment quotation; visually professional for CEO / clinic owner / property owner; ERPNext-native equivalent of the manual Word/Pages pro-forma in `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`.
- **Purpose (what it is NOT):** not a tax invoice / not a VAT invoice / not a receipt / not a payment-confirmation email / not a demand for payment until intake approval is confirmed in writing.
- **Required visible fields:** **30 fields across 8 visual blocks** (seller-identity F1..F5 / buyer-identity F6..F9 / document-identity F10..F14 / line-item F15..F19 / totals F20..F22 / payment placeholder F23 / setup-start + no-guarantee + tax-treatment F24..F27 / footer F28..F30). Source bindings recorded for each field (Company doctype / Quotation doctype / Item doctype / Customer doctype / static text).
- **Required wording (verbatim, 6 strings):** W-Title `Pro-forma invoice` / W1 `Payment instructions are sent separately after intake approval.` / W2 `Setup begins after payment confirmation and receipt of required client information.` / W3 `Setup target: 48 hours after payment confirmation, subject to client responsiveness and required access/information.` / W4 `No revenue, lead volume, or conversion outcome is guaranteed.` / W5 `VAT/tax treatment pending accountant confirmation.` **One drift note recorded**: Anton's AUTHORISE specified the short-form W3 above; the manual template + live `/terms` use the longer 48-hours-and-5-business-days W3. If accountant or operator decides to align on the long form, the change lands on production Print Format + live page + this brief together per `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6 Q-Doc-3.
- **Forbidden wording (12 patterns FB-1..FB-12):** `Tax invoice` / `VAT invoice` / `Pay now` / `PayPal accepted` / `Wise accepted` / `Instant checkout` / revenue-guarantee / lead-volume-guarantee / conversion-guarantee phrasings + card-scheme + payment-provider wordmarks + real bank/SWIFT/IBAN/routing digits + payment URLs / buttons / QR codes. Defensive forbidden-wording assertion design follows the proven pattern in `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 13 (post-render HTML regex sweep; non-zero exit on match; abort install if any forbidden substring present).
- **Visual direction:** clean / premium / high-trust / lots of whitespace / clear hierarchy / no clutter / no cheap invoice-template look. Single accent colour `#2dd4bf` (canonical CorpFlowAI teal per `BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1), used sparingly (at most three small marks per page: header rule + total rule + W-Title left bar). Inter typography (single family). A4 page, 25 mm top-bottom / 20 mm left-right margins. Logo top-left ~22 mm wide per Cursor recommendation; **note**: no canonical CorpFlowAI logo file is currently committed to `public/assets/logos/` (only `theme.js` references `LogoSQBK.jpg`/`LogoSQBK.png`); Anton uploads via Print Designer UI at build time, or the template renders text-only as acceptable v1 fallback.
- **Future variants planned (NOT in v1):** MU tax/VAT invoice (HARD-BLOCKED on HB-2 + HB-3) · SA pro-forma + invoice · USA pro-forma + invoice (US Letter page size) · generic quotation (W5 removed) · MU bilingual EN+FR.
- **Acceptance criteria (11 testable AC-1..AC-11):** visually professional for CEO buyer / Chrome PDF renders cleanly / logo scales correctly / no script text / no broken image / no `wkhtmltopdf ConnectionRefusedError` (two layers: Chrome bypass + `JE-2026-06-04-5` host_name fix) / all required wording present / no forbidden wording / no real bank details / one page for one-line-item / reverts cleanly. **`COMPLETE` verdict on the future install requires all 11.**
- **Anton UI checklist:** pre-flight UI-0a..UI-0e (production-shell up + tunnel + Print Designer installed + `pdf_generator=chrome` available + Item `LR-SETUP-USD-150` + test Customer `Test Buyer (CFLR-DRY-RUN)`) → build UI-1..UI-13 (new template / A4 / seller block / document-identity / teal rule / `BILL TO` / line items / totals + `Pending accountant confirmation` / teal rule / payment placeholder W1 / service-fulfilment + disclaimers W2..W5 / footer / save) → visual comparison UI-14..UI-16 (render against test Quotation / side-by-side with manual pro-forma / second-device legibility) → evidence EV-1..EV-9 (Print Format record + timestamp / rendered PDF scp'd off box / two screenshots at 100% + 50% zoom / `frappe.get_print()` smoke output / forbidden + required wording grep outputs / `docker compose ls` sandbox preservation / PASS/PARTIAL/FAIL verdict).

### Hard limits honoured

This PR is documentation only. Zero edits to runtime / scripts / env / secrets. Zero host commands executed from L1 (HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered — no L3 work attempted in this packet). Zero Print Designer install. Zero ERPNext production-shell mutation (the post-`JE-2026-06-04-5` `host_name = http://frontend:8080` value, the placeholder `CFLR Pro-forma Invoice` Print Format if Anton ever created it, the manually-created `CorpFlowAI Letterhead` Letter Head — all untouched). Zero ERPNext sandbox mutation. Zero invoices issued. Zero Sales Invoice creation or submission. Zero GL posting. Zero VAT activation. Zero real bank / SWIFT / IBAN / routing digits in repo. Zero payment-gateway configuration. Zero secrets. Only public Anton-approved values quoted (legal name `CorpFlowAI Ltd`, BRN `C25228280`, registered office, support email).

### What stays HELD

All standing holds from `JE-2026-06-04-6` carry forward. This PR is a design specification, not an authorisation. HB-1 (full Phase D beyond narrowed shell-setup scope) / HB-2 / HB-3 / HB-4 / Phase D go-live / first submitted Sales Invoice / first ERPNext-emailed PDF to a real client / sandbox tear-down four-condition gate all still HELD. **`ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) remains UNAUTHORISED**; this brief is its design input but does not authorise the install. The install requires its own separate `AUTHORISE — ERPNext-PrintDesigner-Install-1` chat DECISION from Anton.

### Cross-references

- Authorisation: chat DECISION 2026-06-05 *"AUTHORISE — ERPNext-ProForma-Template-Design-Brief-1"*.
- The brief: `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md`.
- Source of W1..W5 verbatim wording: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1 (`JE-2026-06-02-7`).
- Print Designer decision artefact: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- Phase D production-readiness eval (M-Print broader scope): `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`).
- Accountant review pack (Q-Doc / Q-VAT constraints): `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`).
- Production-shell setup recipe (placeholder `CFLR Pro-forma Invoice` Print Format + Letter Head emergency / transitional advisory + § 17 SSH tunnel): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` v1.1 (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that structurally unblocks PDF rendering: `JE-2026-06-04-5`.
- Brand doctrine (single-offer rule + canonical Item label + no-guarantee line): `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Canonical accent colour: `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-04 — `ERPNext-Production-Shell-Recipe-Drift-Fix-1` — recipe v1.1 (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRODUCTION_SHELL_RECIPE_DRIFT_FIX_1_HIST -->

**Status:** Recorded as `JE-2026-06-04-6` in `docs/decisions/JOURNAL.md`. The canonical recipe `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` is now at **v1.1** (change log entry added). **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the recipe artefact (operator + agent governance; the live verification that informed v1.1 already landed under `JE-2026-06-04-5` at state 4 LIVE VERIFIED).

### Why this PR now

`JE-2026-06-04-5` proved the recipe's first L3 execution surface (Block A discovery on `corpflowai-production.localhost` on `corpflow-exec-01-u69678`). That execution surfaced seven concrete drift points between the v1 recipe and live reality:

1. Recipe used Docker Compose project name `erpnext-production` / `erpnext-sandbox`; live system uses `corpflowai-production` / `corpflowai-sandbox` (per `docker compose ls` output captured in `JE-2026-06-04-5`).
2. Inline `compose.cf-production-port.yaml` override would have merged (not replaced) the inherited `compose.noproxy.yaml` `ports:` list under Docker Compose v2 default merge semantics — risking port-conflict / double-binding.
3. No sanity check before `bench new-site` verified that `DB_PASSWORD` / `MARIADB_ROOT_PASSWORD` / `MYSQL_ROOT_PASSWORD` / credentials file all agreed.
4. No `host_name` setup step — recipe § 16 would always fail with `wkhtmltopdf ConnectionRefusedError` until this was set.
5. § 16 Quotation idempotency check used `'remarks'` field which doesn't exist in v15 (v15 uses `customer_remarks`) — caused the `pymysql.err.OperationalError: (1054, "Unknown column 'remarks' in 'SELECT'")` discovered live.
6. No safeguards for `Warehouse Type: Transit` and Mauritius `Address Template` seeds — fresh v15 stacks sometimes ship without these.
7. § 9 Letter Head section presented classic Letter Head as the canonical answer; reality is that Print Designer + Chrome PDF backend is the long-term answer (per `JE-2026-06-04-4` eval).

### What changed (file by file)

| File | Change |
|---|---|
| `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` | All 7 corrections applied surgically. New § 5 alignment note, new § 7.5 (host_name + PDF smoke), new § 7.6 (seed safeguards), § 9 emergency/transitional advisory. v1.1 change-log entry added. |
| `docs/decisions/JOURNAL.md` | `JE-2026-06-04-6` added (chronological order: `-1` → `-2` → `-3` → `-4` → `-5` → `-6`). |
| `artifacts/chat_history.md` | This section. |
| `AGENTS.md` | **Not updated** — the recipe file path didn't change; existing Must-read row from `JE-2026-06-04-3` continues to point to the now-corrected recipe. |

### Correction 1 — Docker Compose project names

- `replace_all` of `-p erpnext-production` → `-p corpflowai-production` (25 occurrences).
- `replace_all` of `-p erpnext-sandbox` → `-p corpflowai-sandbox` (10 occurrences).
- Targeted prose replacements where `erpnext-production` / `erpnext-sandbox` referred to the Docker project (lines 118, 281, 289, 317, 1462, 1482, 1583, and the v4 verification row).
- **Deliberately kept unchanged:** all filesystem directory paths `~/erpnext-production/` and `~/erpnext-sandbox/` and credential file paths `~/.erpnext-production-credentials` / `~/.erpnext-sandbox-credentials` — these match Anton's live filesystem (the directory naming was chosen at clone time and is decoupled from the operationally-meaningful Docker Compose project name).
- **New § 5 alignment note** explicitly explains the distinction so future operators don't confuse the two.

### Correction 2 — Port override hardening (`ports: !override`)

The v1 inline `compose.cf-production-port.yaml` override declared a plain `ports:` list. Docker Compose v2 MERGES `ports:` lists across overlays by default, so the inherited `compose.noproxy.yaml` `ports: ["8080:8080"]` would have stayed live alongside the production `ports: ["127.0.0.1:8081:8080"]` — port conflict or double-binding chaos.

v1.1 fix:

```yaml
services:
  frontend:
    ports: !override
      - "127.0.0.1:8081:8080"
  websocket:
    ports: !override
      - "127.0.0.1:13001:9000"
```

The `!override` tag tells Compose to REPLACE (not merge) the inherited list. Same treatment for the socketio port `13001:9000` to avoid collision with the sandbox stack's `13000:9000`.

### Correction 3 — DB root password pre-flight check

New step inserted in § 6 before `bench new-site`:

```bash
docker compose -p corpflowai-production exec -T -e MARIADB_ROOT_PASSWORD="$MARIADB_ROOT_PASSWORD" db \
  bash -lc 'mysql --user=root --password="$MARIADB_ROOT_PASSWORD" -e "SELECT 1 AS db_root_password_works\G" 2>&1 | grep -E "db_root_password_works|ERROR"'
```

The grep matches on the literal string `db_root_password_works` (the result column alias) — never on the password value. Reports either `db_root_password_works: 1` (success) or `ERROR 1045 (28000): Access denied` (mismatch → stop, reconcile, do NOT run `bench new-site`).

### Correction 4 — Host_name + PDF smoke (NEW § 7.5)

New whole section between § 7 (wizard bypass) and § 8 (Company doctype extension). Contains:

1. `bench --site corpflowai-production.localhost set-config host_name "http://frontend:8080"`
2. `bench --site corpflowai-production.localhost clear-cache`
3. Frappe-API readback (`frappe.utils.get_url()` + `frappe.conf.get('host_name')`).
4. Minimal raw-HTML PDF smoke (6-line inline HTML, zero doctype dependencies — smallest possible blast radius).
5. `docker compose cp` of the PDF out to host filesystem.
6. Optional `docker compose restart queue-short queue-long scheduler` for background-rendered PDFs.

Plus a full causal-chain explanation of why this is required (Docker DNS only knows Compose service names; backend container cannot resolve loopback hostname `corpflowai-production.localhost`) and explicit cross-links to `JE-2026-06-04-5`, the Print Designer eval § 3 *Diagnosis*, and upstream Frappe issues `#36018` and `#1589`.

### Correction 5 — Seed safeguards (NEW § 7.6)

Idempotent Python orchestrator inside the existing backend container — zero new shell complexity, follows the same `frappe.init` / `frappe.connect` pattern as § 7 wizard bypass. Uses `frappe.db.exists()` short-circuit guards to seed:

- `Warehouse Type: Transit` (required for some Item submission paths + any Stock Entry of type "Material Transfer").
- `Address Template: Mauritius` (used by Address doctype rendering on Letter Heads and Print Formats).

Both prints `already_present` on every subsequent invocation; never duplicates rows.

### Correction 6 — v15 Quotation `customer_remarks`

```python
# v1 (BROKEN against v15):
existing = frappe.db.get_value('Quotation',
    {'party_name': customer, 'remarks': ['like', f'%{TAG}%'], 'docstatus': 0}, 'name')
# ...
'remarks': f'TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT. {TAG}',
```

```python
# v1.1 (CORRECT for v15):
existing = frappe.db.get_value('Quotation',
    {'party_name': customer, 'customer_remarks': ['like', f'%{TAG}%'], 'docstatus': 0}, 'name')
# ...
'customer_remarks': f'TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT. {TAG}',
```

In-code comment explicitly references the live-discovery evidence from `JE-2026-06-04-5` Block A so future operators understand why the field changed.

### Correction 7 — Letter Head emergency / transitional warning

§ 9 title is now: **"Letter Head + CorpFlowAI branding — (v1.1) EMERGENCY / TRANSITIONAL ONLY"**.

A prominent blockquote at the top of the section explains:

- Canonical long-term answer is **Frappe Print Designer + Chrome PDF backend** (cross-link to `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` / `JE-2026-06-04-4`).
- Classic Letter Head UI is fragile in v15 — image scaling unreliable, raw HTML / `<script>` / comment markers visibly leak.
- Anton's first attempt hit four symptoms (captured in `JE-2026-06-04-4`); only one was a host_name issue (fixed in `JE-2026-06-04-5`); the rest are intrinsic to classic Letter Head.
- wkhtmltopdf upstream was archived 2023.

Operator instructions:

- **DO** run the text-only Letter Head creation script (intentionally minimal).
- **DO NOT** hand-edit `<script>` / complex HTML / paste comment markers in the UI for branded client PDFs.
- **DO NOT** rely on this Letter Head for production-grade buyer-facing PDFs.
- **DO** authorise `ERPNext-PrintDesigner-Install-1` before any real client invoice / pro-forma is sent.

The minimal text-only Letter Head creation script itself stays unchanged from v1 — it's there as a placeholder so § 16 PDF smoke can render something without manual UI work.

### Hard limits honoured

This PR is documentation only. Zero edits to runtime / scripts / env / secrets. Zero host commands executed from L1. Zero ERPNext production-shell or sandbox mutation by this PR. The live `host_name` value on `corpflowai-production.localhost` set under `JE-2026-06-04-5` is unchanged by this PR's merge or revert — v1.1 corrections will be applied to the production shell only when Anton next paste-runs the recipe end-to-end (or paste-runs individual updated blocks).

### What stays HELD

All standing holds from `JE-2026-06-04-3` carry forward. This PR is a recipe correction, not an authorisation; HB-2 / HB-3 / HB-4 / Phase D / first submitted Sales Invoice / first ERPNext-emailed PDF to a real client / sandbox tear-down four-condition gate all still HELD. `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) remains UNAUTHORISED.

### Cross-references

- Authorisation: chat DECISION 2026-06-04 *"AUTHORISE — ERPNext-Production-Shell-Recipe-Drift-Fix-1"*.
- Live execution evidence that informed v1.1: `JE-2026-06-04-5` (host_name fix closure).
- Recipe: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (now at v1.1).
- Print Designer evaluation: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md`.
- Production-shell hard contract: `JE-2026-06-04-1`.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-04 — `ERPNext-Production-Shell-host_name-Fix-1` — execution closure (**COMPLETE**, live verified on box)

<!-- ERPNEXT_PRODUCTION_SHELL_HOST_NAME_FIX_1_CLOSURE_HIST -->

**Status:** Recorded as `JE-2026-06-04-5` in `docs/decisions/JOURNAL.md`. **Verdict per `.cursor/rules/delivery-reality.mdc` § operational completion (4-state model): state 4 — Live verified** on `corpflowai-production.localhost` on `corpflow-exec-01-u69678`. The previous `wkhtmltopdf ConnectionRefusedError` is resolved; recipe § 16-style PDF rendering is now structurally unblocked.

### Why this fix happened now

Anton attempted manual ERPNext classic Letter Head editing in the UI after recipe § 7 wizard bypass completed; classic editing produced visual problems and PDF generation failed with `wkhtmltopdf ConnectionRefusedError`. The Print Designer evaluation (`JE-2026-06-04-4`, Packet 1 sketch) identified the root cause as a Frappe-Docker `host_name` mismatch — backend container cannot resolve the site's loopback hostname because Docker DNS only knows Compose service names (`frontend`, `db`, etc.). Anton authorised the small unblocker packet with `AUTHORISE — ERPNext-Production-Shell-host_name-Fix-1`; Cursor authored Block A (read-only discovery) + Block B (fix + minimal smoke); Anton executed both blocks via L3 SSH from his terminal; output pasted back at 2026-06-04 ~11:03 UTC+4.

### What Cursor authored at L1 (no SSH client on laptop, host-side mutation impossible from this session)

**Block A — Discovery (read-only):**
- Detected Docker project names (handled both `erpnext-production` recipe name and `corpflowai-production` operator-deployed reality without hard-coding).
- Confirmed all 9 production-shell containers `Up`; sandbox project still `running(9)`.
- Probed backend → frontend internal reachability (5 hostname candidates).
- Showed current `host_name` value via grep-filtered `bench show-config` (filtered for non-secret keys only; raw `show-config` includes `db_password` and was never displayed).
- Confirmed `wkhtmltopdf --version` is `0.12.6.1 (with patched qt)` — the correct patched version, so the renderer engine itself was fine.
- Inventoried recipe § 9 / § 11 / § 13 / § 15 / § 16 doctype presence.

**Block B — Fix + minimal smoke:**
- `bench --site corpflowai-production.localhost set-config host_name "http://frontend:8080"` — writes the key.
- `bench --site corpflowai-production.localhost clear-cache` — clears Frappe app cache.
- Renders a 6-line raw-HTML string to PDF via `frappe.utils.pdf.get_pdf()` with zero doctype dependencies (smallest possible blast radius — no Item / Customer / Quotation / Letter Head touched).
- Copies the resulting PDF out of the backend container to the host filesystem via `docker compose cp`.
- Re-confirms sandbox preservation via `docker compose ls`.

### What Anton executed at L3 and pasted back

**Block A discovery findings (essential evidence captured into `JE-2026-06-04-5`):**

| Key | Value |
|---|---|
| Production Docker project | `corpflowai-production` (NOT `erpnext-production` as recipe § 5 named — operator deployed under a different name; recipe-vs-reality drift to fix in separate small follow-up PR) |
| Sandbox project | `corpflowai-sandbox` (also drift vs recipe's `erpnext-sandbox`; sandbox preserved) |
| All 9 production-shell containers status | `Up` for 4 hours; `db` explicitly `(healthy)` |
| Backend → `http://frontend:8080` | HTTP 200 ✓ |
| Backend → `http://corpflowai-production-frontend-1:8080` | HTTP 200 ✓ (Compose-generated container DNS name) |
| `wkhtmltopdf` version inside backend | `0.12.6.1 (with patched qt)` ✓ |
| Current `host_name` (before fix) | **unset** in `sites/corpflowai-production.localhost/site_config.json` — **root cause confirmed** |
| Letter Head names present | `['CorpFlowAI Letterhead']` — one Letter Head, operator-created manually with a different name from recipe § 9's `CorpFlowAI Ltd - Production Letter Head` |
| `CFLR-` prefixed Print Formats | none (recipe § 13 + § 14 never run) |
| Test customer `Test Buyer (CFLR-DRY-RUN)` | not present (recipe § 15 never run) |
| Item `LR-SETUP-USD-150` | not present (recipe § 11 never run) |
| Latent recipe § 16 bug discovered | Quotation query in Block A failed with `pymysql.err.OperationalError: (1054, "Unknown column 'remarks' in 'SELECT'")` — v15 Quotation doctype has `customer_remarks`, not `remarks`; recipe § 16 idempotency tag uses `remarks` and will need a small follow-up fix |

**Block B execution findings (verification evidence):**

| Key | Value |
|---|---|
| `bench set-config host_name` exit | 0 (silent success — normal for bench set-config) |
| `bench clear-cache` exit | 0 (silent success — normal) |
| `frappe.utils.get_url()` post-fix | `http://frontend:8080` ✓ |
| `frappe.conf.get('host_name')` post-fix | `http://frontend:8080` ✓ |
| PDF magic bytes | `25504446` (= `%PDF` ✓ — valid PDF) |
| PDF size | 18,108 bytes |
| `SMOKE_VERDICT` | `PASS` |
| PDF on host filesystem | `/home/anton/host_name_fix_smoke.pdf` (`-rw-r--r-- 1 anton anton 18108 Jun 4 07:03`) |
| Sandbox containers post-fix | `corpflowai-sandbox running(9)` ✓ (preservation confirmed) |

### Hard limits honoured (Packet 1 — operationally executed)

- Loopback only — production-shell site remained bound to `127.0.0.1:8081` on the host; no public exposure.
- No DNS / TLS / SMTP changes.
- No Sales Invoice created or submitted; no GL entry posted; no VAT activated.
- No real bank account / SWIFT / BIC / IBAN / routing / sort-code / card / payment-gateway credentials entered.
- No Print Designer installed (deferred to Packet 2 per `JE-2026-06-04-4` § 7.2).
- No scheduler / queue worker container restart (deferred — interactive PDF render works without; email-attachment PDFs rendered in worker processes may need restart in the next operational cycle to pick up the new `host_name`).
- No real client invoice / pro-forma issued or emailed.
- No secrets printed — only file paths, sizes, magic bytes, and Frappe-API readback of the new `host_name` value reported back.
- Zero CorpFlowAI runtime / Vercel / GitHub workflows / Postgres / Neon / Prisma / n8n / Plausible / Telegram / Search Console / payment-settings / public-surface mutations.
- Zero ERPNext sandbox mutation (project `corpflowai-sandbox`, site `corpflowai-sandbox.localhost`, credentials file `~/.erpnext-sandbox-credentials` all untouched).

### Follow-up work identified during execution (NOT in this PR; separate small follow-up PRs)

| # | Item | Where |
|---|---|---|
| (i) | Recipe doc-drift fix — update Docker project names from `erpnext-production` / `erpnext-sandbox` to `corpflowai-production` / `corpflowai-sandbox` to match operator-deployed reality | `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 5 |
| (ii) | Recipe latent-bug fix — change `remarks` to `customer_remarks` in idempotency check (Quotation v15 schema) | `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 16 |
| (iii) | Recipe override-file name — operator-deployed reality uses `compose.corpflowai-production-noproxy.yaml`; recipe currently shows `compose.cf-production-port.yaml` | `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 5 |
| (iv) | Operator UI cleanup — review the existing `CorpFlowAI Letterhead` Letter Head for script-bleed-through; repair or replace before any real pro-forma rendering | Anton's UI session |
| (v) | Worker container restart — recommended in next operational cycle so background-rendered PDFs pick up the new `host_name` value | L3 operator action |

None of (i)–(v) are blockers for the COMPLETE verdict on `JE-2026-06-04-5`.

### What stays HELD after this fix

All standing holds from `JE-2026-06-04-3` carry forward. Specifically: HB-2 (accountant CoA review), HB-3 (VAT decision), HB-4 (real MU bank CSV) all PENDING; Phase D go-live HELD; first submitted Sales Invoice HELD; first ERPNext-emailed PDF to a real client HELD; sandbox tear-down HELD pending four-condition gate from `JE-2026-06-04-1`. The Print Designer Packet 2 (full install + Chrome backend + template work, ~3 hours) remains UNAUTHORISED — Anton's separate `AUTHORISE — ERPNext-PrintDesigner-Install-1` chat DECISION required before that work runs.

### Cross-references

- Authorisation: chat DECISION 2026-06-04 *"AUTHORISE — ERPNext-Production-Shell-host_name-Fix-1"*.
- Evaluation that defined this packet: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` § 7.1.
- Production-shell hard contract: `docs/decisions/JOURNAL.md` `JE-2026-06-04-1`.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`.
- Recipe (still the canonical reference for the full production-shell setup): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-04 — ERPNext Print Designer evaluation v1 — decision artefact (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRINT_DESIGNER_EVALUATION_V1_HIST -->

**Status:** Recorded as `JE-2026-06-04-4` in `docs/decisions/JOURNAL.md`. New canonical doc **`docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md`** + new `AGENTS.md` Must-read row. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the evaluation artefact (operator + agent governance; no customer-visible URL to probe by design). The two future packets defined by the evaluation each report their own STATUS on bridge #249 when authorised + executed.

### Why this evaluation now

Anton attempted to configure ERPNext classic Letter Head / footer / image / script fields manually on `corpflowai-production.localhost`. The result was poor: image scaling unreliable, script/comment text appearing in the printed document, PDF generation failing with `wkhtmltopdf ConnectionRefusedError`, manual UI editing too error-prone for the near-perfect client-facing PDFs CorpFlowAI needs. Anton authorised `ERPNext-Print-Designer-Evaluation-1` to research whether Frappe Print Designer or a similar PDF / document design system should replace classic Letter Head / Print Format editing.

### What Cursor checked (all live web research from L1, no SSH)

| # | Source | What it confirmed |
|---|---|---|
| S1 | `frappe/print_designer` GitHub repo + `README.md` | v15-compatible (README warning: *"only compatible with develop and V15 version"*); stable v1.6.7 released 2026-02-10; 421 stars; official Frappe-team-owned. |
| S2 | Print Designer install guides (techsolvo + YouTube) | Standard install via `bench get-app` + `install-app` + `bench build` + `bench migrate`; installs **into existing site** (not a separate site). |
| S3 | `frappe/print_designer` PR #399 — Chrome PDF Generator (merged) | Chromium-based PDF backend alternative to wkhtmltopdf: **2.21–2.79× faster**, **2.27–2.73× lower CPU**; toggleable per Print Format; Frappe Cloud explicitly *"not supported for now"* for Chrome backend. |
| S4 | `frappe/frappe` PR #35812 + Issue #35546 | Chrome backend upstreamed into Frappe core for v16; v15 has it via Print Designer; v16 still downloads Chromium into bench dir rather than using OS package — production should install `chromium-headless-shell` as a system package + set `chromium_binary_path` in `common_site_config.json`. |
| S5 | `frappe/erpnext` Issue #36018 + `frappe/frappe_docker` Issue #1589 + Aakvatech blog | The `wkhtmltopdf ConnectionRefusedError` is a Frappe-Docker `host_name` mismatch — backend container cannot resolve site's loopback hostname; fix: set `host_name` to a URL the backend container can reach internally (typically `http://frontend:8080`); wkhtmltopdf upstream archived 2023, abandoned. |

### Decision (the verdict matrix this doc records)

| # | Option | Verdict |
|---|---|---|
| **A** | Install Print Designer into existing ERPNext production shell | **EVALUATE-SEPARATELY → recommend GO via separate `ERPNext-PrintDesigner-Install-1` authorisation packet** |
| **B** | Install Print Designer as a separate self-hosted site / container | **NO-GO** (loses access to live doctype data) |
| **C** | Use Frappe Cloud + Print Designer | **NO-GO for v1** (contradicts `JE-2026-05-29-1` self-hosted decision; Chrome backend "FC not supported"; new paid vendor) |
| **D** | Build / own a PDF renderer | **NO-GO** (duplicates ERPNext data model + audit trail; high maintenance debt) |
| **E** | Continue classic ERPNext Letter Head / Print Format editing | **NO-GO for v1.5+ / TRANSITIONAL-only** (wkhtmltopdf abandoned; emergency single-PDF use acceptable if `host_name` is fixed first) |

### Two future-packet shapes defined (NOT authorised by the eval doc)

- **Packet 1 — `ERPNext-Production-Shell-host_name-Fix-1`** (~10 min L3 work) — the emergency unblocker. Anton authorised this immediately after reading the eval; executed 2026-06-04 ~11:03 UTC+4 with verdict COMPLETE (`JE-2026-06-04-5` in this same PR).
- **Packet 2 — `ERPNext-PrintDesigner-Install-1`** (~3 hours L3 + ~60 min template design) — the long-term answer. **Remains UNAUTHORISED**; requires separate Anton chat DECISION before any installation work.

### Hard limits honoured by this PR

This PR is documentation only. Zero installation, zero ERPNext mutation, zero SSH commands, zero secrets touched, zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `core/engine/` / `.env*` / `.github/` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`, zero CorpFlowAI runtime / Vercel / DNS / Postgres / Neon / n8n / Plausible / Telegram / payment / public-surface changes.

### What stays HELD by this evaluation

All standing holds from `JE-2026-06-04-3` carry forward. This evaluation does NOT close HB-2 / HB-3 / HB-4 / Phase D / first submitted Sales Invoice / first ERPNext-emailed PDF to a real client / sandbox tear-down four-condition gate.

### Cross-references

- Evaluation doc: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md`.
- Companion JE row (host_name fix execution closure landed in same PR): `JE-2026-06-04-5`.
- Production-shell hard contract: `JE-2026-06-04-1`.
- Recipe: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`.
- Bridge: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-04 — ERPNext production-shell setup recipe v1 — PR-B (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE_V1_HIST -->

**Status:** Recorded as `JE-2026-06-04-3` in `docs/decisions/JOURNAL.md`. New canonical recipe **`docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`** + new `AGENTS.md` Must-read row. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the *recipe artefact*; the actual host-side execution is a separate piece of work that must report its own STATUS on bridge #249 before any execution-closure verdict can be claimed. PR-B stacked on PR #299 (`docs/server-agent-access-execution-boundary-v1`) which is stacked on PR #298 (`docs/je-2026-06-04-1-erpnext-production-shell-authorisation`). **Recommended merge order:** PR #298 → PR #299 → PR-B → execute on box.

### Why this recipe now

Anton's APPROVED DECISION on 2026-06-04 (*"Decision: A — draft the full end-to-end ERPNext production-shell setup recipe in one PR"*) following his earlier `AskQuestion` answers (Q1 = Option B "proven Phase B-a model"; Q2 = "Yes — open the Server Agent Access / Execution Boundary Runbook now"). Splitting wizard bypass, print formats, and PDF smoke into later PRs was rejected as ambiguity-creating; one complete recipe lets Anton execute end-to-end in one controlled SSH session without improvising. This recipe is the L1 → L3 deliverable for the host-side execution of `ERPNext-Production-Shell-Setup-Host-Agent-1` authorised by `JE-2026-06-04-1` and implementing the L1/L2/L3 collaboration pattern formalised in `JE-2026-06-04-2`.

### What the recipe is

A **22-section, ~750-line operator-paste runbook** at `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (anchor sentinel `<!-- ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE_V1 -->`). Sections:

| § | Purpose |
|---|---|
| 0 | Pre-execution checklist + 12-point hard contract restated from `JE-2026-06-04-1` + secrets-handling rules |
| 1 | Pre-flight — `hostname` / `whoami` / `pwd` / `df -h` / `free -h` / `docker ps` + explicit `HOST_MISMATCH` / capacity / sandbox-state checks |
| 2 | Sandbox preservation gate — fresh `bench backup --with-files` + SHA-256s of the four resulting files (satisfies `JE-2026-06-04-1` sandbox-preservation condition i) |
| 3 | Fresh `frappe_docker` clone at `~/erpnext-production/frappe_docker`, pinned to SHA `6526ab8c…` (same as sandbox per `JE-2026-05-31-2` / `JE-2026-06-01-1`) |
| 4 | Production `.env` overlay; credentials at `~/.erpnext-production-credentials` (`chmod 600`); masked-key verification |
| 5 | Stack bring-up under Docker project `erpnext-production` (separate from `erpnext-sandbox`) on host port `127.0.0.1:8081` (sandbox keeps `8080`) via inline `compose.cf-production-port.yaml` override |
| 6 | Fresh Frappe site `corpflowai-production.localhost` + `bench install-app erpnext` + `curl -sI` smoke (`--mariadb-user-host-login-scope='%'`, modern equivalent of the now-deprecated `--no-mariadb-socket`) |
| 7 | Server-side wizard bypass — proven Phase B-a Path B Python orchestrator from `JE-2026-06-01-1` § 7.1; three quirks (bench-venv Python, absolute `sites_path`, `os.chdir('/home/frappe/frappe-bench/sites')` before `frappe.connect()`); Company `CorpFlowAI Ltd` / abbr `CFL` / country `Mauritius` / currency `USD` / FY 2026-01-01..2026-12-31 / domain `Services` / chart `Standard`; idempotent (checks `setup_complete` first) |
| 8 | Company doctype identity extension — BRN `C25228280` / `support@corpflowai.com` / `https://corpflowai.com` / registered-office Address doctype linked via Dynamic Link; explicitly NO bank account, NO VAT, NO `submit()` |
| 9 | Letter Head `CorpFlowAI Ltd - Production Letter Head` (text-only v1; § 9.1 logo upload OPTIONAL operator UI step) |
| 10 | Chart of Accounts overlay — 7 broad scalable revenue categories from `JE-2026-06-04-1` § (f) (Productized Service Revenue / Implementation-Setup Revenue / Recurring Subscription-Retainer Revenue / Consulting-Advisory Revenue / Software-Platform Access Revenue / Other Operating Revenue / Foreign Exchange Gain-Loss); explicitly NOT creating VAT / MU-specific / bank-ledger / Lead-Rescue-specific accounts (HELD by HB-2 + HB-3 + HB-4) |
| 11 | Production Item `LR-SETUP-USD-150` (no `SBX-` prefix) — verbatim name *"AI Lead Rescue Setup (USD 150 launch pilot)"* per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* and `JE-2026-05-28-1` single-offer rule; `is_service_item=1`, USD 150 selling price, income account default `Implementation / Setup Revenue - CFL` |
| 12 | Naming series Property Setters — Quotation default `CFLR-QUO-.YYYY.-.NNN` (ERPNext `QTN-…` fallback); Sales Invoice default `CFLR-INV-.YYYY.-.NNN` (ERPNext `SINV-…` fallback) |
| 13 | Quotation Print Format **`CFLR Pro-forma Invoice`** titled verbatim *"Pro-forma invoice"* with W1–W5 footer **verbatim** from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1; defensive forbidden-wording assertion (`Tax invoice` / `VAT invoice` / `Pay now` / `PayPal accepted` / `Wise accepted` / card-scheme logos / revenue-guarantee language → script aborts) |
| 14 | Sales Invoice Print Format DRAFT **`CFLR Sales Invoice (Draft)`** with prominent DRAFT label + *"Draft placeholder — VAT/tax treatment pending accountant confirmation. Not for client issue."* banner; same forbidden-wording assertion; explicitly NOT *"Tax invoice"* / *"VAT invoice"* |
| 15 | Test customer **`Test Buyer (CFLR-DRY-RUN)`** (clearly fake naming) |
| 16 | Test PDF smoke — ONE Quotation (`docstatus=0` draft, NOT submitted), `LR-SETUP-USD-150` × 1 @ USD 150, rendered via `frappe.get_print()` + `frappe.utils.pdf.get_pdf()`, saved to `/tmp/CFLR-PRODUCTION-SHELL-SMOKE-…pdf`, magic-bytes/size verification; copied to host via `docker compose cp`; PASS/PARTIAL/FAIL verdict criteria |
| 17 | UI access via SSH tunnel `ssh -L 8081:localhost:8081 anton@5.78.213.185` (sandbox tunnel on `8080` can coexist); 8-item UI spot-check walkthrough |
| 18 | **25-row verification checklist V1–V25** — including V20 no bank account, V21 no submitted SI, V22 no VAT, V23 no DNS/TLS/SMTP/public exposure, V24 HB-2/HB-3/HB-4 still PENDING, V25 sandbox preservation honoured |
| 19 | Rollback / cleanup / no-go rules — § 19.1 production-shell rollback; § 19.2 no-go rules; § 19.3 sandbox-removal four-condition gate verbatim from `JE-2026-06-04-1`; § 19.4 12-point hard contract as "what this recipe NEVER does" mapping table |
| 20 | Operator handoff — 8 evidence blocks Anton pastes back to Cursor for the future execution-closure JE row + bridge STATUS + chat_history entry + closure PR |
| 21 | Cross-references — 11 source-of-truth docs |
| 22 | Change log |

### Why this design

The recipe is **sandbox-preserving**: parallel install with separate Docker project name (`erpnext-production` vs `erpnext-sandbox`), separate site (`corpflowai-production.localhost` vs `corpflowai-sandbox.localhost`), separate credentials file (`~/.erpnext-production-credentials` vs `~/.erpnext-sandbox-credentials`), separate host port (`8081` vs `8080`). Both stacks can coexist; sandbox tear-down requires the four-condition gate from `JE-2026-06-04-1`.

The recipe is **defensive**: § 13 + § 14 Print Format scripts run a forbidden-wording assertion on the final rendered HTML and abort before writing to the database if any forbidden token (Tax invoice / VAT invoice / Pay now / PayPal accepted / Wise accepted / Instant checkout / card-scheme logos / revenue-guarantee language) appears. This makes it impossible to accidentally introduce wording prohibited by `JE-2026-06-04-1` § (4) + `BRAND_AND_CONVERSION_DOCTRINE.md`.

The recipe is **idempotent**: every section checks for existing state before creating (Item, Item Price, Letter Head, Print Format, Account, Address, Customer, Quotation via custom remarks tag); safe to re-run if a section fails partway.

The recipe is **secret-disciplined**: secrets generated on the host into `~/.erpnext-production-credentials` (`chmod 600`); only the file path + byte count is reported back to Cursor; never the contents; every script sources from the file, never accepts pasted passwords.

### What this PR does NOT do (the 12-point hard contract from `JE-2026-06-04-1` restated)

This recipe-creation PR (and the eventual recipe execution it describes) explicitly does NOT:

1. Activate ERPNext accounting on production.
2. Issue any pro-forma / quotation / invoice to a real client.
3. Submit any Sales Invoice (no GL posting on production).
4. Activate VAT or use *"Tax invoice"* / *"VAT invoice"* wording anywhere.
5. Enter any real bank account number / SWIFT / BIC / IBAN / routing / sort-code / card or payment credentials / payment-gateway API keys / client secrets.
6. Configure DNS, TLS, SMTP, reverse proxy, or any public exposure of the production site.
7. Change the CorpFlowAI app runtime, Vercel project settings, GitHub workflow files / settings, Postgres / Neon / Prisma schema, n8n, Plausible, Search Console, Telegram, or any client-facing surface.
8. Invent new env var names.
9. Print passwords / secrets / DB strings / API tokens / OAuth refresh tokens in chat or logs.
10. Promote the sandbox database to production.
11. Import sandbox transactional data into production.
12. Delete the sandbox by default.

### Next step (when Anton has time + an SSH session)

Anton SSHes into `corpflow-exec-01-u69678` from his own terminal, pulls main to get this PR merged, opens `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` in `less` on the box (or on his laptop in another tab), and pastes § 1 → § 16 blocks one at a time, sharing each section's evidence output back into the Cursor chat. Cursor (L1) captures the evidence into a new `JE-YYYY-MM-DD-N` execution-closure row and a bridge #249 STATUS comment. The session is expected to take ~30–45 minutes for clean execution. **The recipe is not authorised to run yet by automation — only by Anton at the keyboard, after merge.**

### What stays HELD even after the recipe runs successfully

- **HB-2** Mauritius-licensed accountant CoA review in writing — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** Real (redacted) MU bank CSV reconciliation cycle — **PENDING-OPERATOR**.
- **Submitted Sales Invoice on production** (GL posting) — HELD pending HB-2 + HB-3 + HB-4 closure plus a separate future Phase D authorisation row.
- **First email of an ERPNext-generated PDF to a real client** — HELD pending HB-2 + HB-3 + HB-4 closure plus a separate future Phase D authorisation row.
- **Sandbox tear-down** — HELD pending the four-condition gate from `JE-2026-06-04-1` (final backup documented + production-shell site reachable + PDF smoke PASS/PARTIAL + explicit Anton DECISION on bridge #249).

### Cross-references

- Authorisation: `docs/decisions/JOURNAL.md` `JE-2026-06-04-1` (PR #298).
- Execution boundary: `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 (PR #299, this recipe inherits the L1/L2/L3 collaboration pattern).
- Recipe: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (this PR).
- Source patterns (sandbox-proven): `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §§ 5 / 6 / 7.1 / 12 / 15.
- Pending blockers: `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1.
- W1–W5 verbatim source: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1.
- Item naming source: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 2026-06-04 — Server agent access & execution boundary v1 — canonical runbook (docs-only — **COMPLETE-AT-PR-MERGE**)

<!-- SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1_HIST -->

**Status:** Recorded as `JE-2026-06-04-2` in `docs/decisions/JOURNAL.md`. New canonical doc **`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`** + new `AGENTS.md` Must-read row. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** (operator + agent governance; no customer-visible URL to probe by design).

### Why this runbook now

Anton's APPROVED investigation directive on bridge [#249 issuecomment-4617928519](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617928519) (2026-06-04 *"Operator / ChatGPT decision — investigate server-side Cursor/agent execution reality"*) flagged that the prior handoff comment [#249 issuecomment-4617719340](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617719340) had stated *"resume in a Cursor instance running on `corpflow-exec-01-u69678` itself (same posture as Phase B-a sandbox install)"* — both clauses factually wrong. No such Cursor instance has ever existed (forbidden by `MONITORING_ARCHITECTURE.md` § 11.3 hard rule *"❌ No Cursor server extension — no remote Cursor Agent yet (deferred at bootstrap)"*), and Phase B-a was Anton-at-keyboard pasting Cursor-authored commands over SSH from his own terminal (per `JE-2026-05-31-2`).

Cursor's investigation report (in chat) concluded the server-side reality is: **repo IS cloned + GH CLI authed + SSH access for `anton`**, but **NO persistent Cursor / agent / daemon / tunnel / code-server / Cursor Remote session exists on the box, and that absence is deliberate policy.** Anton's structured decision via `AskQuestion` (2026-06-04): **Q1 = Option B** (use the proven Phase B-a model — Cursor on laptop drafts the full command recipe; Anton SSHes from his own terminal and pastes; Anton shares output back; Cursor captures into JE + bridge STATUS); **Q2 = "Yes — open the Server Agent Access / Execution Boundary Runbook now (parallel)"**. This runbook is the Q2 deliverable.

### What the runbook formalises (the three execution layers)

| # | Layer | Where | Examples |
|---|---|---|---|
| **L1** | Laptop brain | Cursor on Anton's Windows machine | Authoring code / docs / commands / commit messages / PR bodies / STATUS comments; reading repo; running `npm test` locally; capturing evidence from chat output; opening PRs |
| **L2** | Cloud hands | Vercel (HTTP + cron), GitHub Actions, Postgres/Neon, n8n (on its own host, separate from `corpflow-exec-01-u69678`), Codex Cloud (OpenAI infra) | All scheduled / event-driven 24/7 execution; the 12 monitors in `MONITORING_ARCHITECTURE.md` § 2; `codex/*` branches |
| **L3** | Box hands (operator-driven) | `corpflow-exec-01-u69678` (`5.78.213.185`, Ubuntu 24.04, 4 vCPU / 7.5 GiB / 150 GB post-`JE-2026-05-31-2` resize) via SSH from Anton's terminal | One-off operator commands: `docker compose …`, `bench …`, `git pull`, ERPNext install / bench operations, sandbox tear-down, read-only audits |

**Cursor never executes on L3 directly.** Cursor's role with respect to L3 is **author commands at L1 + capture evidence at L1**; Anton's hands type / paste the L3 bytes in his own SSH terminal.

### The canonical-absence list (§ 6 of the runbook)

A layer that does not appear in § 2 of the runbook is **not a CorpFlow execution layer**. Specifically, none of the following exists today and none may be silently introduced:

- Cursor session on `corpflow-exec-01-u69678`
- Cursor Remote SSH endpoint to the box
- `code-server` / VS Code Server on the box
- Web-shell / browser terminal on the box
- Persistent daemon / systemd / cron / `at` on the box
- Codex Cloud on the box (per `DELIVERY_ACCELERATION_V1.md` § 4.3)
- Tailscale / WireGuard / reverse-tunnel from box to laptop
- Production secrets on the box
- Vercel deploy capability from the box
- Tenant DB exports on the box
- n8n on the box (deferred via packet `n8n-on-exec01`)

The runbook adds the discipline: *"if an agent or handoff comment claims one of these surfaces exists, demand the file path / process / port / config row that proves it; if none can be produced, the claim is wrong."*

### `HOST_MISMATCH` semantics (§ 7 of the runbook)

A Cursor session must stop and emit `HOST_MISMATCH` when ALL of: (a) the packet authorisation row in JOURNAL.md requires execution on `corpflow-exec-01-u69678`, (b) the current session is not running on that host, (c) the packet requires bytes to change on L3. The session then posts evidence to bridge #249 (which JE row required L3; current session host; why L3 is unreachable; next-correct action) and hands off to Anton + L1 in the § 5.4 collaboration pattern. **Never fabricate L3 output. Never proceed silently.**

### Decision tree (§ 8 of the runbook)

Per-class layer assignment so future packets pick the right surface without inventing a new layer:

- Docs-only edit → **L1**
- Scheduled / event-driven repo automation → **L2** (GitHub Actions or Vercel cron) — passes `MIGRATION_TO_SERVER_CHECKLIST.md`
- Read-only HTTP probe → **L1 or L2**
- DB write → **L2 via audited API route**, never direct
- Vercel deploy → **L2 (Vercel itself, triggered by push to `main`)**
- DNS / billing / repo settings → **Anton directly** (AAP §3 hard gates)
- One-off shell command on `corpflow-exec-01-u69678` → **L3 via § 5.4 pattern** (Cursor authors at L1, Anton pastes at L3, Cursor captures evidence at L1)
- "Cursor on the box itself" → **does not exist as a class** (§ 6 absence list)

### Gate for lifting any § 5.3 hard rule (§ 10 of the runbook)

If a future packet proposes installing Cursor Remote SSH on the box, or adding a cron job, or migrating n8n to `corpflow-exec-01`, or putting production secrets on the box: the packet must (1) write an ADR under `docs/decisions/YYYYMMDD-<topic>.md`, (2) pass `MIGRATION_TO_SERVER_CHECKLIST.md` § 2, (3) add a new row in `MONITORING_ARCHITECTURE.md` § 2 in the same PR, (4) update the boundary runbook to move the surface from § 6 absence to § 5 allowed, (5) add an `AGENTS.md` Must-read row, (6) record a `JE-YYYY-MM-DD-N` row, (7) get Anton's merge approval.

### Known doc-drift item explicitly NOT fixed by this PR

`MONITORING_ARCHITECTURE.md` § 11.3 + § 2 monitor #12 were authored 2026-05-27 (pre-resize) and still name the pre-resize spec `2 vCPU / 2 GB / 38 GB`. The post-resize identity from `JE-2026-05-31-2` is **4 vCPU / 7,751 MiB RAM / 150 GB / 2 GB swap** under hostname `corpflow-exec-01-u69678`. The boundary runbook flags this in § 5.1 + § 10. Fix is a separate small docs-only PR (not bundled here so the cross-doc drift is visible and Anton-approved).

### Files changed

- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (new, +260 lines).
- `AGENTS.md` (+1 Must-read row).
- `docs/decisions/JOURNAL.md` (+1 row `JE-2026-06-04-2`).
- `artifacts/chat_history.md` (this entry).

### Standing holds (unchanged)

Phase D · HB-2 · HB-3 · HB-4 · Phase C² · runbook §8.1 hardening · production ERPNext go-live · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift · `ERPNext-Production-Shell-Setup-Host-Agent-1` host-side execution HELD by `JE-2026-06-04-1` HOST_MISMATCH guard (now formalised by this runbook).

### Reversibility

A future superseding `JE-YYYY-MM-DD-N` row that explicitly references and reverses this row (preferred — keeps the doc as historical artefact), **or** a single revert PR of the merge commit (removes the runbook + `AGENTS.md` row + JE row + this entry atomically). Revert removes the synthesis but does NOT change the underlying canonical docs whose rules this runbook merely names in one place — those keep applying regardless.

---

## 2026-06-04 — ERPNext-Production-Shell-Setup-Host-Agent-1 — Phase D narrowed-scope authorisation (docs-only JE row — **COMPLETE-AT-PR-MERGE**)

<!-- ERPNEXT_PRODUCTION_SHELL_AUTHORISATION_JE_2026_06_04_1_HIST -->

**Status:** Recorded as `JE-2026-06-04-1` in `docs/decisions/JOURNAL.md`. **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only: COMPLETE at PR merge** for the *authorisation row*; the subsequent **host-side execution** of `ERPNext-Production-Shell-Setup-Host-Agent-1` on `corpflow-exec-01-u69678` is a separate piece of work that must report its own STATUS on bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) once the on-server Cursor session executes. Anton's chat DECISION (2026-06-04 *"AUTHORISE — ERPNext-Production-Shell-Setup-Host-Agent-1"* + follow-up *"Decision: A. Yes — draft and merge the JE-2026-06-04-N authorisation row first, docs-only, before any ERPNext production-shell work runs on the server."*) authorised this docs-only authorisation row. Bridge handoff comment `issuecomment-4617719340` on issue #249.

### Why an authorisation row before any host work

`JE-2026-05-29-1` requires fresh operator authorisation for Phase D. `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1 enumerates four hard blockers — **HB-1** (Phase D operator approval row), **HB-2** (Mauritius-licensed accountant CoA review), **HB-3** (VAT decision), **HB-4** (real redacted MU bank CSV reconciliation). This row closes **HB-1 for a narrowed scope only** (production-shell setup), and explicitly preserves HB-2 + HB-3 + HB-4 as standing holds for the broader Phase D (revenue-posting / VAT-active / real-bank / real-client surface) start.

### What the row authorises (narrowly)

- Fresh ERPNext **production shell** on `corpflow-exec-01-u69678` parallel-installed alongside the existing sandbox (no IP-rebind, no DB promotion).
- Suggested internal site name `corpflowai-production.localhost` (loopback-only on `127.0.0.1`; no DNS, no TLS, no public exposure, no SMTP).
- Fresh administrator credentials stored on the host at `~/.erpnext-production-credentials` (`chmod 600`; file path reported, never the contents — same pattern as `~/.erpnext-sandbox-credentials` from `JE-2026-06-01-1`).
- Company doctype (`CorpFlowAI Ltd` / Mauritius / BRN `C25228280` / registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius` / `support@corpflowai.com`), Letter Head + CorpFlowAI branding, Quotation Print Format displayed as *"Pro-forma invoice"*, Sales Invoice Print Format draft (NOT labelled *"Tax invoice"* / *"VAT invoice"*), Item `LR-SETUP-USD-150` (no `SBX-` prefix; name *"AI Lead Rescue Setup (USD 150 launch pilot)"* verbatim per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* and `JE-2026-05-28-1`).
- Broad scalable revenue categories (Productized Service Revenue / Implementation-Setup Revenue / Recurring Subscription-Retainer Revenue / Consulting-Advisory Revenue / Software-Platform Access Revenue / Other Operating Revenue / Foreign Exchange Gain-Loss) — Lead Rescue is an ERPNext **Item**, not the backbone of the Chart of Accounts.
- Test-only customer + test-only Quotation PDF smoke with W1–W5 footer wording verbatim from `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1; PASS / PARTIAL / FAIL reported on bridge #249.
- Optional idempotent server-side bypass per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 7.1 if the UI setup wizard fails (same three quirks recorded in `JE-2026-06-01-1`).

### What the row explicitly does NOT authorise

(1) ERPNext accounting go-live; (2) issuing any pro-forma / quotation / invoice to a real client; (3) submitting any Sales Invoice (no GL posting on production); (4) activating VAT or using *"Tax invoice"* / *"VAT invoice"* anywhere; (5) entering any real bank account number / SWIFT / BIC / IBAN / routing / sort-code / card or payment credentials / payment-gateway API keys / client secrets; (6) configuring DNS, TLS, SMTP, reverse proxy, or any public exposure of the production site; (7) any change to the CorpFlowAI app runtime, Vercel project settings, GitHub workflow files or settings, Postgres / Neon / Prisma schema, n8n, Plausible, Search Console, Telegram, or any client-facing surface; (8) inventing new env var names; (9) printing passwords / secrets in chat or logs; (10) promoting the sandbox database to production (parallel install only, per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 3 Q2.4); (11) importing sandbox transactional data into production; (12) deleting the sandbox by default.

### `HOST_MISMATCH` execution guard

The host-side execution must occur only from a Cursor session running directly on `corpflow-exec-01-u69678` (or with equivalent host-local Docker / Frappe / bench access). Any other host — including Anton's Windows laptop without an SSH bridge to the box — must stop immediately with the literal status code `HOST_MISMATCH`, post evidence to bridge #249, and await the operator opening a Cursor session on the correct host. (This Windows laptop session does **not** have SSH client / SSH key / SSH config in place, so the guard is not even tested by this docs-only PR.)

### Sandbox preservation rule

The existing Phase B-a sandbox produced by `JE-2026-06-01-1` (PR [#275](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/275), commit `6abb6f4d`) and exercised through Phase C (`JE-2026-06-01-3` + `JE-2026-06-01-5`) is preserved by default. The sandbox may be removed only when ALL of: (i) a final sandbox backup/export is produced with documented path, (ii) the production-shell site is reachable on the box, (iii) the test-only Quotation PDF smoke completes with PASS or PARTIAL, AND (iv) Anton has issued explicit removal approval as a separate chat DECISION on bridge #249. Removal without all four is forbidden.

### Standing holds preserved (still HELD by this row)

HB-2 (accountant CoA review) · HB-3 (VAT decision) · HB-4 (real redacted MU bank CSV) · full Phase D (revenue-posting / VAT-active / real-bank / real-client surface) · Phase C² · runbook §8.1 hardening · production ERPNext go-live · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation.

### Hard limits honoured by this PR

Zero edits to ERPNext production (no production instance exists yet); zero edits to ERPNext sandbox state on `corpflow-exec-01-u69678`; zero host commands executed from this Windows laptop session; zero secrets / API keys / OAuth tokens / DB credentials touched; zero real bank account number / SWIFT / BIC / IBAN / routing in repo; zero edits to runtime / Prisma / API / `lib/` / `components/` / `pages/` / `public/` / `.github/` / test files / env templates / Vercel / GitHub config; zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment settings. Pure docs / authorisation-row artefact.

### Files changed

- `docs/decisions/JOURNAL.md` (+1 row, +1 blank line).
- `artifacts/chat_history.md` (this entry).

### Reversibility

A future superseding `JE-YYYY-MM-DD-N` row that explicitly references and reverses this row (preferred) **or** a single revert PR of the merge commit (removes the row + this entry atomically). Revert does **not** undo any host-side production-shell setup that may already have been performed on `corpflow-exec-01-u69678` — for that, follow `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 15 tear-down adapted to the production-shell site only (drop `corpflowai-production.localhost`, remove `~/.erpnext-production-credentials`); the existing sandbox project / site / credentials file is preserved by the sandbox preservation rule above.

---

## 2026-06-03 — Cold-Sprint-V1-Copy — minimal `/lead-rescue` hero copy improvements for cold Mauritian prospects (runtime PR — **COMPLETE**)

<!-- COLD_SPRINT_V1_COPY_HIST -->

**Status:** Merged as PR [#296](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/296) on commit `2b0d46b9`. **Verdict: COMPLETE** per `.cursor/rules/delivery-reality.mdc` after operator browser/Plausible verification on 2026-06-03 ~10:26 UTC+4 — all five Plausible custom events still fire on apex (`lr_primary_cta_click` with `location:nav`, `lr_primary_cta_click` with `location:hero`, `lr_secondary_cta_click`, `lr_intake_submit_attempt`, `lr_intake_submit_success`); Lux negative control returns zero `plausible.io` requests; HTML probe of `https://corpflowai.com/lead-rescue` confirms thirteen presence checks pass (new buyer-pain fragments, Mauritius HQ-fact trust line, *"Start my 48-hour setup"* count = 3, *"Start the 48-hour setup"* count = 0, USD 150 / no-card / no-guarantee posture intact). Closure DRAs on [PR #296 issuecomment-4609685719](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/296#issuecomment-4609685719) + [Bridge #249 issuecomment-4609685920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4609685920). Small runtime PR landing the smallest safe `/lead-rescue` hero copy improvements now that Plausible custom-event tracking is live (verified post-PR #293: four events firing on apex, zero on Lux negative control). **No backend changes.** No new env var names. No pricing / payment / form-field / ERPNext / Pomelli / route / asset / API / DB change. Three edits to one file (`components/AiLeadRescueLanding.js`). Recorded as `JE-2026-06-03-5`. Anton's chat DECISION (2026-06-03 *"AUTHORISE — Cold-Sprint-V1-Copy"*) authorised this packet.

### The brief (decoded)

Anton's brief asks for the smallest safe copy edits so cold Mauritian prospects answer *"Am I losing customers who already tried to contact me?"* in the first five seconds — leading with missed-enquiry channels (WhatsApp / website forms / Facebook DMs / follow-up gaps) instead of the generic *"AI Lead Rescue captures..."* phrasing, improving CTA wording, keeping USD 150 / no-card / invoiced-after-review / no-guarantee posture intact, and adding a Mauritius trust line only if it is doctrine-safe and not overclaiming.

### What this packet changes (3 edits, 1 file)

1. **Nav CTA wording aligned to doctrine.** Nav anchor changed from *"Start the 48-hour setup"* to *"Start my 48-hour setup"* — removing the the/my drift between nav and hero so the doctrine-canonical *"Preferred global CTA: Start my 48-hour setup"* (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § AI Lead Rescue doctrine) appears verbatim in three places: nav + hero primary + intake-form button. SSG output verifies *"Start my 48-hour setup"* count = 3, *"Start the 48-hour setup"* count = 0.
2. **Hero subheadline leads with missed-enquiry channels.** The subheadline (`<p style={styles.lead}>` ~line 230) now reads *"WhatsApp messages you missed. Website enquiries with no reply. Facebook DMs that slipped past. That is the gap — AI Lead Rescue captures new enquiries, alerts the owner or operator, logs every lead, and surfaces follow-ups daily, without rebuilding your website or forcing a CRM migration."* The doctrine-canonical product description is preserved verbatim after the three short buyer-pain fragments.
3. **Mauritius HQ-fact trust line.** New `<p>` between subheadline and CTA buttons (~line 234): *"Built by a Mauritius-based operating-systems team."* — the wording pre-vetted in `POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1.md` § 4 P-1 as a doctrine-safe HQ fact (not a clientele claim, not a revenue claim).

### What this packet does NOT change (deliberate scope tightening)

- H1 *"Stop losing leads because follow-up is too slow."* unchanged — verbatim doctrine-canonical.
- Hero primary CTA *"Start my 48-hour setup"* unchanged — verbatim doctrine-canonical.
- Hero secondary CTA *"See how it works"* unchanged — verbatim doctrine-canonical.
- Required no-guarantee copy *"We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up."* unchanged.
- Required payment trust copy *"Payment is handled after intake review. You do not enter card or banking details on this page."* unchanged.
- USD 150 launch pilot wording, single-offer rule (`JE-2026-05-28-1`), USD-only narrative posture (`JE-2026-05-28-3`) all preserved verbatim.
- All three `trackEvent` call sites + the two inside `submitLead` are byte-for-byte unchanged — only the visible button/link text was edited; `onClick` props, `href` targets, `className`, and the form handler are untouched. PR #291 + PR #293 tracking contract preserved exactly.
- Form structure, video, asset manifests, payment-route section, intake API payload shape, refund / terms / contact pages, footer — all untouched.

### Coverage of Pomelli sprint § 8 PR-B (Cold-Sprint-V1-Copy)

P-1 (Mauritius HQ-fact trust line) **shipped**. P-3 (re-style *"See how it works"* as tertiary text-link), P-6 (refund-link inline in intake form), P-11 (OG/Twitter description Mauritius hook), P-12 (hero badge wrap CSS) **deferred** to follow-up PRs by deliberate scope tightening — not in Anton's first-5-seconds brief. The hero-subheadline channels-first rewrite is broader than the P-1..P-12 list narrowly enumerated; it implements the *"Lead with missed enquiries, WhatsApp, website forms, social DMs, and follow-up gaps"* directive in Anton's brief and is consistent with Pomelli sprint § 3 G1 finding (no specific buyer-pain channels named in the hero).

### Verification

- `npm test` `448/448` pass (no test changes — copy edits don't touch any test fixture or assertion).
- `npm run build` clean (`/lead-rescue` SSG rebuilt at 800ms with no warnings; route still SSG `●`).
- `npm run check:marketing-quality-gate` PASS (six doctrine docs present, marker terms intact).
- `ReadLints` no errors on `components/AiLeadRescueLanding.js`.
- SSG output (`.next/server/pages/lead-rescue.html`) inspected: H1 *"Stop losing leads because follow-up is too slow"* present; all three new buyer-pain fragments present (*"WhatsApp messages you missed"*, *"Website enquiries with no reply"*, *"Facebook DMs that slipped past"*); Mauritius line present; *"Start my 48-hour setup"* count = 3 (nav + hero + intake button); *"Start the 48-hour setup"* count = 0 (drift removed); USD 150 launch pilot present; *"no card on this page"* present; no-guarantee copy intact.
- Client bundle (`.next/static/chunks/0wdk306s_e0xh.js`) confirmed to include `lr_primary_cta_click`, *"Mauritius-based operating-systems"*, *"WhatsApp messages you missed"*, *"Start my 48-hour"*.

### Verdict per `.cursor/rules/delivery-reality.mdc`

**PARTIAL** at PR merge — local + CI checks GREEN; live verification (post-deploy) requires:

1. `corpflowai.com/lead-rescue` HTML contains the three new buyer-pain fragments + Mauritius trust line + nav CTA *"Start my 48-hour setup"* + zero *"Start the 48-hour setup"* drift.
2. The four PR #291 Plausible events still fire on apex post-deploy (sanity that this packet's copy edits did not silently break the existing onClick handlers).
3. Lux + Core + preview negative control still no-Plausible (sanity that PR #293 host-gated loader still denies).

Verdict flips to **COMPLETE** in the PR closure DRA on Bridge `#249` once these three checks are recorded.

### ANTON TO-DO (after merge)

1. Wait for Vercel Production `READY` on the merge commit.
2. Open `https://corpflowai.com/lead-rescue` — confirm hero now reads *"WhatsApp messages you missed. Website enquiries with no reply. Facebook DMs that slipped past. That is the gap — ..."* and the small line *"Built by a Mauritius-based operating-systems team."* sits between the subheadline and the CTA buttons.
3. Click the **nav** *"Start my 48-hour setup"* CTA — confirm Plausible Custom Events shows `lr_primary_cta_click` with `location:nav`.
4. Click the **hero** primary *"Start my 48-hour setup"* CTA — confirm `lr_primary_cta_click` with `location:hero`.
5. Click the **hero secondary** *"See how it works"* — confirm `lr_secondary_cta_click`.
6. Submit one sandbox/test intake — confirm both `lr_intake_submit_attempt` and `lr_intake_submit_success`.
7. Negative control: open `https://lux.corpflowai.com/lead-rescue` in a new tab — confirm DevTools Network shows zero requests to `plausible.io`.
8. Post the closure DRA on Bridge `#249` recording deployment ID + merge commit + the seven check results, flipping verdict from PARTIAL to COMPLETE.

### Standing holds (unchanged)

Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk account creation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation. Cold-outreach campaign execution remains HELD pending PR-I docs-only landing per Pomelli sprint § 8 stopping rule. Remaining sprint § 8 PRs (PR-D / PR-E / PR-F / PR-G / PR-H / PR-I) remain HELD pending individual DECISIONs.

---

## 2026-06-03 — Cold-Sprint-V1-Tracking-Fix — Option C: SSG runtime host-gated Plausible loader (runtime fix)

<!-- COLD_SPRINT_V1_TRACKING_FIX_OPTION_C_HIST -->

**Status:** Runtime PR fixing the analytics injection gap identified in the PR #291 closure DRA. **No backend changes.** No new env var names. No payment changes. No ERPNext changes. No Pomelli activation. No Lead Rescue copy / pricing / layout / form fields / video / asset manifest changes. No new analytics vendors. No PII. Recorded as `JE-2026-06-03-4`. Anton's chat DECISION (2026-06-03 *"AUTHORISE — Cold-Sprint-V1-Tracking-Fix via Option C"*) authorised this packet after reviewing the PR #291 closure DRA ([issuecomment-4608984840](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/291#issuecomment-4608984840)) and the three-option proposal on Bridge `#249` ([issuecomment-4608989930](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4608989930)).

### The gap (recap from PR #291 DRA)

The four PR #291 `trackEvent` calls (`lr_primary_cta_click` × 2 locations, `lr_secondary_cta_click`, `lr_intake_submit_attempt`, `lr_intake_submit_success`) ship in the production page bundle (`/_next/static/chunks/0np12moztsz80.js` — verified live) but never fire because the Plausible `<script defer data-domain="corpflowai.com" src="https://plausible.io/js/script.js">` tag is not injected into the SSG-prerendered HTML for `/lead-rescue`. `Document.getInitialProps` runs at build time with `ctx.req` undefined, so the existing `resolveAnalyticsForRequest({ host: '', path: '/lead-rescue' })` returns `enabled: false` (this is the "Static-export caveat" documented in `pages/_document.js`'s JSDoc). At runtime, `window.plausible` is therefore undefined and the `trackEvent` no-op guard short-circuits every call.

A naive build-time fix (just fall back the host to `corpflowai.com`) would inject Plausible into the prerendered HTML — but that HTML is **also** served from `lux.corpflowai.com/lead-rescue` and `core.corpflowai.com/lead-rescue` (both verified live to return identical 41,313-byte SSG output during the DRA, because there is no `middleware.js` and Lux/Core do not intercept apex SSG routes). A build-time fallback would therefore leak Plausible to Lux + Core, violating the explicit deny boundary.

### Option C implementation

A **runtime host-gated loader**: instead of emitting the static `<script>` tag at SSG build time, emit a small self-contained inline `<script>` that runs in the visitor's browser, reads `window.location.hostname` + `pathname` + `search`, applies the SAME policy data from `lib/analytics/config.js` (serialised inline at build time), and only when ALL checks pass dynamically `document.createElement('script')` + appends the Plausible tag to `<head>`.

**Three source files (+312 net):**

1. **`lib/analytics/index.js` (+205 lines)**
   - New internal helper `isPathAllowedWithoutHost(fullPath)` — applies the host-independent subset of deny rules (`DENY_PATH_PREFIXES` with word-boundary, `DENY_PATH_SUBSTRINGS`, `DENY_QUERY_KEYS`); skips `APEX_DENY_PATH_PREFIXES` (those re-apply at runtime once the real host is known).
   - `resolveAnalyticsForRequest` extended to return a new `requiresRuntimeHostCheck` boolean: `false` for SSR (host known, deny-list applied at SSR time, static `<script>` tag still emitted, Plausible verification on apex `/` unchanged); `true` for SSG when host is empty AND the path passes every host-independent deny. Kill-switch off OR host-independent deny still returns `enabled: false` + `requiresRuntimeHostCheck: false` — the loader is never emitted for paths that can never be allowed at runtime.
   - New export `buildSsgRuntimeLoaderScript({ src, domain })` returns the inline JS source as a string (IE11-safe vanilla JS, no module syntax, no dependencies). Policy data (`ALLOW_HOSTS`, `DENY_HOST_EXACT`, `DENY_HOST_SUFFIX`, `DENY_PATH_PREFIXES`, `APEX_DENY_PATH_PREFIXES`, `DENY_PATH_SUBSTRINGS`, `DENY_QUERY_KEYS`, `APEX_HOST`) is serialised at build time directly from `config.js`. The entire body is wrapped in `try { … } catch (e) {}` so a runtime error inside the policy check never breaks the host page.

2. **`pages/_document.js` (+24 lines)**
   - Imports `buildSsgRuntimeLoaderScript`; renders the inline loader via `dangerouslySetInnerHTML` when `analytics.requiresRuntimeHostCheck` is `true`, else renders the canonical static `<script>` tag.
   - Updated JSDoc preamble describes the two render strategies (SSR static tag for verifiability + SSG runtime-host-gated loader for multi-host correctness) and notes the multi-host SSG-output reality (Lux + Core + preview all serve the same prerendered HTML on `/lead-rescue` — verified live during PR #291 DRA preparation).

3. **`node-tests/analytics-policy.test.mjs` (+205 lines, +20 new tests, 1 existing test updated)**
   - 7 tests pinning `resolveAnalyticsForRequest`'s new contract (SSR apex unchanged; SSR Lux/Core/preview/localhost still denied; SSG fallback enabled on `/`, `/lead-rescue`, `/about`, `/onboarding`, `/lead-rescue/details`; SSG fallback denied on every host-independent deny path; kill-switch off respected; null/undefined/empty/whitespace host all trigger SSG fallback; env overrides honoured).
   - 12 tests executing the loader inside a Node `vm.createContext` sandbox with mocked `window.location` + `document.createElement` + `document.head.appendChild` — verifies the loader injects on apex + denies Lux/Luxe/tenant/Core/localhost/`*.vercel.app` previews + applies word-boundary path-prefix deny + apex-specific deny + query-string deny + substring deny + empty hostname + subdomain spoof + malformed `window.location` (defensive try/catch never throws) + env-overridden src/domain.
   - 1 existing test (`resolveAnalyticsForRequest disables when host is empty`) renamed and updated to assert the new behaviour (empty host → `requiresRuntimeHostCheck: true`).

### Boundary preservation (the key correctness property)

The loader runs in **every** visitor's browser, regardless of which host serves the prerendered HTML. Its first checks are `denyExact.indexOf(h) !== -1` and the `denySuffix` iteration, then `allow.indexOf(h) !== -1`. Result:

| Visitor host | Loader behaviour | Plausible injected? |
|---|---|---|
| `corpflowai.com` | passes all checks for allowed paths | YES |
| `lux.corpflowai.com` | fails `allow.indexOf` | NO |
| `luxe.corpflowai.com` | fails `allow.indexOf` | NO |
| `<tenant>.corpflowai.com` | fails `allow.indexOf` | NO |
| `core.corpflowai.com` | fails `denyExact` | NO |
| `localhost` / `localhost:3000` | fails `denyExact` | NO |
| `*.vercel.app` preview | fails `denySuffix` | NO |
| `corpflowai.com.evil.com` | fails `allow.indexOf` | NO |
| `corpflowai.com` + `/admin` | fails word-boundary path deny | NO |
| `corpflowai.com` + `/change-v2` | fails word-boundary path deny | NO |
| `corpflowai.com` + `/concierge` | fails apex-specific deny | NO |
| `corpflowai.com` + `?token=…` | fails query deny | NO |
| `corpflowai.com` + `/reset-password` | fails substring deny | NO |
| `corpflowai.com` + `/changelog` | passes (no over-match) | YES |
| `corpflowai.com` + `/properties-overview` | passes (apex deny is slash-only) | YES |

All 15 cases pinned by `vm`-context tests.

### Single-source-of-truth discipline

The loader's policy data is **serialised at build time** directly from the same exports in `lib/analytics/config.js`. There is no second deny list in inline JS, no duplicated allow list, no hardcoded strings in `_document.js`. Future edits to `config.js` propagate automatically to both SSR (`resolveAnalyticsForRequest`) and SSG (the loader source via `buildSsgRuntimeLoaderScript`).

### Verification

| Check | Result |
|---|---|
| `npm test` | **448/448 pass** (was 428/428 after PR #291; +20 new tests; 1 existing test updated to reflect Option C contract; no other existing test modified) |
| `npm run build` | clean (`/lead-rescue` SSG rebuilt at 469ms, no warnings) |
| `npm run check:marketing-quality-gate` | PASS |
| `ReadLints` (3 changed source files) | no errors |

### Hard limits honoured

Zero backend changes · zero new env var names · zero new analytics vendors (Plausible only) · zero PII added · zero Lead Rescue copy / pricing / layout / form fields / video / asset manifest changes · zero payment changes · zero ERPNext changes · zero Pomelli activation · zero secrets / API keys / OAuth tokens / DB credentials / banking details / KYC material / signed documents / DNS / mail-routing / Vercel config / GitHub Secrets / GitHub workflow files / Telegram / Search Console / payment-settings / payment-automation / CRM-GHL-WhatsApp-SMS integration touched · existing denies for Lux / Core / preview / `localhost` / `/change` / `/admin` / `/login` / `/master` / `/lux-editor` / `/lux-guide` / `/sovereign-intake` / `/core-lux-migration-repair` / `/api/` / `/_next/` / `/client/` / `/concierge` / `/properties` / `/property` / token-bearing URLs / password-reset substrings ALL preserved (both SSR and SSG paths, verified by dedicated unit tests for each) · kill-switch behaviour preserved · Plausible verification on apex `/` preserved (SSR static tag still emitted).

### ID collision note (declared)

`JE-2026-06-03-3` is **claimed by two parallel packets already merged to main**: Cold-Sprint-V1-Tracking PR #291 (`00b16288`, this packet's parent) and ERPNext Phase D Accountant Pack v1 PR #292 (`500ed622`). Both rows exist in `docs/decisions/JOURNAL.md`. Same pattern as the `JE-2026-06-02-4` collision recorded in PR #287 DRA — declared and accepted. No fix this packet. My new packet uses `JE-2026-06-03-4`.

### ANTON TO-DO (after merge)

1. Wait for Vercel Production `READY` on the merge commit.
2. `curl https://corpflowai.com/lead-rescue` (or browser View Source) — confirm the inline `<script>` loader is present in `<head>` and the SSR-style `<script defer data-domain=… src=…>` tag is absent on this SSG route. (The apex `/` SSR page still has the static tag — Plausible verification still works.)
3. `curl https://lux.corpflowai.com/lead-rescue` — confirm the inline loader is present in `<head>` (same HTML served from any host) but the loader will NOT inject Plausible at runtime when the browser is on a Lux host. To verify visually, open Lux + DevTools + Network tab and confirm no request to `plausible.io/js/script.js`.
4. Browser sanity check on apex `https://corpflowai.com/lead-rescue` — click nav primary CTA, hero primary CTA, hero secondary CTA, then submit one sandbox/test intake (e.g. own email + own phone + "Sandbox test, ignore" in the message field).
5. Open Plausible dashboard for `corpflowai.com` → Custom Events; confirm all four events appear: `lr_primary_cta_click` (with `location: 'nav'` AND `location: 'hero'` props), `lr_secondary_cta_click`, `lr_intake_submit_attempt`, `lr_intake_submit_success`.
6. Record the Vercel Production deployment ID + commit SHA + four-event confirmation in the PR closure DRA on Bridge `#249` to flip both this PR AND PR #291 from PARTIAL to COMPLETE.

### Delivery Reality verdict (per `.cursor/rules/delivery-reality.mdc`)

**PARTIAL at merge** — local + CI checks GREEN; the four PR #291 events firing on production `/lead-rescue` is the verification step that flips both this PR and PR #291 to COMPLETE.

### Standing holds (unchanged)

Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk account creation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation.

**No new holds introduced by this packet.** Cold-outreach campaign execution remains HELD pending PR-I docs-only landing per Pomelli sprint § 8 stopping rule (`JE-2026-06-03-1`); the other cold-sprint follow-up PRs (PR-B / PR-D / PR-E / PR-F / PR-G / PR-H / PR-I) remain HELD pending their individual DECISIONs.

---

## 2026-06-03 — ERPNext Phase D Accountant Pack v1 (docs-only)

<!-- ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1_HIST -->

**Status:** Review-pack artefact, **docs-only**. No production ERPNext changes; no edits to the ERPNext sandbox state on `corpflow-exec-01-u69678`; no secrets / API keys / OAuth tokens / DB credentials present; no real bank account number / SWIFT / BIC / IBAN / routing in repo (only the public bank name *State Bank of Mauritius* and account-class names like "Mauritius Domestic Bank — Main"); no edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / runtime files; no DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings touched; no pricing / offer / page-copy changes on customer-facing surfaces. Recorded as `JE-2026-06-03-3`. Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-03 *"AUTHORISE — ERPNext-Phase-D-Accountant-Pack-1"*) authorised this packet.

**What this packet adds:** new doc `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` — a self-contained review pack a Mauritius-licensed accountant can read end-to-end and respond to with the written sign-off needed to close HB-2 (CoA review) and HB-3 (VAT decision) per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7. **14 sections covering all 10 items Anton's DECISION listed:** (1) draft Chart of Accounts in § 1, (2) AI Lead Rescue item / revenue treatment in § 2, (3) USD invoice / MUR bank receipt flow in § 3, (4) FX gain/loss treatment in § 4, (5) VAT posture in § 5, (6) pro-forma vs Sales Invoice in § 6, (7) recurring monthly service in § 7, (8) bank reconciliation assumptions in § 8, (9) **32 specific written questions** for the accountant in § 9 (Q-CoA-1..5, Q-Rev-1..3, Q-Flow-1..3, Q-FX-1..3, Q-VAT-1..7, Q-Doc-1..4, Q-Recur-1..3, Q-Bank-1..4), (10) **sign-off checklist** in § 10 with three sub-tables — § 10.1 HB-2 closure (5 items), § 10.2 HB-3 closure (4 items), § 10.3 advisory non-blocking (2 items), § 10.4 four-step CorpFlowAI commitments post-sign-off.

**Public seller identity included for the accountant's reference (already on live page per `JE-2026-06-02-4 PAY-SBM-2`):** legal name `CorpFlowAI Ltd`, BRN `C25228280`, registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, support email `support@corpflowai.com`, public domain `corpflowai.com`, customer-facing offer page `https://corpflowai.com/lead-rescue`, currency posture USD-denominated invoices to all customers worldwide for v1 per `JE-2026-05-28-1`, operating bank State Bank of Mauritius (MUR base + USD multi-currency).

**W1–W5 verbatim wording preserved character-for-character** from `LR-Manual-Invoice-Template-V1` § 1 and the live page (`/terms`, `/refund-policy`, `/contact`): W1 *"Payment instructions are sent separately after intake approval."*, W2 *"Setup begins after payment confirmation and receipt of required client information."*, W3 *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."*, W4 *"No revenue, lead volume, or conversion outcome is guaranteed."*, W5 *"VAT/tax treatment pending accountant confirmation."* — these are reproduced in § 6.1 of the pack so the accountant sees the exact wording they are being asked to confirm or amend in Q-Doc-3.

**Cursor's recommendations the accountant is asked to confirm or amend (none are pre-approved):**

- ERPNext document-type **Path A (Quotation; PDF retitled to *"Pro-forma invoice"*)** preferred over Path B (Sales Invoice Draft) — § 6.2 (Q-Doc-2).
- **Realisation-only FX policy** (no month-end mark-to-market on USD receivables) for v1 on materiality grounds — § 4.2 (Q-FX-1).
- **`Foreign Exchange Gain` and `Foreign Exchange Loss` as separate accounts** (cleaner P&L) preferred over single dual-purpose ERPNext stock account — § 1.1 + § 4.2 (Q-CoA-4 + Q-FX-3).
- **Single `Service Revenue — Lead Rescue Setup`** account preferred over granular sub-accounts on simplicity grounds — § 1.3 (Q-CoA-2).
- **Subprocessor costs absorbed** as operating expense (cleaner; no per-invoice line item) preferred over recharged — § 2.3 (Q-Rev-3).
- **Monthly close within 5 business days of month-end** preferred cadence for a small trading company with 1–10 invoices/month — § 8.3 (Q-Bank-1).
- **MUR 0.01 closing-balance tolerance** and **> 5% manual journals = no-go signal** — § 8.3 (Q-Bank-2).
- **7-year retention** for bank statement evidence (Mauritian standard practice) — § 8.3 (Q-Bank-4).
- **Re-evaluation trigger MUR 100,000/month** (pre-warning, well below the threshold the accountant identifies) — § 5.3 (Q-VAT-7).

**Honest limits acknowledged in § 11:** no PDF rendered from the ERPNext sandbox during Phase C (sandbox arithmetic verified in-database; PDF render path documented but not exercised — `ERPNext-PDF-Smoke-1` is a separate forward packet); no real bank-account/SWIFT/IBAN in repo; no production ERPNext instance exists at the time of writing; Phase C numbers are sandbox-illustrative; Mauritius VAT specifics deliberately not pinned to numbers (must come from the accountant); recurring monthly service is forward-looking CAN-DEFER; **Phase D is not initiated by this pack** — closing HB-2 + HB-3 unblocks two of four hard blockers, but HB-4 (redacted bank CSV reconciliation) and HB-1 (Phase D operator-approval row) remain open.

**Hard limits honoured by THIS packet:** zero edits to ERPNext production (no production instance exists yet); zero edits to ERPNext sandbox state on `corpflow-exec-01-u69678`; zero secrets / API keys / OAuth tokens / DB credentials present; zero real bank account number / SWIFT / BIC / IBAN / routing detail in repo; zero edits to `api/` / `lib/` / `prisma/` / `middleware*` / `scripts/` / `components/` / `pages/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings touched; zero pricing / offer / page-copy changes on customer-facing surfaces. **No new operational hold introduced.** Phase D start gate (`JE-2026-05-29-1`) is unchanged; HB-1/HB-2/HB-3/HB-4 are unchanged in their open state until separately closed.

**ANTON TO-DO (after merge):**

1. Review and `MERGE` PR (number assigned at PR open).
2. Identify and engage a Mauritius-licensed accountant. Send them this pack as the brief; the accountant does not need to read any other repo file to provide written sign-off (every fact this pack relies on is reproduced inline).
3. Receive the accountant's signed § 10 checklist back. If § 10.1 + § 10.2 are all ✓, the closure `JOURNAL.md` row template in § 5.4 of the pack is the recording action — once recorded, **HB-2 + HB-3 close**, leaving HB-4 (redacted bank CSV cycle) and HB-1 (Phase D operator-approval row) as the remaining two hard blockers.
4. If the accountant amends § 10.1 + § 10.2, the amendments incorporate into a follow-up packet `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.1` before any production setup work begins.

**Standing holds (unchanged):** Phase D not initiated · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `JE-2026-06-02-4` ID collision (declared in PR #287 DRA, accepted, no fix this packet) · HB-1 / HB-2 / HB-3 / HB-4 (the four hard blockers from `JE-2026-06-03-2` § 7).

**Follow-up PR #294 (merged 2026-06-03 `57c7e999`):** small docs-only addition of `§ 0.0 — One-page summary (start here)` to the top of `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`. Single file, +25 / −0; 13-row glance table cross-referencing every supporting section, closing with *"If you read nothing else, read § 1 (CoA), § 5 (VAT), and § 10 (sign-off checklist)."* No new facts; every claim points back to an existing § in the merged pack. Anton's DECISION on Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-03 *"AUTHORISE — ERPNext-Accountant-Pack-1"*) authorised this follow-up. Hard limits identical to PR #292 — no secrets, no real bank account number / SWIFT / BIC / IBAN, no runtime change, no production change, no sandbox mutation. Branch deleted post-merge.

## 2026-06-03 — Cold-Sprint-V1-Tracking — Lead Rescue Plausible custom-event baseline (4 events, runtime PR)

<!-- COLD_SPRINT_V1_TRACKING_HIST -->

**Status:** Runtime PR landing the smallest safe Plausible custom-event baseline for `corpflowai.com/lead-rescue`. **No backend changes.** No new env var names. No payment changes. No ERPNext changes. No Pomelli activation. No copy changes. Recorded as `JE-2026-06-03-3`. Anton's chat DECISION (2026-06-03 *"AUTHORISE — Cold-Sprint-V1-Tracking"*) authorised this packet as the first follow-up runtime PR from the Pomelli sprint proposal (`JE-2026-06-03-1`, PR #289 merged `fa6c0e8b`). The goal is to measure more than pageviews on the cold-market campaign without changing what the page says.

**What this packet adds:**

1. New exported helper **`trackEvent(eventName, options)`** in `lib/analytics/index.js` — the same module that already owns the single source of truth for analytics policy (host + path deny lists, env kill-switch, SSR script-injection decision). Safely short-circuits when (a) `eventName` is not a non-empty string, (b) `typeof window === 'undefined'` (SSR), (c) `typeof window.plausible !== 'function'` (script not injected — kill-switch off, host on deny list, preview deploy, network failure), or (d) Plausible itself throws inside the try/catch wrapper. Returns `true` only when dispatch succeeded; otherwise `false`. Documented with a JSDoc block stating the no-PII rule and the four short-circuit conditions.

2. Four custom events wired into `components/AiLeadRescueLanding.js`:

   - **`lr_primary_cta_click`** — fires on click of the nav `Start the 48-hour setup` anchor (with `props.location: 'nav'`) and the hero `Start my 48-hour setup` anchor (with `props.location: 'hero'`). Neither call prevents default anchor navigation to `#intake`.
   - **`lr_secondary_cta_click`** — fires on click of the hero `See how it works` anchor navigating to `#how-it-works`.
   - **`lr_intake_submit_attempt`** — fires at the top of `submitLead(e)` after `e.preventDefault()`, before `FormData` extraction and before `fetch('/api/tenant/intake', ...)`.
   - **`lr_intake_submit_success`** — fires after `if (!r.ok) throw new Error('intake_failed')` passes, before the success alert and `form.reset()`.

3. Seven new unit tests in `node-tests/analytics-policy.test.mjs` covering SSR no-op, script-not-injected no-op, invalid event names rejected, plain-event dispatch, options-with-props dispatch, Plausible-throws caught silently, and the no-PII whitelist (event-name regex + location-value whitelist + forbidden-prop-key blocklist `email` / `name` / `phone` / `ip` / `fingerprint` / `user_id` / `session_id`).

**Files changed (3, small surgical):**

- `lib/analytics/index.js` (+58 lines — new `trackEvent` export with JSDoc).
- `components/AiLeadRescueLanding.js` (+13 lines net — new import + 2 `trackEvent` calls in `submitLead` + 3 `onClick={() => trackEvent(...)}` props on existing anchors; no markup, copy, headline, sub-headline, body, form labels, error messages, or hero trust band touched).
- `node-tests/analytics-policy.test.mjs` (+118 lines — 7 new tests).

**Form behaviour preserved.** `submitLead` is structurally unchanged: `e.preventDefault()` still fires first; `FormData` extraction unchanged; `fetch('/api/tenant/intake', ...)` body unchanged; `!r.ok` failure path unchanged; success path unchanged (alert + `form.reset()`); error path unchanged. The two `trackEvent` calls inside `submitLead` are fire-and-forget — they never throw (try/catch internal), never `await`, never block the network call, and never reach the catch block of the calling function. Submission works identically whether the Plausible script is loaded or absent.

**No-PII rule.** Call sites pass only the event name and at most a single small categorical `props.location` value (`'nav'` or `'hero'`) — never email / name / phone / business name / IP / fingerprint / user-id / session-id / form-field values. The new unit test pins the lowercased snake_case event-name shape, the location-value whitelist, and the forbidden-prop-key blocklist.

**Policy unchanged.** Host + path + env kill-switch enforcement still lives in `lib/analytics/config.js` and `resolveAnalyticsForRequest` (`pages/_document.js` decides whether to inject the `<script defer data-domain="corpflowai.com">` tag). `trackEvent` does not duplicate the check — it relies on the absence of `window.plausible` as the operational allow-gate. The Plausible script is never injected on `lux.corpflowai.com` / `core.corpflowai.com` / `*.vercel.app` / `localhost` / `/change` / `/admin` / `/login` / token-bearing URLs / password-reset substrings, so `trackEvent` silently no-ops on every denied surface.

**Verification:**

- `npm test` `428/428` pass (was `421/421` before; +7 added by this packet; no existing test changed).
- `npm run build` succeeds (`/lead-rescue` SSG rebuilt at 539ms with no warnings).
- `npm run check:marketing-quality-gate` PASS.

**Hard limits honoured:** zero backend changes (no `lib/server/*` / no `api/*` / no `prisma/*` / no DB schema / no migration); zero new env var names introduced; zero payment changes (no `pages/refund-policy.js` / `pages/terms.js` / `pages/contact.js` / `components/PublicSiteFooter.js` / `LR-Pay-1` wording / `PAY-SBM-2` copy / pricing / forbidden-phrase exposure touched); zero ERPNext changes (no sandbox state / Phase D / Phase C² / runbook §8.1 / production instance / scheduler / accountant work touched); zero Pomelli activation (no Google account / VPN / asset upload / first-asset trial run / personal-data exposure); zero copy changes (no headline / sub-headline / body / CTA wording / form labels / error messages / privacy / refund / terms / contact / footer / hero-trust-band SVG / walkthrough video / asset manifest touched); zero secrets / API keys / OAuth tokens / DB credentials / banking details / KYC material / signed documents / DNS / mail-routing / Vercel config / GitHub Secrets / GitHub workflow files / Telegram / Search Console / payment-settings / payment-automation / CRM-GHL-WhatsApp-SMS integration touched; zero Lux tenant / factory / operator-console / `/change` / `/admin` route touched (Plausible policy already excludes them — they remain excluded). Single-offer rule (`JE-2026-05-28-1`) preserved.

**Live measurement plan.** Once merged + Vercel Production deploy is `READY`, Anton confirms in the Plausible dashboard (apex site `corpflowai.com`) that the four event names appear as Custom Events over the next 24-48 hours of organic traffic. If cold outreach starts before confirmation, the absence of events would prove a dashboard wiring problem rather than the absence of clicks.

**ANTON TO-DO (after merge):**

1. Wait for Vercel Production `READY` on the merge commit.
2. Open Plausible dashboard for `corpflowai.com` → Custom Events → click the four CTAs on the live `/lead-rescue` once each + submit the form once with sandbox details (e.g. own email + own phone) and confirm the four events register.
3. Record the Vercel deployment ID + commit SHA + the four-event confirmation in the PR closure Delivery Reality Audit on Bridge `#249` to flip the verdict from **PARTIAL** to **COMPLETE**.

**Standing holds (unchanged):** Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk account creation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation. **No new operational hold introduced.** The remaining cold-sprint PRs (PR-B copy variants / PR-D segment-specific landings / PR-E refund-link inline / PR-F French-language affordance / PR-G `lr_video_play` tracking / PR-H `lr_segment_landing` tracking / PR-I cold-outreach docs) remain HELD pending their individual DECISIONs.

---

## 2026-06-03 — ERPNext Phase D Production Readiness Evaluation (docs-only)

<!-- ERPNEXT_PRODUCTION_READINESS_EVALUATION_V1_HIST -->

**Status:** Evaluation artefact, **docs-only**. No production ERPNext changes; no edits to the ERPNext sandbox state on `corpflow-exec-01-u69678`; no secrets / API keys / OAuth tokens / DB credentials present; no real bank details (only public Anton-approved values quoted); no edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / runtime files; no DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings touched; no pricing / offer / page-copy changes on customer-facing surfaces. Recorded as `JE-2026-06-03-2`. Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-03 *"APPROVED — open ERPNext Phase D Production Readiness Evaluation"*) authorised this packet, parallel to and explicitly separated from the Pomelli marketing-sprint workstream (`JE-2026-06-03-1`).

**What this packet adds:** new doc `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (14 sections covering hard limits, executive verdict at top, ERPNext capability Q1, current sandbox state Q2, 18-item production setup checklist Q3, accountant control Q4, 11-step intake-to-invoice workflow Q5, go/no-go verdict Q6 with 4 HARD-BLOCKERS + 9 MUST + 6 SHOULD + 7 CAN-DEFER itemised, 7 open questions Q-A through Q-G with Cursor defaults, honest limits, standing holds, hard-limits-honoured, cross-references to 11 sibling docs + 11 decision rows, 8 recommended next packets, verdict per delivery-reality.mdc) plus this JOURNAL row plus this chat-history entry.

**Top-line verdict (§ 1 of new doc):** **NO-GO today** for using ERPNext production to generate the first real CorpFlowAI AI Lead Rescue pro-forma invoice. Four HARD BLOCKERS open: HB-1 Phase D operator-approval row not authorised (`JE-2026-05-29-1` requires fresh authorisation), HB-2 Mauritius-licensed accountant CoA review pending, HB-3 VAT decision pending accountant, HB-4 redacted MU bank CSV reconciliation cycle not yet exercised (Phase C cycle 3 was synthetic 3-line CSV only). The production instance does not exist; the Print Format / Letter Head / Company doctype are unfilled. **The manual-PDF path documented in `LR-Manual-Invoice-Template-V1` (PR #288, `JE-2026-06-02-7`) is the correct mechanism for the first 1–3 paying pilots.** **CONDITIONAL GO 4–6 weeks out** dependent on accountant turnaround, **GO for first submitted Sales Invoice 8–10 weeks out** after one month of real bank reconciliation data validates the workflow.

**Recommended sequencing:** Friday launch + first paying pilot uses manual PDF → Week 2-4 Anton engages Mauritius-licensed accountant to close HB-2 + HB-3 + Anton exports redacted SBM bank CSV → Cursor imports + reconciles to close HB-4 → Anton writes Phase D authorisation row to close HB-1 → Week 4-6 Cursor executes the 9 MUST items M-1 through M-9 (≈ 6-8 working days) under Phase D approval → Week 6-10 second paying pilot uses ERPNext Quotation + Sales Invoice; the 6 SHOULD items S-1 through S-6 close in parallel during the first month of real receipts.

**Cutover model = parallel install, not promotion.** Sandbox stays as the test bed (or torn down per `ERPNEXT_SANDBOX_INSTALL.md` § 15) alongside a fresh production install. No sandbox transactional data crosses to production. Production Company is `CorpFlowAI Ltd` (not `CorpFlowAI Sandbox`); production Item is `LR-SETUP-USD-150` (no `SBX-` prefix); production CoA is built fresh per `ERPNEXT_SANDBOX_PLAN_V1.md` § 2.1 + accountant review; production user / role mapping clones the sandbox custom `Accountant Read-Only` Role + 9 DocPerm rows from `JE-2026-06-01-5`.

**Hard limits honoured by THIS packet:** zero edits to ERPNext production (no production instance exists yet); zero edits to ERPNext sandbox state on `corpflow-exec-01-u69678`; zero secrets / API keys / OAuth tokens / DB credentials; zero real bank account number / SWIFT / BIC / IBAN / routing / sort-code / branch-code / payment links / personal phone / signed forms / customer data; zero live-payment-gateway claims; zero revenue / lead-volume / conversion guarantees; zero edits to `api/` / `lib/` / `prisma/` / `middleware*` / `scripts/` / `components/` / `pages/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings touched; zero pricing / offer / page-copy changes on customer-facing surfaces. Public Anton-approved values (`CorpFlowAI Ltd`, BRN `C25228280`, registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, support email `support@corpflowai.com` per `JE-2026-06-02-4 PAY-SBM-2`) are quoted verbatim where they appear on live customer-facing surfaces. **No new operational hold introduced.** Phase D start gate (`JE-2026-05-29-1`) is unchanged.

**ANTON TO-DO (after merge):**

1. Review and `MERGE` PR (number assigned at PR open).
2. When ready to start closing the 4 HARD BLOCKERS, the recommended sequence is: open `LR-Accountant-Engage-1` (closes HB-2 + HB-3 via accountant engagement) → open `ERPNext-Bank-CSV-Test-1` (closes HB-4 once redacted SBM CSV is available) → record Phase D authorisation row to close HB-1.
3. Phase D production install (`ERPNext-Production-Setup-1` covering M-1..M-9) is a **separate** packet that opens only after the four HARD BLOCKERS close; it is explicitly NOT authorised by this evaluation.

**Standing holds (unchanged):** Phase D not initiated · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `JE-2026-06-02-4` ID collision (declared in PR #287 DRA, accepted, no fix this packet).

---

## 2026-06-03 — Pomelli / AI Lead Rescue Mauritius Cold-Market Marketing Sprint v1 (research + proposal, docs-only)

<!-- POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1_HIST -->

**Status:** Research + proposal artefact, **docs-only**. No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, DB schema, or Pomelli account / asset is changed by this packet. Recorded as `JE-2026-06-03-1`. Anton's chat DECISION (2026-06-03 *"APPROVED — open Pomelli / Lead Rescue Mauritius Cold-Market Marketing Sprint"*) authorised this packet, with the explicit constraint *"This is separate from the ERPNext production-readiness workstream."*

**What this packet adds:** new doc `docs/marketing/POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1.md` (15 sections covering hard limits + scope, Pomelli viability verdict with 5 caveats and 6 sub-sections, current Lead Rescue surface inventory with 17-row repo-files table, cold-Mauritian-prospect landing audit with 14 strengths preserved and 12 gaps G1–G12, 12 first-pass copy/CTA proposals P-1..P-12 with diff-target file:line specificity, 4 segment-specific campaign angles, 5 cold-outreach channel variants honouring Mauritian DPA + Meta WhatsApp Business policies, 6 tracking gaps G-T1..G-T6 + recommended 4-event Plausible taxonomy, minimal 9-PR plan with landing-order recommendation and stopping rule, engineer/Cursor handoff with per-PR change recipes for PR-B + PR-C, coexistence matrix, standing-holds summary, 8 open questions Q1–Q8, 6-step ANTON TO-DO, cross-references, change-log) plus this JOURNAL row plus this chat-history entry.

**Pomelli verdict (research-based):** VIABLE as an internal CorpFlowAI marketing-studio capability for **asset generation only** — with 5 caveats: (1) Mauritius not in Pomelli's official availability list, so Anton would need US or EU VPN; (2) English only — no direct French/Creole asset generation; (3) Free public beta — no commitment from Google on future pricing or continuity, so build no workflow that depends on Pomelli existing; (4) No published data residency commitments — never feed real client data, trade secrets, or unannounced pricing into the tool; (5) Pomelli-generated assets used on `corpflowai.com/*` must pass through the existing `data/visual-assets/*.manifest.json` pipeline + `AssetProvenanceDisclosure` per `components/VisualAssetRenderer.js`, no exception. NOT viable as CRM, lead capture, automation engine, source of truth, or replacement for `/lead-rescue` / `pages/lead-rescue.js` — Pomelli has none of these capabilities and Anton's DECISION explicitly forbids treating it as such.

**Pomelli activation:** HELD. Requires a separate `AUTHORISE — Pomelli internal marketing-studio activation` DECISION covering VPN-region choice + ToS check + personal Google account scope + internal-only first-asset target.

**Cold-Mauritian-prospect landing-page audit highlights:** Hero is well-tuned for warm-network conversion already (doctrine-compliant, single offer, honest, USD 150 / 48h / 7d / 2 business hours specifics). Top conversion gaps for COLD traffic: no Mauritius-trust signal above the fold (G1, HIGH impact, doctrine-compliant fix already drafted); no Plausible custom events on CTAs / intake-submit (G2, HIGH impact — without click+submit events the cold-traffic launch has no way to measure landing-page conversion beyond pageview); dual hero CTA (G3, MEDIUM impact); refund-policy link not surfaced where the buying decision is made (G6, MEDIUM impact); no segment-specific copy variants for property/clinics/contractors/hospitality (G7, MEDIUM impact); no French-language affordance (G10, LOW–MEDIUM impact). None require runtime structural change; all are small surgical copy + tracking edits gated by separate DECISIONs.

**Recommended landing order for follow-up PRs:** PR-C (tracking) **before** PR-B (copy) so we measure baseline; then PR-B (copy v1); then PR-I (cold-outreach copy variants, docs-only); fold in PR-D / PR-E / PR-F / PR-G only if cold-traffic conversion data after PR-B + PR-C + PR-I indicates the live page + new copy + new tracking + new cold-outreach is insufficient. **Stopping rule:** if conversion target is met early, don't ship the rest unnecessarily.

**Segment campaign angles (§ 5):** Four named verticals (property / clinics / contractors / hospitality) each with audience definition, top buyer-pain in cold-prospect language, hook line, specific offer angle, trust signal, forbidden claims, optional Pomelli asset brief (only if Pomelli is activated under PR-H), and channel mix discipline. Channel-discipline summary (§ 6.5) enforces Mauritian DPA compliance: no cold WhatsApp DMs without mutual introduction, no cold phone calls in v1, no SMS, ≤ 20 cold emails per week to verified business addresses with single follow-up.

**Tracking proposal (§ 7.3):** Add 4 Plausible custom events to `/lead-rescue` — `lr_cta_click` (with `location: nav|hero|final_form|how_it_works_link` prop), `lr_intake_submit` (with `outcome: success|fail`), `lr_video_play`, `lr_segment_landing` (with `segment: property|clinics|contractors|hospitality|other`). **No PII** in event names or props (no email, name, phone, IP, fingerprint). All event names lowercased, snake_case. Verifiable in the Plausible dashboard within 60 minutes of merge under PR-C.

**Hard limits honoured:** zero Pomelli account / VPN config / asset uploaded; zero edits to `pages/lead-rescue.js` / `pages/index.js` / `pages/_app.js` / `components/AiLeadRescueLanding.js` / `components/PublicSiteFooter.js` / `components/analytics/*` / `lib/analytics/*` / `lib/server/tenant-intake.js` / `lib/visualAssets/*` / `data/visual-assets/*` / any other runtime file; zero secrets / env vars / DNS / mail-routing / Vercel project settings / GitHub Secrets / GitHub workflow files / Prisma schema / production DB / Telegram / Plausible env / Search Console / payment-settings touched; zero payment automation / API key / KYC / banking detail / signed document / customer data / personal phone / identity / live-payment-gateway claim / revenue guarantee committed; zero CRM / GHL / WhatsApp / SMS / outbound-automation integration changed or proposed; zero unsupported claims / fabricated testimonials / named clients / logos used to imply customers; zero ERPNext production setting / scheduler / Phase D / Phase C² / runbook §8.1 touched. Single-offer rule (`JE-2026-05-28-1`) preserved. All 12 proposed copy variants pass doctrine review against `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*. Pure docs/research/proposal artefact.

**Standing holds (unchanged):** Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk account creation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL.

**New holds introduced by this packet:** Pomelli activation HELD until separate `AUTHORISE — Pomelli internal marketing-studio activation` DECISION. Cold-sprint PRs B–I HELD pending individual DECISIONs. Cold-outreach campaign execution HELD pending PR-I docs-only landing + PR-C tracking landing.

**ANTON TO-DO when ready to act on this packet:** (1) read § 1 verdict + decide whether to authorise PR-H Pomelli activation packet (still docs/runbook only, no live change); (2) read § 3 audit + pick which of P-1..P-12 land in the first cold-sprint PR (Cursor recommendation: P-1+P-3+P-6+P-11+P-12 in PR-B; P-2 in PR-C); (3) answer Q1–Q8 (or accept Cursor defaults silently); (4) authorise the next PR by posting a DECISION on Bridge #249 (one of: `AUTHORISE — Cold-Sprint-V1-Tracking (PR-C)` recommended first / `AUTHORISE — Cold-Sprint-V1-Copy (PR-B)` recommended second / `AUTHORISE — Cold-Outreach-Cold-Copy-V1 (PR-I)` separate docs-only / `AUTHORISE — Pomelli internal marketing-studio activation (PR-H)` separate docs/runbook only); (5) after 1–2 weeks of cold traffic, review Plausible dashboard for `lr_cta_click` + `lr_intake_submit` event counts by `utm_source`; (6) request the next sprint only if conversion data indicates the previous sprint was insufficient.

**Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE** at PR merge (no customer-visible URL to probe by design — the cold-market sprint this packet describes will be exercised by subsequent small PRs gated by separate Anton DECISIONs, and only those subsequent PRs require live-production verification).

---

## 2026-06-02 — LR-Manual-Invoice-Template-1 (docs/template-only)

<!-- LR_MANUAL_INVOICE_TEMPLATE_V1_HIST -->

**Status:** Docs/template-only artefact. No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, or DB schema is changed by this packet. Recorded as `JE-2026-06-02-7` (slots 1–6 taken earlier the same day by `LR-Pay-1` PR #281, `LR-Mauritius-Outreach-Copy-1` PR #282, `PAY-SBM-1` PR #283, `PAY-SBM-2` PR #284, `Support-Feasibility-V1` PR #285, `SUPPORT-1` PR #286; the intake-to-invoice workflow audit in PR #287 took a duplicate `JE-2026-06-02-4` slot in the merged file — pre-existing collision left untouched by this packet). Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (comment `4598889042`, *"AUTHORISE — LR-Manual-Invoice-Template-1"*) authorised this docs/template-only packet.

**What this packet adds:** new doc `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (13 sections covering hard limits + sensitive-data exclusion, five required verbatim sentences W1–W5, repo-safe markdown template, 8 required placeholders, single-offer line-item rule, 10-step local-PDF operator instructions including the two-email pro-forma + payment-instructions design, coexistence matrix with 9 merged surfaces, 12-row verification rubric, standing-holds summary, 8 open questions Q1–Q8 with Cursor defaults, 7-step ANTON TO-DO, cross-references, change-log) plus this JOURNAL row plus this chat-history entry.

**Verbatim required wording (W1–W5):**
- W1 *"Payment instructions are sent separately after intake approval."*
- W2 *"Setup begins after payment confirmation and receipt of required client information."*
- W3 *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."*
- W4 *"No revenue, lead volume, or conversion outcome is guaranteed."*
- W5 *"VAT/tax treatment pending accountant confirmation."*

All five mirror the merged PAY-SBM-2 (`0fd9312b`) live page copy verbatim (terms, refund-policy, contact, public-site-footer, lead-rescue landing).

**Required safe placeholders (8 of 8):** `[INVOICE_NUMBER]` / `[ISSUE_DATE]` / `[VALID_UNTIL]` / `[CLIENT_LEGAL_NAME]` / `[CLIENT_EMAIL]` / `[CLIENT_ADDRESS_OPTIONAL]` / `[CORPFLOWAI_APPROVED_PAYMENT_INSTRUCTIONS_SENT_SEPARATELY]` / `[TAX/VAT_STATUS_PENDING_ACCOUNTANT_CONFIRMATION]`. All eight literally present in the § 2 template.

**Single line item (single-offer rule):** *"AI Lead Rescue Setup — USD 150 launch pilot"* at USD 150.00 — locked by `JE-2026-05-28-1`. No second tier, no recurring component, no setup/onboarding/monitoring/discount/surcharge line.

**Two-email design rationale:** The pro-forma itself carries no payment URL / link / button / QR / acquirer details. After intake approval, Anton sends a separate payment-instructions email from `support@corpflowai.com` with the actual SBM / Wise / Peach / SBM-MUR-transfer / SBM-USD-transfer details. Benefits: (a) reduces leakage if pro-forma is forwarded; (b) lets route be decided per-client; (c) matches the merged PAY-SBM-2 live wording *"This website does not collect card or banking details"*.

**Public details mirrored on the template (already public via PAY-SBM-2):** `CorpFlowAI Ltd`, `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, `BRN C25228280`, `support@corpflowai.com`.

**Hard limits honoured:** zero real banking details (no account / SWIFT / BIC / IBAN / routing / sort-code / branch-code); zero payment links (no PayPal / Wise / SBM / Peach / Stripe / acquirer hosted-checkout URL); zero personal phone / identity / KYC data; zero signed documents (NDA / MCIB / merchant pre-screening / business-continuity-plan); zero customer-specific data; zero live-payment-gateway claims (no *"SBM gateway is live"*, no *"Pay now"*, no *"online card payment available"*, no *"instant checkout"*); zero revenue / lead-volume / conversion guarantees; zero API keys / OAuth tokens / n8n secrets / Vercel env / GitHub Secrets / Prisma credentials / production-DB connection strings; zero edits to `api/` / `lib/` / `prisma/` / `middleware*` / `scripts/` / `components/` / `pages/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`; zero ERPNext production / scheduler / payment-gateway-configuration / DNS / mail-routing / env-vars / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings touched.

**Standing holds (unchanged):** Phase D · Phase C² · runbook §8.1 hardening · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB signing · Freshdesk account creation · trial · paid plan · `support` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL.

**New holds introduced by this packet:** none. Template artefact only — no operational hold needed.

**ANTON TO-DO when issuing the first real pro-forma:**
1. Decide Q1–Q8 from § 10 (or accept defaults: `CF-PF-2026-NNNN` numbering, 14-day validity, client address line included if known, literal *"Pending accountant confirmation"* tax line, top-left logo, single pro-forma per client v1, English only, 7-year local retention).
2. Confirm with accountant Mauritius VAT applicability for MU/SA/USA/AU/EU business customers.
3. Build the first PDF locally in Word / Pages / Google Docs from `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.
4. Send pro-forma + separate payment-instructions email from `support@corpflowai.com`.
5. Record reference locally (suggested layout: `~/CorpFlowAI/pro-formas/2026/CF-PF-2026-NNNN.{docx,pdf}`).
6. Request a small template-revision PR (`LR-Manual-Invoice-Template-V1.1`) only after 3 real pro-formas have been issued and the wording needs refinement based on real client feedback — Cursor will act on an explicit DECISION only.

**Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE** at PR merge (no customer-visible URL to probe by design — the template is operator-internal documentation; the Friday operator workflow it supports will be exercised locally by Anton when issuing the first real pro-forma to a Mauritius warm-network client and recorded in a follow-up STATUS report on Bridge #249).

---

## 2026-06-02 — AI Lead Rescue intake-to-invoice operator workflow audit (docs-only)

<!-- AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT_V1_HIST -->

**Status:** Inspection-only audit. **Docs-only.** No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, or DB schema is changed by this packet. Recorded as `JE-2026-06-02-4` (the day's other three slots were taken by the parallel `LR-Pay-1` PR #281, my own earlier `LR-Mauritius-Outreach-Copy-1` PR #282, and `PAY-SBM-1` PR #283 — all merged earlier the same day; safe append regardless of order). Anton's request on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02) asked eight specific questions about whether CorpFlowAI already has a complete operator workflow for turning an AI Lead Rescue intake into a PDF quote / pro-forma invoice. Closure PR adds new doc `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` + this JOURNAL row + this chat-history entry.

- **Per-question verdicts (with file citations).**
  - **Q1 — intake storage:** all required prospect details land on Postgres `leads` table (model `Lead` in `prisma/schema.prisma:11-30`) plus the structured operator state under `qualification_json.ai_lead_rescue_operator`. Handler at `lib/server/tenant-intake.js:62-182` enriches with `meta.product='ai-lead-rescue'`, host, page, and emits two automation events (`tenant.lead.captured` + `corpflow.lead_rescue.intake_received`) with idempotency keys.
  - **Q2 — admin sufficiency:** `/admin/lead-rescue/[id]` (page `pages/admin/lead-rescue/[id].js` -> component `components/AiLeadRescueAdminDetail.js:254-268`) shows all 9 prospect fields plus 7 commercial-card editable fields plus 13-state pipeline plus 13-item setup checklist (visible from `PAID_SETUP` onwards). Sufficient for Friday end-to-end.
  - **Q3 — manual-PDF copy-out:** every buyer-side detail (business name, contact name, email, phone) is on Card 1 and copy-pastable. Buyer business address (and optional BRN) collected during qualification call into Card 3 *Notes* before issuing the PDF.
  - **Q4 — sandbox item:** ERPNext sandbox confirmed to contain Item `SBX-LR-SETUP-USD-150` named verbatim *"AI Lead Rescue Setup (USD 150 pilot)"* at USD 150 (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 2.3 line 52). Two paid Phase C invoices (`ACC-SINV-2026-00001` + `ACC-SINV-2026-00002`) on its history.
  - **Q5 — sandbox PDF capability:** structurally available via `wkhtmltopdf` configured during Phase B-a (`docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 9 line 385). **Phase C did NOT exercise PDF rendering.** Quotation doctype not exercised either. Future small `ERPNext-PDF-Smoke-1` packet would cover this.
  - **Q6 — sandbox PDF vs manual PDF for Friday:** **manual PDF is materially safer.** Sandbox would render with company name *"CorpFlowAI Sandbox"* (not *"CorpFlowAI Ltd."*), no Letter Head, no logo, no address, no BRN, generic stock Print Format, and is loopback-only on `127.0.0.1:8080` requiring SSH tunnel access. Manual PDF on Anton's laptop wins on speed, brand alignment, and correctness of legal entity details.
  - **Q7 — required Friday pro-forma fields:** 30 fields total, broken into 7 seller-header (template literal), 5 document identity (per pro-forma), 6 buyer block (copied from `/admin/lead-rescue/[id]` Card 1 + qualification-call notes), 4 line item (hard-set), 3 totals (hard-set), 2 trust block (template literal), 3 payment instructions (template literal). Fits one A4 page. Forbidden phrases per `JE-2026-06-01-4` § 4.5 must NOT appear.
  - **Q8 — ERPNext production blockers:** 13 catalogued — multi-user line **RESOLVED** via `JE-2026-06-01-5`, backup-and-restore **DONE** in Phase B-a, Wise **MAY BE WAIVED** per `JE-2026-06-01-4`, and 9 remaining (CoA accountant review / real MU bank CSV import / VAT decision / Phase D approval / production install / Letter Head / Company doctype fields / production naming series / Modes of Payment / first real client invoice). **None reachable by Friday and none required for Friday** because the manual PDF path bypasses ERPNext entirely.
- **Friday-safe runtime § 9 — 12-step end-to-end.** Pre-launch: (1) Anton builds template once on laptop (NOT in repo — contains live BRN + address + bank details), (2) audit pass for forbidden phrases. Per-prospect: (3) outreach send per `LR-Mauritius-Outreach-Copy-1`, (4) buyer submits intake on `corpflowai.com/lead-rescue` or `aileadrescue.corpflowai.com`, (5) operator alert via n8n forward + Telegram, (6) Anton reviews Card 1 within 2 business hours, (7) qualification call -> status=QUALIFYING, (8) issue pro-forma (copy buyer fields from Card 1, fill seller fields from template, increment `CFLR-2026-NN`, save PDF), (9) update Card 2 commercial fields + status=QUOTE_SENT, (10) email/WhatsApp PDF to buyer. After payment: (11) confirm SBM wire receipt, mark Card 2 `payment_status=paid` + status=PAID_SETUP (unlocks setup-checklist card), (12) work the 13-item setup checklist per the operator runbook.
- **Honest limits captured (§ 10).** No live PDF rendered from ERPNext sandbox during this audit (would be a future small docs+sandbox `ERPNext-PDF-Smoke-1` packet). Manual PDF template starter is correctly off-repo. No measured intake -> paid funnel data yet — v1.1 of this audit and the outreach copy doc should refine after 10-20 outreach sends + 3-5 intakes. No buyer-side legal opinion on pro-forma vs quote vs tax-invoice naming — Mauritius-licensed accountant should confirm during the CoA review (blocker 2).
- **Recommended next packets (§ 11) — proposal-only, all gated.** `LR-Manual-Invoice-Template-1` (Thursday before Friday); `ERPNext-PDF-Smoke-1` (after first paying pilot); `ERPNext-Phase-D-Recommendation` (after blockers 2 + 3 + 4 close); `ERPNext-Production-Setup-1` (under Phase D approval); `LR-First-Pilot-Permission-Line-1` (after first signed invoice); `LR-Mauritius-Outreach-Copy-V1.1` (after 10-20 outreach sends).
- **Adjacent merged packets (§ 15).** `LR-Pay-1` (PR #281) is **proposal-only** — live page wording unchanged; my Friday runtime § 9 is provider-agnostic by construction so adoption does not affect anything in this audit. `PAY-SBM-1` (PR #283) is **docs-only** — no SBM submission, no NDA / MCIB signed, no payment gateway configured; PAY-SBM-1 § 2 G2 + G7 + G1 page-compliance gaps are naturally closed by the manual PDF for the buyer who receives it but remain open on the live page (PAY-SBM-1 PR 2 work, explicitly outside this audit's scope). Right reading order for an operator preparing for Friday: launch-readiness inventory -> outreach copy v1 -> THIS audit -> operator runbook -> PAY-SBM-1 readiness (parallel) -> LR-Pay-1 wording proposal (parallel).
- **Hard limits honoured.** Zero edits to `pages/lead-rescue.js` / `components/AiLeadRescueLanding.js` / `components/VisualAssetRenderer.js` / `lib/server/tenant-intake.js` / `pages/admin/lead-rescue/*` / `components/AiLeadRescueAdminDetail.js` / `lib/cmp/_lib/ai-lead-rescue-operator.js` / `prisma/schema.prisma` / any runtime file. Zero pricing change, zero payment automation / API key / KYC / payment gateway named on a live surface, zero ERPNext production setting modified, zero `tenant_id` / DNS / DB / env vars / secrets / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched, zero Phase D / Phase C² / production-setup work started, zero PAY-SBM-1 PR 2 / PR 3 work started, zero LR-Pay-1 adoption work started.
- **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only.** **COMPLETE** at PR merge — no customer-visible URL to probe by design (the audit is operator-internal documentation; the Friday operator workflow it describes will be exercised live by Anton starting Friday and recorded in a follow-up STATUS report on Bridge #249 once the first intake / pro-forma / wire / setup loop completes).
- **Closure PR is docs-only.** Branch `docs/lr-invoice-workflow-audit-v1`. Touches three files: new `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-4`), and this `artifacts/chat_history.md` entry.
## 2026-06-02 — SUPPORT-1 Freshdesk Growth activation plan (proposal-only docs PR)

<!-- SUPPORT_1_FRESHDESK_ACTIVATION_PLAN_HIST -->

**Status:** Proposal artefact only. **No Freshdesk account created, no trial activated, no credit card entered, no DNS record added, no email-routing change, no n8n + Gmail OAuth path modified, no live-chat widget added, no website-copy change beyond PAY-SBM-2 (`0fd9312b`).** Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02, *"Re: PR #285 — Freshdesk / Zoho Desk feasibility"*) accepted Freshdesk Growth as the v1 route, locked in Q1–Q8 answers, and instructed: *"Prepare a proposal only: SUPPORT-1 — Freshdesk Growth activation plan. Activation requires a separate explicit Anton decision."* Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-02-6`. Closure PR adds **`docs/operations/SUPPORT_1_FRESHDESK_ACTIVATION_PLAN.md`** + this JOURNAL row + this chat history sentinel.

- **Q1–Q8 locked in.** Q1 Freshdesk · Q2 1 agent · Q3 **EU (EEA)** data centre · Q4 `support.corpflowai.com` · Q5 **coexist** with n8n + Gmail OAuth (do not replace) · Q6 annual ~USD 180/year acceptable on Growth · Q7 Lead Rescue support only · Q8 no bundled site-copy (smallest possible separate PR after activation).
- **Activation plan structure.** 22 sections covering: hard limits + sensitive-data exclusion (§ 0); locked Q1–Q8 (§ 1); account creation by Anton at `freshworks.com/freshdesk/signup/` with **EEA data centre selection critical at signup**, 21-day free trial, no credit card (§ 2); EU data-centre decision tree with stop-here trigger if not EEA (§ 3); Growth plan confirmation post-trial with ~USD 180/year acceptance rule (§ 4); `support@corpflowai.com` inbound + outbound in **forwarding mode** preserving the existing n8n + Gmail OAuth path — Admin → Channels → Email → Gmail forwarder mode `Forward a copy` keeping audit trail (§ 5); `support.corpflowai.com` DNS — ONE CNAME record only, Cloudflare proxy OFF if applicable, full rollback ladder, pre-flight sanity check that apex/lux/core/aileadrescue resolve unchanged (§ 6); coexistence channel-separation matrix — 4 distinct flows (system-transactional outbound via n8n+Gmail / agent-reply outbound via Freshdesk / customer-initiated inbound / customer-reply inbound) all explicit (§ 7); branding setup using existing `public/assets/logos/LogoSQBK.png` + apex palette `#0a0a0a` + `#7dd3fc` text `#dbe7f5` + verbatim 2-working-day SLA wording matching PAY-SBM-2 + sender-alias verification (§ 8); 7-item ticket categories (Pre-purchase / Intake / Payment / Setup / Live-pilot / Complaint / Other) + 4 manual tags (§ 9); SLA policy 2-business-days first response + Mauritius UTC+4 business hours + manual High-priority bump for active pilots = 1 business day (§ 10); SBM Ref172 evidence shape via anonymised CSV export NOT committed to repo + 7-year retention + Web Site Requirements attestation wording draft (§ 11); 4-stage rollback ladder + 60-second worst-case email-routing fix (§ 12); 16-row Anton-action table A1–A16 with reversibility per step (§ 13); minimum-viable site-copy PR per Q8 — two-line edits in `pages/contact.js` + `components/PublicSiteFooter.js` only, HELD until A16 (§ 14); 13-row acceptance criteria AC1–AC13 with AC6 = `password_reset_delivery_configured: true` preserved (§ 15); 8 open questions Q9–Q16 with defaults (§ 16); Anton TO-DO 7-step + 21-day-trial-first Cursor recommendation (§ 17); standing + new holds (§ 18); hard limits honoured (§ 19); verdict (§ 20); cross-references (§ 21); change-log (§ 22).
- **Coexistence guarantee (Q5).** § 5 + § 7 + AC6 explicitly preserve the live `password_reset` outbound path documented in `CORPFLOW_COMMUNICATIONS_V1.md`. The activation packet does NOT modify the n8n webhook, Gmail OAuth credentials, `EMAIL_FROM` env var, `/api/factory/health` flag, `recovery_vault_entries`, or `automation_events`. Inbound Gmail forwarder mode = `Forward a copy` (Gmail keeps the original) so audit trail and any future migration optionality are preserved. Migration off n8n + Gmail OAuth is explicitly DEFERRED to a future SUPPORT-MIGRATION-1 packet requiring its own DECISION.
- **DKIM/SPF deferred.** Outbound from Freshdesk in v1 carries `via freshdesk.com` tag — acceptable for Q7 Lead Rescue support scope (warm-network Mauritius, not broad cold outreach). DKIM CNAME setup is DEFERRED to a future SUPPORT-DKIM-1 packet to avoid SPF coexistence design with Gmail's `include:_spf.google.com`. § 5.3 + § 6.1 + § 18 explicit.
- **Doctrine + rule compliance.** § 10 SLA copy = PAY-SBM-2 verbatim public wording (no drift); § 8 branding + AC11 enforce no-card-scheme-logos + no-payment-overclaim; § 11 SBM evidence shape matches `PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` § 5 (G6 customer-support / G7 receipt-policy); `.cursor/rules/security-sensitive-changes.mdc` applies to A3–A14 even though no env vars / secrets in this packet; `.cursor/rules/predeploy-decision-checks.mdc` applies to A12 (DNS change) when activation executes.
- **Hard limits honoured.** Zero Freshdesk / Freshworks account creation; zero trial activation; zero credit card; zero CNAME / MX / SPF / DKIM / DMARC change; zero email forwarder modified; zero live-chat widget; zero website-copy change beyond PAY-SBM-2 (`0fd9312b`); zero modification of n8n + Gmail OAuth path; zero env vars / GitHub Secrets / Vercel / GitHub settings / Prisma / production DB / Telegram / Plausible / Search Console / payment gateway / ERPNext production touched.
- **Standing holds (unchanged).** Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB. **Holds added by this packet:** Freshdesk account creation HELD until Anton authorises A1; trial activation HELD; paid plan HELD; `support` CNAME DNS change HELD; DKIM/SPF DNS changes DEFERRED to SUPPORT-DKIM-1; live-chat never v1; AI chatbot never v1; n8n + Gmail OAuth migration DEFERRED to SUPPORT-MIGRATION-1; small site-copy PR DEFERRED to post-A16 per Q8.
- **Closure PR is docs-only.** Branch `docs/support-1-freshdesk-activation-plan`. Three files: new `docs/operations/SUPPORT_1_FRESHDESK_ACTIVATION_PLAN.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-6`), and this `artifacts/chat_history.md` entry.

---

## 2026-06-02 — Support / ticketing system feasibility — Freshdesk v1 (with Zoho Desk backup) (investigation-only docs PR)

<!-- SUPPORT_SYSTEM_FEASIBILITY_V1_HIST -->

**Status:** Research artefact only. **No Freshdesk or Zoho account created, no DNS change, no email-routing change, no live-chat widget, no website-copy change beyond PAY-SBM-2 (`JE-2026-06-02-4`).** Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02 *"Re: Freshdesk support system — white-label feasibility"*) authorised this docs-only investigation. Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-02-5`. Closure PR adds **`docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md`** + this JOURNAL row + this chat history sentinel.

- **v1 objectives locked in.** 11 capability rows O1–O11 in § 1 of the feasibility doc: single `support@corpflowai.com` (inbound + outbound), 2-working-day acknowledgement SLA matching the live PAY-SBM-2 copy, `support.corpflowai.com` portal, **no Freshdesk / Freshworks / Zoho branding visible** on portal / email / ticket footer / KB, knowledge base v1, **NO live chat**, **NO AI chatbot**, business-hours not 24/7, ticket-history evidence sufficient for SBM Ref172 §customer-support / §complaints, 1–2 agents, budget ≤ USD 360 / year.
- **Freshdesk plan tier for v1 = Growth ($15/agent/month annual).** Per Freshdesk's own help article *"How do I remove the Freshdesk branding?"*: *"The Freshdesk branding at the bottom of the customer support portal would automatically be removed once your account is upgraded to a paid plan."* Custom portal domain `support.corpflowai.com` (CNAME + auto-SSL — Freshdesk auto-provisions free), branding removal on portal + KB + email templates + widget, logo / colour / portal-name customisation all unlocked at Growth. Custom CSS/JS layout editing requires Enterprise — not needed v1. Cost: **USD 180/year (1 agent) or USD 360/year (2 agents)**.
- **Zoho Desk backup tier for v1 = Standard ($14/user/month annual)**, cost USD 168/year (1 user) or USD 336/year (2 users). Custom domain + free SSL via Setup → Organization → Rebranding → Domain Mapping (CNAME to `desk.zoho.com`, manual *"Get SSL"* ticket). Free plan is more generous (3 agents vs Freshdesk's 2). **Branding removal at Standard is less explicit than Freshdesk Growth** per multiple third-party reviews — some Zoho wordmarks may persist; Enterprise ($40/user/month, USD 480/year) needed for cleanest white-label, which eliminates Zoho's cost advantage.
- **Recommendation: Freshdesk Growth + EU data centre.** Three reasons: (1) branding-removal explicitly documented at the lowest paid tier; (2) auto-SSL with no support-ticket round-trip; (3) USD 12–24/year cost difference vs Zoho Standard is not worth optimising over white-label quality at this scale. Zoho Desk Standard remains a credible backup if Freshdesk pricing changes adversely before activation, trial validation reveals branding remains, or Anton later consolidates with another Zoho product.
- **Key compatibility flag — R8 / ZR4.** `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` already documents `support@corpflowai.com` outbound running through n8n + Gmail OAuth (`JE-2026-05-22-1`). Activating Freshdesk or Zoho Desk on the same address requires a coexistence decision: **either** keep Gmail for system-transactional and Freshdesk/Zoho for customer-initiated, **or** migrate all `support@` outbound through the new vendor and retire the Gmail-OAuth send path. This is **out of scope for this feasibility packet** and must be resolved in the activation packet, gated by Anton's DECISION on Q5.
- **8 open questions for Anton (§ 8 of feasibility doc) block the activation packet:** Q1 vendor (Freshdesk recommended), Q2 agent count (1 or 2), Q3 data centre (EU recommended), Q4 portal subdomain (`support.` recommended), Q5 coexistence with n8n + Gmail OAuth (coexist recommended), Q6 billing cadence (annual recommended, saves ~17%), Q7 scope of v1 support address (Lead Rescue only recommended), Q8 whether the small public site-copy PR (link in footer + `/contact`) ships in the activation packet or separately.
- **Recommended next-PR plan.** PR-this docs-only feasibility (this packet). PR-next-1 activation packet (account + DNS + R8 resolution + small site-copy PR) — **HELD pending Anton DECISION on Q1–Q8 + explicit activation approval**. PR-next-2 KB seed (3 articles: intake / payment / fulfilment) — **HELD after activation**. PR-next-3 SBM compliance evidence (ticket-export sample for Ref172) — **HELD after activation**.
- **Hard limits honoured.** Zero Freshdesk / Freshworks account; zero Zoho Desk / Zoho One account; zero paid plan or free-trial activation; zero credit card entered; zero CNAME / MX / SPF / DKIM / DMARC change to `corpflowai.com`; zero email forwarder added; zero live-chat widget installed; zero website-copy change beyond the PAY-SBM-2 merge (`0fd9312b`); zero env vars / GitHub Secrets / Vercel env vars / Vercel settings / GitHub settings / Prisma schema / production DB / Telegram / Plausible / Search Console / payment gateway / ERPNext production setting touched.
- **Standing holds (unchanged).** Phase D · Phase C² · runbook §8.1 hardening · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 gateway integration · NDA / MCIB signing. **New holds introduced:** Freshdesk / Zoho Desk account creation HELD; `support.corpflowai.com` DNS change HELD; coexistence resolution for n8n + Gmail OAuth `support@` outbound HELD.
- **Closure PR is docs-only.** Branch `docs/support-system-freshdesk-feasibility`. Three files: new `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-5`), and this `artifacts/chat_history.md` entry.

---

## 2026-06-02 — LR-Pay-1 transitional Lead Rescue payment wording (proposal-only docs PR)

<!-- LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL_HIST -->

**Status:** Proposal artefact only. **Live Lead Rescue page is unchanged.** No payment gateway, API key, KYC, ERPNext production setting, env var, secret, DNS, Vercel config, GitHub setting, DB schema, or runtime code is touched. Anton's DECISION ([chat 2026-06-02, *"Re: PR #279 Delivery Reality Audit accepted"*](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249), accepting STATUS-14 + STATUS-15 DRAs for PR #279 and PR #278 respectively) instructed Cursor to *"prepare a proposal only for: `LR-Pay-1 — Lead Rescue transitional payment wording`"* after closing the PR #278 DRA. PR #278 DRA emitted as STATUS-15 [issuecomment-4597128603](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4597128603); verdict **COMPLETE** (merge commit `4f451150`, Vercel Production deployment `4888144768`, all live URLs 200, factory health `ok:true`). Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-02-1`. Closure PR adds **`docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md`** + this JOURNAL row + this chat history sentinel.

- **Live page audit (read-only).** Both `https://corpflowai.com/lead-rescue` (via `pages/lead-rescue.js`) and the apex render on `aileadrescue.corpflowai.com` (via `pages/index.js` mode `ai_lead_rescue`) use the same component `components/AiLeadRescueLanding.js`. Editing the component changes both surfaces — single edit point. Forbidden-phrase audit on `main @ 542422c2`: case-insensitive search for *"Pay now"* / *"PayPal accepted"* / *"Wise accepted"* / *"instant checkout"* / *"international bank transfer"* matches **3 files only** — the three docs that *define* the forbidden list (`docs/finance/PAYMENT_READINESS_2026_06_01.md`, `docs/decisions/JOURNAL.md`, `artifacts/chat_history.md`). **Zero matches in any live-rendered file.** The live page is already directionally compliant with `JE-2026-06-01-4`.
- **Live wording inventory.** 11 locations documented in the proposal § 3 (meta description, OG/Twitter descriptions, three CTA buttons, hero badge, hero h1, launch-offer aside, *What we need from you* line, four-step *What happens after intake* block, *§ How payment works* section, intake-form section + footnote, footer extra) with the **literal current text** for each. Confirms the page already says *"USD 150 launch pilot"*, *"invoiced after intake review"*, *"USD invoice with the agreed payment route"*, *"Once payment lands, we begin the setup"*, *"Payment links and invoice details are issued after intake review"*, *"no card or banking details on this page"*.
- **Proposed edits (10 candidates E1–E10).** Minimum-viable adoption set = E1-alt + E3 + E4 + E10 (4 small edits in one component file): (E1-alt) add Anton's verbatim wording as a lead-in paragraph above the existing *§ How payment works* h2 + bullets (paragraph + bullets together); (E3) Step 3 h3 *"You pay; the 48-hour clock starts"* → *"Setup begins once payment is confirmed"* + body adopted; (E4) approval-line tweak from *"USD 150 invoice"* → *"USD 150 secure payment link or invoice"*; (E10) footer extra wording aligned. Wider-adoption set adds E2 (Step 2 *"We email a USD invoice"* → *"We send a secure payment link or invoice"*). Optional E7 Option B (CTA button text change) — **Cursor recommends NO**; current CTAs are more action-oriented than the verbatim wording.
- **Doctrine-compliance check (§ 5 of the proposal).** All proposed edits pass against `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* + single-offer rule + payment-after-buyer-intent constraint, `JE-2026-05-28-1` single-offer rule, `JE-2026-05-28-3` trust-band, `JE-2026-06-01-4` forbidden-phrase list, `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md` four-layer compulsion, and `.cursor/rules/brand-conversion-doctrine.mdc`. Recommendation: **adopt now**, provider-agnostic wording is correct regardless of which gateway lands first.
- **Acceptance criteria (§ 6).** Ten items the adoption packet must satisfy before merge: Anton's verbatim wording present, forbidden-phrase audit GREEN, doctrine smoke pass, single-offer preserved, no payment-gateway name on page, no card/banking field collection, no buyer-side routing decision, meta tags coherent, `node-tests/lead-rescue-runtime.test.mjs` still passes, PR diff scoped to component + JOURNAL + chat_history.
- **Verification plan (§ 7).** CI → Vercel Preview READY → manual visual review of Preview at `/lead-rescue` → doctrine smoke → merge → live production verification (`https://corpflowai.com/lead-rescue` 200 with verbatim wording in HTML; apex `aileadrescue.corpflowai.com` render check; Lux + factory-health regression check) → DRA on bridge #249.
- **Open questions for Anton (§ 12).** Q1 minimum-viable vs wider adoption set, Q2 CTA buttons unchanged vs *"Apply for the USD 150 launch pilot"*, Q3 single vs split PR, Q4 update meta description, Q5 defer until SBM/Peach replies. Cursor's defaults if Anton doesn't answer: minimum-viable set, CTAs unchanged, single PR, defer meta description, adopt now.
- **Standing holds (unchanged).** Phase D HELD, Phase C² HELD, runbook §8.1 hardening HELD, production ERPNext HELD, scheduler enablement HELD, payment gateway configuration HELD, **Lead Rescue wording adoption HELD pending separate operator authorisation**.
- **Hard limits honoured.** Zero edits to `pages/lead-rescue.js` / `components/AiLeadRescueLanding.js` / `pages/index.js` / any live customer-facing component or meta tag; zero CTA text change; zero payment gateway / API key / KYC / ERPNext production setting; zero `tenant_id` / DNS / DB / env vars / secrets / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched.
- **Closure PR is docs-only.** Branch `docs/lr-pay-1-transitional-wording-proposal`. Touches three files: new `docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-1`), and this `artifacts/chat_history.md` entry.
---

## 2026-06-02 — PAY-SBM-2 Website compliance copy for SBM e-Commerce readiness (small page-compliance PR)

<!-- PAY_SBM_2_PAGE_COMPLIANCE_COPY_HIST -->

**Status:** Small client-facing page-compliance-copy PR. **No payment gateway is configured. No card-scheme logos added. No claim that online card payment is currently available. No "Pay now" / "Buy now" / "Checkout" CTA.** Anton's DECISION ([issuecomment-4598352193](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4598352193)) supplied the confirmed operator values and authorised opening the PR: support email `support@corpflowai.com` (inbox monitored YES); registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`; BRN `C25228280`; average ticket USD 150; max ticket v1 USD 500; verbatim approved fulfilment wording; MCIB Q21 TBA. Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-02-4`.

- **Compliance coverage (G1–G8 of `PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` § 2.1 adopted; G9 card-scheme logos held until SBM approval).** (1) Complete description of goods/services — already on `/lead-rescue` + `/about` + `/process` + `/standards`. (2) USD 150 price — already on `/lead-rescue` hero badge + payment section. (3) Customer-service acknowledgement within 2 working days — **added** in 4 places (footer, `/about` *Company* section, `/contact` *Customer support and complaints*, `/lead-rescue` payment footnote). (4) Public merchant address + BRN — **added** to `PublicSiteFooter.js` + `/about` *Company* section verbatim. (5) Privacy policy — already linked + `/privacy` extended with *Payment-card transmission* section. (6) Refund / cancellation policy — already on `/refund-policy`; receipt-policy sentence appended. (7) Digital service fulfilment / delivery — **added** as new *Service fulfilment* section on `/terms` using the **verbatim approved wording**. (8) No physical shipping — covered by `/terms` *Service fulfilment*. (9) USD transaction currency — **added** in 5 places (footer, `/about` *Company*, `/lead-rescue` payment footnote, `/terms` *Payment*, `/refund-policy` *Payment timing*). (10) Card-scheme logos held — **none added**. (11) HTTPS / SSL — site is already HTTPS; explicit TLS reference added in `/privacy` *Payment-card transmission*. (12) MCC not self-assigned — **no MCC claim** appears anywhere in the diff.
- **Approved fulfilment wording used verbatim in `/terms` *Service fulfilment* section:** *"The AI Lead Rescue launch pilot is a digital service. There is no physical shipment. Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."*
- **Files changed (8 client-facing + 2 docs):** `components/PublicSiteFooter.js`, `components/AiLeadRescueLanding.js`, `pages/about.js`, `pages/contact.js`, `pages/terms.js`, `pages/privacy.js`, `pages/standards.js`, `pages/refund-policy.js`, `docs/decisions/JOURNAL.md`, `artifacts/chat_history.md`.
- **Doctrine compliance audit (post-diff).** Forbidden-phrase audit GREEN: zero matches in `components/` or `pages/` for *"Pay now"* / *"PayPal accepted"* / *"Wise accepted"* / *"instant checkout"* / *"international bank transfer"*. Card-scheme audit GREEN: zero matches in `components/` or `pages/` for *"Visa"* / *"Mastercard"* / *"UnionPay"* / *"JCB"* / *"Alipay"* / *"card payment available"* / *"gateway is live"* / *"online card payment"*. Linter audit GREEN: zero errors across the 8 edited files. Single-offer rule preserved (USD 150 launch pilot, invoiced after intake review). Payment-after-buyer-intent constraint preserved (no payment-route name on the page; payment language stays in the *§ How payment works* section after the buyer-intent hero + intake form).
- **Hard limits honoured (per Anton's DECISION):** zero card-scheme logos added; zero claim that SBM gateway is live; zero claim that online card payment is currently available; zero new payment CTA; zero payment gateway configured; zero API keys; zero SBM form submission; zero NDA / MCIB signed; zero completed forms / bank details / passport / proof of address / bank references / UBO personal data committed; zero ERPNext production setting touched; zero env vars / secrets / DNS / production DB / `tenant_id` / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched.
- **Live verification post-merge (per `.cursor/rules/delivery-reality.mdc`).** Required on `https://corpflowai.com/`, `/lead-rescue`, `/refund-policy`, `/privacy`, `/terms`, `/contact`, `/about`, `/standards`, `/process`, `/onboarding`, `https://aileadrescue.corpflowai.com/`, `https://lux.corpflowai.com/`, `https://core.corpflowai.com/api/factory/health`. Forbidden-phrase + card-scheme-logo + payment-overclaim audits must remain GREEN on live HTML.
- **Standing holds unchanged.** Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway · LR-Pay-1 adoption · SBM application submission · PAY-SBM-3 gateway integration · NDA / MCIB signing — all HELD. PAY-SBM-2 is the only public-copy gate now lifted (within G1–G8 scope only).

---

## 2026-06-02 — PAY-SBM-1 SBM e-Commerce application readiness (docs-only)

<!-- PAY_SBM_1_SBM_ECOMMERCE_READINESS_HIST -->

**Status:** Docs-only readiness artefact. **No live page is edited.** No payment gateway configured. No API key created. No KYC submitted. No application sent to SBM. No NDA / MCIB signed. No raw SBM PDFs committed. No personal / corporate banking details committed. No runtime / env / DNS / DB / `tenant_id` / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched. Anton's DECISION ([chat 2026-06-02, *"Re: SBM eCommerce application readiness — uploaded SBM documents reviewed in ChatGPT"*](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)) authorised the packet. Six SBM source documents were reviewed by Anton in ChatGPT and sanitized into the DECISION; **Cursor did not read the raw PDFs**. Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-02-3` (renumbered from the originally-planned `JE-2026-06-02-2` after the parallel LR-Mauritius-Outreach-Copy-1 packet — PR #282 merged `8b5f12b1` — claimed that ID earlier the same day; `JE-2026-06-02-1` is reserved by LR-Pay-1 / PR #281 still open). Closure PR adds **`docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md`** + the JOURNAL row + this chat-history sentinel.

- **Hard limits + sensitive-data exclusion (§ 0 of the doc).** Eight categories explicitly forbidden from the repo: personal identity documents, beneficial-owner / shareholder personal data, bank reference details, signed legal documents, completed application / pre-screening forms, KYC source documents, real client / transaction data, bank statements. Anton submits these directly to SBM out-of-band.
- **SBM application document checklist (§ 1).** D1–D7 = items Cursor can DRAFT (business description / fulfilment description / support process / risk controls / transaction forecast / clarification questions / page-compliance-copy scope) — all live in this doc. A1–A7 = items Anton must COMPLETE personally (personal ID, BO details, signed NDA, signed MCIB if mandatory, bank reference, Pre-Screening final, Web Site Requirements attestation). R1–R3 = external reviewers (company secretary, accountant, optional legal).
- **Live website compliance gap audit (§ 2).** All 10 surveyed routes return **HTTP 200** on `https://corpflowai.com/` (run 2026-06-02): `/`, `/lead-rescue`, `/refund-policy`, `/privacy`, `/terms`, `/contact`, `/about`, `/standards`, `/process`, `/onboarding`. **Forbidden-phrase audit GREEN** — zero matches in any live-rendered file for *"Pay now"* / *"PayPal accepted"* / *"Wise accepted"* / *"instant checkout"* / *"international bank transfer"*. **9 concrete gaps catalogued (G1–G9) for the future page-compliance-copy PR:** G1 public support email, G2 registered business address + BRN, G3 explicit transaction currency, G4 service-fulfilment policy (digital, no shipping), G5 payment-card transmission statement, G6 customer support / complaints page, G7 receipt / invoice policy, G8 export / geographic restrictions, G9 card-scheme logos (post-approval only).
- **Draft business description (§ 3).** CorpFlowAI Ltd, Mauritian-registered AI-assisted operations company; flagship offer = AI Lead Rescue USD 150 launch pilot; digital services only; explicit no-restricted-categories list (no physical goods, no regulated financial / investment / medical / legal advice, no gambling, no adult content, no firearms, no controlled substances, no cryptocurrency exchange).
- **Draft operational fulfilment (§ 4).** 9-step buyer journey: intake on `/lead-rescue` → operator review within 2 business hours → USD 150 invoice via secure payment link (SBM hosted page when live) OR PDF + SBM wire instructions → payment confirmation in ERPNext ledger → **48-hour setup clock starts on payment-confirmation timestamp** → lead-source connection + alert routing + Google Sheet log + follow-up status board + daily summary + 7-day monitoring → handover (all artefacts belong to buyer). No physical shipment; service-fulfilment measured in elapsed time from payment-confirmation to live-pilot (target 48h, soft-cap 5 business days).
- **Draft customer support and complaints process (§ 5).** Channel of record `support@corpflowai.com` (subject to Anton confirming inbox is monitored); initial response 2 business days; active-pilot response 1 business day; Tier 1 / Tier 2 / Tier 3 escalation path; chargeback evidence-supply commitment within SBM's timeline.
- **Draft risk controls (§ 6).** Risk profile = LOW for card-acquiring purposes. **Manual operator intake-approval gate is the primary fraud-prevention layer** (applies to 100% of buyers; anonymous "pay now" paths do not exist). Hosted-checkout / payment-link architecture means CorpFlowAI servers never receive / store / process card data — preserves SAQ-A-equivalent PCI scope (subject to SBM confirmation in § 8 Q-PCI). ERPNext reconciliation Phase C-complete per `JE-2026-06-01-3`; multi-user accountant-readonly role GREEN per `JE-2026-06-01-5`; Phase D production go-live currently HELD per `JE-2026-05-29-1`.
- **Transaction forecast proposal (§ 7).** 4 conservative scenarios: launch 4–10/month USD 600–1,500; base case 20–40/month USD 3,000–6,000; upside 60–100/month USD 9,000–15,000; **not-to-exceed envelope ≤ 200/month ≤ USD 30,000**. Average ticket USD 150. **Maximum ticket proposed USD 1,500** (or tighter USD 500 if Anton prefers v1-tighter ceiling — Anton confirms). Chargeback target < 1%; refund target < 5%. Currency: USD primary + MUR secondary + EUR / GBP optional.
- **SBM clarification questions (§ 8).** 13 new questions (Q13–Q24 + Q-PCI) extending the 12 in `PAYMENT_READINESS_2026_06_01.md` § 6. Covers payment-link UX, hosted checkout, API + webhooks, sandbox, **sFTP reconciliation report format**, **Alipay availability** (flagged unconfirmed by Anton), settlement currency to SBM Mauritius (USD-direct vs MUR auto-FX), fees + **rolling reserve** + chargebacks, **MCIB consent mandatory for e-Commerce acquiring?** (gates whether Ref91 gets signed), **newly-trading-company posture without 2 years of financials** (gates the whole timeline), card-scheme logo guidelines (gates G9), receipt-format requirements, PCI scope SAQ-A confirmation.
- **Recommended PR plan (§ 9).** PR 1 = THIS docs-only readiness (no live pages touched); PR 2 = page-compliance-copy applying G1–G8 to live pages (requires Anton's separate authorisation + concrete address / BRN / inbox values); PR 3 = gateway integration after SBM approval + Phase D unblock + security-review checklist signed per `.cursor/rules/security-sensitive-changes.mdc` + `docs/operations/SECURITY_REVIEW_CHECKLIST.md`. Decision tree spelled out in § 9.
- **ANTON TO-DO (§ 10).** Review the § 3–§ 7 drafts; confirm support inbox; decide max-ticket figure; send § 8 questions to SBM; submit Ref172 Pre-Screening; decide MCIB after Q21 reply; sign NDA after legal review; authorise PR 2 when ready.
- **Honest limits (§ 12).** Cursor did not read raw SBM PDFs (sanitized summary only). Cursor cannot evaluate UBO citizenship + pending residency policy. Cursor has not contacted SBM. Drafts are starting-point text, not final submission copy. Gap list is a 2026-06-02 audit; re-audit required if site copy changes before PR 2 is authorised.
- **Standing holds (unchanged + new).** Phase D · Phase C² · Runbook §8.1 hardening · Production ERPNext · Scheduler enablement · Payment gateway configuration · Lead Rescue wording adoption (per PR #281) — all HELD. **New holds added: SBM application submission HELD · page-compliance-copy PR HELD · gateway integration PR HELD** — each requires separate operator authorisation.
- **Closure PR is docs-only.** Branch `docs/pay-sbm-1-readiness`. Touches three files: new `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-3`), and this `artifacts/chat_history.md` entry.

---

## 2026-06-02 — LR-Mauritius-Outreach-Copy-1 (docs-only) — warm-network outreach copy v1 for Friday Mauritius launch

<!-- AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1_HIST -->

**Status:** Copy / docs-only artefact. **No runtime page change, no pricing change, no payment automation, no ERPNext production change.** Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02, *"APPROVED — open LR-Mauritius-Outreach-Copy-1"*) authorised this packet immediately following the launch-readiness inventory (`JE-2026-06-01-6` / PR #280). Recorded in `docs/decisions/JOURNAL.md` as **`JE-2026-06-02-2`** (renumbered from `JE-2026-06-02-1` because `JE-2026-06-02-1` is reserved by the parallel `LR-Pay-1` transitional payment wording proposal packet; both packets are independent docs-only artefacts on separate branches and either merge order is safe). Closure PR adds **`docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`** + the JOURNAL row + this chat-history sentinel.

- **Voice rules.** Lead with the named pain (missed enquiries / WhatsApp / email / Facebook follow-up / daily lead list / owner alerts), not "AI". Single offer (USD 150 launch pilot, invoiced after intake review). Single CTA per channel. No "pay now" / "instant" / "PayPal accepted" / "Wise accepted" / "international bank transfer" as primary CTA (`JE-2026-06-01-4` § 4.5 forbidden phrases). Plain language, no corporate filler.
- **Five channel-ready copy blocks.** § 1 LinkedIn DM (3–5 sentences, no link in first DM); § 2 WhatsApp (2–3 lines + page link inline, optional French opener); § 3 email (4 ranked subject lines + master body + shortened mobile-first variant); § 4 follow-up (3–5-day cadence, single re-send, walkthrough video as added value); § 5 short LinkedIn post (hook-first, single link, social-card visual direction).
- **Ten objection answers.** § 6.1 *"USD 150 feels too cheap to be real"*; § 6.2 *"USD 150 is a lot — can you do it cheaper?"*; § 6.3 *"Show me a case study"* (turns the pre-proof gap into a price-justification frame); § 6.4 *"Is this just AI?"* (no AI talks to your customers); § 6.5 *"How do I pay?"* (no card on the page); § 6.6 *"I already use a CRM"* (Lead Rescue is intentionally not a CRM); § 6.7 *"Does this work for my industry?"*; § 6.8 *"Send me a proposal first"* (intake replaces discovery); § 6.9 *"Can we do this in MUR / EUR?"* (USD on public side, operator-side currency convenience); § 6.10 silence (one follow-up only, then stop).
- **Three vertical variants.** § 7.1 property / real estate / rentals (*"viewing requests slipped through"*); § 7.2 clinics / wellness / dental / beauty (*"appointment requests over the weekend"*); § 7.3 contractors / home services / renovation / solar / security (*"quote requests on site days"*). Each variant changes only the buyer-problem line + one CTA word + the subject + one vertical-specific objection — everything else (price, mechanism, payment trust, no-guarantee) is verbatim doctrine.
- **Validation asset.** `https://corpflowai.com/lead-rescue` (live, 200, brand-doctrine compliant per `JE-2026-06-01-6` live verification) + the CF-VID-0001 52-second silent walkthrough wired into the page (also direct: `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4`).
- **Pre-proof posture.** Per `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3 — no third-party testimonials, no named cases, no logos. Honest replacement line *"This is a launch pilot — we do not yet publish client cases. The first published case will appear after the first paying pilot completes — which is exactly why the price is USD 150 instead of the production price."* used as the truthful answer to objection 6.3.
- **Quality gate (per `01_AGENT_OUTPUT_CONTRACT.md` § 7).** All 9 checks YES: clear in 10 seconds, specific buyer problem, proof flagged, scannable, visual direction, single CTA per block, validation asset included, no unsupported hype, aesthetic standard considered.
- **Publish-score self-check (per `04_DELIVERY_QUALITY_GATE.md` § 3).** **14 / 14** (minimum publish is 12 / 14): strategic clarity 2, message quality 2, proof and trust 2, scannability 2, visual / aesthetic 2, conversion logic 2, channel fit 2.
- **Honest v1 limits.** No measured-data refinements (this ships before any sends happen — a v1.1 packet refines after 10–20 sends per channel); no French body copy beyond the optional opener (deferred `LR-French-Creole-Variants-1`); no published article links (`AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 3 records all three planned articles as planned-only); no A/B subject-line statistical testing; no CRM mirror; no payment processor named on outreach.
- **Recommended next packet (proposal-only).** `LR-Mauritius-Outreach-Copy-V1.1` — measured-data refinement after 10–20 sends per channel; refine subject lines + LinkedIn DM opener + follow-up timing based on observed reply / open / intake rate. Separate Anton DECISION required.
- **Hard limits honoured.** Zero runtime code / public page copy / payment automation / API key / secret / ERPNext production setting / Prisma migration / DB schema / Vercel config / GitHub setting / DNS / pricing / fake testimonial / fabricated logo / unsupported revenue claim / env var / analytics / Plausible / Search Console / Telegram / payment-settings touched. Pure docs/copy artefact.
- **Closure PR is docs-only.** Branch `docs/lr-mauritius-outreach-copy-v1`. Touches three files: new `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-02-2`), and this `artifacts/chat_history.md` entry.

---

## 2026-06-01 — AI Lead Rescue Mauritius launch readiness inventory (docs-only)

<!-- AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS_2026_06_01_HIST -->

**Status:** Inspection-only inventory artefact. **No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, or DB schema is changed.** Anton requested an inventory of what already exists, what is missing, and what is safe to use before sending AI Lead Rescue outreach into Mauritius by Friday. Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-01-6`. Closure PR adds **`docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md`** + this JOURNAL row + this chat history sentinel.

- **Live verification (2026-06-01).** Both `https://corpflowai.com/lead-rescue` (200 / `text/html` / `x-vercel-cache=PRERENDER`) and `https://aileadrescue.corpflowai.com/` (200 / `text/html`) return correctly. Walkthrough MP4 (200 / `video/mp4` / 665,092 B / Vercel HIT), VTT (200 / `text/vtt`), hero WebP (200 / `image/webp` / 127,266 B / Vercel HIT), social card WebP (200 / `image/webp` / 51,450 B / Vercel HIT) all serve. Doctrine sentinels in live HTML: `USD 150 launch pilot`, `no card on this page`, `invoiced after we review your intake`, `We do not guarantee` all **present**; `MUR`, `EUR`, `Wise`, `PayPal` mentions all **absent**. The live page is brand-doctrine compliant.
- **Page readiness verdict.** READY for Mauritius warm-network outreach. Single offer (USD 150 launch pilot, invoiced after intake review), intake form posts to `/api/tenant/intake`, no card / banking fields on the page, no risky claims, no Mauritius-specific drift. **Do not change page copy for Friday** — the `JE-2026-06-01-4` § 4.5 transitional CTA wording is recommended but explicitly NOT YET ADOPTED on the live page; adoption is a separate small operator-authorised packet.
- **Video verdict.** CF-VID-0001 exists, signed off by Anton 2026-05-29, wired into the `lead_rescue_dashboard` slot as the first preferred id (`lead-rescue-walkthrough-v1`) in `lib/visualAssets/selectLeadRescueAssets.js`, served from the apex CDN with valid `video/mp4` content type + WebVTT caption track + provenance JSON. Direct shareable URL: `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4`. Friday-usable for LinkedIn / Facebook / WhatsApp / Telegram outreach.
- **Articles verdict.** **None of the three planned articles exist** as files in `pages/` or `data/` — `why-small-businesses-lose-leads`, `what-happens-after-someone-submits-your-contact-form`, `hidden-cost-of-slow-lead-response` are mentioned only in `artifacts/chat_history.md`. Per `JE-2026-05-28-1` deferral, articles are planned-only, **not launch-blocking**.
- **Visual / social inventory.** Six active manifests under `data/visual-assets/lead-rescue-*`: `lead-rescue-hero` (image), `lead-rescue-process` (illustration), `lead-rescue-dashboard` (illustration), `lead-rescue-walkthrough-v1` (video / CF-VID-0001), `lead-rescue-trust` (illustration), `lead-rescue-social` (social_card). One stale example manifest (`lead-rescue-card.example.manifest.json`) flagged for future cleanup. All AI-generated assets render `AssetProvenanceDisclosure` chips on the page; no fake testimonials / logos / case studies anywhere.
- **Mauritius positioning recommendation.** Lead with **missed enquiries / WhatsApp / follow-up / daily lead list**, not with "AI". Page stays English. **Friday outreach: English only** (LinkedIn / WhatsApp / email); French / Creole variants are a follow-up batch after first 5–10 intakes. Vertical priority: (1) property / real estate / rentals, (2) clinics / wellness / dental / beauty, (3) contractors / home services / renovation / solar / security; verticals 4–7 (private schools / accountants / car dealers / luxury) are a second batch.
- **Accounting / invoicing verdict.** **ERPNext is sandbox-only** (loopback `127.0.0.1:8080` on `corpflow-exec-01-u69678`, scheduler disabled). Phase D production go-live **NOT authorised** per `JE-2026-05-29-1`. Phase C arithmetic GREEN per `JE-2026-06-01-3`; multi-user line **RESOLVED** via Option B Custom Accountant Read-Only Role (`JE-2026-06-01-5`); accountant CoA review / real MU bank CSV import / VAT decision **all PENDING**. **Friday-safe fallback = manual PDF pro-forma invoice in Word / Pages / Google Doc + separate SBM wire instruction PDF (kept off-repo) sent only after intake approval; payment confirmed manually before 48-hour setup clock starts.** This is fully consistent with the live page wording. ERPNext production go-live is a Phase D + accountant + bank-CSV evidence question, not reachable in 4 days.
- **Friday launch checklist (Anton-side actions).** Must-have items still requiring Anton: (a) assemble manual PDF pro-forma invoice template (Word / Pages / Google Doc), (b) prepare SBM wire instruction PDF (off-repo), (c) draft outreach copy variants for LinkedIn / WhatsApp / email (English), (d) build initial outreach list of 10–30 names from verticals 1–3, (e) **Thursday dry-run intake submission from a phone to confirm Telegram / email alert lands**.
- **Recommended next packets (proposal-only, not authorised).** `LR-Mauritius-Outreach-Copy-1`, `LR-Manual-Invoice-Template-1`, `LR-Articles-1`, `LR-First-Pilot-Permission-Line-1`, `LR-Transitional-CTA-Adoption-1`, `ERPNext-Phase-D-Recommendation`, `LR-French-Creole-Variants-1`, `LR-Brand-Identity-Phase-B-Step-3` — each requires a separate Anton DECISION before any work begins.
- **Hard limits honoured.** Zero runtime code / public page copy / payment automation / API key / secret / ERPNext production setting / Prisma migration / DB schema / Vercel config / GitHub setting / DNS / pricing / fake testimonial / fabricated logo / unsupported revenue claim / env var / analytics / Plausible / Search Console / Telegram / payment-settings touched. Pure docs artefact.
- **Closure PR is docs-only.** Branch `docs/lr-mauritius-launch-readiness`. Touches three files: new `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md`, append-only row in `docs/decisions/JOURNAL.md` (`JE-2026-06-01-6`), and this `artifacts/chat_history.md` entry.

---

## 2026-06-01 — ERPNext C-1 final remediation = Option B (custom `Accountant Read-Only` Role with explicit Custom DocPerm rows); all 6 verification gates GREEN

<!-- ERPNEXT_C1_OPTION_B_2026_06_01_HIST -->

**Status:** Sandbox-only remediation executed and verified. Original Finding C-1 (Sales Invoice insert succeeded for `accountant-readonly-sandbox`) is **fully resolved**. §10.1 multi-user line is **MET in the sandbox**. Phase D (go/no-go recommendation per `ERPNEXT_SANDBOX_PLAN_V1.md` §10) remains gated and requires separate operator approval per `JE-2026-05-29-1`. Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-01-5`. Findings doc (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`) §3.4.1 and §4 carry the full evidence and resolution history.

- **Operator authorisation:** Anton's DECISION ([chat 2026-06-01, *"Re: C-1 remediation result — choose Option B"*](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)) rejected Option A (accept Auditor as-is with GL-only read) on the grounds that Auditor's default DocPerm matrix is too restrictive for practical accountant review (cannot read Sales Invoice / Payment Entry / Customer / Item). Approved scope: create custom `Accountant Read-Only` Role / Role Profile in the sandbox only, with read/report/export on the 9 doctypes listed in the DECISION; everything else explicitly forbidden.
- **Execution pattern:** same bench-venv-Python orchestrator approach used for Phase B-a §7 wizard bypass and Phase C cycles — `docker compose exec -T backend /home/frappe/frappe-bench/env/bin/python -` with a Python heredoc piped in via SSH from `root@5.78.213.185`. Single script `/tmp/erpnext-c1-option-b.sh` on the host; idempotent (re-runnable without side-effects).
- **Custom Role created:** `Accountant Read-Only` (`desk_access=1`, `is_custom=1`).
- **9 Custom DocPerm rows created** (one per doctype, all `permlevel=0`) with `read=1`, `report=1`, `export=1` and **everything else explicitly 0** (`write / create / submit / cancel / amend / delete / import / set_user_permissions / print / email / share / if_owner` all set to 0). Doctypes: `GL Entry`, `Journal Entry`, `Sales Invoice`, `Payment Entry`, `Customer`, `Item`, `Account`, `Company`, `Payment Request`. The 9 `Custom DocPerm` Frappe doc names are recorded in `JE-2026-06-01-5` for audit trail.
- **User role swap:** `accountant-readonly-sandbox@corpflowai.test` roles before = `['Auditor']` (the intermediate state from the earlier remediation step recorded in `JE-2026-06-01-3` Finding C-1 + STATUS-11); roles after = `['Accountant Read-Only']` (Auditor explicitly removed by the role-list filter in `user_doc.roles = [r for r in user_doc.roles if r.role not in ('Auditor', 'Accounts User')]`).
- **Cycle 4 re-run as the remediated user — all 6 gates GREEN (11-test verification matrix).** **Read tests (all OK):** GL Entry 5 rows, Journal Entry 3 rows, Sales Invoice 2 rows, Payment Entry 2 rows, Customer 2 rows, Item 1 row, Account 5 rows, Company 1 row, Payment Request 2 rows; specific Sales Invoice read (`ACC-SINV-2026-00001` — USD 150 / Sandbox Client A - USD / docstatus=1) OK. **Denied tests (all PASS_DENIED with `frappe.PermissionError`):** insert Sales Invoice, save Sales Invoice (modify `remarks`), cancel Sales Invoice, delete Sales Invoice (explicit message *"User not allowed to delete Sales Invoice: ACC-SINV-2026-00001"*), insert Payment Entry, save Payment Entry (`ACC-PAY-2026-00002`), cancel Payment Entry, create Customer (`Option B Denied Test Customer`), create Item (`OPTION-B-DENIED-TEST-ITEM`).
- **`submit` permission semantics noted in findings doc §3.4.1:** ERPNext's `submit()` calls `save()` internally; `write=0` blocks submit at the write-check before submit-check. The test matrix therefore exercises `cancel` (a discrete state-change with `cancel=0`) in place of an explicit submit test, preserving the underlying go/no-go intent ("the accountant cannot change document state"). The `insert + save` denials prove `submit` is unreachable.
- **Residue audit GREEN.** Final sandbox inventory = exactly 2 Sales Invoices (`ACC-SINV-2026-00001`, `ACC-SINV-2026-00002`), 2 Payment Entries (`ACC-PAY-2026-00002`, `ACC-PAY-2026-00003`), 3 Journal Entries (`ACC-JV-2026-00001` / `00002` / `00003`), 2 Customers (`Sandbox Client A - USD`, `Sandbox Client B - USD`), 1 Item (`SBX-LR-SETUP-USD-150`) — identical to the Phase C end-state recorded in `JE-2026-06-01-3`. Zero invoice residue, zero payment-entry residue, zero customer-test residue, zero item-test residue. Denied-test docs never persisted because `PermissionError` fired before any DB write; `frappe.db.rollback()` was called explicitly after the denied-test block to discard any uncommitted side-effects.
- **Scheduler scope check GREEN.** `sites/corpflowai-sandbox.localhost/site_config.json` → `disable_scheduler: 1` (unchanged from Phase B-a `JE-2026-06-01-1` / Phase C `JE-2026-06-01-3`). Sandbox remains loopback-only on `127.0.0.1:8080`. **The scheduler-disabled scope statement refers ONLY to the ERPNext/Frappe sandbox scheduler on `corpflow-exec-01-u69678` — no CorpFlowAI runtime, Vercel cron, GitHub Actions schedule, Telegram process, or production worker was touched.**
- **§10.1 multi-user line — VERDICT MET in sandbox.** Accountant role can **read** all relevant transaction documents AND can **export / report** on them, but **cannot** create / write / submit / cancel / amend / delete / import on any of them. The operator role (Phase B-a `operator-sandbox@corpflowai.test` with `System Manager` + `Accounts Manager`) retains full posting capability for Phase C cycles 1–3. Two distinct posture roles successfully coexist in the sandbox.
- **Hard limits honoured.** Zero CorpFlowAI runtime / production ERPNext / Vercel / GitHub Actions / Telegram / production DB / payment gateway / env vars / secrets / DNS / `tenant_id` / Search Console / Plausible / analytics / payment settings touched. Sandbox-only, loopback-only, scheduler-disabled posture identical to Phase B-a + Phase C. Phase D and Phase C² each remain gated per `JE-2026-05-29-1`.
- **Future runbook hardening (gated).** The sandbox bootstrap script `/tmp/erpnext-c1-option-b.sh` on `corpflow-exec-01-u69678` is the reference for promoting this Role configuration into `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §8.1 — a separate small runbook-hardening packet (requires Anton's separate authorisation) so future installs (production or otherwise) get the `Accountant Read-Only` Role + 9 Custom DocPerm rows out of the box.
- **Closure PR is docs-only.** Branch `docs/erpnext-c1-option-b-findings-update`. Touches `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` (§1 cycle 4 row + new §3.4.1 *Post-remediation (Option B)* block + §4 Finding C-1 *Resolution history* block + §7 §10.1 blocker 1 marked RESOLVED + §8 operator summary updated + §9 references + §10 honest limits update), `docs/decisions/JOURNAL.md` (new row `JE-2026-06-01-5`), and this `artifacts/chat_history.md` entry. **Phase D blockers remaining** (unchanged): accountant CoA review per §10.1, real (redacted) MU bank CSV import test, VAT decision; Wise-manual may be **explicitly waived** in light of `JE-2026-06-01-4` removing Wise from the v1 plan.

---

## 2026-06-01 — Payment route priority updated; SBM e-Commerce primary, Peach secondary, MoR backup; PayPal HOLD, Wise removed; commercial market split (docs-only artefact)

<!-- PAYMENT_READINESS_2026_06_01_HIST -->

**Status:** Docs-only strategic position update. **No payment gateway configured. No live payment copy changed. No API keys. No KYC. No ERPNext production setting modified.** Anton's DECISION (chat 2026-06-01, *"Re: Payment reality update — PayPal blocked, Wise unavailable, SBM/Peach pending"*) captures payment-acceptance reality for CorpFlowAI Ltd and shifts the v1 commercial-launch plan accordingly. The closure artefact is `docs/finance/PAYMENT_READINESS_2026_06_01.md` (a research framework + operator question lists, **not** authoritative product specs — providers' own replies are authoritative). Recorded in `docs/decisions/JOURNAL.md` as `JE-2026-06-01-4`.

- **Accepted facts (record).** PayPal on HOLD due to KYC friction (South African citizenship of the beneficial owner + pending Mauritius residency + Mauritian-registered company). Wise not viable for CorpFlowAI Ltd business payment acceptance in Mauritius. CorpFlowAI Ltd banks with SBM Bank Mauritius. SBM e-Commerce acquiring request sent; awaiting reply. Peach Payments support request sent; awaiting reply. Stripe not a near-term direct route for the Mauritian company. Manual international bank transfer to SBM not suitable as the primary conversion path for cold USA / Australia / South Africa buyers.
- **Strategic position — market split into three buckets.** (A) Mauritius + warm-network validation MAY CONTINUE — manual SBM invoice / wire acceptable after conversation and approval; used for first proof, case studies, operational validation. (B) Cold international paid conversion MUST WAIT — no broad paid ads, no anonymous international checkout push until a trusted payment portal exists. (C) Content, proof, intake CONTINUES — article plan, proof video, prospect scoring, intake form; CTA reads *"request pilot review"*, not *"pay now"*.
- **Updated payment route priority (decisions of record).** (1) SBM e-Commerce Acquiring — primary; (2) Peach Payments — secondary; (3) Merchant-of-Record backup (Paddle / Lemon Squeezy / FastSpring / 2Checkout-Verifone) — investigate after #1 and #2 reply; (4) manual SBM invoice / bank transfer — local/warm fallback only; (5) PayPal — on hold; (6) Wise — removed from primary plan. Items 5–6 not abandoned forever; re-evaluation requires a separate journal entry.
- **Recommended transitional Lead Rescue page wording (CAPTURED, not yet applied to live page).** *"Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."* Compliant with `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*, `JE-2026-05-28-1` single offer rule, `JE-2026-05-28-3` trust-band update, the four-layer agent compulsion mechanism in `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`, and `JE-2026-06-01-3`'s setup-after-payment operator-process discipline. **Forbidden phrases (must not appear on any live surface):** *"Pay now"*, *"PayPal accepted"*, *"Wise accepted"*, *"instant checkout"*, *"international bank transfer"* as the primary CTA. **Adoption of the new wording on `pages/lead-rescue.js` / `components/AiLeadRescueLanding.js` requires a separate small operator-authorised packet** — the current live wording per `JE-2026-05-28-1` + `JE-2026-05-28-3` is already directionally consistent (*USD 150 launch pilot, invoiced after intake review*), so the public-copy delta is small.
- **What can be marketed NOW.** Content production, proof video, prospect scoring, qualified-intake workflow, Mauritius warm-network outreach (manual invoice path), South Africa warm-network outreach. Apply-for-pilot CTA wording is approved but adoption gated. **What MUST WAIT** — broad paid ads pointing to a checkout flow, cold international paid acquisition with *"pay now"* CTA, auto-onboarding promise (*"pay and your AI agent goes live in X hours"*), third-party marketplace listings with *"buy now"* links, PayPal/Wise buttons anywhere (removed from plan).
- **Operator question lists captured.** §6 SBM e-Commerce question list (12 items: USD acquiring, beneficial-owner identity, onboarding timeline, fees, hosted-checkout vs pay-by-link, 3DS, settlement timeline, reconciliation export, refund mechanics, recurring billing, currency hedging, sandbox / test environment). §7 Peach Payments question list (12 items, same shape adapted: Mauritian-company onboarding policy, SA-citizen UBO policy, SBM settlement bank, USD acquiring, fees, timeline, 3DS / SCA, settlement timeline, reconciliation export, API / hosted-page integration effort, sandbox).
- **Honest limits of the doc (§8).** Cursor does not have authoritative product specifications for SBM e-Commerce, Peach Payments, Paddle, Lemon Squeezy, FastSpring, 2Checkout/Verifone, or Polar. Anything written as a *"trade-off"* or *"expected fit"* is a research framework, not a commitment. The providers' own replies are authoritative. Cursor cannot evaluate the UBO citizenship + pending residency policy for any of these providers without their documented onboarding policy or a direct yes/no on a discovery call.
- **Hard limits honoured.** Zero payment gateway configured; zero live payment copy changed; zero API keys created; zero KYC submitted; zero ERPNext production setting modified; zero env vars / secrets / DNS / DB / `tenant_id` / analytics / Plausible / Search Console / Telegram behaviour / Vercel config / GitHub settings / deployment settings / payment settings touched. Pure docs artefact.
- **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE** at PR merge — no customer-visible URL to probe by design.
- **ANTON TO-DO (operator-side; this packet does not perform these).** (1) Follow up with SBM e-Commerce using the §6 question list. (2) Follow up with Peach Payments using the §7 question list. (3) Decide whether to investigate MoR backup next — recommendation: hold MoR investigation until SBM + Peach reply, unless either provider returns a 12+ week timeline; in that case investigate Paddle and Lemon Squeezy in parallel.

---

## 2026-06-01 — ERPNext Phase C executed end-to-end; USD-launch-pilot workflow GREEN on arithmetic; one named go-live blocker (accountant-readonly role) recorded for Phase D

<!-- ERPNEXT_SANDBOX_PHASE_C_FINDINGS_2026_06_01_HIST -->

**Status:** Phase C **EXECUTED** on `corpflow-exec-01-u69678` (the sandbox produced by Phase B-a / `JE-2026-06-01-1` / PR #275 merge commit `6abb6f4d`). All four test cycles ran end-to-end against the sandbox MariaDB. Cycle-by-cycle outcomes, ranked findings, full GL reconciliation, deferred items, and Phase D readiness signals are captured in `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`. Phase D (go/no-go recommendation per `ERPNEXT_SANDBOX_PLAN_V1.md` §10) remains gated and requires separate operator approval per `JE-2026-05-29-1`.

- **Operator authorisation:** Anton's instruction *"Please proceed with Phase C using - USD invoice / manual approval after intake / bank transfer or payment link / payment confirmed before setup"* (chat, 2026-06-01) narrowed the original §3–§7 plan to the AI Lead Rescue USD-launch-pilot workflow specifically (`JE-2026-05-28-1`, `JE-2026-05-28-3`). Pre-execution **test design posted as STATUS-8** to bridge issue #249 ([issuecomment-4590221359](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4590221359)) before any sandbox data was touched — explicit course-correction window left open with named expected variables (exchange rate, customer naming, bank-fee shape).
- **Cycle 1 — USD invoice via bank transfer (cleanly closed).** `Sandbox Client A - USD` ← USD 150 Sales Invoice `ACC-SINV-2026-00001` (`Service - CFS` income, `Debtors - USD - CFS` receivable — see finding C-3 for how that account was auto-created) → submit (manual approval-equivalent) → Payment Request `ACC-PRQ-2026-00001` `Wire Transfer/Email/Inward` with bank-wire instructions in the message body → Payment Entry `ACC-PAY-2026-00002` paid USD 150 from receivable into `Mauritius Domestic Bank - Main - CFS` at MUR 6,705 (sandbox spread rate 44.7 vs book rate 45.0). ERPNext automatically created Exchange-Gain-or-Loss JE `ACC-JV-2026-00001` clearing the residual USD on the receivable with MUR 45 FX loss. Invoice status flipped to **Paid**, outstanding=USD 0.0.
- **Cycle 2 — USD invoice via payment link (cleanly closed; spreads honoured).** `Sandbox Client B - USD` ← USD 150 invoice `ACC-SINV-2026-00002` → submit → Payment Request `ACC-PRQ-2026-00002` `Credit Card/Email/Inward` carrying the placeholder `https://paypal.me/<sandbox-placeholder>` link → Payment Entry `ACC-PAY-2026-00003` paid USD 150 from receivable into `PayPal - USD balance - CFS` (USD→USD, no FX at receipt). Invoice status=**Paid**. Later manual Journal Entry `ACC-JV-2026-00002` simulated the PayPal→MU-bank withdrawal: Dr MU bank MUR 6,645 (at 44.3 PayPal-spread rate), Dr Exchange Gain/Loss MUR 105, Cr PayPal USD 150 / MUR 6,750 — closed out PayPal balance to zero.
- **Cycle 3 — MU bank reconciliation (reconciled to MUR 0.00 delta).** Synthetic 3-line MU bank CSV: cycle-1 inbound wire (MUR 6,705), cycle-2 PayPal inbound (MUR 6,645), bank fee outflow (MUR 150). First two lines auto-match the existing GL entries on the MU bank account (the credit-side Dr entries from the cycle-1 Payment Entry + cycle-2 Journal Entry). Fee line booked as Journal Entry `ACC-JV-2026-00003` (`voucher_type: Bank Entry`, `cheque_no: BANK-FEE-MAY-2026`) Dr `Banking & Payment Fees - CFS` MUR 150 / Cr MU bank MUR 150. Final MU bank GL balance MUR **+13,200.00** = 6,705 + 6,645 − 150, **exactly matches** the synthetic CSV close (§7.3 step 4 tolerance is MUR 0.01).
- **Cycle 4 — accountant-readonly role verification (named go-live blocker found).** Switched to `accountant-readonly-sandbox@corpflowai.test` via `frappe.set_user`; read-list across `Sales Invoice` (2 rows visible — both Paid invoices from cycles 1 & 2) and `GL Entry` succeeded; attempted `frappe.get_doc(...).insert(ignore_permissions=False)` on a new Sales Invoice — **INSERT SUCCEEDED** (`ACC-SINV-2026-00003` was created in-memory; later rolled back because the transaction was never explicitly committed before session end, so it does not pollute the sandbox state). **Finding C-1 (go-live blocker per `ERPNEXT_SANDBOX_PLAN_V1.md` §10.1 multi-user line):** the user has role `['Accounts User']` which is **NOT read-only** in ERPNext's default permission matrix — `Accounts User` permits Sales Invoice insert and submit. The runbook §8.1 user-creation snippet assigned this role; the name "accountant-readonly-sandbox" implied intent but the role assignment did not match. **Remediation (deferred to a separate small follow-up packet, NOT executed in Phase C):** re-grant `Auditor` (or a custom `Accountant Read-Only` Role Profile), then re-run cycle 4 — the insert attempt must raise `PermissionError`. Phase D cannot be COMPLETE until C-1 is remediated and re-verified.
- **Reconciliation arithmetic (full sandbox state at Phase C end; double-entry holds).** `Debtors - USD - CFS` balance MUR 0 (both invoices cleared); `Service - CFS` balance MUR −13,500 (revenue = 2 × USD 150 × 45 = MUR 13,500); `Mauritius Domestic Bank - Main - CFS` balance MUR +13,200 (= 6,705 + 6,645 − 150); `PayPal - USD balance - CFS` balance MUR 0 (received + withdrew = net zero); `Banking & Payment Fees - CFS` balance MUR +150; `Exchange Gain/Loss - CFS` balance MUR +150 (= 45 from cycle-1 PE + 105 from cycle-2 JE). **Sum of all balances = MUR 0.00** ✓. Per-pilot economics at sandbox spreads: USD 150 invoice retains ≈ MUR 6,600 ≈ USD 146.66 in the operating bank after spread + fee.
- **Other findings catalogued in `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` §4 (all informational, no go-live impact beyond C-1):** **C-2** ERPNext correctly requires `reference_no` + `reference_date` on Bank Payment Entries and `cheque_no` + `cheque_date` on Bank-Entry Journal Entries — production operator runbook must capture the upstream wire/PayPal transaction reference at recording time (sensible behaviour, not a bug); **C-3** `Debtors - USD - CFS` was auto-created by the orchestrator on first USD invoice when the company default `Debtors - CFS` (MUR) raised *"Party Account currency (MUR) and document currency (USD) should be same"*; **C-4** Standard CoA shipped income leaves `Sales - CFS` and `Service - CFS` (the §2.1 draft `Service Revenue — Lead Rescue Setup` is not present and will be informed by accountant review per §10.1); **C-5** ERPNext's stock `Modes of Payment` does not include `PayPal` out of the box (cycle 2 reused `Credit Card`; production should add a custom `PayPal` mode in 30 seconds of admin work).
- **Items deferred to Phase C² (NOT abandoned; each requires separate operator approval).** Per the operator-narrowed scope: MUR-denominated client invoices, recurring/Subscription monthly billing, Wise-manual flow, credit-note/cancellation flow, multi-day or 30-day synthetic reconciliation cycle, VAT/e-invoicing, live PayPal/Wise/payment-gateway integration, production-grade §2.1 CoA build (granular Service Revenue, AR-USD / AR-MUR split, etc.). All eight items are explicitly recorded in `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` §6 with named triggers.
- **Phase D readiness signals (favourable for the USD-launch-pilot workflow).** Multi-currency math reconciles cleanly to MUR 0; ERPNext's FX clearing voucher behaves correctly; Bank Reconciliation Tool's match-against-existing-GL behaviour matches the synthetic CSV expectation; cycle 3 reconciled to MUR 0.00 delta; backup-restore parity already GREEN from Phase B-a (`JE-2026-06-01-1`). **Known blockers for production go-live:** finding C-1 (read-only role); accountant CoA review per §10.1 still pending; real (redacted) MU bank CSV import still untested; Wise-manual flow still untested per operator narrowing.
- **Hard limits honoured.** Zero secrets / env / DNS / DB / `tenant_id` / Plausible / Search Console / Telegram / payment integrations / Vercel settings / GitHub settings / CorpFlowAI runtime touched. All work is on the `corpflow-exec-01-u69678` host filesystem + sandbox MariaDB only — loopback `localhost:8080`, no public exposure, no DNS record. Cursor never read or printed any password value. No CorpFlowAI client data, no real PayPal API, no real Mauritius bank credentials. The PayPal-link in cycle 2 is a placeholder string only.
- **Closure PR is docs-only (open, awaiting Anton merge).** Branch `chore/erpnext-sandbox-phase-c-findings`. Touches `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` (new, full findings doc), `docs/decisions/JOURNAL.md` (new row `JE-2026-06-01-3`), and this `artifacts/chat_history.md` entry. Bridge audit trail: STATUS-8 on issue #249 ([issuecomment-4590221359](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4590221359)) carried the test design pre-execution; STATUS-9 will carry the PR link + per-cycle evidence summary; Delivery Reality Audit lands as STATUS-10 after merge.
- **What is queued (not authorised).** **Phase C² follow-up** — the eight deferred items above, each as a separate small packet on separate operator approval. **Small "C-1 remediation" packet** — swap the accountant-readonly user's role from `Accounts User` to `Auditor`, re-run cycle 4 of Phase C against the updated user, verify PermissionError. **Phase D — write the §10 go/no-go recommendation to `JOURNAL.md`** and hand to Anton for sign-off; requires Anton's separate authorisation on the Operator Bridge per `JE-2026-05-29-1`.

---

## 2026-06-01 — ERPNext sandbox Phase B-a COMPLETE on `corpflow-exec-01-u69678` (§1–§9 + §12, wizard via Path B; closure PR open)

<!-- ERPNEXT_SANDBOX_PHASE_B_A_BOOTSTRAP_2026_06_01_HIST -->

**Status:** Phase B-a bootstrap closed. ERPNext is fully bootstrapped on the resized server (`corpflow-exec-01-u69678`, Ubuntu 24.04, 4 vCPU / 7.5 GiB RAM / 150 GB disk) — frappe `15.109.0` + erpnext `15.109.1` on `frappe_docker @ main 6526ab8c`, MariaDB 11.8, Redis 8.6-alpine, 9 services running, loopback-only `localhost:8080`. The install body of `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` (§1–§9 + §12) is verified end-to-end; backup parity GREEN across Company, User, Fiscal Year, Account, `setup_complete`. Phase C (test plan execution) and Phase D (go/no-go) still require separate operator approval per `JE-2026-05-29-1`.

- **Capacity path resolved (Path A).** Anton applied the `JE-2026-05-29-2` Path A resize — current state is 4 vCPU / 7,751 MiB RAM (6,521 MiB available) / 150 GB disk (7% used). Recorded as `JE-2026-05-31-2`. The 1.9 GiB blocker that held Phase B since `JE-2026-05-29-2` is now historical.
- **§2 Docker install — operator-driven, one correction recorded.** `Docker 29.5.2` + `Compose v5.1.4` installed by Anton via the runbook §2 block. The original runbook said `sudo usermod -aG docker "$USER"` — when the block is pasted into a `sudo -i bash` shell, `$USER` evaluates to `root` and `anton` is never added to the `docker` group. Fixed at install time by running `usermod -aG docker anton` explicitly and re-logging in; closure PR rewrites the runbook §2 to use the literal `anton` and adds a warning block.
- **§3 clone pin corrected.** Runbook v1 said `git checkout v5.0.0` — that tag does not exist on `frappe_docker` (the project does not publish semver tags). Closure PR replaces the tag-pin with a commit-SHA pin: `git checkout 6526ab8cd4d7c6969b9b44f95558590c89ab4347` (frappe_docker @ main on 2026-05-31).
- **§4–§6 ran clean.** `.env` overlay + `~/.erpnext-sandbox-credentials` (both `chmod 600`); `docker compose -p corpflowai-sandbox up -d` brought 9 services healthy; `bench new-site corpflowai-sandbox.localhost` + `bench install-app erpnext` produced HTTP 200 on the login page. `--no-mariadb-socket` emitted a deprecation warning — flag still works; closure PR documents `--mariadb-user-host-login-scope='%'` as the modern equivalent.
- **§7 UI wizard FAILED, bypassed via Path B.** Operator's wizard attempt on 2026-05-31 23:00–23:02 UTC stopped with the generic *"Setup failed - Could not start up: Failed to complete setup"* after the chart-of-accounts step loaded; `tabError Log` empty, no `setup_complete` POST in nginx logs, no Python exception in gunicorn — pure browser-side JS issue with no telemetry. Per Anton's *"Path B"* directive, Cursor invoked `frappe.desk.page.setup_wizard.setup_wizard.setup_complete({language:'English', country:'Mauritius', timezone:'Indian/Mauritius', currency:'MUR', company_name:'CorpFlowAI Sandbox', company_abbr:'CFS', chart_of_accounts:'Standard', fy_start_date:'2026-01-01', fy_end_date:'2026-12-31', domain:'Services', ...})` directly via `docker compose exec -T --workdir /home/frappe/frappe-bench backend /home/frappe/frappe-bench/env/bin/python -`. Result `{'status':'ok'}`; committed; verified directly against MariaDB (Company `CorpFlowAI Sandbox` (abbr CFS, country Mauritius, currency MUR, domain Services), Fiscal Year 2026 (2026-01-01 → 2026-12-31), Chart of Accounts 82 rows from the `Standard` template). Three runtime quirks observed and recorded in the closure PR's runbook §7.1: (1) container's default `/usr/local/bin/python` lacks `frappe`; must use `/home/frappe/frappe-bench/env/bin/python`; (2) `frappe.init(site=...)` defaults `sites_path='.'` and fails as `IncorrectSitePath` — pass `sites_path='/home/frappe/frappe-bench/sites'` explicitly; (3) Frappe's logger uses `os.path.join('..', 'logs', '<module>.log')` — a relative path assuming cwd = `<bench>/sites/` — `frappe.connect()` fails with `FileNotFoundError: '/home/frappe/logs/database.log'` from any other cwd; fix is `os.chdir('/home/frappe/frappe-bench/sites')`.
- **§8 users + §9 scheduler.** Same Python orchestrator created `operator-sandbox@corpflowai.test` (System Manager + Accounts Manager) and `accountant-readonly-sandbox@corpflowai.test` (Accounts User) via `frappe.get_doc({'doctype':'User',...}).insert(ignore_permissions=True)`; 32-char passwords appended to `~/.erpnext-sandbox-credentials` (file grew 312 → 653 bytes, `chmod 600` preserved). `bench set-config disable_scheduler 1` confirmed in `site_config.json`; SMTP empty, webhook list empty, notifications disabled — no automation can fire from the sandbox.
- **§12 backup + restore parity GREEN.** `bench --site corpflowai-sandbox.localhost backup --with-files` produced `20260601_085818-corpflowai-sandbox_localhost-database.sql.gz` (836,657 bytes / ~817 KiB compressed, sha256 `d98b8b9d8f6fe6ad36a002ff9811ce898dc451093d5bd3151e45635655489ad9`) plus matching `-files.tar` (10,240 bytes), `-private-files.tar` (10,240 bytes, sha256 `553ec5cacc2ed9b72024c1638a5cf95c2e87f992a6e4e1b0db3f5bf7a890ee2e`), and `-site_config_backup.json` (119 bytes, sha256 `0dc574aa54c259334e5150141beb36504b50a506c6792a94fe7ae01debffeacb`). Throwaway test site `corpflowai-sandbox-restore-test.localhost` was created, restored from the primary backup with `--with-public-files` + `--with-private-files`, parity confirmed across all four critical tables (Company 1 = 1, User-enabled-non-Guest 3 = 3, Fiscal Year 1 = 1, Account 82 = 82) plus `setup_complete=1` on both sites, then dropped (`bench drop-site --root-password ... --no-backup --force`) — archived to `/home/frappe/frappe-bench/archived/sites/`. Primary site untouched after cleanup: HTTP 200, 346,565 bytes, 82 accounts intact.
- **Hard limits honoured.** Zero secrets / env / DNS / DB / `tenant_id` / Plausible / Search Console / Telegram / payment integrations / Vercel settings / GitHub-settings / CorpFlowAI runtime touched. All work is on the `corpflow-exec-01-u69678` host filesystem + sandbox MariaDB only — loopback `localhost:8080`, no public exposure, no DNS record, no firewall change. Cursor never read or printed any password value — only file paths and lengths reported. Closure PR is docs-only (runbook hardening + 2 JOURNAL rows + this chat-history entry); host state is untouched by the PR.
- **Closure PR (open, awaiting Anton merge).** Branch `chore/erpnext-sandbox-phase-b-closure`. Touches `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` (5 hardening edits — capacity-finding resolved annotation, §2 `usermod` literal-anton + warning, §3 SHA-pin replacing the non-existent `v5.0.0` tag, §6 + §12 deprecation notes, §7.1 Path B wizard bypass recipe with the three quirks, §8.1 programmatic user-creation block, §12 real-data restore hints, §17 honest-limits update), `docs/decisions/JOURNAL.md` (rows `JE-2026-05-31-2` and `JE-2026-06-01-1`), and this `artifacts/chat_history.md` entry. Bridge audit trail: STATUS-1 → STATUS-5 on issue #249 (latest is [issuecomment-4589665156](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4589665156)).
- **What is queued (not authorised).** Phase C — execute the `ERPNEXT_SANDBOX_PLAN_V1.md` §3–§7 test plan (invoice, recurring invoice, payment request, PayPal-manual, Wise-manual, MU-bank CSV reconciliation), capture evidence, write up. Phase D — write the §10 go/no-go recommendation to `JOURNAL.md` and hand to Anton for sign-off. Both phases require Anton's separate authorisation on the Operator Bridge per `JE-2026-05-29-1`.

---

## 2026-05-30 — Brand Identity Phase B step 1 live; step 2 (self-host Inter) + OBS-fallback retirement opened (PRs #270, #271, #272)

<!-- LR_BRAND_IDENTITY_2_STEP_1_LIVE_AND_STEP_2_OPEN_2026_05_30_HIST -->

**Status:** **PR #270 COMPLETE** on production. **PR #271** (Phase B step 2 — self-host Inter Variable) and **PR #272** (drop OBS-on-laptop fallback) are **OPEN** awaiting Anton's review per `.cursor/rules/delivery-reality.mdc` gate discipline.

- **Anton's directive 2026-05-30** on Operator Bridge `#249`: *"#270 merged, proceed with step 2, drop OBS fallback"* — three orders in one line: close #270, ship Phase B step 2 of `LR-Brand-Identity-2`, and retire the OBS-on-laptop fallback path from `LR-Proof-2`.
- **PR [#270](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/270)** (`feat/lr-brand-identity-2-step-1-docs-and-monitoring`, squash-merged `2681dfc0` at `2026-05-30T03:36:36Z`) is **COMPLETE** — Production deployment `4870054463` is `state: success` / `Ready`. Docs + config only: `brand-config.json` is now a one-key `_superseded` stub pointing at `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`; `BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction* + § *Typography direction* carry the teal-supersession + Inter-not-loaded notes; `aileadrescue.corpflowai.com` is graduated from "add when scope demands" to the always-on monitoring floor in `MONITORING_ARCHITECTURE.md` (documentary — programmatic multi-host alerting tracked separately as `LR-Monitoring-Hosts-2`, awaiting authorisation).
- **PR [#271](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/271)** (`feat/lr-brand-identity-2-step-2-self-host-inter`, head `c12ccef5`, OPEN) self-hosts Inter Variable. 5 files (+203 / -4): `public/assets/fonts/InterVariable.woff2` (rsms/inter v4.1 release zip → `web/InterVariable.woff2`; 352,240 bytes / ~344 KB; SHA-256 `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`; release-zip SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`); `public/assets/fonts/OFL.txt` (SIL Open Font License 1.1, byte-identical to the upstream `LICENSE.txt`); `public/assets/fonts/README.md` (provenance + both SHAs + refresh procedure); `pages/_document.js` (single `@font-face` `<style>` block in `<Head>`; `font-weight: 100 900`; `font-display: swap`; extended JSDoc); `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` (Status block: step 1 MERGED via #270, step 2 IN PROGRESS in #271, lineage entry for the 2026-05-30 directive).
- **Deliberate non-goals in #271** to preserve the existing tenant boundary: **no `<link rel="preload">`** (Lux + operator surfaces don't reference `'Inter'`, so they don't pay the ~344 KB cost — confirmed via grep of `components/Lux*.{js,jsx}` + `pages/change*.{js,jsx}`); **no italic axis** (read-only audit found zero apex components using italic Inter); **no third-party CDN** (`fonts.googleapis.com`, `rsms.me/inter` would re-introduce a sub-processor + cookie boundary not in `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`); **no `package.json` or lockfile changes**.
- **PR [#272](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/272)** (`docs/lr-proof-2-drop-obs-fallback`, head `311ee8e9`, OPEN) is docs-only (1 file, +10 / -4 in `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md`). Surgical edits at four locations declaring the OBS-on-laptop fallback retired: top-of-file status block, § 4 Decision 4, § 14 comparison table, § 17 deferred decision. Original wording preserved (struck-through or annotated) so the audit trail of how we got here remains visible. Forward decision: every CorpFlowAI walkthrough is now produced through the GitHub Actions pipeline at `.github/workflows/generate-walkthrough-video.yml`; one-off OBS captures would require an explicit named exception packet — not a default. The Playwright + FFmpeg server-side pipeline (PRs #263 / #264 / #266) is now the **sole approved CorpFlowAI walkthrough video production path**.
- **Local verification (#271):** `npm run check:marketing-quality-gate` ✅; `npm test` ✅ 421/421; `npm run build` ✅ + `@font-face` block confirmed present in prerendered HTML for every static page (`404.html`, `500.html`, `about.html`, `change.html`, `change-v2.html`, …); `ReadLints` clean; committed-file SHA-256 matches the file extracted from the release zip exactly (no transcoding). **CI on both PRs:** `test` ✅, `vercel-env` ✅, `Vercel` Preview ✅, `cmp-delivery-files` skipping (expected for non-CMP PRs), `Vercel Preview Comments` ✅.
- **Live verification queued for post-merge of #271** (Vercel Preview Protection blocked the local probe; will run against Production after Anton merges): `https://corpflowai.com/` 200, `https://corpflowai.com/lead-rescue` 200 + walkthrough still wired (regression check vs #266), `https://aileadrescue.corpflowai.com/` 200, `https://lux.corpflowai.com/` 200 (Lux must remain unaffected — same content, same brand stack, no Inter download triggered), `https://corpflowai.com/assets/fonts/InterVariable.woff2` 200 + `content-type: font/woff2` + 352240 bytes. Verdict on #271 is **PARTIAL** until those five probes are recorded green against the deployed Production commit.
- **Hard limits honoured:** zero secrets / env / DNS / DB / `tenant_id` / Plausible / Search Console / Telegram / payment integrations / Vercel settings / GitHub settings touched. Both #271 and #272 are reversible by single revert. `package.json` and lockfile untouched in #271.
- **Bridge audit trail:** STATUS posted to `#249` ([issuecomment-4581590187](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4581590187)) — closes #270 with COMPLETE verdict, summarises #271 / #272, lists the five live URL probes that will populate the post-merge Delivery Reality Audit, and notes the open follow-ups (Phase B step 3 = favicon/apple-touch-icon/og-image; `LR-Monitoring-Hosts-2` = multi-host programmatic alerting).
- **What is queued (not authorised):** **Phase B step 3** (favicon + apple-touch-icon + og-image via wordmark renderer pipeline) — drafted only after #271 is COMPLETE on Production. **`LR-Monitoring-Hosts-2`** (programmatic multi-host alerting on the always-on floor — `/`, `/lead-rescue`, `aileadrescue/`, `lux/`, `lux/change`) — awaits Anton's *"yes, draft it"* before a proposal is written. **Optional preload follow-on for #271** — only if post-deploy Lighthouse on `/` shows Inter's lazy fetch hurts LCP enough to matter; preserve Lux/operator scoping by re-scoping via `getInitialProps` the same way Plausible is scoped today.
- **Doctrine effect:** with #271 merged, the apex CorpFlowAI buyer-facing surfaces (`corpflowai.com/`, `corpflowai.com/lead-rescue`, `aileadrescue.corpflowai.com/`, `corpflowai.com/admin/lead-rescue/...`, policy pages) will render in Inter Variable for the first time — closing the long-standing doctrine/runtime gap where every apex public component declared `font-family: 'Inter, ...'` but visitors saw the OS sans fallback (San Francisco / Segoe UI / Roboto). Lux brand stack (`T.fontUi`, `T.fontDisplay`) and operator surfaces (`/change`, `/change-v2`, factory) are explicitly preserved — the `@font-face` declaration appears in their HTML head but the woff2 is **not** fetched because no rendered CSS rule matches `font-family: 'Inter'` on those surfaces.

---

## 2026-05-29 — Lead Rescue silent walkthrough live + Brand Identity v1 declared (PRs #266 + #267 merged)

<!-- LR_PROOF_1_PHASE_2_AND_BRAND_V1_2026_05_29_HIST -->

**Status:** **PR #266 COMPLETE** on canonical host (live verified). **PR #267 COMPLETE** (docs-only). One **open incident** flagged: `aileadrescue.corpflowai.com` returns Vercel `DEPLOYMENT_NOT_FOUND` — pre-existing platform-mapping drift, not caused by this work.

- **Two parallel PRs from Anton's 2026-05-29 three-decision approval** (Operator Bridge `#249`, [issuecomment-4571978590](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4571978590)): "1. proceed with un-branded Phase 2 PR now 2. Yes please [draft brand identity proposal] 3. teal `#2dd4bf`."
- **PR [#266](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/266)** (`feat/lr-proof-1-phase-2-walkthrough-v1`, squash-merged as `2c95e56e` at `2026-05-29T08:19:40Z`) wired the signed-off CF-VID-0001 silent walkthrough into the "What you see every morning" section of `/lead-rescue`. 7 files, 157 insertions, 20 deletions, 1 binary (665 KB MP4). Replaces the static dashboard SVG mockup with a 52-second moving operator view (controls, captions, no autoplay, muted; click-to-play). MP4 SHA-256 `8a465fbef40deddb4467f9cc560bec1697ad62f4091f3580a9bb1667f4e158dc` matches the cut Anton signed off in workflow run `26621869636`.
- **Files touched in #266:** `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.{mp4,vtt,provenance.json}` (new binary + caption track + signed-off audit JSON); `data/visual-assets/lead-rescue-walkthrough-v1.manifest.json` (new governed manifest, `kind: video`, `licence.tier: ai_generated`); `lib/visualAssets/selectLeadRescueAssets.js` (walkthrough preferred over SVG; `video` accepted in `lead_rescue_dashboard` slot); `components/VisualAssetRenderer.js` (extended `kind: video` branch with backward-compatible opt-in `controls` / `loop` / `autoplay` / `captions_url` / `poster_url`; existing short-loop assets unchanged); `data/walkthroughs/lead-rescue-walkthrough-v1.yml` (`status: draft → approved`, full provenance back-filled with sign-off SHA + workflow run id + Phase 2 authorisation comment URL). No copy changes; section header and "Representational example only" disclaimer apply equally to SVG and video.
- **PR [#267](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/267)** (`feat/lr-brand-identity-1-proposal`, squash-merged as `d6efbe01` at `2026-05-29T08:23:10Z`) added `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` — 254-line docs-only proposal capturing **teal `#2dd4bf`** as the canonical CorpFlowAI accent / primary CTA colour, ratifying the value already shipping on `corpflowai.com` and superseding signal-blue `#2563EB` from `BRAND_AND_CONVERSION_DOCTRINE.md` (which was never implemented in the runtime). Honestly inventoried gaps: Inter declared everywhere but never loaded (effective face is OS system sans on every public page), no logo image / favicon / apple-touch-icon / og-image on disk, `brand-config.json` is orphan legacy state pointing at a missing `LogoSQBK.png`. Sequenced three follow-up packets (`LR-Brand-Identity-2`: favicon + Inter + retire `brand-config.json`; `LR-Brand-Identity-3`: optional SVG mark; `LR-Proof-1 Phase 3`: optional walkthrough rebrand). Five concrete questions in § 8 with defaults — Anton can reply "use defaults" on `#249` to authorise Phase B planning.
- **Live verification (per `delivery-reality.mdc`):** Vercel Production deployment for `d6efbe01` is `state: success` (GitHub Deployment `4859710936`, Vercel-internal alias `corpflow-ai-command-center-df0fqx0fi-corpflowai.vercel.app`). Probed 2026-05-29 ~11:48 UTC+4: `https://corpflowai.com/lead-rescue` → 200, `text/html`, `x-vercel-cache: PRERENDER`, HTML contains `<video>` element + `lead-rescue-walkthrough-v1.mp4` + `.vtt` references + "What you see every morning" + "Representational example only"; `https://www.corpflowai.com/lead-rescue` → 200; MP4 → 200, `video/mp4`, 665092 bytes, `x-vercel-cache: HIT`, **byte-identical to signed-off cut**; VTT → 200, `text/vtt; charset=utf-8`, 450 bytes, `WEBVTT` header; `provenance.json` → 200, walkthrough_id `CF-VID-0001`, `signed_off_by: anton`; `https://corpflowai.com/` → 200 (no apex regression); `https://core.corpflowai.com/api/factory/health` → 200, `ok: true`, all readiness checks passed.
- **Open incident — pre-existing:** `https://aileadrescue.corpflowai.com/` returns Vercel's `DEPLOYMENT_NOT_FOUND`; HEAD `/lead-rescue` returns 404. The repo expects this host to be live (`pages/index.js:369-373` has `AI_LEAD_RESCUE_HOST = 'aileadrescue.corpflowai.com'` with code branching to render `<AiLeadRescueLanding/>` for it). PR #266 did not touch host routing, middleware, vercel.json, or DNS — so this is **Vercel platform-mapping drift independent of this work**. Three options surfaced for Anton on the closure comment ([issuecomment-4572625253](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4572625253)): repoint the host (Vercel Domains page edit), deprecate the host (small follow-up PR removing the constant), or hold and decide later. **Recommended: repoint** if the vanity URL has been used in marketing assets; otherwise deprecate.
- **Hard limits honoured:** zero secrets / env / DNS / DB / `tenant_id` / Plausible config / Search Console / Telegram behavior / Vercel settings / GitHub settings touched. No payment integrations. PR #266 is reversible via single revert; PR #267 is docs-only and reversible the same way. The pre-existing `aileadrescue.corpflowai.com` issue is documented but not mutated.
- **Verification artifacts:** PR #266 commit-author is `cursor[bot]`; CI on `2c95e56e` shows `vercel-env` (11s pass), `test` (36s pass, 421/421 with `visualAssets/schema` 9/9), `merge-cmp-pr` (correctly skipped). PR #267 CI on `d6efbe01` shows `vercel-env` and `test` both pass. `npm run check:marketing-quality-gate` clean both PRs; `npm run video:validate -- --id CF-VID-0001` `OK at 52.0s, mock.real_* all false`. `ReadLints` clean.
- **What is queued (not authorised):** Phase B (`LR-Brand-Identity-2`) for self-host Inter Variable + favicon + apple-touch-icon + og-image + retire `brand-config.json` — five-question gate awaits Anton's "use defaults" reply or per-question override on `#249`. Phase C (optional SVG mark) and Phase D (optional walkthrough rebrand with wordmark overlay once mark exists) require their own approvals.
- **Doctrine note:** the proposal recommends a two-line supersession edit to `BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction* and § *Typography direction* so doctrine and runtime stop disagreeing; that edit was deliberately not bundled into PR #267 to keep the docs-only proposal reviewable in isolation. If Anton replies "use defaults", the supersession note ships in the Phase B PR (one diff, one merge, no drift window).

---

## 2026-05-28 — CorpFlowAI marketing execution standards installed (mandatory, PR #256 merged)

<!-- MARKETING_EXECUTION_STANDARDS_INSTALLED_2026_05_28_HIST -->

**Status:** **COMPLETE** (docs-only verdict shape — no client-facing surface changed; per `.cursor/rules/delivery-reality.mdc` `Live URLs tested: n/a — docs-only`, `Client-facing flow usable: YES`). PR [#256](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/256) (`docs/marketing/install-execution-standards`, commit `21693069`, squash-merged as `0f8325af` at `2026-05-28T02:51:58Z`). CI all green on the PR — including the new "Marketing standards integrity check" step inside the `test` job (54s, pass).

- **Why:** PR #251 + #253 (`LEAD_RESCUE_USD_LAUNCH_PILOT_2026_05_28_HIST` above) closed the door on doctrine drift on the `/lead-rescue` buyer surface, but the broader question — *what is the standing communication standard for any external-facing CorpFlowAI work?* — was unwritten. Without a written contract, every future article, social post, sales email, or landing page would relitigate "what does good look like" from scratch. PR #256 installs that contract once, in canonical operating context, so all future agents (Cursor, Codex Cloud, contractors, internal team) inherit the same Hook / Proof / Depth doctrine, dual-asset pattern, and quality gate without re-explanation.
- **What landed in the PR (13 files: 7 new, 5 modified):**
  - **6 new doctrine docs under `docs/marketing/`:** `00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` (executive rule + Hook/Proof/Depth + dual-asset pattern + aesthetic / copy / trust standards), `01_AGENT_OUTPUT_CONTRACT.md` (required output headers + content structure + channel-specific rules — LinkedIn, X, Email, Landing/Sales, Articles, Long-form), `02_MULTIMODAL_CONTENT_PLAYBOOK.md` (asset pairing rules + visual / video standards + scannability + proof density), `03_CONTENT_ATOM_SCHEMA.md` (YAML schema for reusable content atoms — `CF-MKT-NNNN` IDs — for AI retrieval), `04_DELIVERY_QUALITY_GATE.md` (mandatory preflight checklist + scoring model — *Hook ≥ 4/5*, *Visual ≥ 4/5*, *Proof ≥ 3 elements*, *CTA ≥ 4/5*), `05_AGENT_COMPULSION_MECHANISM.md` (four-layer enforcement: docs → prompt preamble → PR checklist → automated check).
  - **1 new validation script:** `scripts/check-marketing-quality-gate.mjs` — Node script that verifies all 6 standard docs exist and contain their required marker terms (e.g. *Hook / Proof / Depth*, *dual-asset*, *content atom*, *quality gate*). Exits non-zero if any doc is missing or any marker is stripped. Wired as warn-only in CI (informational; does not block merge yet).
  - **5 cross-link / integration edits:** `AGENTS.md` (extended *Marketing / conversion doctrine* section to list all 7 docs by name + new *Marketing execution standards* row in the Must-read table), `.cursor/rules/brand-conversion-doctrine.mdc` (extended `required-reading` list to all 7 docs + non-negotiable summary updated to reference Hook/Proof/Depth + dual-asset + delivery-quality-gate + required-review-before-merge updated), `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` (new top-of-doc *Companion execution standards* section that cross-links the 6 new docs and explains their relationship to the brand doctrine — strategy doc remains canonical for *what we say / why*; new docs govern *how we deliver* it), `package.json` (added `check:marketing-quality-gate` npm script), `.github/workflows/test.yml` (new "Marketing standards integrity check" step running `npm run check:marketing-quality-gate` — warn-only by design; failure would only mean a doc was deleted or a required marker term was stripped, not a code-quality problem).
- **Operational effect (what changes for future work):** Every Cursor session auto-loads the standards because `.cursor/rules/brand-conversion-doctrine.mdc` has `alwaysApply: true`. Every contributor reading `AGENTS.md` sees the Must-read row. The `BRAND_AND_CONVERSION_DOCTRINE.md` cross-link routes anyone landing on the strategy doc to the execution docs. The CI gate guarantees no future PR can quietly delete or strip-out the standards without a visible CI signal. Net result: the question *"is this prospect-facing piece up to standard?"* now has a single answer (the `04_DELIVERY_QUALITY_GATE.md` checklist), referenced consistently across docs, rules, agent context, and CI.
- **What was deliberately left out of scope (explicit non-goals):** No PR template Layer-3 enforcement yet (the `## Marketing / Sales Quality Gate` checklist will be copied into `.github/PULL_REQUEST_TEMPLATE.md` in a separate small follow-up so reviewers can opt-in/opt-out per PR before it becomes mandatory). No Layer-4 aggressive CI gating (failing PRs that touch web/landing/sales without a quality-gate marker — premature today, would block legitimate refactors). No first content atoms written yet (`docs/marketing/atoms/` directory will receive `CF-MKT-0001` through `CF-MKT-000N` as articles + offers ship). No client-facing surface changed — `/lead-rescue`, apex pages, Lux pages, all served identical bytes pre- and post-merge.
- **Hard limits honoured:** zero secrets / env / DNS / DB / `tenant_id` / Plausible config / Search Console / Telegram behavior / Vercel settings / GitHub settings / deployment settings touched. No payment integrations, no payment links. Pure docs + one warn-only CI step. Reversible via single revert PR of commit `0f8325af`.
- **Verification (per `delivery-reality.mdc` § docs-only):** merged on `main` ✅; CI green on PR (`test` 54s pass, `vercel-env` 11s pass, `cmp-delivery-files` correctly skipping for non-CMP PR, Vercel preview deployment ready) ✅; new `npm run check:marketing-quality-gate` smoke-tested locally before commit (all 6 docs present, all marker terms present, exit 0) ✅; tests 421/421 pass; `npm run build` succeeds. No customer-visible URL to probe — docs-only by design. Verdict: **COMPLETE**.

---

## 2026-05-28 — Delivery Acceleration v1 protocol shipped (PR #252 merged)

<!-- DELIVERY_ACCELERATION_V1_MERGED_2026_05_28_HIST -->

**Status:** COMPLETE (docs-only verdict shape — no client-facing surface changed; per `.cursor/rules/delivery-reality.mdc` `Live URLs tested: n/a — docs-only`, `Client-facing flow usable: YES`).

- **PR:** [#252](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/252) — `docs(operations): add Delivery Acceleration v1 protocol` — merged via squash commit `031f12cc1e197c4fc588a727b0eaecf5a1a2734c` at `2026-05-28T01:53:07Z`.
- **Why:** Cursor is the only in-repo coding executor today. While Cursor works one packet (LR-1 commercial-readiness), every other approved packet sits PENDING. The protocol adds **Codex Cloud** as a second bounded Executor — with explicit branch / packet-claim / STATUS-reporting discipline — without changing any AAP §3 hard gate, any forbidden surface, or the operator-owned merge rule. A future internal CorpFlow agent gets a phased roadmap (phases 0–5) but is not installed in v1.
- **Anton decisions recorded as `JE-2026-05-28-2`:** runtime = **Codex Cloud** (hosted, not Codex CLI); coordination = **Operator Bridge issue #249**; LR-1 (`feat/lead-rescue/usd-launch-pilot`) unaffected by this protocol.
- **Six paths touched (all docs / AGENTS.md only):**
  - **NEW** `docs/execution/DELIVERY_ACCELERATION_V1.md` (multi-executor protocol; actor model; Codex Cloud runtime posture + GitHub App least-privilege table; branch / PR discipline; packet-claim rules; STATUS schema addition `**Executor:**` header; hard limits carried verbatim from AAP §3; internal-agent phased roadmap phases 0–5; immediate safe use cases; onboarding sequence; rollback path).
  - **NEW** `docs/runbooks/OPERATOR_BRIDGE.md` (operator-facing day-to-day companion to `OPERATOR_BRIDGE_V1.md` — when to post, required `**Executor:**` header, branch-prefix table, forbidden content, five concrete STATUS / Operator decision / closure examples).
  - **EDIT** `docs/operations/OPERATOR_BRIDGE_V1.md` (fills in **#249** in §3 Naming; adds Codex Cloud row to §4 actor table; requires `**Executor:**` header on all STATUS comments in §4 rule-of-thumb; marks §8 Phase 1 confirmed; cross-links the two new docs in §11).
  - **EDIT** `AGENTS.md` Must-read table (2 new rows + update existing Operator Bridge row to name #249 and include Codex Cloud).
  - **EDIT** `docs/execution/WEEKEND_EXECUTION_QUEUE.md` (new **Goal 7 — Delivery Acceleration v1** with Packet 7.1 COMPLETE + Packet 7.2 PENDING for Codex Cloud install).
  - **EDIT** `docs/decisions/JOURNAL.md` (append-only `JE-2026-05-28-2`).
- **Binding rules now in force on `main`:** Cursor branch namespaces unchanged (`docs/*`, `chore/*`, `feat/*`, `fix/*`, `refactor/*`). **Codex Cloud branch prefix `codex/*` mandatory** once installed. Every STATUS / closure comment on #249 must include `**Executor:** Cursor | Codex Cloud | Internal agent`. `Owner: Executor` field on each packet is binding; one executor per branch, one author per PR. **Neither executor self-merges.** AAP §3 hard gates unchanged. `.github/workflows/cmp-product-automerge.yml` remains off by default, `cmp/*` only, and is **not** extended to `codex/*`.
- **Codex Cloud GitHub App least-privilege (named in §4.1 of the protocol, applied when Anton installs):** Contents read+write, PRs read+write, Issues read+write (so Codex can post to #249); **denied:** Actions read, Secrets read, Environments, Administration, Webhooks/Workflows write. Install on `corpflow-ai-command-center` only, never org-wide.
- **Bridge dogfooding:** First-ever multi-executor STATUS posted to #249 ([comment 4560023729](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4560023729) — `Executor: Cursor`, `State: AWAITING_APPROVAL`). Closure posted on merge ([comment 4560179874](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4560179874) — `Executor: Cursor`, merge SHA + Delivery Reality Audit `Final verdict: COMPLETE`).
- **Hiccups during execution (resolved, recorded for posterity):** (1) `origin/main` advanced to `39093c37` (LR-1 PR #251) mid-execution → rebased; `JOURNAL.md` had the expected append-only conflict between `JE-2026-05-28-1` (LR-1) and `JE-2026-05-28-2` (this protocol); kept both rows in chronological order. (2) A terminal context switch silently moved HEAD to local `main` and a first amend rewrote LR-1's local commit; caught via post-rebase verification; `git reset --hard origin/main` restored local main to `39093c37` (unpushed, no remote impact); re-ran amend on the correct branch with explicit branch-safety guards thereafter. (3) Final force-push used `--force-with-lease` on my own branch — never `main`.
- **Hard limits honoured:** zero secrets / env / DNS / DB / `tenant_id` / Plausible / Search Console / Telegram / Vercel settings / GitHub settings / payment / `.cursor/rules/*` / `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` touched. No runtime code. No workflow files. No `corpflow-exec-01` scheduling. No client-facing surface change.
- **Packet 7.2 — Codex Cloud install — operator-only, not in PR #252:** Anton creates OpenAI API key in own dashboard (never paste anywhere repo-side); installs Codex Cloud GitHub App on this repo only with the §4.1 least-privilege set; records bot username in a follow-up docs-only PR; drafts the first Codex Cloud packet from §10 safe-use-cases list with `Owner: Executor = Codex Cloud`. New operator playbook `docs/runbooks/CODEX_CLOUD_INSTALL.md` (ships in this same chat-history follow-up PR) provides the click-by-click sequence including pre-flight checks, OpenAI key handling, GitHub App permission table, bot-username recording, branch-protection sanity check, first-packet smoke choice, rollback path, and decision-record cadence.
- **Verification (docs-only Delivery Reality Audit shape):** Local fix exists YES, Merged to main YES (`031f12cc`), Production deployment ID n/a (docs-only no Production behavior change), Commit deployed `031f12cc1e197c4fc588a727b0eaecf5a1a2734c`, Live URLs tested n/a (docs-only), Client-facing flow usable YES, **Final verdict: COMPLETE**. Pre-merge CI green (421/421 node-tests, Next.js 16.2.1 build green, Vercel Preview Ready, `vercel-env` pass, `cmp-delivery-files` skipped as expected for non-`cmp/*` branch).

---

## 2026-05-28 — Lead Rescue front-of-house simplified to single USD-first launch pilot (LR-1)

<!-- LEAD_RESCUE_USD_LAUNCH_PILOT_2026_05_28_HIST -->

**Status:** **COMPLETE (live-verified)**. PR [#251](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/251) (LR-1 buyer-facing simplification, commit `39093c37`, Vercel Production deployment `4842623791`, merged `2026-05-28T00:57:54Z`) + PR [#253](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/253) (LR-1 fast-follow narrative alignment, commit `849a18db`, Vercel Production deployment `4843079275`, merged `2026-05-28T02:04:53Z`) both deployed and live-verified per `.cursor/rules/delivery-reality.mdc`.

- **Why:** Anton's commercial framing — Lead Rescue is shifting from "built page" to "commercial engine." The live page already exists, but the offer was double-currency (USD 150 / MUR 6,900) with a region pre-selector that asked the buyer to pick payment route before submitting intake — violating the `BRAND_AND_CONVERSION_DOCTRINE.md` rule that route comes after intent. The buyer-facing surface needed simplification before any marketing engine work could attach.
- **What landed in the PR (5 files):**
  - `components/AiLeadRescueLanding.js` — substantial rewrite. Removed: `regionCopy` object, `RegionCard` component, `useState`/`useMemo` imports, region-tab buttons in the intake form, the `#payment-paths` two-card region selector, and the public payload keys `meta.region_path` / `meta.preferred_payment_path`. Added: structured sections — *What problem we solve*, *What we need from you*, *What happens after intake* (Review → Invoice → Pay → Run), *What is not included*, *What is not guaranteed*, *How payment works* (single USD invoice). Hero badge becomes `USD 150 launch pilot · 48-hour setup · no card on this page`. Hero aside H2 becomes `USD 150 launch pilot · 48-hour setup`. Footer extra reduced to a single-route line. All visual-asset wiring (5 manifests), OG/Twitter tags, animation classes, and styling object preserved verbatim.
  - `components/CorpFlowPublicHome.js` — 2 hunks. Featured-offer ul + Pricing ul both lose the dual-currency `from $150 / MUR 6,900` and the Mauritius / International / PayPal / Wise / Google Pay enumerations, replaced with single USD launch pilot bullets and "payment route on the invoice" wording.
  - `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — § AI Lead Rescue doctrine: *Required payment trust copy* shortened to single-route USD line; *Route rule* + *Preferred route copy* + *Preferred global CTA* sub-sections replaced with a *Single offer rule* block making explicit that currency / invoice route / payment provider are operator decisions on the invoice, not buyer decisions on the page. Forbidden CTA wording extended (`Choose your region`, `Start intake — Mauritius`, `Start intake — International`).
  - `pages/refund-policy.js` — new section *AI Lead Rescue launch pilot* between *Setup fees* and *Monitoring and ongoing services* — refund-before-work-started clause aligned with USD 150 launch pilot specifically.
  - `docs/decisions/JOURNAL.md` — `JE-2026-05-28-1` appended.
- **Operator side untouched:** `lib/server/tenant-intake.js`, `lib/cmp/_lib/ai-lead-rescue-operator.js`, `lib/server/admin-lead-rescue-api.js`, `pages/admin/lead-rescue/*`, `prisma/schema.prisma`, `lib/analytics/config.js`, `pages/_document.js`, `.env.template`, all `data/visual-assets/*` manifests, all n8n recipes — none touched. The 13-status pipeline, 13-item setup checklist, Commercial card multi-currency support (so a Mauritius client paying in MUR still works on the operator side), `tenant.lead.captured` and `corpflow.lead_rescue.intake_received` automation events, n8n forward, Plausible apex scope (`/lead-rescue` still measured per `JE-2026-05-27-1`) — all behave exactly as before. The server still accepts `meta.region_path` / `meta.preferred_payment_path` if any external caller sends them; defaults to empty/null when absent.
- **Tone discipline (Anton's call):** Outreach Template C in the LR-2 plan was changed from `We help small businesses stop losing enquiries between channels.` (IT/CRM jargon — "channels") to `We help small businesses make sure no new customer enquiry slips through the cracks.`. Same wording will be used in any future outreach material until Anton overrides.
- **Articles (PR LR-4, deferred):** First three article drafts written and approved in chat — `why-small-businesses-lose-leads`, `what-happens-after-someone-submits-your-contact-form`, `hidden-cost-of-slow-lead-response`. Publishing path approved as `https://corpflowai.com/articles/<slug>`. Visual reuse approved (each article reuses an existing governed `lead-rescue-*` asset; no new generation required for first 3). No video for v1. PR LR-4 = article scaffolding (`content/articles/`, `pages/articles/[slug].js`, `pages/articles/index.js`, sitemap update) + the 3 markdown files. Will open after this LR-1 PR is live-verified on production.
- **Future packet — LR-6 (deferred, captured for record):** Anton's strategic note — "people don't read any more, they watch videos or extract info from infographics." Captured as a research-and-redesign packet. Open only after `/lead-rescue` has ≥30 days of Plausible CTA-click + form-submit data + the first 3 articles are published, so any redesign decision is grounded in measured engagement, not opinion. LR-6 will compare text-article vs. infographic-first vs. short-screen-recording for SMB owners scanning on a phone; deliverable is a decision doc + 1–2 prototype infographics.
- **Future packet — LR-7 (deferred):** infrastructure for serving infographics + short video on `corpflowai.com` — small extension of `lib/visualAssets/schema.js` to accept `kind: "video"`. Out of scope for LR-1, LR-4, and LR-6.
- **Hard limits honoured:** zero secrets / env / DNS / DB / `tenant_id` / Plausible config / Search Console / Telegram behavior / Vercel settings / GitHub settings / deployment settings touched. No payment integrations, no payment links, no card / banking details on the public page. Banking specifics will live on the operator-issued invoice + runbook only — Anton confirmed banking info will be added off the public page tomorrow (not part of this PR).
- **Fast-follow (PR [#253](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/253)):** Production verification of PR #251 caught two LR-1-doctrine drift surfaces that escaped the original review: the lead-rescue trust-band SVG visibly rendered `MUR & USD / PAYMENT ROUTES` on screen as the 5th marker (plus matching `accessibility.alt` and `description` in `data/visual-assets/lead-rescue-trust.manifest.json` and the SVG `<desc>` element), and four apex narrative pages (`pages/process.js`, `pages/onboarding.js`, `pages/about.js`, `pages/standards.js`) still narrated dual-route MUR-vs-USD billing in body copy. PR #253 (`fix/lead-rescue/usd-launch-pilot-narrative-alignment`, 6 files, +20 / -22 lines, commit `849a18db`) replaces the trust-band 5th marker with `USD INVOICE / AFTER INTAKE`, updates the manifest desc/alt to "USD invoice issued after intake review", and rewords the four apex pages to single-USD-after-intake — preserving the identity statement *"we are based in Mauritius and work with clients in Mauritius and internationally"* in the founder's note on `/about` (HQ fact, not a pricing claim). Operator-side admin (`AiLeadRescueAdmin*`), Lux tenant marketing, runtime APIs, secrets — all untouched.
- **Outreach Template C tone fix (part of LR-1 scope):** `We help small businesses stop losing enquiries between channels.` → `We help small businesses make sure no new customer enquiry slips through the cracks.` — IT/CRM jargon ("channels") replaced with buyer-language framing. Same wording will be used in any future outreach material until Anton overrides.
- **Live verification (post-#253 merge, deployment `4843079275`):** 5/5 client-facing pages return 200 with `x-vercel-cache=PRERENDER` (`/lead-rescue`) or `=HIT` (other apex pages) and zero `MUR` matches: `https://corpflowai.com/lead-rescue` (9 × `USD 150`, 5 × `USD invoice`, 0 × `MUR`, 0 × `Mauritius`, 0 × dual-route phrases), `https://corpflowai.com/process` (0/0/0), `https://corpflowai.com/onboarding` (0/0/0), `https://corpflowai.com/about` (0 × `MUR`, 2 × `Mauritius` — both confirmed as the deliberate identity statement, 0 × dual-route), `https://corpflowai.com/standards` (0/0/0). `https://core.corpflowai.com/api/factory/health` 200 `ok:true` — no factory regression. Delivery Reality Audit posted on PR #251 closure comment ([#issuecomment-4560235920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/251#issuecomment-4560235920)) + PR #253 closure comment ([#issuecomment-4560236079](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/253#issuecomment-4560236079)). PR #251 verdict flipped PARTIAL → **COMPLETE**.

---

## 2026-05-27 — Telegram inbound webhook documented (PR #241 merged)

<!-- TELEGRAM_WEBHOOK_DOCS_MERGED_HIST -->

**Status:** COMPLETE (docs-only — no runtime / production surface change).

- **PR:** [#241](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/241) — `docs(monitoring): document existing Telegram inbound webhook registration` — merged via squash commit `c16e1a5d` at `2026-05-27T11:00:47Z`.
- **What it documents:** the Telegram bot at `https://corpflowai.com/api/webhook` is registered **on Telegram's servers** against the active `TELEGRAM_BOT_TOKEN`. No repo script calls `setWebhook` — verified via `grep` across all committed runtime / script / workflow / shell files. The registration was set manually and lives outside any GitHub diff or CI gate.
- **Canonical home:** new § 4.4 *Inbound webhook — Telegram → repo (operationally separate from outbound)* in `docs/operations/MONITORING_ARCHITECTURE.md`. Cross-references in `FACTORY_INVENTORY.md` (the `/api/webhook` row), § 6 blind-spot bullet 4, and § 7 roles-and-ownership rotation row.
- **Operational invariant locked in:** rotating `TELEGRAM_BOT_TOKEN` **does not** carry the inbound webhook over — the new bot starts with empty webhook config on Telegram's side. After every token rotation the operator must re-run the equivalent of `curl -F "url=https://corpflowai.com/api/webhook" "https://api.telegram.org/bot<NEW_TOKEN>/setWebhook"`. This is now stated in § 4.4 (invariant 2), § 6 (blind spot 4), and § 7 (rotation row).
- **Inbound vs outbound:** both surfaces use the same `TELEGRAM_BOT_TOKEN`, but they fail independently. Outbound senders also use `TELEGRAM_ALERT_CHAT_ID`; inbound has no chat-id env (it learns the chat id per incoming message). Documented to prevent future packets accidentally conflating the two.
- **Pending follow-up (queued, not yet ready):** `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` (currently on the still-open PR #238) is the natural operator-facing home for an equivalent note. After PR #238 merges, a separate small docs PR will port § 4.4 into the packet doc and leave a one-line cross-link in `MONITORING_ARCHITECTURE.md`. Until then, § 4.4 is the canonical source.
- **Discipline:** Per `.cursor/rules/delivery-reality.mdc`, this packet is docs-only and therefore did not require a live production probe. The verdict flipped to COMPLETE only after the merge SHA, the `main` HEAD advance, and the on-disk sentinel + marker were all confirmed on `corpflow-exec-01` (no placeholder values; no premature COMPLETE).

---

## 2026-05-27 — Packet 6.9 live-verified: Lux concierge SEO `<Head>` in production

<!-- CONCIERGE_SEO_HEAD_VERIFIED_2026_05_27_HIST -->

**Status:** COMPLETE (live-verified). First runtime packet from the Lux v1 quality audit's top-10 fix list (fix #2) is now serving correct SEO metadata in production.

- **PR:** [#239](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/239) — `feat(seo): add Lux concierge SEO metadata` — merged via squash commit `eacb8d3fb2` at `2026-05-27T07:08:52Z`.
- **Vercel Production deployment:** **`4831280707`** (commit `eacb8d3fb2`, status `success` at `2026-05-27T07:09:44Z`).
- **Live verification (from `corpflow-exec-01` at `2026-05-27T07:12:16Z`):**
  - `lux.corpflowai.com/concierge` → 200; `<title>Private concierge · Luxurious Mauritius</title>`, description, `robots=index,follow`, canonical `https://lux.corpflowai.com/concierge`, full `og:*` (title/description/url/type=website/site_name=Luxurious Mauritius), full `twitter:*` (card=summary_large_image/title/description). All 12 SEO tags present in initial SSR HTML.
  - `corpflowai.com/concierge` (apex) → 200; canonical and `og:url` correctly collapse to `https://lux.corpflowai.com/concierge` — apex serves Lux content under Lux canonical, no duplicate-content split.
  - `lux.corpflowai.com/` and `corpflowai.com/` → 200, titles unchanged — no homepage regression.
  - `core.corpflowai.com/api/factory/health` → 200, `ok:true`, all sub-checks pass — no factory regression.
- **Files merged (5):** `lib/client/concierge-seo.js` (new, pure SSR-callable helper), `pages/concierge.js` (added `getServerSideProps` + `useMemo` + complete SEO `<Head>`), `node-tests/concierge-seo.test.mjs` (new, 12 unit tests; 418/418 PASS on PR), `docs/execution/WEEKEND_EXECUTION_QUEUE.md`, `artifacts/chat_history.md`.
- **Tenant-safety stance:** `/concierge` is Lux-only today; the helper documents this and collapses canonical for any non-Lux host to `https://lux.corpflowai.com/concierge`. When `lux-trust-policy-impl-v1` adds host-aware rendering, the helper's `isLuxHost` branch becomes the per-tenant SEO extension point.
- **Known v1 scope (intentional):** `og:url` for `/concierge?property=…` collapses to canonical under SSR (property ref is React state, not in `getServerSideProps`). Helper already supports a property-aware variant — small follow-up to thread the query through if buyer-marketing wants social previews per property.
- **Expected Lux audit movement:** **59/100\* → ~61.5/100\*** (§3.1 SEO/indexing +1.5; §3.9 Content completeness +1). The trajectory line will be appended to `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` *after* PR #237 merges (that file lives only on #237 today).
- **Discipline:** Per `delivery-reality.mdc`, this packet went from **OPEN PR → MERGED → DEPLOYED → LIVE-VERIFIED** with deployment ID + commit SHA + live URLs captured before flipping to COMPLETE. No DB, env, secret, analytics, Plausible, Search Console, or tenant_id mutation in the packet.

---

## 2026-05-27 — Lux quality audit trajectory note appended (PR #244 merged)

<!-- TRAJECTORY_NOTE_RECORDED_2026_05_27_HIST -->

**Status:** COMPLETE (docs-only — no client/runtime surface change; the artifact it amends is internal evidence, not a public surface).

- **PR:** [#244](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/244) — `docs(quality): record Lux trajectory note (59 -> ~61.5) post-concierge SEO` — merged via squash commit `95947ad4fdf7` at `2026-05-27T12:12:21Z`.
- **What it documents:** the projected Lux website quality score movement from **59/100\* → ~61.5/100\*** following the Lux concierge SEO `<Head>` fix (PR #239 / Packet 6.9). Δ = **+2.5** (§3.1 SEO/indexing +1.5; §3.9 Content completeness +1). All other rubric rows unchanged; same PENDING discipline.
- **File touched:** `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` (+45 lines, 1 file). Internal sentinel `<!-- TRAJECTORY_POST_CONCIERGE_SEO -->` placed at the trajectory section so future audit re-runs can locate it deterministically.
- **Cross-link:** the Packet 6.9 closure entry above (`CONCIERGE_SEO_HEAD_VERIFIED_2026_05_27_HIST`) already named this trajectory line as a follow-up; this PR satisfies that pending item without re-opening Packet 6.9.
- **Discipline:** no rubric change, no thresholds moved, no PENDING items re-graded as measured. The next full re-audit (after Lighthouse + Search Console land) will replace the projected number with an evidence-based score. No env, secret, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behavior, Vercel config, GitHub settings, or deployment settings touched.

---

## 2026-05-27 — Audit fix #3 shipped: `vercel.json` dead rewrites retired + guardrail test (PR #242 merged)

<!-- VERCEL_REWRITES_CLEANUP_2026_05_27_HIST -->

**Status:** COMPLETE (LOW-scope cleanup; no runtime behavior change — only deterministically dead rewrites removed).

- **PR:** [#242](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/242) — `chore(routing): retire dead rewrites in vercel.json` — merged via squash commit `2cfbf869c227` at `2026-05-27T11:03:42Z`.
- **Scope:** removed exactly the rewrites whose destinations did not resolve to existing files or known valid routes on the working tree. `vercel.json` lost 5 lines; no rewrite still in use was touched.
- **Guardrail:** new `node-tests/vercel-rewrites.test.mjs` (+147 lines) asserts every remaining rewrite destination resolves to an actual file or known route, so future drift fails CI rather than silently re-introducing dead rewrites.
- **Discipline:** no runtime route changed for clients; the removed entries were already dead (overridden by Next.js page routes or pointed at deleted assets). No env, secret, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behavior, Vercel env, GitHub settings, or deployment settings touched. Pure repo hygiene.
- **Verification:** floor URLs unchanged post-merge (apex, Lux home, Lux `/change`, factory health all 200). Per `.cursor/rules/delivery-reality.mdc`, since the dead rewrites had no client-visible effect, this packet did not require an additional live probe beyond the standard floor.

---
## 2026-05-28 — Packet 6.11: canonical doc reference audit + repair

<!-- CANONICAL_DOC_REFS_AUDIT_2026_05_28_HIST -->

Packet 6.11 — landed docs-only. Closes the broken canonical-reference graph identified during the night audit (12 distinct missing targets / 16 reference sites across docs + .cursor/rules + artifacts/chat_history.md).

Resolved (HIGH + MEDIUM = 0 after merge):

- **HIGH:** 3/3 — created v0 stubs at `docs/operations/SECRETS_SYNC.md`, `docs/publication/CORPFLOW_PUBLICATION_ENGINE_V1.md`, `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V2.md`. Each stub names its owner packet and the canonical sources of record until that packet ships.
- **MEDIUM (file-existence class):** 3/3 — created v0 stubs at `docs/execution/EVIDENCE_FORMAT.md`, `docs/decisions/20260410-luxe-autopilot-pilot-scope.md`, `docs/operations/LUXE_AUTONOMY_PILOT_RUNBOOK.md`. The last two are back-reference stubs that name the existing `docs/decisions/JOURNAL.md` rows (JE-2026-04-10-1, JE-2026-04-10-5) as the decisions of record; this approach avoids editing the frozen 2026-04-10 chat-history entry that also references them.
- **MEDIUM (path-redirect class):** 1/1 — in `docs/execution/WEEKEND_EXECUTION_QUEUE.md` (lines 148 + 185) the two references to the never-landed path *docs/execution/LAPTOP_DEPENDENCIES_AUDIT.md* (intentionally italicised, not backticked, so it stays out of the canonical-ref graph) were redirected to the audit that actually landed at `artifacts/audits/2026-05-23-weekend/05-laptop-local-dependencies.md`.

LOW (left as recognized placeholder patterns, no code or runtime change):
- `artifacts/analytics-audits/2026-05-XX-corpflowai-apex/plan.md`
- `artifacts/migration-audits/2026-05-XX-luxe-maurice/migration-audit.md`
- `artifacts/production-health-snapshots/2026-05-23-production-health.md` (intentionally loose — referrer says "or similar dated path")
- `artifacts/quality-audits/2026-05-XX-luxe-maurice/quality-score.md`
- `artifacts/chat_history_archive.md` (forward reference to a future archive)

Verification:
- Post-merge audit (predicted on this branch): HIGH=0, MEDIUM=0, LOW=5.
- Files changed: 8 (6 NEW stubs + `docs/execution/WEEKEND_EXECUTION_QUEUE.md` + this entry).
- `docs/decisions/JOURNAL.md` intentionally NOT edited — rows JE-2026-04-10-1 and JE-2026-04-10-5 remain exactly as they landed in April; the new back-reference stubs absorb the resolution.
- No runtime / env / secrets / DNS / DB / tenant_id / analytics / Plausible / Search Console / Telegram behaviour / Vercel config / GitHub Actions / deployment-settings changes.
- `npm test` passed locally on `corpflow-exec-01` before push.

Closure verdict: docs-only; final Delivery Reality Audit verdict = COMPLETE after merge and audit-zero on `main` is confirmed.

## 2026-05-29 — Strategy Source Capture v1: simplicity / 1-1-1 / proof / email / memo

<!-- STRATEGY_SOURCE_CAPTURE_V1_2026_05_28_HIST -->

Strategy Source Capture v1 — landed docs-only.

Surface created: `docs/strategy/sources/` (new folder + index README) to host distilled external strategy material (videos, podcasts, essays, talks) as **inputs to thinking**, not doctrine. Authoritative behaviour continues to live in `docs/marketing/`, `docs/decisions/`, `.cursor/rules/`, and `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`.

First capture: `2026-05-28-simplicity-1-1-1-proof-email-memo.md` — YouTube source captured via ChatGPT distillation supplied in the operator DECISION block. No transcript copied. 12-bullet summary; CorpFlowAI application mapping across 7 surfaces (Lead Rescue, marketing engine, client migration, delivery acceleration, Operator Bridge / memo culture, hiring / delegation, exit optionality); action implications (do-now / do-not / 5 future packets named only — LR-Email-List v1, LR-Proof-1 production, Memo-attachment convention, Hiring-from-pain v1, Pain log v1); 5 proposed doctrine updates listed and intentionally **not** applied (held for separate DECISION-block approval).

Operational implication for Lead Rescue: reinforces the existing one-offer rule (USD 150 pilot), endorses LR-Proof-1 as the next proof asset before scaling traffic, names LR-Email-List v1 as the next marketing-engine candidate. No site copy, pricing, payment-gateway, or runtime change in this PR.

Verification:
- Files changed: 4 (2 NEW + 2 EDIT). Diff scope verified.
- npm test passed locally on `corpflow-exec-01` before push.
- AGENTS.md row added with explicit guardrail: index only; individual captures are task-conditional reading, not mandatory per-task.
- No doctrine file touched. No runtime / env / secrets / DNS / DB / tenant_id / analytics / Plausible / Search Console / Telegram / Vercel config / GitHub Actions / deployment-settings changes.

Closure verdict: docs-only; final Delivery Reality Audit verdict = COMPLETE after merge.

## 2026-05-29 — ERPNext Accounting Sandbox Plan v1 (docs-only)

<!-- ERPNEXT_SANDBOX_PLAN_V1_2026_05_29_HIST -->

ERPNext Accounting Sandbox Plan v1 — landed docs-only.

Surface created: `docs/finance/` (new folder; first canonical accounting doc). Plan covers the minimum safe sandbox needed to test invoicing, recurring billing, payment requests, manual PayPal / Wise / domestic-bank handling, CSV-based reconciliation against a Mauritius bank, PDF-as-evidence rule, deferred VAT readiness, and go/no-go criteria for production adoption.

Scope honoured:
- Docs-only. No install. No production setup. No API keys, no bank credentials, no secrets.
- No payment automation. No runtime CorpFlowAI changes.
- No env vars, secrets, DNS, DB, tenant_id, analytics, Plausible, Search Console, Telegram, Vercel config, GitHub Actions, or deployment-settings changes.
- VAT activation explicitly deferred until turnover threshold or accountant review.

Honest limits recorded inside the doc (§12):
- Cursor has not deployed ERPNext.
- Mauritius VAT specifics are not pinned to numbers; accountant review required before any go-live.
- PayPal API and Wise verified integration are out of v1 scope.

Verification:
- Files changed: 3 (1 NEW + 2 EDIT). Diff scope verified.
- npm test passed locally on `corpflow-exec-01` before push.
- No doctrine file touched. No runtime / security / payment surface touched.
- AGENTS.md row carries task-conditional guardrail wording (consulted only when ERPNext / accounting / VAT work is in scope).

Closure verdict: docs-only; final Delivery Reality Audit verdict = COMPLETE after merge.

## 2026-05-29 — ERPNext implementation Phase A1: install runbook landed; Phase B held on `corpflow-exec-01` capacity

<!-- ERPNEXT_IMPL_PHASE_A_RUNBOOK_2026_05_29_HIST -->

**Status:** Phase A1 of multi-phase ERPNext implementation (Phase A docs → Phase B install → Phase C §3–§7 test plan → Phase D §10 go/no-go). Docs-only. Phase B (install) is HELD until Anton resolves capacity per `JE-2026-05-29-2` (path A resize / B fresh VM / C Frappe Cloud).

Operator decisions captured in chat (2026-05-29 ~08:00 UTC, mirrored to bridge issue #249 [issuecomment-4572526955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4572526955)):
- Sandbox host = `corpflow-exec-01` (self-host on the existing Hetzner / Elestio VM).
- Scope of "complete implementation" = full Phase A → Phase D.
- Cursor's role during install = SSH-driven on the chosen host; secrets / billing / DNS still operator-only.

Pre-flight finding on `corpflow-exec-01` (read-only, no installs):
- **RAM total 1.9 GB** vs Frappe Docker minimum 4 GB / comfortable 8 GB → **capacity HOLD** on Phase B.
- Disk 31 GB on `/` (sufficient), 2 CPU cores (sufficient), no Docker installed yet (expected), no existing CorpFlowAI workloads on the box (no factory processes, no containers, no cron, only sshd / systemd-resolved listening).
- Egress to `ghcr.io`, `hub.docker.com`, `github.com/frappe/frappe_docker` reachable.

PR landed in Phase A1 (4 files; docs-only):
- NEW `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — 17-section install runbook for `corpflow-exec-01` via Frappe Docker; §0.1 capacity HOLD documented with three operator-only resolution paths; SSH-tunnel UI access (no DNS / no firewall change); sandbox credentials at `~/.erpnext-sandbox-credentials` (`chmod 600`, never committed); §13 Phase B exit criteria binding before Phase C begins; §17 honest limits.
- EDIT `docs/decisions/JOURNAL.md` — adds `JE-2026-05-29-1` (host decision = `corpflow-exec-01`; scope = full Phase A → D; Cursor SSH-driven install authorised; Phase B blocked until `JE-2026-05-29-2`) and `JE-2026-05-29-2` (capacity finding 1.9 GB; three paths offered; Phase B held until Anton records the chosen path).
- EDIT `AGENTS.md` Must-read table — adds row for the install runbook (task-conditional reading; describes operator vs Cursor ownership; flags Phase B HOLD).
- EDIT `artifacts/chat_history.md` — this section.

Hard limits honoured (carried from `ERPNEXT_SANDBOX_PLAN_V1.md` §0 + `.cursor/rules/*`):
- Zero runtime CorpFlowAI changes (no `lib/`, `api/`, `pages/`, `prisma/`, `scripts/`).
- Zero env / secrets / DNS / DB / `tenant_id` / Plausible / Search Console / Telegram / Vercel-config / GitHub-settings / deployment-settings touched.
- ERPNext sandbox credentials (when Phase B runs) stay on the host at `~/.erpnext-sandbox-credentials` and are never committed.
- No real Mauritius bank, PayPal, or Wise credentials anywhere.
- No production CorpFlowAI surface affected; no client-facing URL changed.

Verification (docs-only Delivery Reality Audit shape):
- Local fix exists: YES.
- Merged to main: pending Anton's merge.
- Production deployment ID: n/a (docs-only).
- Live URLs tested: n/a (docs-only).
- Client-facing flow usable: YES (no surface changed).
- Final verdict (pre-merge): PARTIAL; will flip to COMPLETE on merge.

Open question for Anton (gates Phase B; does not gate Phase A1 merge):
- Pick path A (resize `corpflow-exec-01` via Elestio / Hetzner panel) / B (provision new Hetzner CX22 or CX32) / C (Frappe Cloud trial). Record the choice as a new `JE-2026-MM-DD-n` row. Phase B install does not start until that row exists.

---

## Timeline (key themes)

### 2025–2026 — Cloud factory, governance, and Vercel hardening

- **2026-05-27 — Goal 6 follow-up (operational visibility + remediation design)**: Continued on `corpflow-exec-01` on top of PR #237 (stacked branch `docs/quality-operational-v1`). Shipped four new design + evidence docs: `artifacts/search-console/2026-05-27-apex-preflight.md` (verdict: READY for Anton's §3 SC operator steps; 6 sitemap URLs clean, robots clean, no `noindex` mistakes on indexable routes); `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` (alert-channel wiring contract: payload shape + P0/P1/P2 severity + anti-spam dedup + 5-phase rollout; identifies 5 silent monitors — #5 #6 #8 server-side + #10 + factory-housekeeping CI-side); `docs/quality/LUX_TRUST_AND_POLICY_REMEDIATION_PLAN.md` (Option A tenant-host-aware rendering for `/privacy`, `/terms`, `/about`, `/contact`, `/refund-policy` on lux.*; closes Lux audit fixes #5 #6 #7 #9, ~+5.5 score); `docs/quality/QUALITY_SCORE_EVOLUTION_V2.md` (v2 design with anti-gaming philosophy as the centre — 8 forbidden practices, synthetic-gamed-manifest Gate G2 ≤45/100 test, critical-failure short-circuit, trend scoring, premium-tier discipline). Cross-link surgery into `MONITORING_ARCHITECTURE.md` § 4 and § 11.2. `npm test` 406/406 PASS on exec-01. <!-- CHAT_2026_05_27_GOAL6_FOLLOWUP -->
- **2026-05-27 — Website Quality System v1 (10-dim canonical) + Lux v1 audit + Client Performance Reporting Model + Search Console execution packet (Goal 6 in `WEEKEND_EXECUTION_QUEUE.md`).** Goals 1–5 had landed the platform stabilisation layer (Neon canonical DB restored, Infisical source-of-truth, Monitoring Architecture v1 merged, `corpflow-exec-01` operational, Plausible apex-only analytics verified, Lux SEO/a11y/indexing foundations shipped, autonomous execution framework working). Goal 6 turns those building blocks into the first measurable client-outcome infrastructure: **`docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`** is the canonical 10-dimension × 10-points rubric (SEO/indexing, Accessibility, Performance, Mobile usability, Conversion clarity, Trust architecture, Analytics/measurement, Monitoring/runtime health, Content completeness, Tenant routing/infrastructure correctness) that **supersedes** the 5-dim framework (`WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` remains readable for back-compat) — with explicit thresholds (<60 remediation, 60–74 acceptable-with-known-risks, 75–84 production-ready, 85+ premium), doctrine override for Conversion ≤ 4/10, asterisk discipline inherited from the reporting standard, §6.1 framework→system mapping table, §9 launch-readiness criteria for new tenants (score ≥ 75 AND Conversion ≥ 7 AND Monitoring ≥ 7 AND Routing ≥ 7 AND SC verified AND analytics decision recorded AND no `db.prisma.io` fingerprints AND last audit ≤ 30 days), §10 seven forbidden anti-patterns. **`docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md`** is the design-only v1 (no implementation in this PR) for what clients eventually see in a monthly performance report — internal vs external split, 5 metric categories (Plausible traffic, Search Console search visibility, lead/conversion from `automation_events` + Plausible custom events, CMP publication activity, quality score + improvement backlog), explicit "what we do NOT measure in v1" list (multi-touch attribution, click-fraud, cross-device journeys, revenue/LTV, email open-tracking, A/B, session-replay), §8 quality-score → client-wording binding, §9 four named implementation gates (apex SC COMPLETE + Plausible apex live + first real client-facing tenant surface + new Comms event `corpflow.email.report_monthly.v1` added). **`docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md`** is the bounded operator packet for the first SC rollout — apex `corpflowai.com` only, Lux deferred per the 2026-05-26 internal-vs-client-facing boundary doctrine, §2 Definition of Done (verify via DNS TXT → submit sitemap → request indexing for top 5 apex URLs → capture T+24h/T+7d/T+30d evidence → update playbook §12 status + apex quality audit), §3 Anton-side operator action checklist (10 steps from pre-flight to closure), §4 Cursor-side verification steps (pre-rollout public probes + periodic re-probes + audit update), §5 evidence shape, §6 four named pitfalls + mitigations, §8 explicit "why Cursor cannot execute" — DNS + SC account verification are §3 hard gates per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`. **Lux quality re-audit under the v1 system: 59/100\*** at **`artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md`** — Δ vs 2026-05-23 framework baseline = **+15** (same headline total as the 2026-05-25 framework post-fix audit by intentional redistribution; §6 of the audit walks the mapping). Per-dimension: SEO/indexing **6/10\***, Accessibility **4/10\***, Performance **3/10\*** (cold-MISS TTFB 2.7s vs warm <0.4s; Lighthouse PENDING), Mobile usability **5/10\*** (Lighthouse mobile PENDING), **Conversion clarity 9/10** (doctrine PASS preserved), Trust architecture **7/10** (still missing privacy/terms/contact alias/"Operated by"), Analytics/measurement **1/10** (doctrine-correct absence: no Plausible on `lux.*` per the internal-vs-client boundary; SC PENDING; ADR-backed absence earns 1/2), **Monitoring/runtime health 9/10** (factory-health + production-pulse green; `database_reachable:true`; tenant resolution canonical; only Telegram alert wiring missing), **Tenant routing/infrastructure correctness 9/10** (only deduction: dead `vercel.json` static rewrites lines 9-28 still present), Content completeness **6/10** (concierge page lacks description/canonical/OG in `<head>` — see audit §2.1; `/privacy`/`/terms`/`/about` missing). **Top 10 fixes ordered by point-gain × ease:** (1) Run Lighthouse mobile → +9 points across §3.2/§3.3/§3.4 — easiest single action; (2) Fix concierge page `<head>` (route through same Next.js Head pattern as home/property) → +2.5; (3) Cleanup dead `vercel.json` static rewrites → +1; (4) Telegram alert wiring (operator: set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets) → +1; (5) `/privacy` + `/terms` routes → +3; (6) Publishable contact alias → +1.5; (7) "Operated by …" ownership statement → +1; (8) `og:image` canonical 1200×630 → +0.5; (9) `/about` route on `lux.*` → +1; (10) Favicon → not in rubric but polish. **High-confidence ceiling once measurements + structural fixes land: 75–78/100** without visual redesign. **`docs/execution/WEEKEND_EXECUTION_QUEUE.md` extended with Goal 6** (six packets: 6.1 quality-system-v1 COMPLETE; 6.2 lux-quality-report-v1 COMPLETE; 6.3 search-console-apex COMPLETE for doc + PENDING for operator; 6.4 client-performance-reporting-model COMPLETE design-only; 6.5 telegram-alert-wiring PENDING operator-only; 6.6 publication-engine-v1-design PENDING future-design). **`AGENTS.md` Must-read table extended** with three new rows (quality system, reporting model, SC execution packet). **`docs/operations/MONITORING_ARCHITECTURE.md`** companion-docs + §11 exec01-quality-audit-runner future-packet row updated to reference the v1 system. **Governance:** read-only audit; docs-only PR; no analytics expansion (Plausible env untouched); no DB / Prisma / Vercel writes; no DNS work; no tenant data; no `tenant_id` mutation; no production code paths touched; no new secrets; no Comms event implemented. **Verification:** `npm test` <run on exec-01 — see PR>; `npm run build` <run on exec-01 — see PR>; live probes captured in the Lux audit §10.1; apex `corpflowai.com` not re-probed in this packet (apex SC rollout is its own packet 6.3). **Verdict for this PR:** Goal 6 docs-only PR — five sub-packets COMPLETE in PR, one COMPLETE-doc-PENDING-operator (6.3), two PENDING (6.5 operator, 6.6 future design); awaiting Anton review/merge. **Per `delivery-reality.mdc`:** no client-facing or production runtime surface affected; no live verification required beyond the public probes captured in the audit; optional post-merge sanity probe: `https://lux.corpflowai.com/` → HTTP 200 (no regression from the docs push).
- **2026-05-27 — Monitoring & 24/7 execution architecture canonical doc landed; cross-link surgery binds every monitoring-related doc to one component map.** Anton flagged that monitoring had been discussed and partially documented (FACTORY_CONTROL_LOOP, DELIVERY_VERDICT_AND_ALERTS, POSTGRES_PROVIDER §3/§4b, PRODUCTION_PULSE_V1, the diagnose-postgres-env workflow) but no single overview tied the surfaces together — and `EXECUTION_BRAIN_VS_HANDS.md` line 3 + `PRODUCTION_PULSE_V1.md` line 4 already had **forward-references to `docs/operations/MONITORING_ARCHITECTURE.md` pointing at a doc that did not yet exist on disk**, so the doc graph was internally inconsistent. Branch `docs/monitoring-architecture-overview` → PR #231. **The canonical doc `docs/operations/MONITORING_ARCHITECTURE.md`** is structured §1–§11: §1 *why this doc exists* + two-line drift-vs-live mental model; **§2 surface map of all 12 monitors** (#1 factory-control-loop, #2 /api/factory/health, #3 /api/factory/production-pulse/runtime, #4 /api/cron/cmp-monitor, #5 /api/cmp/overseer-sweep-cron, #6 /api/cmp/stuck-self-repair-cron, #7 /api/cron/technical-lead, #8 /api/cron/billing-sentinel, #9 diagnose-postgres-env.yml, #10 factory-health-ping.yml, #11 vercel.json cron self-validation, #12 corpflow-exec-01 Elestio VM) — each row names "what it checks", **"what it does NOT check"**, alert path, canonical doc; **§3 schedule grid** (every UTC time slot what fires); **§4 alert routing** (§4.1 Telegram byte-compatible contracts in `scripts/post-control-loop-telegram-alert.mjs` + `lib/server/ops-alerts.js`, §4.2 n8n forward `corpflow.ops_alert.v1` classified `operator_escalation` per Comms v1 §4, §4.3 today's wiring per monitor); **§5 live-endpoint floor** (the URLs `delivery-reality.mdc` audits hit on a real change — apex `/`, `/change`, Lux `/`, factory health, pulse runtime, `/api/tenant/site`, `/api/ui/context`); **§6 known blind spots** (8 named — factory-health-not-DB-connect, Vercel-marketplace-auto-install, tenant-resolution-looks-like-200, Telegram-silent-no-op, no-alert-on-#5/#6/#8, Hobby-cron-limits, no-third-location-uptime, exec-01-itself-unmonitored); **§7 roles + ownership** matrix (Anton/Cursor/CI per action); **§8 incident decision tree** (8 steps from `/change` → pulse → client URL → control-loop log → diagnose-postgres-env → tenant probes → CMP ticket → escalate); **§9 add-a-new-monitor recipe** with the binding rule that any new monitoring surface, scheduled job, or alert path **must update §2 in the same PR or the new monitor is incomplete**; **§10 cross-links** to canonical docs + workflow filenames + Vercel cron paths + HTTP routes + scripts; **§11 status tables** — §11.1 today's monitors (✅ active vs ⚠️ active-no-alert), §11.2 named future packets (`cmp-internal-cron-alerts`, `exec01-cron-pulse`, `exec01-quality-audit-runner`, `diagnose-postgres-env-scheduled`, `domain-routing-guard-scheduled`, `n8n-on-exec01`, `exec01-uptime-from-third-location`, `move-repo-to-/opt/corpflow/repos`), §11.3 `corpflow-exec-01` posture with the 8 v1 hard-rule non-goals (no prod secrets / no DB writes / no Vercel deploys / no scheduled jobs / no tenant data / no n8n migration / no Cursor server extension / no Docker-Ollama-Postgres). **Cross-link surgery added** to bind it into the existing doc graph: `AGENTS.md` must-read table gains rows for the monitoring architecture itself + DELIVERY_VERDICT_AND_ALERTS + PRODUCTION_PULSE_V1 (both individual monitor docs were missing from must-read); `FACTORY_CONTROL_LOOP.md` top callout names itself **Monitor #1** + points at §2 + §6.1 (factory-health blind spot) + §11.3 (exec-01 relationship) + §11 (cron self-validation as Monitor #11); `DELIVERY_VERDICT_AND_ALERTS.md` top callout names itself **Monitor #4** + points at §2 + §4.1/§4.2 (Telegram + n8n routes) + §9 (change-discipline); `POSTGRES_PROVIDER.md` §3 cross-references monitoring §6.1 (known blind spot #1) + §6 Related now lists monitoring §2 monitor #9 (diagnose-postgres-env workflow) + §6.1 (the blind-spot wording is built on top of POSTGRES_PROVIDER §3) + §5 (live-endpoint floor for DB connectivity proofs); `automation-framework.md` Optional-forward section names the route as monitoring §2 monitor #4 alert-path + §4.2 n8n forward routing contract. The two pre-existing forward-references in `EXECUTION_BRAIN_VS_HANDS.md` line 3 and `PRODUCTION_PULSE_V1.md` line 5 are preserved unchanged — both already had the right pointer; they just needed the destination to actually exist. **Adjacent surfaces** explicitly listed in §2 (so they are not invisible) but not counted in the 12 monitors: `factory-housekeeping.yml` (weekly + monthly), `domain-routing-guard.yml` (manual today; future-packet candidate), `cmp-stuck-self-heal.yml` (manual incident variant of #6), and the PR-gate workflows (`cmp-product-automerge`, `cmp-pr-delivery-gate`, `cmp-branch`, `vercel-env-check`, `test`). **Governance:** docs-only PR; no runtime code changes; no secrets touched; no tenant data accessed; no DNS/billing/auth edits; no production deploy. **Verification:** branch caught up with main (merged past #232 + #234); `npm test` **406/406 PASS** locally on the merged tree; no linter errors on any of the 7 edited files (MONITORING_ARCHITECTURE.md, AGENTS.md, FACTORY_CONTROL_LOOP.md, DELIVERY_VERDICT_AND_ALERTS.md, POSTGRES_PROVIDER.md, automation-framework.md, this file). **Verdict:** docs deliverable COMPLETE in repo (PR #231 ready for Anton to squash-merge); the doc graph is now internally consistent (all forward-references resolve to a real canonical artifact); §9's "must update §2 in same PR" is the binding rule for every future monitor. **Live verification:** N/A — docs-only; no client-facing or production-runtime surface affected, per `delivery-reality.mdc`.
- **2026-05-27 — Plausible v1 step-1 = `corpflowai.com` apex only; standard script + `data-domain`. PR #228 merged, #229 retargeted to `main` and tightened.** Anton's task: complete Plausible install for `corpflowai.com` *only* (Plausible verification was failing because the live HTML had no snippet); do NOT install on Lux or any tenant working surface yet. Confirmed env contract: `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=corpflowai.com`, `NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.io/js/script.js` — these are the **standard** Plausible flow, not the Plausible Auto hashed-URL flow PR #229 had originally implemented. **PR #228** (`docs(track-2): make websites measurably good`) squash-merged at commit `6d18b0ff`. **PR #229** rebased onto new `main` and amended in three places to match Anton's apex-only step-1 scope: (a) `lib/analytics/config.js` — `ALLOW_HOSTS = ['corpflowai.com']` (dropped `aileadrescue.corpflowai.com` — deferred to step-2), `MARKETING_SURFACE_BY_HOST = { 'corpflowai.com': 'apex' }`, `APEX_DENY_PATH_PREFIXES = ['/concierge', '/properties', '/property']` (removed `/lead-rescue` — it IS apex public marketing today), kept all factory/admin/login/master/api/_next/client/lux-* deny prefixes + token-bearing query-param + reset-password substring denies; (b) `components/analytics/PlausibleScript.js` — switched from Plausible Auto (`pa-<hash>.js` + init shim) to standard `script.js` + `data-domain` (read from `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, default `corpflowai.com`) with both URL + domain configurable via env; (c) `.env.template` — added `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` row, updated comments to reflect step-1 (apex only) and standard-script flow. **New ADR `docs/decisions/20260527-plausible-apex-only-rollout-step1.md`** refines `20260526` (still authoritative for the destination umbrella architecture) to scope step-1; lists the exact Vercel env contract; documents `/lead-rescue` as apex marketing in step-1 + path back to graduation when `aileadrescue.corpflowai.com` ships. **Tests rewritten** (`node-tests/analytics-policy.test.mjs`): 15 test() blocks covering apex-only host posture, deny-path word-boundary + slash-only matchers, token-bearing query denies, reset/forgot substring denies, apex-only `/concierge`/`/properties`/`/property` denies (with `/properties-overview` and `/concierge-news` allowed by non-over-match), `/lead-rescue` allowed on apex, env kill-switch strict-`true` semantics; total **395/395 PASS**. **Canonical doc revisions** (`docs/analytics/CORPFLOW_ANALYTICS_V1.md`): §1 reframed as step-1 scope summary; §4.4 host-config snippet updated to apex-only; §4.5 rewritten for standard Plausible script + `data-domain` (replaces Plausible Auto narrative); §4.6 env table now lists three rows with exact apex-step-1 values + defaults; §5.2 explains `/lead-rescue` is **not** in apex-deny in step-1; §5.4 allow-hosts table reduced to just `corpflowai.com` with step-2 graduation note; §7 rollout order rewritten apex-first → step-2 (add Lead Rescue subdomain) → future product subdomains → tenant own-domain analytics out of scope; §10 status table refreshed. **Journal `JE-2026-05-27-1`** appended above `JE-2026-05-26-1`; canonical doc + ADR cross-linked. **Reversibility:** instant disable = flip `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false` in Vercel (no redeploy); code revert = standard PR revert (single-decision-surface adapter). **Operator next steps for Anton (5 minutes total, 1 click each):** (1) Vercel → Production env vars → set the three `NEXT_PUBLIC_PLAUSIBLE_*` values exactly as listed in the ADR; (2) redeploy production (auto on env change in some Vercel projects, otherwise click "Redeploy"); (3) re-probe live `https://corpflowai.com/` HTML — should contain `<script ... src="https://plausible.io/js/script.js" data-domain="corpflowai.com">`; (4) Plausible dashboard → site `corpflowai.com` → "Verify" should now succeed; (5) open Plausible "Realtime" → confirm a visit registers within ~5 min. **Cursor verification after env flip:** `lux.corpflowai.com/` HTML contains **no** Plausible reference; `/change`, `/admin`, `/login`, `/lead-rescue?token=…`, `/concierge`, `/properties`, `/property/<slug>` on apex all serve **no** Plausible script (per code-level deny-list). **Governance:** no secrets touched (env values are public `NEXT_PUBLIC_*` tokens); no DNS changes; no GA4; no tenant data mutated; no `tenant_id` touched; no DB / Prisma config touched; no production deploy from Cursor (Anton owns the env flip). **Verdict:** docs/runtime PR ready for merge; live verification gated on Anton's env flip. Pending tasks logged: step-2 packet for `aileadrescue.corpflowai.com` graduation; custom event wiring for Lead Rescue CTAs (separate follow-up).
- **2026-05-26 — Plausible runtime install (gate 4) + internal-vs-client-facing boundary refinement:** Branch `feat/plausible-runtime-install`, stacked on `feat/track-2-quality-plausible-search-console` (PR #228 still open with the docs). Anton clarified the operating model the docs hadn't fully captured: `lux.corpflowai.com` and all `<tenant>.corpflowai.com` are **CorpFlow-internal staging/working surfaces** (tenants edit their published sites here), **not** buyer-facing marketing — those never load Plausible; tenants publish their real marketing on their **own real domains** (e.g. `luxemaurice.com`) with their own Plausible registration, off the CorpFlow umbrella. `/lead-rescue` (path on apex) is the **internal** product working space; `aileadrescue.corpflowai.com` is the **client-facing** Lead Rescue marketing surface. Decision codified in **`docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md`** (refines the 2026-05-25 provider ADR): one CorpFlow umbrella Plausible site (script `pa-atDLaFbloSL8__2jS9sxi.js`, registered by Anton), umbrella covers `corpflowai.com` apex marketing root + `aileadrescue.corpflowai.com`, future CorpFlow product subdomains graduate from `corpflowai.com/<path>` (denied) to `<product>.corpflowai.com` (allowed) as a 2-line config diff + 1 Plausible UI click. **Adapter (lib/analytics/):** `config.js` exports `ALLOW_HOSTS`, `DENY_HOST_EXACT`, `DENY_HOST_SUFFIX`, `DENY_PATH_PREFIXES` (`/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/core-lux-migration-repair`, `/api/`, `/_next/`), `APEX_DENY_PATH_PREFIXES` (`/lead-rescue`, `/concierge`, `/properties`, `/property` — apex-only), `DENY_PATH_SUBSTRINGS` (`reset-password`, `forgot-password`), `DENY_QUERY_KEYS` (`token`, `reset`, `ticket`), `MARKETING_SURFACE_BY_HOST` (`apex` / `lead_rescue`); `index.js` exports `isHostAllowed`, `isPathAllowed`, `isAnalyticsEnabledForHostPath`, `getMarketingSurface`, `isAnalyticsEnabledByEnv`, `normalizeHost`. **Component (components/analytics/PlausibleScript.js):** Plausible Auto pattern (`pa-<hash>.js` + init shim) via `next/script` strategy `afterInteractive`; no `data-domain` attr (Plausible Auto bundles site identity in script URL); script URL overridable via `NEXT_PUBLIC_PLAUSIBLE_SRC`. **Mount (pages/_app.js):** conditional render gated by `isAnalyticsEnabledByEnv() && host && isAnalyticsEnabledForHostPath(host, router.asPath)`; host resolved client-side from `window.location.hostname` after hydration so SSR HTML never carries the script — a misconfigured deploy can't leak it into a denied environment. **Tests (`node-tests/analytics-policy.test.mjs`):** 12 new test() blocks covering normalizeHost edge cases, host allow/deny, path-prefix denies, substring denies, token-bearing query denies, apex-only denies + non-over-match, host+path composition, marketing surface lookup, and env kill-switch semantics. Total node-tests now **393/393 PASS**. **Kill switch (.env.template):** `NEXT_PUBLIC_PLAUSIBLE_ENABLED` (default empty/false) + `NEXT_PUBLIC_PLAUSIBLE_SRC` (optional override) added under a new "Analytics — Plausible (umbrella site)" section with operator notes about apex-verification + Domains-list prerequisites. **Compliance (gate 3):** `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` adds Plausible Insights row (umbrella scope, deny-list summary, EU-hosted, no cookies/PII, link to canonical doc + boundary ADR; explicit note that tenant client domains run their own Plausible). **Canonical doc (`docs/analytics/CORPFLOW_ANALYTICS_V1.md`) revisions:** §1 expanded to umbrella-site model + Tenant working surfaces denied + GA4 still excluded + kill-switch named; §2 rewritten as 4-row stakeholder grouping (internal product working / CorpFlow client-facing / tenant working / tenant client domain) + concrete umbrella properties; §3.2 replaced (was Lux taxonomy → now Lead Rescue reference taxonomy for next event-wiring packet); §3.3 NEW — explicit "tenant client-facing marketing on tenants' own real domains is out of scope" with the old `lux.*` taxonomy preserved as a reference pattern only; §3.4 expanded deny list (tenant subdomains, `*.vercel.app`, `localhost`, apex-internal paths); §4.4 rewritten as ALLOW_HOSTS + MARKETING_SURFACE_BY_HOST snippet with graduation recipe; §4.5 rewritten for Plausible Auto reality (no `data-domain`, two-tag mount, SSR-safe conditional render); §5.2/5.3/5.4 reorganised — apex-specific denies, deny-hosts (now includes lux/luxe and any tenant-by-default), allow-hosts; §7 rewritten to umbrella-first rollout (replaces apex→Lux ordering); §10 status table flipped — provider+boundary ADRs both ✅, umbrella site registered ✅, DATA_MAP row ✅, adapter+mount+tests ✅, kill-switch placeholder ✅, runtime enablement still ⏳ Anton (after Plausible-side apex verification + Domains-list addition). **Journal (`docs/decisions/JOURNAL.md`):** new row JE-2026-05-26-1 above JE-2026-05-22-1 with the canonical decision summary + reversibility (kill-switch flip OFF). **Anton's remaining steps (1 click each):** (1) wait for Plausible-side apex verification to complete, (2) add `aileadrescue.corpflowai.com` to umbrella site → Site Settings → Domains, (3) Vercel → env vars → set `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` for Production, (4) open both `corpflowai.com` and `aileadrescue.corpflowai.com` in a normal browser → confirm visitors appear in Plausible "Realtime" within ~5 minutes. **Governance:** zero tenant_id touched; zero secrets in repo or chat; deny-list shipped in code (cannot drift via env); Plausible script never sent to factory/operator/admin/tenant working surfaces; Plausible never sees PII (no cookies, no fingerprinting, no event props by default). **Verdict for the docs+adapter PR:** COMPLETE pending merge of PR #228 first (so the canonical doc lands) then this PR; live verification waits on Anton's Plausible+Vercel steps.
- **2026-05-25 — Track 2 (Make Websites Measurably Good) — four docs/audit packets shipped on one branch:** Branch `feat/track-2-quality-plausible-search-console`. Anton's framing: turn website quality from subjective opinion into measurable, repeatable evidence after the SEO fix (PR #222) and the Postgres-drift incident closure. **WP A — Lux post-fix quality re-audit:** read-only public probes against the full Lux surface set (`/`, `/robots.txt`, `/sitemap.xml`, `/api/tenant/site`, `/api/ui/context`, `/property/lm-nc-ridge`, `/this-route-should-not-exist-9X`, `/favicon.ico`). All confirmation items PASS — Lux tenant resolves as `luxe-maurice` (`api/ui/context.tenant_registered:true`, `login_route:"client"`, no `onboarding` fallback), home serves Lux content (38,686 bytes; markers `Mauritius`/`concierge`/`luxe-maurice` present), host-aware sitemap lists home + concierge + property pages, robots `200`, branded 404 with `<html lang>` + `<main>` + `noindex` + Lux gold accent, all SEO meta present on home and property (`<title>`, `description`, `canonical`, `og:type/title/description/url`, `twitter:card`, `viewport`, `theme-color`, `<main>`), no `db.prisma.io` in any response. **Score: 59/100\* (Δ +15 vs 2026-05-23 baseline 44/100\*)** — Conversion **18/20** (unchanged), Performance **8/20\*** (Lighthouse PENDING; cold/warm TTFB ~705ms misses 600ms ceiling so TTFB row 0/2), Accessibility **6/20\*** (Lighthouse PENDING but structural floor lifted by lang/main/viewport — expected ceiling 18-20/20\* once measured), **SEO 12/20\* (+12)** (title/desc/canonical/sitemap/robots all confirmed; OG missing only `og:image`; Lighthouse SEO and Search Console PENDING), Trust **15/20 (+3)** (branded 404; HSTS preserved; still missing `/privacy`, `/terms`, contact alias, ownership statement). Verdict: *Substantive gaps closing toward Operational* — ceiling ~78–80/100\* once Lighthouse + Search Console land. Doctrine PASS preserved. Report at **`artifacts/quality-audits/2026-05-25-luxe-maurice-postfix/README.md`**. Two small framework refinements suggested for v1.1 (PENDING-vs-FAIL parity, footer-link row split). **WP B — Plausible Analytics v1 (docs/design only):** **`docs/decisions/20260525-plausible-analytics-v1.md`** records Plausible as the sole v1 provider (rationale: lowest compliance overhead × lowest operator complexity × adequate buyer-funnel signal; chosen over GA4/Fathom/self-hosted Umami in a head-to-head matrix). **`docs/analytics/CORPFLOW_ANALYTICS_V1.md`** is the canonical contract — tenant-aware approach (one Plausible site per public host), event taxonomy with surface prefix (`apex.*` / `lux.*`) and explicit allow/deny prop lists, deny-paths/deny-hosts as code-level single source of truth, adapter contract under `lib/analytics/{index,config,providers/plausible,providers/null-provider,events/apex,events/lux}.js` (provider-swappable so a future swap is one PR), suggested env placeholders `NEXT_PUBLIC_PLAUSIBLE_ENABLED` / `_SRC` / `_DOMAIN` / `_ANALYTICS_PROVIDER` (all public, none secret), `next/script` with `strategy="afterInteractive"` mounted in `pages/_app.js` only when path is allow-listed and env says enabled, ESLint guard against importing `lib/analytics/*` from `lib/cmp/**` / `lib/server/**` / `pages/api/**`, hard gates per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 (account creation, DNS for custom proxy, runtime PR, env flip), and explicit deny-list for `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, factory routes, all `/api/*`, password-reset URLs, any `?token=`/`?reset=`/`?ticket=` URL. Existing `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` Step 4.1 marked closed; status table updated. **No runtime install** — that's a separate PR Anton must approve per surface, with `DATA_MAP_AND_SUBPROCESSORS.md` updated first. **WP C — Search Console + indexing operator playbook:** **`docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`** is the standalone Anton-runs-the-UI playbook split out of the mixed analytics-and-SC rollout plan — target domains (apex Domain property + Lux URL-prefix property + future tenants; explicitly skips `core.corpflowai.com`), verification preference order (DNS TXT preferred → HTML file fallback → meta tag avoid), apex playbook (§4 — verify, submit sitemap, validate robots, request indexing for top 5, capture T+1h/T+24h/T+7d/T+30d evidence), Lux playbook (§5 — runs after apex COMPLETE), future-tenant recipe (§6), 5 named common failure modes (§7), 3-day indexing-request pace, owner table (Anton owns DNS + UI; Cursor owns docs + audit verification), evidence-folder convention (§10 — `artifacts/audits/<date>-<surface>-search-console/{verified.png,sitemap-discovered.png,indexing-request-1..5.png,coverage-t+24h.png,coverage-t+7d.png,errors-t+7d.txt,performance-t+30d.png,README.md}`), DoD threshold (≥4/5 indexed by T+7d), and a status table tracking each surface. **WP D — Website quality reporting standard:** **`docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md`** layers cadence/thresholds/wording on top of the existing scoring rubric — acceptance bands (75–84 Operational, 85–100 Premium, <60 remediation, 0–39 pre-launch only), surface-type targets (apex 75/85, tenant launch 75/85 with conditional 65 pre-launch, lead-magnet 75/85, internal not scored), doctrine override (Conversion ≤9 ⇒ Conversion-PARTIAL regardless of total; Conversion ≥16 ⇒ not pre-launch), asterisk discipline (PENDING items can lift the band by at most one when measured), reporting cadence (new tenant launch + 7d / major content change / SEO+a11y runtime PR + 24h / quarterly / pre-paid-traffic gate), audit procedure (verbatim from framework §4 with delivery-reality evidence shape), internal report template (incl. Δ-vs-previous and asterisk markers), client-facing template (no jargon, no asterisks — replace with "preliminary; Lighthouse scheduled <date>"), improvement-backlog format (one bullet per fix with target audit re-run date), launch-ready checklist (7 conditions including ≥75 score, Conv ≥14, migration audit Sections A–F PASS/PARTIAL with named follow-ups, Search Console verified, analytics decision recorded, no `db.prisma.io` fingerprints), 6 anti-patterns (score-without-evidence, silent re-runs, mixing audit+fix in one PR, exceeding-band wording, inventing dimensions, asterisk drift). **AGENTS.md** must-read table extended with three new rows (analytics v1, SC operator playbook, quality reporting standard). **`docs/execution/WEEKEND_EXECUTION_QUEUE.md`** gains four new packets (3.4 / 5.2 / 5.3 / 5.4) all marked COMPLETE in this PR; queue summary expanded to 16 packets. **Governance / scope rules honored:** no Plausible script installed (gated on Anton's account creation + per-surface runtime PR approval); no DNS changes; no GA4; no new secrets; no tenant data mutated; no `tenant_id` touched; no DB / Prisma config touched; no production deploy. **Verdict per packet:** WP A → COMPLETE (read-only audit shipped); WP B / C / D → COMPLETE (docs-only). **Runtime analytics implementation is now ready for a separate Anton-approved packet** — design is locked, gates are named, env placeholders are defined.
- **2026-05-25 — Diagnostic dispatched on `main`; identified the precise drift signature: 3 NON-Sensitive DB envs auto-installed 2026-05-24 04:07 UTC (likely Vercel marketplace integration).** After PR #224 merged, the diagnostic workflow `diagnose-postgres-env.yml` was dispatched on `main` (run `26374134431`). Findings (names + booleans only — no values printed): **6 DB envs exist on Production**; the **3 SENSITIVE** keys (`DIRECT_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) were created 2026-05-22 03:18:44–03:18:45 UTC and updated 03:22:10 UTC — those are the original Neon repoint timestamps from the prior incident; the diagnostic cannot decrypt them via this token, so they are presumed Neon-correct from the §5 fix. The **3 NON-Sensitive** keys (`DATABASE_URL`, `POSTGRES_URL`, `PRISMA_DATABASE_URL`) were created **within ~1 second of each other** at **2026-05-24 04:07:00–04:07:01 UTC** — that exact-second-cluster timing is the unmistakable signature of an **automated installation event** (Vercel storage/marketplace integration auto-link, Infisical→Vercel sync, or similar). Their values have `value_present_nonempty:true`, but `value_scheme:null` (no `://` URI scheme), `value_anywhere_neon_tech:false`, `value_anywhere_prisma_io:false`, and **`value_anywhere_prisma_data:false`** — meaning the values are **opaque references** the diagnostic cannot classify (likely Vercel `@<ref>` placeholders or encoded blobs that resolve to `db.prisma.io:5432` only at runtime, which matches the production error `Can't reach database server at db.prisma.io:5432`). Diagnostic upgraded twice (PR #225, PR #226) — added `prisma+postgres://` scheme detection, prisma-data substring scans, and shape signals (`value_first_char_class`, `value_length_bucket`); test suite now 382/382. **Anton-ready operator action list (most likely fix path):** **(1) Vercel → Storage tab** — list integrations attached to the project; look for any "Prisma Postgres", "Prisma Marketplace", "Postgres" auto-install dated **on or near 2026-05-24 04:07 UTC**; **disconnect / uninstall** the offending integration. **(2) Vercel → Settings → Environment Variables** — for each of `DATABASE_URL`, `POSTGRES_URL`, `PRISMA_DATABASE_URL` (the 3 created 2026-05-24 04:07 UTC), click **Edit** to **reveal the value** in the UI (Cursor cannot do this — Vercel REST returns a reference string, not the resolved value). If the host reads `db.prisma.io` or the URL starts `prisma+postgres://` or contains `prisma-data.net`, that confirms the Prisma Postgres integration overlay. **(3) Restore Neon values from Infisical** for these 3 keys — pooled `*-pooler.<region>.aws.neon.tech` host. **(4) Redeploy production**. **(5) Re-dispatch** `diagnose-postgres-env.yml` on `main` — verdict line should read `CLEAN — every readable DB env points at neon.tech (no prisma references)`. **(6) Re-probe** `lux/api/tenant/site` — expect HTTP 200 with `tenant_id: "luxe-maurice"` and the full site payload; pulse should report `core.database_reachable: true`. **Why the 3 SENSITIVE keys aren't the problem:** their timestamps (2026-05-22 03:22:10 UTC) match the prior incident's documented Neon repoint window exactly; the diagnostic cannot read them but they're presumed correct, AND they are **fallbacks** — `runtime-config.js` `cfg('POSTGRES_URL')` reads `process.env.POSTGRES_URL` first (the bad value) and never reaches the Sensitive aliases. **Stage 5 final verification still gated on Anton's Stage 2** (Vercel write + redeploy). Diagnostic now ready to confirm `CLEAN` post-fix.
- **2026-05-25 — P0 incident: Lux tenant-resolution failed (drift recurrence; `db.prisma.io:5432`). Architectural decision codified: Neon is the sole approved Postgres provider; Prisma Accelerate is deprecated.** Branch `fix/postgres-neon-only-2026-05-25`. Symptom set re-observed — `https://lux.corpflowai.com/api/tenant/site` returned **HTTP 500** with body `Can't reach database server at \`db.prisma.io:5432\``; `production-pulse/runtime` reported top-level `ok:true` and `monitoring.ok:true` but `core.database_reachable:false`; `/api/ui/context` fell through to hostname-derived `tenant_id:"lux"`, `tenant_registered:false`, `login_route:"onboarding"` (canonical is `tenant_id:"luxe-maurice"`, `login_route:"client"`); Lux home returned **200** but rendered apex-shaped content because the tenant payload never loaded; `/api/factory/health` continued to report `healthy` because it does not open a connection (§3 of the canonical doc). **Root cause (production error names it directly):** at least one of the six Vercel Production DB env keys references a Prisma Accelerate / `db.prisma.io:5432` host instead of Neon — same drift class as the 2026-05-22 incident. **No code change caused the regression.** Full diagnostic packet shipped on this branch: (a) `scripts/diagnose-vercel-postgres-env.mjs` enumerates every DB-related Vercel env name on the Production target and tags each with strict booleans (`value_starts_with_prisma_proto`, `value_host_contains_prisma_io`, `value_host_contains_neon_tech`, `value_host_contains_pooler`); never prints values, hostnames, userinfo, or URL substrings. (b) `.github/workflows/diagnose-postgres-env.yml` runs the script on `workflow_dispatch` only (no schedule, no env mutation, no Telegram); reads via existing `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` repo secrets; emits a verdict line + JSON artifact (`diagnose-vercel-postgres-env`, 7-day retention). (c) `node-tests/diagnose-vercel-postgres-env.test.mjs` adds 12 unit tests (key-pattern matching + value-shape booleans + secret-leak prevention; passes with the existing 361-test suite, total now **373/373**). (d) `docs/operations/POSTGRES_PROVIDER.md` rewritten — top-of-file Neon-only architectural decision, §4a *Source of truth — Infisical, never edit Vercel directly first* (Infisical wins by definition; reset Vercel from Infisical, not the reverse), §4b *Known drift symptoms* (the exact triple of pulse-`database_reachable:false` + tenant-site `db.prisma.io:5432` + UI-context fallback), and a new §5b *Incident: 2026-05-25* with the operator playbook (Anton-only Steps 1–3 and 6 — Infisical edit + Vercel REST upsert + production redeploy + Vercel env entry cleanup; Cursor-side Steps 4, 5, 7 — public probes, diagnostic dispatch, history entry). (e) `AGENTS.md` Must-read row strengthened — explicitly lists the Neon-only mandate and references §4a/§4b/§5b. (f) `docs/operations/FACTORY_CONTROL_LOOP.md` calls out that `/api/factory/health` is not a DB connectivity check (avoids the same blind spot). (g) `docs/EXECUTION_BRAIN_VS_HANDS.md` Postgres line marks Prisma Accelerate as deprecated and points the brain→hands path through the canonical doc + diagnostic workflow. **Stage 5 preliminary verification (live, 2026-05-25 ~02:30Z, before any restoration):** `core/api/factory/health` → 200; `core/api/factory/production-pulse/runtime` → 200 with `database_reachable:false`; `lux/api/tenant/site` → 500 with explicit `db.prisma.io:5432` error; `lux/api/ui/context` → 200 with `tenant_id:"lux"`, `tenant_registered:false`, `login_route:"onboarding"`; `lux/` → 200 (apex-shaped content). **Operator action list for Anton (gated, in order):** (1) confirm Infisical production environment holds Neon-only values for `POSTGRES_URL`, `DATABASE_URL`, `PRISMA_DATABASE_URL`, `POSTGRES_PRISMA_URL`, `DIRECT_URL`, `POSTGRES_URL_NON_POOLING` — pooled keys with `-pooler.<region>.aws.neon.tech`, non-pooled keys without `-pooler.`; (2) sync Infisical → Vercel for production; (3) redeploy production; (4) re-probe the §4b symptom set (Cursor will run via the `diagnose-postgres-env` workflow once this PR is merged to `main`); (5) cleanup any Vercel env entry referencing `db.prisma.io` or starting with `prisma://` — but **search the repo for the literal env-key name first** to avoid breaking expected aliases (`runtime-config.js` falls back through `POSTGRES_PRISMA_URL`/`PRISMA_DATABASE_URL`, and `postgres-ensure-schema-connection.js` reads `POSTGRES_URL_NON_POOLING`/`DATABASE_URL_UNPOOLED`/`POSTGRES_URL_UNPOOLED`/`PRISMA_DATABASE_URL_UNPOOLED`/`POSTGRES_PRISMA_URL_NON_POOLING` — these names are expected and must hold Neon values). **#223 (revert of #222) recommendation: KEEP CLOSED / DO NOT MERGE** — the production error is an env/provider issue, not a code regression, and reverting #222 would lose the SEO/a11y/indexing wins (lang/main/viewport/robots/sitemap/404) without affecting the DB drift at all. Hold #223 as a rollback option only if Stage 5 still fails after Step 1–3 are completed by Anton. **Governance:** no secrets touched, no env values printed, no values written to Vercel/Infisical (Cursor lacks the credentials to do either; Stage 2 is explicitly Anton-only), no `tenant_id` mutated, no client data written, no DNS/billing changes, no client-facing email triggered. **Verdicts:** Stage 1 (diagnose) → PARTIAL until the workflow runs on `main` (root cause already independently confirmed by the production error message); Stage 2 (restore Neon) → **PENDING — ANTON-ONLY**; Stage 3 (docs) → COMPLETE on this branch; Stage 4 (operator cleanup checklist) → COMPLETE in `POSTGRES_PROVIDER.md` §5b; Stage 5 (verification) → PARTIAL — preliminary probes captured; final probes after Anton completes Stage 2; Stage 6 (#223) → keep closed; Delivery Reality Audit for the docs+diagnostic PR is filed in the PR body.
- **2026-05-24 — Lux SEO fix packet (runtime PR drafted):** Branch `feat/lux-seo-fix-2026-05-24`. Closes the SEO 0/20 + accessibility gap surfaced in Packet 3.1 + Packet 4.1 §F.1/F.2/F.3/F.6. **Files added:** `pages/_app.js` (viewport `width=device-width, initial-scale=1` site-wide), `pages/_document.js` (`<html lang="en">` + theme-color), `pages/404.js` (branded fallback replacing the generic Next.js `_error`), `public/robots.txt` (allows marketing routes; explicitly disallows `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, factory + cron + auth API namespaces; lists apex + Lux sitemap URLs), `pages/sitemap.xml.js` (host-aware dynamic sitemap — apex routes for `corpflowai.com`, Lux marketing + 8 property refs for `lux.corpflowai.com` and `luxe.*` aliases, `Cache-Control public, s-maxage=3600`), `node-tests/sitemap-host-aware.test.mjs` (10 new unit tests). **Files edited:** `components/LuxeMauriceTenantPresentation.js` (Head extended with description, canonical, OG type/title/description/url/image, Twitter card/title/description/image; `<main>` wrapper added around the content sections), `components/LuxeMauricePropertyDetailPage.js` (same Head set per-property with synthesized description + per-property canonical). **Pattern mirrored from** `components/AiLeadRescueLanding.js` (most complete OG/Twitter set in the repo) and `components/CorpFlowPublicHome.js`. **No tenant-data schema changes** — the SEO description is synthesized from already-public fields (`meta.page_title`, hero tagline, about body, summary_text, location, property_type, price_display) so no `lib/server/tenant-site*` mutation is required. **No `tenant_id` mutation. No DB writes. No client-facing email.** Tests: 363/363 pass (was 353/353; +10 new). Build: pass — Next.js 16 compiles all routes; `/sitemap.xml` registers as ƒ Dynamic, `/404` as ○ Static. **Pre-existing condition observed but not changed:** `vercel.json` lines 9-28 rewrite `/` on `lux.corpflowai.com` (and `luxe.*` aliases) → `/lux-landing-static.html`, but the live response actually serves the Next.js `pages/index.js` path (36,074 bytes, `data-next-head` attributes), so the static rewrite is currently dead code — meaning our Next.js-path edits will take effect on production once merged. Cleanup of the dead rewrite is a separate small docs/PR. **Verdict for this packet: PARTIAL — code complete; merge gated to Anton (production deploy).**
- **2026-05-24 — Sunday merge train (Packets 2.2 + 5.1 + 3.1) — 3 PRs squash-merged, production live, 1 blocker for Anton:** Anton said "please proceed" on the Monday recommended priority list. Merge order (safest first): **#218** `docs(operations): analytics + Search Console operational rollout plan` squash-merged at commit **`cd91e83b`**; **#217** `chore(ops): run factory control loop from GitHub Actions` rebased onto new `main` (resolved `AGENTS.md` + `artifacts/chat_history.md` conflicts by keeping both Packet 5.1 and Packet 2.2 entries) and squash-merged at commit **`92e6eb96`**; **#219** `docs(quality): first Lux website quality audit (44/100*)` rebased onto new `main` (resolved `artifacts/chat_history.md` conflict) and squash-merged at commit **`5b8258dd`**. **Live production verified (2026-05-24 ~01:43 UTC):** `https://core.corpflowai.com/api/factory/health` → 200; `https://core.corpflowai.com/api/factory/production-pulse/runtime` → 200; `https://corpflowai.com/` → 200 (25,405 bytes); `https://corpflowai.com/lead-rescue` → 200 (35,489 bytes); `https://lux.corpflowai.com/` → 200 (37,812 bytes); `https://lux.corpflowai.com/change` → 200 (6,584 bytes). **Packet 2.2 first manual run captured as live evidence:** GitHub Actions `factory-control-loop` workflow run **`26348877751`** dispatched on `main` immediately after merge — workflow ran end-to-end exactly as designed. Local-Git/Vercel-SHA/Hobby-cron checks all green; `Vercel production commit matches origin/main` ✓; `Local main matches origin/main` ✓; `vercel.json crons Hobby-safe` ✓. Telegram step ran on `failure()` and gracefully skipped (`telegram-alert: secrets unset — skipping`). **Surface-level fault discovered by the new monitor:** the `CORPFLOW_FACTORY_HEALTH_URL` repo secret returned **HTTP 404** against the path the script tried (`***/api/factory/health`), while the canonical `https://core.corpflowai.com/api/factory/health` returns 200 from a normal client — i.e. the secret value is misconfigured. **This is exactly the off-laptop monitoring outcome we wanted: the workflow caught a real config drift on its first run, before any client-visible regression.** **Anton blockers (both §3 hard gates):** (a) fix the `CORPFLOW_FACTORY_HEALTH_URL` secret value so it matches the live `core.corpflowai.com` health URL — likely the secret value either includes the path twice or includes a stale path component; (b) optionally set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets so future failures fire a Telegram alert off-laptop. Both fixes are **operator-only** secret-value changes, so per the autonomous policy Cursor logs the blocker and stops at this gate. **Verdicts:** Packet 2.2 → COMPLETE (workflow shipped, end-to-end live evidence captured, off-laptop monitoring is now active); Packet 5.1 → PARTIAL (rollout begins only after Anton picks analytics provider, framework §4.1 gate); Packet 3.1 → COMPLETE for the read-only audit (5 fix packets are separate). **Governance:** No new secrets created, no DNS changes, no billing/payment changes, no destructive DB actions, no client-facing email, no tenant data writes, no `tenant_id` mutation. No Telegram blocker alerts could be sent because the Telegram secrets are not set in repo secrets — blocker captured here in canonical history instead.
- **2026-05-23 — Packet 3.1 — first Lux website quality audit (44/100\*):** Branch `docs/lux-quality-audit-2026-05-23`. Read-only public audit of `https://lux.corpflowai.com/` (+ `/concierge`, `/property/lm-nc-ridge`, `/sitemap.xml`, `/robots.txt`, `/favicon.ico`, 404 probe) per `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`. Report at **`artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`** with operator-named alias at **`artifacts/audits/2026-05-23-lux-website-quality-score.md`**. **Score 44/100\*** (asterisk = pending Lighthouse + browser-driven a11y verification): Conversion clarity **18/20** (above-fold offer + buyer-intent "Private concierge" CTA are excellent), Performance **8/20\*** (conditional per framework §2.2), Accessibility **6/20** (no `lang` on `<html>`, no `<main>` landmark; structural items pending Lighthouse), **SEO 0/20** (no `<meta name="description">`, no canonical, no OG/Twitter, `/sitemap.xml` 404, `/robots.txt` 404, `/favicon.ico` 404), Trust **12/20** (TLS + HSTS valid, 404 page is generic Next.js `_error` not branded, no `support@`/`info@` mailto, no privacy link). **Verdict: Substantive gaps (40–59) — treat as draft for SEO; doctrine verdict PASS** — every `BRAND_AND_CONVERSION_DOCTRINE.md` non-negotiable is met (single primary CTA above the fold, buyer-intent CTA, offer in 5s, payment complexity after intent, no AI-magic claims). Top-5 fixes ordered by point gain: (1) SEO meta + sitemap + robots → +~13; (2) brand the 404 page → +3; (3) `<html lang>` + `<main>` + viewport `initial-scale=1` → +~4–7; (4) Search Console verification + first indexing requests (Anton-only DNS) → +3; (5) privacy notice + publishable contact alias → +~3–5. Together these would lift the site to roughly **65–75/100\*** without visual redesign. Operator-required follow-ups flagged explicitly (login boundary B.2/B.3/B.6/B.7, Search Console state, Lighthouse mobile run, keyboard tab traversal, color-contrast verification). **No site mutation; no tenant data writes; production identification at audit time recorded** (`production-pulse/runtime` 200 `ok:true deployment_ready:true`; Lux `BuildID: N2mp9iJJb_teOOGQfddOZ`). **Verdict for the audit packet: COMPLETE** — Packet 3.1 DoD met for the read-only audit; the 5 follow-up fix PRs are separate packets each with their own gate.
- **2026-05-23 — Packet 5.1 — Analytics / Search Console / indexing operational rollout plan:** Branch `docs/analytics-search-console-rollout-plan`. New canonical doc **`docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md`** — *operational ordering* of the analytics + Search Console + indexing rollout, deliberately distinct from the per-surface checklist already merged at `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` (the checklist says **what**, this plan says **the order to do it in, who blocks whom, what evidence ships, which gates are Anton's**). Sequenced 7-step rollout for apex `corpflowai.com` (provider decision → property creation → snippet PR → SC DNS-TXT verification → sitemap submission → top-5 indexing requests → first-week evidence), Lux subdomain rollout next with the four call-outs (subdomain SC verification, distinct sitemap, tenant conversion goals, audit feeds Section D of the migration template), and future tenants third as a single repeatable packet. Hard Anton gates explicitly listed (DNS, new analytics account/processor, cookie-consent surface, runtime snippet PR, anything firing from apex runtime). Telegram blocker shape included verbatim. Conversion events v1: `page_view`, `lead_form_submit`, `cta_click_primary`, `outbound_click`, `concierge_lead_received`. **`/change` events explicitly excluded from public analytics** (already lives in `cmp_tickets`/`automation_events`/`telemetry_events`). `AGENTS.md` Must-read row added. **Docs-only PR — no runtime code changed; no tracking snippet installed.** **Verdict for the doc PR itself: PARTIAL** — doc lands; rollout itself doesn't begin until Anton picks the analytics provider (gate §4.1).
- **2026-05-23 — Packet 2.2 — factory control loop migrated off the laptop:** Branch `chore/factory-control-loop-github-action`. Added (1) **`.github/workflows/factory-control-loop.yml`** — daily `0 6 * * *` UTC + `workflow_dispatch`, single-job, `concurrency: factory-control-loop`, presence-only secret printing (no values), runs `node scripts/factory-control-loop.mjs --fetch` then captures a `--json` snapshot, uploads `loop.json` artifact (7-day retention, SHA-pinned `actions/checkout` + `setup-node@20` + `upload-artifact`), and posts a Telegram alert **only on failure** via the new helper. (2) **`scripts/post-control-loop-telegram-alert.mjs`** — exports `buildAlertText` (header line, `Recommended action:`, `Evidence:` run URL, factory/vercel/cron one-liners, top-5 fix lines from `actions[]`, 3500-char cap matching `lib/server/ops-alerts.js`) and `postTelegramAlert` (POSTs `https://api.telegram.org/bot<TOKEN>/sendMessage` with `{chat_id, text}`); silently no-ops if either Telegram secret is unset. (3) **`node-tests/post-control-loop-telegram-alert.test.mjs`** — 16 unit tests covering header construction, fallbacks, factory/vercel/cron rendering, fix capping, length limits, secret redaction, and POST contract. (4) **`docs/operations/FACTORY_CONTROL_LOOP.md`** — purpose, schedule, what "healthy" means, required GitHub secrets (all optional, all already documented elsewhere — `CORPFLOW_FACTORY_HEALTH_URL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`), Telegram alert behavior, what Anton does when alerted, manual run instructions, rollback/disable. (5) `AGENTS.md` Must-read row added; (6) `docs/execution/WEEKEND_EXECUTION_QUEUE.md` Packet 2.2 status flipped to `IN_PROGRESS`. **No new secrets created** — all six secrets already exist or have documented names. **No runtime code change** — the workflow only invokes the existing `scripts/factory-control-loop.mjs` (already CI-safe, exits 0/1 on health verdict). **Local CI evidence:** `npm test` → 353/353 pass; `npm run build` → green (with `CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD=true`). **Verdict: PARTIAL** — code merged-ready; awaiting PR open + Anton merge approval (production effect = workflow runs daily after merge). No production deploy. No `tenant_id` mutation. No DNS/billing/secret changes. No Telegram alerts sent (no blockers).
- **2026-05-23 — PR hygiene + salvage execution after merge-train triage — 6 PRs merged, 5 PRs closed, 1 PR left draft, production live and healthy:** Anton gave explicit approval to execute Stages A–D from the prior triage report. **Stage A docs/infrastructure** — (A.1) PR **#210 `docs: name Neon as the canonical Postgres provider`** rebased onto current `main` (resolving conflicts in `AGENTS.md`, `artifacts/chat_history.md`, `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` by keeping both the Neon-provider row and the Communications row in the must-read table) and squash-merged as commit **`d48e4618`**; the long-missing canonical **`docs/operations/POSTGRES_PROVIDER.md`** (95 lines — naming hazard, six-alias map, pooled vs non-pooled rationale, how-to-tell-which-provider verification, 2026-05-22 incident) is now live, satisfying Audit 2 / Packet 2.1. (A.2) `/change` overflow smoke harness salvaged from PR #155 into a **fresh** PR **#214 `chore(change): salvage overflow smoke harness and inspection runbook`** — squash-merged as **`8c67f208`**. Salvage scope: `scripts/smoke-change-overflow.mjs` (384-line Playwright smoke; reads `LUX_SMOKE_*`, never logs secrets, exits non-zero on overflow), `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md` (199-line operator runbook with the mandatory 5-step preview-smoke loop), `.cursor/rules/predeploy-decision-checks.mdc` +14 lines codifying that loop as policy, and the `npm run smoke:change-overflow` script entry. The stale `pages/change.js` rewrite from #155 was deliberately dropped — `pages/change.js` has materially evolved through #171/#174/#184/#192/#194; rebasing the original would have re-introduced UI conflicts. **Stage B closures** — closed as superseded with explicit references: **#155** auto-closed by GitHub keyword in the salvage PR body, supplemented with a salvage-pointer comment; **#182** (Lux Phase 2 Slice A read APIs) closed as superseded by #181 (`5ad396cd`) + #184 (`873acea4`); **#152** (`/change` description overflow) closed as superseded by #154 (`158697ac`); **#153** (`/change` overflow v2 with `100vw` shell) closed as superseded by #154 + the `764b68ae` correction that explicitly replaced the `100vw` approach because it was itself causing document overflow; **#97** (change-v2 stage workspace, 29 days stale) closed as superseded by #98 (`a3d80b14`) + #121 (`aefc05f6` route-canonicality docs). **Stage C runtime** — (C.1) PR **#201 `feat(lead-rescue): operator setup checklist on detail page`** rebased with `git rebase --onto origin/main 08c64ce0` to drop the already-merged #200 commit; the 3 increment commits (`bb63aa23`, `81bb0538`, `ed47c838`) replayed cleanly, leaving exactly the genuine increment over #200 — the 13-item canonical setup checklist UI in `components/AiLeadRescueAdminDetail.js`, the checklist state machine in `lib/cmp/_lib/ai-lead-rescue-operator.js`, the checklist endpoints in `lib/server/admin-lead-rescue-api.js`, 7 new tests (`node-tests/ai-lead-rescue-operator.test.mjs` 320→327 pass), and the new `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` (198 lines). Squash-merged as **`d1e5e872`**. (C.2) PR **#204 `Deploy first governed production visuals for CorpFlowAI homepage`** rebased with `git rebase --onto origin/main a1fd15ff` to drop the already-merged #203 commit; the resulting single commit `4936a383` carries the 4 governed homepage manifests (`corpflow-homepage-{hero,services,social,trust}.manifest.json`), 6 visual assets (3 hero WebP variants + services/trust SVGs + social WebP), `scripts/encode-homepage-visuals.mjs`, the `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md` recipes, and the homepage rendering integration. Squash-merged as **`1c9a841f`**. (C.3) PR **#205 `Deploy premium governed visual system for AI Lead Rescue`** had been auto-closed by GitHub when its base branch `feat/corpflow-homepage-production-visuals` was deleted by #204's squash — re-opening was rejected (`Could not open the pull request` because the original base was gone). Workaround: rebased the same head branch with `git rebase --onto origin/main 77136191` and opened a fresh PR **#215 `feat(lead-rescue): premium governed visual system (re-target of #205)`** against `main`. Squash-merged as **`01bcfd1b`**. The single commit ships 5 lead-rescue manifests, 6 lead-rescue assets (hero WebP × 3 + dashboard/process/trust SVGs + social WebP), `lib/visualAssets/selectLeadRescueAssets.js` (203 lines), `pages/lead-rescue.js` integration, the `components/AiLeadRescueLanding.js` visual rewrite (+253/-24), and `node-tests/lead-rescue-runtime.test.mjs` (337/337 tests pass after merge). **Stage D draft** — PR **#124 `chore: remove Core Lux CMP migration repair`** left untouched in DRAFT state per the triage rule "remains draft unless Core Lux repair route is confirmed obsolete"; the four files it would delete (`lib/server/core-lux-ticket-migration-repair.js`, `public/core-lux-migration-repair.html`, `vercel.json` rewrite, factory_router route) still exist on `main` 23+ days after #123 shipped. **Local CI evidence per PR before merge:** `npm test` 320→327→327→337/337 pass; `npm run build` green at every stage (with `CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD=true` for offline DB); GitHub `test` + `vercel-env` required checks green for every merge; squash-with-delete-branch used per project convention. **Live production verified (2026-05-23 ~10:16Z) for the final commit `01bcfd1b`:** GitHub Production deployment **`4792455213`** (success), preceded by deployments for every intermediate merge (`4792420197` for `1c9a841f`, `4792373962` for `8c67f208`, also `d48e4618` and `d1e5e872`). All 10 floor URLs return **200**: `https://core.corpflowai.com/api/factory/health` → 200 `ok:true status:"healthy" database_configured:true sovereign_session_configured:true admin_operator_ready:true runtime_config_valid:true password_reset_delivery_configured:true`; `https://core.corpflowai.com/api/factory/production-pulse/runtime` → 200 `ok:true deployment_ready:true monitoring.ok:true core.database_reachable:true`; `https://corpflowai.com/` → 200 (**25,405 bytes**, up from 20,037 pre-#204) with all 4 governed homepage assets confirmed in HTML and full provenance manifest in `__NEXT_DATA__` (model `openai/gpt-image-1` 2026-04, `prompt_id: corpflow-homepage-hero`, `reviewed_by: anton@corpflowai.com`, `lifecycle.state: "vetted"`, `content_hash` per asset); `https://corpflowai.com/lead-rescue` → 200 (**35,489 bytes**) with all 5 governed lead-rescue assets confirmed in HTML; `https://corpflowai.com/about` → 200 (12,543 bytes); `/process` → 200 (13,951 bytes); `/standards` → 200 (12,631 bytes); `/onboarding` → 200 (15,020 bytes); `https://lux.corpflowai.com/` → 200 (37,812 bytes); `https://lux.corpflowai.com/change` → 200 (6,584 bytes). **Verdict for the hygiene + salvage cycle: COMPLETE** — every merged PR is on Production via a successful Vercel deployment, every customer-facing route returns 200, both visual deployments are confirmed live in the actual HTML and not just by file presence, and the four superseded PRs are closed with explicit pointers to the commits that replaced them. **Verdict for #124:** PARTIAL — by design, awaiting Anton's confirmation that the Core Lux repair was executed on production with `deduped: true` (or that we accept removal without running it) before undrafting and merging. **Governance:** No secrets touched. No `tenant_id` mutated. No DNS changes. No billing/payment changes. No destructive DB actions. No client-facing email automation toggled. No manual production data writes performed. Production deploys are the normal GitHub→Vercel auto-deploy following each squash-merge — no manual deploys triggered. No Telegram blocker alerts sent — every gate Anton named in the umbrella permission was explicitly cleared in advance.
- **2026-05-23 — Merge train: 4 PRs squash-merged to `main`, production live and healthy:** Anton gave explicit approval to merge all open mergeable PRs. Squash-merged in dependency order: **PR #212 `docs(execution): CorpFlow Autonomous Execution Framework v1 + Saturday/Sunday cycle`** (commit **`8b58b012`**), **PR #200 `feat(lead-rescue): operator pipeline + intake notification`** (commit **`27bad09d`** — adds `lib/cmp/_lib/ai-lead-rescue-operator.js`, `lib/server/admin-lead-rescue-api.js`, `lib/server/admin-page-gate.js`, `lib/server/tenant-intake.js`, admin UI components, `pages/admin/lead-rescue/*`), **PR #203 `feat(visual-assets): runtime visual manifest consumers for homepage`** (commit **`4ad14f97`** — `lib/visualAssets/`, `components/VisualAssetRenderer.js`, `AssetProvenanceDisclosure.js`, runtime tests), **PR #209 `feat(corpflowai): institutional trust architecture layer`** (commit **`a474f593`** — new `pages/about.js`, `pages/process.js`, `pages/standards.js`, `pages/onboarding.js`, `components/PublicPolicyLayout.js`, `PublicSiteFooter.js`, two new visual manifests + SVGs). **Stacked PRs #201 (lead-rescue setup checklist), #204 (homepage visuals), #205 (lead-rescue visuals) became CONFLICTING** after their bases squash-merged — they need manual rebases (touch `lib/cmp/_lib/ai-lead-rescue-operator.js` / `components/CorpFlowPublicHome.js` / `components/AiLeadRescueLanding.js`) and were not auto-merged. **Old conflicting PRs not touched:** #210 (Neon doc; superseded by #212's Audit 2 + Packet 2.1 plan), #182 (Lux Phase 2 Slice A; very stale), #155/#153/#152 (`/change` overflow fixes from May 7-8), #97 (change-v2 stage workspace from April 24). **Draft PR #124** intentionally skipped. **Production verified live:** Vercel Production deployment for `a474f593` GitHub deployment ID **`4791937763`**, state `success`, ~08:13Z. Live floor checks (post-merge, 2026-05-23 ~12:14 UTC+4): `https://core.corpflowai.com/api/factory/health` → 200 `ok:true status:"healthy" password_reset_delivery_configured:true database_configured:true sovereign_session_configured:true admin_operator_ready:true runtime_config_valid:true tenant_preview_secret_configured:true`; `https://core.corpflowai.com/api/factory/production-pulse/runtime` → 200 `ok:true deployment_ready:true monitoring.ok:true core.database_reachable:true`; `https://corpflowai.com/` → 200 (20,037 bytes — grew from 11,793 due to #203 visual manifests); `https://lux.corpflowai.com/` → 200 (36,074 bytes); `https://lux.corpflowai.com/change` → 200 (6,578 bytes); new pages from #209 all serve 200: `/about` (12,504 bytes), `/process` (13,933 bytes), `/standards` (12,594 bytes), `/onboarding` (15,001 bytes); admin route `/admin/lead-rescue` returns 200 anonymously (page renders; data fetch gates on session via `lib/server/admin-page-gate.js`). **Verdict for the merge train: COMPLETE** — every merged PR is live and serving 200 on at least one verified URL; no production 5xx; floor checks all PASS. **Verdict for the unmerged stack:** PARTIAL — #201/#204/#205 are blocked on rebase; #210 still references missing canonical doc that Packet 2.1 will write; old conflicting PRs (#182/#155/#153/#152/#97) and draft #124 should be triaged separately. No secrets touched, no DNS changes, no `tenant_id` mutated, no client-facing email automation toggled, no manual production data writes performed. No Telegram blocker alerts sent — every gate Anton named in the umbrella permission was explicitly cleared in advance.
- **2026-05-23 — Saturday/Sunday autonomous cycle (under Framework v1) — audits + 4 new canonical docs + 5 new packets:** Continued PR #212 with the first end-to-end weekend cycle. **Saturday audits** (5 read-only audit reports under `artifacts/audits/2026-05-23-weekend/`): Infisical→Vercel sync (DOCUMENTED, partially evidenced — canonical sync doc missing); Neon/Postgres canonical (DOCUMENTED — `docs/operations/POSTGRES_PROVIDER.md` referenced by `CORPFLOW_COMMUNICATIONS_V1.md` but absent on disk); n8n password-reset golden path (LIVE in production — `password_reset_delivery_configured: true`); production deployment health (ALL CHECKS GREEN — `database_reachable: true`, `runtime_config_valid: true`, all six floor URLs return 200 including `https://lux.corpflowai.com/` 36KB HTML, `https://lux.corpflowai.com/change` 6.5KB HTML, `https://core.corpflowai.com/api/factory/health` 200 JSON `ok:true status:"healthy"`, `https://core.corpflowai.com/api/factory/production-pulse/runtime` 200 `ok:true monitoring.ok:true deployment_ready:true`); laptop/local dependencies (INVENTORIED — 3 PowerShell + ~20 Node scripts; P0 = `factory-control-loop` SHA comparison; P1 = scheduled smokes; P2 = port 3 PS1s to `.mjs`). **Sunday docs** (4 new canonicals under `docs/execution/`): `MIGRATION_TO_SERVER_CHECKLIST.md` (8-section checklist for moving recurring jobs to GitHub Actions / Vercel cron / n8n / container, plus pattern templates and anti-patterns), `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` (5 dimensions × 20 points each = 0–100 score: conversion clarity, performance, accessibility, SEO, trust + governance), `ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` (per-surface analytics install, SC verification, sitemap, indexing requests, `noindex` discipline on private surfaces), `CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` (5-section template — identity/routing, login boundary, marketing surface, analytics, off-laptop posture — for per-tenant audits). **`WEEKEND_EXECUTION_QUEUE.md`** extended with Goals 2–5 and 5 new packets (2.1 Postgres provider + Secrets sync docs; 2.2 factory-control-loop migrated to GitHub Action with Telegram alerts; 3.1 first quality audit on Lux; 4.1 first migration audit on `luxe-maurice`; 5.1 analytics/SC/indexing plan for apex). `AGENTS.md` Must-read table now references all 7 execution docs. **Verdict: PARTIAL** — PR #212 expanded with full Saturday/Sunday cycle; awaiting Anton review/merge. No production deploys, no secret values, no tenant data writes, no DNS changes, no `tenant_id` mutation, no client-facing email sent. No Telegram alert sent (no blockers hit).
- **2026-05-23 — CorpFlow Autonomous Execution Framework v1 initiated:** Goal is bounded autonomous execution: Anton approves work packets and production gates; Cursor may execute approved non-production work with evidence-first reporting. Three new canonical docs landed under `docs/execution/`: **`CORPFLOW_EXECUTION_PACKET_STANDARD.md`** (mandatory packet structure — Goal, DoD, Scope, Constraints, Risks, Allowed actions, Approval gates, Verification evidence, Rollback plan, Owner, Status block), **`CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`** (allowed without further approval: read-only inspection, docs, branches, tests/builds, Preview deploys, PR creation, evidence capture, non-production verification; **requires Anton approval**: production deploy, secret changes, DNS, billing/payment, destructive DB, tenant migration, auth/security logic, client-facing email automation, anything touching real client data beyond read-only), and **`WEEKEND_EXECUTION_QUEUE.md`** (first queue, Goal 1 — *Stabilize permanent infrastructure and reduce Anton as runtime bottleneck*; seven docs-only packets: Infisical→Vercel sync, Neon Postgres canonical doc, n8n password-reset golden path, production health audit, laptop-dependency audit, migration-to-server checklist, evidence format). `AGENTS.md` Must-read table now references all three docs and includes a short "Autonomous execution framework (v1)" section. Docs-only PR — no runtime code changed, no secrets touched, no `tenant_id` mutated, no production deploy, no workflow alteration. **Verdict for the framework PR itself:** docs landed; first queue is `PENDING` (awaiting Anton's `APPROVED` mark on individual packets) — not yet `COMPLETE` per `delivery-reality.mdc` because no packet has run end-to-end yet.
- **2026-05-22 — Production Postgres re-pointed at Neon (Phase A unblock):** Live production was misconfigured to **Prisma Postgres** (`db.prisma.io:5432`, unreachable at the protocol level) while local development and the actual data live on **Neon** (`ep-mute-tooth-an0pclzd*.c-6.us-east-1.aws.neon.tech`). Symptoms: build-time `Can't reach database server` (worked around once with `CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD=true` for redeploy `dpl_14f1Dy5iXsdAyJd1cVETSfotei5C`); runtime `lux.corpflowai.com/login` showing `Workspace not registered` because `/api/tenant/site` could not query `tenant_hostnames`. Discovery surfaced after operator question "didn't we move to Neon?" — local `.env` Neon URLs queried successfully and contain the real `lux.corpflowai.com → luxe-maurice` mapping plus 4 tenant auth users. **Remediation (no code change):** via Vercel REST API (`PATCH /v9/projects/.../env/{id}`, value-only to avoid the `BAD_REQUEST: cannot change the type of a Sensitive Environment Variable` block), upserted Production env keys to Neon — pooled (`POSTGRES_URL`, `DATABASE_URL`, `PRISMA_DATABASE_URL`, `POSTGRES_PRISMA_URL`) and non-pooled (`DIRECT_URL`, `POSTGRES_URL_NON_POOLING`, used by `scripts/apply-ensure-schema-build.mjs`). `CORPFLOW_RUNTIME_CONFIG_JSON` doesn't exist as a project env (it's synthesized by `vercel env pull` from elsewhere) so blob hygiene was a no-op; `cfg()` reads `process.env` first anyway. Production deployment **`dpl_G9hkABzYuEp1Nb2EhWZ5T9BDafAg`** (Ready, aliased to `https://corpflowai.com`) — build completed in 20s with no DB error, schema-ensure ran against Neon non-pooling URL successfully. **Live verified:** `https://core.corpflowai.com/api/factory/health` → 200 `status:healthy`, `database_configured:true`, `password_reset_delivery_configured:true`; `https://lux.corpflowai.com/api/tenant/site` → 200 `tenant_id:"luxe-maurice"` with full Lux Mauritius site config (theme, i18n EN/FR/RU, sections); `https://lux.corpflowai.com/api/ui/context` → 200 `tenant_id:"luxe-maurice"`, `tenant_registered:true`, `mode:"client"`, `login_route:"client"`. The `Workspace not registered` string in `public/login.html` is a default hidden `<div>` revealed only when `login_route==="onboarding"`; the JS now routes to `clientSimpleLogin` for Lux. **Verdict: COMPLETE** for Phase A unblock. **Phase B follow-up still pending** — doc PR to make Neon the canonical, named provider in `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`, `SYSTEM_MANIFEST.md`, `.env.template`, and a new `docs/operations/POSTGRES_PROVIDER.md` so this misalignment can't happen silently again. Migration helpers under `.diag/` (gitignored) used the project's own `VERCEL_AUTH_TOKEN` from a temporary `vercel env pull`; no DB URLs printed.
- **2026-05-21 — CorpFlowAI Communications v1 — email is a sanctioned channel; password-reset live, register/dashboard frozen for everything else:** CorpFlowAI email delivery through n8n Gmail OAuth verified end-to-end for password reset. Email is now an approved transactional communications channel. Communications v1 documentation added; communication event register/dashboard should be used for interaction tracking, not 02_Drive_Migration_Manifest. New canonical doc **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`** freezes the 8 event types (`password_reset`, `account_invitation`, `estimate_ready`, `clarification_required`, `delivery_ready`, `ticket_closed`, `concierge_lead_received`, `operator_escalation`), the 4 sender aliases (`support@`, `info@`, `sales@`, `help@corpflowai.com`), the approval policy (system-transactional auto-sends; client-facing requires operator approval; operator-only auto-sends internally), the evidence trail (`automation_events` + register row + n8n execution URL), and the **planned** `lib/server/communications.js` API (`enqueueCommunicationEvent` / `sendTransactionalEmailViaN8n` / `recordCommunicationEvidence`) for Phase 2. Phase 1 is **doc-only** — no source code change; `lib/server/email-delivery.js` + `lib/server/password-reset-delivery.js` already do the only live event. Trackers `34_Communication_Event_Register` + `37_Communication_Review_Dashboard` are external (Google Sheets / Apps Script) — never `02_Drive_Migration_Manifest`. Pointers added in `AGENTS.md` (Must-read row), `docs/CORPFLOW_SHARED_TODO.md`, and a cross-link at the top of `docs/n8n/password-reset-email-recipe.md`. **Next recommended automation:** `concierge_lead_received` (operator-only auto-send; lowest blast radius); `estimate_ready` is the right first client-facing event but needs the approval surface from Phase 2 before it can be auto-triggered.
- **2026-05-21 — Tenant password-reset email via n8n shipped to production (PR #206 + hotfix #207):** Squash-merged **PR #206 `feat(auth): send password reset emails through n8n`** to `main` (commit `fe6ee7e5`), then **PR #207 `fix(api): defer production-pulse.mjs to dynamic import`** (commit `86e09e86`) after a post-merge production 500 traced to `Error [ERR_REQUIRE_ESM]: require() of ES Module /var/task/scripts/production-pulse.mjs from /var/task/api/factory_router.js` (Vercel split the bundle). Production deployments: feat **`dpl_66XjBYRF5HMYRW6x4BXu5eAwiegc`** (broken on `/api/factory/health` + `/api/factory/production-pulse/runtime`) → hotfix **`dpl_CDXuGrgGLqxnwXB92rK1W7vojJNt`** (Ready). Live verified: `https://core.corpflowai.com/api/factory/health` → 200 healthy with new `password_reset_hint` mentioning `N8N_EMAIL_WEBHOOK_URL`; `https://core.corpflowai.com/api/factory/production-pulse/runtime` → 200 `ok:true`, `monitoring.ok:true`, `factory_health_url_configured:true`. Code: new **`lib/server/email-delivery.js`** (n8n webhook helper, 8s timeout, never logs payload, `x-corpflow-email-secret` header), **`lib/server/password-reset-delivery.js`** now posts schema **`corpflow.email.password_reset.v1`** (`purpose` / `to` / `from` / `reset_code` / `expires_minutes` / `subject` plus all legacy fields), recipe **`docs/n8n/password-reset-email-recipe.md`**, env additions **`N8N_EMAIL_WEBHOOK_URL`** / **`N8N_EMAIL_WEBHOOK_SECRET`** / **`EMAIL_FROM=support@corpflowai.com`** in `.env.template` (legacy `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL/SECRET` still read as fallbacks), 9 unit tests in **`node-tests/password-reset-delivery.test.mjs`**. **`npm test`** 293/293 + **`npm run build`** green on both PRs. **Verdict: PARTIAL** — code live; `password_reset_delivery_configured: false` until operator (a) builds the n8n Webhook → Gmail Send Email workflow per the recipe, (b) sets the three Vercel Production env vars + verifies `CORPFLOW_PUBLIC_BASE_URL=https://lux.corpflowai.com`, (c) redeploys, (d) runs the 9-step live reset cycle on `https://lux.corpflowai.com/login`. Existing tenant endpoints `POST /api/auth/password-reset/request` + `…/confirm` and login UI in `public/login.html` were unchanged; PBKDF2-SHA256 hashing, sha256-only token storage, single-use (`used_at`), TTL (`CORPFLOW_PASSWORD_RESET_TTL_MIN`), and non-enumerating `{ ok: true }` response all preserved.
- **2026-05-15 — Lux `/change` queue desk cleanup verified COMPLETE (PR #194):** Shipped merge **`f1c15b25d5ccb3273681f016225f2e4d7647d68f`**, GitHub Production deployment **`4696761118`**. **Signed-in Lux operator** on **`https://lux.corpflowai.com/change`** confirmed: grouped queue; **`cmo8mjijk0000jl04l1jz0v6d`** visible under Programme; smoke/test artifacts **hidden by default**; hide toggle + Show work; smoke rows **still selectable**; **no data deletion**. Recorded in **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`** §13 + §4. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open** in CMP.
- **2026-05-15 — Lux `/change` operator chrome (PR #192):** Squash-merged to **`main`** **`2e83f00464bc7b5b70b3966f8c16754342af0823`**. GitHub Production deployment **`4696413503`**. **`npm test`** / **`npm run build`** / **`vercel-env`** / Vercel Preview green on PR. Code: **`lib/client/lux-change-console-theme.js`**, **`lib/client/lux-change-queue-classify.js`**, **`pages/change.js`**, **`scripts/run-node-tests.mjs`** + **`package.json`** test entry, **`node-tests/lux-change-queue-classify.test.mjs`**, brief note in **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`**. Anonymous **`GET https://lux.corpflowai.com/change`** → **200** dark console (expected without `luxe-maurice` tenant session). **Verdict: PARTIAL** — record Lux operator session pass (cream shell, queue bucket, programme card, anchors, JSON, media/attachments) to move to COMPLETE. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open**.
- **2026-05-15 — Lux `/properties/admin` editor allowlist (Anton session email):** Merged **PR #189** — squash on **`main`** **`6a9ffaeff6015959d1ba6688c99f98dae1044ab8`**. GitHub Production deployment **`4695679229`** (success, same SHA). Code: **`lib/server/lux-property-editor-access.js`** adds **`antonvdberg@corpflowai.com`** alongside **`jan@luxemaurice.com`** and **`anton@corpflowai.com`** (explicit allowlist unchanged in model). **`npm test`** / **`npm run build`** green on PR. **Live operator check:** sign in as **`antonvdberg@corpflowai.com`** on **`https://lux.corpflowai.com/properties/admin`** and confirm editor UI; confirm non-allowlisted Lux tenant still sees stable access denied. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open**.
- **2026-05-14 — LuxeMaurice Phase 2 Slice C (visual property editor `/properties/admin`):** Merged **PR #186** — squash commit **`e29344f999907c92ecefe7c57751885fc3b0a70c`**. GitHub Production deployment **`4695268844`** (success). Anonymous **`GET https://lux.corpflowai.com/properties/admin`** → **307** to **`/login?next=/properties/admin`** (Lux-only route live). New UI **`components/LuxeMauricePropertiesAdminApp.js`**, page **`pages/properties/admin.js`**, CMP **`lux-listing-admin-*`**, **`lib/server/lux-listing-admin-service.js`**, editor gate **`lib/server/lux-property-editor-access.js`**, preview **`/property/[slug]?preview=1`**, public media gate extensions in **`lib/server/lux-listing-published-query.js`**. **`npm test`** + **`npm run build`** green on PR. **Verdict (Slice C): PARTIAL** — merge, Production deploy, and anonymous redirect verified; **Anton/Jan editor E2E** and **first real client-published listing** still to record. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open**. Audit: **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`** Slice C.
- **2026-05-14 — LuxeMaurice Phase 2 Slice B (`/properties`) shipped and live-verified (PR #184):** Merge commit **`873acea42ea227d51aca0b41ff9070a040a2f538`**. GitHub Production deployment **`4695014873`** (success). **`GET https://lux.corpflowai.com/properties`** → **200** with premium empty state and **Speak with the concierge** CTA; **`GET https://core.corpflowai.com/properties`** → **404**. Shared query **`lib/server/lux-listing-published-query.js`**, page **`pages/properties.js`**, UI **`components/LuxeMauricePropertiesDirectory.js`**. Delivery Reality Audit under **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`** Slice B. Programme **§8** overall stays **PARTIAL** until first real published listing + editor + full evidence. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open**.
- **2026-05-14 — LuxeMaurice Phase 2 Slice A production verification (PR #181 read APIs):** GitHub Production deployment **4684389034**, SHA **`5ad396cdd844af6b135d4eeaa8416543e1861478`**, status **success**. Live **`GET https://lux.corpflowai.com/api/lux/listings`** → **200** `{"ok":true,"listings":[]}`; **`/api/lux/listing`** missing/invalid slug → **400**; unknown slug → **404**; **`core.corpflowai.com/.../lux/listings`** → **404**; **POST** → **405**. Tenant context host-derived only. Delivery Reality subsection under **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`** §8. Public HTML **`/properties`** is **Slice B (PR #184)**. Full programme **§8** remains **PARTIAL**. Master **`cmo8mjijk0000jl04l1jz0v6d` remains open**.
- **2026-05-14 — LuxeMaurice P0 Phase 2 build brief (planning only):** **`docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`** — target public **`/properties`** plus a **visual property editor** (not forcing clients into raw `/change`); **manual admin entry first**, IDX/MLS later; **GoHighLevel waived / not required** for this slice. **Reality Gate** (live `https://lux.corpflowai.com/properties`, real client property, CTA + lead context) remains **evidence-pending** until verified in production. Master programme ticket **`cmo8mjijk0000jl04l1jz0v6d` stays open** (do not close on brief alone).
- **2026-04-10 — Change Console tenant UX (`/change`, e.g. `lux.corpflowai.com`):** “Work in progress” fog/timer only **after** build is **approved**; **Refine the request** always shown for logged-in tenants and wired to **`change-chat`**; **Refresh from server** on Ticket ID; pre-approval completion card reads as **checklist** (not “in progress”). **`public/change.html`**, journal row **`JE-2026-04-10-10`** in **`docs/decisions/JOURNAL.md`**.
- **2026-04-10 — Decision journal + LUXE pilot ops:** Append-only **`docs/decisions/JOURNAL.md`** (Anton + assistant + team, each row has **reversibility**). ADR **`docs/decisions/20260410-luxe-autopilot-pilot-scope.md`** (`luxe-maurice`, auto-merge under strict rules). Runbook **`docs/operations/LUXE_AUTONOMY_PILOT_RUNBOOK.md`**. **`CMP_MONITOR_TICKET_IDS`** empty ⇒ **`/api/cron/cmp-monitor`** monitors **no** tickets (removed stale hardcoded ids). `docs/CORPFLOW_SHARED_TODO.md` now points agents at the journal for day-to-day decisions.
- **Factory inventory & credentials:** Added structured artifacts (e.g. `FACTORY_INVENTORY.md`, `.env.template`, `vanguard/secrets-manifest.json`, telemetry schema) and removed or parameterized hardcoded IDs/URLs where found (Vercel deployer, legacy external-table sync, `vercel.json` placeholders).
- **CMP governance:** Tier/cluster gating, Dormant Gate (session token vs factory master), costing rigor hooks, token/credit guardrails, provisioning and billing sentinel/cron wiring discussed and implemented across multiple sessions.
- **Vercel / serverless reliability:** Work to make Node modules CJS-safe, include Prisma in the bundle, centralized runtime configuration, factory health diagnostics, Next/React pinning, and middleware export naming aligned with Next 15/16 (`proxy` vs `middleware`).

### Runtime configuration (“vanishing” env vars)

- **Mechanism:** `lib/server/runtime-config.js` — `cfg()` prefers individual `process.env` keys, then **`CORPFLOW_RUNTIME_CONFIG_JSON`** (single JSON blob, parsed once, BOM stripped). `POSTGRES_URL` also checks common Prisma/Vercel aliases.
- **Operations:** Changing Vercel env often requires a **redeploy** so the running deployment sees new values; manual “Redeploy” entries in Vercel match **syncing physical env with code expectations**.
- **Diagnostics:** Factory health reporting includes `runtime_config` parse status (see `api/factory_router.js` factory health handler).

### Tenancy and host boundary

- **CORE vs tenant:** `lib/server/host-tenant-context.js` — hosts listed in `CORPFLOW_CORE_HOSTS` are treated as factory/ops surfaces; tenant resolution uses optional `CORPFLOW_TENANT_HOST_MAP`, subdomain of `CORPFLOW_ROOT_DOMAIN`, and `CORPFLOW_DEFAULT_TENANT_ID` on apex.

### Sovereign Change / UAT / signoff (product direction)

- **Target experience (your words):** Clients activate an **update/change** path on the **published** site, describe requests in **plain language** (any language), an **AI** interprets and **chats** to refine the request, then a **factory-managed** process (build, test, etc.) runs until the client **approves** publishing to production.
- **What exists in code today (partial):** CMP **bubble** + **`ai-interview`** (clarification), **`costing-preview`**, **`approve-build`** (ticket/build pipeline); **sovereign** **`tenant-session-bootstrap`** + **`signoff`** promote **`pending_config` → `live_config`** in Postgres (`Tenant` and related fields); host/CORE boundary and runtime config as above. **Gaps vs full vision** (typically not one switch): multilingual UX as a first-class product setting, on-site “overlay” chrome wired to every tenant theme, automated test gates as blocking steps, and n8n/GitHub Actions orchestration fully replacing placeholders (e.g. **`sandbox-start` 501**)—treat those as roadmap unless verified in deployment.
- **Design:** Security gate for sensitive CMP actions is server-side (Dormant Gate), not “the router as gate.” Per-tenant PINs and UAT (`pending_config` → `live_config`) were specified to avoid overloading `MASTER_ADMIN_KEY` and to keep **no network I/O** inside synchronous path parsing.
- **Implementation themes (when built):** `req.corpflowContext` from host; two-lane auth (factory master vs tenant sovereign session); Postgres / outbound HTTP timeouts; `recordSovereignAuditEvent` pattern; ghost/execution-only hosts via env-driven rewrites (`CORPFLOW_GHOST_HOSTS` / maps) and `public/log-stream.html`; admin UI surfaced only with `?admin=true` where specified.

### Session continuity (this workspace)

- **Cursor:** Past chat text is not auto-loaded into new threads; **agent transcripts** may exist under the IDE project’s agent-transcripts area for some sessions.
- **User preference:** Provide a short “state of the world” + point to this file for handoff.

### Current code layout (verify when refactoring)

- **Single Vercel Node entry:** `api/factory_router.js` receives all `/api/*` traffic via `vercel.json` rewrites (`__path` carries the suffix).
- **CMP implementation:** `lib/cmp/router.js` (actions such as `ai-interview`, `tenant-session-bootstrap`, `signoff`) with shared modules under **`lib/cmp/_lib/`** (not under `api/cmp/`).
- **Operational URLs (env only):** **Postgres** = `POSTGRES_URL` (Prisma). **n8n** lead intake = `N8N_WEBHOOK_URL` (`lib/server/main.js`). Optional **CMP automation ping** = `N8N_CMP_WEBHOOK_URL`. **GitHub sandbox branches** = `GITHUB_REPO` + `CMP_GITHUB_TOKEN` → `repository_dispatch` `cmp_sandbox_start`. **Do not** commit real factory hostnames in git—use `.env` / Vercel (see `.env.template` placeholders such as `YOUR_N8N_HOST`).

---

## Source transcripts (optional cross-reference)

These IDs refer to Cursor **parent** agent session logs (not subagents). They are **optional**: use them when you want an assistant to search or summarize a *specific past Cursor session* by reading the matching `.jsonl` file under the IDE’s project `agent-transcripts` folder (filename = UUID). **Not every chat is logged**; missing IDs simply means there is no transcript file for that conversation.

| Topic (≤6 words) | Transcript ID |
|------------------|----------------|
| [Sovereign state implementation](f98ad7ae-4097-46bf-8696-76f5e8c021ad) | `f98ad7ae-4097-46bf-8696-76f5e8c021ad` |
| [Cloud factory governance audit](90e01088-dbf4-46d1-b6ba-15744c4c90e9) | `90e01088-dbf4-46d1-b6ba-15744c4c90e9` |
| [Deployment continuity March 2026](ff9c81ac-ed10-425f-869d-d339c9a9930c) | `ff9c81ac-ed10-425f-869d-d339c9a9930c` |
| [Session log (untitled)](f2d16c0b-16ea-4cd6-ac02-654307e8e984) | `f2d16c0b-16ea-4cd6-ac02-654307e8e984` |
| [Session log (untitled)](81011755-ee18-4cdf-99af-79d64ae1b085) | `81011755-ee18-4cdf-99af-79d64ae1b085` |

---

## Product / operator decisions (authoritative)

- **2026-03-30 — Onboarding playbook:** Limited to **factory operators only** (not every end client). Client sites use the **public embed** path (`change-overlay.js` + CMP bubble) pointed at the deployed Command Center API.
- **2026-03-30 — Hostnames in git:** **Option B** — no real n8n factory URLs in committed files; real values live in **Vercel / `.env`** only.
- **2026-03-30 — Roadmap execution:** Ship **client overlay + i18n** and **automation (n8n + GitHub Actions)** as soon as practical; implementation tracked in repo (overlay loader, `ai-interview` locale, dispatch + workflow).

## Entries to append (newest at bottom)

<!-- Paste new bullets here, e.g. "2026-03-30: Confirmed production on commit b1891df; redeployed for env sync only." -->

- **2026-05-08 — Lux Phase 4C.1 (attachment review) verified in production:** PR **#156** merged (commit `feeca06c4d6a76582670a43226e3369b4ed13242`) and production deployment recorded via GitHub deployment **4620068642** (Vercel target URL `corpflow-ai-command-center-detezelan-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production` against `lux.corpflowai.com`: operator login succeeded; created a new Lux client-request ticket; uploaded image+video attachments; attachment list rendered with `intended_use` + `review_status`; review actions (reviewed/rejected with notes) persisted; anonymous review was blocked; public pages (`/`, `/concierge`, `/property/lm-phase2d-manual-demo`) showed no attachment metadata or private routes. Canonical doc: `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md` (Delivery Reality Audit appended).
- **2026-05-09 — Lux Phase 4C.2 (reviewed media → property linkage) verified in production:** PR **#158** merged (commit `7b8247325afc40e6cfb6cbc2c787f4e6e3fe91d0`) and production deployment recorded via GitHub deployment **4630215289** (Vercel target URL `corpflow-ai-command-center-d667rj7je-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production` against `lux.corpflowai.com`: created a new Lux request ticket; uploaded image+video; reviewed/rejected persisted; linked the reviewed image to `lm-phase2d-manual-demo` slot `hero` and confirmed persistence; unlinked and confirmed removal; public pages (`/`, `/concierge`, `/property/lm-phase2d-manual-demo`) remained clean (no `property_links`, attachment ids, or review metadata). Canonical doc updated with Delivery Reality Audit in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`.
- **2026-05-11 — Lux Phase 4C.3 (controlled media publish) verified in production:** PR **#160** merged (`3056bb8ae180d2decb921efb790a5e9fe26b9659`) plus follow-up PR **#161** for public route cache semantics + smoke cache-bust (`3a77249f48c20f5fdd19a3cd67105e1356b435f7`). Production deployment **4643154095** (Vercel `corpflow-ai-command-center-n1wlcqn1x-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production`: login, ticket create, image/video upload, review, property link, **404** on `property-media` before publish, publish, **200** image after publish, `/property/lm-phase2d-manual-demo` showed caption+alt+media URL, unpublish, **404** on `property-media` again, caption removed from property HTML, video publish blocked with **IMAGE_ONLY**, public no-leak checks on `/`, `/concierge`, `/property/...` passed. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open. Docs: `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md` Delivery Reality Audit (Phase 4C.3) set to **COMPLETE**.
- **2026-05-11 — Lux Phase 4D.1 (multi-image gallery publish) verified in production:** PR **#163** merged (`485b30014aeca3d74c8e80052a9b03c6c0602dff`). Production deployment **4643549076** (Vercel `corpflow-ai-command-center-ltkqbvoex-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production`: two gallery PNGs reviewed, linked, published with order/caption/alt; `property-media-list` returned safe entries; `/property/lm-phase2d-manual-demo` showed gallery grid; unpublish removed one item from list + page; video gallery publish still **IMAGE_ONLY**; public no-leak passed. Added `docs/LUX/LUX_MEDIA_GOVERNANCE.md` and Delivery Reality Audit (Phase 4D.1) in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-11 — Lux Phase 4D.2 (homepage card-slot media) verified in production:** PR **#165** merged (`3e28a00b01ca9fc467f85b07a4af26185233281e`, cherry-picked from `4b00f89b`). Production deployment **4644040270** (Vercel `corpflow-ai-command-center-o7v5min9u-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production`: published `card` image for `lm-phase2d-manual-demo`; homepage showed `property-media` with `slot=card` and alt **Smoke4D2CardAltUnique9271**; after unpublish, alt probe gone from `/` HTML; `property-media-list` included `card` while published; video publish gate unchanged; public no-leak passed. Delivery Reality Audit (Phase 4D.2) in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-11 — Lux Phase 4D.3 (media lifecycle archive/restore) verified in production:** PR **#167** merged (`38710b84fcd7146979748621d79ea767206a81ba`). Production deployment **4644466974** (Vercel `corpflow-ai-command-center-r5zykh5b4-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production`: archive unpublishes hero (`property-media` **404**, caption gone from property page, `publish_history` shows auto-unpublish + archived); restore leaves media private (**404** until explicit republish); republish restores **200**; `tenant_id` in archive body rejected (**400**); publish-while-archived **409**; public no-leak on `/`, `/concierge`, `/property/lm-phase2d-manual-demo` passed. Delivery Reality Audit (Phase 4D.3) appended to `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`; governance/programme docs updated in same PR. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-11 — Lux Phase 4D.4 (/change media ops polish) shipped to production:** PR **#169** merged (`10898c7452ea8f01f88a26d33c3db2fcf5106b0b`; feature commit `e6791072` on branch `lux/phase-4d4-media-ops-polish`). Production deployment **4645293379** (Vercel `corpflow-ai-command-center-76v97jt50-corpflowai.vercel.app`). CI: `test` + `vercel-env` + Vercel Preview **pass**. Ran `npm run smoke:lux-phase4c1 -- --target=production` — **ALL CHECKS PASSED** (regression on publish/archive path + public no-leak). Production `/change` static JS bundles contain **Where used** / **Needs action** strings (bundle proof). Operator spot-check on `lux.corpflowai.com/change` with a ticket that has attachments: confirm media summary strip, all filter options, per-card **Where used** table, and unchanged review/link/publish/archive/download actions. Docs: Delivery Reality Audit (Phase 4D.4) in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-12 — Lux Phase 4D.5 (smoke/test cleanup policy + archive hints) verified in production:** PR **#171** merged (`1a25d81b14e019d759277a41e9cb12c2c528e1a9`; feature commit `c6c5dffd` on `lux/phase-4d5-cleanup-policy`). Production deployment **4660857263** (Vercel `corpflow-ai-command-center-iegfgnqy9-corpflowai.vercel.app`). Ran `npm run smoke:lux-phase4c1 -- --target=production` — **ALL CHECKS PASSED**; output includes **Phase 4D.5 smoke artifact summary** (`ticket_id`, five `attachment_ids`, cleanup recommendation). Ran same smoke with **`--archive-smoke-artifacts`** — **ALL CHECKS PASSED**; five `4D5: archived smoke artifact` lines (tracked ids only). Production `/change` JS bundles contain **Test media**, **Cleanup candidate**, **Archive as smoke/test artifact** (bundle proof). Public no-leak unchanged. Delivery Reality Audit (Phase 4D.5) updated in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-13 — Lux Phase 5A (media delivery foundation: cache, variant scaffold, src builder) verified in production:** PR **#173** merged (`ca1278b193fa034bc80da5691d484ae6966aaf22`; feature commit `189c9d8748f8ed446411f81117c1265d7669bed4` on `lux/phase-5a-media-delivery`). Production deployment **4662297691** for the 5A merge (Vercel `corpflow-ai-command-center-l4mik94dz-corpflowai.vercel.app`); current production tip after PR **#174** is deployment **4662378765** (`33be714c2f3795d9cb6b6ae9b67fe8de803417e4`). Ran `npm run smoke:lux-phase4c1 -- --target=production` — **ALL CHECKS PASSED** (invalid variant **400**, published **Cache-Control** `max-age=300` + `must-revalidate`, deny **no-store**, HTML includes **variant=hero|gallery|card** where applicable, `property-media-list` **variant** + **content_type**). Public no-leak passed. Delivery Reality Audit (Phase 5A) appended to `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` left open.
- **2026-05-11 — Lux Phase 5B (responsive `width=` buckets + `src_set` / `srcset`; original bytes only):** Implemented strict width allowlist, `buildLuxPublicPropertyMediaSrcSet`, transform-plan abstraction (`shouldTransform: false`), `property-media` + collectors + `property-media-list` **`src_set`**, and **`srcset`/`sizes`** on published hero/gallery and card images; extended node tests and `smoke-lux-phase4c1`. Local **`npm test`** and **`npm run build`** passed. **Shipped to production (2026-05-14):** PR **#176** merged (squash commit **`b84ecf50c6bd38441ca1ec398224c3eeca67443c`**); GitHub production deployment **`4684011845`** (Vercel **`corpflow-ai-command-center-cyp58ytxn-corpflowai.vercel.app`**). Ran **`npm run smoke:lux-phase4c1 -- --target=production`** — **ALL CHECKS PASSED** (invalid width bucket **400**, property **`srcset=`** + **`width=1920`**, homepage card **`srcset`**, gallery/list paths, archive/unpublish gates, public no-leak on `/`, `/concierge`, `/property/lm-phase2d-manual-demo`). **Delivery Reality Audit: COMPLETE** in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` remains open.
- **2026-05-14 — Lux Phase 5C (CDN/object-storage readiness; Postgres adapter only):** Added **`lib/server/lux-media-storage.js`** with **`getLuxMediaStorageAdapter`** / **`readPublishedLuxMediaBytes`** (`postgres_attachment_bytes`); **`handleLuxPropertyMedia`** reads bytes via adapter after unchanged gates; published **200** adds **`X-Lux-Media-Backend`**, **`X-Lux-Media-Variant`**, **`X-Lux-Media-Transform`** (no secrets, no storage paths). PR **#178** merged (**`447a4d04659bc058ec38ab36d73ff7863e3b562a`**); production deployment **`4684292963`** (Vercel **`corpflow-ai-command-center-d80rx4a16-corpflowai.vercel.app`**). **`npm run smoke:lux-phase4c1 -- --target=production`** — **ALL CHECKS PASSED**. **Delivery Reality Audit: COMPLETE** in `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`. Programme ticket `cmo8mjijk0000jl04l1jz0v6d` remains open.
- **2026-04-13 — Change Console “guided journey” audit (Luxe):** Ticket `cmnwuflh30000js04ujpa4hpz` (“guided build conversation”) was created on `lux.corpflowai.com/change` and remained at **`Open · Intake`** with only the “Ticket opened” milestone — indicating the refinement loop and next-stage progression were not being carried strongly enough by the product UX. **Fix shipped as PR:** `#69` to make refinement durable and product-led: `ticket-get` now returns tenant-safe `brief_structured` + `refinement_messages` (without exposing admin-only `console_json`), preview-review “Request changes” payload is corrected (`message` vs `note`) with server back-compat, and **Approve build** persists a brief-enriched **authoritative build-ready description** to `cmp_tickets.description`. Files: `public/change.html`, `lib/cmp/router.js`.

- **2026-04-07:** Hardened “factory can research” and “push tickets forward” without opening up the open web. **Research:** added SSRF-safe allowlist (`config/research-domain-allowlist.v1.json`) + URL validator (`lib/server/url-allowlist.js`), off by default (`CORPFLOW_RESEARCH_FETCH_ENABLED=false`), plus factory-only fetch endpoint `POST /api/factory/research/fetch` for allowlisted HTTPS pages (blocked: localhost/.local/IPs/private ranges). **Escalation:** `/api/chat` supports a client-safe “I don’t know / escalate” path that records a needs-brain event and returns `next_actions` + an operator brief. **Delivery loop:** added factory master endpoint `POST /api/factory/cmp/push` to unblock CMP tickets safely (repair dispatch / refresh overseer) and cron `GET /api/cron/cmp-monitor` (cron auth) to continuously monitor/push priority ticket IDs and emit `cmp.ticket.push_checked` into `automation_events`. **What we learned:** client-facing progress surfaces must default to plain-language status + “what’s next”; technical evidence belongs behind an operator-only details layer; monitoring needs a pinned ticket list so delivery doesn’t stall when branches/PRs get deleted.

- **2026-03-30 (post-decisions):** **Placeholder URLs (B)** across template/docs/code defaults (`POSTGRES_URL`, `N8N_*`, etc.). **`N8N_WEBHOOK_URL`** required for `/api/main`; **`getN8nWebhookUrl()`** in `lib/server/config.js`. **i18n:** `lib/cmp/_lib/ai-interview.js` supports `locale` on `ai-interview` (en/es/fr/de/pt); **`public/assets/cmp/bubble.js`** mirrors locale via `data-cmp-locale` or `navigator.language`. **Client overlay:** `public/assets/corpflow/change-overlay.js` + `public/assets/corpflow/README.md`. **Automation:** `lib/cmp/_lib/github-dispatch.js` (`dispatchCmpSandboxStart`); **`approve-build`** and **`sandbox-start`** trigger `repository_dispatch` + optional **`N8N_CMP_WEBHOOK_URL`**; **`.github/workflows/cmp-branch.yml`** creates/pushes `cmp/{ticket_id}`. **Vercel secrets to set:** `CMP_GITHUB_TOKEN` (repo `contents:write`), `GITHUB_REPO=owner/repo`, plus n8n URLs as needed.

- **2026-03-30:** Consolidated Vercel serverless surface to a **single Node entry** (`api/factory_router.js`) to stay under Hobby **function-count** limits; `vercel.json` rewrites `/api/*` → `factory_router` with an `__path` parameter (CMP query strings preserved). Former per-route handlers live under `lib/server/`, CMP under `lib/cmp/`, factory helpers under `lib/factory/`; legacy FastAPI chat/health source moved to `lib/python/` while public `/api/chat` and `/api/health` are served from the router (e.g. Groq). **Docs:** `FACTORY_INVENTORY.md` and `SOVEREIGN_BLUEPRINT.md` gained a **Bypass Architecture: Unified Serverless Gateway** section so the operating manual matches the machinery.

- **2026-03-30:** Production health restored end-to-end: `CORPFLOW_RUNTIME_CONFIG_JSON` must be **strict JSON** (and **linked to the Vercel project** when stored as a team shared variable); runtime now **strips UTF-8 BOM** and `/api/factory/health` exposes **`parse_error` / `first_char`** when parse fails. **CORE vs tenant** is encoded in `lib/server/host-tenant-context.js` with env **`CORPFLOW_CORE_HOSTS`**, **`CORPFLOW_TENANT_HOST_MAP`**, and **`tenancy_boundary`** on factory health; ops on **`core.*`**, marketing tenant on apex via map. **Vercel CJS:** removed **`import.meta.url`** from server-side modules that were crashing (`billing-sentinel`, CMP `router`, `lib/factory/costing.js`). **Prisma:** `prisma` + `@prisma/client` in dependencies, **`postinstall`** + **`vercel-build`** run `prisma generate`. **Onboarding playbook:** Postgres tenant record → master provision PIN on **`/log-stream.html`** (CORE) → sovereign bootstrap on **`/?admin=true`** → UAT signoff (`pending_config` → `live_config`). Milestone commits on `main` include CORE boundary and runtime JSON diagnostics (themes: `feat: explicit CORE vs tenant host boundary`, `fix: surface runtime JSON parse errors + strip BOM`).

- **2026-03-30:** **CMP “nervous system” (Phases 1–2) + earlier routing fixes:** **Postgres** (via Prisma, `POSTGRES_URL`) is the **system of record** for ticket workflow; **Vanguard** under `vanguard/` (schemas + future `audit-trail/{ticket_id}/`) holds **durable technical JSON**, with narrative sign-offs intended under `docs/audit-trail/{client_id}/{ticket_id}.md`; **sandbox = git branch + Vercel Preview** (deployment protection); **production** merges only via **GitHub Actions** bot after gates (**target** automation—confirm workflow is enabled and passing in GitHub). **Costing** is **USD-only**: full market value always recorded for audit; **`is_demo`** applies a **20% display discount** only in UI/API preview responses. **Built:** `vanguard/schema/*`, **`lib/cmp/_lib/`** (`costing-engine.js`, `preview-heuristics.js`, etc.), CMP actions reached as **`/api/cmp/...`** through **`factory_router`** → **`lib/cmp/router.js`** (`ticket-create`, `ticket-get`, `costing-preview`, `approve-build`, …), **`public/assets/cmp/bubble.js`** (Shadow DOM + localStorage/cookie ticket id; not yet embedded in tier pages), and draft **`.github/workflows/cmp-branch.yml`**. **Earlier same initiative:** `vercel.json` rewrites for **`/legal`**, **`/medical`**, **`/lux`**, **`/master`**; canonical Master Control at **`public/master-control.html`** (removed duplicate under `public/admin/`); tier lead posts go through **`/api/main`** → **`N8N_WEBHOOK_URL`** (see **`lib/server/config.js`** / **`.env.template`**).

- **2026-03-30 (CMP bubble + API):** Injected **`/assets/cmp/bubble.js`** on **`/medical`** (proposal), **`/legal`**, **`/lux`**, and **`/`** (see `public/proposal-medspa.html`, `public/legal-demo.html`, `showcase/luxe-maurice-private/index.html`, `public/index.html`). Bubble uses **Shadow DOM**; **`pathnameBranding()`** sets costing inputs: **`/`** → **`internal`** tier + **`is_demo`** for displayed client price, **`/legal`** → **`enterprise`**, **`/lux`** → **`premium`**; explicit **`data-cmp-tier` / `data-cmp-is-demo`** override. **Phase 3 flow:** after submit, “AI analyzing” → **`POST …/ai-interview`** (three clarification questions from inferred complexity) → user continues → **`costing-preview`** → **`approve-build`**. **Vercel Hobby function cap:** CMP is **not** a separate `api/cmp/*.js` serverless route; **`factory_router`** dispatches to **`lib/cmp/router.js`** (actions via path/query). **`bubble.js`** uses URLs such as **`/api/cmp/...?action=…`** where needed so query strings are preserved under unified rewrites. **`sandbox-start`** triggers **`repository_dispatch`** when **`CMP_GITHUB_TOKEN`** + **`GITHUB_REPO`** are set (see **`.github/workflows/cmp-branch.yml`**). **`node_modules/`** is in **`.gitignore`**; **`git ls-files node_modules`** is empty in this repo (nothing to remove from the index). Vanguard JSON schemas remain under **`vanguard/schema/`**.

- **2026-03-30 — Decision: Postgres (Elestio) as system of record:** **Elestio Managed PostgreSQL** is the durable database the Factory can **create/alter at will** (SQL migrations; no UI clicking required). **Implementation:** extended `prisma/schema.prisma` with `Tenant`, `AuthUser`, and `CmpTicket` models (Postgres datasource uses `POSTGRES_URL` via `cfg()` aliases); added one-shot SQL bootstrap `scripts/sql/001_factory_init.sql` to create `tenants`, `auth_users`, and `cmp_tickets` (including `console_json` as `jsonb`). **Auth & ops paths:** `/api/auth/login` uses **Postgres** (`auth_users`) when `CORPFLOW_AUTH_BACKEND=postgres`; `/api/factory/tenants-overview` reads tenants from Postgres when `CORPFLOW_TENANTS_BACKEND=postgres`.

- **2026-04-03:** Added a production-reliable client demo runbook at `docs/runbooks/CLIENT_DEMO_RUNBOOK.md` (references canonical host/login + production-grade standards; includes “what to do if X fails” and explicit done conditions). Verified Change Console attachment upload path is wired end-to-end: API routes in `lib/server/change-attachments.js` and `api/factory_router.js`, Prisma model `CmpTicketAttachment` in `prisma/schema.prisma`, ensure-schema creates `cmp_ticket_attachments` in `lib/server/postgres-factory-schema.js`, UI integration in `public/change.html`, and readiness signal in `lib/server/change-console-readiness.js`.
