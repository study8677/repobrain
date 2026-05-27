# Factory Inventory (Tools & Infra Bridge)
Generated: `2026-03-25` · API layout refreshed: `2026-03-26`

This document organizes the repo’s runnable code/artifacts into three “Factory surfaces”:
1. Computed Logic (Python/JS)
2. Data Storage (Postgres / local JSON / filesystem)
3. Communication (API routes + automation shells)

For each entry, a **Standardized Invocation** is provided.

## Bypass Architecture: Unified Serverless Gateway

Vercel’s **Hobby** tier caps deployed **serverless functions** (historically twelve). This repo previously exposed many distinct `api/**/*.js` files—each file typically becomes its own function—so the cap was easy to hit while the product still needed Sentinel, Notary/CMP, factory costing, webhooks, and crons online.

**Consolidation strategy:** a single HTTP entrypoint, `api/factory_router.js`, receives **all** `/api/*` traffic. `vercel.json` rewrites every path of the form `/api/<rest>` to `/api/factory_router?__path=<rest>` (client query strings, such as CMP `?action=`, are preserved on rewrite). Inside the router, a small dispatcher switches on `__path` and invokes the same handlers as before, now living under `lib/server/`, `lib/cmp/`, and `lib/factory/`.

**Why this matters:**

| Benefit | Effect |
|--------|--------|
| **Lean footprint** | One function slot on Hobby instead of many duplicates of runtime bootstrap. |
| **Predictable cold starts** | One code path warms; fewer divergent bundles to cache. |
| **Same outward URLs** | Clients keep calling `/api/main`, `/api/cmp/...`, `/api/cron/billing-sentinel`, etc.; only deployment layout changed. |
| **Machinery unchanged** | Business logic moved to `lib/`; the router is a thin gateway. |

**Source of truth:** `vercel.json` (`rewrites` + `crons`) and `api/factory_router.js`.

## CORE vs tenant boundary (anti-contamination)

**Goal:** client/tenant data and factory-operator power must not share the same *implicit* hostname tenancy. A mistake like `core.corpflowai.com` deriving `tenant_id = "core"` would blend ops traffic with a client row space.

| Surface | Typical host | `req.corpflowContext.surface` | `tenant_id` |
|--------|----------------|-------------------------------|-------------|
| **CORE** (factory / ops) | e.g. `core.corpflowai.com` | `core` | always `null` — no client tenant from subdomain |
| **Tenant** (client site / sovereign flows) | apex or `{slug}.corpflowai.com` | `tenant` | from `CORPFLOW_TENANT_HOST_MAP`, then subdomain rule, then apex default |

**Configuration (env):**

- `CORPFLOW_CORE_HOSTS` — comma-separated hostnames for CORE (must include your ops subdomain once DNS + Vercel attach it).
- `CORPFLOW_TENANT_HOST_MAP` — JSON map of hostname → tenant id; use for apex marketing tenant, e.g. `{"corpflowai.com":"corpflowai"}`.
- `CORPFLOW_ROOT_DOMAIN` — apex domain for subdomain derivation (default `corpflowai.com`).
- `CORPFLOW_DEFAULT_TENANT_ID` — apex fallback when host not in map (prefer explicit map for production apex).

**Code:** `lib/server/host-tenant-context.js` (single resolver); `api/factory_router.js` calls it from `attachTenantFromHost`.

**Ops entry:** open master / tenant overview from CORE, e.g. `https://core.corpflowai.com/log-stream.html` (after DNS).

## Computed Logic (Python / JS)

### Agent Engine (Python)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `core/engine/agent.py` | Main GeminiAgent entrypoint | `python core/engine/agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/src/agent.py` | Core Think-Act-Reflect agent implementation | `python core/engine/src/agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/autonomous_agent.py` | Autonomous multi-step orchestrator | `python core/engine/autonomous_agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/sync_sheets.py` | Factory sync runner (auditing loop) | `python core/engine/sync_sheets.py` |
| `core/engine/force_luxe_sync.py` | Tenant sync accelerator | `python core/engine/force_luxe_sync.py` |
| `core/engine/integrity_guard.py` | Pre-flight integrity checks | `python core/engine/integrity_guard.py` |
| `core/dispatch.py` | CLI dispatcher into response engine | `python core/dispatch.py "<TENANT_ID>" "<QUERY>"` |

### Local Tools (Python)
Tools are auto-discovered by the agent from `core/engine/src/tools/*.py` (public functions only).

