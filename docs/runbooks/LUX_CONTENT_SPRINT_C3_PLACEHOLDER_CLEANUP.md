# LuxeMaurice Content Sprint — C3 placeholder cleanup operator runbook

**Sprint workstream:** C3 — Demo / preview opportunities hidden from public.
**Sprint ticket (child):** `cmqa57vlg0002xf805d7azdk2` (Property & media bucket).
**Sprint parent:** `cmqa2y2ga0000l704glnfro1f`.
**Strategy doc:** `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 3 C3.
**Audience:** Operator (Anton) — Cursor / agent may pre-stage but cannot execute the slug-visibility changes without explicit Anton authorization (touches live tenant production surface, per `.cursor/rules/security-sensitive-changes.mdc` § *Path triggers*).
**Status:** **awaiting operator decision per slug** (operator picks (a) / (b) / (c) for each of the 8 slugs below, then executes per § 3 of this doc).

---

## 1. Why this exists

The published Postgres catalogue is empty (`/properties` correctly renders the premium empty state "Private opportunities are being prepared"). However, **eight individual `/property/<slug>` URLs** are still indexed in `https://lux.corpflowai.com/sitemap.xml` and each one serves a `200 OK` skeleton page with **zero `<img>` tags** and the default monogram as the page title. Anyone landing on one of them from Google sees an empty placeholder where they were promised a private opportunity memorandum — that's the exact "broken-content first impression" the brand doctrine forbids ("Confidence at distance", "Invited. Not advertised. Curated access").

