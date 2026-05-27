# CorpFlow Website Quality System (v1)

**Status:** Canonical (v1, 2026-05-27)
**Audience:** Anton (approver/operator), Cursor agents (auditor/executor), contractors, future client-facing reviewers.
**Companion docs (read first; this doc is the canonical wrapper, it does not restate them):**

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — the **v1 5-dimension rubric** (the substrate). Still valid; this system is its successor and superset.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence, evidence shape, client wording.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — the operator playbook that feeds the SEO + Indexing dimension.
- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — bounded apex-only execution packet for first Search Console rollout.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible decision + tenant-aware boundary that feeds the Analytics dimension.
- `docs/operations/MONITORING_ARCHITECTURE.md` — runtime monitor map that feeds the Monitoring / runtime health dimension.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — non-negotiable conversion clarity overrides every total.
- `.cursor/rules/delivery-reality.mdc` — live-prod-only "Operational" rule.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — what clients eventually see monthly (design-only v1).

---

## 1. Purpose

The framework in `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` (5 dimensions × 20 points each) gave CorpFlow its first **scored** quality measurement. After two real audits (Lux baseline 2026-05-23, Lux post-fix 2026-05-25) and the operational doctrine refinement on 2026-05-25 / 2026-05-26 / 2026-05-27 (analytics tenant-aware boundary, Plausible apex-only step-1, Monitoring Architecture v1), two patterns surfaced:

1. **Strengths were hidden in the old "Trust + governance" bucket.** A site can have airtight tenant routing, healthy monitoring, robust runtime resolution — none of which the 5-dim rubric scored explicitly. Lux 2026-05-25 scored 15/20 on Trust, but that flattened a 9/10 monitoring reality and a 9/10 routing reality into a single number that also penalised the missing privacy/terms/contact items.
2. **Gaps were hidden too.** Analytics installability, content completeness, and mobile usability had no dedicated rows — they leaked into Performance, SEO, or Trust depending on the auditor's judgment.

**This system, v1, makes those dimensions explicit.** Ten dimensions, ten points each, totalling one hundred. Same total ceiling as the framework, redistributed so that:

- Conversion clarity, accessibility, performance, SEO, and trust **remain dimensions in their own right** (continuity).
- Analytics, monitoring, content completeness, mobile usability, and tenant routing **become first-class dimensions** (closes the bucket-flattening problem).

A v1 audit using this system **also satisfies** the v1 framework — every row in the new system maps to one or more rows in the framework's 5-dimension rubric (see §6.1 *Mapping back to the v1 framework*). Cursor and contractors **must use this system for new audits from 2026-05-27 forward**; framework-only audits remain readable but should not be initiated.

---

## 2. Scope and surfaces

This system scores **public, buyer-facing** surfaces. Specifically:

- **CorpFlow apex marketing:** `https://corpflowai.com/` and its public sub-paths (`/lead-rescue`, `/about`, `/process`, `/standards`, `/onboarding`, etc.).
- **Tenant marketing (working/staging surface on CorpFlow umbrella):** `https://<tenant>.corpflowai.com/` (e.g. `lux.corpflowai.com`). Per `docs/analytics/CORPFLOW_ANALYTICS_V1.md` and the 2026-05-26 internal-vs-client boundary, these are **CorpFlow-internal working surfaces** where tenants edit and review their site. They are *still* scored because clients see them when working with us, and they can graduate into client-facing surfaces.
- **Tenant marketing (own real domain):** e.g. `https://luxemaurice.com/`. Out of scope for this v1 system because CorpFlow does not own DNS, analytics, or Search Console for those domains. A future v1.x packet may extend the rubric to off-umbrella domains we operate via a CMS sync.
- **Lead-magnet single-page surfaces:** e.g. `https://corpflowai.com/lead-rescue`, `https://aileadrescue.corpflowai.com/` (when shipped).

**Out of scope** (not scored by this system):

- **Internal / operator surfaces:** `/change`, `/admin`, `/master`, `/factory/*`, `/api/*`, login/auth routes. These are governed by `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`, not this rubric.
- **Per-build telemetry, automation_events, CMP internals.** Those are operational measurements, not website quality.
- **One-off A/B copy experiments.** A page that is intentionally in active iteration is reviewed separately by Anton; this rubric measures the *current* state at audit time.

---

## 3. The ten dimensions (each scored 0–10, total 0–100)

