# LuxeMaurice — operator action: master programme ticket repositioning

**Ticket:** `cmo8mjijk0000jl04l1jz0v6d` (**Approved / Build**) — **do not close**.
**Tenant:** `luxe-maurice` (Lux host / session).
**Why this exists:** The repositioning recorded in `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md` requires the active ticket summary to no longer describe LuxeMaurice as an *IDX website with CRM, marketing automation, and AI-driven client engagement*. This file gives the operator a safe, audited path to apply the new wording without losing the historical audit trail and without closing the ticket.

---

## 1. Replacement wording (active summary)

Replace any active summary line that currently reads (in substance):

> *Build a full-featured IDX website with CRM, marketing automation, and AI-driven client engagement.*

with:

> **Build the LuxeMaurice Private Wealth & Lifestyle Platform: curated opportunities, private advisory, owner experience, concierge-led acquisition, and governed luxury property publishing.**

Also add an **appended description note** so the prior wording is not silently overwritten:

```text
Repositioning note (2026-06-11):

Per docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md, this programme is reframed
as the LuxeMaurice Private Wealth & Lifestyle Platform (curated opportunities,
private advisory, owner experience, concierge-led acquisition, and governed
luxury property publishing).

Prior framings of Phase 2 as "IDX / property discovery" are superseded for the
active direction. Historical audit blocks recorded against this ticket (Slice A,
Slice B, Slice C, Phase 2B, Phase 4C/4D, Phase 5A–5C, /change queue cleanup)
remain in place.

Master ticket remains open. Do not close on this repositioning.
```

---

## 2. Operator paths (in preferred order)

The repository does **not** ship a generic *“rewrite ticket summary”* CMP action. Use one of the following, in preferred order. The operator (Anton) chooses based on which path is currently available without inventing env vars or weakening tenant isolation.

### 2a. CMP path (preferred when an existing CMP action covers it)

If a current CMP action accepts a free-text description update on `cmo8mjijk0000jl04l1jz0v6d` under a Lux factory-master / Dormant Gate session (e.g. an existing description-append helper used by other Lux programme notes), use it. Apply both:

1. **Append** the *Repositioning note (2026-06-11)* block above to the ticket description.
2. **Update** the active summary to the new line in §1.

Record the CMP action, request id, and HTTP status in the Delivery Reality Audit for PR B.

If no current CMP action allows updating the active summary line directly, do **not** invent one in this PR — use 2b.

### 2b. Operator script path (Postgres-backed, like existing Lux ticket helpers)

The repo already contains operator-only scripts that touch this ticket through `POSTGRES_URL` (e.g. `scripts/lux-record-phase1-approve-initiate-phase2.mjs`, `scripts/lux-ticket-phase2-initiate.mjs`, `scripts/lux-ticket-append-phase1-*.mjs`). They are run by Anton with explicit environment access, asserting `tenant_id = 'luxe-maurice'` and the master ticket id.

A new operator script may be added to this pattern in a future PR:

- **Proposed name:** `scripts/lux-ticket-record-repositioning-2026-06-11.mjs`
- **Behaviour:** asserts Lux tenant + master ticket id; **appends** the *Repositioning note (2026-06-11)* block to the description; **updates** the active summary line; does **not** modify `status`, `stage`, or `workflow_state`.
- **Run:** operator-only, with `POSTGRES_URL` and `--execute` per the existing convention.

Until that script lands, the operator may apply the same change directly against Postgres in a one-off operator session (same pattern as the existing `lux-record-phase1-*` helpers), with the audit captured in the PR description.

### 2c. UI path (last resort, if a Lux operator UI exposes ticket-description editing)

If `/change` on `lux.corpflowai.com` (Lux operator session) currently exposes a guarded path to edit a ticket description, the operator may apply both changes there. Capture a screenshot or HTTP trace in the Delivery Reality Audit for PR B.

---

## 3. Hard constraints (non-negotiable)

- Do **not** close `cmo8mjijk0000jl04l1jz0v6d`.
- Do **not** delete or overwrite historical audit blocks already recorded against the ticket.
- Do **not** introduce a new environment variable.
- Do **not** weaken tenant isolation, auth, or the Dormant Gate.
- Do **not** widen any public surface as a side-effect of the description update.
- Do **not** apply this from a routine merge agent environment without `POSTGRES_URL` and the master ticket id assertion in the operator script.

---

## 4. Verification after operator action

After applying the update via any of 2a / 2b / 2c, the operator records:

1. **Ticket id:** `cmo8mjijk0000jl04l1jz0v6d`
2. **Path used:** CMP action name / operator script run / UI confirmation.
3. **Before / after** of the active summary line (paste both).
4. **Description append confirmed:** `Repositioning note (2026-06-11)` present in the ticket description.
5. **`status`, `stage`, `workflow_state` unchanged:** confirmed.
6. **Historical audit blocks intact:** spot-check Slice A, Slice B, Slice C, Phase 2B, Phase 4D, Phase 5A–C, queue cleanup blocks still present.
7. **Master ticket open:** confirmed.

This evidence belongs in the Delivery Reality Audit of the PR that performs the operator action (or in a short audit appended to `artifacts/chat_history.md` after live verification).

---

## 5. Repositioning vs delivery

This file describes only the **active summary repositioning**. The customer-visible realignment of the public Lux surfaces (`/`, `/properties`, `/property/[slug]`, `/concierge`) is carried by a separate PR (the *LuxeMaurice Vision-Aligned Public Experience — Slice 1*), which has its own Delivery Reality Audit and its own live-production verification per `.cursor/rules/delivery-reality.mdc`.

A repositioned ticket summary on its own is **not** customer-visible delivery. The active programme remains **open**, and the broader programme §8 Reality Gate stays **PARTIAL** until the vision-aligned public experience, first real published private opportunity, governed media, owner-experience scope, and full concierge programme evidence are live-verified on `https://lux.corpflowai.com`.
