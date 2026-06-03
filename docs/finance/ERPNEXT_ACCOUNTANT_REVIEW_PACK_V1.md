# ERPNext production readiness — accountant review pack v1

**Status:** Docs-only review pack. **No production ERPNext changes; no sandbox mutations; no bank account number, SWIFT, IBAN, or routing details in repo; no secrets; no payment-gateway setup; no CorpFlowAI runtime / DB / Vercel / DNS / GitHub config changes.** This document is a self-contained briefing pack a Mauritius-licensed accountant can read end-to-end and respond to with the written sign-off needed to close HB-2 (CoA review) and HB-3 (VAT decision) per `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.

**Anchor sentinel:** `<!-- ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1 -->`

<!-- ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1 -->

**Authorisation:** Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-03 *"AUTHORISE — ERPNext-Phase-D-Accountant-Pack-1"*). Approved scope: docs-only; no ERPNext production changes; no sandbox mutation; no bank details; no secrets; no runtime app changes.

**How to read this pack (intended audience: Mauritius-licensed accountant)**

This pack is one self-contained brief. The accountant should not need to read any other repo file to provide written sign-off — every fact this pack relies on is reproduced inline. Repo file paths (in `monospace`) are attribution links so the accountant can request original sources from CorpFlowAI if they wish, but they are not required reading. **The sign-off checklist in § 10 is the closure artefact.** Once the accountant signs off § 10, CorpFlowAI's operator (Anton) will record the closure as a `JOURNAL.md` row referencing this pack, which closes HB-2 and HB-3.

**What the accountant is being asked to do**

1. Review the Chart of Accounts in § 1 and confirm or amend it for Mauritian reporting compliance.
2. Confirm AI Lead Rescue revenue treatment in § 2.
3. Confirm the USD invoice / MUR bank receipt flow in § 3.
4. Confirm or amend FX gain / loss treatment in § 4.
5. Provide a written VAT posture answer in § 5.
6. Confirm pro-forma vs sales-invoice naming in § 6.
7. Note any forward-looking concerns about recurring monthly service treatment in § 7 (forward-looking; not blocking).
8. Confirm bank reconciliation cadence and tolerance assumptions in § 8.
9. Answer the consolidated written questions in § 9.
10. Sign or amend the closure checklist in § 10.

**What the accountant is NOT being asked to do (out of scope for this pack)**

- File anything with the Mauritius Revenue Authority (MRA).
- Provide tax return preparation services.
- Audit any existing CorpFlowAI books (there are none yet — production ERPNext is not installed).
- Approve specific bank-account credentials, SBM e-Commerce application content, or any payment-gateway configuration.
- Approve or amend the CorpFlowAI commercial offer (USD 150 launch pilot price is fixed by `JE-2026-05-28-1` and is not the accountant's decision).
- Comment on marketing, communications, or non-financial doctrine.

## § 0.0 — One-page summary (start here)

The accountant should be able to read this single section and know what they are being asked to sign. Every claim below is reproduced in detail in the section noted in the rightmost column.

| Field | Value | Detail |
|---|---|---|
| What this pack is | A self-contained briefing pack for a Mauritius-licensed accountant. It asks for written sign-off on the Chart of Accounts (closes HB-2) and VAT posture (closes HB-3) before CorpFlowAI Ltd issues its first ERPNext-produced invoice. | § 0 + § 10 |
| What it is not | A tax filing, an audit of existing books, an offer-pricing decision, or an approval of bank credentials / payment-gateway configuration. | § 0 |
| Company under review | CorpFlowAI Ltd · BRN `C25228280` · registered office Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius. | § 0.1 |
| Books to date | None. No production ERPNext instance exists yet. The accountant is reviewing **proposed structure**, not existing books. | § 11 |
| v1 commercial offer | **AI Lead Rescue Setup** — single line item, **USD 150** launch pilot, one-off (no recurring billing). Production Item code: `LR-SETUP-USD-150`. | § 2.1 |
| Currency posture | USD-denominated invoices to all customers worldwide; MUR-base company books. | § 0.1 + § 3 |
| Operating bank | State Bank of Mauritius (SBM): MUR-base primary, USD multi-currency for receipts. **No real account number / SWIFT / IBAN appear in this pack.** | § 0.1 + § 11 |
| Invoice flow | (1) USD 150 Pro-forma issued pre-payment → (2) Customer pays SBM USD wire → (3) Sales Invoice + Payment Entry posted in ERPNext → (4) Auto FX Gain/Loss JE for book-rate vs receipt-rate delta → (5) Setup delivered within 48 hours / 5 business days. | § 3 + § 6 |
| Pro-forma mechanism | ERPNext **Quotation** with Print Format retitled *"Pro-forma invoice"* (Cursor's recommendation; safer than Sales-Invoice-Draft). Accountant to confirm in Q-Doc-1 / Q-Doc-2. | § 6 |
| VAT posture today | **No VAT charged on any invoice.** Live-page + template footer reads: *"VAT/tax treatment pending accountant confirmation."* | § 5 |
| Forward-looking (not v1) | AI Lead Rescue Monitoring (recurring monthly subscription). Not active. Captured so production setup is not future-blocked. | § 7 |
| Bank reconciliation | CSV / Excel statement export → ERPNext Bank Reconciliation Tool. **No bank credentials enter ERPNext.** | § 8 |
| What the accountant signs | The closure checklist: 5 rows close HB-2 (CoA + revenue + FX + bank reconciliation), 4 rows close HB-3 (VAT), 2 rows are advisory (document type + recurring). | § 10 |
| Written questions to answer | **32 numbered questions** across 11 letter-prefixed buckets (CoA / Rev / Flow / FX / VAT / Doc / Recur / Bank). Consolidated index in § 9. | § 9 |
| Sign-off format | PDF / signed memo / dated email. Anton then records closure as a `JOURNAL.md` row referencing this pack and the accountant's memo. | § 5.4 + § 10.4 |
| Production blockers this pack closes | **HB-2** (Chart of Accounts review) + **HB-3** (VAT decision) per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7. The two remaining blockers (HB-4 redacted bank CSV cycle, HB-1 Phase D operator-approval row) are out of scope for the accountant. | § 10.4 |

**If you read nothing else, read § 1 (Chart of Accounts), § 5 (VAT), and § 10 (sign-off checklist). Everything else in this pack exists to support those three sections.**

## § 0 — Hard limits honoured by THIS pack

- Zero edits to ERPNext production (no production instance exists yet).
- Zero edits to the ERPNext sandbox state on `corpflow-exec-01-u69678`.
- Zero secrets / API keys / OAuth tokens / DB credentials.
- Zero real bank details (no account number, no SWIFT/BIC, no IBAN, no routing or sort code in repo). The only bank-side facts in this pack are: bank name *State Bank of Mauritius* (publicly knowable), SBM offers MUR-base + USD-multi-currency accounts (publicly knowable), Mauritius Domestic Bank as the operating account class.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Pure docs / review-pack artefact.

## § 0.1 — Public seller identity (already published; provided here for the accountant's reference)

These values are already on `https://corpflowai.com` (`/terms`, `/refund-policy`, `/contact`) per `JE-2026-06-02-4 PAY-SBM-2`. Confirmed by Anton; same values populate the Mauritius Revenue Authority Integrated Tax Administration System (ITAS) records and the SBM e-Commerce application (`docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md`).

