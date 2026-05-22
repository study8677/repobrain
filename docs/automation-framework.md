# CorpFlow automation framework (spine v1)

## Decision (Plan A)

**Single HTTP ingest** backed by Postgres, optional forward to n8n (or any webhook). Agents and integrations never fan out directly to dozens of vendors from the app tier; they post **one envelope** here first. Knowledge accumulates in **`automation_playbooks`** (curated markdown) and the append-only **`automation_events`** log.

**Plan B (if ingest volume or long-running work exceeds serverless comfort):** keep the same API contract and DB schema; move `CORPFLOW_AUTOMATION_FORWARD_URL` to a **queue consumer** (self-hosted worker, Redis/BullMQ, or n8n as orchestrator) that subscribes to new rows or receives forwards. No client contract change.

## North star (business value)

**Priority:** *Structured client intent → durable record → visible automation path → reusable playbook.*

The highest leverage across logistics, legal, education, church, medspa, restaurant, etc. is **not** a vertical feature first—it is the **spine** that every vertical plugs into:

1. Something the client says they want becomes a **typed event** with tenant scope and idempotency.
2. Operators and AIs see a **single trail** (`automation_events` + existing `telemetry_events`).
3. Repeatable fixes and integration steps become **`automation.playbook.upsert`** entries agents can list and follow.

CMP / Change Console remains the human-facing “request” surface; **automation ingest** is the machine-facing contract that lets delivery move at “days, not months” once adapters exist.

## Explicit non-goals (v1)

- No Odoo/ERP replacement, no full CRM, no billing engine, no payment execution.
- No automatic public internet “agent shopping” from production (see `docs/agent-integration-search-policy.md` for human/agent research rules).
- No vector RAG store in v1 (Postgres JSON + playbooks is enough to start).
- High-risk events (**financial, destructive, public publish**) do **not** execute here—they are **rejected** unless an explicit approval secret is present (see below).

## API

### `POST /api/automation/ingest`

**Auth (any one):**

- Header `x-corpflow-automation-secret: <CORPFLOW_AUTOMATION_INGEST_SECRET>`, or  
- Factory master: admin session cookie or `MASTER_ADMIN_KEY` / `x-session-token`.

**Body (JSON):**

| Field | Required | Description |
|--------|-----------|-------------|
| `event_type` | yes | Dotted name, e.g. `intake.request.v1` |
| `tenant_id` | no | Logical tenant; omitted → scope `global` |
| `payload` | no | Object (JSON) |
| `idempotency_key` | no | Unique per `tenant_scope`; replays return `deduped: true` |
| `correlation_id` | no | Trace across services |
| `source` | no | Default `ingest` |

**High-risk `event_type` prefixes** (default): `billing.`, `payment.`, `money.`, `delete.`, `destroy.`, `publish.public.`, `external.deploy.prod`, `invoice.pay`, `refund.`

Those require **additionally** header `x-corpflow-automation-approval: <CORPFLOW_AUTOMATION_APPROVAL_SECRET>`.

Override/extend prefixes with env `CORPFLOW_AUTOMATION_HIGH_RISK_PREFIXES` (comma-separated, lowercase).

### Playbook upsert (same endpoint)

`event_type`: `automation.playbook.upsert`

`payload`:

```json
{
  "slug": "n8n-gmail-oauth-password-reset",
  "title": "Password reset email via n8n + Gmail OAuth (canonical: docs/communications/CORPFLOW_COMMUNICATIONS_V1.md)",
  "body_md": "Wire-level recipe in docs/n8n/password-reset-email-recipe.md. All outbound email goes through the typed-event path described in docs/communications/CORPFLOW_COMMUNICATIONS_V1.md (event catalog, sender aliases, approval rules, evidence trail).",
  "tags": ["email", "n8n", "communications"]
}
```

### `GET /api/automation/playbooks`

Factory master only. Query: `tenant_scope` (optional), `q` (optional substring match on slug/title/body).

### `GET /api/automation/events`

Factory master only. Query: `tenant_scope` (optional), `limit` (default 50, max 200). Newest first — operator tail for debugging and agent sync.

## CMP mirror (Postgres only, no extra HTTP hop)

When `CORPFLOW_AUTOMATION_CMP_MIRROR` is not `false`, the Change Console backend also writes:

| `event_type` | When |
|----------------|------|
| `cmp.ticket.created` | After successful `ticket-create` |
| `cmp.estimate.recorded` | After successful `costing-preview` with a `ticket_id` |
| `cmp.build.approved` | After successful `approve-build` (includes GitHub dispatch snapshot) |
| `cmp.github.callback` | After successful GitHub Actions → `automation-callback` (preview URL, PR metadata) |

These reuse the same optional **forward** to n8n as manual ingest. See `docs/n8n/automation-forward-recipe.md`.

## Optional forward

After a successful ingest, the server **POSTs** a JSON envelope to `CORPFLOW_AUTOMATION_FORWARD_URL` (if set). Optional header `x-corpflow-automation-forward-secret` when `CORPFLOW_AUTOMATION_FORWARD_SECRET` is set.

## Database

Run after deploy (or on fresh Postgres):

`POST /api/factory/postgres/ensure-schema` (factory auth)

Tables: `automation_events`, `automation_playbooks`.

Prisma models: `AutomationEvent`, `AutomationPlaybook` (run `npx prisma generate` in CI/build).

## Tests

```bash
npm test
```

(Node unit tests live under `node-tests/`; Python engine tests use `pytest core/engine/tests/`.)