Each dimension has a small set of weighted items. **Award the full row, partial credit only when the row explicitly allows it, or `PENDING`** when measurement requires a tool the auditor doesn't have at audit time (e.g. Lighthouse). PENDING rows do **not** count as 0 in the total — they count as the row's **historical floor** if a previous audit measured them, else as 0 with an explicit asterisk on the total (see §5).

### 3.1 SEO / indexing (0–10) — can search engines find and serve the page?

| Item | Points |
|---|---|
| `<title>`, `<meta name="description">`, `<link rel="canonical">` present on every top-level public route | 2 |
| Open Graph + Twitter card present (type/title/description/url + image) | 1.5 |
| `/sitemap.xml` reachable (200), host-aware, lists current public pages | 1 |
| `/robots.txt` reachable (200), explicitly disallows operator/factory/private API namespaces, lists sitemap URL(s) | 1 |
| Lighthouse SEO ≥ 95 (or PageSpeed Insights equivalent) | 1.5 |
| Search Console verification COMPLETE for this property (per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md`) | 1.5 |
| Indexing requested for top 5 buyer-facing URLs, ≥ 4 indexed by T+7d | 1.5 |

Notes:

- The `og:image` sub-item earns 0.5 of the OG row only when a tenant-owned canonical 1200×630 image is referenced from `<head>` (not just the meta property).
- If `robots.txt` blocks a route the audit expects to be indexed, this row is capped at 0.5 regardless of other items.
- Search Console items remain PENDING until Anton completes the DNS TXT verification — they cannot be awarded by Cursor probes alone.

### 3.2 Accessibility (0–10) — can a screen reader / keyboard / colorblind user navigate?

| Item | Points |
|---|---|
| `<html lang>` set on every render path; viewport meta includes `initial-scale=1` | 1.5 |
| Sensible heading order (one `<h1>`, no skipped levels) | 1 |
| All images have meaningful `alt` text (or empty `alt=""` for decorative) | 1 |
| `<main>` landmark wraps primary content; nav/footer landmarks present | 1 |
| Lighthouse Accessibility ≥ 95 | 3 |
| All interactive elements reachable via keyboard `Tab` (verified on 3 key pages) | 1 |
| Colour contrast on primary CTA, body text, link text passes WCAG AA | 1.5 |

Notes:

- Pages with zero `<img>` elements pass the alt-text row trivially.
- Lighthouse + keyboard + colour-contrast rows are typically operator-driven (browser session); PENDING is acceptable until the next scheduled measurement window.

### 3.3 Performance (0–10) — does the page load fast on a real connection?

Mobile profile (3G / slow 4G whichever Lighthouse defaults to). Apex and tenant working surfaces are both measured.

| Item | Points |
|---|---|
| Lighthouse Performance ≥ 90 (mobile) | 4 |
| Largest Contentful Paint (LCP) ≤ 2.5s on mobile | 2 |
| Cumulative Layout Shift (CLS) ≤ 0.1 | 1 |
| Total Blocking Time (TBT) ≤ 200ms | 1 |
| Time-to-first-byte (TTFB) ≤ 600ms on warm cache (HEAD against root URL, median of 3) | 2 |

Notes:

- TTFB cold-MISS is **not** the measurement target. Use three warm-cache pulls; report median.
- If Lighthouse cannot run in the audit session, award the LCP/CLS/TBT rows as PENDING and proceed — total carries the `*` per §5.

### 3.4 Mobile usability (0–10) — is the page usable on a phone?

Mobile usability is distinct from raw Performance: a page can be fast and still be unusable on a phone (cramped buttons, off-screen content, micro-fonts).

| Item | Points |
|---|---|
| Viewport meta with `initial-scale=1` (not duplicated, not `user-scalable=no`) | 1.5 |
| No horizontal scroll at 360px / 390px / 414px widths | 2 |
| Tap targets ≥ 44×44 pt for all primary CTAs and nav links | 1.5 |
| Font sizes ≥ 16px on body text; primary CTA legible without zoom | 1.5 |
| Lighthouse mobile audit shows no "Tap targets" or "Content not sized correctly for viewport" issues | 2 |
| Primary CTA fully visible above the mobile fold on a 667pt-tall device | 1.5 |

Notes:

- "Above the mobile fold" measured at iPhone SE / iPhone 8 viewport heights as a conservative baseline.
- Lighthouse mobile reuses the audit from §3.3; do not score it twice — these items are mobile-usability-specific.

### 3.5 Conversion clarity (0–10) — does the buyer know what to do?

Source of truth: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`. **Conversion clarity is a doctrine-binding dimension** (see §5.2).

| Item | Points |
|---|---|
| Single primary CTA visible above the fold on every key page | 2.5 |
| Primary CTA describes **buyer intent**, not internal process (e.g. "Book a free walkthrough", not "Choose payment path") | 2.5 |
| Offer is understandable within five seconds of landing | 2 |
| Trust path explicit (logos / proof / pricing or pricing-anchor stated) | 1.5 |
| Payment / region / routing complexity appears **after** buyer intent | 1.5 |

### 3.6 Trust architecture (0–10) — does the site look operated by a real business?

| Item | Points |
|---|---|
| HTTPS with valid TLS cert; HSTS header present; no mixed-content warnings | 2 |
| 404 / 500 pages are branded (not raw Vercel error); 404 carries `<meta robots="noindex">` | 1.5 |
| Privacy policy reachable from footer at a working route (`/privacy`) | 1.5 |
| Terms of service reachable from footer at a working route (`/terms`) | 1.5 |
| Contact / support email reaches an alias controlled by the business (`support@…`, `info@…`, `concierge@…`) | 1.5 |
| Clear ownership statement ("Operated by …") visible from any public page | 1 |
| No unsupported revenue or AI-magic claims (per doctrine) | 1 |

### 3.7 Analytics / measurement (0–10) — is the surface measurable?

For tenant working surfaces on the CorpFlow umbrella (e.g. `lux.corpflowai.com`), the **doctrine choice not to install Plausible** is correct (per `20260526-plausible-internal-vs-client-facing-boundary.md`) — but the surface is still scored on its **measurability posture** (Search Console verification, conversion event readiness, structured data, evidence trail).

| Item | Points |
|---|---|
| Web analytics installed (Plausible per `CORPFLOW_ANALYTICS_V1.md`) **OR** doctrine-correct absence with a recorded ADR | 2 |
| Conversion / engagement events defined for the surface (taxonomy named in canonical doc) | 1.5 |
| Search Console verification COMPLETE for this property | 2 |
| Sitemap submitted in Search Console; ≥ 1 URL indexed | 1.5 |
| Structured data (Schema.org) present on at least one buyer-facing page (LocalBusiness, Product, Article, Organization — whichever fits) | 1.5 |
| Outbound conversion events (lead form, contact form, primary CTA click) wired to analytics or to `automation_events` (per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`) | 1.5 |

Notes:

- Doctrine-correct absence: a tenant working surface that does NOT load Plausible because the buyer-facing marketing lives on the tenant's own domain still earns the row 1 (1/2), with the explicit doctrine note in the audit.
- An ADR-backed absence does **not** earn the conversion-event row — those still need to exist somewhere (Plausible custom event, automation_events row, n8n forward).

### 3.8 Monitoring / runtime health (0–10) — does production behave?

Source of truth: `docs/operations/MONITORING_ARCHITECTURE.md` §2 (the 12-monitor surface map), §3 (schedule grid), §5 (live-endpoint floor).

| Item | Points |
|---|---|
| Factory health endpoint (`/api/factory/health`) returns 200 + `status:"healthy"` + `database_configured:true` + `runtime_config_valid:true` | 2 |
| Production-pulse runtime endpoint (`/api/factory/production-pulse/runtime`) returns 200 + `ok:true` + `deployment_ready:true` + `monitoring.ok:true` + `core.database_reachable:true` | 2 |
| Tenant-resolution endpoints (`/api/tenant/site`, `/api/ui/context`) return 200 with the **expected** `tenant_id` (not an apex fallback) | 2 |
| No drift fingerprints: zero `db.prisma.io:5432` errors, no apex-shaped content on tenant subdomain | 1 |
| Recent (within 7d) factory-control-loop run is GREEN; or, if RED, has a tracked CMP ticket | 1.5 |
| Alert routing wired (Telegram + n8n forward per Monitoring Architecture §4.1 / §4.2) — secrets present, helper executes on failure | 1.5 |

### 3.9 Content completeness (0–10) — does the site say enough to do its job?

| Item | Points |
|---|---|
| Home page renders full content (not an apex fallback, not a placeholder shell) | 2 |
| Top-level secondary pages (concierge / about / process / pricing / properties / etc.) all carry `<title>` + `description` + canonical | 2 |
| Property / product / case-study detail pages (where applicable) carry per-item meta and rich content (≥ 200 words OR ≥ 3 images with captions) | 1.5 |
| Localisation present where the tenant's audience is multilingual (EN minimum; FR/RU/other when declared) | 1 |
| Privacy / terms / contact pages exist as routes (links pointing nowhere are 0 here even if the footer links earn Trust row 3.6) | 1.5 |
| At least one trust-anchor block: customer logos, named team member with credentials, or a published case study | 1 |
| No "Lorem ipsum" / "TBD" / "Coming soon" placeholders on a public route | 1 |

### 3.10 Tenant routing / infrastructure correctness (0–10) — does the host actually serve the right tenant?

| Item | Points |
|---|---|
| Tenant subdomain (e.g. `lux.corpflowai.com`) returns the tenant's content (not the apex marketing fallback) | 2 |
| `/api/tenant/site` returns the expected `tenant_id`, full `site` config, full `i18n` bundle | 2 |
| `/api/ui/context` returns `tenant_registered:true`, `login_route:"client"` (or the documented alternative for the tenant), `mode:"client"` | 1.5 |
| Sitemap is host-aware (different tenants emit different URL lists) | 1 |
| `vercel.json` rewrites are consistent with runtime behaviour (no dead static rewrites silently shadowing Next.js paths) | 1 |
| HSTS header present on the tenant host; eligible for HSTS preload (or already registered) | 1 |
| No regression to onboarding fallback (`login_route:"onboarding"` on a host that should be `client`) at audit time | 1.5 |

---

## 4. Thresholds and verdicts

| Total | Verdict | Operational meaning |
|---|---|---|
| **85–100** | **Premium** | Ready to drive paid traffic; ready for public announcement / press; ready to launch as a new client tenant unconditionally. |
| **75–84** | **Production-ready** | Site is operational for paid traffic and new-tenant launch with a tracked improvement backlog. Acceptable client-launch state. |
| **60–74** | **Acceptable with known risks** | Usable for warm / direct / referred traffic and for tenant working sessions. **Not** acceptable for paid traffic, public announcement, or new-tenant launch. Each <full-points row below threshold must be named in the improvement backlog with an owner. |
| **<60** | **Remediation required** | Site is not in an acceptable client-launch state. A remediation packet must close named rows before any traffic gating event. |

**Hard targets per surface type** (extending `WEBSITE_QUALITY_REPORTING_STANDARD.md` §2):

| Surface type | Minimum acceptable | Premium target |
|---|---|---|
| **CorpFlow apex marketing** (`corpflowai.com`) | 75/100 | 85/100 |
| **Tenant working surface** (e.g. `lux.corpflowai.com`) at tenant launch | 75/100 | 85/100 |
| **Tenant working surface** in pre-launch (gated on operator-driven items: SC DNS, Lighthouse, Analytics) | 65/100\* permissible if every gap is named operator-driven and remediation is queued | 85/100 |
| **Lead-magnet single-page surface** | 75/100 | 85/100 |
| **Internal surfaces** (`/change`, factory, login) | not scored — see §2 |

### 4.1 Doctrine override (binding)

Per `BRAND_AND_CONVERSION_DOCTRINE.md`, a site with **Conversion clarity ≤ 4 / 10** is **Conversion-PARTIAL** for buyer-facing usage **regardless of total**. The audit's verdict line **must** carry the doctrine note; the total does not earn the `Premium` or `Production-ready` label until conversion clarity is fixed.

Per `delivery-reality.mdc`, a `Production-ready` or `Premium` total is only valid when the site is **live-verified** on the production hostname at audit time. A 90/100 audit on a Preview deployment does not earn the label until the same audit runs against the production hostname.

---

## 5. Evidence requirements

Every audit (whether at 100/100 or at 30/100) ships the same evidence shape. Without evidence, a score is not an audit.

**Required (always):**

1. **Probe outputs.** HTTP status, content type, response time, first ~768B of body for each surface URL in scope. Captured to the audit folder. Use `curl` with a user agent string identifying the audit source.
2. **Production identification.** Vercel Production deployment ID + deployed commit SHA at audit time (extracted from `__NEXT_DATA__` `BuildID` and/or Vercel API). Aligned with `.cursor/rules/delivery-reality.mdc`.
3. **Tenant-resolution sanity.** `/api/tenant/site` payload (tenant_id + meta), `/api/ui/context` (tenant_registered + login_route).
4. **Monitoring readiness.** `/api/factory/health` + `/api/factory/production-pulse/runtime` JSON, captured at audit time.
5. **Score derivation.** A per-dimension row table showing item-level point award + notes, NOT just the totals.

**Required when measurable:**

6. **Lighthouse JSON / PSI output** for §3.3, §3.4, parts of §3.2 and §3.7.
7. **Search Console screenshots** for §3.1 + §3.7 (verification + sitemap discovered count). Operator-supplied.
8. **Keyboard / colour-contrast notes** for §3.2 (operator browser session).

**Forbidden:**

- Tokens, session cookies, full `Authorization` headers in any captured probe output.
- Tenant private data beyond what is anonymously visible (no admin views, no logged-in `/change`).
- Secret values from `.env`, Infisical, Vercel project envs.
- Internal dashboards or operator UI screenshots when the audit is going into a client-facing summary (see `WEBSITE_QUALITY_REPORTING_STANDARD.md` §6 for client-version rules).

**Asterisk discipline** carries over from `WEBSITE_QUALITY_REPORTING_STANDARD.md` §2.2: any PENDING row marks the total with `*`. The asterisk **appears in every place** the total is quoted (heading, summary, cross-references). Removing the asterisk requires the measurement to have closed.

---

## 5.1 Client-facing vs internal scoring

The **same score** powers both, but two reports come out of every audit:

| Aspect | Internal report | Client-facing summary |
|---|---|---|
| Audience | Anton, Cursor agents, contractors, reviewers | The client (tenant, prospective tenant, or stakeholder) |
| Path | `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>[-<event>]/README.md` | Generated on-demand from the same source data; lives in the client's communication packet, **not** in the repo. |
| Template | §5 of `WEBSITE_QUALITY_REPORTING_STANDARD.md` (verbatim) | §6 of `WEBSITE_QUALITY_REPORTING_STANDARD.md` (verbatim) |
| Language | Framework references allowed; jargon allowed; asterisks visible; commit SHAs / deployment IDs visible | Plain language only; no asterisks (replace with "preliminary; full measurement scheduled <date>"); no commit SHAs / deployment IDs; no framework references |
| Score precision | Per-dimension (10×10) | Total + verdict label only |
| Backlog visibility | Full top-N fixes with point gain | Top 3 fixes in buyer-facing outcome language (not technical change language) |

A client-facing summary that exceeds the score's verdict band is forbidden (§9 anti-pattern in `WEBSITE_QUALITY_REPORTING_STANDARD.md`).

---

## 6. Dimension cross-references

### 6.1 Mapping back to the v1 framework

The v1 5-dimension framework (`WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`) remains readable. Mapping for back-compat scoring:

| New v1 system dimension | Old framework dimension(s) |
|---|---|
| §3.1 SEO / indexing | SEO / discoverability |
| §3.2 Accessibility | Accessibility |
| §3.3 Performance | Performance (subset — speed) |
| §3.4 Mobile usability | Performance (subset — mobile) |
| §3.5 Conversion clarity | Conversion clarity |
| §3.6 Trust architecture | Trust + governance (subset — TLS, 404, privacy, terms, contact, ownership, no-AI-magic) |
| §3.7 Analytics / measurement | (new in v1 system; previously embedded in SEO Search Console row + Trust governance row) |
| §3.8 Monitoring / runtime health | (new in v1 system) |
| §3.9 Content completeness | (new in v1 system; previously embedded in Trust dead-links row) |
| §3.10 Tenant routing / infrastructure correctness | (new in v1 system) |

A site's old-framework score and new-system score will **usually differ by 5–15 points** (in either direction) because the new system surfaces previously-bucketed strengths and gaps. The reconciliation rule:

- A previously-Operational site (75–89 under old framework) **does not lose** its Operational label just because the new system scores it 70 due to surfaced Analytics or Mobile-usability gaps — the verdict label is sticky for one audit cycle while the operator schedules the gap-closing packet.
- A previously-Substantive-gaps site (40–59 under old framework) **may move up** to Acceptable-with-known-risks (60–74) if the new system surfaces previously-uncredited monitoring or routing strengths.

The new v1 system is canonical from 2026-05-27 forward.

### 6.2 How the new dimensions tie into doctrine and architecture

- §3.5 Conversion clarity binds to `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`. Doctrine non-negotiables override total verdicts.
- §3.8 Monitoring binds to `docs/operations/MONITORING_ARCHITECTURE.md`. Any new monitor must be reflected in §2 of that doc per its §9 binding rule.
- §3.7 Analytics binds to `docs/analytics/CORPFLOW_ANALYTICS_V1.md` for installed analytics, and to `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` + `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` for Search Console rollout.
- §3.10 Tenant routing binds to `docs/operations/TENANT_CLIENT_LOGIN.md` for the tenant ↔ host model.

---

## 7. Remediation workflow

A quality audit produces a **top-N fixes list** ranked by point gain. Those fixes become **packets** in `docs/execution/WEEKEND_EXECUTION_QUEUE.md` (or its successor). Per-packet shape (extends `WEBSITE_QUALITY_REPORTING_STANDARD.md` §7):

```markdown
- [ ] <Fix title> — <surface> — gains ~N points
  - Dimension(s) affected: <§3.X / §3.Y>
  - Lifts dimension(s) from a/10 to b/10
  - Evidence reference: <audit folder path>
  - Owner: <Anton (gate) | Cursor (executes) | Both>
  - Gates: <DNS | runtime PR | secret change | none>
  - Target audit re-run date: <YYYY-MM-DD>
```

A fix is **closed** only when:

1. The runtime change (if any) is on `main` and Vercel Production is **Ready** for that commit, per `delivery-reality.mdc`.
2. A re-audit covers the same dimension(s) and **confirms the point gain** numerically (not by impression).
3. The re-audit folder links back to the original audit folder.

A fix is **partial** when the runtime change shipped but the re-audit hasn't run (e.g. PR merged but no audit ran inside the §8 cadence window).

**Improvement backlog discipline:**

- A backlog item that does not appear in any current audit may exist as an idea but is not a remediation item.
- A backlog item with no owner cannot be closed — owners are mandatory.
- A backlog item with no target re-run date silently expires from the backlog after 30 days; Anton can re-prioritise.

---

## 8. Reporting cadence

Cadence inherits from `WEBSITE_QUALITY_REPORTING_STANDARD.md` §3. Specific to the v1 system:

| Trigger | Cadence | Owner | Output |
|---|---|---|---|
| **New tenant launch** (any new public marketing surface goes live on production) | One audit pre-launch (≥ 75/100 required) + one within 7 days of launch | Cursor (audit) → Anton (verifies) | Two audit folders; verdict line records the launch state per §3.10. |
| **Major content change** (rebrand, new section, new property type, redesigned hero, new locale) | One audit within 7 days of change | Cursor | One audit folder with Δ vs previous audit. |
| **SEO / a11y / runtime PR** (e.g. PR #222 class — touches `<head>`, `<main>`, `robots.txt`, `sitemap.xml`, routing) | One audit within 24h of merge **and** Production deploy Ready | Cursor (autonomous, no Anton approval needed for audit itself) | One audit folder; the **Production deploy ID** + **commit** are mandatory evidence. |
| **Monitoring / runtime PR** (touches anything in `MONITORING_ARCHITECTURE.md` §2) | One audit within 24h re-running §3.8 + §3.10 rows minimally | Cursor (autonomous) | A focused mini-audit acceptable; does not replace next full cadence audit. |
| **Quarterly drift check** for live tenants | Once per calendar quarter | Cursor (scheduled packet under `WEEKEND_EXECUTION_QUEUE.md`) | Full audit folder. |
| **Operator on-demand** | When Anton flags a regression, prepares a deal-shaped review, or sells a new tenant | Cursor | Full audit folder. |
| **Pre-paid-traffic gate** | Mandatory; cannot run paid traffic on a site whose last full audit was > 30 days old | Anton enforces | Existing audit re-verified live; not necessarily a new audit if the existing one is < 30d. |

**Audit folder convention:** `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>[-<event>][-quality-v1]/README.md` — with the `-quality-v1` suffix until the system is the only one in use (the suffix is preventative against confusion with framework-only audits during the transition).

---

## 9. Launch-readiness criteria

A new client tenant is **launch-ready** for paid traffic / public announcement when **all** of the following hold (extends `WEBSITE_QUALITY_REPORTING_STANDARD.md` §8):

1. **Quality score ≥ 75/100** under the v1 system on the production tenant hostname (asterisk-free; PENDING items have been measured).
2. **Conversion clarity ≥ 7/10** (no doctrine override risk).
3. **Monitoring / runtime health ≥ 7/10** (drift fingerprints absent; pulse + health endpoints green; tenant routing not in onboarding fallback).
4. **Tenant routing / infrastructure correctness ≥ 7/10** (host correctly resolves; sitemap host-aware; vercel.json consistent with runtime).
5. **Per-tenant migration audit** (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`) Sections A–F all PASS or PARTIAL with named follow-ups.
6. **Search Console verification COMPLETE** for the tenant hostname (per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md`).
7. **Analytics decision recorded** for the tenant (default = Plausible per `CORPFLOW_ANALYTICS_V1.md`; for tenant working surfaces on the CorpFlow umbrella, the doctrine-correct "off" choice is acceptable when the tenant's real domain handles its own analytics).
8. **`delivery-reality.mdc` audit captured** for the tenant marketing surface.
9. **No open `db.prisma.io` / Postgres-drift fingerprints** (per `docs/operations/POSTGRES_PROVIDER.md` §4b).
10. **Last full audit ≤ 30 days old.**

If any of (1)–(10) is false, the tenant is in a **named pre-launch state** until it closes. The quality report carries that state in the verdict line.

---

## 10. Anti-patterns (forbidden)

In addition to `WEBSITE_QUALITY_REPORTING_STANDARD.md` §9 anti-patterns, this system explicitly forbids:

- **Total-driven cherry-picking.** Picking only the highest-point items to score so the total clears the threshold. Score every row.
- **Doctrine bypass.** Quoting a Premium total when Conversion clarity is in the doctrine-override zone (≤ 4/10) is forbidden in client-facing reports.
- **Internal-surface scoring.** `/change`, `/admin`, `/api/*` are not in scope; do not award them rows.
- **Re-counting one item across dimensions.** The viewport meta earns Mobile §3.4 row 1 OR Accessibility §3.2 row 1 — both rows credit it. That double-credit is allowed because each dimension measures a different aspect. **What is forbidden** is re-counting one row inside the same dimension across two items.
- **Asterisk-removal by impression.** "It probably scores ≥ 95 on Lighthouse" does not close a `*`. Run Lighthouse.
- **Silent system substitution.** A "59/100" headline on an audit folder without naming whether it is the 5-dim framework or the 10-dim system. Always name the system (`-quality-v1` suffix on the folder, or explicit `(v1 system)` annotation).
- **Skipping live verification.** A score on a Preview deployment is informational; only a score on the production hostname earns a verdict label.

---

## 11. Cross-references

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — v1 5-dimension rubric (still readable; back-compat).
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence, evidence shape, client wording.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console operator playbook (feeds §3.1 + §3.7).
- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — bounded apex-only first execution packet.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible decision (feeds §3.7).
- `docs/operations/MONITORING_ARCHITECTURE.md` — runtime monitor map (feeds §3.8).
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — design for monthly client reports (consumes audit scores).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — doctrine non-negotiables.
- `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` — Section C consumes the quality score.
- `.cursor/rules/delivery-reality.mdc` — live-prod-only "Operational" rule.

---

## 12. Status

| Site | Last audit | System | Score | Verdict | Next audit |
|---|---|---|---|---|---|
| `lux.corpflowai.com` | 2026-05-27 (v1 system baseline) | v1 (10-dim) | **59/100\*** | Remediation required (high-confidence ceiling 75/100\* once Lighthouse + Search Console land) | After Lighthouse run **or** after Search Console verification — whichever lands first. |
| `lux.corpflowai.com` | 2026-05-25 (post-SEO-fix) | v1 framework (5-dim) | 59/100\* | Substantive gaps closing toward Operational | superseded by 2026-05-27 v1-system audit |
| `lux.corpflowai.com` | 2026-05-23 (baseline) | v1 framework (5-dim) | 44/100\* | Substantive gaps | superseded |
| `corpflowai.com` (apex) | none recorded | — | — | — | First v1-system baseline audit queued under `WEEKEND_EXECUTION_QUEUE.md` Goal 6. |
| Future tenants | — | — | — | — | Per migration packet under `CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`. |

When a row updates, copy the previous row down to a "Previous audits" sub-section so the table stays current and the timeline is preserved.
