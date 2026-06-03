# Pomelli / AI Lead Rescue — Mauritius Cold-Market Marketing Sprint v1 (research + proposal)

**Status:** Research + proposal artefact, **docs-only**. No runtime page change, no pricing change, no payment automation, no CRM / GHL / WhatsApp integration, no ERPNext change, no Pomelli account created, no Pomelli assets uploaded to the live site, no DNS / env / secrets touched.
**Author:** Assistant (Cursor) on behalf of Anton.
**Date (UTC):** 2026-06-03.
**Trigger:** Anton's DECISION (chat, 2026-06-03 *"APPROVED — open Pomelli / Lead Rescue Mauritius Cold-Market Marketing Sprint"*).
**Linked JOURNAL row:** `JE-2026-06-03-1`.
**Anchor sentinel:** `<!-- POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1_HIST -->` (in `artifacts/chat_history.md`).

This packet evaluates **Google Pomelli** as a possible **internal marketing-studio capability** and uses the findings to draft a concrete cold-market sprint for **AI Lead Rescue** targeting Mauritius warm-network + segment-specific cold prospects. **Pomelli is explicitly out of scope as CRM, lead-capture, automation engine, or source of truth** — it is a creative-asset generator only, and only if Anton activates it under a future packet.

---

## § 0 — Scope and hard limits (read first)

**In scope:**
- Web-research-based verdict on Pomelli's product surface, availability, pricing, and fit as an internal marketing-studio capability.
- Inspection of the current Lead Rescue surface (`https://corpflowai.com/lead-rescue` + `pages/lead-rescue.js` + `components/AiLeadRescueLanding.js`).
- Landing-page conversion audit lens **for cold Mauritian prospects** (not warm-network, which `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` already covers).
- Recommended first-pass copy / CTA / instrumentation improvements, listed as **proposals only**.
- Segment-specific campaign angles for property / clinics / contractors / hospitality verticals.
- Cold outreach variants by channel (LinkedIn cold DM, WhatsApp, cold email, cold-call opener).
- Tracking / analytics gaps relative to the live page + Plausible v1 instrumentation.
- Minimal PR plan: docs first, then small page-copy + tracking-event PRs gated by separate DECISIONs.
- Engineer / Cursor handoff package (file paths, exact line ranges, exact strings).

**Out of scope (hard limits):**
- No Pomelli account creation (no Google account configured, no VPN setup, no asset uploaded to the live site).
- No secrets / env vars / DNS / mail-routing / Vercel / GitHub-settings / Telegram / Plausible / Search Console / payment-settings touched.
- No payment automation (no payment links, no gateway configuration, no new payment provider mentioned on the live page).
- No CRM / GHL / WhatsApp / SMS / outbound-automation integration (Pomelli is not an integration target).
- No unsupported claims (no client names, no fabricated testimonials, no logos used to imply customers, no star ratings, no revenue guarantees).
- No buyer-decision overload (single-offer rule per `JE-2026-05-28-1` preserved — USD 150 launch pilot, invoiced after intake review).
- No ERPNext production / scheduler / Phase D / Phase C² touched — this packet is fully separated from the finance / accounting productionisation workstream.

---

## § 1 — Pomelli viability verdict (research-based, current as of 2026-06-03)

### § 1.1 — Verdict summary

**Viable as an internal CorpFlowAI marketing-studio capability for asset generation only — with 5 caveats.** Not viable as CRM, lead capture, automation engine, source of truth, or replacement for `/lead-rescue` / `pages/lead-rescue.js`.

Activation should land **only** under a separate Anton DECISION (`AUTHORISE — Pomelli internal activation`); this proposal does **not** activate anything.

### § 1.2 — What Pomelli actually is (cited)

Sources verified by web search 2026-06-03:

- **Origin:** Experiment from Google Labs, partnership with Google DeepMind. Originally launched late 2025; new agentic features added 2026.
- **Function:** AI marketing-content tool for small-and-medium businesses. Analyzes a website URL, builds a **"Business DNA"** profile (tone of voice, fonts, colors, imagery, brand values), then generates campaign ideas + on-brand creative assets (social posts, product shots, ads, brand books, optional simple website stubs).
- **Workflow:** Three steps — **Analyze** (scan website → Business DNA) → **Ideate** (campaign-idea suggestions or operator prompt) → **Create** (generate assets → download).
- **2026 additions:** **Pomelli Agent** (chat-based DNA refinement), **Brand Books** (style-guide PDF), **Website** stub generation, expanded **Catalog** of products/services.
- **Outputs:** Downloadable image / text / asset bundles. **No direct social-media integration** — operator must download and upload to each platform manually.
- **Sources:**
  - `blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/` (original launch).
  - `blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-agentic-capabilities/` (2026 agentic features).
  - `blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-in-europe/` (EU/UK/Switzerland rollout).
  - `support.google.com/labs/answer/17090488` (official Help — Build your Business DNA & Catalog).
  - `pomelli.help/faq/` and `pomelli.help/how-to-use/` (third-party how-to references).

### § 1.3 — Pricing and availability

| Dimension | Current state (2026-06-03) | Implication for CorpFlowAI |
|---|---|---|
| **Cost** | Free public beta. No subscription, no paid tier, no announced post-beta model. Google has hinted at possible future integration into Google Workspace or Google Ads ecosystem; no commitment. | Zero budget risk for v1 — but **build no workflow that depends on Pomelli being free or even existing.** Treat as an experimental tool. |
| **Region** | Officially: US, Canada, Australia, New Zealand, EU, Iceland, Liechtenstein, Norway, Switzerland, UK. **Mauritius is NOT in the official availability list.** | Anton would need a US (or EU) **VPN** to access Pomelli from Mauritius. Acceptable for an internal generation tool whose outputs are downloaded and used elsewhere; **flag the VPN dependency in the activation packet.** Note: terms of service may restrict use outside supported regions; review Google's terms before activation. |
| **Language** | English only — interface, prompts, generated content. | Acceptable for the Mauritius launch (English is the official business language). Pomelli **cannot** directly generate French or Creole assets. For French-language outreach to specific segments (e.g., real-estate, hospitality), Anton (or a future translation pass) must localise outputs by hand. |
| **Account** | Standard Google account; no waitlist, no invite. | Anton's existing Google account is sufficient. **Do not** use a corporate Google Workspace account that may share Business DNA data with workspace admins / shared-drive policy; use a personal Google account scoped to marketing assets. |
| **Privacy / data** | No published data residency commitments for beta. Generated assets and Business DNA may be retained by Google for service improvement. | **Do not feed real client data, trade secrets, or unannounced product/pricing details into Pomelli.** Treat all Pomelli inputs as if they will appear in a Google blog post tomorrow. Use only public site URL + already-published marketing copy + generic vertical descriptions. |
| **Output disclosure** | Pomelli assets are AI-generated. | Any Pomelli asset used on `https://corpflowai.com/*` must pass through the existing `data/visual-assets/*.manifest.json` pipeline with `AssetProvenanceDisclosure` per `components/VisualAssetRenderer.js`. **No exception.** |

### § 1.4 — Fit assessment: what Pomelli can / cannot do for CorpFlowAI

