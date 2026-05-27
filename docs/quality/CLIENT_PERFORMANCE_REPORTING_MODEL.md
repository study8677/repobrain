# CorpFlow Client Performance Reporting Model (v1 design)

**Status:** v1 design (2026-05-27). **Design-only — no implementation in this PR.**
**Audience:** Anton (decision-maker), Cursor agents (future implementers), prospective clients (the people who will eventually see the report).
**Companion docs (read first):**

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the canonical quality system this report consumes.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence, evidence shape, client-facing rules.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible (umbrella site + tenant boundary).
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console (where coverage + performance reports come from).
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `concierge_lead_received`, `ticket_closed`, and other lead-flow events.
- `docs/operations/MONITORING_ARCHITECTURE.md` — production-pulse signals available to the report.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — non-negotiable conversion clarity language.

This document **defines** what a CorpFlow client should eventually see in their **monthly performance report**, and how that report differs from the **internal monthly review** Anton runs against the same data. **It does not implement a dashboard, a runtime job, an email template, or a cron.** Implementation packets are gated on (a) explicit Anton approval per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3, (b) at least one tenant being on a real client-facing surface (e.g. `aileadrescue.corpflowai.com` shipping, or a tenant graduating to their own domain with our analytics), and (c) the apex Search Console rollout being COMPLETE so the data source exists.

---

## 1. Why a separate reporting model

Three reasons we do not just bolt "client report" onto the internal quality audit:

1. **The client is not the auditor.** An audit is engineering evidence; a client report is a buyer-facing artefact. Different scope, language, frequency, and trust contract.
2. **The data lives in three different systems** (Plausible, Search Console, Postgres). A reporting model says *what to pull from each* and *what story it tells*, before we wire any code.
3. **The client-facing trust contract is more brittle.** A misleading number in an audit costs us a re-audit. A misleading number in a client report costs us the relationship. The model below is deliberately conservative: we under-promise on metrics we cannot reliably attribute.

---

## 2. Target frequency, surface, and delivery