The 5 `lm-*` slugs were captured in the 2026-06-11 audit (`docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 3 C3 original list). The 3 `lxf-*` slugs are **new findings from the 2026-06-12 live audit** (run as part of PR #352 verification) and were not in the original audit — they're likely residue from earlier LuxFrance / LuxeFrance staging work that was never retired during the LuxeMaurice repositioning.

**This is not a bug introduced by recent PRs.** PR #352 (UI cleanup) and PR #353 (P3009 docs) did not change visibility logic, sitemap generation, or `/property/[slug]` rendering. The placeholders have been there throughout. The 2026-06-12 audit is the first time anyone systematically probed all sitemap entries with `imgs` and `title` checks.

---

## 2. Current placeholder set (re-probe before acting)

Live state as of 2026-06-12T08:50:00Z (re-run § 4 to refresh before acting):

| # | Slug | Era | Sitemap | Live page | Recommendation default |
|---|---|---|---|---|---|
| 1 | `lm-villa-belombre` | LuxeMaurice staged | yes | 200, 0 imgs | (a) gate behind `?preview=1` |
| 2 | `lm-pent-plateau` | LuxeMaurice staged | yes | 200, 0 imgs | (a) gate behind `?preview=1` |
| 3 | `lm-nc-ridge` | LuxeMaurice staged | yes | 200, 0 imgs | (a) gate behind `?preview=1` |
| 4 | `lm-pipeline-q4` | LuxeMaurice staged | yes | 200, 0 imgs | (a) gate behind `?preview=1` |
| 5 | `lm-phase2d-manual-demo` | LuxeMaurice demo (PR #347) | re-probe | already `demo: true` in `lib/client/luxe-maurice-staged-properties.js` | confirm gated; should already be hidden |
| 6 | `lxf-grand-baie-apt` | **LuxFrance residue (new finding)** | yes | 200, 0 imgs | (a) gate behind `?preview=1`, then retire the namespace |
| 7 | `lxf-tamarin-villa` | **LuxFrance residue (new finding)** | yes | 200, 0 imgs | (a) gate behind `?preview=1`, then retire the namespace |
| 8 | `lxf-poste-lafayette` | **LuxFrance residue (new finding)** | yes | 200, 0 imgs | (a) gate behind `?preview=1`, then retire the namespace |

"Era" tells you where the slug came from. "Recommendation default" is what Cursor would do absent operator preference — operator may override per slug.

---

## 3. Per-slug decision matrix — operator picks (a), (b), or (c)

For each of the 8 slugs above, Anton chooses one option. The agent CANNOT make this choice — visibility on a tenant production surface is operator-authorized only.

### Option (a) — gate behind `?preview=1` (default recommendation for most slugs)

**Outcome:** anonymous traffic gets a 404; an authenticated operator with `?preview=1` still sees the page (useful for content drafting). The slug stays in the DB for audit; it just stops leaking publicly.

**Where to implement:** the `/property/[slug]` rendering path in `pages/property/[slug].js` should already respect `published_at IS NOT NULL` (verify by re-reading the file). If the placeholder slugs are getting through because they are *staged but unpublished*, the fix is to mark them `visibility_status='preview'` (or equivalent) so the public render returns 404. Anton's choice between "leave the row, change the visibility flag" vs. "leave the row, just drop from sitemap" is captured below.

**Operator action (after Anton picks (a) for a given slug):**

```bash
# 1. Confirm the slug exists in lux_listings and check its current visibility / published_at.
#    Read-only verification; agent CAN run this without further approval.
psql "$POSTGRES_URL" -c "SELECT slug, visibility_status, published_at, listing_status FROM lux_listings WHERE slug='<slug>';"

# 2. If visibility_status is already 'preview' / 'draft' / similar non-public and published_at is null,
#    the slug is shipping due to a sitemap generator bug, NOT due to public listing logic.
#    Skip to § 3.x sitemap regeneration.

# 3. If visibility_status is something that the public path treats as visible (or published_at is set),
#    flip it to preview-only. ANTON-ONLY:
psql "$POSTGRES_URL" -c "UPDATE lux_listings SET visibility_status='preview', published_at=NULL WHERE slug='<slug>';"

# 4. Re-probe public + preview surfaces to verify.
#    Public should now be 404; operator with ?preview=1 may still render.
curl -I "https://lux.corpflowai.com/property/<slug>"          # expect 404
curl -I "https://lux.corpflowai.com/property/<slug>?preview=1" # depending on the preview gate, 200 with session
```

### Option (b) — replace with a real published listing from C2 and retire the slug

**Outcome:** the placeholder slug is freed (or aliased) so the new C2 opportunity can take an editorially chosen slug (e.g. `lm-` + something Jan approves). The old slug 404s for new traffic; if the SEO juice on the old slug is non-zero, configure a 301 to the new one.

**Use when:** the C2 opportunity title naturally maps to one of the placeholder slugs (e.g. a real Belombré villa goes live and `lm-villa-belombre` is the obvious slug).

**Operator action (after Anton picks (b) for a given slug):**

```bash
# 1. Anton + Jan confirm the new opportunity's slug. If it differs from the placeholder, decide whether
#    to 301 the placeholder URL to the new one (SEO continuity) or 404 (clean break).
# 2. Insert the real C2 row first per docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md § 3 C2.
# 3. Then either:
#    - Delete the placeholder row (ONLY if zero attachments + zero CMP audit trail) - rare.
#    - OR flip visibility_status='preview' (same as option (a)) and add a 301 in lib/server/router-…
#      pointing /property/<old> -> /property/<new>. That's a follow-up code change, separate PR.
```

### Option (c) — leave publicly visible only if labelled explicitly as illustrative reference

**Outcome:** the page stays at 200, but it grows a clear "Illustrative reference — not a current private opportunity" banner so a HNW visitor immediately understands the page is editorial context, not real inventory.

**Use when:** the placeholder is genuinely useful as an editorial reference (e.g. an architecture style explainer) and Jan wants to keep it as a brand storytelling surface rather than retire it.

**Operator action (after Anton picks (c) for a given slug):**

```bash
# 1. Code-side: add an `illustrative=true` field on the listing row (or `console_json.lux_request_meta.illustrative=true`),
#    and render a banner in pages/property/[slug].js when set. That is a separate code PR, not a one-shot.
# 2. Until the banner ships, the slug should stay gated under option (a) so it doesn't leak unlabelled.
```

---

## 4. Re-probe the live state before any change

Always re-run this snippet first (read-only, safe to run from any environment):

```powershell
$ProgressPreference = 'SilentlyContinue'
$slugs = @('lm-villa-belombre','lm-pent-plateau','lm-nc-ridge','lm-pipeline-q4','lm-phase2d-manual-demo','lxf-grand-baie-apt','lxf-tamarin-villa','lxf-poste-lafayette')
foreach ($s in $slugs) {
  $u = "https://lux.corpflowai.com/property/$s"
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -ErrorAction Stop
    $title = if ($r.Content -match '<title>([^<]+)</title>') { $matches[1] } else { '(no title)' }
    $img = ([regex]::Matches($r.Content, '<img[^>]*src=')).Count
    "{0,3}  size={1,-6}  imgs={2,-2}  {3,-22}  {4}" -f $r.StatusCode, $r.Content.Length, $img, $s, $title
  } catch {
    $sc = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
    "{0,3}  ERR                                       {1}" -f $sc, $s
  }
}
```

Then re-fetch the sitemap and confirm the slug set:

```powershell
$s = Invoke-WebRequest 'https://lux.corpflowai.com/sitemap.xml' -UseBasicParsing
[regex]::Matches($s.Content, '<loc>(https?://[^<]+)</loc>') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match '/property/' }
```

Re-probe expected outcome **after** the chosen options land:

- All 8 slug pages should return `404` (option (a)) or be replaced by a real C2 row (option (b)) or render with the illustrative banner (option (c)).
- `/sitemap.xml` should no longer include any `lm-*` or `lxf-*` slug that is in option (a) state.
- `/properties` should still render the premium empty state until C2 ships the first real opportunity.

---

## 5. Sitemap regeneration

`pages/sitemap.xml.js` builds the sitemap at request time (or on revalidate, depending on Next.js settings). After option (a) flips a slug's `visibility_status` away from public, the next sitemap request should drop it automatically. If a slug persists in the sitemap after a visibility change, the bug is in the sitemap generator — surface that as a separate code finding (do NOT hand-edit the sitemap; it regenerates).

To force an immediate regeneration without a deploy, hit any path that triggers Next.js ISR revalidation of the sitemap route, or trigger a no-op redeploy:

```bash
# Quick check that the sitemap is fresh after a visibility change:
curl -sS https://lux.corpflowai.com/sitemap.xml | grep '/property/' | sort
```

---

## 6. What is explicitly out of scope for C3

- Deleting `lux_listings` rows (even after option (a)) — audit history stays.
- Deleting `_prisma_migrations` rows (covered separately by `docs/operations/POSTGRES_PROVIDER.md` § 5c).
- Deleting CMP tickets or attachments — `archive` is the only operator action; `delete` is out of scope (see PR #352 attachment-panel "Technical details" disclosure).
- Touching the master programme ticket `cmo8mjijk0000jl04l1jz0v6d`.
- Changing tenant boundaries, auth, session, or media governance.
- Code changes — this runbook describes operator actions and data-flag flips only. Any new behaviour (illustrative banner, 301 redirects, sitemap generator fix) is a separate PR.

---

## 7. Delivery Reality Audit (after the option choices land)

Use the standard `.cursor/rules/delivery-reality.mdc` block:

```text
Delivery Reality Audit (C3 placeholder cleanup):
- Local fix exists: N/A (operational decisions, no code)
- Per-slug decisions recorded: 8 / 8 (list each: a / b / c)
- Production data state updated: YES/NO
- Production deployment ID: N/A (data-only) OR <dpl_…> if code changes shipped alongside
- Commit deployed: N/A (data-only) OR <sha>
- Live URLs tested: https://lux.corpflowai.com/property/<slug> (each), https://lux.corpflowai.com/sitemap.xml, https://lux.corpflowai.com/properties
- Expected vs actual result: each chosen option produced the expected state (404 / banner / replaced)
- Client-facing flow usable: YES (premium empty state or first real C2 opportunity, no skeleton URLs)
- Final verdict: COMPLETE / PARTIAL / FAILED
```

Record the audit in:

- `artifacts/chat_history.md` (operator-facing chronicle).
- The C3 sprint child ticket `cmqa57vlg0002xf805d7azdk2` (via `/change` if a CMP write path exists; otherwise as a follow-up message).
- Update this runbook's § 2 table with the final state per slug (for the next agent who walks in cold).

---

## 8. Canonical executed path (post-2026-06-12) — single-constant sitemap edit

After PR #354 merged, the 2026-06-12 code-path audit found that **all 8 placeholder slugs are static JavaScript constants, not Postgres rows**:

- The 5 `lm-*` slugs live in `lib/client/luxe-maurice-staged-properties.js` (the `lm-phase2d-manual-demo` one is already correctly stripped from public surfaces via `getPublicLuxStagedProperties()` / `demo: true`).
- The 3 `lxf-*` slugs live in `lib/client/luxe-maurice-feed-properties.js` (the module header explicitly says they are "no longer rendered on public surfaces" and only kept so old bookmarks resolve).
- `/properties` (the listing page) already correctly excludes all of them — it queries published `lux_listings` rows from Postgres, which is empty, so it renders the premium empty state.
- `/property/<slug>` (the detail page) routes via `resolveLuxPropertyRef`, which resolves both staged and feed entries — that's the backward-compatibility behaviour for bookmarks.
- **The discoverability leak is entirely one place: the hard-coded `LUX_PROPERTY_REFS` array in `pages/sitemap.xml.js`.** That array is what Google sees on `https://lux.corpflowai.com/sitemap.xml`.

