# CorpFlowAI Operating Playbook

This document is the **default context** for future chats, Cursor sessions, and GitHub-connected workflows. If product behavior, UI, or delivery expectations disagree with this playbook, **update this doc first**, then align code and `/change`.

---

## 1. Business model

CorpFlowAI delivers:

- **Websites** (tenant-facing delivery)
- **Publication services** (posts/images + scheduling discipline)
- **Marketing videos** (lightweight production + placement discipline)
- **Lead capture** (Postgres-backed, operator-visible)

**Core flow (canonical service pattern):**

`website → content → distribution → leads → follow-up`

“Distribution” may start as **manual-assisted** (operator posts / schedules) before paid channels or heavy automation.

---

## 2. Priority rules

- **Revenue > platform**: ship what sells and can be operated; avoid speculative platform depth.
- **Live URL = done**: if it is not reachable and usable in production, it is not complete.
- **No hidden workflows**: operators must not depend on undocumented endpoints, one-off scripts, or tribal knowledge.
- **No manual DB dependencies**: operators should not need SQL consoles for normal delivery; schema must stay aligned with code.
- **No overbuilding**: prefer the smallest slice that proves the loop end-to-end.

---

## 3. System architecture

- **Postgres = source of truth** for tickets, leads, tenant configuration signals, and audit-friendly state.
- **`/change` = control plane** for operators (ticket truth, stage progression, governed actions).
- **Tenant sites = delivery layer** (public marketing + lead capture surfaces per tenant).
- **Core = operator/business layer** (how CorpFlowAI runs its own go-to-market and client delivery discipline).
- **Lux = client-facing example** (reference tenant experience and branded delivery patterns).

---

## 4. Delivery rules

A task is **NOT** complete unless:

- **URL works** in production (HTTP 200 for the intended route; no broken rewrites).
- **UI is usable** (no debug scaffolding; no “paste internal IDs” operator flows).
- **Client can interact** (forms submit; success states are understandable).
- **Operator can verify** (data appears in Postgres-backed views/APIs; logs/alerts are meaningful when used).

---

## 5. UI rules

- **Core UI ≠ Client UI**: operator consoles are dense and governed; client surfaces are simple and trustworthy.
- **Lux sites must follow branded design** (LuxMaurice reference quality: spacing, typography, consistency).
- **No raw HTML pages in production** as the primary product surface unless explicitly justified and styled as a deliberate exception.
- **No debug artifacts in UI** (no “paste ticket id”, no raw internal JSON dumps for normal operators, no dev-only panels).

---

## 6. Cursor execution rules

Cursor **may**:

- Write code and tests
- Run tests and smoke checks
- Verify endpoints and production HTML responses when credentials/network allow

Cursor **must not**:

- Assume completion without a **live** check when the deliverable is user-facing
- Bypass `/change` workflows for “speed”
- Require manual DB edits for standard operator tasks
- Treat CI green as customer-ready without verifying the **live URL + interaction path**

---

## 7. First-slice philosophy

Build the smallest working version that proves the loop:

- **1 template** (one vertical slice first)
- **1 lead flow** (reuse patterns like `/france`)
- **1 content flow** (manual-assisted queue is acceptable)
- **Reuse everywhere** (same primitives for Core and tenants)

---

## 8. Current state (as of last known shipped baseline)

- **`/change` operator workspace** is live (queue-driven; no ticket-id paste workflow).
- **Schema auto-sync** is active on deploy (idempotent DDL alignment; Postgres stays compatible with code).
- **Client decisions auto-seed + mint** works (no `CLIENT_DECISIONS_NOT_CONFIGURED` dead-ends for normal flows).
- **France lead slice** is working (public lead capture + qualification pattern; reuse for other markets).

---

## 9. Next focus

- **Core onboarding system** (repeatable operator path from intake → delivery)
- **Website templates** (1 template per slice; expand only after proof)
- **Content + publishing pipeline** (manual-assisted scheduling first)
- **Lead capture scaling** (same primitives; more markets/verticals)

---

## Operating principle (non-negotiable)

If it cannot be operated by a non-engineer using `/change` and verified in production without DB access, it is not “shipped” yet.