| Aspect | v1 design |
|---|---|
| **Frequency** | Monthly. First report goes out 30 days after the surface is live + analytics + Search Console are both verified. |
| **Surface (delivery channel)** | PDF (preferred) generated from a Markdown template, OR a static page on a per-tenant `/reports/<YYYY-MM>` route. Not an in-app dashboard in v1. |
| **Cadence within a month** | Generated on the **1st** for the prior calendar month; delivered by the **5th** after operator review. |
| **Storage** | Generated PDF stored under `artifacts/client-reports/<tenant>/<YYYY-MM>.pdf` (gitignored if it contains tenant-private data; tracked if it is purely public-metric data). Source Markdown is **always** versioned. |
| **Delivery method** | Email via the existing `corpflow.email.report_monthly.v1` event (NEW — to be added to `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 8 events when implementing). Requires operator approval per Comms v1 § 5. |
| **Channel separation** | Always operator-reviewed before sending. No auto-send in v1. |

---

## 3. Internal vs external report — what differs

The same source data drives two reports. They differ in scope, language, and depth.

| Aspect | Internal report (Anton's monthly review) | External report (Client-facing) |
|---|---|---|
| Audience | Anton + Cursor agents | The client (tenant principal + relevant stakeholders) |
| Frequency | Monthly | Monthly |
| Length | 2–4 pages of structured data | 1–2 pages of narrative + 3–5 chart summaries |
| Tone | Engineering language allowed; commits + deployment IDs allowed | Plain language; no commit SHAs, no deployment IDs, no internal jargon |
| Quality score | Full 10-dimension breakdown | Total + verdict label only ("Production-ready", "Acceptable with known risks", etc.) |
| Backlog | Full top-N fixes with point gain | Top 3 fixes in buyer-facing outcome language |
| Metrics shown | Everything in §4 — including diagnostic metrics (TTFB, LCP, deploy frequency) | Plausible-surface + Search Console + lead/conversion metrics; **NO** internal-monitoring or TTFB-style data |
| Negative findings | Stated directly | Framed as "what we are improving next" with an owner and ETA |
| Asterisks (PENDING measurement) | Visible | Replaced with "preliminary; full measurement next month" |
| Storage in repo | Tracked under `artifacts/client-reports-internal/` | Source tracked; generated PDF gitignored if tenant-private |

The internal report is for **operator decision-making**. The external report is for **client trust building**.

---

## 4. Metric categories (v1 scope)

The model defines five categories. Each category has source-of-truth and pull-mechanism notes. None of the pull mechanisms are implemented in v1 — they are described so the implementation packet does not need to redesign them.

### 4.1 Traffic (Plausible)

Source of truth: Plausible umbrella site (per `CORPFLOW_ANALYTICS_V1.md`).

**Available metrics (v1 capacity of Plausible):**

- Total visitors (unique).
- Total pageviews.
- Average visit duration.
- Bounce rate.
- Top sources (referrers).
- Top entry pages.
- Top exit pages.
- Country breakdown.
- Device breakdown (desktop / mobile / tablet).
- Browser breakdown.
- Conversion rate (per defined goal).

**Internal report shows:** all of the above for the surface, plus a comparison against the prior 30 days. Trend lines.

**Client-facing report shows:** total visitors, top 3 sources, top 3 entry pages, mobile-vs-desktop split, conversion rate (when defined goals exist). NOT browser breakdown, NOT bounce rate (without context, bounce rate misleads clients more often than informing them — re-introduce in v2 with framing).

**Doctrine note:** for tenant working surfaces on the CorpFlow umbrella that do **not** load Plausible (per `20260526-plausible-internal-vs-client-facing-boundary.md`), the traffic section reads: *"This surface is your working / staging environment. We do not measure traffic to it because that traffic is you and your team reviewing edits, not your customers. Customer traffic to your published site at `<real tenant domain>` is measured separately."* This avoids the implication that we lost a data source.

### 4.2 Search visibility (Google Search Console)

Source of truth: Search Console Performance + Coverage reports per the relevant property (apex domain or tenant URL-prefix property, per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` §2).

**Available metrics:**

