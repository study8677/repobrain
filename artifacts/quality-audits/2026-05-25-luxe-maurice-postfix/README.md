# Quality audit — luxe-maurice — 2026-05-25 (post-SEO-fix)

**Surface:**
- `https://lux.corpflowai.com/` (home)
- `https://lux.corpflowai.com/concierge` (primary CTA destination)
- `https://lux.corpflowai.com/property/lm-nc-ridge` (sample property)
- `https://lux.corpflowai.com/sitemap.xml`
- `https://lux.corpflowai.com/robots.txt`
- `https://lux.corpflowai.com/api/tenant/site` (tenant-resolution sanity)
- `https://lux.corpflowai.com/api/ui/context` (login-routing sanity)
- `https://lux.corpflowai.com/this-route-should-not-exist-9X` (404 probe)
- `https://lux.corpflowai.com/favicon.ico` (icon probe)

**Auditor:** Cursor (read-only public probes; `curl.exe` only — no Lighthouse session in this run).
**Mode:** read-only — no site mutation, no tenant-data writes.
**Production identification at audit time:**
- `core/api/factory/production-pulse/runtime` → `200`, `ok:true`, `monitoring.ok:true`, `core.database_reachable:true` (drift incident closed).
- Lux home `BuildID: bZkYgKoNW0pA_Dk3Ii005` (extracted from inline `__NEXT_DATA__` on the 404 probe).
- Tenant resolution restored: `api/tenant/site` → `200`, `tenant_id:"luxe-maurice"`; `api/ui/context` → `tenant_registered:true`, `login_route:"client"`.

**Baseline (2026-05-23, pre-fix):** **44/100\*** — `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`.
**This audit (2026-05-25, post-fix):** **59/100\*** (Δ **+15**).

---

## Score

| Dimension | Score | Δ vs 2026-05-23 | Notes |
|-----------|-------|-----------------|-------|
| Conversion clarity | **18/20** | 0 | SEO fix did not touch CTA, offer, or above-fold path. Doctrine PASS preserved. |
| Performance | **8/20\*** | 0 | Lighthouse not available in this session (8 awarded conditionally per framework §2.2). Independent TTFB probe: cold 706ms, warm 705ms — **fails ≤600ms ceiling**, so the TTFB-row stays 0/2. CWV sub-scores (LCP/CLS/TBT) **PENDING** until Lighthouse run. |
| Accessibility | **6/20\*** | 0 | Structural floor lifted by PR #222 (`<html lang="en">`, `<main>`, viewport `initial-scale=1` confirmed in HTML); single H1 with sensible heading order; 0 `<img>` tags so alt-text passes trivially. **Lighthouse a11y ≥95 / keyboard / contrast all PENDING** (would credit ≥+11 once measured). |
| SEO / discoverability | **12/20\*** | **+12** | The big gain. Title + description ✓, canonical ✓, OG type/title/description/url + Twitter card ✓ (**`og:image` still missing**), `/sitemap.xml` `200` (host-aware, 3 URLs at minimum), `/robots.txt` `200` (allows marketing, disallows operator/factory/tenant-private surfaces, lists apex + Lux sitemap). Lighthouse SEO ≥95 PENDING (high-confidence pass). Search Console verification + indexing requests still PENDING (operator-only, DNS TXT). |
| Trust + governance | **15/20** | **+3** | TLS + HSTS `max-age=63072000` ✓; no mixed content; **branded 404** with `<html lang>`, `<meta robots="noindex">`, `<main>`, Lux gold accent ✓ (replaces generic Next.js `_error`); no dead internal links (sample N=20 from baseline preserved); no unsupported revenue/AI-magic claims. **Still missing:** `/privacy` link, `/terms` link in footer (only the *word* "Terms" appears in body copy), publishable contact alias (`concierge@…` / `support@…` / `info@…`), explicit "operated by …" ownership statement. |
| **Total** | **59/100\*** | **+15** | `*` = pending Lighthouse + Search Console + og:image. Likely **78–80/100\*** ceiling once those land. |

### Confirmed via public probes (binary checklist)

