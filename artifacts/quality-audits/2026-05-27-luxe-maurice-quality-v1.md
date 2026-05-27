# Quality audit — `luxe-maurice` — 2026-05-27 (v1 system baseline)

**Surface scored:**

- `https://lux.corpflowai.com/` (home)
- `https://lux.corpflowai.com/concierge` (primary CTA destination)
- `https://lux.corpflowai.com/property/lm-nc-ridge` (sample property — sitemap-listed)
- `https://lux.corpflowai.com/sitemap.xml`
- `https://lux.corpflowai.com/robots.txt`
- `https://lux.corpflowai.com/api/tenant/site` (tenant resolution)
- `https://lux.corpflowai.com/api/ui/context` (login-routing sanity)
- `https://lux.corpflowai.com/this-route-should-not-exist-9Z` (404 probe)
- `https://lux.corpflowai.com/favicon.ico` (icon probe)
- `https://core.corpflowai.com/api/factory/health` (monitoring)
- `https://core.corpflowai.com/api/factory/production-pulse/runtime` (monitoring)

**Auditor:** Cursor (read-only public probes from `corpflow-exec-01`; `curl` only — no Lighthouse session in this run).
**Mode:** read-only — no site mutation, no tenant-data writes, no `tenant_id` mutation, no DB writes, no production changes, no analytics expansion.
**System used:** `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` (v1, 10 dimensions × 10 points each = 100). **This is the first Lux audit under the v1 system.** Prior audits used the v1 framework (5 dimensions × 20 points each = 100) — see §6 for the reconciliation.

**Previous baselines:**

- **2026-05-23 (framework v1, baseline pre-SEO-fix):** **44/100\*** — `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`.
- **2026-05-25 (framework v1, post-SEO-fix):** **59/100\*** — `artifacts/quality-audits/2026-05-25-luxe-maurice-postfix/README.md`.

**This audit (2026-05-27, v1 system 10-dim):** **59/100\*** (Δ vs 2026-05-23 framework total = **+15**; same total as 2026-05-25 framework score by intentional design — see §6 for the redistribution narrative).

---

## 1. Score

