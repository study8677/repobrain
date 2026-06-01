# CorpFlowAI payment readiness — 2026-06-01

**Status:** Strategic position update. Docs-only. **No live payment copy is changed by this doc.** No payment gateway is configured. No API keys created. No KYC submitted. No ERPNext production setting modified. This file captures Anton's 2026-06-01 DECISION on the Operator Bridge (issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)) and the structured analysis required as the *"required next output"* of that decision.

**Anchor sentinel:** `<!-- PAYMENT_READINESS_2026_06_01 -->`

<!-- PAYMENT_READINESS_2026_06_01 -->

**Author:** Cursor (assistant), under Anton's direct authorisation. **Authoritative source for product specifications: SBM Bank Mauritius and Peach Payments themselves, not this document.** Cursor does not have access to either provider's current product datasheets, fee schedules, or current onboarding policies; the analysis below is a *research framework* + an *operator question list*, not a substitute for the providers' own replies.

## 1. Anton's DECISION (2026-06-01, verbatim accepted facts)

The following are recorded as facts of record:

- **PayPal is on HOLD** due to KYC friction involving (a) South African citizenship of the beneficial owner, (b) pending Mauritius residency, (c) Mauritian-registered company.
- **Wise is not viable** for CorpFlowAI Ltd business payment acceptance in Mauritius.
- **CorpFlowAI Ltd currently banks with SBM Bank Mauritius.**
- **SBM e-Commerce acquiring request has been sent.** Awaiting reply.
- **Peach Payments support request has been sent.** Awaiting reply.
- **Stripe is not a near-term direct route** for the Mauritian company unless a supported entity/structure is introduced later.
- **Manual international bank transfer to SBM is not suitable as the primary conversion path** for cold USA / Australia / South Africa buyers (acceptable for warm-network buyers after a conversation, see §5).

These are commercial-reality facts. Cursor does not litigate them or attempt to re-open them in this doc.

## 2. Strategic position (the market split)

Do **not** stop all commercial work. **Do** split the market into three buckets:

| Bucket | Behaviour | Why |
|---|---|---|
| **A. Mauritius + warm-network validation** | **MAY CONTINUE.** Manual SBM invoice / wire is acceptable after a conversation and approval. First-proof, case studies, operational validation happen here. | Anton is on the ground in Mauritius and SBM is the bank of record. Warm-network buyers (relationships, intros, founder-led conversations) accept manual flows because trust is established before the wire is sent. |
| **B. Cold international paid conversion** | **MUST WAIT.** No broad paid ads and no anonymous international checkout push **until** a trusted payment portal exists. | Cold international buyers will abandon at the "wire SWIFT instructions to a bank you've never heard of" step. Paid acquisition burns cash without converting until checkout is one click. |
| **C. Content, proof, intake** | **CONTINUES.** Article plan, proof video, prospect scoring, intake form. CTA reads **"request pilot review"**, not **"pay now"**. | These build the funnel for when bucket B opens. They do not depend on payment portal status. |

## 3. Updated payment route priority (decisions of record)

1. **SBM e-Commerce Acquiring** — primary route.
2. **Peach Payments** — secondary route.
3. **Merchant-of-Record (MoR) backup** — Paddle / Lemon Squeezy / FastSpring / 2Checkout-Verifone-style — to investigate after #1 and #2 reply.
4. **Manual SBM invoice / bank transfer** — local/warm fallback only.
5. **PayPal** — on hold (KYC friction).
6. **Wise** — removed from primary plan.

Items 5 and 6 are **not abandoned forever** — they are removed from the v1 commercial-launch plan. Re-evaluation requires a separate journal entry.

## 4. Provider analyses (framework, not authoritative specs)

### 4.1 SBM e-Commerce Acquiring — expected fit

**What we want it to do (operator goals):**

- Accept USD card payments from international buyers on a CorpFlowAI-hosted or SBM-hosted checkout page.
- Settle to the existing **SBM Bank Mauritius** business account (no new entity, no jurisdictional change).
- Produce a CSV / Excel statement export usable by the ERPNext sandbox Bank Reconciliation Tool (per `ERPNEXT_SANDBOX_PLAN_V1.md` §7).
- Be onboarded as a Mauritian-registered company **with a South-African-citizen UBO** (the same identity constraint that blocked PayPal).

**What is uncertain until SBM replies (do NOT assume):**

