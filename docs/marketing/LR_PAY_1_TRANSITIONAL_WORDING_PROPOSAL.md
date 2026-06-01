# LR-Pay-1 — Lead Rescue transitional payment wording (proposal)

**Status:** Proposal only. **Live page is unchanged by this document.** No payment gateway configured. No API keys created. No env / DNS / DB / secret / `tenant_id` / Telegram / Vercel / GitHub-settings / Search Console / Plausible / analytics / payment setting touched. Adoption of this proposal requires a **separate explicit operator authorisation**.

**Anchor sentinel:** `<!-- LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL -->`

<!-- LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL -->

**Author:** Cursor (assistant), under Anton's direct authorisation per chat 2026-06-02 (*"Re: PR #279 Delivery Reality Audit accepted"*, Operator Bridge issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)). **The recommended wording in §2 is verbatim from Anton's DECISION**; this document only inventories the live page, audits it for forbidden phrases, proposes location-specific edits, and lists the doctrine-compliance + verification work that would happen *if* adoption is authorised in a future packet.

---

## 1. Purpose

Align the live Lead Rescue payment wording (on `https://corpflowai.com/lead-rescue` and the apex render of `AiLeadRescueLanding` when the host resolves to `aileadrescue.corpflowai.com`) with the payment-acceptance reality captured in [`docs/finance/PAYMENT_READINESS_2026_06_01.md`](../finance/PAYMENT_READINESS_2026_06_01.md) and `JE-2026-06-01-4`:

- **PayPal on HOLD** (KYC friction — SA citizenship UBO + pending MU residency + MU company).
- **Wise** removed from v1 plan (not viable for CorpFlowAI Ltd in Mauritius).
- **SBM e-Commerce Acquiring** primary route (request sent; awaiting reply).
- **Peach Payments** secondary route (request sent; awaiting reply).
- **Merchant-of-Record backup** investigation queued.
- **Manual SBM transfer** suitable only for Mauritius / warm relationships, not cold international.
- **Cold international paid conversion should wait** for a trusted payment portal.

The wording on the live page must (a) avoid all forbidden phrases, (b) communicate the *"intake-approved-first-then-secure-payment-link-or-invoice-then-setup"* sequence honestly, and (c) stay compliant with `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*, `JE-2026-05-28-1` (single-offer rule), `JE-2026-05-28-3` (trust-band update), and `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md` (four-layer agent-compulsion mechanism).

---

## 2. Recommended wording (verbatim from Anton's DECISION)

> "Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."

This is the canonical replacement / lead-in paragraph for the *"how payment works"* moment on the Lead Rescue landing.

### Forbidden phrases (must not appear on any live customer-facing surface)

Per `JE-2026-06-01-4` + Anton's DECISION 2026-06-01:

- *"Pay now"*
- *"PayPal accepted"*
- *"Wise accepted"*
- *"instant checkout"*
- *"international bank transfer"* (as the primary CTA)

---

## 3. Current live state — inventory (read from `main` @ `542422c2`)

Both `https://corpflowai.com/lead-rescue` (via [`pages/lead-rescue.js`](../../pages/lead-rescue.js)) and the apex render on `aileadrescue.corpflowai.com` (via [`pages/index.js`](../../pages/index.js) mode `ai_lead_rescue`) use the **same** component: [`components/AiLeadRescueLanding.js`](../../components/AiLeadRescueLanding.js). Editing the component changes both surfaces.

### 3.1 Live wording today (literal strings from `components/AiLeadRescueLanding.js` and `pages/lead-rescue.js`)

