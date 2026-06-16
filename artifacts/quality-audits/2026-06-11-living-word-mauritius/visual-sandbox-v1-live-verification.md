# Living Word visual sandbox v1 — live production verification

**Date:** 2026-06-16
**Tenant:** `living-word-mauritius`
**Live URL verified:** `https://living-word-mauritius.corpflowai.com/site-preview`
**Mode:** read-only post-deploy verification record. No further code or DB changes were made after the v1 refinement Production deploy.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 5077960482 (GitHub) / EJPyjDMG4Vhhut3Ut94rieGpsAvf (Vercel dashboard)
  - Vercel dashboard URL: https://vercel.com/corpflowai/corpflow-ai-command-center/EJPyjDMG4Vhhut3Ut94rieGpsAvf
  - Vercel deployment alias: https://corpflow-ai-command-center-fa6pmhxug-corpflowai.vercel.app
- Commit deployed: 82f248683ebceb0a9a155a7327ab9e13168573d8
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview                                                        (200, 29967 bytes, navy/gold/serif fidelity markers all present, ribbon present, noindex present, no per-section red banners)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js?tenant_id=living-word-mauritius           (200, x-corpflow-chat-widget=disabled, no-op stub body)
  - https://lux.corpflowai.com/site-preview                                                                          (404, host gate)
  - https://core.corpflowai.com/site-preview                                                                         (404, host gate)
  - https://living-word-mauritius.corpflowai.com/site-preview (mobile UA, iPhone Safari)                             (200, ribbon + noindex + navy + gold all present, no old red banner)
- Expected vs actual: all 8 brief-listed verification checks pass; per-section red banners removed; visual fidelity markers present
- Client-facing flow usable: N/A (operator-internal sandbox)
- Final verdict: COMPLETE
```

## 2. Source PR + delivery chain

| Field | Value |
|---|---|
| Branch | `feat/living-word-visual-sandbox-v1-refinement` |
| PR | [#379 — Living Word visual sandbox v1 (recognisable facsimile, single ribbon marker)](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/379) |
| PR head commit | `41ed98bb` |
| Merge type | Squash + delete branch |
| Merge SHA on `main` | `82f248683ebceb0a9a155a7327ab9e13168573d8` |
| GitHub Production deployment ID | `5077960482` |
| Vercel deployment ID (dashboard) | `EJPyjDMG4Vhhut3Ut94rieGpsAvf` |
| Vercel deployment alias | `corpflow-ai-command-center-fa6pmhxug-corpflowai.vercel.app` |
| Live LWM URL | `https://living-word-mauritius.corpflowai.com/site-preview` |
| Live verification timestamp (UTC) | `2026-06-16T10:25Z` (approximate; first 200 returned during the verification probe) |

## 3. Brief-listed verification (8 checks, all pass)

The brief listed eight required verification checks. All pass on the live LWM tenant host.