- USD card acquiring availability (SBM has historically focused on MUR domestic; USD acquiring is the question).
- Settlement currency options (USD direct vs MUR after auto-FX vs operator-chosen).
- Fees (MDR per transaction, monthly minimum, setup, refund fee).
- Onboarding timeline (best-case days vs realistic weeks).
- Hosted-checkout-page UX (mobile responsiveness, brand customisation extent, 3-D Secure flow).
- Payment-link / pay-by-link product (vs full hosted page) — affects whether ERPNext's Payment Request doctype can drive a link directly.
- Recurring-billing support (for any future productized monthly offer; NOT required for the USD-150-one-off launch pilot).
- Settlement timeline (T+1, T+2, T+ longer).

**Expected fit (honest assessment):** *probable best primary route IF SBM offers USD acquiring + hosted checkout with no jurisdictional surprise on the SA-citizen UBO question.* The bank is already the company's bank — there is no second-vendor compliance hurdle, no second-bank-account to reconcile against. **This is the option to push first.**

### 4.2 Peach Payments — expected fit

**What we want it to do:**

- Accept USD (and MUR / ZAR) card payments from international buyers.
- Onboard CorpFlowAI Ltd (Mauritian company) with a **South-African-citizen beneficial owner** — the same identity constraint that blocked PayPal.
- Settle to the existing SBM Bank Mauritius account.
- Provide hosted checkout OR a payment-link / pay-by-link product.
- Produce a CSV / Excel statement export (or API export) usable by Bank Reconciliation.

**What is uncertain until Peach replies:**

- Mauritius onboarding policy for companies whose UBO holds South African citizenship + pending Mauritius residency.
- Whether Peach settles to **SBM Mauritius** (vs requiring a settlement bank in a different jurisdiction).
- Fees (MDR, monthly).
- USD acceptance (Peach is strong on ZAR + MUR domestic; USD acceptance for a Mauritian entity is the question).
- Whether their hosted checkout has buyer-trust signals strong enough for cold US/AU traffic.

**Expected fit (honest assessment):** *strong sub-Saharan-Africa payment expertise; well-known to South African beneficial owners; potentially a clean secondary route if SBM e-Commerce returns a "no" or a long timeline.* Peach has been onboarding African-region merchants for over a decade; the UBO citizenship question is something they will have a process for, not something they invented for our case.

### 4.3 Merchant-of-Record backup options (investigate after primary + secondary reply)

A merchant-of-record sells your product *on your behalf*, collects the customer's payment, handles tax/VAT/sales-tax compliance globally, and remits net proceeds to you on a schedule. The MoR's brand appears on the customer's bank/card statement, not yours. Trade-off: convenience + global compliance vs higher fees + less customer-experience control.

Realistic candidates for a USD-150 launch pilot (not exhaustive):

| Provider | Generally targets | Headline trade-off | Why it might fit Lead Rescue v1 |
|---|---|---|---|
| **Paddle** | SaaS / digital products | Mature global MoR; handles VAT/GST/sales-tax; charges ~5% + per-txn; bank-account in Mauritius is supported as settlement destination in some configurations | Lead Rescue Setup is a digital service. Paddle's hosted checkout converts well on cold international traffic. The fee burden on USD 150 (~USD 7.50) is acceptable as a bridge. |
| **Lemon Squeezy** | Indie creators / SaaS | Similar MoR posture; ~5% + per-txn; US-based; widely accepted by indie/dev buyers | Brand fits the AI Lead Rescue persona (modern, ops-first). Settlement to a Mauritian bank is the open question. |
| **FastSpring** | Software / SaaS | Established global MoR (longer track record); fee similar to Paddle | More enterprise feel; possibly heavier onboarding than Lead Rescue v1 needs. |
| **2Checkout / Verifone Payments** | Software / SaaS / digital goods | Hybrid MoR + gateway; recently re-branded under Verifone | Often onboards merchants in jurisdictions where Stripe doesn't operate directly. Worth a single discovery call. |
| **Polar** | Open-source / dev tools | Newer MoR; thin; developer-first | Probably too narrow for a non-OSS service. Flag for review only. |

**Honest qualifier:** for each MoR, the *single most important* question is "do you onboard a Mauritian company with a South-African-citizen UBO, settling to SBM Mauritius?" — same constraint set that blocks PayPal. Answer first, then evaluate fees.

**Recommendation:** **do not start MoR onboarding yet.** Wait for SBM e-Commerce and Peach replies first; MoR is the *backup* layer, not the primary play. **If both primary routes return "no" or "12+ week timeline", THEN investigate Paddle and Lemon Squeezy in parallel** — those two are the most likely fits.