| # | Location | Literal current text |
|---|---|---|
| L1 | `AiLeadRescueLanding.js` line 193 (`<meta name="description">`) | *"USD 150 launch pilot. 48-hour setup that captures new enquiries, alerts the owner, logs every lead, and surfaces follow-ups daily — invoiced after intake review."* |
| L2 | line 199 (`<meta property="og:description">`) and line 204 (`<meta name="twitter:description">`) | *"USD 150 launch pilot. 48-hour setup for lead capture, instant alerts, follow-up logging, and daily summaries."* |
| L3 | line 215 (top-nav CTA) and line 226 (hero primary CTA) | *"Start the 48-hour setup"* / *"Start my 48-hour setup"* (CTA buttons) |
| L4 | line 220 (hero badge) | *"USD 150 launch pilot · 48-hour setup · no card on this page"* |
| L5 | line 221 (hero h1) | *"Stop losing leads because follow-up is too slow."* |
| L6 | line 232–245 (launch-offer aside) | `<h2>` *"USD 150 launch pilot · 48-hour setup"*, bullets, footnote: *"Invoiced after we review your intake. No card or banking details on this page."* |
| L7 | line 319–324 (*What we need from you*) | *"…Approval on the USD 150 invoice we send after we review your intake."* |
| L8 | line 327–352 (*What happens after intake* — 4 steps) | Step 1 *"We review your intake"*; Step 2 *"We email a USD invoice / USD 150 launch pilot. The agreed payment route is on the invoice — no card details on this page."*; Step 3 *"You pay; the 48-hour clock starts / Once payment lands, we begin the setup. You get daily updates during the build."*; Step 4 *"Live pilot + 7-day monitoring"* |
| L9 | line 410–422 (*§ How payment works*) | `<h2>` *"One USD 150 invoice, sent after we review your intake."* + 4 bullets + footnote *"The payment route on the invoice is decided after intake review, not by you on this page."* |
| L10 | line 425–446 (intake form section) | `<h2>` *"Start your AI Lead Rescue intake"*, paragraph, form, submit *"Request AI Lead Rescue setup"*, footnote *"Payment links and invoice details are issued after intake review. Do not enter card or banking details on this page."* + *"We do not guarantee new revenue…"* |
| L11 | line 449 (`PublicSiteFooter extra`) | *"AI Lead Rescue is powered by CorpFlowAI. The USD 150 launch pilot is invoiced after intake review; this page collects intake only and does not collect card or banking details."* |

### 3.2 Forbidden-phrase audit on the live page — GREEN baseline

A case-insensitive search for the 5 forbidden phrases (*"Pay now"*, *"PayPal accepted"*, *"Wise accepted"*, *"instant checkout"*, *"international bank transfer"*) across the entire repo returned **3 files**:

- `docs/finance/PAYMENT_READINESS_2026_06_01.md` — expected (this doc *defines* the forbidden list).
- `docs/decisions/JOURNAL.md` — expected (`JE-2026-06-01-4` *defines* the forbidden list).
- `artifacts/chat_history.md` — expected (history *quotes* the DECISION).

**Zero matches in `components/AiLeadRescueLanding.js`, `pages/lead-rescue.js`, `pages/index.js`, or any other live-rendered customer-facing file.** The live page is already directionally compliant with `JE-2026-06-01-4`. The proposal below is therefore a **refinement to add Anton's verbatim wording**, **not** a fix for an actively non-compliant page.

---

## 4. Proposed edits — location-specific diff

Each row below is a candidate edit. Adoption of any subset is **gated on Anton's separate authorisation**. The proposal lists *both* a minimal-change option and an aligned-with-Anton's-wording option per location, so adoption can choose granularity.