- Total impressions.
- Total clicks.
- Click-through rate (CTR).
- Average position.
- Top queries (which search terms surfaced the surface).
- Top pages (which pages got impressions).
- Coverage: indexed page count + error count + warning count.
- Mobile usability issues (Search Console's separate report).

**Internal report shows:** all of the above for the surface, plus delta vs prior 30 days. Coverage error list with diagnostic categorisation.

**Client-facing report shows:** total impressions, total clicks, CTR, top 3 queries (with the caveat that queries can be private/personal for branded searches), top 3 ranking pages, indexed page count. NOT raw "Crawled - currently not indexed" diagnostic categories (those are an engineering signal, not a client signal).

**v1 pull mechanism (when implemented):** Search Console API + service account on the SC property. The service account is **Anton-only** to create per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3. No automation against the SC API exists today.

### 4.3 Lead / conversion metrics (Postgres + Plausible custom events)

Source of truth: `automation_events` + per-surface lead tables (e.g. concierge form for Lux) + Plausible custom events when wired.

**Available metrics:**

- Number of lead-form submissions.
- Number of CTA-click events (primary CTA).
- Number of outbound clicks (links leaving the site).
- Time-to-first-touch (when our CRM/comms layer can attribute).
- Source breakdown (which traffic source produced leads).

**Internal report shows:** count of each event type, source breakdown, attribution chain when available, plus per-day timeline.

**Client-facing report shows:** lead count for the month, source mix (top 3), and an explicit attribution caveat: *"Attribution to source is the visitor's session source at the moment of submission; we do not yet do multi-touch attribution. v2 will add it."*

**v1 wiring note:** the existing `concierge_lead_received` event already lands in `automation_events`; it is the **only** lead event live in production at the time of this design. CTA-click and outbound-click events require a small Plausible custom-event PR (gated; not in v1 scope of this design doc).

### 4.4 Publication activity (CMP + ticket history)

Source of truth: `cmp_tickets` + linked artifacts.

**Available metrics:**

- Number of changes published to the surface during the month.
- Categories of change (content edit, new section, copy refinement, structural refactor, marketing campaign).
- Time-to-publish per change (request → live).
- Pending change requests at month end.

**Internal report shows:** all of the above per ticket. Anomalies (slow-to-publish, high-back-and-forth).

**Client-facing report shows:** count of published changes, descriptive bullets ("added Property X listing", "updated concierge messaging", "refreshed hero copy"), pending count. NOT internal ticket IDs, NOT time-to-publish in raw form (that becomes a stick the client can use against us when a change took longer than expected for a documented reason). v2 may introduce a "service-level objective" framing if both sides agree.

**Source query:** standard CMP query filtered by `tenant_id` and date range. Already supported by `lib/cmp/_lib/ticket-list.js` and friends.

### 4.5 Quality score + improvement backlog

Source of truth: most-recent quality audit under `artifacts/quality-audits/`.

**Internal report shows:** the audit's full 10-dimension breakdown, Δ vs prior month's audit, current backlog items with owners and ETAs.

**Client-facing report shows:** the audit's total + verdict label, the top 3 improvements queued (in buyer-facing outcome language: "We are tightening mobile tap-target sizing on property pages." instead of "Fix Lighthouse mobile tap-target warnings."). The next-audit date is explicit.

---

## 5. Recommended actions section (client-facing)

Every client report ends with a short **Recommended actions** section. Two flavours:

### 5.1 CorpFlow recommendations (we drive)

Up to 3 things the client should expect us to do over the next 30 days. Already in the backlog and within scope. Concrete, dated.

- "We are submitting the property page for re-indexing after the description refresh — expect coverage by the 12th."
- "We are enabling Plausible custom events for your concierge form click — visible in your next report."

### 5.2 Client opportunities (they drive)

Up to 3 things the client could do to lift their numbers. Plain language, no engineering jargon. **Carefully scoped** so we are not pushing scope creep into a report.

- "Sharing your property page link on LinkedIn is the highest-leverage thing you can do this month — it tends to multiply traffic 5–8× for similar tenants."
- "Replying to email enquiries within 24 hours doubles conversion in our experience."

Recommended actions sections are **always operator-reviewed before sending** in v1. They are not auto-generated from a template.

---

## 6. Traffic / lead trend summary

Each report carries a 30-day trend summary at the top — three sentences, no charts.

Example shape:

> Traffic: 1,247 visitors this month (up 18% over the prior month). Top source: direct visits, followed by Google organic search. Mobile share: 63%.
>
> Search visibility: 5,610 impressions (up 22%), 142 clicks (up 14%), average position 18.7 (improving from 22.3). Top query: "luxury villa mauritius".
>
> Conversion: 11 concierge enquiries this month (up from 7 prior). 4 came from organic search, 5 from direct, 2 from LinkedIn referrals.

The summary uses absolute counts AND percentage change. Percentage-only ("up 18%!") is forbidden by doctrine — small numbers with big percentages mislead clients. Always include the absolute number.

---

## 7. Edge cases and "what we explicitly don't measure in v1"

We name what we do not measure so a client report does not pretend otherwise. Plain language:

- **Multi-touch attribution.** We attribute leads to the session source at submission, not to a journey of touchpoints. Coming in v2.
- **Click-fraud / bot traffic.** Plausible filters known bots; we do not run a separate anti-bot audit in v1.
- **Cross-device user journeys.** No persistent identity layer in v1.
- **Revenue / LTV attribution.** CorpFlow does not see the client's commercial pipeline; we report leads, not booked revenue.
- **Email open / click tracking.** We do not pixel-track email opens in v1 (avoid privacy surprise; revisit in v2 with explicit client opt-in).
- **A/B test results.** Not run on tenant working surfaces in v1.
- **Live chat or session-replay metrics.** Out of scope for v1.

A short "Methodology" footer carries the most common of these to set the trust contract.

---

## 8. Quality-score → report mapping (binding)

The client-facing report cannot quote a verdict label higher than the most recent audit allows.

| Quality system verdict | Client-facing wording allowed in this report |
|---|---|
| **Premium** | "Your site is performing at our premium quality bar." |
| **Production-ready** | "Your site is production-ready and acceptable for paid traffic." |
| **Acceptable with known risks** | "Your site is usable for warm and direct traffic. We are tightening N items before recommending paid traffic." |
| **Remediation required** | "Your site is in active improvement. We are not recommending traffic-spend until the improvements close." |

A report **cannot** narrate around a verdict — the verdict line is mandatory.

---

## 9. Implementation gates (when v1 ships)

This design becomes an implementation packet only when **all** of the following hold:

1. **Apex Search Console rollout COMPLETE** (per `SEARCH_CONSOLE_EXECUTION_PACKET.md`). Without it, §4.2 has no data.
2. **Plausible v1 step-1 live** on `corpflowai.com` (per `20260527-plausible-apex-only-rollout-step1.md`). Without it, §4.1 has no data for the apex.
3. **At least one tenant on a real client-facing surface** (e.g. `aileadrescue.corpflowai.com` live with its own analytics + SC verified, OR a tenant graduated to their own domain with our analytics adapter active). This is the first surface the client report runs against.
4. **`corpflow.email.report_monthly.v1`** added to `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 8 events with operator-approval policy explicit (§ 5 of Comms v1).
5. **`lib/server/reports/` skeleton** exists with the report-generator API designed (per a future ADR — not in this design). Skeleton respects:
   - Tenant-aware data pulls (never cross-tenant in one report).
   - Read-only against analytics + SC API (no write).
   - Versioned report templates (so changing wording requires a doc PR).

**Until those gates hold, this document is the design and nothing more.**

---

## 10. v2 candidates (NOT in v1)

Listed so the v1 implementation does not accidentally close v2 doors:

- Multi-touch attribution (probably via a small first-party attribution layer in `lib/analytics/`).
- Email open / click tracking with explicit per-tenant opt-in.
- Revenue attribution when a CRM bridge exists.
- A/B test result summaries (when a v1 A/B harness ships).
- Live chat / session-replay summaries (when a v1 chat tool ships).
- Per-region performance breakdown (using Plausible's geo data more aggressively).
- Comparison against a peer group (anonymised; only when ≥ 5 similar tenants are running).
- Embedded chart images in PDFs (v1 uses tabular summaries; chart images add weight and PDF complexity).
- An in-app dashboard at `/reports` per tenant — out of scope for v1 to avoid duplicating Plausible.

---

## 11. Cross-references

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the rubric this report consumes.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence + evidence shape for the audit half.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console operator playbook.
- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — bounded apex-only rollout packet.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — communications channel + event taxonomy.
- `docs/operations/MONITORING_ARCHITECTURE.md` — production-pulse signals.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — non-negotiable language.

---

## 12. Status

| Item | State | Owner |
|---|---|---|
| v1 design (this doc) | ✅ landed in `docs/quality/` | Cursor |
| Apex SC rollout (data source 1) | ⏳ packet at `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` | Anton (DNS + UI) → Cursor (verify) |
| Plausible apex live (data source 2) | ⏳ env flip + Plausible-side verification per `20260527-plausible-apex-only-rollout-step1.md` | Anton |
| First client-facing tenant surface | ⏳ `aileadrescue.corpflowai.com` candidate; or first tenant on real domain with analytics adapter | Anton (business) |
| Comms event `report_monthly.v1` | ⏳ to add when implementing | Cursor (design) → Anton (approve send policy) |
| `lib/server/reports/` skeleton | ⏳ post-gates | Cursor |
| First real client report | ⏳ blocked on gates 1–4 | Cursor draft → Anton approve send |
