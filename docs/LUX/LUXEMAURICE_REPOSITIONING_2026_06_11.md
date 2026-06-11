# LuxeMaurice — Repositioning record (2026-06-11)

**Status:** Approved by the LuxeMaurice principal on 2026-06-11.
**Effect:** Active LuxeMaurice direction is repositioned from a *luxury property / IDX website* to a **Private Wealth & Lifestyle Platform** for Mauritius.
**Master programme ticket:** `cmo8mjijk0000jl04l1jz0v6d` — **remains open**. Do **not** close on this realignment.
**Supersedes (for active direction only):** active framings in `docs/LUX/LUX_DELIVERY_PROGRAMME.md`, `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md`, `docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`, and `docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md` that described Phase 2 as *IDX / property discovery*. Historical audit blocks in those documents are preserved unchanged.

**Canonical source of strategic truth (read first):**

- `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md` — the strategic vision proposal approved by the principal.
- `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_PRESENTATION_OUTLINE.md` — the boardroom companion outline.

---

## 1. What changed

LuxeMaurice is no longer being delivered as a luxury property website with an IDX/MLS feed. It is being delivered as a **private advisory platform** for clients considering Mauritius as a place to invest, live, and build.

The repositioning has four practical consequences for in-flight work:

1. **No IDX / MLS / external real-estate feed as an active requirement.** Any future external integration is **optional** and only revisited if a strategic reason emerges. The default direction is **manual-first curated private opportunities**.
2. **Public surfaces are reframed.** `/properties` becomes *Private Opportunities*, `/property/[slug]` reads like a private opportunity overview, `/concierge` becomes *Private Advisory*. Homepage hero, sections, and CTAs are rewritten around the approved vision deck.
3. **Working infrastructure is preserved.** Property publishing, the visual editor (`/properties/admin`), media governance, the concierge lead flow, tenant isolation, auth, and audit controls all stay. They are repositioned and rebranded — not removed.
4. **No fake inventory on public surfaces.** Feed-shaped preview cards (the `lxf-*` set) are removed from the public homepage. Empty states use a premium *"Private opportunities are being prepared for client review"* line and a *"Request a private consultation"* CTA.

---

## 2. Active requirement (replaces the IDX framing)

Wherever active LuxeMaurice docs previously described the property surface as *“IDX / property discovery”* or required an IDX decision, the active requirement is now:

> **Manual-first curated private opportunities, with future optional integrations only if strategically required.**

The five-pillar platform structure (see the vision proposal) is the canonical scope:

1. **Discover Mauritius** — editorial and intelligence layer.
2. **Private Opportunities** — curated completed residences and development opportunities; manual-first.
3. **Private Advisory & Concierge** — single named point of contact, qualified introductions.
4. **Property Publishing Platform** — disciplined back-of-house (already exists in the repo).
5. **Owner Experience Portal** — invitation-only, future phase.

---

## 3. Doc realignment map (what is now active vs historical)

| Document | Status after repositioning |
|---|---|
| `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md` | **Canonical** — strategic source of truth. |
| `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_PRESENTATION_OUTLINE.md` | **Canonical** — boardroom companion. |
| `docs/LUX/LUX_DELIVERY_PROGRAMME.md` | **Active**, updated 2026-06-11 to remove IDX as an active phase framing. Historical audit blocks preserved. |
| `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` | **Active**, with a *Repositioning preface (2026-06-11)* clarifying that the brief is now read under the vision; existing Slice A/B/C delivery audits remain as historical record of what shipped. |
| `docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md` | **Historical reference** for what was shipped in Slice A/B/C. Acceptance criteria for new public surface work move under the *Vision-Aligned Public Experience* slice (PR B). |
| `docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md` | **Active**, repositioned as the canonical manual-first private opportunity intake workflow (no longer described as “an alternative to IDX”). |
| `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md` | **Active** unchanged — operator workflow on `/change`. |
| `docs/LUX/LUX_MEDIA_GOVERNANCE.md` | **Active** unchanged — media review/link/publish discipline. |
| `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md` | **Active** unchanged — attachment governance. |
| `docs/LUX/PHASE1_PRODUCTION_VERIFICATION_AND_CLIENT_NOTE.md` | **Historical** — Phase 1 client review record. |

Historical scripts (`scripts/lux-ticket-phase2-initiate.mjs`, `scripts/lux-ticket-append-phase1-*.mjs`) are not edited — they describe a one-time historical handoff.

---

## 4. Required operator action — master programme ticket

The active ticket summary for `cmo8mjijk0000jl04l1jz0v6d` currently reads (in substance):

> *Build a full-featured IDX website with CRM, marketing automation, and AI-driven client engagement.*

It must be replaced/reframed (without closing the ticket and without deleting historical audit) with:

> **Build the LuxeMaurice Private Wealth & Lifestyle Platform: curated opportunities, private advisory, owner experience, concierge-led acquisition, and governed luxury property publishing.**

The exact operator playbook for applying that update through a safe CMP path is recorded in:

`docs/LUX/LUXEMAURICE_OPERATOR_TICKET_UPDATE.md`

Until that operator action runs, this repositioning record is the source of truth for the active direction.

---

## 5. What stays out of scope

- IDX / MLS / external real-estate feed integration (no active requirement).
- GoHighLevel dependency (already waived; remains waived).
- Any change to authentication, tenant isolation, media governance, or audit discipline.
- Any new environment variables.
- Closing the master programme ticket.
- Any pricing, legal, tax, or residency advice on public surfaces.

---

*This document records a strategic repositioning agreed with the LuxeMaurice principal. It is referenced by `.cursor/rules/delivery-reality.mdc` only in the sense that an active doc realignment is not itself a customer-visible production change; PR B carries the customer-visible work and its own Delivery Reality Audit.*