| # | Location | Current | Proposed (Anton's wording aligned) | Why this delta matters |
|---|---|---|---|---|
| E1 | **L9 `§ How payment works`** `<h2>` (line 412) | *"One USD 150 invoice, sent after we review your intake."* | *"Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."* (paragraph, replaces the h2 + bullets + footnote with the verbatim wording as the primary line; keep the bullets below as supporting detail OR drop them — see E1-alt) | (a) Adds *"Apply for the USD 150 launch pilot"* framing — a new sentence currently absent from the page. (b) Replaces *"USD invoice"* with *"secure payment link or invoice"* — matches `JE-2026-06-01-4` priority list (SBM eCommerce hosted checkout → link; Peach hosted checkout → link; manual SBM → invoice). The current wording implies invoice-only, which under-promises the eventual SBM/Peach hosted-checkout reality. (c) *"Setup begins once payment is confirmed"* is tighter than *"Once payment lands, we begin the setup"*. |
| E1-alt | **L9 same section** — keep both | *(unchanged + bullets retained)* | Insert Anton's verbatim wording as a lead-in paragraph *above* the existing h2 + bullets. Bullets continue to enumerate the sequence. | Lower-risk adoption: keeps the existing structured list (which scans well) and gains Anton's framing sentence at the top. Two adjacent statements of the same idea — slight redundancy is acceptable because the buyer reads the framing first. |
| E2 | **L8 Step 2** (line 338–339) | h3 *"We email a USD invoice"* + body *"USD 150 launch pilot. The agreed payment route is on the invoice — no card details on this page."* | h3 *"We send a secure payment link or invoice"* + body *"USD 150 launch pilot. If your intake is approved, we send a hosted checkout link or a USD invoice — the route is on the message, not on this page."* | Matches Anton's *"secure payment link or invoice"* wording. Communicates the SBM/Peach hosted-checkout option once gateways come online without overcommitting to a specific provider. |
| E3 | **L8 Step 3** (line 343–344) | h3 *"You pay; the 48-hour clock starts"* + body *"Once payment lands, we begin the setup. You get daily updates during the build."* | h3 *"Setup begins once payment is confirmed"* + body *"You get daily updates during the 48-hour build."* | Adopts Anton's verbatim phrasing. Removes the slightly anxious *"once payment lands"* in favour of *"once payment is confirmed"* (calmer + operator-precise). |
| E4 | **L7 *What we need from you*** (line 323) | *"Approval on the USD 150 invoice we send after we review your intake."* | *"Approval on the USD 150 secure payment link or invoice we send after we review your intake."* | Two-word edit. Same intent, aligned with E1 / E2 wording. |
| E5 | **L4 hero badge** (line 220) | *"USD 150 launch pilot · 48-hour setup · no card on this page"* | *(unchanged)* | Already compliant. *"no card on this page"* is honest and operator-disciplined. **Do not change.** |
| E6 | **L5 hero h1** (line 221) | *"Stop losing leads because follow-up is too slow."* | *(unchanged)* | Doctrine-compliant problem framing. **Do not change.** |
| E7 | **L3 CTA buttons** (lines 215, 226, 438) | *"Start the 48-hour setup"* / *"Start my 48-hour setup"* / *"Request AI Lead Rescue setup"* | **Option A** *(no change — keeps action-oriented operator-process language)*; **Option B** change one of them to *"Apply for the USD 150 launch pilot"* to mirror Anton's verbatim wording in the CTA. | Anton's DECISION wrote *"Apply for the USD 150 launch pilot"* as a sentence opener, not necessarily a button label. A buyer-conversion view says: *"Start my 48-hour setup"* is **more action-oriented** (concrete outcome) than *"Apply for the USD 150 launch pilot"* (more transactional, sounds like an application form). **Recommendation: keep Option A** (no change to CTA button text). Open question for Anton in §13. |
| E8 | **L1 `<meta name="description">`** (line 193) | *"USD 150 launch pilot. 48-hour setup that captures new enquiries, alerts the owner, logs every lead, and surfaces follow-ups daily — invoiced after intake review."* | *(unchanged)* | Already compliant. Search-engine description; truncated meta-only context. **Do not change.** |
| E9 | **L10 intake-form footnote** (line 441) | *"Payment links and invoice details are issued after intake review. Do not enter card or banking details on this page."* | *(unchanged)* | Already compliant. **Do not change.** |
| E10 | **L11 footer extra** (line 449) | *"AI Lead Rescue is powered by CorpFlowAI. The USD 150 launch pilot is invoiced after intake review; this page collects intake only and does not collect card or banking details."* | *"AI Lead Rescue is powered by CorpFlowAI. The USD 150 launch pilot is sent as a secure payment link or invoice after intake review; this page collects intake only and does not collect card or banking details."* | One-clause edit to match E1/E2/E4 wording everywhere. |

**Minimum-viable adoption set:** E1-alt + E3 + E4 + E10 (≤ 4 small edits). Together they install Anton's verbatim wording at the *§ How payment works* opener (E1-alt), the Step 3 head + body (E3), the approval line (E4), and the footer (E10) — and leave the rest of the page (CTAs, hero, meta, intake form) unchanged. This is the lowest-risk path and the recommended scope.

**Wider-adoption set:** add E2 (Step 2 wording) and optionally E7 Option B (CTA button text). Higher copy delta; should only happen if Anton wants the CTA changed.

---

## 5. Doctrine-compliance check (run against each proposed edit)

Run against the recommended **minimum-viable adoption set (E1-alt + E3 + E4 + E10)** unless noted.

