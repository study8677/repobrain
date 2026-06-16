# Living Word Mauritius — visual sandbox plan (chatbot + AI testing surface)

**Tenant:** `living-word-mauritius`
**Sandbox host:** `living-word-mauritius.corpflowai.com`
**Sandbox route (chosen):** `/site-preview` _(rationale in §2)_
**Date:** 2026-06-16
**Mode:** Implementation planning first — minimal scaffolding implemented in this same packet (assessed safe per §10).

The sandbox is a CorpFlow-hosted, tenant-scoped, `noindex,nofollow` test environment that approximates Living Word Mauritius's public site **structure** (not its visual identity, not its content claims). It exists so the chatbot, future scheduling logic, future AI features, and future process-routing work can be exercised against a realistic-shaped surface **without ever touching `livingwordmauritius.com`, `www.livingwordmauritius.com`, `network.livingwordmauritius.com`, GoHighLevel, or any external WordPress install**.

This is **not** a clone of the church website. It is a labelled CorpFlow test surface that happens to mirror section structure for the purpose of chatbot path validation and future feature scaffolding.

---

## 1. Goals and non-goals

### 1.1 Goals (in scope for v0)

- A new Next.js page at a route that does not collide with anything (§2 chooses `/site-preview`).
- `noindex,nofollow` so search engines never surface it.
- Clear, repeated **CorpFlow test environment** labelling at the top of every section.
- Section structure mirroring the church public site's information architecture: **Home, Events, WordGroups, Prayer Request, Volunteer / Serve, Youth / Children, Business Network, Contact**.
- Conservative placeholder copy only — no invented service times, no invented address, no invented programme details, no invented business-network claims.
- Loads the actual CorpFlow chat widget bundle from the same host (`living-word-mauritius.corpflowai.com/api/chat-widget/loader.js`).
- The chat widget remains `enabled = false` server-side; the sandbox does not re-enable it.
- A future-ready **schedule data shape** (TypeScript-style JSDoc + placeholder entries) capable of carrying upcoming services, events, youth/children programmes, WordGroups, and special events when the church owner approves real data.
- Documentation of which parts are static approximation vs which parts are dynamic/testable.
- Documentation of what the sandbox proves vs what still requires external WordPress testing.

### 1.2 Non-goals (out of scope for v0)

- No pixel-perfect clone of `livingwordmauritius.com` (explicitly forbidden by the brief unless approved).
- No reuse of any image, logo, photograph, or proprietary text from the church's site.
- No claim that the sandbox is the real church website. The page header says "Living Word Mauritius — CorpFlow sandbox (test environment, not the church website)".
- No DB tables created. The schedule shape is a static JS module; if/when it's wired to a DB, that's a separate packet.
- No dynamic data fetching. All content is server-rendered from inline placeholders.
- No marketing or conversion CTAs (this is operator-internal).
- No analytics tracking on the sandbox page (no Plausible, no GA, etc.).
- No re-enabling of the chat widget. It remains `enabled = false` until a separate packet authorises a sandbox-test enablement window.
- No external WordPress integration of any kind.
- No DNS / hosting / domain change.

---

## 2. Route and host strategy

### 2.1 Route choice — `/site-preview`

Chosen over `/living-word-sandbox` because:

- **Generic name, tenant-scoped reality.** `/site-preview` is reusable for future tenants (a Lux preview, a future client preview) without route proliferation. The actual content is gated by host (and by §3.2 server-side host check).
- **Shorter URL** — easier to share with the church owner or provider during sandbox demos.
- **Doesn't collide with anything.** Glob check confirmed: no `pages/site-preview*` exists; no API route at `/api/site-preview` exists.

`/living-word-sandbox` remains an acceptable fallback if Anton later prefers the explicit naming. The plan and implementation are easily renamed (single Next.js page rename + a meta ref).

### 2.2 Host strategy

The sandbox page is **only meaningful on `living-word-mauritius.corpflowai.com`**. On any other host (e.g. `lux.corpflowai.com`, the apex `core.corpflowai.com`, a dev preview), the page returns a `404`-style "preview not available for this tenant" response.

Implementation: Next.js `getServerSideProps` reads the request `Host` header, compares against an allow-list (`living-word-mauritius.corpflowai.com`), and returns `{ notFound: true }` for any other host. This:

- Prevents accidental cross-tenant exposure of LWM-flavoured content (e.g. a Lux operator hitting `lux.corpflowai.com/site-preview` would get a 404, not Living Word content).
- Keeps the route name reusable for future tenants (each future tenant adds its own host to the allow-list and renders different content based on host).
- Costs one extra database-free server function call per request — negligible.

### 2.3 Indexing posture

- `<meta name="robots" content="noindex,nofollow" />` on the page itself.
- Optionally, an `X-Robots-Tag: noindex, nofollow` HTTP header set in `getServerSideProps`. (v0: rely on the meta tag; HTTP header can be added if a search engine ever surfaces the URL.)
- The sandbox URL is not added to any sitemap.
- The sandbox URL is not linked from any indexable surface (no internal nav from `/`, no internal nav from `/change`, etc.).

### 2.4 Auth posture

Anonymous-public, same as `/chat-widget-demo`. The sandbox is operator-internal but does not require login — the operator and the church owner / provider can hit the URL directly without signing in. This makes demos friction-free.

If a future requirement is "operator-login-only sandbox" (e.g. for previewing pre-approval copy), that's a thin auth gate added in `getServerSideProps`. Out of scope for v0.

---

## 3. Content / structure approach

### 3.1 Section list (mirrors the church public site IA, deliberately conservative)

The sandbox renders eight top-level sections, each with a short conservative placeholder block. Section anchors map to the chatbot's eight starter paths so the conversation feels like a natural extension of the page:

| Section | Anchor | Chatbot path it mirrors | Content shape (v0) |
|---|---|---|---|
| Home | `#home` | (welcome) | One paragraph: "Living Word Mauritius — sandbox preview." Repeats the test-environment notice. |
| Events | `#events` | — _(future scheduling integration)_ | Static placeholder list, all entries marked "approval pending — not for public use". Sourced from the schedule data shape (§5) at module load. |
| WordGroups | `#wordgroups` | "WordGroups" path | One paragraph + a CTA stub ("a church team member can follow up about WordGroups"). No invented group list. |
| Prayer Request | `#prayer` | "Prayer request" path | One paragraph echoing the chatbot safeguarding wording verbatim, plus a CTA "open the chat to share a prayer request" (which opens the widget when enabled). |
| Volunteer / Serve | `#volunteer` | "Volunteer / Serve" path | One paragraph + chat CTA. No invented role list. |
| Youth / Children | `#youth-children` | "Youth / Children" path | One paragraph echoing the parent/guardian-only posture. No child-focused imagery. No invented age groups. |
| Business Network | `#network` | "Business Network" path | One paragraph + the chatbot's neutral routing wording. No endorsement. No invented business list. |
| Contact | `#contact` | "Contact the church" path | One paragraph + chat CTA. No invented phone, no invented email, no invented address. Says "please use the church website's contact page for verified contact details". |

### 3.2 What every section repeats (defence-in-depth labelling)

Each section starts with a small banner:

> **CorpFlow sandbox** — this section is a placeholder for chatbot, AI, and process-routing testing. It is not the live church website. Real content is approved and published on `livingwordmauritius.com`.

This banner is intrusive on purpose. Visual ugliness here is a feature: it makes accidental confusion impossible.

### 3.3 Visual treatment

Plain, conservative, system-font CSS (same posture as `/chat-widget-demo`). Specifically:

- System fonts (`system-ui`, `-apple-system`, `Segoe UI`, etc.) — no custom font loaded.
- Neutral colour palette: white background, `#111` text, soft grey accents (`#F3F4F6`, `#E5E7EB`).
- A single accent colour for chat CTA buttons (`#1E3A8A`, matching the chat widget's default brand accent).
- No images, no icons (except optional plain unicode glyphs).
- Single column, max-width ~720px on desktop, full width on mobile.
- No animations, no parallax, no carousels.
- A small `SandboxBanner` (red on yellow) repeats at the top of every section block as a contextual reminder when testers scroll deep.

### 3.3.1 Persistent test-environment ribbon (mandatory posture)

Every CorpFlow sandbox / preview page **must** carry a persistent high-visibility test-environment ribbon. This is a hard posture rule, not a stylistic choice — it exists so a tester (or anyone the URL leaks to) cannot mistake the sandbox for the live tenant site.

Minimum requirement (from operator instruction, 2026-06-16):

- **Position:** fixed at the top of the viewport. Stays visible during scroll.
- **Background:** orange (`#EA580C`) or similarly high-contrast colour. Bold white text. The ribbon is intentionally loud.
- **Text on the LWM sandbox:** verbatim — `TEST ENVIRONMENT — Not the live Living Word Mauritius website`.
- **Width:** spans full viewport. Wraps gracefully on narrow mobile (≤ 320px) to two lines rather than overflowing horizontally.
- **Dismissibility:** none. No close button. No `localStorage` toggle. No `aria-hidden` flip. The ribbon cannot be hidden by a tester.
- **Z-index:** above the chat widget panel. Implementation uses `z-index: 2147483640`, comfortably above the chat widget bubble (`2147483600`) and panel (`2147483601`).
- **Page metadata:** the page must also carry `<meta name="robots" content="noindex,nofollow" />` independently. The ribbon and `noindex` are complementary, not alternatives.

Implementation:

- The ribbon lives in `lib/sandbox/test-environment-ribbon.js` as a reusable React component (`TestEnvironmentRibbon`).
- The component takes a `message` prop with no default — every sandbox page must pass its own tenant-specific verbatim message so the ribbon is never wrong by accident on a new sandbox.
- The consuming page must add ≥ 80px top padding to its main wrapper to clear the fixed ribbon (handles 2-line wrap on narrow mobile).
- Future tenant sandboxes (e.g. Lux) reuse the same component; only the `message` string changes per tenant.

### 3.4 What the sandbox deliberately does NOT include

- Living Word's actual logo.
- Living Word's brand colours (the church owner has not approved their use here).
- Photographs of pastors, congregation, building, programmes.
- Service times.
- Address.
- Phone numbers.
- Email addresses.
- Names of any individual person.
- Names of specific WordGroups.
- Names of specific businesses in the network.
- Programme schedules.
- Sermon archives.
- Donation/giving CTAs.

Everything in this list is **deferred to either (a) church-owner approved content for go-live or (b) a separate visual-design packet that the church owner explicitly approves**.

---

## 4. Conservative copy posture

### 4.1 The four conservative-copy rules

Every visible string on the sandbox follows these rules:

1. **No specific times.** Never write a service time, event time, or programme time as if it were truth. Use neutral phrasing: "service times are published on the Living Word Mauritius website".
2. **No specific places.** Never publish an address, room name, or campus location. Use neutral phrasing: "location details are published on the Living Word Mauritius website".
3. **No specific people.** Never name a pastor, leader, volunteer, child, business owner, or member.
4. **No specific commitments.** Never imply the church endorses, approves, vets, processes payment for, or guarantees anything. Specifically the Business Network section uses the chatbot's neutral routing language verbatim.

### 4.2 Why these rules

- The chatbot's `flow_json` (`flow_version = 2`, copy-review v2) was scrubbed in `chatbot-v0-copy-review.md` against the same posture. The sandbox must match — otherwise the page contradicts the chatbot living on the same surface.
- The sandbox is operator-visible and might be shown to the pastor, the provider, or a future client. Any invented detail risks misrepresentation.
- The sandbox URL is `noindex` but anyone with the link can open it. Conservative copy is the only posture that survives "what if this URL leaks?".

### 4.3 Forbidden-token scan

A simple text-level scan against the sandbox content module rejects:

- `:[0-9][0-9]` (likely a time)
- `Mauritius, ` (likely an address)
- `\+230` (Mauritius phone code)
- `@` followed by a domain (likely an email — the only @ should be in a `<code>` block referring to a CorpFlow internal email like `chat-widget-test@corpflowai.com`)
- "Pastor", "Reverend" (followed by a name) — operator inspects manually before any addition
- Specific named WordGroups or businesses — operator inspects manually

This is an inspection step, not an automated unit test; the sandbox is not large enough to need automation in v0. The reviewer (Anton) runs the eye-grep before and after any edit.

---

## 5. Schedule data shape (future-ready)

A static JS module that exports type-shaped placeholder entries. v0 has **no DB wiring**. The shape is published now so:

- The sandbox Events/WordGroups/Youth sections can be hooked up to it for static rendering today.
- A future packet can swap the static array for a Prisma-backed query without changing any consumer.
- The chatbot can later answer "when's the next service?" or "what's coming up for youth?" by reading from the same shape.

### 5.1 Shape (JSDoc-typed, plain JS)

```js
/**
 * @typedef {'service'|'event'|'youth'|'wordgroup'|'special'} ScheduleCategory
 * @typedef {'all'|'children'|'youth'|'adults'} AgeBand
 * @typedef {'public'|'unlisted'|'private'} Visibility
 * @typedef {'once'|'weekly'|'monthly'|'custom'} Recurrence
 * @typedef {'church-input'|'chatbot-followup'|'imported'|'placeholder'} ScheduleSource
 *
 * @typedef {Object} ScheduleLocation
 * @property {string} [name]      // friendly name; never the real address
 * @property {string} [mapUrl]    // optional map link; never an embedded map
 *
 * @typedef {Object} ScheduleRegistration
 * @property {boolean} required
 * @property {string} [url]
 * @property {string} [deadline]  // ISO datetime
 *
 * @typedef {Object} ScheduleContact
 * @property {string} [role]      // "WordGroups team" — generic role, never a person
 *
 * @typedef {Object} ScheduleEntry
 * @property {string} id                            // stable slug, e.g. "lwm-sunday-service"
 * @property {string} tenantId                      // always "living-word-mauritius" in this file
 * @property {ScheduleCategory} category
 * @property {string} title
 * @property {string} [description]
 * @property {ScheduleLocation} [location]
 * @property {Recurrence} recurrence
 * @property {string} [startsAt]                    // ISO datetime, used for category=once
 * @property {string} [endsAt]
 * @property {number} [weeklyDayOfWeek]             // 0-6 (Sunday=0); used for recurrence=weekly
 * @property {string} [weeklyTime]                  // "HH:MM" 24h; informational only in v0
 * @property {Visibility} visibility
 * @property {AgeBand} [ageBand]
 * @property {ScheduleRegistration} [registration]
 * @property {ScheduleContact} [contact]
 * @property {boolean} approved                     // explicit gate — false until pastor signs off
 * @property {string} [approvedBy]
 * @property {string} [approvedAt]                  // ISO datetime
 * @property {ScheduleSource} source
 * @property {string} [notes]                       // operator-only commentary
 * @property {string} createdAt                     // ISO datetime
 * @property {string} updatedAt                     // ISO datetime
 */
```

### 5.2 Approval discipline

Every entry has `approved: boolean` and `source: ScheduleSource`. The sandbox renders an entry only if **either** (a) `source === 'placeholder'` AND the entry is shown with the explicit "approval pending" label, **or** (b) `approved === true` (which is never the case in v0 sandbox).

This separates structural readiness ("can the chatbot find the next youth event?") from content correctness ("is this the right time?"). The chatbot can be tested against placeholder entries that are clearly not for public consumption; real entries land later through a separate pastor-approved packet.

### 5.3 Placeholder entries shipped in v0

A handful of obviously-placeholder entries cover the five categories:

- 1 weekly service entry — title "Sunday service (placeholder)", weekly recurrence, no time, location `{ name: 'See Living Word Mauritius website' }`, `approved: false`, `source: 'placeholder'`.
- 1 once-off event — title "Special event (placeholder)", recurrence `once`, `startsAt` set to a clearly fake far-future date, `approved: false`.
- 1 youth programme — `category: 'youth'`, `ageBand: 'youth'`, title "Youth programme (placeholder)", recurrence `weekly`, `approved: false`.
- 1 WordGroup — `category: 'wordgroup'`, title "WordGroup (placeholder)", recurrence `weekly`, `approved: false`, `notes: 'name redacted until pastor approval'`.
- 1 special — `category: 'special'`, title "Special programme (placeholder)", recurrence `once`, `startsAt` far-future fake, `approved: false`.

All five are rendered with the `approval pending — not for public use` label.

### 5.4 What the schedule shape does NOT include in v0

- No iCal export.
- No public JSON endpoint (the data is bundled into the page server-render only).
- No CRUD UI.
- No DB persistence.
- No timezone conversion (entries are notionally Mauritius local time but `weeklyTime` is informational only — no Date arithmetic on the page).
- No conflict detection between entries.
- No registration flow.

These all become candidates for a "schedule v1" packet once the church owner approves real entries.

---

## 6. Chat widget integration on the sandbox

### 6.1 Widget loads on the sandbox

The sandbox page includes the same `<script async src="/api/chat-widget/loader.js" data-position="bottom-right" />` tag used on `/chat-widget-demo`. Same loader, same tenant resolution path (host → `tenant_hostnames` → `tenant_id`), same `gatePublicEndpoint` semantics.

### 6.2 Widget remains disabled by default

`chat_widget_configs[tenantId=living-word-mauritius].enabled = false` is unchanged by this packet. Visiting the sandbox today loads the **disabled stub** (264-byte no-op). The bubble does not appear. This is intentional:

- Prevents accidental data collection on the sandbox while it is being built / iterated on.
- Keeps the post-live-verification posture: widget is OFF except during operator-controlled test windows.

### 6.3 When to enable the widget on the sandbox

A separate, narrowly-scoped packet ("**Living Word chat widget v0 — sandbox enable window for chatbot iteration**") is the right vehicle for any sandbox-flavoured enable. That packet:

- Authorises a flip of `enabled = true` for an explicit window (e.g. 30 minutes).
- Authorises chatbot-iteration test leads (clearly tagged as test).
- Mandates a flip back to `false` at the end of the window — same try/finally driver pattern as `chatbot-v0-live-verification.md`.
- Distinguishes sandbox test data from real-visitor data via `source_host = living-word-mauritius.corpflowai.com` and `source_path = /site-preview` in the `automation_events` payload.

### 6.4 Allow-list

`https://living-word-mauritius.corpflowai.com` is already in `chat_widget_configs.allowed_origins_json` (seeded). No DB change required for the sandbox to host the widget.

### 6.5 Origin discipline

The sandbox is on the same host as the API. The browser sends `Origin: https://living-word-mauritius.corpflowai.com` on the `/api/chat-widget/start` and `/step` calls. That origin is allow-listed. Tested already during the demo verification packet.

---

## 7. What the sandbox proves vs what still requires external WordPress testing

### 7.1 What the sandbox CAN prove

The sandbox is a useful integration surface for everything that doesn't depend on the church's WordPress stack. Specifically:

- **Chatbot copy iteration.** Pastor edits to `flow_json` can be applied, then walked through on the sandbox without bothering the WordPress provider.
- **Chatbot path iteration.** New menu options, new collect-field nodes, new safeguarding wording — all testable here.
- **Future AI-assist features.** When AI features are wired (e.g. a small LLM-rephrase pass on the bot prompt or a smart-summary of the lead message), they can be exercised here against placeholder leads.
- **Schedule integration with the chatbot.** When the chatbot starts answering "when's the next service?", the placeholder schedule (§5) is the test fixture.
- **Process routing.** When `automation_events.chat_widget.lead.submitted` is wired to a downstream consumer (n8n flow, email forward, CMP ticket), the sandbox is where the wiring is exercised end-to-end.
- **Layout sanity for the bubble.** Bubble placement, panel width, font sizes — all visible here without affecting the church website.
- **Operator demos.** Showing the church owner what the chatbot looks like, in context, without exposing them to the church website's complexity.

### 7.2 What the sandbox CANNOT prove (still requires external WordPress test window)

These checks require a real script-tag install on `livingwordmauritius.com` (and optionally `network.livingwordmauritius.com`):

- **WordPress security plugins** (Wordfence, iThemes, Sucuri, etc.) actually allow the script and the API calls.
- **WordPress cache plugins** (LiteSpeed Cache, WP Rocket, etc.) survive script-tag insertion and don't strip the tag on cache rebuild.
- **CSP headers** sent by the church's hosting / CDN (if any) actually allow the corpflowai origin on `script-src`, `connect-src`, and `style-src 'unsafe-inline'`.
- **Theme-CSS interactions** with the bubble's `position: fixed; z-index: 2147483600`. The sandbox uses a clean style; the church's WordPress theme may not.
- **Coexistence with the GoHighLevel widget** at the visual layer (two bubbles on one page).
- **CDN / hosting layer** (cloud.mu LiteSpeed) doesn't transform or reject the cross-origin script.
- **Real-user mobile rendering** on the live church pages with their actual chrome (cookie banners, sticky CTAs, popups, etc.).
- **Lead handoff from a real visitor** (a sandbox lead is from the operator; behaviour under genuine traffic is a separate signal).

The sandbox **cannot** substitute for the apex test window described in `chatbot-v0-external-embed-readiness.md` §11. The two are complementary.

### 7.3 Decision criteria — when to test on sandbox vs external

| Question being asked | Test on sandbox | Test on external |
|---|:---:|:---:|
| Does the chatbot's new prayer wording read well? | YES | optional second pass |
| Does the bubble visually cover content on a typical page? | YES | YES |
| Does the lead-submitted event fire correctly? | YES | YES |
| Does the WordPress security plugin allow the script? | NO | **YES** |
| Does the CSP allow `connect-src` to corpflowai? | NO | **YES** |
| Does the cache layer rebuild without stripping the tag? | NO | **YES** |
| Does GHL coexist on the same page? | NO | **YES** |
| Can the pastor see what their visitors will see? | YES (preview only) | YES (definitive) |

---

## 8. Static approximation vs dynamic / testable parts

A clear split so the next operator (or a Codex Cloud agent) doesn't accidentally add real-truth claims to a placeholder slot.

### 8.1 Static approximation (placeholder, never claimed as truth)

| Surface | Source | Notes |
|---|---|---|
| Section copy (Home, WordGroups, Prayer, Volunteer, Youth, Network, Contact bodies) | `lib/sandbox/living-word-sandbox-content.js` (placeholder strings) | Inspected against the §4 forbidden-token rules. |
| Page-level headers, footer, banner styling | inline JSX in `pages/site-preview.js` | No images, no logos. |
| Schedule placeholder entries (5 categories × 1 entry each) | `lib/sandbox/living-word-schedule-shape.js` (placeholder array) | All `approved: false`, `source: 'placeholder'`. |
| Persistent test-environment ribbon | `lib/sandbox/test-environment-ribbon.js` | Fixed at the top of the viewport, orange / high-contrast, non-dismissible, z-index above the chat widget. Mandatory on every sandbox page. |
| Per-section sandbox banner (red on yellow) | inline `SandboxBanner` in `pages/site-preview.js` | Repeated at the top of every section block as a contextual reminder. |

### 8.2 Dynamic / testable (real wiring, exercised on the sandbox)

| Surface | Wiring | Notes |
|---|---|---|
| Chat widget loader | live `/api/chat-widget/loader.js` on the same host | Returns disabled stub today; returns active bundle when an explicit enable window flips `enabled=true`. |
| Tenant resolution | live `tenant_hostnames` lookup → `tenant_id` | Already proven during the demo verification. |
| `chat_widget_configs` reads | live Postgres row | Same row used by the demo and (eventually) the church origins. |
| Rate limiter | live `chat_widget_rate_limits` | Same window logic. |
| Lead submission → automation event | live `recordTrustedAutomationEvent` | Future AI / process-routing / consumer wiring tested here. |

### 8.3 Future dynamic surfaces (planned, not in v0)

- **Schedule rendering driven by Prisma query** instead of static module — when a real `schedule_entries` table exists.
- **AI-assisted copy preview** on the page — a small server-rendered block that takes a placeholder lead and shows a draft response, for operator iteration.
- **Process-routing visualisation** — a small block on the sandbox showing "if this chat lead came in, it would route to <consumer>" so the operator can validate the wiring before going live.
- **Per-tenant theming** — if `/site-preview` is reused for future tenants, a small theming layer.

---

## 9. Implementation file list (created in this packet)

The minimal implementation, scoped tightly to make review easy. All files are new; nothing existing is modified.

| File | Purpose | Approx. size |
|---|---|---|
| `pages/site-preview.js` | Next.js page. `getServerSideProps` host-gates to `living-word-mauritius.corpflowai.com`. Renders the persistent test-environment ribbon + eight sections + per-section sandbox banners + chat widget script tag. | ~210 lines |
| `lib/sandbox/test-environment-ribbon.js` | Reusable persistent test-environment ribbon component. Fixed at the top of the viewport, orange / high-contrast, non-dismissible, z-index above the chat widget. Mandatory on every CorpFlow sandbox / preview page. Takes a verbatim `message` prop with no default. | ~80 lines |
| `lib/sandbox/living-word-sandbox-content.js` | Section copy (placeholder strings) for the eight sections + the repeated per-section banner. JSDoc-typed. | ~120 lines |
| `lib/sandbox/living-word-schedule-shape.js` | The `ScheduleEntry` JSDoc shape + 5 placeholder entries. Default export is the array; named exports are helper functions (`getEntriesForCategory`, `getNextOccurrence` stub). | ~150 lines |

No DB migrations, no schema changes, no API routes added, no Prisma model changes, no environment variable changes, no `package.json` changes.

The page does not import anything from `lib/server/*`, `lib/cmp/*`, `lib/automation/*`, or any tenant/auth surface. It is a pure presentation page that loads the existing chat widget loader by URL.

---

## 10. Safety assessment for in-packet implementation

Per the brief — "implementation planning first; then minimal sandbox page if safe" — this section is the explicit safety check. Each row evaluates an aspect of the implementation against the operator's constraints.

| Aspect | Risk if implemented in this packet | Verdict |
|---|---|:---:|
| Touches `livingwordmauritius.com` / `network.livingwordmauritius.com` | **NO** — sandbox is purely on `living-word-mauritius.corpflowai.com`. | SAFE |
| Touches GoHighLevel | **NO** — GHL is on the church's WordPress, not on corpflowai. | SAFE |
| Removes or modifies the live chat widget on church origins | **NO** — the church origins have no widget; the sandbox is a separate URL. | SAFE |
| Scrapes / mirrors private WordPress data | **NO** — placeholder copy is hand-written; no scraping, no fetching. | SAFE |
| Claims to be the real church website | **NO** — persistent fixed orange ribbon at the top of the viewport (non-dismissible, z-index above the chat widget) reads `TEST ENVIRONMENT — Not the live Living Word Mauritius website` on every page; per-section sandbox banners reinforce; page header explicitly says "CorpFlow sandbox". | SAFE |
| Pixel-perfect clone | **NO** — plain system-font CSS, no logo, no brand colours, no images. | SAFE |
| Touches Luxe / `lux_listings` | **NO**. | SAFE |
| Touches multi-tenant operator switching work | **NO**. | SAFE |
| Re-enables the chat widget | **NO** — `enabled` stays false; loader serves the disabled stub on the sandbox. | SAFE |
| Adds DB tables / migrations | **NO** — schedule shape is a static module. | SAFE |
| Changes existing files | **NO** — three new files only; no edits to anything existing. | SAFE |
| Affects existing routes (CMP, factory, automation, lux, change console, login) | **NO** — `/site-preview` is an unused route, host-gated to LWM. | SAFE |
| Indexable by search engines | **NO** — `noindex,nofollow` meta. | SAFE |
| Reachable cross-tenant | **NO** — `getServerSideProps` returns `notFound` for non-LWM hosts. | SAFE |

**Verdict: implementing the minimal page in this packet is safe.** The only state change to production happens if these files are merged to `main` and Vercel deploys them. **In this packet they are created locally only — no commit, no PR, no deploy.** That keeps the operator in control of when (and whether) the sandbox actually goes live.

If safety later becomes uncertain (e.g. the church owner objects to a CorpFlow-hosted preview page that mentions "Living Word Mauritius" at all), the files can be deleted with no impact on anything else.

---

## 11. Verification plan

### 11.1 Local checks (run in this packet)

- **Lint** — `ReadLints` on the three new files.
- **Route collision** — `Glob` against `pages/site-preview*` (already done; zero matches).
- **Forbidden-token scan** — manual review of the sandbox content module against the §4 rules (no times, no addresses, no people, no commitments). Easy to do by eye on ~120 lines.
- **Host gate** — read the `getServerSideProps` to confirm only `living-word-mauritius.corpflowai.com` returns a page; everything else returns `{ notFound: true }`.

### 11.2 Local visual smoke (operator decision — not in this packet)

If Anton wants to eyeball the page locally before any deploy:

```text
1. npm run dev on a workstation
2. Modify the host header (browser tooling or curl) to be living-word-mauritius.corpflowai.com
   so the host gate passes.
3. Hit http://localhost:3000/site-preview?host-override-allowed (host gate would need a
   local-dev escape hatch, e.g. NODE_ENV !== 'production' allows any host).
4. Confirm the eight sections render, the sandbox banner is loud, the chat bubble does not
   appear (loader serves disabled stub).
```

Whether to wire a local-dev escape hatch is a judgment call for Anton — leaving the host gate strict means local dev shows `notFound`, which is fine if the operator works directly against Preview deploys.

### 11.3 Preview / Production checks (only if merged — separate packet)

If a future packet decides to merge the sandbox to `main`:

- Vercel Preview build should pass (no new dependencies, no schema change).
- Vercel Production deploy should not affect anything else — the new route is isolated.
- Live probe: `curl https://living-word-mauritius.corpflowai.com/site-preview` returns `200`, `text/html`, contains the test-environment banner, contains the chat widget script tag, and does **not** contain any of the §4 forbidden tokens.
- Negative live probe: `curl https://lux.corpflowai.com/site-preview` returns `404` (or Next.js' standard 404 page) — proves cross-tenant isolation.
- Zero impact on the demo URL `/chat-widget-demo` or any other existing route.

These are part of a separate "**Living Word visual sandbox v0 — branch + PR**" packet, not this one.

---

## 12. Open decisions for Anton

| # | Decision | Suggested default | Why |
|---:|---|---|---|
| 1 | Route name: `/site-preview` vs `/living-word-sandbox` | **`/site-preview`** | Generic, reusable for future tenants, host-gated for safety. Easy to rename later. |
| 2 | Commit + open PR for the sandbox files in this packet, or leave them locally as draft | **Leave locally as draft** | Keeps Anton in control of the moment the sandbox URL becomes live on `living-word-mauritius.corpflowai.com`. A separate "branch + PR" packet is cheap. |
| 3 | Local-dev host-gate escape hatch (`NODE_ENV !== 'production'`) | **Skip for v0** | Operator can develop against Preview deploys; one less code path to test. Add it if local development gets uncomfortable. |
| 4 | Add an `X-Robots-Tag: noindex, nofollow` HTTP header in addition to the meta tag | **Skip for v0** | Meta tag is enough since the URL is not linked from anywhere indexable. Add the header if a search engine ever surfaces the URL. |
| 5 | Sandbox-enable window for the chat widget (so the bubble actually renders during pastor demos) | **Defer to a separate packet** | Same pattern as the demo verification — explicit narrow window, try/finally disable. Worth doing once the sandbox content is finalised. |
| 6 | Add the sandbox to the operator's regular monitoring (live probe in `MONITORING_ARCHITECTURE.md`) | **Defer until after merge** | No point monitoring a route that isn't deployed. |

### 12.1 Things deliberately not asked

- **Owner approval of the sandbox content.** Sandbox copy is conservative enough to not need pastor sign-off — there are no claims to approve, only neutral routing language. If Anton wants pastor sign-off on the sandbox content anyway (e.g. "even the placeholder Sunday service entry should not exist until I approve") that's a one-line change to the placeholder list.
- **Provider involvement.** The sandbox is wholly on CorpFlow infrastructure. The WordPress provider does not need to know about it for the sandbox to be useful.

---

## 13. What this packet ships (concretely)

After this packet, the repository state is:

- **New artifact (this file):** `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md`.
- **New page (uncommitted, locally):** `pages/site-preview.js`.
- **New libs (uncommitted, locally):** `lib/sandbox/living-word-sandbox-content.js`, `lib/sandbox/living-word-schedule-shape.js`.
- **No DB change.** No schema change.
- **No deploy.** Files are local only — they are not on `main`, not on any branch pushed to origin, not on Preview, not on Production.
- **No external system change.** WordPress / GHL / DNS / Luxe / `lux_listings` / multi-tenant operator work all untouched.
- **Production widget state unchanged:** `chat_widget_configs[living-word-mauritius].enabled = false`.

If Anton wants to discard the implementation, the three local files are deleted; only this artifact remains and is itself harmless documentation.

---

## Summary

The sandbox is a small, safe, well-bounded surface for chatbot, AI, scheduling, and process-routing iteration without ever touching the live church website. It is `noindex`, host-gated to `living-word-mauritius.corpflowai.com`, conservatively-worded, and clearly labelled as a CorpFlow test environment. The schedule data shape (§5) gives future packets a stable target without committing to a DB design today. The chat widget loads but stays disabled — a separate packet authorises any sandbox-enable window.

The minimum implementation (three small files, ~520 lines total, no DB / migration / config changes) is safe to create in this packet because it is uncommitted and undeployed; Anton retains control of when, if ever, the sandbox URL becomes live.

Next concrete step (separate packet, when chosen): "**Living Word visual sandbox v0 — branch + PR**" — pushes the three local files to a feature branch, opens a PR, lets Vercel Preview build, then merges + deploys when ready. Until then, the sandbox is a local-only scaffold.