### 4.4 Manual SBM transfer — suitability by buyer segment

| Buyer segment | Manual SBM wire suitable as primary? | Why |
|---|---|---|
| **Mauritius local** | ✅ **YES** | Buyer is already familiar with SBM. Local MUR wires are same-day, cheap, well-understood. Use this segment for first proof and case studies. |
| **South Africa (warm network)** | ⚠️ **WARM ONLY** | ZAR → USD wire to SBM via SWIFT is feasible. Most ZA banks support it. Friction is real (correspondent-bank fees, FX spread, 2–4 business-day timeline). Warm-network buyers tolerate it because trust is pre-established. Cold buyers will abandon. |
| **Australia (cold)** | ❌ **NO** | AUD → USD wire via SWIFT takes 3–5 business days, costs AUD 25–40 SWIFT fee + correspondent bank fees, and exposes the buyer to FX spread on their AUD-USD conversion. Cold buyer abandonment will be near-total. |
| **USA (cold)** | ❌ **NO** | USD → USD wire via SWIFT to a Mauritian bank is feasible but unfamiliar to US buyers. SWIFT fee USD 15–45 + correspondent-bank fees. Cold buyers expect Stripe/PayPal/Apple Pay one-click. Wire-instruction trust gap is significant. |
| **Europe / UK (cold)** | ❌ **NO** | Similar to USA; EUR/GBP → USD wire via SWIFT, slow and unfamiliar. Cold abandonment expected. |

**Rule of thumb:** manual SBM wire is acceptable when the buyer *already trusts the founder enough* to pay before clicking. That's a warm-network or referral-only context. For cold paid acquisition, manual wire is a non-starter regardless of segment.

### 4.5 Recommended Lead Rescue page / payment wording while the gateway is pending

Anton's recommended wording (adopted verbatim into doctrine as the *transitional CTA pattern*, pending a separate small packet to actually apply it to `pages/lead-rescue.js` and `components/AiLeadRescueLanding.js`):

> **"Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."**