| Doctrine source | Constraint | Pass? | Why |
|---|---|---|---|
| `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — **Single-offer rule** | One offer on the page: USD 150 launch pilot. | ✅ | All proposed edits preserve the single-offer framing. *"Apply for the USD 150 launch pilot"* is *the offer*. |
| Same doc § *Effectiveness beats decoration / Clarity beats cleverness / Conversion beats completeness* | Primary CTA describes buyer intent, not internal process. | ✅ | Primary hero CTA stays *"Start my 48-hour setup"* (buyer intent). No change to CTA wording in the recommended set. Payment-routing complexity (E1-alt / E3 / E4) is placed *after* buyer intent in the page flow (§ How payment works appears after hero, after launch-offer aside, after how-it-works, after intake needs). |
| Same doc § *AI Lead Rescue doctrine* — **Do not use "Choose payment path" as the primary CTA** | Avoid the previously-deprecated "Choose payment path" framing. | ✅ | The proposed wording uses *"secure payment link or invoice"* — operator-handles-routing, not buyer-chooses-routing. Aligned with the existing `pages/lead-rescue.js` comment at line 130–131 (*"this page no longer asks the buyer to choose a region or payment route"*). |
| `JE-2026-05-28-1` — Single-offer rule for Lead Rescue | One offer: USD 150 launch pilot, invoiced after intake review. | ✅ | Preserved. *"after intake review"* sequence preserved + sharpened to *"if your intake is approved"*. |
| `JE-2026-05-28-3` — Trust-band update | Trust band emphasises *"this page collects intake only, no card or banking details on this page"*. | ✅ | The badge (L4), aside footnote (L6), intake form footnote (L9), and footer (L10) all keep the *"no card on this page"* discipline. E10 keeps it verbatim. |
| `JE-2026-06-01-4` — Forbidden phrases | None of *"Pay now"* / *"PayPal accepted"* / *"Wise accepted"* / *"instant checkout"* / *"international bank transfer"* on live surfaces. | ✅ | Already true today; all proposed edits preserve the absence. *"secure payment link or invoice"* deliberately does **not** name PayPal, Wise, Paddle, or any specific provider. |
| `JE-2026-06-01-4` — CTA reads *"request pilot review"*, not *"pay now"* | Acceptable CTA framings. | ✅ | Current CTAs (*"Start my 48-hour setup"* / *"Request AI Lead Rescue setup"*) are operator-friendly equivalents. Optional E7 Option B *"Apply for the USD 150 launch pilot"* is also acceptable. |
| `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md` — Four-layer compulsion (problem-framing → proof → buyer-motion → close) | Each layer is intact and well-positioned. | ✅ | Problem-framing (L5 hero h1) unchanged; proof (existing dashboard + process visuals) unchanged; buyer-motion (CTAs) unchanged in the minimum set; close (intake form L10) unchanged. The proposed edits land in the *§ How payment works* segment (between buyer-motion and close), which is the correct position for routing-discipline language. |
| `.cursor/rules/brand-conversion-doctrine.mdc` — *"Payment, region, and routing complexity appears only after buyer intent"* | Routing detail must come after buyer-intent signals. | ✅ | The page already places *§ How payment works* well below the hero + CTA + launch-offer aside. The proposed wording stays in that section; nothing is moved earlier. |

**Verdict:** no doctrine violation. Adoption is doctrine-safe.

---

## 6. Acceptance criteria (when adoption is authorised in a future packet)

After applying the proposed edits, the following must hold before the adoption PR may merge:

1. **Wording present.** *"Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."* appears verbatim somewhere in `components/AiLeadRescueLanding.js` (at least the three-sentence block, possibly split across nearby h3 / paragraph pairs as in E1-alt + E3).
2. **Forbidden-phrase audit GREEN.** Repo-wide case-insensitive search for the 5 forbidden phrases continues to match **only** the three docs that define them (`docs/finance/PAYMENT_READINESS_2026_06_01.md`, `docs/decisions/JOURNAL.md`, `artifacts/chat_history.md`), and **zero** live-rendered files.
3. **Doctrine check.** `npm run check:marketing-quality-gate` passes (existing gate).
4. **Single-offer rule preserved.** Only the USD 150 launch pilot is mentioned as the offer; no second offer or upsell appears.
5. **No payment-gateway hint.** Page does not name PayPal, Wise, Paddle, Lemon Squeezy, FastSpring, 2Checkout, Verifone, Stripe, SBM, or Peach. The page remains provider-agnostic.
6. **No card / banking detail collection.** The intake form continues to collect zero card / IBAN / SWIFT / account-number / card-expiry / CVV fields.
7. **No buyer-side routing decision.** The page continues to not ask the buyer to *"Choose payment path"* or select region.
8. **`<meta>` tags and OG/Twitter cards** remain aligned with the new wording **if** Anton elects to adopt E1-alt (otherwise unchanged is acceptable).
9. **`node-tests/lead-rescue-runtime.test.mjs`** still passes (existing runtime test; verifies the page renders).
10. **No unrelated edits.** PR diff is limited to `components/AiLeadRescueLanding.js` (and optionally `pages/lead-rescue.js` if a meta description is updated), plus a `docs/decisions/JOURNAL.md` row and `artifacts/chat_history.md` sentinel.

---

## 7. Verification plan (when adoption is authorised in a future packet)

1. **CI** — required GitHub checks pass (test, vercel-env, marketing quality gate). Mirrors the discipline used for PR #277 / #278 / #279.
2. **Vercel Preview** — `READY` build for the head commit; visual smoke against `LUX_SMOKE_BASE_URL=<preview *.vercel.app URL>` per `.cursor/rules/predeploy-decision-checks.mdc` § *Lux `/change` UI / layout work — mandatory preview-smoke loop* (this surface is `/lead-rescue` on apex, not `/change` on lux, but the preview-smoke discipline is applicable when the change is customer-visible).
3. **Manual visual review on Preview** — load `<preview>/lead-rescue` and confirm:
   - Anton's verbatim wording is present at the *§ How payment works* moment.
   - Step-3 head + body adopted (E3).
   - Footer wording adopted (E10).
   - No forbidden phrase visible anywhere.
   - No new buttons / form fields / payment-related UI introduced.
4. **Doctrine smoke** — manual scan against `BRAND_AND_CONVERSION_DOCTRINE.md` *Required review before merge* checklist (one primary conversion goal obvious / offer understandable in 5 seconds / CTA buyer-action-oriented / payment complexity after buyer intent / no unsupported revenue claims / next step clear).
5. **Merge.** Anton merges; Vercel Production deploys the merge commit.
6. **Live production verification (mandatory per `.cursor/rules/delivery-reality.mdc`):**
   - `https://corpflowai.com/lead-rescue` → 200, **page body contains** *"Apply for the USD 150 launch pilot"* AND *"secure payment link or invoice"* AND *"Setup begins once payment is confirmed"*.
   - `https://corpflowai.com/lead-rescue` → page body does **NOT** contain any of the 5 forbidden phrases.
   - Apex `https://corpflowai.com/` (when the host resolves to `aileadrescue.corpflowai.com`) — same wording check.
   - `https://corpflowai.com/` (homepage) — 200.
   - `https://lux.corpflowai.com/` — 200 (no regression on the Lux tenant).
   - `https://core.corpflowai.com/api/factory/health` — `ok:true / healthy` (no regression on the factory).