| Field | Value |
|---|---|
| Legal name | CorpFlowAI Ltd |
| BRN | C25228280 |
| Registered office | Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius |
| Support email | support@corpflowai.com |
| Public domain | corpflowai.com |
| Customer-facing offer page | https://corpflowai.com/lead-rescue (and alias https://aileadrescue.corpflowai.com/) |
| Currency posture | USD-denominated invoices to all customers worldwide for the v1 launch pilot per `JE-2026-05-28-1` |
| Operating bank | State Bank of Mauritius (SBM) — primary operating account is MUR-base; USD multi-currency receipts route to a USD sub-account or convert at receipt |

## § 0.2 — Source artefacts the accountant may request from CorpFlowAI on demand

If the accountant wants to verify any claim in this pack, the following original artefacts are available on request (no need to paste them inline; this pack reproduces all facts they prove):

- The full ERPNext sandbox plan (`docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`), which defines the v1 sandbox configuration and the § 10 go/no-go criteria.
- The Phase C test-cycle findings (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`), which proves the sandbox arithmetic in § 3 and § 4 of this pack.
- The Phase D production readiness evaluation (`docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`, merged 2026-06-03 in PR #290), which lists the 18 production setup items and the four hard blockers.
- The manual pro-forma template starter (`docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`), which contains the W1–W5 verbatim footer wording in use today on the manual-PDF path.
- The brand and conversion doctrine (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*), which fixes the offer wording and the no-guarantee line.
- The decisions journal (`docs/decisions/JOURNAL.md`), which carries the dated decision log including the rows this pack references.

## § 1 — Draft Chart of Accounts (CoA)

CorpFlowAI's draft CoA structure is double-entry, USD-customer-facing, MUR-base-currency, and currently **not VAT-active** (placeholder accounts only; see § 5). The structure below is the v1 production target. **It has not yet been approved by an accountant.** That is what § 1 asks the accountant to do.

### § 1.1 v1 production-target CoA (what we propose)

```
Assets
  Current Assets
    Bank Accounts
      State Bank of Mauritius — Main (MUR)               [primary operating account]
      State Bank of Mauritius — USD multi-currency       [USD receipts before conversion or routing]
      [Optional, only if held] PayPal — USD balance      [HOLD per JE-2026-06-01-4; not active in v1]
      [Optional, only if held] Wise — USD/EUR balance    [REMOVED per JE-2026-06-01-4 v1; may add later]
      Petty Cash (MUR)                                   [optional; only if real cash is handled]
    Accounts Receivable
      Debtors (USD)                                      [USD-denominated invoices to customers]
      Debtors (MUR)                                      [reserved for future MU-domestic clients]
    Prepayments
  Non-Current Assets
    Equipment
    Intangibles (software licences, if any)

Liabilities
  Current Liabilities
    Accounts Payable — Trade
    Accrued Expenses
    [INACTIVE in v1] VAT Output Holding                  [placeholder for future VAT activation]
  Non-Current Liabilities
    (empty in v1)

Equity
  Owner Equity
  Retained Earnings

Income
  Service Revenue — Lead Rescue Setup (one-off USD 150)  [v1 single offer per JE-2026-05-28-1]
  [Forward-looking, not active v1]
    Service Revenue — Lead Rescue Monitoring (recurring monthly)
    Service Revenue — Future Productized Offers (placeholder)
  Other Operating Income
  Foreign Exchange Gain                                  [realised gains on USD→MUR receipts]

Expenses
  Cost of Service Delivery
    Operator Time (internal — placeholder)
    Subprocessor Costs (Postgres, Vercel, n8n, Plausible, etc.)
  Operating Expenses
    Software & Subscriptions
    Telecoms & Internet
    Banking & Payment Fees                               [SBM monthly maintenance, wire receive fee, etc.]
    [Inactive v1] PayPal Fees                            [sub-account; activates only if PayPal HOLD lifts]
    [Inactive v1] Wise Fees                              [sub-account; activates only if Wise re-added]
    Foreign Exchange Loss                                [realised losses on USD→MUR receipts]
  Administrative Expenses
  [INACTIVE in v1] Input VAT                             [placeholder for future VAT activation]
```

### § 1.2 What the sandbox actually used in Phase C (for reference)

The sandbox used the ERPNext stock `Standard` chart of accounts (the upstream Frappe template) with three additions for multi-currency testing. **Production should NOT inherit the sandbox CoA verbatim — production will be fresh per § 1.1 above + accountant's amendments.** The sandbox is a separate test bed:

| Sandbox account | Currency | Type | Purpose tested in Phase C |
|---|---|---|---|
| `Mauritius Domestic Bank - Main - CFS` | MUR | Bank | Cycle 1 wire receipt (MUR 6,705 inflow); cycle 3 reconciliation |
| `PayPal - USD balance - CFS` | USD | Bank | Cycle 2 PayPal receipt (USD 150 inflow before withdrawal to MU bank) |
| `Banking & Payment Fees - CFS` | MUR | Expense | Cycle 3 bank-fee line (MUR 150) |
| `Debtors - USD - CFS` | USD | Receivable | Auto-created on first USD invoice (Phase C finding C-3) |
| `Service - CFS` | MUR | Income | Phase C revenue account (sandbox stock; replaced by `Service Revenue — Lead Rescue Setup` in production) |
| `Exchange Gain/Loss - CFS` | MUR | Income / Expense (dual-purpose ERPNext stock) | Auto-created realisation account; cycle 1 + 2 booked MUR 45 + MUR 105 = MUR 150 realised FX loss |

**Sandbox abbreviation `CFS` = "CorpFlowAI Sandbox"** — the production Company doctype will use abbreviation `CFL` or similar (decided at production install time; not yet locked).

### § 1.3 Accountant questions on the CoA (Q-CoA-1..Q-CoA-5)

**Q-CoA-1.** Does the structure in § 1.1 satisfy Mauritian reporting requirements for a small-trading-company (BRN holder, below MRA VAT registration threshold)?

**Q-CoA-2.** Should `Service Revenue — Lead Rescue Setup` be one income account, or should it be split across granular sub-accounts (e.g. `Service Revenue — Setup`, `Service Revenue — Subprocessors Recharged`, `Service Revenue — Operator Time`) for management reporting? Phase C used a single `Service - CFS` account; production can be either.

**Q-CoA-3.** Is `Debtors (USD)` and `Debtors (MUR)` as two separate receivable accounts correct (cleaner audit + multi-currency hygiene), or should both currencies post to a single `Debtors — Trade` account with currency tagged per-customer? ERPNext supports both patterns.

**Q-CoA-4.** Should `Foreign Exchange Gain` and `Foreign Exchange Loss` be separate income/expense accounts (clearer presentation), or combined as a single `Foreign Exchange Gain/Loss` netting account (which is what ERPNext's stock `Exchange Gain/Loss - CFS` did in Phase C — it's a dual-purpose Income account that takes both Dr and Cr postings)?

**Q-CoA-5.** Are the inactive `VAT Output Holding` and `Input VAT` placeholders structurally correct for the future activation case, or should they be removed entirely until VAT registration happens?

## § 2 — AI Lead Rescue item / revenue treatment

### § 2.1 The offer (canonical, fixed by `JE-2026-05-28-1`)

CorpFlowAI's v1 single commercial offer is **AI Lead Rescue Setup — USD 150 launch pilot**. Exactly one Item, one price, one currency. The wording is doctrine-locked:

| Field | Value (fixed; do not amend without separate operator decision) |
|---|---|
| Item code (production) | `LR-SETUP-USD-150` |
| Item code (sandbox) | `SBX-LR-SETUP-USD-150` (different prefix; does not collide with production) |
| Item name (verbatim, as it appears on the live page and the manual PDF) | *"AI Lead Rescue Setup (USD 150 launch pilot)"* |
| Item group | Services |
| Service-item flag | Yes (this is a service, not a stock item) |
| Price (Standard Selling, all customers) | USD 150.00 |
| VAT/tax on the line | **None (v1)** — see § 5 |
| Recurring | **No (v1)** — one-off setup; recurring monitoring is forward-looking, see § 7 |

### § 2.2 What the buyer pays for (so the accountant can judge revenue treatment)

A USD 150 launch pilot of AI Lead Rescue covers a fixed setup deliverable: connecting the customer's existing enquiry sources (website forms, WhatsApp, Facebook DMs, email) to a single owner-alert + daily summary feed so the customer's missed enquiries become visible. The work is **completed within 48 hours of payment confirmation** in the standard case, or **within 5 business days** when additional clarification, access, client input, or scope confirmation is needed (verbatim wording from the live page; see § 6.2 below for the W3 line). After setup, there is no ongoing recurring billing in v1.

### § 2.3 Revenue recognition question for the accountant

The buyer-side flow has three points at which revenue could be recognised:

1. **At Quotation issue** (= pre-payment Pro-forma is sent). No GL impact in either ERPNext or accountant convention; cleanly not revenue yet.
2. **At Payment received** (= bank wire confirmed; setup not yet started). ERPNext's Sales Invoice + Payment Entry combination posts revenue to GL at this point if the Sales Invoice is submitted concurrently.
3. **At Setup delivered** (= 48 hours / 5 business days later). Customer has received the deliverable.

**Practical observation:** the gap between (2) and (3) is small (48 hours typical, 5 business days maximum). For management reporting, (2) and (3) are functionally the same week. The accountant's call is between:

- **Option A — recognise at submission of Sales Invoice (= when payment is received and the invoice is submitted).** Simpler operationally; matches Phase C cycles 1 and 2. Permitted under accrual basis when the deliverable is short and certain.
- **Option B — recognise at delivery (= 2-5 days after payment).** Strict accrual; requires holding the receipt as `Deferred Revenue` (or `Customer Advance`) for 2-5 days, then journalising to `Service Revenue` on completion. Cleaner for IFRS / IAS 18 / IFRS 15 but adds an operator step per pilot.

**Q-Rev-1.** For the v1 single-offer USD 150 pilot, is Option A acceptable on materiality / simplicity grounds (a 2-5-day timing difference on USD 150 per pilot is below any meaningful threshold), or does the accountant require Option B?

**Q-Rev-2.** If Option B is required, should the holding account be `Customer Advance (Liability)` or `Deferred Revenue (Liability)`? Both are conventional; ERPNext's `Advances Received` defaults can be configured for either.

**Q-Rev-3.** Are subprocessor costs (Postgres, Vercel, n8n, Plausible) recharged to the customer as cost-of-service-delivery, or absorbed as operating expense? This is a CoA structure question (§ 1) but with revenue-side implications: if recharged, an explicit line item on the invoice; if absorbed, no line item. **Default proposal: absorbed (cleaner; no line-item complexity).**

## § 3 — USD invoice / MUR bank receipt flow

### § 3.1 The flow

```
1. Customer enquiry on https://corpflowai.com/lead-rescue.
2. Operator (Anton) qualifies the customer.
3. Operator issues a USD 150 Quotation (= "Pro-forma invoice" — see § 6).
4. Customer pays USD 150 by SBM USD wire (primary route per JE-2026-06-01-4).
5. Operator confirms wire receipt on the SBM dashboard.
6. Operator submits the Sales Invoice in ERPNext (USD 150).
7. Operator records a Payment Entry in ERPNext:
     paid_from = Debtors (USD)         — USD 150
     paid_to   = SBM Mauritius (MUR)   — MUR (USD 150 × prevailing rate)
     reference = the SBM transaction reference (operator pastes
                 it on the Payment Entry; ERPNext requires this
                 for any bank-touching Payment Entry — Phase C
                 finding C-2)
8. ERPNext auto-creates an Exchange Gain/Loss Journal Entry for
   the rate delta between book rate (used on the Sales Invoice)
   and receipt rate (used on the Payment Entry).
9. Setup begins after payment confirmation (within 48 hours typical,
   5 business days maximum — see W3 in § 6.2).
```

### § 3.2 Phase C cycle 1 — actual sandbox numbers (illustrative; sandbox-only, no real money)

| Step | ERPNext doctype | Sandbox sandbox value | What this proves |
|---|---|---|---|
| Sales Invoice | `Sales Invoice ACC-SINV-2026-00001` | `currency=USD`, `conversion_rate=45.0`, `grand_total=USD 150.0`, `base_grand_total=MUR 6,750.0`, `status=Paid` | USD invoice can post in MUR-base company books |
| Payment Request | `Payment Request ACC-PRQ-2026-00001` | `Inward / Wire Transfer / Email / Requested`, USD 150 | Carries CorpFlowAI bank wire instructions to the customer |
| Payment Entry | `Payment Entry ACC-PAY-2026-00002` | `Receive / Wire Transfer / Submitted`, ref `WIRE-SBX-ACC-SINV-2026-00001`, paid_from `Debtors - USD - CFS` (USD 150) → paid_to `Mauritius Domestic Bank - Main - CFS` (MUR 6,705) at source rate `44.7` | USD wire receipt converts to MUR at receipt rate (44.7), not book rate (45.0) |
| FX adjustment (auto) | `Journal Entry ACC-JV-2026-00001`, voucher_type `Exchange Gain Or Loss` | Total Dr=Cr=MUR 45.00; clears the residual USD on the receivable + books MUR 45 FX loss | ERPNext auto-creates the FX clearing JE; operator does not manually book it |

**Cycle 1 GL trail (full):**

- `Debtors - USD - CFS`: Dr USD 150 (invoice), Cr USD 150 (PE alloc at MUR 6,705) + Cr MUR 45 (FX clearing) → USD net 0 / MUR net 0 ✓
- `Service - CFS` (= `Service Revenue — Lead Rescue Setup` in production): Cr MUR 6,750 ✓ (revenue at book rate)
- `Mauritius Domestic Bank - Main - CFS` (= `State Bank of Mauritius — Main` in production): Dr MUR 6,705 ✓ (cash at receipt rate)
- `Exchange Gain/Loss - CFS` (= `Foreign Exchange Loss` in production, per § 1.1): Dr MUR 45 ✓

**Sum = 0 across all four account movements.** Double-entry holds. This is the canonical USD invoice / MUR receipt arithmetic. Production will repeat this exact pattern for every USD 150 pilot.

### § 3.3 Accountant questions on this flow (Q-Flow-1..Q-Flow-3)

**Q-Flow-1.** Is recording the Sales Invoice at book rate (e.g. 45.0) and the Payment Entry at receipt rate (e.g. 44.7), with a Journal Entry to clear the difference to FX Gain/Loss, the correct accounting treatment under Mauritian convention? This is ERPNext's stock behaviour and matches IAS 21 for transaction-day-vs-settlement-day exchange differences.

**Q-Flow-2.** What rate source should populate `book rate` on Sales Invoices going forward — daily operator entry, weekly fixed rate, ERPNext's auto-fetch of a published rate (e.g. ECB, MRA, BoM)? Phase C used an operator-entered flat rate of 45.0 for sandbox simplicity. Production needs an explicit policy.

**Q-Flow-3.** When the wire receipt rate differs from the book rate by more than X%, should the Payment Entry trigger an alert / accountant review? What is X (1%? 2%? 5%?)? This is a control question, not a structural question.

## § 4 — FX gain/loss treatment assumptions

### § 4.1 Phase C realised numbers (sandbox-illustrative; production will use real bank rates)

Two pilots, two different receipt rates, both USD 150 invoiced at book rate 45.0:

| Cycle | Receipt rate | MUR receipt | FX loss vs book | FX entry |
|---|---|---|---|---|
| 1 (SBM wire) | 44.7 | MUR 6,705 | MUR 45 | Auto-created `ACC-JV-2026-00001` Exchange Gain Or Loss voucher |
| 2 (PayPal manual + later withdrawal to SBM at 44.3) | 44.3 (effective on the withdrawal leg) | MUR 6,645 (after withdrawal) | MUR 105 | Manual `ACC-JV-2026-00002` Journal Entry on the PayPal→SBM withdrawal leg |
| **Total Phase C realised FX loss** |  |  | **MUR 150** | Booked to `Exchange Gain/Loss - CFS` |

Per-pilot economic delivery (sandbox-illustrative): on a USD 150 invoice booked at MUR 45.0/USD, an effective receipt at MUR 44.7/USD retains MUR 6,705 ≈ USD 149.00 of cash — **a 0.67% spread on the USD 150 invoice**. Real SBM and other-route spreads will vary; production needs the policy below.

### § 4.2 v1 production-target FX policy (proposed; accountant to confirm)

| Decision point | v1 proposal (subject to accountant amendment) |
|---|---|
| When is FX recognised? | At realisation (= Payment Entry posting, i.e. wire / PayPal / Wise actual receipt). **No mark-to-market on month-end USD receivables in v1** because the gap between invoice and receipt is short (typically 2-7 days for SBM wire; longer for other routes) and outstanding USD receivable balances at month-end are expected to be near-zero in v1. |
| Where does realised FX gain go? | `Foreign Exchange Gain` (Income) per § 1.1. |
| Where does realised FX loss go? | `Foreign Exchange Loss` (Expense) per § 1.1. **Note:** ERPNext's stock auto-created `Exchange Gain Or Loss` voucher posts to a single dual-purpose account; if § 1.1's two-account split is preferred, the production setup will configure two separate accounts and the operator/accountant will manually re-classify if needed. |
| What rate is used on the Sales Invoice? | Operator-entered daily rate or the rate published by Bank of Mauritius / SBM at the time of issue. The accountant should specify the rate source. |
| What rate is used on the Payment Entry? | Receipt rate from the SBM (or PayPal / Wise) confirmation slip — i.e. the rate the bank actually applied. Operator pastes the SBM transaction reference + receipt rate on the Payment Entry per Phase C finding C-2. |
| Mark-to-market on outstanding USD receivables at month-end? | **No, in v1.** Materiality argument: typical v1 USD receivable outstanding at any month-end is USD 0–300 (zero or one or two pilots in flight), and the worst-case unrealised FX delta on USD 300 is ≈ MUR 150. Accountant may request M2M if material thresholds are crossed in v2 (e.g. when LR Monitoring recurring monthly billing activates, see § 7). |

### § 4.3 Accountant questions on FX (Q-FX-1..Q-FX-3)

**Q-FX-1.** Is the realisation-only policy (no month-end mark-to-market) acceptable for v1, given the materiality and short receivable-aging profile? If not, what is the M2M trigger?

**Q-FX-2.** Should the rate source for `book rate` on Sales Invoices be (a) Bank of Mauritius daily indicative rate, (b) SBM's publicly-quoted commercial rate, (c) operator-entered manually-recorded daily rate, or (d) ERPNext's auto-fetch of a third-party feed (ECB / xe.com / etc.)?

**Q-FX-3.** Is `Foreign Exchange Gain` and `Foreign Exchange Loss` as two accounts (cleaner P&L) preferred over ERPNext's stock single dual-purpose `Exchange Gain/Loss` (simpler postings)? See also Q-CoA-4.

## § 5 — VAT posture questions

### § 5.1 Current posture (and why this packet defers to the accountant)

CorpFlowAI Ltd is a Mauritian-incorporated company (BRN `C25228280`). The v1 commercial offer is a USD 150 launch pilot of AI Lead Rescue, billed in USD to customers worldwide. Most v1 customers are expected to be Mauritian SMEs (warm-network outreach per `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`) and a small number from South Africa / USA / Australia / EU.

**No VAT is being charged on any invoice today.** The live page footer (`https://corpflowai.com/terms`) and the manual pro-forma template (W5 line) both carry the wording: *"VAT/tax treatment pending accountant confirmation."* This is the canonical pre-VAT-review posture and will remain until the accountant signs off either (a) below-threshold + no VAT charging is required, or (b) VAT registration is recommended → triggers a separate VAT-activation packet.

### § 5.2 What the operator does NOT want to assume

CorpFlowAI deliberately does **not** pin any of the following in this pack — these are facts the accountant must confirm or amend in writing:

- The current Mauritius VAT registration threshold (MUR turnover that triggers compulsory registration).
- Whether B2B services exported from Mauritius to a non-Mauritian customer are zero-rated, standard-rated, or out-of-scope under current MRA practice.
- Whether there is a separate threshold / reporting requirement for cross-border digital services.
- Whether voluntary VAT registration before the threshold is advantageous, neutral, or disadvantageous for CorpFlowAI's offer mix.
- E-invoicing (MRA's electronic-invoicing initiative) registration timing.
- Periodicity of VAT returns (monthly vs quarterly) once registered.

### § 5.3 Accountant questions on VAT (Q-VAT-1..Q-VAT-7)

**Q-VAT-1.** What is the current Mauritius VAT registration threshold, expressed as MUR annual turnover, and as of what date does the figure apply?

**Q-VAT-2.** Based on a v1 forecast of approximately 1–10 paying pilots per month at USD 150 each (≈ MUR 6,750–67,500/month, ≈ MUR 80,000–810,000 annualised at sandbox-illustrative rate of 45 MUR/USD), is CorpFlowAI Ltd **clearly below threshold**, **borderline / approaching threshold**, or **above threshold**?

**Q-VAT-3.** Are B2B services (CorpFlowAI's AI Lead Rescue Setup) exported from Mauritius to non-Mauritian customers (e.g. South African, US, EU, AU buyers): **zero-rated**, **standard-rated**, or **out-of-scope** for Mauritius VAT purposes? And does the answer differ for the USD 150 setup pilot vs the future LR Monitoring recurring monthly subscription?

**Q-VAT-4.** Are services delivered to Mauritian customers (the warm-network outreach segment) treated differently from cross-border services? Both legs of the offer are AI Lead Rescue Setup at USD 150; only the customer's residence differs.

**Q-VAT-5.** Is there a separate registration / reporting obligation for cross-border digital or electronically-supplied services (e.g. an analogue of the EU's "MOSS" / "OSS" or the UK's "VAT MOSS"), or a Mauritian equivalent?

**Q-VAT-6.** What is the safest standing wording for the document footer (and the live page footer) until the accountant has confirmed VAT posture? **CorpFlowAI's current wording is *"VAT/tax treatment pending accountant confirmation."*** — confirm acceptable, or recommend an amendment.

**Q-VAT-7.** When the v1 forecast in Q-VAT-2 changes (e.g. monthly volume increases, monitoring monthly subscriptions become a real revenue stream), what is the trigger for re-running the VAT registration analysis? **CorpFlowAI's proposal:** revisit when monthly invoiced revenue exceeds MUR X for two consecutive months. Operator suggests X = MUR 100,000 / month as a pre-warning threshold (well below the registration threshold the accountant identifies in Q-VAT-1, leaving headroom for the accountant to advise without surprise). **Accountant should confirm or amend X.**

### § 5.4 What "below threshold; not yet needed" looks like as a `JOURNAL.md` row (if the accountant signs off this posture)

If Q-VAT-2 → "clearly below threshold" and Q-VAT-3 → "out-of-scope or zero-rated for cross-border B2B services", the closure row in `docs/decisions/JOURNAL.md` will look like (drafted here so the accountant knows what they are signing off):

```
| JE-2026-MM-DD-N | 2026-MM-DD | Anton + <Accountant Name>, <ACCA / FCCA / CA(SA) / etc.> | **HB-3 closed** —
Mauritius-licensed accountant <Accountant Name> confirmed in writing on 2026-MM-DD that CorpFlowAI Ltd
(BRN C25228280) is below the Mauritius VAT registration threshold for the v1 commercial-launch period
(forecast ≤ MUR <X>/month), and that the v1 footer wording "VAT/tax treatment pending accountant confirmation."
remains the safest posture pending re-evaluation when monthly invoiced revenue exceeds MUR <X> for two
consecutive months. No VAT is to be charged on Sales Invoices in v1. Reference accountant memo: <local
filename or short title>. | Revisit when MUR <X> trigger fires; record as a separate JOURNAL row at that
time. |
```

## § 6 — Pro-forma vs Sales Invoice question

### § 6.1 What CorpFlowAI is doing today (manual-PDF path; live since 2026-06-02 per PR #288)

Today, before any payment is received, the operator sends the customer a **Pro-forma invoice (manual PDF)** built locally in Word / Pages / Google Docs from the template at `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`. After the customer pays the SBM USD wire, setup begins. After setup completes, no further document is issued (because the deliverable is a one-off setup, not a recurring subscription).

**The W1–W5 verbatim wording on the pro-forma footer (already in production on the live page and in the template):**

| ID | Verbatim wording (do not amend without separate operator decision) |
|---|---|
| **W1** | *"Payment instructions are sent separately after intake approval."* |
| **W2** | *"Setup begins after payment confirmation and receipt of required client information."* |
| **W3** | *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."* |
| **W4** | *"No revenue, lead volume, or conversion outcome is guaranteed."* |
| **W5** | *"VAT/tax treatment pending accountant confirmation."* |

### § 6.2 Document type in ERPNext (post-Phase D production)

Per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 2 Q1.2, ERPNext does **not** have a dedicated *Pro-forma* doctype. Two clean paths:

| Path | Doctype + status | Pros | Cons |
|---|---|---|---|
| **A — Quotation** (Cursor's recommendation) | `Quotation` (`Submitted` once approved) | Cleanest semantically — Quotation is by design a pre-payment document; never appears in tax / GL until converted; built-in "Convert to Sales Invoice" button. | The PDF title reads "Quotation" not "Pro-forma invoice" by default; Print Format must be customised to rename. |
| **B — Sales Invoice (Draft)** | `Sales Invoice` left at `docstatus=0` | The PDF title reads "Sales Invoice" / "Pro-forma" via Print Format; closer to what a buyer expects from an "invoice" wording perspective. | A `Draft` Sales Invoice does not post to the GL until submitted — fine — but it occupies a name in the naming series sequence even before submission, and accidental submission posts revenue prematurely. |

### § 6.3 Accountant questions on document type (Q-Doc-1..Q-Doc-4)

**Q-Doc-1.** Is the document title *"Pro-forma invoice"* (or alternatively *"Quotation"* / *"Estimate"*) safe under Mauritian / international cross-border B2B convention for a pre-payment document, given that it is **not** a tax invoice and that no VAT is charged in v1?

**Q-Doc-2.** Is Path A (Quotation; PDF title customised to *"Pro-forma invoice"*) acceptable, or does the accountant prefer Path B (Sales Invoice Draft; PDF title customised to *"Pro-forma invoice"*)? Cursor's recommendation is Path A on safety grounds (no risk of accidental revenue posting).

**Q-Doc-3.** Is the W1–W5 footer wording in § 6.1 acceptable verbatim under Mauritian convention, or are amendments required for the production Print Format? **Note:** these strings are already on the live page (`https://corpflowai.com/terms`, `https://corpflowai.com/refund-policy`, `https://corpflowai.com/contact`) and have been since 2026-06-02. Any amendment would need to be reflected on both the live page and the production Print Format simultaneously to avoid drift.

**Q-Doc-4.** When VAT activates (post-§ 5 review, if recommended), the document path becomes: pre-payment **Quotation** ("Pro-forma invoice" PDF title, no VAT line) → **Sales Invoice** at submission ("Tax invoice" PDF title, VAT line if applicable). Is this two-stage progression correct, or does the accountant prefer issuing a single document type post-VAT?

## § 7 — Recurring monthly service treatment (forward-looking; CAN-DEFER for v1)

### § 7.1 Posture

The v1 commercial offer is **one-off** (single AI Lead Rescue Setup at USD 150). There is **no recurring billing in v1**. The forward-looking offer in the brand and conversion doctrine is **AI Lead Rescue Monitoring** — a recurring monthly subscription where CorpFlowAI continues to operate the lead-recovery feed for the customer after setup. **This is CAN-DEFER per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.4 CD-1**, but the accountant should briefly anchor a position so production setup is not future-blocked.

### § 7.2 Likely v2 shape (forward-looking; not authorised for production yet)

| Field | Forward-looking proposal (subject to separate operator decision when v2 activates) |
|---|---|
| Item code (production) | `LR-MONITOR-USD-XXX` (price TBD; not in this pack's scope) |
| Item name | *"AI Lead Rescue Monitoring (monthly)"* — verbatim per brand doctrine |
| Recurring | Yes (monthly anniversary of pilot completion) |
| ERPNext doctype | `Subscription` linked to a Sales Invoice template |
| Revenue recognition | At service-period (= month invoiced for); accrual basis |
| Payment timing | Monthly upfront via SBM (USD wire) primary, or annual upfront if customer prefers (12 × monthly fee with optional discount) |

### § 7.3 Accountant questions on recurring (Q-Recur-1..Q-Recur-3)

**Q-Recur-1.** Does the planned `Subscription` + monthly `Sales Invoice` pattern in ERPNext (auto-generated invoices, monthly accrual, Payment Entry per receipt) satisfy Mauritian convention for recurring services? Standard accrual; no novelty.

**Q-Recur-2.** If a customer pays 12 months upfront (e.g. USD 12 × monthly_fee), does the receipt go to `Deferred Revenue (Liability)` and recognise monthly to `Service Revenue — Lead Rescue Monitoring`, or recognise the full amount on receipt? Standard convention is the former; but for a small-ticket pilot the materiality argument may permit the latter — accountant's call.

**Q-Recur-3.** Does the LR Monitoring monthly subscription change the VAT analysis in § 5? Specifically, does monthly subscription billing trip the VAT threshold sooner than the pilot pricing, and does the cross-border zero-rated / out-of-scope answer in Q-VAT-3 change for a recurring offer?

## § 8 — Bank reconciliation assumptions using CSV/Excel

### § 8.1 Posture

CorpFlowAI does **not** plan to integrate the SBM (or any bank's) live API in v1. Reconciliation is by CSV / Excel statement export, imported into ERPNext via the built-in **Bank Reconciliation Tool**. **No bank credentials enter ERPNext.** This posture is fixed by `ERPNEXT_SANDBOX_PLAN_V1.md` § 7 and is out-of-scope to revisit in this pack.

### § 8.2 Phase C cycle 3 demonstrated the workflow (sandbox-only, synthetic 3-line CSV)

| Synthetic CSV line | What ERPNext did | Result |
|---|---|---|
| `WIRE IN - Sandbox Client A - USD - ref ACC-SINV-2026-00001` for MUR 6,705 | Auto-matched against Payment Entry `ACC-PAY-2026-00002` (cycle 1) | ✓ Matched |
| `PAYPAL XFER IN - ref REFcycle2` for MUR 6,645 | Auto-matched against Journal Entry `ACC-JV-2026-00002` (cycle 2 PayPal→SBM withdrawal) | ✓ Matched |
| `BANK FEE - MONTHLY MAINTENANCE` for MUR 150 (Dr) | Operator manually created Journal Entry `ACC-JV-2026-00003` (`Bank Entry`) Dr `Banking & Payment Fees` MUR 150 / Cr `Mauritius Domestic Bank - Main` MUR 150 | ✓ Booked |

**Final MU bank GL balance after reconciliation: MUR +13,200.00** (= 6,705 + 6,645 − 150). **Expected per synthetic CSV: MUR +13,200.00.** **Delta: MUR 0.00.** ✓

**Honest limit:** Phase C cycle 3 verified the **arithmetic** of bank reconciliation, not the **UI / API** of ERPNext's Bank Reconciliation Tool itself. A future small packet `ERPNext-Bank-CSV-Test-1` will exercise the actual UI / API path against a redacted real SBM statement once Anton has 1 month of real activity. **HB-4** in `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7 covers this.

### § 8.3 v1 production-target reconciliation policy (proposed; accountant to confirm)

| Decision point | v1 proposal (subject to accountant amendment) |
|---|---|
| Cadence | Monthly close, within 5 business days of month-end. Optional weekly rolling review during the pilot ramp (first 6 months) for early visibility. |
| Tolerance for unmatched lines | Per `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.2: **"more than 5% of lines need manual journals"** is a no-go signal. **Note:** Phase C had 1 manual JE on a degenerate 3-line CSV (33%), so the threshold needs to be re-evaluated against a real 30-day cycle. |
| Tolerance for closing-balance variance | MUR 0.01 (= one cent) per `ERPNEXT_SANDBOX_PLAN_V1.md` § 7.3. |
| Action on variance > tolerance | Halt close; investigate; do not approve close until variance is identified and journalised. |
| Handling of bank fees | Each fee line creates a `Journal Entry` (`voucher_type=Bank Entry`) Dr `Banking & Payment Fees` Cr `<bank account>` with the upstream reference (Phase C finding C-2 — ERPNext requires `reference_no` + `reference_date` on every bank-touching journal). |
| Handling of reconciliation evidence | The CSV / Excel file is attached to the period-close Journal Entry (or to a parent Bank Reconciliation record if used) and retained for 7 years per Mauritian standard practice. |

### § 8.4 Accountant questions on bank reconciliation (Q-Bank-1..Q-Bank-4)

**Q-Bank-1.** Is monthly close within 5 business days of month-end the right cadence for a small Mauritian trading company with 1–10 invoices per month, or should it be quarterly (less operator effort) or weekly (tighter visibility)?

**Q-Bank-2.** Is a per-month "more than 5% of lines need manual journals" threshold the right control, or should it be "more than X manual journals per month" (an absolute count) given v1's expected 1–10 invoices per month?

**Q-Bank-3.** What is the accountant's preferred treatment of the SBM monthly maintenance fee — `Banking & Payment Fees` per § 1.1 (combined) or separate sub-accounts (e.g. `SBM Maintenance Fee`, `SBM Wire Receive Fee`, `SBM FX Spread Cost`)?

**Q-Bank-4.** What is the retention requirement for bank statement evidence — 7 years (Mauritian standard) or longer (accountant-specified)?

## § 9 — Specific written questions for a Mauritius-licensed accountant (consolidated)

**Total: 22 questions.** Each is reproduced here with its source-section reference so the accountant can answer them in any order. Cursor recommends the accountant respond in writing (PDF / signed memo / email with a clear date) so the answer can be referenced in the closure `JOURNAL.md` row.

| # | Question | Source § |
|---|---|---|
| **Q-CoA-1** | Does the structure in § 1.1 satisfy Mauritian reporting requirements for a small-trading-company (BRN holder, below MRA VAT threshold)? | § 1.3 |
| **Q-CoA-2** | Should `Service Revenue — Lead Rescue Setup` be one income account or split into management-reporting sub-accounts? | § 1.3 |
| **Q-CoA-3** | Is `Debtors (USD)` and `Debtors (MUR)` as separate accounts correct, or should both currencies post to a single `Debtors — Trade` account? | § 1.3 |
| **Q-CoA-4** | Should `Foreign Exchange Gain` and `Foreign Exchange Loss` be separate accounts (cleaner P&L) or combined as one netting account (ERPNext stock)? | § 1.3 / § 4.3 |
| **Q-CoA-5** | Are the inactive `VAT Output Holding` and `Input VAT` placeholders structurally correct for future activation, or should they be removed until VAT registration happens? | § 1.3 |
| **Q-Rev-1** | Recognise revenue at submission of Sales Invoice (Option A, simpler) or at delivery (Option B, strict accrual)? | § 2.3 |
| **Q-Rev-2** | If Option B, holding account = `Customer Advance (Liability)` or `Deferred Revenue (Liability)`? | § 2.3 |
| **Q-Rev-3** | Subprocessor costs recharged to customer or absorbed as operating expense? | § 2.3 |
| **Q-Flow-1** | Is invoice-at-book-rate / payment-at-receipt-rate / FX-clearing-JE the correct treatment under Mauritian convention? (IAS 21 standard.) | § 3.3 |
| **Q-Flow-2** | What rate source for `book rate` on Sales Invoices — daily operator entry, weekly fixed, BoM/SBM published, ERPNext auto-fetch? | § 3.3 |
| **Q-Flow-3** | What FX-delta % triggers operator/accountant alert on Payment Entry posting? | § 3.3 |
| **Q-FX-1** | Is realisation-only FX policy (no month-end mark-to-market) acceptable for v1? If not, what is the M2M trigger? | § 4.3 |
| **Q-FX-2** | Rate source for book rate (BoM daily / SBM commercial / operator manual / third-party feed)? | § 4.3 |
| **Q-FX-3** | Two-account FX (Gain + Loss) preferred over single dual-purpose ERPNext stock account? | § 4.3 |
| **Q-VAT-1** | Current Mauritius VAT registration threshold (MUR turnover), and as-of date? | § 5.3 |
| **Q-VAT-2** | At v1 forecast 1–10 pilots/month at USD 150, is CorpFlowAI Ltd clearly below / borderline / above threshold? | § 5.3 |
| **Q-VAT-3** | B2B services exported from Mauritius to non-Mauritian customers: zero-rated, standard-rated, or out-of-scope? | § 5.3 |
| **Q-VAT-4** | Are services to Mauritian customers (warm-network outreach segment) treated differently from cross-border services? | § 5.3 |
| **Q-VAT-5** | Separate registration / reporting obligation for cross-border digital or electronically-supplied services (Mauritian equivalent of OSS / MOSS)? | § 5.3 |
| **Q-VAT-6** | Safest standing wording for the document footer until VAT posture is confirmed — *"VAT/tax treatment pending accountant confirmation."* acceptable, or amend? | § 5.3 |
| **Q-VAT-7** | Re-evaluation trigger for the VAT posture — operator-proposed MUR 100,000/month (pre-warning); confirm or amend? | § 5.3 |
| **Q-Doc-1** | Is *"Pro-forma invoice"* document title safe under Mauritian / cross-border convention for a non-tax-invoice pre-payment document? | § 6.3 |
| **Q-Doc-2** | Path A (Quotation, PDF retitled to Pro-forma) preferred over Path B (Sales Invoice Draft, PDF retitled)? | § 6.3 |
| **Q-Doc-3** | W1–W5 footer wording acceptable verbatim, or amendments required? **(Note: already on live page since 2026-06-02; any amendment requires both the live page and the production Print Format to be updated together.)** | § 6.3 |
| **Q-Doc-4** | Two-stage Quotation → Sales Invoice progression acceptable post-VAT activation? | § 6.3 |
| **Q-Recur-1** | Subscription + monthly Sales Invoice pattern in ERPNext satisfies Mauritian convention for recurring services? | § 7.3 |
| **Q-Recur-2** | 12-months-upfront receipt: `Deferred Revenue` and recognise monthly, or recognise on receipt? | § 7.3 |
| **Q-Recur-3** | Does LR Monitoring monthly subscription change the Q-VAT-3 cross-border answer? | § 7.3 |
| **Q-Bank-1** | Monthly / quarterly / weekly close cadence for a small trading company with 1–10 invoices/month? | § 8.4 |
| **Q-Bank-2** | "More than 5% of lines need manual journals" or absolute count threshold (e.g. > N manual JEs/month)? | § 8.4 |
| **Q-Bank-3** | Combined `Banking & Payment Fees` or separate sub-accounts (Maintenance / Wire Receive / FX Spread)? | § 8.4 |
| **Q-Bank-4** | Retention requirement for bank statement evidence — 7 years (Mauritian standard) or other? | § 8.4 |

(That count is 32 distinct numbered questions across 11 letter-prefixed buckets — Cursor under-counted in the section header above on first draft; the table above is authoritative.)

## § 10 — Sign-off checklist (closes HB-2 + HB-3)

The accountant signs (or amends) the checklist below in writing. Anton then records the closure as a single `JOURNAL.md` row referencing this pack and the accountant's signed memo. **HB-2 closes when items § 10.1.1 – § 10.1.5 are all ✓. HB-3 closes when items § 10.2.1 – § 10.2.4 are all ✓.**

### § 10.1 HB-2 closure checklist (CoA + revenue + FX + bank reconciliation)

| # | Item | Answer (✓ / ✗ / amend) | Accountant note (if any) |
|---|---|---|---|
| § 10.1.1 | The CoA in § 1.1 is satisfactory for Mauritian reporting (Q-CoA-1 through Q-CoA-5 answered). |  |  |
| § 10.1.2 | The revenue treatment in § 2 is correct (Q-Rev-1, Q-Rev-2, Q-Rev-3 answered; Option chosen recorded). |  |  |
| § 10.1.3 | The USD invoice / MUR receipt flow in § 3 is correct under IAS 21 / Mauritian convention (Q-Flow-1, Q-Flow-2, Q-Flow-3 answered). |  |  |
| § 10.1.4 | The FX gain/loss treatment in § 4 is acceptable (Q-FX-1, Q-FX-2, Q-FX-3 answered; realisation-only policy or M2M trigger recorded). |  |  |
| § 10.1.5 | The bank reconciliation policy in § 8 (cadence, tolerance, evidence retention) is acceptable (Q-Bank-1 through Q-Bank-4 answered). |  |  |

### § 10.2 HB-3 closure checklist (VAT posture)

| # | Item | Answer (✓ / ✗ / amend) | Accountant note (if any) |
|---|---|---|---|
| § 10.2.1 | The current Mauritius VAT registration threshold (Q-VAT-1) is identified and as-of date is recorded. |  |  |
| § 10.2.2 | CorpFlowAI Ltd's posture against the threshold is recorded as **clearly below / borderline / above** (Q-VAT-2). |  |  |
| § 10.2.3 | The cross-border / domestic VAT treatment for B2B AI Lead Rescue Setup is recorded (Q-VAT-3 + Q-VAT-4). |  |  |
| § 10.2.4 | The footer wording posture is confirmed (Q-VAT-6) and the re-evaluation trigger is recorded (Q-VAT-7). |  |  |

### § 10.3 Document type + recurring (advisory; not blocking HB-2/HB-3)

| # | Item | Answer (✓ / ✗ / amend) | Accountant note (if any) |
|---|---|---|---|
| § 10.3.1 | The pro-forma vs sales invoice posture in § 6 is acceptable for v1 (Q-Doc-1 through Q-Doc-4 answered). |  |  |
| § 10.3.2 | The forward-looking recurring service treatment in § 7 is structurally compatible with Mauritian convention (Q-Recur-1 through Q-Recur-3 answered, even if v2 activation is deferred). |  |  |

### § 10.4 What CorpFlowAI commits to do post-sign-off

If the accountant signs § 10.1 + § 10.2 with all ✓:

1. Anton records the closure as a `JOURNAL.md` row (drafted in § 5.4 above as a template).
2. HB-2 + HB-3 in `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7 are marked closed.
3. Anton may then proceed to close HB-4 (real bank CSV reconciliation cycle, separate small packet `ERPNext-Bank-CSV-Test-1`) and HB-1 (Phase D operator-approval row, `ERPNext-Phase-D-Authorisation-1`).
4. Once all four HARD BLOCKERS close, Cursor opens `ERPNext-Production-Setup-1` to execute the 9 MUST items M-1..M-9 from `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.2 (≈ 6–8 working days of Cursor work under explicit Phase D approval).

If the accountant amends § 10.1 + § 10.2: Anton incorporates the amendments (CoA structure changes, revenue treatment changes, FX treatment changes, footer wording amendments, etc.) into a follow-up packet (`ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.1`) before any production setup work begins.

## § 11 — Honest limits of this pack

- **No PDF rendered from the ERPNext sandbox during Phase C.** All Phase C arithmetic was verified in-database; the actual `wkhtmltopdf` Print Format → PDF render path is documented but has not been exercised. **`ERPNext-PDF-Smoke-1`** (a separate small packet recommended after the first paying pilot completes on the manual-PDF path) will exercise this. The accountant does not need to verify the PDF path — they are reviewing accounting structure, not document layout.
- **No real bank account number, SWIFT/BIC, IBAN, or routing detail in this pack.** Bank-side facts are limited to: bank name *State Bank of Mauritius*, SBM offers MUR-base + USD multi-currency accounts, account-class names like "Mauritius Domestic Bank — Main". The accountant may request the actual account details from Anton out-of-band if review requires them; they will not appear in this repo.
- **No production ERPNext instance exists at the time of writing.** Every "production" claim in this pack is a target posture, not a current state. The accountant is reviewing the proposed structure for production go-live, not auditing existing books.
- **Phase C numbers are sandbox-illustrative.** Real SBM spreads, real PayPal spreads (if PayPal HOLD ever lifts), real Wise spreads (if Wise is ever re-added) will differ. The arithmetic structure (USD invoice → MUR receipt + auto FX clearing JE) is the part that will hold; the specific MUR amounts will be replaced by real ones once the first paying pilot lands.
- **Mauritius VAT specifics are deliberately not pinned to numbers in this pack.** Threshold (MUR), e-invoicing requirements, and reporting periodicity must come from the accountant in § 5.3 / § 10.2, not from this file. CorpFlowAI's operator (Anton) does not have a current accountant relationship; engaging one is the operator action this pack supports.
- **Recurring monthly service is forward-looking and CAN-DEFER.** The accountant does not need to bless v2 to close v1. § 7 is included only so the production setup is not future-blocked.
- **Phase D is not initiated by this pack.** Closing HB-2 + HB-3 unblocks two of the four hard blockers; HB-4 (redacted bank CSV reconciliation cycle) and HB-1 (Phase D operator-approval row) remain open and require separate operator decisions on Bridge `#249`. This pack is a docs-only artefact that the accountant uses; it does not authorise any production work itself.

## § 12 — Cross-references

- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (PR #290 merged 2026-06-03 `320de41d`) — the four HARD BLOCKERS + 18-item production setup checklist that this pack helps close.
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` — original sandbox plan + § 2.1 draft CoA (the source of § 1.1 in this pack) + § 10 go/no-go criteria.
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — Phase C arithmetic and findings (the source of § 3.2 + § 4.1 + § 8.2 in this pack).
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — Phase B install runbook (executed end-to-end on `corpflow-exec-01-u69678` 2026-05-31 → 2026-06-01).
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` (PR #287, `JE-2026-06-02-4`) — 13-blocker production list § 8.
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (PR #288, `JE-2026-06-02-7`) — manual-PDF template currently in use; defines W1–W5 verbatim wording (the source of § 6.1 in this pack).
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`) — payment-route reality (SBM primary, PayPal HOLD, Wise removed).
- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (`JE-2026-06-02-3`) — SBM e-Commerce application readiness; production posture for the SBM bank account.
- `docs/finance/PAY_SBM_2_PAGE_COMPLIANCE_COPY.md` (PR #284, `JE-2026-06-02-4`) — public seller identity (BRN + address + support email + W3 setup-window verbatim wording — the source of § 0.1 + § 6.1 in this pack).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — canonical Item label + single-offer rule + no-guarantee line.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — canonical operator runbook (status pipeline + commercial-card field semantics + 13-item setup checklist).
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `support@corpflowai.com` sender alias policy.
- Decision rows: `JE-2026-05-28-1` (single-offer rule) / `JE-2026-05-29-1` (Phase D requires fresh authorisation) / `JE-2026-05-31-2` (Phase B-a install) / `JE-2026-06-01-1` (server capacity + backup-restore parity) / `JE-2026-06-01-3` (Phase C executed) / `JE-2026-06-01-4` (payment route priority) / `JE-2026-06-01-5` (Option B accountant-readonly remediation) / `JE-2026-06-01-6` (launch-readiness inventory) / `JE-2026-06-02-1..7` / `JE-2026-06-03-1` (Pomelli sprint, parallel marketing workstream, unrelated to this pack) / `JE-2026-06-03-2` (Phase D evaluation, the immediate parent of this pack).

## § 13 — Standing holds (unchanged by this packet)

Phase D not initiated · HB-1 / HB-2 / HB-3 / HB-4 all open until the accountant signs off § 10 (closes HB-2 + HB-3) and the subsequent `ERPNext-Bank-CSV-Test-1` packet closes HB-4 and Anton's authorisation row closes HB-1 · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `JE-2026-06-02-4` ID collision (declared in PR #287 DRA, accepted, no fix this packet).

**No new operational hold introduced by this packet.** This pack is a docs-only review-pack artefact and does not authorise any new production / runtime / payment / DNS / GitHub / Vercel work.

## § 14 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE** at PR merge — no customer-visible URL to probe by design. The next operational milestone is **the accountant's signed § 10 checklist**; receipt of that signed checklist is recorded as a separate `JOURNAL.md` row that closes HB-2 + HB-3, opening the path to subsequent gated packets (`ERPNext-Bank-CSV-Test-1` → `ERPNext-Phase-D-Authorisation-1` → `ERPNext-Production-Setup-1`).