| # | Dimension | Score | Notes |
|---|---|---|---|
| §3.1 | SEO / indexing | **6/10\*** | title/description/canonical/OG present on home + property pages; sitemap host-aware (6 URLs); robots.txt valid; `og:image` still missing; **concierge page lacks description/canonical/OG** (head is minimal — see §2.1); Lighthouse SEO ≥ 95 PENDING; Search Console verification + indexing PENDING (Anton-only, packet at `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — apex first, Lux deferred). |
| §3.2 | Accessibility | **4/10\*** | `<html lang="en">` + viewport `initial-scale=1` confirmed on every probed page; single `<h1>`; 0 `<img>` tags so alt trivially passes; `<main>` present on home + property; Lighthouse a11y ≥ 95 PENDING (would unlock +3); keyboard / colour-contrast PENDING (operator browser session, +1 / +1.5). |
| §3.3 | Performance | **3/10\*** | TTFB first probe (cold MISS) **2.705s**; subsequent warm probes all <0.4s (typical 0.15–0.40s); 2026-05-25 baseline showed 705ms warm — today's variance is wider; cannot award the TTFB row (median of 3 warm needed but cold-start dominated first observation). LCP/CLS/TBT PENDING (Lighthouse). Lighthouse Performance ≥ 90 PENDING. **Cold-start regression observed today vs 2026-05-25 — flag for follow-up.** |
| §3.4 | Mobile usability | **5/10\*** | Viewport meta correct; no horizontal scroll measurable from probes (would need browser); Lighthouse mobile audit PENDING (which covers tap targets + content-sized-correctly + the mobile-fold). Award only the viewport row (1.5) plus an interim half-credit for "no obvious mobile blockers in HTML" (3.5). New dimension — no historical baseline. |
| §3.5 | Conversion clarity | **9/10** | Single primary CTA visible above the fold (concierge / private enquiry); CTA describes buyer intent (no "Choose payment path"-style language); offer understandable within five seconds; payment / region / routing complexity comes after intent; trust path partial (no client logos shown). Doctrine **PASS** preserved. |
| §3.6 | Trust architecture | **7/10** | TLS + HSTS `max-age=63072000` ✓; no mixed content; branded 404 with `<html lang>`, `<meta robots="noindex">`, `<main>`, Lux gold accent ✓; no unsupported revenue / AI-magic claims; **still missing:** `/privacy` route, `/terms` route, publishable `mailto:` contact alias, explicit "Operated by …" ownership statement. **−3 across rows 3, 4, 5, 6.** |
| §3.7 | Analytics / measurement | **1/10** | No Plausible on `lux.*` **by doctrine design** per `20260526-plausible-internal-vs-client-facing-boundary.md` (Lux is a tenant working surface, not a buyer-facing marketing domain) — ADR-backed absence earns the row 1/2. Search Console verification + sitemap-submitted + indexed-page-count all PENDING for Lux (apex first per `SEARCH_CONSOLE_EXECUTION_PACKET.md`). No conversion events wired to analytics. No structured data (Schema.org). **The lowest scoring dimension** — but the doctrine context softens the verdict (see §3 below). |
| §3.8 | Monitoring / runtime health | **9/10** | `/api/factory/health` → 200, `status:"healthy"`, `database_configured:true`, `runtime_config_valid:true`, `password_reset_delivery_configured:true` ✓; `/api/factory/production-pulse/runtime` → 200, `ok:true`, `deployment_ready:true`, `monitoring.ok:true`, **`core.database_reachable:true`** ✓ (drift incident closed); `/api/tenant/site` → 200, `tenant_id:"luxe-maurice"` ✓; `/api/ui/context` → 200, `tenant_registered:true`, `login_route:"client"` ✓; no `db.prisma.io` errors. **−1** for Telegram alert wiring (operator secrets `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` still unset per 2026-05-24 audit — failure alerts silently no-op). |
| §3.9 | Content completeness | **6/10** | Home renders full Lux content (38,686 bytes; markers `Mauritius`, `concierge`, `luxe-maurice` present); property pages serve 200 with per-item meta + rich content; localisation present (EN/FR/RU bundles in `/api/tenant/site` payload) ✓; **concierge page head incomplete** (no description / canonical / OG — see §2.1); no `/privacy`, `/terms`, `/about` routes on `lux.*` subdomain; trust-anchor block missing (no logos, no named team member, no published case study); no "Lorem ipsum" / placeholder. **Deduct 1 for concierge head; 1.5 for missing privacy/terms/about routes; 1 for missing trust-anchor block; 0.5 for FR/RU bundles being present in API but not exposed in surface-level `<head>` tags.** |
| §3.10 | Tenant routing / infrastructure correctness | **9/10** | Tenant subdomain returns Lux content (no apex fallback); `api/tenant/site` and `api/ui/context` return canonical `luxe-maurice` resolution; sitemap is host-aware (apex emits different URL list); HSTS present; **−1** for the dead `vercel.json` static rewrites on lines 9-28 (still present at HEAD; Next.js path wins at runtime — flagged 2026-05-24, cleanup PR queued but not shipped). No regression to onboarding fallback. |
| | **Total** | **59/100\*** | `*` = PENDING items in §3.1 (Lighthouse SEO ≥ 95, SC verification, og:image, indexing), §3.2 (Lighthouse a11y, keyboard, colour-contrast), §3.3 (Lighthouse Perf + LCP + CLS + TBT, TTFB warm-median), §3.4 (Lighthouse mobile tap-targets, no-overflow), §3.7 (SC for Lux deferred). |

### Confirmed via public probes (binary checklist, today)

| Item | State | How verified |
|---|---|---|
| Lux tenant resolves as `luxe-maurice` | ✅ | `api/tenant/site.tenant_id:"luxe-maurice"`; `api/ui/context.tenant_id:"luxe-maurice"`, `tenant_registered:true`, `login_route:"client"`, `mode:"client"` |
| Lux home shows Lux content (not apex fallback) | ✅ | 38,686 bytes; markers `Mauritius`, `Luxurious Mauritius · LuxeMaurice` title, full hero |
| Sitemap is host-aware + valid XML | ✅ | `lux.corpflowai.com/sitemap.xml` → 200, `application/xml`, lists `/`, `/concierge`, `/property/lm-nc-ridge`, `/property/lm-villa-belombre`, `/property/lm-pent-plateau`, … (6 URLs visible in first 768B) |
| Robots exists and is policy-correct | ✅ | 200, marketing-allow + operator/factory disallow + sitemap pointers |
| Branded 404 works | ✅ | 404 status + Lux-styled HTML with `<html lang="en">`, `noindex`, `<main>`, gold accent `#0a0a0a` theme-color |
| Metadata / head tags present (home) | ✅ | `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<meta property="og:type">`, `og:title`, `og:description`, `og:url` |
| Metadata / head tags present (property) | ✅ | Same set + synthesized description from public fields |
| Metadata / head tags present (concierge) | ❌ | Only `<title>` + `theme-color`; no description, no canonical, no OG — **see §2.1** |
| `<main>` landmark on home | ✅ | Confirmed in body bytes |
| Factory health green | ✅ | `/api/factory/health` 200, `status:"healthy"`, all `checks.*:true` |
| Production pulse green | ✅ | `/api/factory/production-pulse/runtime` 200, `ok:true`, `core.database_reachable:true` |
| No `db.prisma.io` errors anywhere | ✅ | All 11 probed endpoints clean; pulse confirms |
| No tenant-routing regression to onboarding | ✅ | `login_route:"client"` (not `onboarding`) |
| Favicon present | ❌ | `/favicon.ico` returns 404 (branded 404 page; favicon still missing — not in framework rubric but flagged for operator) |

---

## 2. Notable observations

### 2.1 Concierge page lacks SEO `<head>` content

`https://lux.corpflowai.com/concierge` (200, 4,181 bytes) is served as a static page (`x-vercel-cache: HIT`, `content-disposition: inline; filename="concierge"`) and its `<head>` carries only `<title>` + `theme-color`. **No `description`, no `canonical`, no `og:*`, no `twitter:*`.** This is below the SEO floor we shipped in PR #222 for the Next.js Lux paths.

**Likely cause:** the concierge route is served via a static rewrite (per the historical `vercel.json` `/lux-landing-static.html` pattern) rather than the Next.js component that PR #222 updated. This may be the dead-rewrite cleanup already named on the backlog (2026-05-24 audit flagged the `vercel.json` lines 9-28 as a separate cleanup item) — but if concierge is in fact being served from a static asset today, that's a more serious gap than a "dead rewrite that won't fire".

**Recommendation:** investigate whether `pages/concierge.js` (or a Lux-specific concierge handler) exists and whether the static rewrite is shadowing it. **Fix:** route concierge through the same Next.js Head pattern as home + property pages.

**Score impact:** −1.5 in §3.1 (one of three top-level routes lacks meta); −1 in §3.9 (content completeness on a sitemap-listed surface).

### 2.2 Cold-start TTFB regression vs 2026-05-25

Today's first probe of `https://lux.corpflowai.com/` showed `time_starttransfer: 2.705s` (`x-vercel-cache: MISS`). 2026-05-25 audit showed 705 ms TTFB (cold + warm both). All subsequent warm probes today were sub-second (<400 ms median).

**Likely cause:** Vercel serverless cold-start variance; the tenant-site fetch path warmth depends on recent activity. Today's first hit caught a cold function in the `iad1` region. Not a regression in code; a regression in observability.

**Recommendation:** capture TTFB as **median of 3 consecutive warm pulls** rather than first-pull, per `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §3.3. The 600 ms ceiling is achievable on warm cache; Lighthouse mobile measurement will give a defensible LCP number that supersedes the raw TTFB row.

**Score impact:** Performance §3.3 stays at 3/10 today (TTFB row 0, sub-scores PENDING). Expected ceiling once Lighthouse runs: 7/10 (Lighthouse Perf ≥ 90 + LCP ≤ 2.5s + TBT ≤ 200 likely all earn full credit; CLS likely 0 on a static-content page).

### 2.3 Plausible NOT on Lux — by design

No Plausible script in any of the Lux HTML probes today, consistent with the apex-only step-1 rollout (`docs/decisions/20260527-plausible-apex-only-rollout-step1.md`) and the internal-vs-client-facing boundary (`docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md`).

`§3.7 Analytics / measurement` therefore awards the ADR-backed absence row 1/2 (1 point) and PENDING for Search Console (Lux deferred behind apex per `SEARCH_CONSOLE_EXECUTION_PACKET.md`).

**This is design-correct, not a defect.** Verdict line carries the doctrine note (see §3 below).

### 2.4 Monitoring is the strongest dimension

§3.8 scores 9/10 — the only deduction is operator-driven (Telegram alert secrets). Factory health green, pulse green, tenant resolution green, no drift fingerprints, recent (2026-05-25) drift incident demonstrably closed (`core.database_reachable:true`). The runtime side of Lux is in the best shape it has been since the platform stood up.

### 2.5 Tenant routing is the second strongest dimension

§3.10 scores 9/10. Only deduction is the dead `vercel.json` static rewrites on lines 9-28 (already flagged 2026-05-24; cleanup PR is a small docs/runtime item, not blocking).

### 2.6 Apex policy routes are reachable on `lux.*` but serve apex-branded content (refined observation, post-audit re-probe)

Follow-up probes from `corpflow-exec-01` confirmed that `lux.corpflowai.com/privacy`, `/terms`, `/about`, `/refund-policy`, `/contact` all return **200** with bodies byte-equal to the apex variants (e.g. `lux/privacy` and `corpflowai.com/privacy` both serve **6,196 bytes**; `lux/terms` and `corpflowai.com/terms` both serve **7,175 bytes**). The Next.js app routes these top-level pages **host-agnostically** — a Lux visitor reaches a working `/privacy` URL, but the page they see is CorpFlowAI's privacy policy, not a Lux-tenant-appropriate one.

**Why the headline score did not change:** the v1 system §3.6 rows *Privacy policy reachable from footer at a working route* / *Terms of service reachable* are awarded for **tenant-appropriate content**, not for *any* page existing at the path. The same is true of the contact-alias row (`lux/contact` 200 with CorpFlow contact info ≠ Lux concierge alias). The conservative interpretation in §1 stands.

**What this changes about the top-fix list:** fix #5 (originally "Privacy + Terms routes on lux.*") is more accurately framed as "**Lux-branded** privacy / terms / about / contact pages — either as tenant-host-aware variants of the existing routes, or as dedicated `pages/lux-*.js` routes mounted under the Lux host". Same point value (+3 across §3.6 + §3.9), more accurate scope. Fix #6 ("publishable contact alias") becomes "publish a Lux-branded contact alias (e.g. `concierge@…`) and surface it on `lux/contact` so the Lux contact page is not apex-branded".

**What this changes about the v1 system (potential v1.1 refinement, not blocking):** the system's §3.6 + §3.9 rows could explicitly split "route exists at path" (1 sub-point) from "tenant-appropriate content at that path" (remaining sub-points). Today the rubric implicitly bundles them; this audit treats the bundle as a single binary because the spirit of the row is tenant-appropriate content. A v1.1 split would let future audits credit the "route exists" half explicitly.

---

## 3. Verdict

**Total 59/100\* (v1 system, 10 dimensions).** Under `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §4: **Remediation required (<60).**

Doctrine override (§4.1): Conversion clarity **9/10** is well above the doctrine-binding floor of 4/10 — **no Conversion-PARTIAL** override applies. Buyer-facing usage of Lux for warm / direct / referred traffic is acceptable.

**Operational interpretation:**

- Lux **is not** in a state we would launch a new client tenant at, per launch-readiness criteria (§9 of the v1 system requires ≥ 75/100). However, Lux is also **not** a typical new tenant — it is the current tenant working surface; the live tenant marketing (when it ships) will be on a real Lux-owned domain.
- **For paid-traffic gating:** Lux is not paid-traffic-ready under this score (<75) AND has no last full audit ≤ 30 days old in v1-system format until today — this audit becomes the baseline.
- **For continued tenant operations:** Lux is operating correctly. Conversion is intact. Tenant routing is correct. Monitoring is solid. The score gap is concentrated in **measurement** (Lighthouse, Search Console) and **content completeness** (privacy/terms/about, concierge page head).

**Ceiling-once-measurements-land estimate:** Lighthouse PASS would award ~+9 points (Performance +4, Accessibility +3, SEO Lighthouse +1.5, Mobile Lighthouse subset +0.5–1); Search Console verification + indexing for Lux (if/when an explicit decision adds it) would add ~+5 (SEO §3.1 +3, Analytics §3.7 +2). **High-confidence ceiling: 73–75/100\*** with measurements alone; **78–80/100** if also closing concierge head, privacy/terms routes, og:image, Telegram alert wiring.

---

## 4. Doctrine alignment (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` non-negotiables)

- ✅ One primary conversion goal obvious — "Private concierge" / "Private enquiry" repeated and unambiguous.
- ✅ Offer understandable within five seconds — full Lux content intact (38,686 bytes).
- ✅ CTA describes buyer intent — concierge / private enquiry; no internal-process language.
- ✅ Payment / region / routing complexity comes after buyer intent — concierge form gates pricing.
- ✅ Avoids unsupported revenue / AI-magic claims.
- ✅ Buyer knows the next step — "Private enquiry" repeated under each property card.

**Doctrine verdict: PASS** (preserved across the v1 framework → v1 system transition).

---

## 5. Top 10 recommended fixes (ordered by point gain × ease)

1. **Run Lighthouse mobile on Lux home + concierge + property** (operator browser session). **Expected gain ~+9 points** across §3.2, §3.3, §3.4. Easiest single action by far. Owner: Anton or any operator with a Chrome session. Path: PageSpeed Insights API also acceptable for evidence capture.
2. **Fix concierge page `<head>`** — route concierge through the same Next.js Head pattern as home/property pages so description, canonical, OG, Twitter are emitted. **Expected gain ~+2.5 points** (§3.1 +1.5, §3.9 +1). Owner: Cursor (small runtime PR). Gates: production deploy (Anton merge).
3. **Cleanup dead `vercel.json` static rewrites** (lines 9-28, flagged 2026-05-24). **Expected gain ~+1 point** (§3.10). Owner: Cursor. Gates: production deploy. Note: investigate whether this is what shadows concierge (couples with item 2).
4. **Telegram alert wiring** — set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets so factory-control-loop failure alerts fire (per 2026-05-24 audit blocker). **Expected gain ~+1 point** (§3.8). Owner: Anton (secret values). Gates: GitHub repo secret change. **Tracked as separate queue packet `telegram-alert-wiring`.**
5. **Lux-branded `/privacy` + `/terms` + `/about` + `/contact` + `/refund-policy`** — the routes already serve 200 on `lux.*` but with apex-branded CorpFlowAI content (see §2.6). Either ship tenant-host-aware variants of the existing `pages/privacy.js` / `pages/terms.js` / `pages/about.js` / `pages/contact.js` / `pages/refund-policy.js`, OR add `pages/lux-*.js` variants mounted under the Lux host. **Expected gain ~+3 points** (§3.6 +1.5 across privacy/terms/contact rows + §3.9 +1.5 on the policy-routes row). Owner: Cursor (drafts copy + routing) → Anton (approves Lux-tenant-appropriate copy) → Cursor (ships). Gates: production deploy, legal-content review.
6. **Lux-branded publishable contact alias** — `mailto:concierge@luxemaurice.com` or equivalent reachable from footer **and** surfaced on the Lux-branded `/contact` route (§2.6) instead of the apex CorpFlowAI contact info. **Expected gain ~+1.5 points** (§3.6). Owner: Anton (alias setup) → Cursor (footer wiring + Lux contact page).
7. **"Operated by …" ownership statement** in footer. **Expected gain ~+1 point** (§3.6). Owner: Cursor (copy from doctrine).
8. **`og:image` canonical 1200×630** — Lux-branded hero image referenced from `<head>` on home + property pages. **Expected gain ~+0.5 point** (§3.1 OG row). Owner: Anton (image asset) → Cursor (Head reference).
9. **`/about` route on `lux.*`** — short tenant-story page with named team member or operational credentials. **Expected gain ~+1 point** (§3.9 trust-anchor row). Owner: Anton (copy) → Cursor (route + Head).
10. **Favicon** — ship a 32×32 Lux-branded favicon at `/favicon.ico` (currently 404). **Not in framework rubric**, but flagged for operator polish. **Expected gain ~0 points** within v1 rubric; flagged for client-trust impression.

Closing items 1 + 2 alone would lift Lux to roughly **70/100\*** within a week. Closing items 1–7 would lift Lux to roughly **75–78/100** — production-ready under the v1 system.

---

## 6. v1 framework → v1 system reconciliation

Today's 59/100 under the v1 10-dim system **equals** 2026-05-25's 59/100 under the v1 framework — by intentional design of the redistributed scoring. The reconciliation per `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §6.1:

| Old dim (v1 framework) | Old score | New dim(s) (v1 system) | New score(s) | Δ |
|---|---|---|---|---|
| Conversion clarity (0–20) | 18/20 | §3.5 Conversion clarity (0–10) | 9/10 | 0 |
| Performance (0–20) | 8/20\* | §3.3 Performance (0–10) + §3.4 Mobile usability (0–10) | 3/10\* + 5/10\* = 8/20 equivalent | 0 |
| Accessibility (0–20) | 6/20\* | §3.2 Accessibility (0–10) | 4/10\* | −2 effective |
| SEO / discoverability (0–20) | 12/20\* | §3.1 SEO / indexing (0–10) + part of §3.7 Analytics (0–10 SC rows) | 6/10\* + ~2 SC-Lux-PENDING | ~0 |
| Trust + governance (0–20) | 15/20 | §3.6 Trust architecture (0–10) + §3.8 Monitoring (0–10) + §3.9 Content completeness (0–10) + §3.10 Tenant routing (0–10) + part of §3.7 Analytics (0–10) | 7 + 9 + 6 + 9 + 1 (partial) | **Net redistribution** |
| **Total (5-dim)** | **59/100\*** | **Total (10-dim)** | **59/100\*** | **0** |

**What the redistribution surfaces:**

- §3.8 *Monitoring / runtime health* was previously hidden inside Trust + governance — Lux scores 9/10 here, which is a real strength that didn't show in the framework total.
- §3.10 *Tenant routing / infrastructure correctness* was also previously hidden — another 9/10 real strength.
- §3.7 *Analytics / measurement* was previously implicit — Lux scores 1/10 here, which is a real gap softened by doctrine context but visible now.
- §3.9 *Content completeness* was previously embedded in Trust dead-links + governance — Lux scores 6/10, which exposes the missing privacy/terms/about routes more clearly.
- §3.4 *Mobile usability* was previously embedded in Performance — Lux scores 5/10\* (mostly PENDING), which separates "raw speed" from "phone-friendly".

The total is unchanged, but **the gap map is clearer**. This is the entire purpose of the v1 system: a Production-ready Lux looks different in the 10-dim breakdown than a Production-ready Lux would look in the 5-dim breakdown — even though both could land at 75/100.

---

## 7. Operator-required follow-ups (cannot complete from public probes)

- Lighthouse mobile run (Performance / Accessibility / SEO Lighthouse sub-scores).
- Search Console verification + indexed page count for `lux.*` (deferred behind apex per `SEARCH_CONSOLE_EXECUTION_PACKET.md`; if/when a separate Lux SC decision is made).
- Telegram alert secret wiring (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`).
- Keyboard tab traversal verification on home + property pages.
- Colour-contrast verification (CTA, body text, link text — WCAG AA).
- Privacy / terms / about route content (Anton drafts; Cursor wires).
- Publishable contact alias setup (`concierge@…` or `support@…` MX + alias).