7. **Delivery Reality Audit** posted to bridge #249 with merge commit + Vercel deployment ID + the live-URL evidence above. Verdict flips to **COMPLETE** only when step 6 passes.

---

## 8. Honest limits of this proposal

- Cursor has **not modified any live page** while writing this proposal.
- Cursor has **not run a Preview-deployment smoke** against the proposed wording — that happens in the adoption packet, after Anton authorises.
- Cursor has **not confirmed which provider** will actually issue the *"secure payment link"* — SBM e-Commerce and Peach Payments responses are pending per `JE-2026-06-01-4`. The wording is deliberately provider-agnostic so it remains correct regardless of which provider lands first; if Anton wants a provider-specific copy later, that is a separate packet **after** the provider conversation closes.
- Cursor has **not edited any agent-compulsion-mechanism content** in `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`. The four-layer mechanism stays in force as written.
- Cursor has **not changed any analytics / conversion-tracking** instrumentation (Plausible / Search Console / etc.). Out of scope.
- **This proposal does not say the live page is broken or out of compliance.** The live page is already directionally compliant (zero forbidden phrases, single-offer rule preserved, no buyer-side routing decision, no card collection on page). The proposal is a *refinement* to add Anton's verbatim wording, not a *fix* for an actively non-compliant page.

---

## 9. Hard limits during proposal phase (this packet)

- ❌ No edit to `pages/lead-rescue.js`, `components/AiLeadRescueLanding.js`, `pages/index.js`, `pages/aileadrescue.js`, or any live customer-facing component.
- ❌ No `<meta>` / OG / Twitter card change.
- ❌ No CTA text change.
- ❌ No payment-gateway configuration.
- ❌ No API key creation.
- ❌ No KYC submission.
- ❌ No ERPNext production setting modified (sandbox or production).
- ❌ No `tenant_id` / DNS / DB / env vars / secrets / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched.
- ❌ No Phase D start.
- ❌ No Phase C² start.
- ❌ No runbook §8.1 hardening.
- ❌ No new branch beyond `docs/lr-pay-1-transitional-wording-proposal` for this packet.

---

## 10. Cross-references

