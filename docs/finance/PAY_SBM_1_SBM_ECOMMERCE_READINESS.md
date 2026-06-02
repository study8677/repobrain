# PAY-SBM-1 — SBM e-Commerce application readiness

**Status:** Docs-only readiness packet. **No live page is edited by this document.** No payment gateway is configured. No API key is created. No KYC submitted. No application has been sent to SBM. No NDA / MCIB consent signed by Cursor. No raw SBM PDFs are committed to this repo. No completed forms are committed to this repo. No env vars / secrets / DNS / DB / `tenant_id` / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched.

**Anchor sentinel:** `<!-- PAY_SBM_1_SBM_ECOMMERCE_READINESS -->`

<!-- PAY_SBM_1_SBM_ECOMMERCE_READINESS -->

**Author:** Cursor (assistant), under Anton's direct authorisation per chat 2026-06-02 (*"Re: SBM eCommerce application readiness — uploaded SBM documents reviewed in ChatGPT"*, Operator Bridge issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)). **Cursor did not read the raw SBM PDFs.** This document is derived entirely from the sanitized summary Anton supplied in the DECISION; the authoritative SBM documents remain in Anton's local / ChatGPT context and **must not** be uploaded to this repo. The six SBM document names recorded in the DECISION are kept as references only:

- `eCommerce Services - Payment Gateway.pdf`
- `Web Site Requirements.pdf`
- `Ref172 Merchant Pre-Screening (002)- 21 MAY 2024.pdf`
- `REF181 Business Continuity Plan - Editable Version.pdf`
- `Ref91_MCIB _ Corporate.pdf`
- `REF176 Non-Disclosure Agreement_Editable Format_Ver Sep 2023.pdf`

---

## 0. Hard limits + sensitive-data exclusion (read first)

### 0.1 What must NOT enter this repo or any git history

| Category | Examples | Why it is excluded |
|---|---|---|
| **Personal identity documents** | passport scan, national ID, proof of address bills, driver's licence | KYC requirement; personal data; never commit. |
| **Beneficial-owner / shareholder personal data** | full name + ID number combinations, dates of birth, residential address, MRA / SARS tax numbers | KYC requirement; personal data; never commit. |
| **Bank reference details** | actual SBM account number, IBAN, SWIFT BIC, real bank statements | Sensitive financial data. |
| **Signed legal documents** | signed NDA, signed MCIB consent, signed merchant agreement | Legally sensitive; usually contains personal signatures + corporate seal. |
| **Completed application / pre-screening forms** | the Ref172 Pre-Screening with answers, the Ref91 MCIB with consent ticked | Contains personal + corporate confidential data. |
| **KYC source documents** | certificate of incorporation (only as PDF, OK as text reference); MRA registration; AML / source-of-funds declaration | Treat as sensitive; corporate fact-pattern is OK to reference, the PDFs are not. |
| **Real client / transaction data** | real customer names, real card numbers (full or last-4), real ticket amounts on real invoices | Card data is never collected here; client data lives in the operational systems, not in docs. |
| **Bank statements** | any actual statement page from any SBM or other account | Sensitive financial data. |

### 0.2 What this packet WILL do

