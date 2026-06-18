# CorpFlow Chat / Concierge — destination reference (Social Intents)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `REFERENCE-ONLY / DESTINATION-SHAPE`

**Verdict:** `REFERENCE CAPTURED — NO IMPLEMENTATION AUTHORIZED`

**Source reference (external benchmark):** [Social Intents](https://www.socialintents.com/) — captured 2026-06-18 for product-shape comparison only.

**Audience:** Anton (operator), Cursor / Codex Cloud (implementation agents), future contractors.

**Related canonical docs (do not contradict):**

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — CorpFlow competes above the commodity line; chat/concierge is a managed-outcome surface, not a generic widget install.
- `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` — Lead Rescue pre-sale bot research (separate, narrower scope).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — no new self-hosted chat tools without ADR + authorization packet.
- `docs/automation-framework.md`, `docs/EXECUTION_BRAIN_VS_HANDS.md` — n8n + Postgres + CMP remain the governed execution spine.
- `.cursor/rules/delivery-reality.mdc` — customer-visible chat surfaces require live production verification when eventually built.

---

## Purpose

Social Intents is captured here as a **benchmark for the future CorpFlow Chat / Concierge destination** — the shape of capabilities we want clients and prospects to experience eventually.

Social Intents is **not** an approved implementation tool, vendor selection, or install target. No account, trial, widget, webhook, container, env var, or runtime change is authorized by this document.

---

## What Social Intents represents (benchmark summary)

Social Intents is a SaaS live-chat and AI customer-service platform oriented around **routing website and messaging-channel conversations into external team tools** — primarily Microsoft Teams, Slack, Google Chat, Zoom, and Webex — with optional WhatsApp, SMS, and Facebook Messenger channels.

Observed capability themes from the public product surface (June 2026):

- Embeddable **website chat widget** (one-line embed or CMS plugins).
- **AI-first response** trained on website content, PDFs, and help docs; model choice among major LLM providers.
- **Human handoff** when AI cannot resolve or when operators take over.
- **Unified conversation inbox** with response-time and resolution metrics.
- **Routing / escalation** to teams or departments (including cross-team routing on higher tiers).
- **Conversation history** persisted in the vendor inbox and mirrored into team-tool threads.
- **Analytics / reporting** on chat volume, AI resolution rate, and team performance.
- **Multi-channel customer entry** — website chat first in most setups; WhatsApp, SMS, Messenger as add-ons.
- **Operator UX anchored in existing team chat** — reps reply from Teams/Slack/Google Chat rather than a dedicated CorpFlow-native console.

Social Intents optimizes for teams that already live in Microsoft 365 / Slack / Google Workspace and want omni-channel support **without adopting a new inbox product**.

---

## CorpFlow distinction — native destination vs external team-tool routing

| Dimension | Social Intents (benchmark) | CorpFlow desired destination |
| --------- | -------------------------- | ------------------------------ |
| **Core operator surface** | External team tools (Teams, Slack, Google Chat, Zoom, Webex) | **Native CorpFlow chat / concierge surface** with tenant-aware context |
| **Workflow authority** | Vendor SaaS + optional custom actions | **CorpFlow-native workflows** — CMP, Postgres audit, `automation_events`, tenant intake, delivery verdicts |
| **Automation layer** | Vendor integrations | **n8n as routing / automation adapter** where appropriate (ingest, forward, approved comms events) |
| **External channels** | First-class product focus | **Adapters**, not the core system — website chat first; WhatsApp / SMS / Messenger later where appropriate |
| **Strategic posture** | Generic omni-channel support SaaS | **Above-the-line managed concierge** tied to vertical workflows and client context |

CorpFlow's preferred destination is a **native chat/concierge experience** that can orchestrate through n8n and internal workflows. External channels (Teams, Slack, WhatsApp, etc.) may exist as **optional adapters** for specific clients or operator preferences — they must not become the system of record.

---

## Desired CorpFlow Chat / Concierge capabilities (destination shape)

These are **future-state requirements**, not a build authorization:

1. **Website chat widget** — embeddable on tenant marketing surfaces (e.g. `lux.corpflowai.com`) with brand-safe theming and tenancy derived server-side.
2. **AI-first response** — grounded on approved client content (site copy, playbooks, CMP/console context where appropriate); doctrine-safe prompts per surface.
3. **Human handoff** — explicit escalation to a human operator with full transcript context; no silent drop-off.
4. **Unified conversation inbox** — operator-visible queue inside CorpFlow (not only scattered team-tool threads).
5. **Routing / escalation** — by tenant, intent, business hours, language, or vertical playbook; auditable rules.
6. **Conversation history** — persisted in Postgres with tenant isolation; retention policy TBD in a future security packet.
7. **Analytics / reporting** — volume, handoff rate, time-to-first-response, conversion to intake/CMP actions; aligned with `docs/analytics/CORPFLOW_ANALYTICS_V1.md` boundaries (no PII in analytics props).
8. **Customer channels** — **website chat first**; later WhatsApp / SMS / Messenger where appropriate and legally/contractually cleared.
9. **CorpFlow-native workflow integration** — conversations can trigger or update CMP tickets, intake records, automation events, and approved comms — not only notify an external Slack channel.
10. **n8n as routing / automation layer** — forward, enrich, and branch events through governed n8n workflows (`CORPFLOW_AUTOMATION_INGEST_SECRET`, forward secret validation) rather than ad-hoc webhooks.
11. **Text / voice mode switching** — eventual ability for a visitor to move between text chat and voice within the same session (deferred; see chatbot/voicebot audit for Lead Rescue specifics).
12. **Future AI-generated video concierge / avatar mode** — when technology is mature enough for production-grade, doctrine-safe, cost-bounded use. **Explicit target: AI-generated video, not human video** (no requirement for live human camera presence in the concierge surface).

---

## Capability comparison table

| Social Intents capability | CorpFlow desired equivalent | Current status | Notes / dependencies |
| ------------------------- | --------------------------- | -------------- | -------------------- |
| Website live chat widget | Tenant-aware embeddable widget on CorpFlow-hosted marketing surfaces | **Not built** | Requires runtime packet + security review + live DRA per tenant host |
| AI-first response (trained on site content) | Doctrine-grounded AI-first reply using approved client knowledge | **Not built** | Lead Rescue audit covers pre-sale subset only; support/concierge is broader |
| Automatic human handoff | Escalation to CorpFlow operator inbox with transcript | **Not built** | Depends on operator identity / membership model (`IM-*` multi-tenant work) |
| Unified conversation inbox | Native CorpFlow concierge inbox (tenant-scoped) | **Not built** | Distinct from `/change`; must not conflate delivery console with chat |
| Routing / escalation (teams, departments) | Rule-based routing via n8n + CorpFlow config | **Not built** | n8n forward path exists for automation events; chat routing not wired |
| Conversation history | Postgres-backed, tenant-isolated transcript store | **Not built** | Schema + retention + PII policy needed in future packet |
| Analytics & reporting | Plausible + internal metrics + optional client reporting | **Partial** | Analytics v1 exists for page events; no chat metrics yet |
| Website chat channel | Primary v1 customer channel | **Not built** | First channel when destination is authorized |
| WhatsApp / SMS / Messenger | Optional adapter channels (later) | **Not built** | Regulatory, billing, and vendor-adapter packet required |
| Reply from Teams / Slack / Google Chat | Optional **adapter** for operators who prefer team tools | **Not built** | Must remain adapter-only; CorpFlow inbox is canonical |
| Integration with business workflows | CMP, intake, `automation_events`, delivery playbooks | **Partial** | Intake + automation spine exists; no chat-triggered workflow yet |
| n8n automation layer | Governed forward/routing through existing n8n spine | **Partial** | Ingest + forward configured; chat-specific workflows not authorized |
| Text ↔ voice mode switching | Same-session modality switch | **Not built** | Deferred per `AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` voice guidance |
| AI video concierge / avatar | AI-generated video concierge (not human video) | **Not built** | Future packet gated on maturity, cost caps, brand doctrine |

---

## "Not now" guardrails (this reference PR)

The following are **explicitly forbidden** as follow-on work from this document:

- Do **not** install Social Intents (no trial, no embed, no account linking).
- Do **not** install Chatwoot, Open WebUI, Dify, Coolify, Langfuse, AgentSpan, OpenJarvis, or generic chatbot / agent frameworks.
- Do **not** start **restic** from this reference capture.
- Do **not** add env vars or edit `.env.template`.
- Do **not** change app code, public routes, or middleware.
- Do **not** create public chat endpoints or WebSocket sessions.
- Do **not** add new containers on `corpflow-exec-01-u69678` or elsewhere.
- Do **not** modify n8n workflows.
- This PR is **docs-only product strategy capture**.

Any future implementation requires a **separate named execution packet** with its own approval gate, security review (`docs/operations/SECURITY_REVIEW_CHECKLIST.md`), and Delivery Reality Audit.

---

## When to revisit

Re-open this reference when:

- A client or vertical (e.g. Lux concierge, AI Lead Rescue, Living Word) needs a **named chat/concierge packet**.
- Operator Bridge or CMP proposes a **customer-visible widget** on a production hostname.
- A contractor asks "should we use Social Intents / Chatwoot / …?" — answer: **not without a new ADR or authorization packet**; use this doc for destination shape only.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial reference capture — Social Intents as destination-shape benchmark only. |