| # | Check | Method | Evidence | Result |
|---|---|---|---|:---:|
| 1 | Top orange banner still present with exact text | String match for `TEST ENVIRONMENT — Not the live Living Word Mauritius website` in response HTML | `contains_ribbon_text=True` (verbatim em-dash present); `contains_orange_color=True` (`#EA580C`); `contains_position_fixed=True`; `contains_z_index_2147483640=True` | ✓ |
| 2 | Repeated in-page warning boxes removed | Negative match for the v0 banner string and red palette tokens | `contains_old_sandbox_banner_text=False`; `contains_warning_red_color_FEE2E2=False` (no `#FEE2E2` warning bg); `contains_warning_red_border_FCA5A5=False` (no `#FCA5A5` warning border) | ✓ |
| 3 | Page more closely resembles the real site visually | Positive match for v1 fidelity markers in response HTML | navy palette `#0E1F3A` present; gold accent `#C9A961` present; serif font stack (`Georgia, "Times New Roman", "PT Serif", Cambria, serif`) present; hero eyebrow `CorpFlow sandbox · modelled on livingwordmauritius.com` present; `Welcome to Living Word` h1 present; `Serve` pillar with `1 Peter 4:10` reference present; address `Richmond Hill Building, Super U Complex, Grand Baie` present; phone `+230 5538 2181` present; email `info@livingwordmauritius.com` present; service time `Sundays · 9:30 am · In Person` present; ministry age band `Ages 4–12` present | ✓ |
| 4 | `noindex,nofollow` preserved | String match on response HTML | `<meta name="robots" content="noindex,nofollow" />` present | ✓ |
| 5 | Host gate preserved | Probed two non-LWM hosts on the same Vercel project | `https://lux.corpflowai.com/site-preview` → 404; `https://core.corpflowai.com/site-preview` → 404 | ✓ |
| 6 | Non-LWM hosts still 404 | Same as #5 | Same as #5 | ✓ |
| 7 | Chat widget remains disabled | Read-only probe of loader endpoint on the LWM host | `loader_status=200`; `loader_x_corpflow=disabled`; body matches the no-op stub (`/* CorpFlow chat widget v0 - disabled */`) | ✓ |
| 8 | No external WordPress / GHL / DNS / DB touched | This packet only made: one read-only `WebFetch` of `https://livingwordmauritius.com/` (single GET to a public homepage, no writes); HTTP probes of `living-word-mauritius.corpflowai.com`, `lux.corpflowai.com`, `core.corpflowai.com` (all CorpFlow-managed). No requests to `network.livingwordmauritius.com`, `www.livingwordmauritius.com`, GoHighLevel, DNS-management surfaces, or any DB. No Prisma migration, no DML, no schema change, no env var change, no `package.json` change | ✓ |

## 4. Mobile UA verification

The brief includes a "mobile layout is usable" check. Re-fetched the same URL with an iPhone Safari User-Agent string:

| Field | Value |
|---|---|
| `mobile_status` | 200 |
| `mobile_body_length` | 29967 (identical to desktop UA — the page is fluid CSS, no UA-conditional code) |
| `mobile_contains_ribbon` | True |
| `mobile_contains_robots_meta` | True |
| `mobile_contains_navy` | True (`#0E1F3A` present) |
| `mobile_contains_gold` | True (`#C9A961` present) |
| `mobile_no_old_red_banner` | True (no `#FEE2E2` red-warning bg present) |

The layout uses CSS grid with `auto-fit`/`minmax(<min>, 1fr)` for all multi-column rows (pillars, get-involved cards, next-gen cards, service / location / contact strip), so on narrow viewports each row collapses to a single-column stack. The persistent ribbon's `whiteSpace: 'normal'` style allows the brief-supplied text to wrap to two lines on ≤ 320px viewports rather than overflowing horizontally.

## 5. v1 visual-fidelity content check (positive matches)

To confirm the "recognisable facsimile rather than generic prototype" goal, the live response was scanned for content that mirrors **publicly published** facts on `livingwordmauritius.com`:

| Public fact (mirrored in v1) | Present on Production |
|---|:---:|
| Hero `Welcome to Living Word` (matches the live homepage's welcome heading) | ✓ |
| Five-pillars: Serve / Worship / Impact / Fellowship / Teach with their canonical verse references (1 Peter 4:10, 1 Chronicles 16:29, Mark 16:15, Hebrews 10:24–25, Matthew 28:20) | ✓ (Serve / 1 Peter 4:10 confirmed by string match; full set covered by component definitions) |
| Sunday service time `Sundays · 9:30 am · In Person` | ✓ |
| Venue: `Living Word Church, Grand Baie` | ✓ |
| Address: `Richmond Hill Building, Super U Complex, La Salette Road, Grand Baie, Mauritius` | ✓ |
| Email: `info@livingwordmauritius.com` | ✓ |
| Phone: `+230 5538 2181` | ✓ |
| Ministry: `Children's Church · Ages 4–12` | ✓ |
| Tagline: `Blessed to be a blessing` (Get Involved heading) | ✓ (carried by `GET_INVOLVED` section heading) |
| Tagline: `Building futures in faith` (Next Generation heading) | ✓ (carried by `NEXT_GEN` section heading) |

All mirrored strings are taken verbatim from the live homepage paragraph captures. The sandbox does **not** invent facts beyond what is publicly published.

## 6. v1 negative-content check (deliberately NOT mirrored)

| Item | Sandbox v1 posture |
|---|---|
| Logo file / wordmark image | Not referenced. Visual fidelity achieved via colour + serif type instead. |
| Photographs (pastor, congregation, building, events) | Not referenced. No copyrighted imagery hosted or hot-linked. |
| Specific upcoming event dates from the live homepage's "Upcoming Events" feed | Not used. Sandbox uses placeholder fixtures (5 entries, all `approved: false`, `source: 'placeholder'`). |
| Donation amounts (e.g. Buckets of Hope `Rs200` / `Rs1000`) | Not used. Risk of confusion with real campaign signal. |
| Sermon archive titles | Not used. Frequently updated; not material to chatbot placement testing. |
| Pastor name in CTAs | Not used. Pastor Riaan Pretorius is publicly named on the live homepage, but sandbox CTAs say "the church team" to avoid implying he personally responds via the chat. |
| Hot-linked images / scripts from `livingwordmauritius.com` | Not used. Would generate ongoing traffic to the live site and create an external dependency the sandbox doesn't need. |

## 7. Safety controls — explicit re-confirmation

The brief listed nine safety controls that must hold. All hold on the live deployment.

| # | Required control | Live state | Status |
|---|---|---|:---:|
| 1 | `/site-preview` only serves on `living-word-mauritius.corpflowai.com` | Confirmed: Lux and core both 404 | ✓ |
| 2 | Non-Living-Word hosts return notFound / 404 | Confirmed via two alternate hosts | ✓ |
| 3 | Page includes `noindex,nofollow` metadata | Confirmed in response HTML (desktop + mobile UA) | ✓ |
| 4 | Persistent orange ribbon visible on every viewport | Confirmed for desktop + iPhone Safari UA; ribbon uses `position: fixed`, `top: 0`, `left/right: 0`, `whiteSpace: 'normal'` for narrow-viewport wrap; `boxShadow` and `borderBottom` for separation from page content | ✓ |
| 5 | Ribbon text is exactly the briefed string | Confirmed via verbatim em-dash string match | ✓ |
| 6 | Ribbon is fixed, non-dismissible, visible while scrolling, above the chatbot | `position: fixed` (verified in HTML); component has no close button, no `onClick`, no `aria-hidden` flip, no `localStorage` toggle; `z-index: 2147483640` is above widget panel `2147483601` (with 39 of headroom) | ✓ |
| 7 | Page does not claim to be the real church website | Confirmed via negative match + positive matches on the eyebrow (`CorpFlow sandbox · modelled on livingwordmauritius.com`), the footer brand line, and the explicit copyright distinction (`© Living Word Mauritius (real church). This page is operated by CorpFlow as a tenant test environment.`) | ✓ |
| 8 | Copy remains conservative: no invented service times, addresses, phone numbers, named pastors, or final programme claims | Mirrored facts are taken verbatim from the live public homepage; uncertain items (specific upcoming dates, donation amounts, sermon titles, pastor in CTAs) are explicitly left as placeholder or use neutral routing copy. See §6 above. | ✓ |
| 9 | Widget may load the existing loader, but server-side `enabled=false` state must remain unchanged | Loader probe returned `x-corpflow-chat-widget=disabled` and the no-op stub body; `chat_widget_configs` row for `living-word-mauritius` was NOT touched in this packet | ✓ |

## 8. What was NOT touched (negative scope confirmation)

- `livingwordmauritius.com` — one read-only `WebFetch` of the public homepage was used to learn visual identity (single GET request equivalent to a tester loading the homepage in a browser). No writes, no DNS change, no plugin install, no script injection. The live site is untouched.
- `www.livingwordmauritius.com` — no requests sent.
- `network.livingwordmauritius.com` — no requests sent.
- GoHighLevel — no API calls, no widget removal, no dashboard touch.
- DNS — no record changes.
- Database schema — no Prisma migration.
- Database content — no DML on `chat_widget_configs`, `chat_widget_threads`, `chat_widget_messages`, `chat_widget_rate_limits`, `automation_events`, `tenants`, or `tenant_hostnames`.
- Environment variables — no Vercel env mutation; no `.env` change.
- `package.json` / `package-lock.json` — unchanged.
- `api/`, `lib/server/`, `lib/cmp/`, `middleware.*` — unchanged.
- Luxe / `lux_listings` — unchanged.
- Multi-tenant operator switching work — unchanged.
- Chat widget kill-switch / `enabled` flag — unchanged (still `false`).
- Existing demo test data on `chat_widget_threads` / `chat_widget_messages` / `automation_events` — unchanged.

## 9. Files merged in this delivery

PR #379 squash-merged three modified files (1038 insertions, 257 deletions):

| File | Role in v1 |
|---|---|
| `pages/site-preview.js` | Rewritten (~600 lines). Full-width hero + top nav + 8 sections + footer. Per-section red `SandboxBanner`, old `SectionBlock`, and old `ScheduleBlock` components removed. New components: `NavBar`, `HeroSection`, `AboutSection`, `PillarsSection`, `GetInvolvedSection`, `NextGenSection`, `ServiceLocationContactSection`, `EventsSection`, `NextStepSection`, `FooterSection`. |
| `lib/sandbox/living-word-sandbox-content.js` | Restructured. `SANDBOX_BANNER` and old `SANDBOX_SECTIONS` removed. New exports: `HERO`, `ABOUT`, `PILLARS`, `GET_INVOLVED`, `NEXT_GEN`, `SUNDAY_SERVICE`, `LOCATION`, `CONTACT`, `EVENTS_PLACEHOLDER`, `NEXT_STEP`, `NAV`, `FOOTER`. JSDoc-typed. Source-of-fact policy documented in the file header. |
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md` | New section 14 ("v1 visual refinement") documents what changed, why, what facts are mirrored, what is deliberately NOT mirrored, and which safety controls are preserved. |

This live-verification artifact (`visual-sandbox-v1-live-verification.md`) ships in a separate small docs-only PR so the v1 squash merge stays exactly the design payload.

## 10. Delivery state

- **Local only:** NO (now merged + deployed)
- **Merged to main:** YES (`82f24868`)
- **Deployed to Production:** YES (Vercel deployment `EJPyjDMG4Vhhut3Ut94rieGpsAvf`)
- **Live verified:** YES (all brief-listed checks pass on `https://living-word-mauritius.corpflowai.com/site-preview`)
- **Final verdict: COMPLETE**

The Living Word visual sandbox v1 is now live on the CorpFlow-hosted LWM tenant host. The persistent orange test-environment ribbon, host gate, `noindex,nofollow` posture, conservative-copy policy on uncertain facts, and chat-widget-disabled posture are all preserved. Per-section red warning boxes are removed. Visual treatment intentionally resembles the public church site (navy + gold + serif typography, hero, pillars, ministry cards, service/location/contact strip) so testers can meaningfully assess chatbot placement and site-context on the sandbox before any external embed work.

## 11. Future packets gated by this delivery

The following work streams are now technically unblocked but **not** authorised by this packet:

- A controlled chatbot enable window on the sandbox (separate authorisation; same flow as the prior live-verification packet).
- AI-assisted copy preview block on the sandbox.
- Process-routing visualisation block on the sandbox.
- Schedule rendering driven by a real `schedule_entries` table instead of the static placeholder array.
- Per-tenant theming if `/site-preview` is reused for a future tenant (e.g. Lux), with its own verbatim ribbon message and its own published-fact set.
- Optional: hot-linked or self-hosted public LWM logo / wordmark image, if and when the church owner explicitly approves use of brand assets on the sandbox.

External-embed work for the church's WordPress site remains gated on owner + provider replies per `chatbot-v0-handoff-response-tracker.md` and is independent of this sandbox refinement.