- Capture the **shape** of what SBM appears to require (per Anton's sanitized summary).
- Produce **draft answers** Cursor can responsibly write (business description, fulfilment description, support process, risk controls, transaction forecast).
- Audit the **live public site** for SBM-style web-compliance requirements and flag concrete gaps.
- Compile a **clarification question list** for SBM, extending the §6 list already in [`docs/finance/PAYMENT_READINESS_2026_06_01.md`](PAYMENT_READINESS_2026_06_01.md) with the new SBM-document-specific questions Anton named.
- Recommend a **two-step PR plan** (this readiness PR first, page-compliance-copy PR second, no payment integration until SBM approval).

### 0.3 What this packet will NOT do

- ❌ Submit any application to SBM.
- ❌ Sign NDA, MCIB, or any other SBM document.
- ❌ Configure any payment gateway.
- ❌ Create any API key.
- ❌ Change any payment functionality in the runtime.
- ❌ Touch ERPNext production settings.
- ❌ Change `pages/lead-rescue.js`, `components/AiLeadRescueLanding.js`, `pages/index.js`, or any live customer-facing component or meta tag (the page-compliance-copy work is a **separate** future PR per §9 and requires separate operator authorisation).
- ❌ Touch env vars / secrets / DNS / production DB / `tenant_id` / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings.

---

## 1. SBM application document checklist

Each row maps to a deliverable SBM expects (or appears to expect, per Anton's sanitized summary). Ownership column is the **only authoritative** column — Cursor can *draft* anything, but only Anton signs and submits.

### 1.1 What Cursor can DRAFT (no sensitive data)

| # | Deliverable | Where the draft lives in this repo | Owner of final submission |
|---|---|---|---|
| D1 | **Business description** — CorpFlowAI Ltd, Lead Rescue, AI-assisted workflow services, digital services only, no restricted goods | This doc § 3 | Anton |
| D2 | **Operational fulfilment description** — intake review → invoice / payment link → payment confirmation → setup → alerts / logging / follow-up workflow → support and monitoring | This doc § 4 | Anton |
| D3 | **Customer support and complaints process** — response within 2 working days, support email, escalation, refund / cancellation handling | This doc § 5 | Anton |
| D4 | **Risk controls** — no physical goods, manual intake approval before payment, no high-risk categories, refund policy, fraud monitoring posture, ERPNext reconciliation, no card-data storage on CorpFlowAI infrastructure | This doc § 6 | Anton |
| D5 | **Transaction forecast** — conservative launch assumptions (volumes per day / week / month, average ticket USD 150, maximum ticket TBD) | This doc § 7 | Anton |
| D6 | **SBM clarification question list** — extends `PAYMENT_READINESS_2026_06_01.md` § 6 with the new SBM-document-specific questions named by Anton (Alipay availability; MCIB mandatory?; newly trading company forecast acceptance) | This doc § 8 | Anton |
| D7 | **Public-site compliance copy** (separate future PR) — adds the SBM-style web-compliance items missing from the public site (currency display, support contact, merchant address-and-country disclosure, payment-card transmission statement, receipt-policy line). Scope drafted here but **not edited into live pages** by this packet. | This doc § 2 and § 9 | Anton (separate authorisation) |

### 1.2 What Anton must COMPLETE personally (sensitive / personal / legal)

| # | Deliverable | Why personal | Where it goes |
|---|---|---|---|
| A1 | **Personal identity documents** — passport, proof of address, any photo ID required | KYC; personal data | Never in this repo. Anton's local KYC folder + direct submission to SBM. |
| A2 | **Director / shareholder / beneficial-owner details** with personal data fields filled in | KYC; identity data | SBM Pre-Screening form (Ref172) completed offline. |
| A3 | **Signed NDA** (Ref176) | Personal signature; corporate seal | Anton signs; one signed copy emailed to SBM. **Do not commit signed PDF.** |
| A4 | **Signed MCIB consent** (Ref91), *if SBM confirms it is required for e-Commerce acquiring* — see § 8 clarification list | Personal signature; consent to credit-information bureau search | Anton signs; emailed to SBM. **Do not commit.** |
| A5 | **Bank reference / statements / account numbers** | Sensitive financial data | Anton supplies directly to SBM out-of-band. |
| A6 | **Pre-Screening application** (Ref172) — completed with the corporate + personal data fields, plus Cursor's draft answers (D1–D5) pasted into the relevant text fields | Mixture of personal + business; final signature is Anton's | Anton merges Cursor's drafts + personal fields; submits. |
| A7 | **Website Requirements compliance attestation** (per the SBM *Web Site Requirements.pdf*) — confirming the live site meets the SBM web checklist | Final sign-off must come from Anton (and ideally legal / company secretary) | Anton signs after the § 9 *page-compliance-copy* PR is merged and live-verified. |

### 1.3 What an external reviewer should check before submission

| # | Reviewer | What they confirm |
|---|---|---|
| R1 | **Company secretary** (or Anton acting in that capacity) | Mauritius BRN / certificate of incorporation, registered office address, current shareholding, directors register, any UBO declarations are up-to-date and match the data being submitted to SBM. |
| R2 | **Accountant** (or Anton acting in that capacity) | The § 7 transaction forecast is realistic and consistent with the company's actual operating plan; the SBM acquiring relationship will be reconciled through the ERPNext sandbox (now Phase C-complete per `JE-2026-06-01-3` / `JE-2026-06-01-5`) on a path to production once Phase D is authorised. |
| R3 | **Legal review** (optional but recommended) | NDA terms (Ref176) acceptable; MCIB consent scope acceptable; merchant agreement (when SBM sends it after approval-in-principle) acceptable. Cursor cannot give legal advice. |

---

## 2. Website compliance gap audit

Live audit run on 2026-06-02 against `https://corpflowai.com/`. All 10 surveyed routes return **HTTP 200**:

| Route | HTTP | Compliance-relevant content present today | Compliance-relevant content **missing** today |
|---|---|---|---|
| `/` | 200 | CorpFlowAI brand, single offer (USD 150 launch pilot) framing, SSL ✅, no card collection ✅ | Public support email; public business address (Mauritius); explicit transaction-currency statement |
| `/lead-rescue` | 200 | Offer description (USD 150 launch pilot, 48-hour setup); intake form (no card / banking fields ✅); *"no card on this page"* trust band; *"invoiced after intake review"* sequence; *"Payment links and invoice details are issued after intake review. Do not enter card or banking details on this page."* footnote | Public support email; explicit transaction-currency statement (*"All transactions are processed in USD"*); merchant address-and-country disclosure footer line; payment-card transmission statement |
| `/refund-policy` | 200 | Setup-fee refund language; AI Lead Rescue launch-pilot refund clause (refund before setup work starts; pro-rata after); cancellation handling for monthly monitoring | An explicit *chargeback-handling note* (when payments go live via SBM, refund mechanics will be SBM-mediated — see § 8 Q9) |
| `/privacy` | 200 | Information collected (intake fields, operational info, technical logs); how info is used; *"We do not collect card or banking details"* statement; retention; access / correction / deletion rights | Data-protection-officer or contact-for-privacy email (currently routes via intake / contact page only); explicit subprocessor list referencing `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` |
| `/terms` | 200 | Service description; intake / engagement framing; no-revenue-guarantee clause; client responsibilities; acceptable use; *"This website does not collect card or banking details"*; limitation of liability; governing law confirmed-on-invoice | Public support email; clear transaction-currency statement; explicit export / geographic restrictions section |
| `/contact` | 200 | *"Start with intake"* CTA to `/lead-rescue`; *"contracting entity will be confirmed on the invoice or service agreement"*; existing-client login link | **No public support email or phone** — a card scheme will typically require one |
| `/about` | 200 | Founder's note; *"We are based in Mauritius and work with clients in Mauritius and internationally"*; *"intake first, payment after review"* principle; *"no revenue guarantees"* principle | Registered office street address; Mauritius Business Registration Number; company seat / contracting entity statement at footer level |
| `/standards` | 200 | Review cadence; monitoring; payment-after-review; no-revenue-guarantees; security posture (tenant isolation, intake first / payment second, least-access pilots, hand-over by default) | Explicit *"payment-card transmission"* statement (SBM-style; today the page says *"Authentication never collects card data on this site"* which is close but not quite the same wording) |
| `/process` | 200 | Five engagement stages | (No SBM-specific gap unique to this page) |
| `/onboarding` | 200 | First 14 days, day by day | (No SBM-specific gap unique to this page) |

**Forbidden-phrase audit (re-verified for SBM context):** repo-wide case-insensitive search for *"Pay now"* / *"PayPal accepted"* / *"Wise accepted"* / *"instant checkout"* / *"international bank transfer"* matches **3 files only** — the docs that *define* the forbidden list (`docs/finance/PAYMENT_READINESS_2026_06_01.md`, `docs/decisions/JOURNAL.md`, `artifacts/chat_history.md`). **Zero matches in any live-rendered file.** No forbidden brand or wording appears on the live site today.

### 2.1 Concrete gap list (the things § 9 page-compliance-copy PR would land — when authorised)

| Gap | Where to land it | Suggested wording (DRAFT — adopt only after Anton + SBM confirmation) |
|---|---|---|
| **G1 — Public support email** | Footer of `PublicSiteFooter.js` (apex pages); `/contact` page; potentially `/lead-rescue` page footnote | DRAFT: `For service support, write to support@corpflowai.com. We respond within two business days.` *(Anton must confirm the inbox exists and is monitored; this can be a Gmail-via-Workspace alias on the existing domain.)* |
| **G2 — Registered business address** | Footer of `PublicSiteFooter.js`; `/about` page footer; `/terms` § *Governing law* block | DRAFT: `CorpFlowAI Ltd, [Registered office street address, Mauritius]. Business Registration Number: [BRN].` *(Anton supplies the actual address + BRN; Cursor does not commit the values.)* |
| **G3 — Explicit transaction currency** | `/lead-rescue` payment section; `/terms` payment section | DRAFT: `All transactions for the AI Lead Rescue launch pilot are processed in USD.` |
| **G4 — Service fulfilment / delivery policy** (digital service, no shipping) | `/terms` § *Service description* block, or a new `/fulfilment` page | DRAFT: see § 4 of this doc; the wording can be ported verbatim. |
| **G5 — Payment-card transmission statement** | `/privacy` and `/standards` | DRAFT: `Payment-card transmission, when a card-on-website option is offered in future, will happen exclusively on the gateway's hosted page over TLS. Card details are never transmitted to or stored on CorpFlowAI servers.` |
| **G6 — Customer support / complaints process** | `/contact` page (extend) or new `/support` page | DRAFT: see § 5 of this doc. |
| **G7 — Receipt / invoice policy** | `/terms` § *Payment* block; `/refund-policy` page | DRAFT: `Each successful payment is acknowledged by a PDF invoice issued by CorpFlowAI Ltd, recorded against the ERPNext finance ledger.` *(ERPNext production status is currently HELD per `JE-2026-05-29-1`; the sandbox is Phase C-complete per `JE-2026-06-01-3` / `JE-2026-06-01-5`. Production go-live is its own gated packet.)* |
| **G8 — Export / geographic restrictions** | `/terms` § *Acceptable use* block | DRAFT: `CorpFlowAI services are offered globally for lawful business use. We may decline an engagement if local sanctions, regulatory, or trust-and-safety reasons apply.` |
| **G9 — Card-scheme logos** (post-approval) | `/lead-rescue` payment section trust band | **DO NOT add Visa / Mastercard / UnionPay / JCB / Alipay logos to the page until SBM has formally approved the acquiring agreement** and Anton has confirmed the visual usage guidelines and any required attribution language with SBM. This is a *post-approval* deliverable, not part of any pre-application PR. |

**None of G1–G9 are edited into live pages by this PR.** They land in the § 9 page-compliance-copy PR, which requires separate operator authorisation.

---

## 3. DRAFT business description (for SBM merchant pre-screening — Anton reviews before submission)

> **CorpFlowAI Ltd** is a Mauritian-registered AI-assisted operations company that builds lightweight digital workflow systems for small businesses. The flagship productized service is **AI Lead Rescue**, a USD 150 launch pilot that captures new business enquiries from a client's existing lead source (website form, email, WhatsApp, Google Form, etc.), pushes instant alerts to the business owner, logs every lead, surfaces follow-ups daily, and includes seven days of post-launch monitoring.
>
> All services are **digital and operationally-delivered**. CorpFlowAI **does not** trade in physical goods, regulated financial products, regulated investment advice, regulated medical advice, regulated legal advice, gambling, adult content, firearms, controlled substances, cryptocurrency exchange services, or any other restricted category. The deliverables are workflow setup work (configuration of forms, alerts, logging tools), monitoring, daily summary delivery, and operator support. Output artefacts (Google Sheets, scripts, configurations) belong to the client at the end of the engagement.
>
> The single payment moment in the buyer journey is the **USD 150 launch pilot invoice**, issued after CorpFlowAI manually reviews the buyer's intake form and confirms the work fits. There is no "buy now" path on the website; the website collects no card or banking details. Payment is collected through the SBM e-Commerce acquiring relationship (when active) using a hosted payment link or hosted checkout page. The setup work begins only after payment is confirmed in the CorpFlowAI ERPNext finance ledger.

DRAFT — Anton reviews wording (especially: services list, restricted-category list, currency, ticket size) before submission.

---

## 4. DRAFT operational fulfilment description (for SBM application — Anton reviews before submission)

> **Buyer journey, end-to-end:**
>
> 1. Buyer lands on `https://corpflowai.com/lead-rescue` (or the dedicated `aileadrescue.corpflowai.com` host) and submits the intake form. The form collects business name, contact name, email, phone (optional), current lead-source description, and a short message describing the follow-up problem to fix first. **No card or banking details are entered on the website.**
> 2. Within two business hours of submission, a CorpFlowAI operator reviews the intake for scope-fit. Approved intakes proceed; declined intakes receive a written explanation and no payment is requested.
> 3. For approved intakes, CorpFlowAI issues a single **USD 150 invoice** for the *AI Lead Rescue Setup — USD 150 launch pilot*, delivered via secure payment link (SBM e-Commerce hosted page, when live) **or** a PDF invoice carrying explicit wire instructions to the CorpFlowAI Ltd SBM account.
> 4. Buyer pays via the secure payment link (hosted checkout on the gateway's domain) or wire. CorpFlowAI confirms payment receipt against the ERPNext finance ledger.
> 5. The **48-hour setup clock starts on the timestamp of confirmed payment receipt**, not on any earlier checkpoint.
> 6. CorpFlowAI delivers the agreed Lead Rescue scope inside the 48-hour window: connect one lead source, install owner / operator alert routing, set up a Google Sheet lead log, install a simple follow-up status board, install a daily lead-summary delivery, begin seven days of pilot monitoring.
> 7. Daily progress notes are sent to the buyer during the 48-hour build.
> 8. At the end of the 48-hour window, the system is handed over to the buyer (all artefacts belong to the buyer) and seven days of monitoring begins.
> 9. Optional monthly monitoring can be agreed separately at the end of the seven-day window; it is **not** included in the USD 150 launch pilot.

**Delivery / service-fulfilment policy (digital service, no shipping):** the AI Lead Rescue launch pilot is a digital service. There is no physical shipment. Service fulfilment is measured in elapsed time from the payment-confirmation timestamp to the live-pilot timestamp (target: 48 hours; soft-cap: 5 business days for unusual constraints, communicated in writing if applicable).

**Receipt / invoice policy:** each successful payment is acknowledged by a PDF invoice issued by CorpFlowAI Ltd, with the invoice number, line item, ticket amount, currency, payment route, and payment confirmation timestamp recorded against the CorpFlowAI Ltd finance ledger.

DRAFT — Anton reviews wording, especially the 48-hour SLA + soft-cap commitments, before submission.

---

## 5. DRAFT customer support and complaints process (for SBM application — Anton reviews before submission)

> **Channel of record:** `support@corpflowai.com`. *(Anton confirms the inbox is monitored before this address is added to the public site or submitted to SBM.)*
>
> **Response SLA:** initial human response within **two business days** of receipt; for active engagements during a live pilot window, response within **one business day**.
>
> **Escalation path:**
>
> - Tier 1: support inbox; routine queries, billing questions, scope clarifications.
> - Tier 2: founder review; for engagements where Tier 1 cannot resolve within five business days, or where the buyer asks to escalate.
> - Tier 3: external mediation / regulatory channel; only if Tier 2 cannot resolve and the buyer is entitled to that path under Mauritian consumer-protection or merchant-agreement terms.
>
> **Complaints handling:** any buyer complaint is acknowledged in writing within two business days, investigated, and answered with either a resolution, a partial refund, or a written explanation of why no refund is offered, in line with [`/refund-policy`](https://corpflowai.com/refund-policy) and the merchant agreement.
>
> **Refund and cancellation handling:** as published on [`/refund-policy`](https://corpflowai.com/refund-policy). For the AI Lead Rescue USD 150 launch pilot: refunds are available before setup work has started; after the 48-hour clock has started, refunds are discretionary or pro-rated based on work performed.
>
> **Chargeback handling (when SBM e-Commerce is live):** CorpFlowAI participates in the SBM chargeback evidence-supply process per the merchant agreement and supplies the operator-side evidence (intake form copy, scope-confirmation email, payment-confirmation timestamp, delivery artefacts, support correspondence) within the timeline SBM specifies.

DRAFT — Anton confirms the inbox exists / is monitored, confirms the SLA commitments, and confirms the Tier 3 wording before submission.

---

## 6. DRAFT risk controls (for SBM application — Anton reviews before submission)

> **Product risk profile — LOW for card-acquiring purposes:**
>
> | Dimension | CorpFlowAI Ltd posture |
> |---|---|
> | **Physical goods** | None. Digital workflow service only. No shipping, no inventory, no warehouse, no fulfilment partner. |
> | **High-risk category** | None. CorpFlowAI does not operate in adult content, gambling, firearms, regulated investments, regulated medical advice, regulated legal advice, controlled substances, cryptocurrency exchange, money-services-business activity, or any other high-risk MCC. |
> | **Customer base** | Small-business operators. Owner-led businesses with modest enquiry volumes who need lead-capture + follow-up plumbing. |
> | **Geographic markets** | Mauritius (warm / local); South Africa (warm / network); Australia, USA, EU, UK (cold international — gated by trusted payment portal availability per `JE-2026-06-01-4`). |
> | **Ticket size** | One-off USD 150 launch pilot is the entry SKU. Future productized monthly monitoring is a separate, lower-frequency SKU when introduced. **Average ticket: USD 150. Maximum ticket: TBD — proposed conservatively at USD 1,500 (per § 7).** |
> | **Card-data handling** | **CorpFlowAI servers never receive, store, or process card data.** All card capture happens on the gateway's hosted page (SBM e-Commerce hosted checkout / payment link) over TLS. CorpFlowAI receives only the gateway's confirmation message (transaction reference, ticket amount, currency, timestamp). |
> | **Intake approval gate** | **Manual operator review of every intake before any payment is requested.** Anonymous "pay now" paths do not exist. This is the primary fraud-prevention layer: buyers who would chargeback have to first submit a coherent business-context intake form and pass an operator review before any invoice is issued. |
> | **Refund posture** | Public refund policy at [`/refund-policy`](https://corpflowai.com/refund-policy). Refund handling SLA: acknowledged within two business days; processed via SBM-mediated refund mechanics per the merchant agreement. |
> | **Reconciliation** | All successful payments reconciled in the CorpFlowAI ERPNext finance ledger (Phase C-complete per `JE-2026-06-01-3`; multi-currency math GREEN; multi-user accountant-readonly role GREEN per `JE-2026-06-01-5`; production go-live is Phase D and currently HELD per `JE-2026-05-29-1`). The ERPNext Bank Reconciliation Tool will reconcile SBM settlement reports against the GL once Phase D is authorised. |
> | **Fraud monitoring** | Two layers in v1: (a) operator intake-review gate (manual, applies to 100% of buyers); (b) SBM's own 3-D Secure / fraud-scoring layer at the gateway. Future layers (velocity rules, IP fingerprinting, dispute-trend monitoring) are added as the engagement count grows. |
> | **PCI scope** | Out of scope for CorpFlowAI: card data never enters CorpFlowAI infrastructure. The hosted-checkout / payment-link architecture preserves SAQ-A-equivalent scope for CorpFlowAI. *(SAQ-A wording to be confirmed with SBM in § 8 Q-PCI.)* |

DRAFT — Anton reviews especially the maximum-ticket assumption (USD 1,500 in § 7), the SAQ-A scope claim (subject to SBM confirmation), and any high-risk MCC carve-out before submission.

---

## 7. Transaction forecast proposal (for SBM application — Anton reviews before submission)

> **Methodology note:** these are *conservative launch assumptions* for the AI Lead Rescue USD 150 launch pilot, not commitments. The forecast is sized so SBM understands the *initial expected volume* and *not-to-exceed envelope*; actual volumes will be reported through the SBM merchant portal.

### 7.1 Volume assumptions (DRAFT — Anton confirms)

| Scenario | Daily transactions | Weekly | Monthly | Monthly USD volume (avg ticket USD 150) |
|---|---|---|---|---|
| **Conservative launch (first 90 days)** | 0–1 | 1–3 | 4–10 | USD 600 – USD 1,500 |
| **Base case (months 4–9)** | 1–2 | 5–10 | 20–40 | USD 3,000 – USD 6,000 |
| **Upside (months 10–18, paid-acquisition once live)** | 3–5 | 15–25 | 60–100 | USD 9,000 – USD 15,000 |
| **Not-to-exceed envelope (for SBM's risk team)** | ≤ 10 | ≤ 50 | ≤ 200 | ≤ USD 30,000 |

### 7.2 Ticket sizing

- **Average ticket:** USD 150 (the launch pilot).
- **Maximum single-transaction ticket (proposed):** **USD 1,500** — to cover bundled-pilot or fast-follow scoping engagements without re-applying. Anton confirms this ceiling before submission; SBM may counter-propose. The application can also propose a **USD 500** cap if Anton prefers a tighter v1 ceiling.
- **Refund / chargeback envelope:** at the conservative launch scenario, the absolute refund / chargeback exposure is bounded by the monthly USD volume above (USD 1,500 maximum). A formal *refund-rate* and *chargeback-rate* target can be proposed in the SBM application — recommendation: target chargeback-rate **< 1%**, refund-rate **< 5%**, both of which are well below card-scheme thresholds.

### 7.3 Currency coverage requested

- **USD** — primary settlement / display currency for the AI Lead Rescue launch pilot.
- **MUR** — secondary, for warm-network Mauritius buyers if SBM supports MUR-display + MUR-settlement on the same merchant ID.
- **EUR / GBP** — optional / lower priority; flag for SBM's reply but do not block on it.

DRAFT — Anton confirms the upper-bound monthly USD figures (especially the *not-to-exceed envelope*) before submission.

---

## 8. Clarification questions for SBM (extends `PAYMENT_READINESS_2026_06_01.md` § 6)

The 12 questions in `PAYMENT_READINESS_2026_06_01.md` § 6 (USD acquiring; UBO citizenship; onboarding timeline; fees; hosted vs payment-link; 3DS; settlement timeline; reconciliation export; refund mechanics; recurring billing; currency hedging; sandbox / test) **stand as-is**. The list below **adds** the SBM-document-specific questions named by Anton in the DECISION and a few that the document review surfaced.

| Q# | Question | Why we are asking |
|---|---|---|
| **Q13 — Payment-link UX** | What does the SBM payment-link buyer-flow look like end-to-end? Is the link branded to CorpFlowAI Ltd, or to SBM Bank? Is the link a one-time-use URL or reusable? Can it carry an expiry? Mobile-responsive? | Anton needs to know what buyers actually see when they click the link from the invoice email. |
| **Q14 — Hosted checkout** | Does SBM offer a fully-hosted checkout page (buyer is redirected from `corpflowai.com/lead-rescue` to an SBM URL, completes payment, redirected back with a confirmation token)? What is the SLA on the redirect-back step? | Confirms the SAQ-A scope posture for CorpFlowAI. |
| **Q15 — API and webhooks** | Is there a documented REST API for: creating a payment intent / link, querying transaction status, initiating a refund, retrieving settlement reports? Are there webhooks for: payment-completed, payment-failed, refund-completed, chargeback-opened, chargeback-evidence-requested? | Required to plan the ERPNext-integration packet (future, after Phase D + after SBM approval). |
| **Q16 — Sandbox / test environment** | Does SBM provide a sandbox merchant ID with test card numbers? Are sandbox transactions visible in the same merchant portal? Is the sandbox a separate URL? Is sandbox access granted before or after the merchant agreement is signed? | Required for safe pre-production integration testing (the ERPNext sandbox bank-reconciliation cycles will use these test transactions). |
| **Q17 — sFTP reconciliation report format** | Anton's review notes that SBM supplies **sFTP reconciliation reports**. What is the file format (CSV / fixed-width / XML)? What is the schema (column names, units, currency code, settlement date format)? Sample file available? Daily, weekly, or monthly delivery? | Required to design the ERPNext Bank Reconciliation Tool import path (Phase D + future). |
| **Q18 — Alipay availability** | Anton's review notes that *Alipay is mentioned in the SBM presentation but not consistently repeated in the cards-accepted section*. Confirm: is Alipay part of the standard SBM e-Commerce package, an opt-in add-on, or out of scope? If in scope, what additional onboarding is required? | Anton flagged this as unconfirmed. |
| **Q19 — Settlement currency to SBM Mauritius account** | Confirms `PAYMENT_READINESS_2026_06_01.md` § 6 Q11 with the document-pack-specific phrasing: can the merchant choose to settle in USD direct to a USD-denominated CorpFlowAI Ltd SBM account, or is auto-FX to MUR mandatory? If USD-direct, are there additional account-opening prerequisites for the USD account? | Affects ERPNext finance ledger design (chart of accounts already includes both `Debtors - USD - CFS` and `Mauritius Domestic Bank - Main - CFS` per `JE-2026-06-01-3`). |
| **Q20 — Fees, rolling reserve, chargebacks** | Beyond the standard MDR / monthly / setup / refund / chargeback fees: is there a *rolling reserve* requirement on a new merchant (e.g., X% held for Y days)? What is the typical reserve schedule for a low-ticket digital-service merchant? Can a rolling reserve be unwound after a clean trading period? | Materially affects cash-flow forecasting for the launch quarter. |
| **Q21 — MCIB consent: mandatory for e-Commerce acquiring?** | Anton's review notes the Ref91 *MCIB Corporate* form. Is MCIB (Mauritius Credit Information Bureau) consent **mandatory** for an SBM e-Commerce acquiring application, or is it required only for credit-facility applications? If mandatory, what specific information is searched and how is the result used in the acquiring decision? | Avoids signing an MCIB consent unnecessarily. |
| **Q22 — Newly-trading-company posture (no 2 years of financials)** | CorpFlowAI Ltd is a newly-trading Mauritian company without two full years of historical financial statements. Does SBM accept a forecast / business-plan substitute (the § 7 forecast in this packet plus the § 3 business description), or does the application require a 24-month trading history before any e-Commerce acquiring decision can be made? If forecast-substitute is accepted, what additional comfort items help (e.g., founder background, existing CorpFlowAI Ltd SBM banking relationship, ERPNext finance-ledger evidence, pilot proof from warm-network buyers)? | Anton flagged this as the most likely scoping question; getting clarity here gates the whole timeline. |
| **Q23 — Card-scheme logo usage guidelines** | Once approved, what are SBM's guidelines for Visa / Mastercard / UnionPay / JCB (and Alipay if confirmed in Q18) logo placement, attribution language, and any required co-branding on the checkout page or invoice? | Needed before the § 9 page-compliance-copy PR's *Gap G9* item can land logos on `/lead-rescue`. |
| **Q24 — Receipt-format requirement** | Does SBM require a specific receipt format / fields on the buyer-facing receipt or the merchant-side invoice? Are there minimum-content requirements (merchant name, transaction reference, amount, currency, date, merchant contact)? Will an ERPNext-generated PDF invoice satisfy the requirement? | Confirms the § 4 *Receipt / invoice policy* draft above. |
| **Q-PCI — Compliance scope confirmation** | For a CorpFlowAI architecture that uses SBM hosted-checkout or hosted-payment-link only (no card-on-CorpFlowAI-website iframe / postMessage / direct-API capture), is the merchant's PCI-DSS scope **SAQ-A equivalent**? What is the annual attestation requirement on SBM's side? | Confirms § 6 *PCI scope* draft above. |

DRAFT — Anton confirms / adjusts wording before sending to SBM. The questions are scoped to a single discovery email or two follow-up calls.

---

## 9. Recommended next PR plan

### PR 1 (THIS PR) — `docs/pay-sbm-1-readiness`

- **Branch:** `docs/pay-sbm-1-readiness`.
- **Scope:** docs-only readiness report (this file) + `JE-2026-06-02-3` JOURNAL row (renumbered from the originally-planned `JE-2026-06-02-2` after the parallel `LR-Mauritius-Outreach-Copy-1` packet claimed that ID on the same day) + `<!-- PAY_SBM_1_SBM_ECOMMERCE_READINESS_HIST -->` chat-history sentinel.
- **Touches:** zero live pages, zero runtime, zero ERPNext, zero env, zero secrets, zero DNS, zero DB, zero `tenant_id`, zero Telegram, zero Vercel config, zero GitHub settings, zero Search Console, zero Plausible, zero analytics, zero payment settings.
- **Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only:** **COMPLETE** at PR merge (no customer-visible URL to probe by design).

### PR 2 (FUTURE, separate authorisation required) — page-compliance-copy PR

- **Branch (proposed):** `docs/pay-sbm-1-page-compliance-copy`.
- **Scope:** apply G1–G8 from § 2.1 to live pages (`PublicSiteFooter.js` support email + business address footer, `/lead-rescue` transaction-currency line + support-contact footnote, `/terms` add fulfilment-policy section + receipt-policy line + export-restrictions section, `/privacy` add payment-card-transmission statement + subprocessor cross-link, `/standards` extend the security-posture block, possibly add `/fulfilment` or extend `/process`). **G9 (card-scheme logos) is out of scope for PR 2** — logos land *post-SBM-approval* in a separate small packet.
- **Requires:** Anton's separate operator authorisation, including the concrete values for the registered office street address, BRN, and confirmed support inbox.
- **Verification:** preview-smoke deploy → live production check of `/lead-rescue`, `/terms`, `/privacy`, `/contact`, `/about`, `/standards`, footer on apex; forbidden-phrase audit remains GREEN; doctrine smoke continues to pass; Delivery Reality Audit per `.cursor/rules/delivery-reality.mdc`.

### PR 3 (FUTURE, after SBM approves the application) — gateway integration packet

- **Branch (proposed):** `feat/pay-sbm-eccomerce-integration-v1`.
- **Scope:** the actual SBM e-Commerce integration — hosted checkout or payment-link, ERPNext Payment Request → SBM link mapping, webhook receiver for payment-completed events, settlement-report sFTP fetcher, reconciliation glue. **All of this is GATED on SBM approval in principle, on Anton's separate authorisation, and on satisfying `.cursor/rules/security-sensitive-changes.mdc` + `docs/operations/SECURITY_REVIEW_CHECKLIST.md`.**
- **Requires:** ERPNext Phase D unblocked per `JE-2026-05-29-1`; the *Phase D* and *runbook §8.1 hardening* current standing-holds released.

### Decision tree (Anton's authorisation cadence)

```text
[NOW] PR 1 — this readiness PR — landed.
   ↓
[NEXT — operator decision] Anton sends SBM the § 8 clarification questions + § 1 deliverables.
   ↓
[BLOCKING] SBM reply.
   ↓
[OPERATOR DECISION] Anton authorises PR 2 (page-compliance-copy) — runs in parallel with the SBM application turnaround.
   ↓
[BLOCKING] SBM approval in principle.
   ↓
[OPERATOR DECISION] Anton authorises PR 3 (gateway integration) — requires Phase D unblocked + security-review checklist signed.
   ↓
[LIVE] First paid transaction via SBM e-Commerce.
```

---

## 10. ANTON TO-DO (operator-side; this packet does not perform these)

1. **Review the drafts** in § 3, § 4, § 5, § 6, § 7 of this doc against the actual SBM Ref172 Pre-Screening fields. Edit any draft language that conflicts with the form's specific phrasing.
2. **Confirm the inbox** for the public support email proposed in § 2.1 Gap G1 / § 5 (suggested: `support@corpflowai.com` via the existing CorpFlowAI Workspace alias). Send a test email; confirm SLA can be honoured.
3. **Decide the maximum-ticket assumption** in § 7.2 — USD 1,500 (proposed default) vs USD 500 (tighter v1 ceiling) vs another figure. Confirms a key SBM risk-team field.
4. **Send the § 8 clarification questions** (Q13–Q24 + Q-PCI) to the SBM e-Commerce acquiring contact, ideally combined with the 12 questions already in `PAYMENT_READINESS_2026_06_01.md` § 6 — one consolidated discovery email or one call.
5. **Submit Ref172 Pre-Screening** with: § 3 business description + § 4 fulfilment description + § 5 support process + § 6 risk controls + § 7 transaction forecast inserted into the relevant text fields, plus the personal / KYC / corporate data Anton supplies offline.
6. **Decide on MCIB consent** (Ref91) — sign only after § 8 Q21 returns a definite "yes, mandatory for e-Commerce acquiring".
7. **Sign the NDA** (Ref176) only after Anton (or legal review per § 1.3 R3) is satisfied with the NDA's scope.
8. **Authorise PR 2** (page-compliance-copy) when ready — Cursor will draft the PR after Anton's separate DECISION on the bridge.

---

## 11. Cross-references

- [`docs/finance/PAYMENT_READINESS_2026_06_01.md`](PAYMENT_READINESS_2026_06_01.md) — the canonical payment-readiness research framework; this doc is the *SBM-specific application layer* on top of that framework.
- [`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`](ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md) — Phase C reconciliation + multi-currency math GREEN; the ledger layer that will reconcile SBM settlements once Phase D is authorised.
- [`docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`](ERPNEXT_SANDBOX_PLAN_V1.md) — sandbox-to-production plan.
- [`docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md`](../marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md) — Lead Rescue transitional payment wording proposal (separate packet; complementary to PR 2 in § 9).
- [`docs/decisions/JOURNAL.md`](../decisions/JOURNAL.md):
  - `JE-2026-05-28-1` — single offer rule;
  - `JE-2026-05-28-3` — LR-1 closure;
  - `JE-2026-05-29-1` — ERPNext sandbox host decision; Phase D gating;
  - `JE-2026-06-01-3` — Phase C arithmetic GREEN;
  - `JE-2026-06-01-4` — payment route priority + forbidden phrases;
  - `JE-2026-06-01-5` — C-1 Option B accountant-readonly role RESOLVED;
  - `JE-2026-06-02-1` — LR-Pay-1 transitional wording proposal (PR #281, open);
  - `JE-2026-06-02-2` — LR-Mauritius-Outreach-Copy-1 (PR #282, merged `8b5f12b1`);
  - `JE-2026-06-02-3` — **this packet**.
- [`docs/operations/SECURITY_REVIEW_CHECKLIST.md`](../operations/SECURITY_REVIEW_CHECKLIST.md) — required when PR 3 (gateway integration) lands.
- [`docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`](../compliance/DATA_MAP_AND_SUBPROCESSORS.md) — to extend with the SBM acquirer + any associated subprocessors when PR 2 lands G5 (payment-card transmission statement) and the privacy-page cross-link.
- [`.cursor/rules/delivery-reality.mdc`](../../.cursor/rules/delivery-reality.mdc) — live-production verification standard (governs PR 2 and PR 3 closures).
- [`.cursor/rules/brand-conversion-doctrine.mdc`](../../.cursor/rules/brand-conversion-doctrine.mdc) — buyer-intent-first / payment-routing-after constraint applies to PR 2.
- [`.cursor/rules/security-sensitive-changes.mdc`](../../.cursor/rules/security-sensitive-changes.mdc) — governs PR 3.
- Operator Bridge issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) — coordination surface.

---

## 12. Honest limits of this packet

- **Cursor did not read the raw SBM PDFs.** Everything above is derived from Anton's sanitized summary of the document set. If the actual Ref172 / Web Site Requirements / Ref91 / Ref181 / Ref176 PDFs add fields or constraints not captured in the sanitized summary, those fields will be missing from the drafts above and must be added by Anton at completion time.
- **Cursor cannot evaluate the UBO citizenship + pending residency policy for SBM.** That remains a SBM-policy question per `PAYMENT_READINESS_2026_06_01.md` § 4.1.
- **Cursor has not contacted SBM.** No application submitted. No NDA / MCIB signed. No bank account opened or modified.
- **The drafts in § 3 – § 7 are starting-point text, not final submission copy.** They are intentionally written to be edited by Anton (and ideally legal / company-secretary review per § 1.3) before pasting into the SBM forms.
- **The §-2 website-compliance gaps are based on the live state of the public site at 2026-06-02.** If the site copy changes before PR 2 is authorised, the gap list will need a re-audit.
- **The § 7 transaction forecast is conservative by design.** If SBM's risk team comes back with a tighter not-to-exceed envelope, the figures will be revised in a small follow-up packet.

---

## 13. Footer

This is a **readiness report**. The live Lead Rescue page is unchanged. The SBM application has not been submitted. The NDA and MCIB are unsigned. No payment gateway is configured. No API key has been created. ERPNext production go-live remains HELD. The standing holds — Phase D, Phase C², runbook §8.1 hardening, production ERPNext, scheduler enablement, payment gateway configuration, Lead Rescue wording adoption — are unchanged by this packet. Adoption of any draft above into the SBM application or into live pages is gated on Anton's separate operator authorisation per § 9.