### Recommended single-PR fix

Set `LUX_PROPERTY_REFS = []` in `pages/sitemap.xml.js` (with a header comment documenting the rationale). That single edit:

- Drops all 7 placeholder URLs from the Lux sitemap on the next Production deploy (the 8th, `lm-phase2d-manual-demo`, has never been in the sitemap).
- Does **not** delete any data, code, or audit history.
- Does **not** touch `pages/property/[slug].js`, the resolver, or the editorial render shell — bookmarks still resolve as before (per the explicit "backward compatibility" intent in `lib/client/luxe-maurice-feed-properties.js`).
- Does **not** change tenant boundaries, auth, sessions, or media governance.
- Tests pass without modification — `node-tests/sitemap-host-aware.test.mjs` asserts on `LUX_PROPERTY_REFS.length` only (the array adapts) and the per-host expected behaviour is unchanged.
- Maps cleanly to **option (a)** from § 3 above for all 7 slugs at once, with the additional simplification that no per-slug DB write or visibility flag flip is needed.

### Why this is preferred over the § 3 options as originally written

The § 3 per-slug matrix was written before the 2026-06-12 code-path audit. That matrix assumed the slugs were DB-backed (`lux_listings` rows) and described per-slug `UPDATE lux_listings SET visibility_status='preview'` writes. With the code-path audit, we now know that's not where they live — they're JS constants. So:

- The § 3 option (a) per-slug DB writes are **not required** — the single constant edit achieves the same public-discoverability outcome with zero DB touches.
- The § 3 option (b) "replace with a real published listing from C2" remains valid: when Jan's first real opportunity goes live, its slug is appended back to `LUX_PROPERTY_REFS` so the new opportunity is discoverable on Google. That is a follow-on edit to the same array — no schema, no migration, no new mechanism.
- The § 3 option (c) "label explicitly as illustrative" remains a future option, but it's a separate UX decision (banner copy + design) and is not required to ship C3.

### Out of scope for the canonical fix

- Adding a `noindex` meta to `pages/property/[slug].js` for placeholder slugs (would add a new conditional branch — violates the "do not expand workflow complexity" constraint).
- Returning 404 from `/property/<placeholder-slug>` for anonymous traffic (same reason; also breaks the explicit backward-compatibility intent in `lib/client/luxe-maurice-feed-properties.js`).
- Deleting `LUXE_MAURICE_STAGED_PROPERTIES` or `LUXE_MAURICE_FEED_PROPERTIES` entries (deletes audit / historical context for no operational benefit; the resolver path needs them).

### Backward-compatibility trade-off recorded

After the canonical fix is merged + deployed:

- **Google / search engines:** stop seeing the 7 placeholder URLs in the sitemap, gradually drop them from the index over their normal recrawl cycle.
- **Direct visitors with bookmarks:** still see the existing editorial shell on `/property/<placeholder-slug>` (200 OK, no images, monogram title — same as today). This is the explicit "no 404 for old bookmarks" intent baked into the feed-properties module.
- **The 5 `lm-*` slugs:** still navigable directly as before; only the public discoverability surface is closed.

If we later decide to also 404 anonymous traffic on placeholder slugs, that is a separate PR and an explicit UX decision — out of scope for the canonical C3 fix.

---

## 9. Related

- `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 3 C3 — sprint strategy + updated audit.
- `docs/runbooks/LUX_CHANGE_USABILITY_FIXES_2026_06_12.md` — PR #347-#352 chain that landed the readable attachment panel feeding C2.
- `lib/client/luxe-maurice-staged-properties.js` — the staged-properties source where `demo: true` already hides `lm-phase2d-manual-demo`; same pattern can be extended to the other 7 if the chosen option is (a) and the team prefers a code-gate over a data-flag flip.
- `pages/property/[slug].js` — public render path that must respect `visibility_status` / `published_at`.
- `pages/sitemap.xml.js` — sitemap generator; must filter out preview / draft listings.
- `.cursor/rules/security-sensitive-changes.mdc` — gates any production-data write.
- `.cursor/rules/predeploy-decision-checks.mdc` — pre-deploy / pre-data-change checklist.
- `.cursor/rules/delivery-reality.mdc` — audit format used above.
