# Analytics, Search Console, and indexing checklist (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton, Cursor agents, contractors
**Companion docs:** `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`, `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`, `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`

---

## 1. Purpose

Make sure every public CorpFlow surface (CorpFlow's own marketing pages and each client tenant marketing site) is **measurable** and **discoverable**. Specifically:

- **Analytics installed and verified.** We can see real visitor traffic and basic conversion signals.
- **Search Console verified.** Google can tell us about indexing, errors, and queries.
- **Indexing actively requested.** We do not wait for Google to discover us.

This checklist describes the **operator steps** and the **evidence shape** for each. It does **not** describe how to build a marketing page (that lives in `docs/marketing/`).

---

## 2. Surfaces in scope

| Surface | Hostname | Owner | Notes |
|---------|----------|-------|-------|
| CorpFlow apex marketing | `https://corpflowai.com/` | Anton (CorpFlow) | The flagship. |
| CorpFlow core (factory) | `https://core.corpflowai.com/` | Anton — **not** a marketing surface; do **not** index. | Should have `noindex` (verify §6.4). |
| Lux marketing | `https://lux.corpflowai.com/` | Anton + Lux client | Tenant marketing surface. |
| Future client tenants | `https://<tenant>.corpflowai.com/` | per tenant | Apply this checklist before announcing the URL. |

**Internal surfaces** (`/change`, factory APIs, login) are **never** indexed and should never be in a sitemap.

---

## 3. Analytics

### 3.1 Recommended stack (v1)

- **Privacy-first analytics** as the default — Plausible, Fathom, or self-hosted Umami. Lower compliance overhead than GA4; sufficient for traffic + conversion counts.
- **Google Analytics 4** as a **conditional** add-on when the client requires it (e.g. they already run GA on other properties or marketing demands GA reporting). Adds GDPR/cookie-consent surface area.
- **Search Console** is **independent** of analytics; install it regardless.

### 3.2 Operator checklist per surface

- [ ] **Tool chosen.** Decision recorded in `docs/decisions/JOURNAL.md` with reversibility note (analytics swaps are reversible by removing the script tag and starting a new property).
- [ ] **Property created** in the analytics tool (named after the host).
- [ ] **Snippet placed** on every public page. For Next.js pages (this repo): place it once via `pages/_app.js` or via a layout component, not per-page.
- [ ] **Domain verified** (analytics tool requires DNS TXT or a meta tag; record which method was used).
- [ ] **Live event observed.** The operator visits the site, opens analytics dashboard, sees the visit. Do **not** consider analytics installed without a visible event.
- [ ] **Privacy disclosure updated** in the site's privacy policy or footer if the tool requires it (most privacy-first tools claim "no consent banner needed"; verify per jurisdiction).

### 3.3 Conversion events

For client marketing sites (e.g. Lux), record these as analytics events when the corresponding UI fires:

- `cta_primary_click` — primary CTA on root and key pages.
- `lead_form_submit` — concierge / contact form submission.
- `change_request_open` — `/change` opened from marketing (where applicable).
- `property_detail_view` — property listing detail (Lux-specific; do not adapt blindly to other clients).

Names are deliberately generic; the analytics dashboard groups by surface.

---

## 4. Google Search Console

### 4.1 Operator checklist per surface

- [ ] **Property added** to Search Console for the **canonical** host (not the apex if the canonical is a subdomain — match `<link rel="canonical">`).
- [ ] **Verified ownership** via the recommended method (DNS TXT preferred; a one-time HTML file or meta tag also works). Record which method.
- [ ] **Sitemap submitted.** Sitemap URL present in Search Console; status `Success`.
- [ ] **Coverage report read** at least once. Note any **Excluded** pages and confirm they are intentionally excluded.
- [ ] **No manual actions** present. If there are, file a CMP ticket and stop indexing work until resolved.

### 4.2 What to record (evidence shape)

For each surface in scope, the operator records:

```text
- Surface: <hostname>
- Search Console verified: YES (method: DNS TXT | meta tag | HTML file)
- Sitemap submitted: YES (<sitemap URL>)
- Last sitemap status: <Success | Couldn't fetch | …>
- Coverage summary: <N indexed, N excluded, N error>
- Manual actions: NONE | <type, date>
- Last reviewed: <YYYY-MM-DD>
```

This block lives in the per-surface migration audit row (see `CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`).

---

## 5. Indexing requests

### 5.1 Why we ask

Google will eventually discover a public page from links + sitemap. Asking explicitly **shortens** time-to-first-impression. For a new client launch, this is the difference between "indexed before the demo" and "indexed two weeks later".

### 5.2 Operator checklist (after Search Console verified)

- [ ] **`sitemap.xml` is current.** Lists every public page. Excludes internal surfaces. File served at `/sitemap.xml` with `Content-Type: application/xml`.
- [ ] **`robots.txt` is sane.** Allows crawl on production hostnames. Disallows internal routes (`/change`, `/api/`, `/login`, `/admin*`). Lists the sitemap URL on the last line.
- [ ] **URL Inspection used** for the top 5–10 priority URLs in Search Console. Click "Request indexing" once per URL. (Hard-rate-limited; do not spam.)
- [ ] **Re-check in 48 hours.** URL Inspection reports `URL is on Google` for the priority URLs.

### 5.3 Anti-pattern: the "factory" surface

`https://core.corpflowai.com/` should **never** be in a sitemap and **should** include a `noindex` meta tag (or equivalent header) on its public HTML responses. The same applies to `/change` shells when served anonymously. Verify this before submitting any sitemap that could include them.

---

## 6. Required HTML / header checks (per public page)

### 6.1 Title and description

- `<title>` is unique per page, ≤ 60 chars, on-message.
- `<meta name="description">` is unique per page, ≤ 160 chars, on-message.

### 6.2 Canonical

- `<link rel="canonical" href="<absolute URL>">` present on every page.
- Canonical points to the host that should appear in search results (typically the marketing host, e.g. `lux.corpflowai.com`, not the apex unless apex is canonical).

### 6.3 Open Graph + Twitter

- `og:title`, `og:description`, `og:image`, `og:url`, `og:type` present.
- `twitter:card` present (`summary_large_image` recommended).

### 6.4 Robots / noindex on private surfaces

- `core.corpflowai.com` and `/change`, `/login`, `/admin*` paths return either:
  - `<meta name="robots" content="noindex,nofollow">`, or
  - HTTP `X-Robots-Tag: noindex,nofollow` header.

### 6.5 Structured data (optional, but recommended for client sites)

- `Organization` schema on the homepage.
- `LocalBusiness` schema for client tenants whose business is location-based (Lux is a candidate).
- Validate via Google Rich Results Test before adding.

---

## 7. How an autonomous packet runs this

A packet that "wires analytics + Search Console + indexing for tenant `<X>`" is **not** docs-only — it touches a live tenant surface. Therefore:

- **Allowed without further approval:** drafting the packet, drafting the site changes in a Preview deploy, capturing evidence (Lighthouse output, head-tag screenshots, sitemap.xml content).
- **Requires Anton approval:** merging to `main` (production deploy gate per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.1), Search Console DNS TXT record (DNS gate §3.3), wiring any analytics that involves a third-party cookie or PII handling clause (§3.7 / §3.9).

The agent prepares **everything** up to the gate: PR open, Preview verified, sitemap content drafted, Search Console verification value generated (saved as a one-line value, **not** committed to repo if it is a TXT secret) — and then stops.

---

## 8. Evidence shape (per packet)

```text
Analytics + Search Console packet — <tenant> — <YYYY-MM-DD>
- Analytics tool: <Plausible | Fathom | Umami | GA4 | none>
- Property created: YES/NO
- Snippet placed via: <pages/_app.js | layout component | …>
- Live event observed: YES (<timestamp>) | NO
- Search Console verification method: <DNS TXT | HTML file | meta tag>
- Sitemap URL: <…>
- Sitemap status: <Success | error>
- robots.txt verified: YES/NO
- Top URLs requested for indexing: [<url>, …]
- noindex on private surfaces verified: YES/NO
- Deployment ID at evidence time: <…>
- Live URLs tested: [<url>: <status>, …]
```

This block goes in the PR description and in `artifacts/analytics-audits/<YYYY-MM-DD>-<tenant>/`.

---

## 9. Cross-references

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` § *SEO / discoverability* — the scored items this checklist supports.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — analytics events should align with the buyer-intent CTAs the doctrine prescribes.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — host / apex / login boundaries; needed when picking the canonical host.
- `docs/decisions/JOURNAL.md` — record the analytics tool decision per surface.