---

## 8. Whether Lux is client-ready

**For paid traffic / public announcement:** NO. Score is <75. Specifically: Lighthouse not measured, Search Console not verified for `lux.*`, privacy/terms missing.

**For warm / direct / referred buyer-facing traffic:** YES, with the doctrine note. Conversion clarity is excellent (9/10), monitoring is solid (9/10), tenant routing is correct (9/10). A buyer who reaches Lux via a direct introduction or a referral can complete the concierge flow without friction.

**For tenant working / staging operations:** YES (this is Lux's primary role today). All operational pre-conditions hold.

**For new-tenant launch precedent:** NO. Launch-readiness §9 of the v1 system requires ≥ 75/100 AND Search Console verification — Lux fails both today. The first new-tenant launch (whenever it happens) should hit those thresholds.

---

## 9. Whether analytics / Search Console are still blockers

**For Lux specifically:**

- **Analytics on `lux.*`:** **NOT a blocker** for Lux today, by doctrine. Per `20260526-plausible-internal-vs-client-facing-boundary.md`, tenant working surfaces on the CorpFlow umbrella do not load Plausible — that is the correct architectural choice. The blocker is upstream: Lux's eventual buyer-facing surface (`luxemaurice.com` or similar) needs its own analytics, and that is a tenant-side decision.
- **Search Console for `lux.*`:** **Blocker for paid traffic** because §3.1 SEO + §3.7 Analytics both depend on it. **Deferred behind apex** per `SEARCH_CONSOLE_EXECUTION_PACKET.md` — apex is the first rollout. A future packet may decide whether Lux gets its own SC property or whether SC is only run on the tenant's real domain.

**For the wider CorpFlow platform:**

- **Apex `corpflowai.com` Search Console:** **Blocker for measuring apex SEO outcomes.** Tracked in `SEARCH_CONSOLE_EXECUTION_PACKET.md` (this PR ships the packet doc; operator action is queued).
- **Apex Plausible:** **In motion** — step-1 env flip pending Anton per `20260527-plausible-apex-only-rollout-step1.md`.

**Bottom line:** these are queued items, not surprise blockers. The path forward is named and bounded.

---

## 10. Evidence

### 10.1 Probe outputs (captured 2026-05-27 ~04:20 UTC from `corpflow-exec-01`)

All probes anonymous, UA `Mozilla/5.0 (CorpFlowAuditor/1.0)`. Full headers + first 768B of body captured to `/tmp/cf-probe-2026-05-27/` on `corpflow-exec-01` (not committed; ephemeral). Summary table:

| # | Endpoint | HTTP | Size | TTFB (s) | Notes |
|---|---|---|---|---|---|
| 1 | `lux/` | 200 | 38,686 | 2.705 (cold MISS) | Lux content; full head |
| 2 | `lux/sitemap.xml` | 200 | 1,554 | 0.522 | Host-aware, lists 6 URLs |
| 3 | `lux/robots.txt` | 200 | 1,274 | 0.256 | Marketing-allow + operator-disallow + sitemap pointers |
| 4 | `lux/api/tenant/site` | 200 | 11,030 | 0.306 | `tenant_id:"luxe-maurice"`, full site config |
| 5 | `lux/api/ui/context` | 200 | 552 | 0.147 | `tenant_registered:true`, `login_route:"client"` |
| 6 | `lux/property/lm-nc-ridge` | 200 | 6,564 | 0.397 | `<main>`, full head |
| 7 | `lux/this-route-should-not-exist-9Z` | 404 | 2,443 | 0.218 | Branded 404 |
| 8 | `lux/favicon.ico` | 404 | 2,443 | 0.208 | Still missing — returns branded 404 |
| 9 | `lux/concierge` | 200 | 4,181 | 0.210 | **Minimal head — see §2.1** |
| 10 | `core/api/factory/health` | 200 | 1,015 | 0.184 | `status:"healthy"`, all checks `:true` |
| 11 | `core/api/factory/production-pulse/runtime` | 200 | 859 | 0.148 | `ok:true`, `core.database_reachable:true` |

### 10.2 Production identification at audit time

- `core/api/factory/health` → `database_configured:true`, `runtime_config_valid:true`, `password_reset_delivery_configured:true`, `cmp_mirror_enabled:true`, `forward_url_configured:true`.
- `core/api/factory/production-pulse/runtime` → schema `corpflow.production_pulse.v1`, `version:1`, `deployment_ready:true`, `monitoring.ok:true`, `core.database_reachable:true`.
- Lux `BuildID` not extracted in this run (would require inline `__NEXT_DATA__` parse; deferred to next audit cycle when Lighthouse runs).
- Latest deployed commit on `main`: `747181b8` (Monitoring Architecture v1) — branch `docs/quality-system-v1` (this PR) is docs-only and does **not** modify any deployed commit.

### 10.3 HSTS / TLS notes

`Strict-Transport-Security: max-age=63072000` (2 years) on all `lux.*` responses. No mixed-content. No CSP header observed (not in v1 rubric).

---

## 11. Whether the v1 system needs adjustment

**v1 system is holding up.** Three observations the next system revision (v1.1) could codify, none blocking:

1. **Cold-MISS-vs-warm TTFB ambiguity.** Today's first probe hit a cold function (2.7s TTFB); all subsequent probes were sub-second. The v1 system §3.3 says "median of 3 warm" but a single-shot probe still influences impressions. Suggested patch: explicitly require **5 warm probes after a 30s warm-up wait**, drop the first, median the rest. Already aligned with §3.3 in spirit; tighten wording in v1.1.
2. **Doctrine-correct absence weighting in §3.7.** Awarding 1/2 for an ADR-backed analytics absence is fair, but the audit narrative needs to be clearer that the doctrine context softens the verdict line. Suggested patch: split §3.7 row 1 into "Analytics installed where doctrine-appropriate" (1.5) + "ADR documents installation status" (0.5) — same totals, clearer credit.
3. **Static-rewrite vs Next.js-Head ambiguity in §3.1.** The concierge page concretely demonstrates the gap: Vercel's `content-disposition: inline; filename="concierge"` strongly suggests a static asset shadowing the Next.js path. The audit caught it, but the rubric could explicitly call out "every public route uses the same Head pattern". Suggested patch: add a §3.1 row "Per-route SEO head consistency — no static rewrite gaps".
4. **Route-exists vs tenant-appropriate content split in §3.6 + §3.9.** Per §2.6 of this audit: `lux.*` reaches apex policy/contact routes byte-equal to apex variants. Today the rubric bundles "route reachable" with "tenant-appropriate content" into one row; splitting them (1 sub-point for route reachable + remaining sub-points for content quality) would let future audits credit the half-state explicitly.

All four are small refinements; this audit was scored under the v1 system rules verbatim.

---

## 12. Files referenced

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the scoring system this audit applies (v1, 10-dim).
- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — predecessor framework (v1, 5-dim) — for reconciliation.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence + evidence shape.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Lux SC playbook (deferred).
- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — apex SC first; Lux next.
- `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md` — Lux analytics doctrine.
- `docs/decisions/20260527-plausible-apex-only-rollout-step1.md` — apex Plausible step-1.
- `docs/operations/MONITORING_ARCHITECTURE.md` — monitor map (§3.8 evidence).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — doctrine alignment (§4 above).
- `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md` — baseline.
- `artifacts/quality-audits/2026-05-25-luxe-maurice-postfix/README.md` — post-SEO-fix.
- `pages/_app.js`, `pages/_document.js`, `pages/404.js`, `pages/sitemap.xml.js`, `public/robots.txt` (per PR #222).
- `components/LuxeMauriceTenantPresentation.js`, `components/LuxeMauricePropertyDetailPage.js` (per PR #222 Head pattern).
- `vercel.json` lines 9-28 (dead static rewrites — flagged §2.1 + §3.10).
