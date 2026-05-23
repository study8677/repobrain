# Website quality measurement framework (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton, Cursor agents, contractors, future client-facing reviewers
**Companion docs:** `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`, `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`, `.cursor/rules/delivery-reality.mdc`, `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`
**Cross-refs:** `docs/marketing/CORPFLOW_CONTENT_MODEL.md`, `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`

---

## 1. Why this framework exists

CorpFlow ships websites for clients (and our own marketing surfaces). "Looks good" is not measurable. "Fast site" is not measurable either. This framework defines a **scored** quality measurement so:

- Anton can compare two clients (or two versions of the same client) on the same axes.
- Cursor agents can audit a site **without making a subjective judgment**.
- A future packet can say "improve site quality from 72/100 to 85/100" with a clear set of fixable items.
- A client can see a quality report that does not depend on the reviewer's mood.

The framework is **deliberately not exhaustive.** v1 covers the dimensions that drive **buyer decisions** and **search visibility**. Aesthetic refinement is a downstream concern.

---

## 2. The five dimensions (each scored 0–20, total 0–100)

### 2.1 Conversion clarity (0–20) — does the buyer know what to do?

Source of truth: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`.

| Item | Points |
|------|--------|
| Single primary CTA visible above the fold on every key page | 5 |
| Primary CTA describes **buyer intent**, not internal process (e.g. "Book a free walkthrough", not "Choose payment path") | 5 |
| Offer is understandable within five seconds of landing | 4 |
| Trust path explicit (logos / proof / pricing or pricing-anchor stated) | 3 |
| Payment / region / routing complexity appears **after** buyer intent | 3 |

### 2.2 Performance (0–20) — does the page load fast on a real connection?

Source of truth: Lighthouse / PageSpeed Insights, measured on **mobile**, **3G** or **slow 4G** profile (whichever the audit tool defaults to today).

| Item | Points |
|------|--------|
| Lighthouse Performance ≥ 90 (mobile) | 8 |
| Largest Contentful Paint (LCP) ≤ 2.5s on mobile | 4 |
| Cumulative Layout Shift (CLS) ≤ 0.1 | 4 |
| Total Blocking Time (TBT) ≤ 200ms | 2 |
| First-byte time (TTFB) ≤ 600ms (proxy: simple `curl -w` against root URL) | 2 |

If the audit cannot run Lighthouse (offline review, no Chrome), the four CWV-style sub-scores are skipped and **8 points** are awarded conditionally with a "pending" tag; an asterisk (\*) goes on the total.

### 2.3 Accessibility (0–20) — can a screen reader / keyboard / colorblind user navigate?

Source of truth: Lighthouse Accessibility + manual checks of the keyboard tab order on key pages.

| Item | Points |
|------|--------|
| Lighthouse Accessibility ≥ 95 | 7 |
| All interactive elements reachable via keyboard `Tab` (verified on 3 key pages) | 4 |
| All images have meaningful `alt` text or empty `alt=""` for decorative | 3 |
| Color contrast on primary CTA, body text, and link text passes WCAG AA | 3 |
| Page has a sensible heading order (one `<h1>`, no skipped levels) | 3 |

### 2.4 SEO / discoverability (0–20) — can search engines find and serve the page?

Source of truth: Lighthouse SEO + Google Search Console + the `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` deliverables.

| Item | Points |
|------|--------|
| Lighthouse SEO ≥ 95 | 4 |
| `<title>` and `<meta name="description">` present, unique, and on-message on all top-level public routes | 4 |
| Canonical URL set (`<link rel="canonical">`) | 2 |
| Open Graph + Twitter card present with image, title, description | 3 |
| `sitemap.xml` reachable, lists current public pages | 2 |
| `robots.txt` present and not blocking production routes by accident | 2 |
| Domain is verified in Google Search Console; at least one URL submitted for indexing | 3 |

### 2.5 Trust + governance (0–20) — does the site look operated by a real business?

Source of truth: marketing doctrine + repo conventions.

| Item | Points |
|------|--------|
| HTTPS with valid TLS cert; no mixed-content warnings | 4 |
| Privacy policy and terms reachable from footer | 3 |
| Contact / support email reaches an alias controlled by the business (`support@…`, `info@…`) | 3 |
| 404 / 500 pages are branded (not raw Vercel error) | 3 |
| No dead internal links on top-level pages (sample of N=20) | 3 |
| Clear ownership statement (who runs the site, where they are based) | 2 |
| No unsupported revenue or AI-magic claims (per doctrine) | 2 |

---

## 3. Score interpretation

| Total | Verdict | Allowed CTA in client report |
|-------|---------|------------------------------|
| 90–100 | **Production-grade.** | "Site is ready to drive traffic. Optional refinements listed." |
| 75–89 | **Operational.** | "Site is usable for clients today; X high-impact fixes recommended." |
| 60–74 | **Needs work before traffic.** | "Do not run paid traffic yet. Y items must close first." |
| 40–59 | **Substantive gaps.** | "Treat as draft. Conversion or performance is not yet acceptable." |
| 0–39 | **Pre-launch.** | "Not yet client-facing. Use private preview only." |

A site can be `Operational` overall but **fail Conversion clarity at 0–9**. In that case the verdict is **PARTIAL** for buyer-facing usage regardless of the totals — per `BRAND_AND_CONVERSION_DOCTRINE.md`, conversion is non-negotiable.

---

## 4. How to run a quality audit (read-only)

A quality audit is a **read-only** action under `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2. Cursor may run one against any production tenant URL without further approval. Steps:

1. **Identify the surface.** Single tenant root (e.g. `https://lux.corpflowai.com/`), or a list of pages (root + the top three CTAs' destinations).
2. **Run automated checks** (any of: Lighthouse local, PageSpeed Insights API, Chrome DevTools MCP, manual `curl` for headers).
3. **Run manual checks** for the items automation does not cover (CTA wording, doctrine alignment, offer clarity in five seconds).
4. **Score against §2.** Use the table verbatim; do not invent new items.
5. **Write the report** to `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>/quality-score.md` using the report template in §5.
6. **Do not** mutate the site, change tenant content, or open a fix PR in the same packet — that is a separate fix packet with its own approval.

---

## 5. Report template (use verbatim)

```markdown
# Quality audit — <tenant_id> — <YYYY-MM-DD>

**Surface:** <list of URLs reviewed>
**Auditor:** <human or agent name>
**Mode:** read-only

## Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Conversion clarity | x/20 | … |
| Performance | x/20 | LCP=…, CLS=…, TBT=… |
| Accessibility | x/20 | … |
| SEO / discoverability | x/20 | … |
| Trust + governance | x/20 | … |
| **Total** | **x/100** | |

## Verdict (per framework §3)

<verdict label> — <one-sentence rationale>

## Top 5 recommended fixes

1. <fix> (gains ~N points)
2. …

## Doctrine alignment

- <PASS / FAIL on each non-negotiable from BRAND_AND_CONVERSION_DOCTRINE>

## Evidence

- Lighthouse JSON / screenshots: <links into artifacts/>
- Manual notes: <…>
- Deployment ID + commit at audit time: <if obtainable>
```

---

## 6. What this framework is **not**

- **Not a designer's tool.** It does not score visual taste; that is a separate creative review.
- **Not a substitute for client conversation.** A score of 92/100 does not mean the offer is right for that client's market.
- **Not a one-and-done.** Sites drift. Re-run quarterly or after any major content change.
- **Not for tenant-private surfaces.** Internal pages (`/change`, factory routes) do not get a public quality score.

---

## 7. Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — the conversion non-negotiables (binding).
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — the production-grade bar this score complements.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — the SEO discoverability items at the operator level.
- `docs/marketing/CORPFLOW_CONTENT_MODEL.md` — content tone conventions.
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` — image / asset rules.