| Use case | Verdict | Reason |
|---|---|---|
| Generate social-campaign images for the Mauritius launch (Instagram / Facebook / LinkedIn) | ✅ **GOOD FIT** — main intended use | Pomelli's core competency. Anton picks one segment angle per campaign, downloads 5–10 assets, uploads manually to social platforms. |
| Generate hero/product-shot-style imagery for `/lead-rescue` | ⚠️ **CONDITIONAL** | Allowed only via the existing manifest pipeline + provenance disclosure. We already have `lead-rescue-hero` (model `openai/gpt-image-1`, reviewed by `anton@corpflowai.com`). Pomelli outputs would add a second image source, not replace; **no live-page change in this packet.** |
| Generate **Brand Book** PDF as an internal artefact | ✅ **GOOD FIT — internal only** | Useful for outreach consistency; should NOT replace `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — the doctrine doc is canonical and Pomelli-generated brand books are a derivative. |
| Generate cold-outreach copy (LinkedIn, email, WhatsApp) | ❌ **DO NOT USE** | We already have `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` with operator-reviewed copy that honours the brand-conversion doctrine and PAY-SBM-2 wording. Pomelli's text generator does not know the doctrine constraints (no "AI" first, no payment claims, etc.); using it for outreach copy risks doctrine violations. |
| **Replace** `/lead-rescue` with Pomelli's website builder | ❌ **DO NOT USE** | We have a Next.js production page with full intake form (`/api/tenant/intake`), governed visual manifests, provenance disclosure, USD-150-single-offer compliance, Plausible instrumentation. Pomelli's website feature is for businesses with no online presence. |
| Use Pomelli as CRM, lead-capture form, or automation engine | ❌ **EXPLICITLY FORBIDDEN** (per Anton's DECISION) | Pomelli has zero CRM features, zero form back-end, no integrations. This is not a real risk — Pomelli's product doesn't even attempt it — but recording the rule explicitly prevents scope creep. |
| Source of truth for brand identity, pricing, USD-150 offer, support SLA | ❌ **DO NOT USE** | Canonical sources stay in-repo: `BRAND_AND_CONVERSION_DOCTRINE.md` (brand), `JE-2026-05-28-1` (offer), `pages/terms.js` + PAY-SBM-2 live page (legal). |
| Inputs for ERPNext production work | ❌ **DO NOT USE** | This sprint is fully separated from finance/accounting productionisation per Anton's DECISION. |

### § 1.5 — Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | Pomelli generates an asset that contradicts the brand-conversion doctrine (e.g., includes "AI-powered automation" language, fake testimonials, revenue guarantees) | Every Pomelli output gets a **doctrine review pass** before use: re-read `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*. Discard the asset if it violates §1.2 single-offer rule or §1.4 forbidden phrases. |
| R2 | Beta product is paused / closed / paywalled by Google | Operator-only workflow; CorpFlowAI's customer-facing surfaces do not depend on Pomelli. Worst case = lose a generation tool. |
| R3 | VPN access from Mauritius violates Google ToS | Anton reviews Pomelli's terms-of-service before activation. If the ToS is regionally restrictive, **defer activation** until a supported region is available. Document the ToS check in the activation packet. |
| R4 | Pomelli's Business DNA captures sensitive details from `corpflowai.com` (e.g., a half-published price the doctrine has not approved) | Before scanning, confirm `corpflowai.com` contains **only** public, doctrine-approved content. Today's apex is PAY-SBM-2-compliant — safe to scan. |
| R5 | Pomelli-generated client likeness / location imagery looks "Mauritian" but is generic-AI — risks misleading buyers | Apply existing `AssetProvenanceDisclosure` rendering rule. Never claim a Pomelli asset depicts a real CorpFlowAI client. |
| R6 | English-only outputs deepen the existing language gap for French-first prospects | Treat Pomelli as the **English-only** generation tool. For French outreach, generate text in Pomelli, translate by hand (or use Google Translate as a draft), then doctrine-review the result. |
| R7 | Asset proliferation without audit trail | Every Pomelli-derived asset committed to the repo gets a `data/visual-assets/*.manifest.json` entry recording the Pomelli session ID (if available), the operator who approved it, and the model / prompt context. Matches existing `lead-rescue-hero-photography` manifest pattern. |

### § 1.6 — Recommended posture

**HOLD activation.** This packet records the viability assessment and the constraints. **Activation requires a separate Anton DECISION** titled *"AUTHORISE — Pomelli internal marketing-studio activation"* containing:

- Anton's VPN-region choice (US or EU) and confirmation that he has reviewed Pomelli's terms-of-service for that region.
- Confirmation that the Google account used for Pomelli is a personal account, not a Workspace account with shared data policies.
- Scope: **internal-only** (no Pomelli assets on the live `/lead-rescue` page without a separate UI-edit DECISION).
- First-asset target: one Mauritius launch campaign brief (e.g., property segment), 5–10 social images, no copy generation.

---

## § 2 — Current Lead Rescue surface inventory

### § 2.1 — URLs (live)

| URL | Purpose | Status (verified 2026-06-03) |
|---|---|---|
| `https://corpflowai.com/lead-rescue` | Primary apex marketing landing | **200** — PAY-SBM-2-compliant copy live; 41 KB HTML; CSS animations on; intake form posts to `/api/tenant/intake` |
| `https://aileadrescue.corpflowai.com/` | Dedicated subdomain (renders the same component) | Same component; deferred to Plausible step-2 per `JE-2026-05-27-1` |
| `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` | CF-VID-0001 walkthrough validation asset | Live |
| `https://corpflowai.com/assets/visuals/lead-rescue-trust.svg` | Trust ribbon | Live (post-`JE-2026-05-28-3` USD-launch-pilot wording) |

### § 2.2 — Repo files / components (current main `689912f6`)