- [`docs/finance/PAYMENT_READINESS_2026_06_01.md`](../finance/PAYMENT_READINESS_2026_06_01.md) — payment-acceptance reality + provider analyses + operator question lists.
- `docs/decisions/JOURNAL.md` row [`JE-2026-06-01-4`](../decisions/JOURNAL.md) — payment route priority update + forbidden phrases.
- `docs/decisions/JOURNAL.md` row [`JE-2026-05-28-1`](../decisions/JOURNAL.md) — Lead Rescue single-offer rule.
- `docs/decisions/JOURNAL.md` row [`JE-2026-05-28-3`](../decisions/JOURNAL.md) — trust-band update.
- [`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`](BRAND_AND_CONVERSION_DOCTRINE.md) § *AI Lead Rescue doctrine* — canonical doctrine.
- [`docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`](05_AGENT_COMPULSION_MECHANISM.md) — four-layer compulsion mechanism.
- [`.cursor/rules/brand-conversion-doctrine.mdc`](../../.cursor/rules/brand-conversion-doctrine.mdc) — always-applied brand-conversion rule.
- [`.cursor/rules/delivery-reality.mdc`](../../.cursor/rules/delivery-reality.mdc) — live-production verification standard.
- [`pages/lead-rescue.js`](../../pages/lead-rescue.js) — apex route entry.
- [`pages/index.js`](../../pages/index.js) — apex host index that *also* renders `AiLeadRescueLanding` when the host resolves to `aileadrescue.corpflowai.com`.
- [`components/AiLeadRescueLanding.js`](../../components/AiLeadRescueLanding.js) — the component both routes render. **This is the single edit point** for the adoption packet.
- Operator Bridge issue [#249 STATUS-15](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) — DRA for PR #278 (payment readiness merge).

---

## 11. ANTON TO-DO

1. **Review this proposal.** No production / runtime impact from review.
2. **Decide on the adoption scope** before the next packet:
   - **Minimum-viable adoption set** (recommended): E1-alt + E3 + E4 + E10 (≤ 4 small edits in one component file).
   - **Wider-adoption set**: also adopt E2 (Step 2 wording).
   - **Optional**: E7 Option B (CTA button text changes from *"Start my 48-hour setup"* to *"Apply for the USD 150 launch pilot"* — recommendation: **no**, because action-oriented buyer-intent CTAs out-convert transactional ones; surfaced here only because Anton's DECISION wording starts with *"Apply for"*).
3. **Decide on Step 2 h3 (E2).** Current: *"We email a USD invoice"*. Proposed: *"We send a secure payment link or invoice"*. Lower-confidence change; adoption is reasonable but optional.
4. **Authorise the adoption packet** when ready: a single small PR touching `components/AiLeadRescueLanding.js`, with the agreed scope, that also adds a JOURNAL row (`JE-2026-06-XX-N`) and a chat_history sentinel.

---

## 12. Open questions for Anton (before adoption)

| # | Question | Cursor's default if Anton does not answer |
|---|---|---|
| Q1 | Adopt the **minimum-viable set** (E1-alt + E3 + E4 + E10) or the **wider set** (also E2)? | Minimum-viable set. |
| Q2 | Keep CTA buttons as *"Start my 48-hour setup"* and *"Request AI Lead Rescue setup"* (Option A)? Or switch one CTA to *"Apply for the USD 150 launch pilot"* (Option B)? | Option A (no CTA change). Recommendation in §5. |
| Q3 | When Anton authorises adoption, apply on **a single PR** scoped to `components/AiLeadRescueLanding.js` + JOURNAL row + chat_history sentinel? Or split into two PRs (component-only first, JOURNAL row second)? | Single PR. Same shape as PR #277 / #278 / #279. |
| Q4 | Update the `<meta name="description">` (L1) to also reflect *"secure payment link or invoice"*? | No — meta-description stays the same in the minimum-viable set; can be updated later when a specific provider is named. |
| Q5 | Defer adoption until SBM e-Commerce or Peach Payments confirms onboarding? | No — the proposed wording is deliberately provider-agnostic and remains correct regardless of which provider lands first; it is safe to adopt now. |

---

## 13. Footer

This is a **proposal**. The live Lead Rescue page is unchanged. Adoption requires a separate explicit operator authorisation. When that authorisation lands, the adoption packet will: (a) make the agreed edits in `components/AiLeadRescueLanding.js`; (b) add a JOURNAL row and chat_history sentinel; (c) verify the doctrine + acceptance criteria + verification plan above; (d) post a Delivery Reality Audit to bridge #249 with merge commit + Vercel deployment ID + live-URL evidence. Until then, **no live page change happens**.