| Item | State | How verified |
|---|---|---|
| Lux tenant resolves as `luxe-maurice` | ✅ | `api/tenant/site.tenant_id:"luxe-maurice"`; `api/ui/context.tenant_registered:true`, `resolved_tenant_name:"luxe-maurice"` |
| Lux homepage shows Lux content (not apex fallback) | ✅ | 38,686 bytes; markers `Mauritius`, `concierge`, `luxe-maurice` present in HTML |
| Sitemap is host-aware | ✅ | `lux.corpflowai.com/sitemap.xml` lists `https://lux.corpflowai.com/`, `/concierge`, `/property/lm-nc-ridge` |
| Robots exists and is valid | ✅ | `200`, `Allow: /` + explicit operator/factory disallows + sitemap pointers |
| Branded 404 works | ✅ | `404` status + Lux-styled HTML with `<html lang="en">`, `noindex`, `<main>`, gold accent `#d4af37` |
| Metadata / head tags present (home) | ✅ | `<title>`, `description`, `canonical`, `og:type`, `og:title`, `og:description`, `og:url`, `twitter:card`, `viewport`, `theme-color` |
| Metadata / head tags present (property) | ✅ | `<title>`, `description`, `canonical`, `og:type`, `og:title`, `og:url`, `<main>` (lm-nc-ridge probe) |
| `<main>` landmark | ✅ | Confirmed on home + property |
| No `db.prisma.io` errors | ✅ | All 5 endpoints clean; `production-pulse.core.database_reachable:true` |
| No tenant routing regression | ✅ | `lux/api/ui/context.login_route:"client"`; not the `onboarding` fallback observed during the incident |

### Still-missing items by point gain (top 5 fixes)

1. **Add `og:image` for Lux marketing root + property pages** — tenant-managed image already implied by `meta.page_title:"Lux Mauritius · Private previews"`; ship a single canonical 1200×630 image (or per-property hero crop) and reference it via `og:image` + `twitter:image`. **+1 point** on the OG-card row.
2. **Run Lighthouse mobile (operator or browser session)** — Performance + Accessibility + SEO sub-scores are all PENDING. With the structural fixes already shipped (lang, main, viewport, meta description, canonical, OG, robots, sitemap), expected gains: **+~16–20 points** (8 Lighthouse Perf, 7 a11y, 4 SEO Lighthouse if those score ≥95).
3. **Search Console verification + first indexing requests** — Anton-only DNS TXT + sitemap submission per `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`. **+3 points** on the SC row + unblocks indexed-page count metric.
4. **Footer privacy + terms + contact alias** — add `/privacy` and `/terms` placeholder routes (link text in footer is enough for the audit row), surface a publishable alias (`concierge@luxurious-mauritius.<tld>` mailto OR `support@…`), and add a one-line "operated by …" ownership statement. **+~5 points** across Trust rows 2/3/6.
5. **Improve TTFB ≤600ms** — current cold/warm both ~705ms. Investigate first-byte dominator (probably Vercel SSR cold-start for the tenant site fetch + Prisma read). Options: ISR cache for `/`, narrower tenant payload, edge cache hint. **+2 points** on the TTFB row.

Closing all 5 alone would lift the score to roughly **78–82/100\*** without any visual redesign.

---

## Verdict (per framework §3)

**Substantive gaps closing toward Operational (40–59 zone, top of band).** Conversion clarity and doctrine alignment are intact. The baseline's near-zero SEO surface is now installed (sitemap, robots, canonical, meta, OG, Twitter card — all `200` and content-validated). Trust gains a branded 404. The remaining gaps are **measurement** (Lighthouse), **discovery** (Search Console verification), and **trust completeness** (privacy/terms/contact alias) — none of which require code re-architecture.

Per §3 conditional rule: Conversion clarity ≥ 10 holds, so the verdict is **not** Conversion-PARTIAL. Buyer-facing usage is fine for warm/direct traffic; the recommendation against paid traffic is downgraded to "acceptable but not optimised".

---

## Doctrine alignment (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` non-negotiables)

- ✅ One primary conversion goal obvious — "Private concierge" / "Private enquiry" repeated and unambiguous.
- ✅ Offer understandable within five seconds — restored content (38,686 bytes of Lux marketing) intact.
- ✅ CTA describes buyer intent — concierge / private enquiry; no "Choose payment path"-style internal-process language.
- ✅ Payment / region / routing complexity comes after buyer intent — concierge form gates pricing.
- ✅ Avoids unsupported revenue / AI-magic claims.
- ✅ Buyer knows the next step — "Private enquiry" repeated under each property card.