| Tool module | Standardized Invocation |
|---|---|
| `core/engine/src/tools/example_tool.py` | `python -c "from core.engine.src.tools.example_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/demo_tool.py` | `python -c "from core.engine.src.tools.demo_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/openai_proxy.py` | `python -c "from core.engine.src.tools.openai_proxy import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/ollama_local.py` | `python -c "from core.engine.src.tools.ollama_local import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/memory_tools.py` | `python -c "from core.engine.src.tools.memory_tools import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/execution_tool.py` | `python -c "from core.engine.src.tools.execution_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/mcp_tools.py` | `python -c "from core.engine.src.tools.mcp_tools import list_mcp_servers; print(list_mcp_servers())"` |

### Services / Utilities (Python)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `core/services/response_engine.py` | Tenant-aware lead detection → n8n webhook or local JSONL capture | `python core/services/response_engine.py` |
| `core/services/vercel_deployer.py` | Provision Vercel subdomains/domains | `python core/services/vercel_deployer.py` |
| `core/services/whatsapp_notifier.py` | WhatsApp lead alert (Twilio) | `python core/services/whatsapp_notifier.py` |
| `core/services/api_gateway.py` | API gateway utilities | `python core/services/api_gateway.py` |
| `core/services/notifier.py` | Admin notification hooks | `python core/services/notifier.py` |
| `core/services/booking_manager.py` | Google calendar booking (example) | `python core/services/booking_manager.py` |
| `core/onboarding/tenant_onboarding.py` | Prints Postgres/API provisioning guidance | `python -m core.onboarding.tenant_onboarding` |
| `core/onboarding/onboard_client.py` | Create tenant workspace skeleton | `python core/onboarding/onboard_client.py` |
| `core/src/onboarding.py` | Legacy onboarding helper | `python core/src/onboarding.py` |
| `ai_gateway.py` | Gateway glue (see file) | `python ai_gateway.py` |
| `sync_conductor.py` | Poll external glue endpoint + update `brand-config.json` | `python sync_conductor.py` |
| `system_rebuild.py` | Rebuild/fix factory state | `python system_rebuild.py` |
| `add_columns.py` | Google Sheets header update example | `python add_columns.py` |
| `core/engine/src/sandbox/*` | Sandboxed execution primitives | `python core/engine/src/sandbox/local.py` |

### Computed Logic (Node / JS)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `api/factory_router.js` | **Unified gateway** — sole Vercel Node entry; dispatches by `__path` | `npx vercel dev` / `npx next dev` then call any `/api/...` route (see Communication) |
| `lib/cmp/router.js` | CMP action router (imported by the factory router) | Same public URLs: `POST /api/cmp/ticket-create`, `GET /api/cmp/ticket-get`, etc. |
| `lib/cmp/_lib/*.js` | CMP costing/impact helpers | `node lib/cmp/_lib/<FILE>.js` (module-style) |
| `lib/factory/costing.js` | Token reservoir / persona debits (CMP uses this) | Imported by `lib/cmp/router.js`; not a standalone HTTP route |
| `lib/factory/attribution.js` | Request/header attribution for factory actions | Imported where wired; paths relative to `lib/factory/` |
| `lib/server/provision.js` | Tenant provisioning (Postgres) | `POST /api/provision` |
| `lib/server/audit.js` | Audit / DB stability handler (Prisma) | `POST /api/audit` |
| `lib/server/webhook.js` | Incoming Telegram webhook (registration is Telegram-side against `TELEGRAM_BOT_TOKEN`; re-run `setWebhook` after token rotation — see `docs/operations/MONITORING_ARCHITECTURE.md` § 4.4) <!-- inbound-webhook-rotation-note --> | `POST /api/webhook` |
| `lib/server/main.js` | Lead handoff / n8n intake | `POST /api/main` (and `POST /api/intake` — aliased in router) |
| `lib/server/config.js` | `getN8nWebhookUrl()` — `cfg('N8N_WEBHOOK_URL')` (env or `CORPFLOW_RUNTIME_CONFIG_JSON`) | Imported by `lib/server/main.js` |
| `lib/server/admin-leads.js` | Admin leads listing (Prisma) | `GET /api/admin-leads` |
| `lib/server/feedback.js` | Feedback accept | `POST /api/feedback` |
| `lib/server/legal-search.js` | Demo legal precedent search | `GET /api/legal-search` |
| `lib/server/billing-sentinel.js` | Billing sentinel (invokes Python); used by cron | `GET /api/cron/billing-sentinel` |
| `lib/python/index.py` | Legacy FastAPI chat/health module | **Not** a Vercel route anymore; parity lives in `api/factory_router.js` (`/api/chat`, `/api/health`). Optional: `python -m uvicorn` with app pointed at this file if running locally |
| `lib/python/onboard_logic.py` | Onboarding logic module | Import from Python tooling; not mounted as `/api` by default |
| `pages/index.js` | Web entry UI | `npx next dev` |
| `scripts/onboard_luxe.js` | Tenant onboarding script via Prisma | `node scripts/onboard_luxe.js` |
| `scripts/verify-cmp-env-read.mjs` | Smoke-test `cfg()` + JSON blob for n8n/GitHub CMP env | `node scripts/verify-cmp-env-read.mjs` |
| `scanner.js` / `public/scanner.js` | Local scanners / tunnel blocks (UI + scripts) | `node scanner.js` |