| Path | Role | Touch-rule |
|---|---|---|
| `pages/lead-rescue.js` | Apex route; renders `AiLeadRescueLanding` with manifest-selected visual assets via `getStaticProps` | This packet: no change. Future copy/tracking PRs: minor edits allowed. |
| `pages/index.js` | Apex homepage | This packet: no change. |
| `components/AiLeadRescueLanding.js` | Sole rendering component for both `/lead-rescue` and `aileadrescue.corpflowai.com` | This packet: no change. Future copy/tracking PRs: scoped edits allowed per § 4 below. |
| `components/PublicSiteFooter.js` | Footer with PAY-SBM-2 merchant identity | This packet: no change. |
| `components/VisualAssetRenderer.js` | Renders manifests with `AssetProvenanceDisclosure` for AI assets | This packet: no change. Required for any future Pomelli asset. |
| `components/AssetProvenanceDisclosure.js` | "About this visual" disclosure block | This packet: no change. Required for any future Pomelli asset. |
| `data/visual-assets/lead-rescue-hero.manifest.json` | Hero image manifest (model `openai/gpt-image-1`) | This packet: no change. |
| `data/visual-assets/lead-rescue-process.manifest.json` | Process band manifest | This packet: no change. |
| `data/visual-assets/lead-rescue-dashboard.manifest.json` | Dashboard preview manifest | This packet: no change. |
| `data/visual-assets/lead-rescue-trust.manifest.json` | Trust ribbon manifest | This packet: no change. |
| `data/visual-assets/lead-rescue-social-card.manifest.json` | OG/Twitter card manifest | This packet: no change. |
| `lib/visualAssets/loadManifest.js` + `selectLeadRescueAssets.js` | Static-prop manifest selection logic | This packet: no change. |
| `lib/server/tenant-intake.js` | `/api/tenant/intake` server handler — accepts intake POST + emits `tenant.lead.captured` + `corpflow.lead_rescue.intake_received` events | This packet: no change. |
| `lib/analytics/config.js` | Plausible v1 ALLOW_HOSTS / APEX_DENY_PATH_PREFIXES | This packet: no change. `corpflowai.com` is the only allowed host in step-1 (`JE-2026-05-27-1`); `/lead-rescue` is the apex marketing surface that **is** measured. |
| `components/analytics/PlausibleScript.js` | Standard `script.js` + `data-domain="corpflowai.com"` mount | This packet: no change. |
| `pages/_app.js` | Where `PlausibleScript` mounts | This packet: no change. |
| `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` | Canonical doctrine — single-offer rule, hero CTA, payment-trust copy, no-guarantee copy | This packet: cross-referenced; no change. |
| `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` | Friday warm-network outreach copy (merged PR #282) | This packet: cross-referenced; cold-outreach variants in § 7 extend this doc, not replace. |
| `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` | Pre-proof posture | This packet: cross-referenced; pre-proof rule preserved (no testimonials, no logos, no revenue guarantees). |
| `docs/marketing/00..05*.md` | Marketing-execution standards (Hook / Proof / Depth, Output Contract, Multimodal Playbook, Atom Schema, Delivery Quality Gate, Compulsion Mechanism) | This packet: cross-referenced; quality gate `npm run check:marketing-quality-gate` enforced on every PR. |

### § 2.3 — Current intake-event surface

`lib/server/tenant-intake.js` (read-only, no change in this packet) emits **two automation events on every successful `/lead-rescue` intake**:
- `tenant.lead.captured` — to the tenant operator console (`AiLeadRescueAdmin*` UI).
- `corpflow.lead_rescue.intake_received` — to the CorpFlowAI factory operator side.

This is the existing event surface. **Pomelli does not interact with this surface.** Any tracking events recommended in § 8 are **front-end Plausible custom events** layered on top of this; they do not affect intake delivery.

---

## § 3 — Cold-Mauritian-prospect landing-page conversion audit

**Audit lens:** A cold Mauritian SMB owner (property / clinic / contractor / hospitality vertical), arriving from a paid Google ad / Facebook ad / segment-specific cold-outreach link, on mobile, has never heard of CorpFlowAI before, decides within ~5 seconds whether to scroll.

**Reference:** existing live page text per § 2.1 verification (2026-06-03, 200 OK, 41 KB HTML).

### § 3.1 — Strengths (preserve as-is)

| # | Strength | Where |
|---|---|---|
| S1 | Hero leads with named buyer pain, not technology hype | *"Stop losing leads because follow-up is too slow."* |
| S2 | Single primary CTA action verb | *"Start my 48-hour setup"* |
| S3 | Concrete numbers throughout | USD 150 / 48 hours / 7 days / 2 business hours / one named contact |
| S4 | Single-offer rule honoured | One offer block, no tier confusion, no region tabs |
| S5 | Explicit "no card on this page" hard guard | Hero badge + intake-form footer |
| S6 | "Who this is for" buyer-self-identification block | 5 bullets covering channels Mauritian SMBs actually use (website, WhatsApp, email, Facebook, listings) |
| S7 | "What problem we solve" body copy is buyer-language, not internal-jargon | *"Most small businesses do not lose leads because they lack a website. They lose leads because enquiries arrive in different places and follow-up depends on memory."* |
| S8 | 3-step process explanation matches what gets delivered | Step 1 connect / Step 2 alert+log / Step 3 daily summary |
| S9 | "What is not included" + "What is not guaranteed" is honest and earns trust | Doctrine-required no-revenue-guarantee statement is present |
| S10 | Walkthrough video (CF-VID-0001) supports proof in pre-proof window | Already in page (manifest-driven) |
| S11 | Asset provenance disclosure for AI-generated visuals is present | "About this visual" block |
| S12 | Payment design clearly described | "How payment works" section explicitly says invoice after intake review; USD currency confirmed |
| S13 | Support email + SLA visible | `support@corpflowai.com` + 2-working-day acknowledgement (PAY-SBM-2-compliant) |
| S14 | Single-question intake form fields | Business name, your name, email, phone/WhatsApp, lead sources, follow-up problem |

### § 3.2 — Cold-Mauritian-prospect gaps (G1–G12, ranked by conversion impact)

| # | Gap | Conversion impact | Severity | Fix path |
|---|---|---|---|---|
| G1 | **No "Mauritius-based" trust signal visible above the fold.** A cold Mauritian prospect doesn't know we're local. Existing doctrine line *"Built by a Mauritius-based operating-systems team"* is allowed (`AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § Voice rules 9) but not yet on the page. | **HIGH** — local-trust signal is the single strongest reason a cold Mauritian SMB would scroll past 5-second bounce | HIGH | § 4 P-1 small copy edit |
| G2 | **No Plausible custom events on hero CTA, "See how it works" link, or intake submission.** Plausible v1 only captures pageviews; bounce rate / time-on-page / scroll depth / button-click conversion are not measured. | **HIGH** — without click + submit events, cold-traffic launch has no way to measure landing-page conversion vs. just "did they land?" | HIGH | § 8 P-2 small tracking-event PR |
| G3 | **Hero has dual CTA above the fold** (*"Start my 48-hour setup"* + *"See how it works"*). Best practice on cold pages is single primary CTA + secondary CTA as a tertiary link. | **MEDIUM** — competing-CTA dilution is well-documented on cold traffic | MEDIUM | § 4 P-3 small copy edit (re-style "See how it works" as tertiary text-link, keep functionality) |
| G4 | **No "Why now?" anchor.** The launch-pilot price is implicit, not narrated. Cold prospects ask *"why this week instead of next month?"* — a short *"Launch pilot — first 10 buyers at USD 150; production price after that"* or similar would create scarcity without revenue claims. | **MEDIUM** — soft scarcity is doctrine-compatible if framed as pilot-window honesty, not fake urgency | MEDIUM | § 4 P-4 small copy edit, gated by Anton confirming the production-price commitment (if not, omit) |
| G5 | **No mobile-WhatsApp-alert preview.** Mauritian SMBs live on WhatsApp; the page mentions WhatsApp as a lead source 4 times but doesn't visually preview what an alert looks like on WhatsApp. | **MEDIUM** — preview-the-outcome is a high-leverage trust pattern | MEDIUM | § 4 P-5 future packet — needs a new visual manifest (could be Pomelli-generated under R5 mitigation rules) |
| G6 | **Refund / cancellation policy not surfaced where the buying decision is made.** Footer link to `/refund-policy` is correct, but on a cold page the "what if I'm not satisfied?" question is answered at intake-form time, not by clicking out. | **MEDIUM** | MEDIUM | § 4 P-6 small copy edit — one sentence in the intake-form card with a link to `/refund-policy` |
| G7 | **No segment-specific copy variants.** The single page serves property / clinics / contractors / hospitality — cold segment-specific ad traffic lands here without segment confirmation, weakening conversion. | **MEDIUM** | MEDIUM | § 5 P-7 segment-specific copy variant blocks (page-level or as `?segment=property` query-string-driven swap, behind a future flag) — design only in this packet |
| G8 | **No "Powered by CorpFlowAI" backstory link.** A cold prospect lands and sees the CorpFlowAI brand once in the nav. *"Who is behind this?"* answer is one click away (`/about`) but not surfaced. | **LOW** | LOW | § 4 P-8 small nav-level addition (e.g., "About the team" tertiary link) |
| G9 | **Intake form has no progressive disclosure.** Six fields visible at once on mobile. Cold prospect may bounce on form length. | **LOW–MEDIUM** | LOW | § 4 P-9 future packet — two-step form (name+email → rest); needs A/B method or just-launch v1.1 |
| G10 | **No French-language affordance.** English-only page; some Mauritian segments (real-estate, hospitality, contractors in rural areas) operate primarily in French. A single line *"Questions in French? WhatsApp us — we reply in your language."* would reduce friction without translating the whole page. | **LOW–MEDIUM** | LOW | § 4 P-10 small copy edit |
| G11 | **OG/Twitter card description mentions "instant alerts" without naming Mauritius.** Could be a stronger local hook. | **LOW** | LOW | § 4 P-11 small `<Head>` edit |
| G12 | **Hero badge order is awkward on mobile.** *"USD 150 launch pilot · 48-hour setup · no card on this page"* compresses on a small viewport. | **LOW** | LOW | § 4 P-12 small CSS edit (separator wrap rule) |

**Summary:** Hero is well-tuned for warm-network conversion (doctrine-compliant, single offer, honest); 2–3 specific edits would tighten cold-Mauritian-prospect conversion. No structural rebuild; small copy + tracking PRs gated by separate DECISIONs.

---

## § 4 — Recommended first-pass copy / CTA improvements (P-1 to P-12 proposals only)

Each proposal below is **a draft change** for a future PR — **not** included in this packet's diff. Each landing PR requires its own DECISION + its own marketing-quality-gate pass.

| # | Proposal | Diff target | Doctrine check | Anton's call |
|---|---|---|---|---|
| P-1 | Add Mauritius-trust line above the hero CTA buttons | `components/AiLeadRescueLanding.js` ~line 220 (badge area) | Doctrine § *AI Lead Rescue doctrine* allows *"Built by a Mauritius-based operating-systems team"* — HQ fact, not a pricing/clientele claim | DECIDE: include in v1.1 copy PR? |
| P-2 | Add 4 Plausible custom events: `lr_hero_cta_click`, `lr_secondary_cta_click`, `lr_intake_submit_success`, `lr_intake_submit_fail` | `components/AiLeadRescueLanding.js` button `onClick` + form `submitLead` | Doctrine § *Tracking and measurement* — no PII in event names/props; just event-name + page+anchor | DECIDE: include in v1.1 tracking PR? |
| P-3 | Re-style hero "See how it works" as tertiary text-link (no border button) below primary CTA, keep `href="#how-it-works"` | `components/AiLeadRescueLanding.js` line ~227 | Doctrine § *Hero CTA* — single primary CTA is the rule | DECIDE: include? |
| P-4 | Add a soft "Why now?" line near the hero offer card: *"This is a launch pilot — limited intake spots while we publish the first paying-pilot case study."* | `components/AiLeadRescueLanding.js` line ~242 (muted paragraph below the launch-offer card) | Doctrine § *Honest pre-proof posture* — must NOT say "buy now / expires Friday / X spots left in 24 hours" or any fake scarcity. Soft-scarcity acceptable only if it is **true**. | DECIDE: only if Anton confirms launch-pilot is genuinely scope-limited |
| P-5 | Add a mobile-WhatsApp-alert preview visual (new manifest under `data/visual-assets/lead-rescue-wa-alert-preview.manifest.json`) | New manifest + `<LeadRescueSlot />` insertion before § "What happens after intake" | Doctrine § *Visual standards + asset provenance* — `AssetProvenanceDisclosure` required if AI-generated. Could be Pomelli output under § 1 R5 mitigation rules. | DECIDE: separate visual-asset packet later |
| P-6 | Add a one-sentence refund-link statement in the intake-form card: *"Not satisfied within 7 days? See our refund-and-cancellation policy."* with link to `/refund-policy` | `components/AiLeadRescueLanding.js` line ~445 (intake form below the existing fineprint) | Doctrine § *Honest limits* — must NOT promise unconditional refund. Existing `/refund-policy` is doctrine-compliant; linking it inline is safe. | DECIDE: include? |
| P-7 | Design (not implement) segment-specific copy variant blocks for property / clinics / contractors / hospitality via `?segment=property` query-string-driven swap | Future packet — file path TBD; would add `lib/segments.js` + minor `pages/lead-rescue.js` props passthrough; **out of scope for this packet** | Doctrine § *Vertical-specific variants* in `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § 7 — the variants exist as outreach copy; lifting them to the page is the design ask | DECIDE: separate packet `LR-Segment-Variants-1` |
| P-8 | Add tertiary "About the team" nav link pointing to `/about` | `components/AiLeadRescueLanding.js` line ~210 (nav block) | Doctrine § *Single primary CTA per page* — secondary nav links are OK if they don't compete with the primary CTA visually | DECIDE: include? |
| P-9 | Two-step intake form (name+email step 1, business+phone+lead-sources+message step 2) | Future packet — needs proper UI design + A/B method decision; **out of scope for this packet** | Doctrine § *Friction reduction without doctrine drift* | DECIDE: separate packet `LR-Intake-Form-V1.1` |
| P-10 | Add French-language affordance line in the intake-form card: *"Questions in French / Creole? WhatsApp us — we reply in your preferred language."* | `components/AiLeadRescueLanding.js` line ~447 (below fineprint) | Doctrine § *Mauritius identity is OK* | DECIDE: only if Anton commits to actually responding in French/Creole on WhatsApp |
| P-11 | OG/Twitter description update — add *"Mauritius-based team"* hook | `components/AiLeadRescueLanding.js` lines ~193, 199, 204 (3 description meta tags) | Doctrine § *Honest claims only* | DECIDE: include? |
| P-12 | Hero badge wrap rule on small viewports (CSS-only, no copy change) | `components/AiLeadRescueLanding.js` styles block | Doctrine-neutral; pure layout | DECIDE: include (combine with P-2 / P-3 in v1.1)? |

### § 4.1 — Suggested PR sequence

1. **Cold-Sprint-V1-Copy** (P-1, P-3, P-6, P-11, P-12) — small page-copy + minor CSS edits, no new visuals, no new tracking. Most-value-per-line edits. Requires Anton's DECISION to land. **Marketing-quality-gate enforced.**
2. **Cold-Sprint-V1-Tracking** (P-2) — Plausible custom-event additions only. Separable from copy work for surgical review. Requires Anton's DECISION.
3. **Cold-Sprint-V2-Backstory-Refund-Lang** (P-4, P-8, P-10) — soft-scarcity + about-team-link + French-affordance. Requires Anton's confirmations (scarcity is true, French-WhatsApp commitment, etc.).
4. **Cold-Sprint-V3-Visuals** (P-5) — new mobile-WhatsApp-alert preview manifest. Could use Pomelli output if § 1.6 activation has happened by then.
5. **Cold-Sprint-V4-Segments** (P-7) — segment-specific copy-swap design and implementation.
6. **Cold-Sprint-V5-Form-V1.1** (P-9) — two-step form, A/B-method-aware.

**None of these are in this packet's diff.** This packet is pure proposal.

---

## § 5 — Segment-specific campaign angles (4 verticals)

Each angle below is a **campaign brief** for one channel-specific cold-prospect campaign. Reuse the existing `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § 7 vertical-specific outreach copy as the message base; this section gives the campaign frame.

### § 5.1 — Property / real-estate / rentals (Mauritius)

| Field | Value |
|---|---|
| **Audience** | Mauritius property agents, individual landlords with 2+ rentals, holiday-rental managers (Grand Baie / Trou aux Biches / Tamarin / Black River) |
| **Top pain (cold prospect lens)** | Listing-portal enquiries (Lexpress Property, lamaisonmoderne.mu, Lexpress Annonces, Facebook Marketplace, WhatsApp groups) arrive faster than agents can respond on weekends; lost-deal-because-no-reply-in-30-minutes is a known frustration |
| **Hook line (cold copy)** | *"How much rental income did your team lose this month because a WhatsApp enquiry waited 6 hours for a reply?"* |
| **Specific offer angle** | USD 150 launch pilot, connect WhatsApp business OR Lexpress Property contact-form OR Facebook Marketplace, daily summary of new enquiries + follow-ups |
| **Trust signal** | Pre-proof: USD 150 is the launch-pilot price *because* we are publishing the first paying-pilot case after they complete — honest scarcity |
| **Forbidden** | Don't claim percentage uplift in rentals signed (`AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § Voice rule 8) |
| **Pomelli asset brief (if activated)** | 5 Instagram-square assets: phone-on-table-with-WhatsApp-enquiry visual (warm tropical palette to match Mauritius market); 3 LinkedIn-landscape variants for cold-DM image post; 1 Facebook-feed asset; English text only |
| **Channel mix** | LinkedIn cold DM (agents+brokers) + WhatsApp warm-introduction (only when introduced by mutual contact) + 1 Facebook Marketplace observation post (no DM solicitation) |

### § 5.2 — Clinics / wellness / dental / beauty (Mauritius)

| Field | Value |
|---|---|
| **Audience** | Independent clinics, group-1 dental practices, beauty + wellness studios (Quatre Bornes, Curepipe, Floréal, Ebene, Grand Baie) |
| **Top pain** | New-patient booking enquiries via Instagram DM / Google Business Profile / WhatsApp — receptionist misses one in three after hours and on Sundays |
| **Hook line** | *"How many new-patient enquiries are sitting unread in your Instagram inbox right now?"* |
| **Specific offer angle** | USD 150 launch pilot, connect Instagram DM (via Meta Business) OR Google Business Profile messages OR WhatsApp, owner gets daily summary at 8 AM |
| **Trust signal** | Honest pre-proof + USD-150-because-pilot framing |
| **Forbidden** | Don't claim health outcomes; don't suggest the tool replaces a real-receptionist relationship for clinical conversations |
| **Pomelli asset brief (if activated)** | 5 Instagram-feed assets in clinic palette (clean white + sage); 3 stories-format variants showing phone notification preview; 1 Facebook ad; English |
| **Channel mix** | Instagram cold DM (only to commercial accounts with public DM-open setting) + LinkedIn for clinic owners + Google Business Profile reviewer-tier observation |

### § 5.3 — Contractors / home-services / renovation / solar / security (Mauritius)

| Field | Value |
|---|---|
| **Audience** | Independent contractors, solar-installation companies, renovation outfits, home-security installers (Quatre Bornes, Port Louis North, Albion, Mahebourg) |
| **Top pain** | Quote-request enquiries via website form / Lexpress / WhatsApp / phone — owner is on-site and can't reply for 4+ hours; the prospect has already called 2 competitors by then |
| **Hook line** | *"You showed up on time to quote. The customer is already talking to two other contractors who replied faster on WhatsApp."* |
| **Specific offer angle** | USD 150 launch pilot, connect website form OR WhatsApp Business OR Lexpress Annonces, owner gets instant Telegram alert + daily lead log + follow-up status board |
| **Trust signal** | "We've built operations systems for Mauritius businesses since 2025" — HQ fact, allowed |
| **Forbidden** | Don't claim construction-quality or compliance certifications |
| **Pomelli asset brief (if activated)** | 5 Facebook-feed assets, masculine work-glove palette (tools / hard-hat / phone notification mix); 3 LinkedIn cold-DM image options; 1 WhatsApp-status image; English |
| **Channel mix** | LinkedIn cold DM + WhatsApp cold introduction (only via mutual-contact bridge) + Facebook Marketplace observation |

### § 5.4 — Hospitality / boutique-hotel / villa-rental / restaurant (Mauritius)

| Field | Value |
|---|---|
| **Audience** | Boutique hotels (1–8 rooms), independent villa managers (Tamarin / Bel Ombre / Belle Mare), restaurant owners running their own bookings (avoiding OTA fees) |
| **Top pain** | Booking enquiries arrive via Instagram DM / website / Booking-host inbox / WhatsApp — owner answers when the kitchen / restaurant rush ends, by which time the guest has booked elsewhere |
| **Hook line** | *"How many last-minute Mauritius booking enquiries reached your inbox this week — and how many got a same-evening reply?"* |
| **Specific offer angle** | USD 150 launch pilot, connect WhatsApp + Instagram DM + website form, owner gets evening summary at 6 PM (before kitchen / restaurant rush) and morning summary at 8 AM |
| **Trust signal** | Honest pre-proof + 7-day pilot monitoring |
| **Forbidden** | Don't claim revenue uplift, room-night uplift, or RevPAR improvement |
| **Pomelli asset brief (if activated)** | 5 Instagram-feed assets, hospitality palette (warm sand / sea-green); 3 stories-format with WhatsApp-alert preview; 1 LinkedIn cold-DM image option; English |
| **Channel mix** | Instagram cold DM (only on commercial accounts) + LinkedIn for hotel owners / GMs + organic Facebook commercial observation |

---

## § 6 — Cold outreach variants (channel × vertical matrix)

This section **extends** `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (warm-network) into cold-prospect variants. Reuse the existing § 1–§ 6 base copy + § 7 vertical variants of that doc; this section adds the **cold-prospect modifications**.

### § 6.1 — LinkedIn cold DM (after connection accepted)

| Variant | Difference from warm DM |
|---|---|
| **Cold opener** | Add **one** observed-on-LinkedIn-profile detail (e.g., *"Saw you run [company name] — your team's reply speed on WhatsApp is doing a lot of work."*) — proves it's not a templated blast. **Do NOT mention** that the prospect is on a cold list. |
| **No first link** | Same rule as warm: no `https://corpflowai.com/lead-rescue` link in the first message. Wait for the prospect to ask. |
| **Hook + 1-line ask** | *"Quick question — do enquiries from WhatsApp / your website / Facebook ever slip through?"* |
| **Soft CTA** | *"If yes, I'll send you a 1-page summary of how we solve it for [vertical] businesses in Mauritius. No call required."* |
| **Forbidden** | No "pay now", no "instant", no "AI-powered automation", no revenue claim, no fake testimonial, no logos-of-clients |

### § 6.2 — WhatsApp cold (introduction-via-mutual-contact only)

**Hard rule:** **never** send a cold WhatsApp DM to a number without prior consent or mutual-introduction. This violates Mauritian Data Protection Act, Meta WhatsApp Business policies, and CorpFlowAI's own doctrine.

| Variant | Difference from warm WhatsApp |
|---|---|
| **First line** | *"Hi [Name], [mutual contact] mentioned you might be interested — quick context, no pitch."* |
| **Body** | 2–3 lines: named-pain + offer + link to `/lead-rescue`. |
| **Optional French opener** | *"Bonjour [Name], [mutual contact] m'a parlé de votre activité — voici le résumé en 30 secondes."* |
| **No follow-up without reply** | If no reply in 5–7 days, **stop**. No second WhatsApp DM. Move to LinkedIn or email if Anton has a verified business email. |

### § 6.3 — Cold email (verified business-email-only; no mass send)

| Variant | Difference from warm email |
|---|---|
| **Subject line** (pick one) | *"Mauritius lead enquiries — one-time pilot"* · *"WhatsApp enquiries that slipped through"* · *"USD 150 launch pilot for [vertical]"* · *"Reply speed in [vertical] — quick read"* |
| **Body opener** | *"Hi [Name], I'm Anton at CorpFlowAI — we're a Mauritius-based operating-systems team. Quick context, no pitch."* |
| **Body** | One paragraph of named-pain + one paragraph of offer + one bullet list of what's included (reuse the launch-offer block verbatim from `AiLeadRescueLanding.js` line 234–241) + one link to `https://corpflowai.com/lead-rescue` |
| **Single CTA** | *"If this fits, the intake form is on `/lead-rescue` — we review every intake within 2 business hours."* |
| **Sender alias** | `support@corpflowai.com` (per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`) |
| **No tracking pixel** | Don't add open-tracking pixels to cold email; it's a Mauritian DPA risk and a CAN-SPAM-style risk for US/UK contacts. Plausible custom events from the click-through on `/lead-rescue` are sufficient. |
| **Follow-up cadence** | One follow-up after 5 working days. If no reply, **stop**. |

### § 6.4 — Cold-call opener (warm-network only; not in v1 outreach mix)

**Hard rule:** **no cold phone calls** in v1. Mauritian SMB calling without consent is high-friction and damages brand perception. **Defer cold-call channel to a future packet** if/when warm-network results indicate demand.

If a prospect requests a call after WhatsApp / LinkedIn / email, the opener should be:

> *"Hi [Name], Anton from CorpFlowAI here. Thanks for coming back. Two minutes — what's the lead-enquiry channel that's hurting most right now? Then I'll tell you whether the 48-hour pilot fits or not."*

No script beyond that — let the prospect speak. The pilot is honestly USD 150 with 48-hour setup; there's no upsell on the call.

### § 6.5 — Channel-discipline summary

| Channel | When to use (cold) | When NOT to use (cold) |
|---|---|---|
| LinkedIn DM | After connection accepted; profile-specific opener | Mass-templated; profile-pic + no-content profiles |
| WhatsApp | Mutual-introduction only | Never on a number without prior consent |
| Cold email | Verified business email only; ≤ 20 per week (operator-handled) | Mass-blast (>20/week); purchased lists; tracking pixels |
| Cold call | Never in v1 | Always — defer to future packet |
| Facebook DM | Commercial pages with DM-open | Personal-profile DMs |
| Instagram DM | Commercial accounts with DM-open | Personal-profile DMs |
| SMS | Never | Always — Mauritian DPA risk |

---

## § 7 — Tracking / analytics gaps

### § 7.1 — Current Plausible v1 instrumentation (verified)

| Layer | What's tracked | Source |
|---|---|---|
| Pageview on `https://corpflowai.com/lead-rescue` | ✅ Tracked | `lib/analytics/config.js` ALLOW_HOSTS = `['corpflowai.com']`; `pages/lead-rescue.js` is apex marketing surface; `components/analytics/PlausibleScript.js` mounts standard `script.js` + `data-domain="corpflowai.com"` via `pages/_app.js`. |
| Referrer / UTM (page-level) | ✅ Tracked (Plausible default) | Plausible captures `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term` on every pageview by default. |
| Pageview on `https://aileadrescue.corpflowai.com/` (dedicated subdomain) | ❌ **Not tracked yet** | Subdomain `aileadrescue.corpflowai.com` is **not** in `ALLOW_HOSTS` (deferred to Plausible step-2 per `JE-2026-05-27-1`). |
| Hero "Start my 48-hour setup" CTA click | ❌ **Not tracked** | `components/AiLeadRescueLanding.js` button has no `onClick` Plausible call (line 226). |
| Hero "See how it works" link click | ❌ **Not tracked** | Same — anchor link with no Plausible custom event (line 227). |
| Nav "Start the 48-hour setup" CTA click (nav-level) | ❌ **Not tracked** | Same — anchor link with no Plausible custom event (line 215). |
| Final CTA "Request AI Lead Rescue setup" form submit success | ❌ **Not tracked** | `submitLead` handler (line 156–185) does not call Plausible. |
| Intake submit failure | ❌ **Not tracked** | Same. |
| Scroll depth | ❌ **Not tracked** | Plausible standard script does not capture scroll depth without additional configuration; not in v1 install. |
| Outbound click (e.g., walkthrough video, refund-policy footer link) | ❌ **Not tracked** | Plausible outbound-link tracking requires switching the script tag (script.outbound-links.js) — not in v1 install. |
| File download (walkthrough video) | ❌ **Not tracked** | Same — needs file-downloads script variant. |
| Form-field-abandonment | ❌ **Not tracked** | Same — needs custom JS. |

### § 7.2 — Cold-launch tracking gaps (G-T1 to G-T6)

| # | Gap | Why it matters for cold launch | Recommended fix |
|---|---|---|---|
| G-T1 | Hero CTA click not measured | A cold-traffic launch needs to know *click-rate-on-hero* to compare campaign sources (LinkedIn vs Facebook ad vs email cold). Without this, we know only "did they land" not "did they engage". | Plausible custom event `lr_hero_cta_click` with prop `{ location: 'hero' \| 'nav' \| 'final' }`. § 8 P-2. |
| G-T2 | Intake-form submit success not measured | We don't know landing-page → intake conversion ratio. Postgres `leads` row count + Plausible session count gives partial answer; explicit event makes it precise. | Plausible custom event `lr_intake_submit` with prop `{ outcome: 'success' \| 'fail' }`. § 8 P-2. |
| G-T3 | No segment dimension on events | We can't tell which segment campaign drove the intake submit. | Plausible custom-prop `{ segment: 'property' \| 'clinics' \| 'contractors' \| 'hospitality' \| 'other' }` derived from `?segment=` query string. § 8 P-7. |
| G-T4 | No scroll-depth on `/lead-rescue` | Cold prospect scroll-behaviour identifies which page sections cost engagement. | Plausible "tagged events" with scroll-depth thresholds at 25/50/75/100 — requires switching to `script.tagged-events.js` variant. § 8 future packet. |
| G-T5 | No outbound-link tracking on walkthrough video / `/refund-policy` / `/terms` / `/privacy` / `support@corpflowai.com` mailto | Cold prospects who don't submit may still engage with proof / legal artefacts; outbound clicks are a meaningful intent signal. | Switch Plausible script to `script.outbound-links.js` variant. § 8 future packet. |
| G-T6 | No GoogleSearchConsole instrumentation visible on the page (no `<meta name="google-site-verification">`) | Cold launches benefit from organic search traffic; SC verification is the entry point. | Add Search Console verification meta tag — requires Anton to claim the property first. § 8 future packet, gated by `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`. |

### § 7.3 — Recommended event taxonomy (proposal)

**Goal:** add 4 custom events to `/lead-rescue` with one optional dimension. **No PII** in event names or props (no email, no name, no phone, no IP, no fingerprint). All event names lowercased, snake_case.

| Event name | Trigger | Props |
|---|---|---|
| `lr_cta_click` | Any "Start my 48-hour setup" / "Start the 48-hour setup" / "Request AI Lead Rescue setup" button or link click | `{ location: 'nav' \| 'hero' \| 'final_form' \| 'how_it_works_link' }` |
| `lr_intake_submit` | Submit handler resolves | `{ outcome: 'success' \| 'fail' }` |
| `lr_video_play` | Walkthrough video play event | `{}` (no props v1) |
| `lr_segment_landing` | Page mount when `?segment=` query string is set | `{ segment: 'property' \| 'clinics' \| 'contractors' \| 'hospitality' \| 'other' }` |

This is **proposal only** — no code change in this packet. See § 9 for the engineer handoff that turns this into a small implementation packet (`Cold-Sprint-V1-Tracking`).

---

## § 8 — Minimal PR plan

This packet is **docs-only**. No subsequent PR is assumed — every follow-up requires Anton's separate DECISION. The PR plan below is a **map**, not a commitment.

| # | PR | Type | Scope | Gates | Cost |
|---|---|---|---|---|---|
| **PR-A** | **This PR** | docs-only | New `docs/marketing/POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1.md` + JOURNAL row + chat_history sentinel | Already in motion; CI green expected | Zero risk to live site |
| PR-B | **Cold-Sprint-V1-Copy** | small page-copy | P-1, P-3, P-6, P-11, P-12 from § 4 (Mauritius-trust line, hero CTA hierarchy, refund inline, OG-description, hero badge wrap) | Requires Anton DECISION; marketing-quality-gate; per-line doctrine review; full live-page production smoke after merge per `.cursor/rules/delivery-reality.mdc` | Low risk; ~30–50 lines edited |
| PR-C | **Cold-Sprint-V1-Tracking** | small instrumentation | P-2 / § 7.3 — 4 Plausible custom events + 1 segment prop | Requires Anton DECISION; node-tests pass; Plausible dashboard verification post-merge | Low risk; ~20 lines added |
| PR-D | **Cold-Sprint-V2-Backstory-Refund-Lang** | small page-copy | P-4 + P-8 + P-10 — "Why now" line + about-team nav link + French affordance | Requires Anton DECISIONs on launch-pilot scarcity truthfulness + French-WhatsApp commitment | Low risk |
| PR-E | **Cold-Sprint-V3-Visuals** | new visual manifest | P-5 — mobile-WhatsApp-alert preview manifest | Requires either Pomelli activation (gated by `AUTHORISE — Pomelli internal marketing-studio activation`) OR existing `openai/gpt-image-1` pipeline | Medium risk — visual asset needs operator review |
| PR-F | **Cold-Sprint-V4-Segments** | new code | P-7 — `?segment=` query-string-driven copy swap + segment dim on Plausible | Requires Anton DECISION; new tests for segment validation | Medium risk |
| PR-G | **Cold-Sprint-V5-Form-V1.1** | UX change | P-9 — two-step intake form | Requires Anton DECISION + A/B method | Medium risk; affects conversion-critical surface |
| PR-H | **Pomelli-Activation-V1** | docs + operator runbook | Records VPN-region choice, ToS check, account-creation steps for Anton's laptop, asset-pipeline integration with existing manifest review | Requires Anton DECISION + ToS review; **NO live-site change** | Zero live-site risk |
| PR-I | **Cold-Outreach-Cold-Copy-V1** | new docs | Cold-prospect outreach copy variants (extends `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § 7 with the § 5 + § 6 vertical-cold variants) | Requires Anton DECISION; marketing-quality-gate; doctrine review | Zero live-site risk |

### § 8.1 — Recommended landing order (if Anton wants to ship a cold sprint)

1. **PR-A** — this packet, docs-only.
2. **PR-C** (Tracking) **before** PR-B (Copy), so we measure the baseline conversion on the copy improvements.
3. **PR-B** (Copy v1) — small surgical edits.
4. **PR-I** (Cold-outreach copy variants) — operator can start cold-outreach with the existing live page + new tracking + new doctrine-compliant copy.
5. **PR-D** (Backstory/Refund/Lang) — fold in after 1–2 weeks of cold-traffic data.
6. **PR-H** (Pomelli activation) — only if Anton wants segment-specific social-campaign images and the existing `gpt-image-1` pipeline isn't producing what's needed.
7. **PR-E** (WhatsApp visual) — visual asset, gated by either Pomelli activation or existing pipeline.
8. **PR-F** (Segments) — after 2–4 weeks of data confirms which segment converts best on cold traffic; segment-swap is overkill if one vertical wins decisively.
9. **PR-G** (Form V1.1) — last in sequence; only if cold-traffic form-completion rate is below target after the copy + tracking + outreach improvements.

**Stopping rule:** if cold-traffic intake conversion rate at PR-B + PR-C + PR-I is already at or above target, don't ship PR-D / PR-E / PR-F / PR-G unnecessarily.

---

## § 9 — Engineer / Cursor handoff

When Anton authorises any of PR-B through PR-G, Cursor (or another engineer) receives this handoff brief.

### § 9.1 — Repository navigation

| Need | File |
|---|---|
| Hero copy, intake form, all `/lead-rescue` markup | `components/AiLeadRescueLanding.js` |
| Apex route + `getStaticProps` + manifest selection | `pages/lead-rescue.js` |
| Subdomain route (renders same component) | `pages/index.js` (with `if (host === 'aileadrescue.corpflowai.com')` branching) |
| Plausible mount | `components/analytics/PlausibleScript.js`, `pages/_app.js` |
| Plausible allowed-hosts + path policy | `lib/analytics/config.js` |
| Intake server handler | `lib/server/tenant-intake.js` |
| Asset manifests | `data/visual-assets/lead-rescue-*.manifest.json` |
| Manifest loader | `lib/visualAssets/loadManifest.js`, `lib/visualAssets/selectLeadRescueAssets.js` |
| Provenance disclosure | `components/AssetProvenanceDisclosure.js`, `components/VisualAssetRenderer.js` |
| Brand doctrine | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| Marketing-execution standards | `docs/marketing/00..05*.md` (6 docs) |
| Communications policy | `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` |
| Footer compliance copy | `components/PublicSiteFooter.js` (PAY-SBM-2 merchant identity) |
| Refund policy | `pages/refund-policy.js` |
| Terms (service fulfilment + payment + tax sections) | `pages/terms.js` |
| Privacy (payment-card transmission section) | `pages/privacy.js` |
| Standards (security posture) | `pages/standards.js` |

### § 9.2 — Per-PR concrete change recipe

#### PR-B (Cold-Sprint-V1-Copy)

| Edit | File | Line (current `main` 689912f6) | Diff intent |
|---|---|---|---|
| P-1 Mauritius trust line | `components/AiLeadRescueLanding.js` | After line 220 (hero badge) | Add `<p style={styles.muted}>Built by a Mauritius-based operating-systems team. We work with clients in Mauritius and internationally.</p>` |
| P-3 secondary CTA → tertiary text-link | `components/AiLeadRescueLanding.js` | Line 227 | Change `<a style={{ ...styles.cta, ...styles.secondary }}` → `<a style={{ ...styles.muted, textDecoration: 'underline', marginLeft: 12 }}` |
| P-6 inline refund link | `components/AiLeadRescueLanding.js` | After line 446 (intake form fineprint) | Add `<p style={{ ...styles.muted, fontSize: 12 }}>Not satisfied within 7 days? See our <a href="/refund-policy" style={{ color: '#7dd3fc' }}>refund and cancellation policy</a>.</p>` |
| P-11 OG description update | `components/AiLeadRescueLanding.js` | Lines 193, 199, 204 | Replace each "USD 150 launch pilot. 48-hour setup..." with "USD 150 launch pilot from a Mauritius-based team — 48-hour setup..." |
| P-12 hero badge wrap rule | `components/AiLeadRescueLanding.js` | `styles.badge` definition line 17 + global style block | Add `flexWrap: 'wrap', gap: 8` to badge style + a `@media (max-width: 360px)` override |

#### PR-C (Cold-Sprint-V1-Tracking)

| Edit | File | Diff intent |
|---|---|---|
| Add helper function | `components/AiLeadRescueLanding.js` (top of file, after imports) | `function track(name, props) { if (typeof window !== 'undefined' && typeof window.plausible === 'function') { try { window.plausible(name, { props }); } catch {} } }` — fail-safe wrapper |
| Hero CTA onClick | line 226 | Add `onClick={() => track('lr_cta_click', { location: 'hero' })}` |
| Nav CTA onClick | line 215 | Add `onClick={() => track('lr_cta_click', { location: 'nav' })}` |
| "See how it works" onClick | line 227 (post-P-3) | Add `onClick={() => track('lr_cta_click', { location: 'how_it_works_link' })}` |
| Final form CTA onClick | line 443 | Add `onClick={() => track('lr_cta_click', { location: 'final_form' })}` |
| Intake submit success | inside `submitLead` after `alert(...)` (line ~181) | Add `track('lr_intake_submit', { outcome: 'success' })` |
| Intake submit fail | inside `submitLead` catch block (line ~183) | Add `track('lr_intake_submit', { outcome: 'fail' })` |
| Tests | `node-tests/analytics-policy.test.mjs` (or a new test) | Add 4 unit tests verifying the event names, props shape, no-PII rule, and graceful-when-plausible-absent behaviour |

After merge: open Plausible dashboard, filter for `lr_cta_click` and `lr_intake_submit` events on `corpflowai.com`, verify within 60 minutes that real events from production traffic appear with the correct prop dimensions.

#### PR-D (Cold-Sprint-V2-Backstory-Refund-Lang) recipe is similar — see § 4 P-4, P-8, P-10.

#### PR-E (Cold-Sprint-V3-Visuals) — new manifest creation steps in `data/visual-assets/`.

#### PR-F (Cold-Sprint-V4-Segments) — requires `lib/segments.js` + segment-aware copy swap design.

#### PR-G (Cold-Sprint-V5-Form-V1.1) — requires UX design pass before code.

#### PR-H (Pomelli-Activation-V1) — pure docs/runbook; no code change.

#### PR-I (Cold-Outreach-Cold-Copy-V1) — pure docs in `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_COLD_V1.md`.

### § 9.3 — Pre-merge checklist (every cold-sprint PR)

- [ ] Read `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — single-offer rule preserved.
- [ ] Read `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § Voice rules — no "AI" first, no fake testimonials, no revenue claim.
- [ ] Read `JE-2026-06-01-4` § 4.5 — no "Pay now" / "instant" / "PayPal accepted" / "Wise accepted" / "international bank transfer" as primary CTA.
- [ ] Read `JE-2026-05-28-1` — single-offer rule.
- [ ] Read `JE-2026-05-28-3` — no MUR / dual-route narrative anywhere.
- [ ] Read `PAY-SBM-2` merged copy (`0fd9312b`) — public merchant identity / BRN / support email / fulfilment wording all preserved verbatim.
- [ ] `npm run check:marketing-quality-gate` → PASS.
- [ ] `npm test` → all tests pass.
- [ ] `npm run build` → succeeds.
- [ ] Vercel Preview verification — page renders, intake form posts, no console errors.
- [ ] Hard limits honoured: no secrets, no env vars, no DNS, no payment automation, no CRM, no GHL, no WhatsApp integration, no ERPNext touch.

---

## § 10 — Coexistence with adjacent merged packets

| Surface | Status | This packet's interaction |
|---|---|---|
| `pages/terms.js` § Service fulfilment (PAY-SBM-2 `0fd9312b`) | Live | Cross-referenced; no change. All proposed copy edits respect the W3 verbatim 48h/5-business-day wording. |
| `pages/refund-policy.js` § Payment timing | Live | Cross-referenced; P-6 proposal links to this page from the intake form. |
| `pages/contact.js` § Customer support and complaints | Live | Cross-referenced; the `support@corpflowai.com` 2-working-day acknowledgement is implied across all proposed cold outreach. |
| `components/PublicSiteFooter.js` merchant identity | Live | Cross-referenced; no change. |
| `components/AiLeadRescueLanding.js` § How payment works | Live | All P-1..P-12 proposals respect the existing payment-trust copy. |
| `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (PR #282) | Merged | This packet **extends** the warm-network outreach with cold-prospect variants; § 5–§ 6 here is additive. |
| `docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md` (PR #281) | Merged | Proposal-only; live page wording is unchanged. § 4 P-2 / P-3 / P-6 do not depend on LR-Pay-1 adoption. |
| `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (PR #283) | Merged | Independent track; this packet does not touch SBM readiness. |
| `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` (PR #285) and `SUPPORT_1_FRESHDESK_ACTIVATION_PLAN.md` (PR #286) | Merged | Independent track; this packet does not touch the support-system migration. |
| `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` (PR #287) | Merged | Cross-referenced — the operator workflow this packet improves the funnel for is the same workflow audited there. |
| `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (PR #288) | Merged | Cross-referenced — once a cold prospect submits intake on `/lead-rescue`, Anton issues a pro-forma using that template. |
| ERPNext sandbox / Phase D / Phase C² / runbook §8.1 | HELD | Fully separated from this packet per Anton's DECISION. |

**No contradiction with any merged doc or live page.**

---

## § 11 — Hard limits honoured by this packet

- Zero Pomelli account created; zero VPN configured; zero Pomelli asset uploaded; zero Pomelli artifact on the live site.
- Zero edits to `pages/lead-rescue.js`, `pages/index.js`, `pages/_app.js`, `components/AiLeadRescueLanding.js`, `components/PublicSiteFooter.js`, `components/analytics/*`, `lib/analytics/*`, `lib/server/tenant-intake.js`, `lib/visualAssets/*`, `data/visual-assets/*`, or any other runtime file.
- Zero secrets / env vars / DNS / mail-routing / Vercel project settings / GitHub Secrets / GitHub workflow files / Prisma schema / production DB / Telegram / Plausible env / Search Console / payment-settings touched.
- Zero ERPNext production setting / scheduler / Phase D / Phase C² / runbook §8.1 touched.
- Zero payment automation / API key / KYC material / banking detail / signed document / customer data / personal phone / identity / live-payment-gateway claim / revenue guarantee committed.
- Zero CRM / GHL / WhatsApp / SMS / outbound-automation integration changed or proposed.
- Zero unsupported claims, fabricated testimonials, named clients, or logos used to imply customers.
- Single-offer rule preserved (`JE-2026-05-28-1`).
- All proposed copy variants pass doctrine review against `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.

Pure docs / research / proposal artefact.

**Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE** at PR merge — no customer-visible URL to probe by design. The cold-market sprint this packet describes will be exercised by subsequent small PRs gated by separate Anton DECISIONs, and **only those subsequent PRs** require live-production verification.

---

## § 12 — Open questions for Anton (Q1–Q8)

| # | Question | Cursor default (if unanswered) |
|---|---|---|
| Q1 | **Pomelli activation:** Authorise PR-H (Pomelli internal activation packet — docs/runbook only, zero live-site change) now, or defer until Mauritius is in Pomelli's official availability list? | Defer until officially available; § 1.6 HOLD posture stays. |
| Q2 | **Cold-Sprint-V1 sequence:** Land tracking (PR-C) before copy (PR-B)? | YES — baseline measurement before copy change is the recommended sequence. |
| Q3 | **Launch-pilot scarcity truthfulness (P-4):** Is the USD 150 launch pilot genuinely capped (e.g., first 10 buyers)? If yes, what's the cap? | Omit P-4 entirely. Soft scarcity is fine but only if true. |
| Q4 | **French-language commitment (P-10):** Will Anton actually reply in French / Creole on WhatsApp when a prospect uses that language? | Omit P-10. Don't promise what we won't deliver. |
| Q5 | **Search Console (G-T6):** Claim `corpflowai.com` in Google Search Console now, or defer? | Defer to a separate packet per `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`. |
| Q6 | **Outbound-link tracking (G-T5):** Switch Plausible script to `script.outbound-links.js` variant? | Defer; standard script v1 is sufficient for the first cold sprint. |
| Q7 | **Cold-outreach cadence:** Acceptable cold-email volume per week to verified business emails? | Default ≤ 20 / week, operator-handled, single follow-up, then stop. |
| Q8 | **Vertical priority for the first cold campaign (§ 5):** Property, clinics, contractors, or hospitality first? | Property (largest TAM in Mauritius SMB segment + the existing `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § 7 already has a property variant tested in warm-network). |

None of Q1–Q8 block the merge of this docs-only packet. They become relevant only when Anton authorises any of PR-B through PR-I.

---

## § 13 — ANTON TO-DO (when ready to act on this packet)

1. **Read § 1 verdict** and decide whether to authorise PR-H (Pomelli activation packet — still docs/runbook only, no live change).
2. **Read § 3 audit** and pick which of P-1 through P-12 land in the first cold-sprint PR (Cursor recommendation: P-1 + P-3 + P-6 + P-11 + P-12 in PR-B; P-2 in PR-C).
3. **Answer Q1–Q8** (or accept Cursor defaults silently).
4. **Authorise the next PR** by posting a DECISION on Bridge #249 (one of):
   - `AUTHORISE — Cold-Sprint-V1-Tracking (PR-C)` — recommended first.
   - `AUTHORISE — Cold-Sprint-V1-Copy (PR-B)` — recommended second.
   - `AUTHORISE — Cold-Outreach-Cold-Copy-V1 (PR-I)` — separate docs-only, no live-page change.
   - `AUTHORISE — Pomelli internal marketing-studio activation (PR-H)` — separate docs-only, no live-page change.
5. **After 1–2 weeks of cold traffic** (assuming PR-B + PR-C land), review Plausible dashboard for `lr_cta_click` / `lr_intake_submit` event counts by `utm_source` to identify which channel converts best on cold.
6. **Request the next sprint** (PR-D / PR-E / PR-F / PR-G) only if cold-traffic conversion data indicates the existing live page + new copy + new tracking + new cold-outreach is insufficient.

---

## § 14 — Cross-references

- `https://corpflowai.com/lead-rescue` (live, 200) — primary surface this packet improves.
- `pages/lead-rescue.js`, `components/AiLeadRescueLanding.js`, `pages/_app.js`, `components/analytics/PlausibleScript.js`, `lib/analytics/config.js` — runtime files inspected (no change in this packet).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — doctrine compliance source of truth.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`, `01_AGENT_OUTPUT_CONTRACT.md`, `02_MULTIMODAL_CONTENT_PLAYBOOK.md`, `03_CONTENT_ATOM_SCHEMA.md`, `04_DELIVERY_QUALITY_GATE.md`, `05_AGENT_COMPULSION_MECHANISM.md` — marketing-execution standards.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (PR #282) — warm-network outreach copy that § 5–§ 6 here extends to cold.
- `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` — pre-proof posture.
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` (PR #287) — operator workflow this packet improves the funnel for.
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (PR #288) — manual pro-forma the cold-prospect funnel ends with.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `support@corpflowai.com` sender alias policy.
- `JE-2026-05-26-1`, `JE-2026-05-27-1` — Plausible v1 install + apex-only step-1.
- `JE-2026-05-28-1` — Lead Rescue single-offer rule.
- `JE-2026-05-28-3` — USD-launch-pilot narrative alignment.
- `JE-2026-06-01-4` — payment-route reality + § 4.5 forbidden phrases.
- `JE-2026-06-02-1` (LR-Pay-1), `JE-2026-06-02-2` (LR-Mauritius-Outreach-Copy-1), `JE-2026-06-02-3` (PAY-SBM-1), `JE-2026-06-02-4` (PAY-SBM-2 + intake-to-invoice audit), `JE-2026-06-02-5` (Support-Feasibility-V1), `JE-2026-06-02-6` (SUPPORT-1), `JE-2026-06-02-7` (LR-Manual-Invoice-Template-1) — sibling 2026-06-02 packets.
- `JE-2026-06-03-1` — this packet (recorded in `docs/decisions/JOURNAL.md`).
- Pomelli sources (verified 2026-06-03): blog.google posts on Pomelli launch + agentic features + EU rollout; support.google.com/labs Help article on Business DNA + Catalog; pomelli.help FAQ + how-to-use.

---

## § 15 — Change-log

- **2026-06-03 (v1):** Initial proposal. 15 sections covering hard limits + scope, Pomelli viability verdict (sub-sections 1.1–1.6 with sources, pricing, region, language, account, privacy, output disclosure, fit-assessment matrix, risk matrix, posture), current Lead Rescue surface inventory (URLs / repo files / current intake-event surface), cold-Mauritian-prospect landing-page audit (14 strengths preserved, 12 gaps G1–G12), 12 first-pass copy / CTA / instrumentation proposals P-1..P-12 with diff-target file:line specificity, 4 segment-specific campaign angles (property / clinics / contractors / hospitality) with Pomelli asset briefs, cold-outreach channel-discipline matrix + 5 channel variants extending warm-network outreach, 6 tracking gaps G-T1..G-T6 + recommended 4-event taxonomy, minimal 9-PR plan PR-A..PR-I with landing-order recommendation + stopping rule, engineer/Cursor handoff including 17-row repo-navigation table + per-PR concrete change recipes for PR-B and PR-C, coexistence matrix with 12 adjacent surfaces, hard-limits-honoured summary, 8 open questions Q1–Q8 with Cursor defaults, 6-step ANTON TO-DO, cross-references to 16 sibling docs / journal rows / live surfaces, this change-log. (`JE-2026-06-03-1`.)