**Doctrine verdict: PASS** (preserved through the SEO fix).

---

## Evidence

### Probe outputs (captured 2026-05-25 ~04:30 UTC+4)

| Endpoint | HTTP | Bytes | Notes |
|---|---|---|---|
| `lux/` | 200 | 38,686 | Lux content present; HSTS `max-age=63072000`; no apex fallback |
| `lux/robots.txt` | 200 | ~1,200 | v1 policy with marketing-allow + operator/factory disallow; lists apex + Lux sitemaps |
| `lux/sitemap.xml` | 200 | host-aware XML | `Cache-Control: public, max-age=3600`; `Content-Type: application/xml; charset=utf-8`; lists home + concierge + properties |
| `lux/api/tenant/site` | 200 | full payload | `tenant_id:"luxe-maurice"`, full `i18n` bundle (en/fr/ru), theme, hero, sections, contact |
| `lux/api/ui/context` | 200 | n/a | `tenant_id:"luxe-maurice"`, `tenant_registered:true`, `login_route:"client"` |
| `lux/property/lm-nc-ridge` | 200 | 6,564 | `<html lang="en">` + `<title>` + `description` + `canonical` + `og:type/title/url` + `<main>` |
| `lux/this-route-should-not-exist-9X` | 404 | branded HTML | Lux gold accent, `<html lang>`, `<main>`, `noindex`, `theme-color`, "Back to homepage" link |
| `lux/favicon.ico` | 404 | 0 | Still missing — minor; not in framework's scoring rubric, but operator should add a 32×32 branded favicon. |

### Performance independent measurements

```
ttfb=0.706299 total=0.924064 sz=38686
ttfb=0.704718 total=0.883566 sz=38686
```

Two consecutive cold/warm fetches; both ~705ms TTFB. The 600ms ceiling for the framework's TTFB row is **not met**.

### Operator-required follow-ups (cannot complete from public probes)

- Lighthouse mobile run (Performance / Accessibility / SEO Lighthouse sub-scores).
- Search Console ownership status + indexed page count.
- Keyboard tab traversal verification.
- Color-contrast verification (CTA, body text, link text — WCAG AA).
- B.2 / B.3 / B.6 / B.7 of the per-tenant migration audit (login boundary).

---

## Whether the framework needs adjustment

**v1 is holding up.** Two observations the next framework rev (v1.1) could codify, neither blocking:

1. **PENDING-vs-FAIL distinction in dimensions other than Performance.** Today, when Lighthouse can't run, Performance gets a single conditional `+8` line and the rest of the dimension is marked PENDING. Accessibility and SEO each have a `Lighthouse ≥ 95` row but no equivalent conditional clause — so when Lighthouse is unavailable they default to 0 instead of conditional. Suggested patch: *every* "Lighthouse ≥ X" row gets the same conditional treatment (award the row if other measurable items in the dimension all pass; mark `*`).
2. **Footer-link rows could split "link present" from "linked content non-empty".** Today, "Privacy policy and terms reachable from footer (3 points)" is binary; partial credit (e.g. 1 of 3) for *the word* appearing without a real route is ambiguous. Suggested patch: 1 point for footer mention, 1 for `/privacy` reachable as a route, 1 for `/terms` reachable as a route.

Both are small refinements; this audit was scored under the v1 rules verbatim, with the conservative interpretation that PENDING items are 0/measurable until measured.

---

## Files referenced

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — scoring rubric (v1).
- `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md` — baseline (44/100\*).
- `artifacts/migration-audits/2026-05-24-luxe-maurice/migration-audit.md` — Lux migration audit (Section C cross-reference).
- `pages/_app.js`, `pages/_document.js`, `pages/404.js`, `pages/sitemap.xml.js`, `public/robots.txt` (PR #222).
- `components/LuxeMauriceTenantPresentation.js`, `components/LuxeMauricePropertyDetailPage.js` (PR #222 Head extension).
- `docs/operations/POSTGRES_PROVIDER.md` (incident closure context).