## Data Storage (Postgres / local JSON / DB)

### Primary durable store (Postgres via Prisma)
| Artifact | Standardized Invocation |
|---|---|
| `lib/server/provision.js` (via router) | `POST /api/provision` |
| `lib/server/admin-leads.js` (via router) | `GET /api/admin-leads` |
| CMP ticket routes | `POST /api/cmp/ticket-create`, etc. (`lib/cmp/router.js`) |
| `core/services/response_engine.py` | Optional `N8N_WEBHOOK_URL` or `vanguard/audit-trail/python_lead_capture.jsonl` |

### Local / Filesystem Storage (JSON / Markdown)
| Artifact | Standardized Invocation |
|---|---|
| `memory/agent_memory.md` | Memory is written automatically by the agent |
| `memory/agent_summary.md` | Memory summary checkpoint |
| `agent_memory.json` | Legacy/alternate memory artifact (if used elsewhere) |
| `brand-config.json` | Updated by `sync_conductor.py` |
| `data_cache.json` | Updated by `auditor.sh` / sync jobs |
| `recovery_vault.json` | Journal recovery when DB calls fail |
| `feedback-db.json` | Feedback storage (if used by routes) |
| `client_manifest.json` | Client routing manifest |
| `db/*.db` | SQLite artifacts (avoid in prod if constrained) |
| `luxe_core.db`, `luxe_intelligence.db` | Local intelligence DB |

### Prisma / Relational DB
| Artifact | Standardized Invocation |
|---|---|
| `prisma/*` | `npx prisma generate` then use Prisma client in `lib/server/*` handlers |
| `lib/server/audit.js` (via router) | `POST /api/audit` |
| `lib/server/provision.js` (via router) | `POST /api/provision` |

## Communication (API Routes + Automation Shells)

### API Routes (Next/Vercel)
All routes below are served by **`api/factory_router.js`** after `vercel.json` rewrites `/api/<path>` → `/api/factory_router?__path=<path>`. Implementations live in `lib/server/`, `lib/cmp/`, and `lib/factory/`.

| Route surface | Standardized Invocation |
|---|---|
| `/api/cmp/*` (e.g. `/api/cmp/router?action=…` or `/api/cmp/ticket-create`) | `POST /api/cmp/ticket-create`, `GET /api/cmp/ticket-get?id=...`, `POST /api/cmp/costing-preview`, `POST /api/cmp/approve-build`, `POST /api/cmp/ai-interview`, etc. |
| `/api/provision` | `POST /api/provision` |
| `/api/audit` | `POST /api/audit` |
| `/api/webhook` | `POST /api/webhook` |
| `/api/main`, `/api/intake` | `POST /api/main` or `POST /api/intake` (same handler) |
| `/api/admin-leads`, `/api/feedback`, `/api/legal-search` | Match HTTP method as implemented in each `lib/server/*.js` handler |
| `/api/stats` | `GET /api/stats?tenant_id=...` (dashboard stub; Prisma-backed where configured) |
| `/api/cron/billing-sentinel` | `GET` (Vercel **Cron** invokes this path daily; rewrite → router) |
| `/api/chat`, `/api/health` | Groq chat + health JSON (**Node** in `factory_router`; legacy Python: `lib/python/index.py`) |

### Automation Shell Scripts
| Script | Role | Standardized Invocation |
|---|---|---|
| `deploy.sh` | Deploy/publish | `bash deploy.sh` |
| `core/engine/install.sh` | Install prerequisites | `bash core/engine/install.sh` |
| `auditor.sh` | Protected sync + showcase update | `bash auditor.sh` |
| `run_heartbeat.sh` | Heartbeat loop (sync sheets + auditor) | `bash run_heartbeat.sh` |
| `start_demo.sh` | Launch demo | `bash start_demo.sh` |
| `launch_demo.sh` | Launch demo (variant) | `bash launch_demo.sh` |
| `start_onboarding.sh` | Start onboarding | `bash start_onboarding.sh` |
| `status_hud.sh` | Display HUD | `bash status_hud.sh` |