**Brand-doctrine compliance check** (per `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* and the four-layer agent compulsion mechanism in `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`):

| Doctrine rule | This wording |
|---|---|
| Primary CTAs must describe buyer intent, not internal process | ✅ "Apply for the USD 150 launch pilot" describes buyer intent (an action the buyer wants to take). |
| Payment / routing complexity must come **after** buyer intent | ✅ Payment-method language ("secure payment link or invoice") appears *after* the intake-approval step, not before. |
| Do not use **"Choose payment path"** as the primary CTA for AI Lead Rescue | ✅ Not used. |
| Single offer rule (`JE-2026-05-28-1`) | ✅ One offer: *USD 150 launch pilot*. Verbatim match with `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*. |
| No revenue guarantees, no exaggerated AI claims | ✅ Nothing promised. |
| Setup-after-payment language (`JE-2026-06-01-3` Phase C cycle 4 operator-process discipline) | ✅ "Setup begins once payment is confirmed" — matches the ERPNext sandbox finding that *invoice-Paid* is the operator's gate before setup work begins. |

**Forbidden phrases (must NOT appear on any live surface):**

- ❌ "Pay now"
- ❌ "PayPal accepted" / any PayPal-branded button
- ❌ "Wise accepted" / any Wise-branded button
- ❌ "Instant checkout"
- ❌ "International bank transfer" as the **primary** CTA (it MAY appear as a payment method choice on the invoice itself, after intake approval, never as the public landing CTA)

**Operational sequence implied by the wording:**

```text
Intake form submitted   →   Operator (Anton) reviews
                                    ↓
                             ┌──────┴──────┐
                             │             │
                          Approved      Not yet
                             │             │
                             ↓             ↓
              Send secure payment    "Not a fit right now"
              link OR invoice         (handled per the
                  ↓                    standard outreach
              Payment confirmed       template, no payment
                  ↓                    asked)
              Setup begins
```

**Note on "secure payment link OR invoice":**

- "Payment link" = the SBM e-Commerce hosted page (when live) OR a Peach hosted page (when live) OR a Paddle/Lemon-Squeezy checkout (if MoR is adopted). Until any of these exist, "payment link" maps to **a manual SBM wire instruction inside a PDF invoice** sent from the ERPNext sandbox.
- "Invoice" = explicit ERPNext-generated PDF with SBM wire details. Acceptable for warm-network only per §4.4.

**Implementation packet (separate authorisation required):** when adopted, this wording change touches `pages/lead-rescue.js`, `components/AiLeadRescueLanding.js`, possibly `components/CorpFlowPublicHome.js` (the offer block), and (if the trust-band SVG references payment methods) `public/assets/visuals/lead-rescue-trust.svg` + `data/visual-assets/lead-rescue-trust.manifest.json`. The current live wording (per `JE-2026-05-28-1` + `JE-2026-05-28-3`) is **"AI Lead Rescue Setup — USD 150 launch pilot, invoiced after intake review"** — that is *consistent* with Anton's new wording above, so the public-copy gap is narrow. **Cursor will NOT touch the live page until separately authorised.**

## 5. What can be marketed now vs what must wait

| Activity | Status |
|---|---|
| Content production (articles, AI Lead Rescue articles 1–3, brand-doctrine-compliant copy) | ✅ **CONTINUES** |
| Proof video (`CF-VID-0001` already live; future walkthroughs through the GitHub Actions pipeline) | ✅ **CONTINUES** |
| Prospect scoring and qualified-intake workflow | ✅ **CONTINUES** |
| Apply-for-pilot CTA (per §4.5 wording above; adopted in a separate small packet) | ⚠️ **WORDING APPROVED, ADOPTION GATED** |
| Mauritius warm-network outreach (manual invoice path) | ✅ **CONTINUES** |
| South Africa warm-network outreach (Anton's existing relationships) | ✅ **CONTINUES** |
| Broad paid ads (Meta, Google, LinkedIn) pointing to a checkout flow | ❌ **WAIT** until SBM e-Commerce OR Peach OR MoR is live |
| Cold international paid acquisition with "pay now" CTA | ❌ **WAIT** until #1 / #2 / #3 of §3 priority list is live |
| Auto-onboarding promise ("pay and your AI agent goes live in X hours") | ❌ **WAIT** — premature even after payment is live; needs delivery automation first |
| Listing on third-party marketplaces (Product Hunt, IndieHackers) with "buy now" links | ❌ **WAIT** for portal |
| PayPal buttons / Wise buttons anywhere | ❌ **REMOVED** from plan |

## 6. Operator questions for SBM e-Commerce Acquiring

To send to SBM's e-Commerce acquiring team. The intent is to land a single email / call that returns enough information to decide GO / NO-GO / WAIT.

1. **USD acquiring** — does SBM e-Commerce accept USD-denominated card payments from international buyers? If yes, what is the settlement currency to our CorpFlowAI Ltd account (USD direct, MUR after auto-FX, operator choice)?
2. **Beneficial-owner identity** — we are a Mauritian-registered company. The sole beneficial owner is a South African citizen currently in the process of obtaining Mauritian residency. Is this configuration onboardable on SBM e-Commerce? What KYC documents are required, in what order?
3. **Onboarding timeline** — best-case timeline from signed application to first live transaction. Realistic timeline. Worst-case timeline.
4. **Fees** — Merchant Discount Rate (MDR) per transaction. Monthly minimum. Setup fee. Refund fee. Chargeback fee. Any minimum-volume clause.
5. **Hosted checkout vs pay-by-link** — do you offer a hosted checkout page (we redirect buyer to SBM's checkout) AND/OR a pay-by-link product (we email or SMS the buyer a one-time-use payment link)? Which one is right for a USD 150 one-off invoice (no recurring)?
6. **3-D Secure flow** — what is the 3-D Secure (3DS2 / SCA) experience for international buyers? Mobile-friendly?
7. **Settlement timeline** — T+? days to our SBM Mauritius account after a successful transaction?
8. **Reconciliation export** — does the merchant portal produce CSV / Excel / API export of transactions for accounting reconciliation? Sample export available?
9. **Refund mechanics** — how is a refund initiated? Same-day? T+?
10. **Recurring billing** — supported? (Asked for future state; not required for the USD-150 one-off pilot.)
11. **Currency hedging** — if settlement is MUR after auto-FX from USD captures, what is the FX spread we should expect? Is there an option to settle USD directly to a USD-denominated SBM account?
12. **Sandbox / test environment** — do you provide test card numbers and a sandbox merchant for integration testing before going live?

## 7. Operator questions for Peach Payments

1. **Mauritian-company onboarding** — can Peach onboard CorpFlowAI Ltd (a Mauritian-registered company)?
2. **Beneficial-owner identity** — sole beneficial owner is a South African citizen with pending Mauritius residency. Onboardable? Required KYC documents?
3. **Settlement bank** — can Peach settle to SBM Bank Mauritius? If not, where would settlement go and is that a problem?
4. **USD acquiring** — accept USD-denominated card payments from international (US, AU, EU, ZA) buyers? Settlement currency?
5. **Hosted checkout / pay-by-link** — same shape as SBM question 5.
6. **Fees** — MDR, monthly, setup, refund, chargeback.
7. **Onboarding timeline** — best / realistic / worst case.
8. **3-D Secure and SCA** — buyer experience for international buyers.
9. **Settlement timeline** — T+? to SBM Mauritius (or wherever Peach settles).
10. **Reconciliation export** — CSV / Excel / API.
11. **API / hosted-page integration effort** — for a Next.js + Vercel front end with the buyer redirected from `lead-rescue.corpflowai.com` (or apex `/lead-rescue`) to the Peach checkout page.
12. **Sandbox / test environment** — test credentials available?

## 8. Honest limits of this doc

- **Cursor does not have authoritative product specifications for SBM e-Commerce, Peach Payments, Paddle, Lemon Squeezy, FastSpring, 2Checkout/Verifone, or Polar.** Anything written above as a "trade-off" or "expected fit" is a research framework, not a commitment. The providers' own replies are authoritative.
- **Cursor cannot evaluate the UBO citizenship + pending residency policy for any of these providers.** That is a compliance / policy question that requires the provider's documented onboarding policy or a direct yes/no on a discovery call.
- **No live payment copy has been changed by this doc.** The recommended wording in §4.5 is captured as the *transitional pattern* but is NOT yet applied to `pages/lead-rescue.js` / `components/AiLeadRescueLanding.js`; adoption requires a separate small operator-authorised packet.
- **No payment gateway is configured.** No API key has been created. No KYC submitted. No ERPNext production setting modified.
- **The current live Lead Rescue page wording** (per `JE-2026-05-28-1` + `JE-2026-05-28-3`) is **"AI Lead Rescue Setup — USD 150 launch pilot, invoiced after intake review"**. This is already consistent with the new §4.5 transitional wording at a high level; the public-copy delta to land Anton's updated wording is modest and can be scoped as a tiny packet when ready.

## 9. Hard limits honoured by this doc (per Anton's DECISION)

- ✅ No payment gateway configured.
- ✅ No live payment copy changed.
- ✅ No API keys created.
- ✅ No KYC submitted.
- ✅ No ERPNext production setting changed.
- ✅ No env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behaviour, Vercel config, GitHub settings, deployment settings, or payment settings touched.

## 10. Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — single offer rule, payment-after-intake rule, USD 150 launch pilot wording.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator-side pipeline, status states, communication templates.
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` §3.1, §4 — invoice + payment-request test plan; this doc is the commercial-readiness layer on top of that plan.
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — Phase C executed; the *invoice + bank-transfer / payment-link* operator workflow is GREEN on arithmetic. This payment-readiness doc establishes the *commercial routing* layer above that workflow.
- `docs/decisions/JOURNAL.md`:
  - `JE-2026-05-28-1` — Lead Rescue simplified to single USD launch pilot.
  - `JE-2026-05-28-3` — LR-1 closure: "USD invoice / after intake" doctrine update to trust band + apex pages.
  - `JE-2026-06-01-3` — ERPNext Phase C: USD-launch-pilot test cycles executed; setup-after-payment operator-process discipline confirmed.
  - `JE-2026-06-01-4` — **this DECISION**: payment route priority update; PayPal hold; Wise removed; SBM primary + Peach secondary; commercial market split; CTA wording shift while gateway pending.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required when ANY live payment gateway integration is added (deferred until that packet runs).

## 11. ANTON TO-DO (operator-side; this doc does not perform these)

1. **Follow up with SBM e-Commerce** for: payment links / hosted checkout, USD settlement, reconciliation export. Use the §6 question list as a starting template.
2. **Follow up with Peach Payments** on: Mauritian company onboarding + South African beneficial owner + SBM settlement account. Use the §7 question list as a starting template.
3. **Decide whether to investigate merchant-of-record backup next** — Paddle / Lemon Squeezy are the most likely fits per §4.3. Recommendation: hold MoR investigation until SBM + Peach reply, unless either provider returns a 12+ week timeline.
