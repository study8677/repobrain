# ERPNext Accounting Sandbox Plan v1

**Status:** v1 plan. **Docs only — not an install runbook.** No ERPNext instance has been deployed for CorpFlowAI at the time of writing. This file defines the minimum safe sandbox configuration needed to test invoicing, recurring billing, payment requests, manual PayPal / Wise / domestic-bank handling, and CSV-based reconciliation against a Mauritius bank. Production adoption depends on the go/no-go criteria in §10.

**Anchor sentinel:** `<!-- ERPNEXT_SANDBOX_PLAN_V1 -->`

<!-- ERPNEXT_SANDBOX_PLAN_V1 -->

## 0. Hard limits of this plan

- **Sandbox only.** No real client data. No real CorpFlowAI invoices. No real Mauritius bank credentials.
- **No API keys, no payment-gateway secrets, no bank credentials**, no production tenant IDs.
- **No payment automation.** PayPal and Wise are tested as manual / unverified flows.
- **No runtime CorpFlowAI changes.** This plan does not touch `lib/`, `api/`, `pages/`, `prisma/`, `scripts/`, env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram, Vercel config, GitHub settings, or deployment settings.
- **No production-grade VAT configuration** in the sandbox (see §9). Active VAT is deferred until turnover threshold is approached or until an accountant review.

## 1. Sandbox setup sequence

Order matters. Do not skip steps.

### 1.1 Choose the sandbox host

Two acceptable options for v1; **pick one and document the choice in `docs/decisions/JOURNAL.md`** before the sandbox is set up.

| Option | Cost (v1) | Pros | Cons | Recommended for |
|---|---|---|---|---|
| **Frappe Cloud free trial / lowest paid plan** | Low (trial) | No infra to manage; backups built in; latest ERPNext; easy to delete. | Vendor lock-in for the trial period; trial may expire. | First sandbox cycle. |
| **Self-host on a small VM (e.g. `corpflow-exec-01` if capacity allows, or a separate Hetzner / similar)** | Modest | Full control; can be torn down freely; rehearses production install. | Operator must maintain Docker/Frappe stack and backups; ports must not collide with CorpFlowAI. | Second sandbox cycle (after first cycle validates the plan). |

Whichever is chosen, the sandbox **must not share infrastructure with CorpFlowAI production** (no shared Postgres, no shared domain, no shared secrets).

### 1.2 Naming convention

- ERPNext **Company** in the sandbox: `CorpFlowAI Sandbox` (literal — never `CorpFlowAI` alone).
- Default currency: **MUR** (operator-of-record currency for Mauritius).
- Sandbox domain (if Frappe Cloud): use a clearly-non-production subdomain. Do not point any CorpFlowAI DNS at it.
- All sandbox users have email aliases that include the word `sandbox` (e.g. `anton+erp-sandbox@…`).

### 1.3 Bootstrap order

1. Provision the host (1.1) and confirm clean state.
2. Install ERPNext (latest stable). Capture the version and commit SHA in `docs/decisions/JOURNAL.md`.
3. Run the ERPNext setup wizard with `CorpFlowAI Sandbox` as company name, **MUR** as base currency, Mauritius as country.
4. Create test users:
   - `operator-sandbox` — full accounting permissions.
   - `accountant-readonly-sandbox` — read-only / report-export only (no posting).
5. Disable any default email or notification automation until explicitly tested.
6. Confirm scheduled jobs are not pointing at any external production resource.
7. Take a full backup. Confirm restore works to a second sandbox before any further work.

### 1.4 Data hygiene

- Use **synthetic** customers, items, and bank transactions only.
- If a CSV bank export is used for reconciliation testing, it must be either:
  - a real export with **all identifying information redacted** (customer names, account numbers, narrations), or
  - a fully synthetic export modelled on the real bank's column layout.
- Sandbox screenshots that leave the operator's machine must redact any synthetic-but-realistic-looking data that could be mistaken for production.

## 2. Initial Chart of Accounts draft

This is a **draft** for sandbox use. It must be reviewed by a Mauritius-licensed accountant before any production adoption.

### 2.1 Top-level structure (standard double-entry)

- **Assets**
  - Current Assets
    - Bank Accounts (see §2.2)
    - Accounts Receivable — Trade (USD)
    - Accounts Receivable — Trade (MUR)
    - Prepayments
  - Non-Current Assets
    - Equipment
    - Intangibles (software licences, if any)
- **Liabilities**
  - Current Liabilities
    - Accounts Payable — Trade
    - Accrued Expenses
    - **VAT Output Holding** (inactive in v1 — see §9)
  - Non-Current Liabilities
    - (empty in v1)
- **Equity**
  - Owner Equity
  - Retained Earnings
- **Income**
  - Service Revenue — Lead Rescue Setup (one-off; USD 150 per pilot)
  - Service Revenue — Lead Rescue Monitoring (recurring monthly)
  - Service Revenue — Future Productized Offers (placeholder)
  - Other Operating Income
  - Foreign Exchange Gain
- **Expenses**
  - Cost of Service Delivery
    - Operator Time (internal — sandbox placeholder)
    - Subprocessor Costs (Postgres, Vercel, n8n, etc.)
  - Operating Expenses
    - Software & Subscriptions
    - Telecoms & Internet
    - Banking & Payment Fees
    - PayPal Fees (separate sub-account)
    - Wise Fees (separate sub-account)
    - Foreign Exchange Loss
  - Administrative Expenses
  - **Input VAT** (inactive in v1 — see §9)

### 2.2 Bank-style accounts in the CoA

Each is a separate ledger account; do not combine.

| Account | Currency | Verified status in v1 | Notes |
|---|---|---|---|
| Mauritius Domestic Bank — Main | MUR | Manual (CSV import) | Primary operating account for invoicing and operating cash. |
| PayPal — USD balance | USD | **Manual (no live PayPal API in sandbox)** | Conversion to MUR is a separate Journal Entry on transfer. |
| Wise — USD balance | USD | **Manual / unverified** | Treat as a separate bank account; reconcile from Wise statement export. |
| Wise — EUR balance | EUR | **Manual / unverified** | Only if EUR receipts occur. |
| Wise — MUR balance (if held) | MUR | **Manual / unverified** | Only if MUR is held inside Wise; usually not. |
| Petty Cash | MUR | Manual | Optional; recommended only if real cash is handled. |

### 2.3 Customer / Item setup discipline

- One sandbox **Customer** per test client (e.g. `Sandbox Client A — MUR`, `Sandbox Client B — USD`).
- One **Item** per CorpFlowAI offer; in v1 only two are needed: `AI Lead Rescue Setup (USD 150 pilot)` and `AI Lead Rescue Monitoring (monthly)`. **Match the wording on `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* exactly.**
- Item codes prefixed with `SBX-` so they are unambiguously sandbox-only.

## 3. Invoice and recurring billing test plan

### 3.1 One-off invoice flow

1. Create a sandbox customer.
2. Create a Sales Invoice for `AI Lead Rescue Setup (USD 150 pilot)`.
3. Confirm sequential invoice numbering (`SINV-SBX-…`).
4. Generate the PDF; verify currency, company address, payment terms wording.
5. Send via ERPNext's email (sandbox SMTP only — never production CorpFlowAI mail credentials).
6. Mark as paid manually after a Payment Entry is created against the chosen bank account.

### 3.2 Recurring / subscription flow

1. Create a Subscription with `AI Lead Rescue Monitoring (monthly)` linked to a sandbox customer.
2. Configure the schedule (monthly anniversary of pilot start).
3. Let ERPNext auto-create the next invoice (or trigger a sandbox cron).
4. Verify the invoice draft generates with the correct period, customer, and item.
5. Test the cancellation path (subscription terminated mid-period — pro-rata behaviour).

### 3.3 Test cases to cover before go (§10)

- USD 150 LR setup, single client, MUR-denominated company books, USD-denominated invoice.
- LR monitoring monthly recurring, MUR-denominated client.
- LR monitoring monthly recurring, USD-denominated client.
- Credit note / cancellation flow (sandbox client refunded).
- Multi-currency exchange-rate posting at invoice date vs payment date — confirm FX gain/loss postings land in the right accounts.
- Sequential invoice numbering does not break when an invoice is cancelled.

### 3.4 Out of scope for v1

- E-invoicing XML emission (see §9).
- Customer self-service portal.
- Auto-payment on invoice issue.

## 4. Payment Request test plan

ERPNext supports a **Payment Request** doctype that can email a payment-link to the customer.

### 4.1 Test cases (no live gateways)

1. **Payment Request — Bank transfer.** Generate a Payment Request that emits a PDF / email with CorpFlowAI bank details. No external link required. Confirm the PR is linked to the parent Sales Invoice and that marking paid creates the right Payment Entry.
2. **Payment Request — PayPal (manual).** Generate a Payment Request with a PayPal account label in the body. The link itself is a **manually-pasted PayPal.me-style URL or invoice URL** managed outside ERPNext for v1. Confirm the PR can be marked paid manually after the operator confirms receipt in PayPal.
3. **Payment Request — Wise (manual).** Same pattern as PayPal: link / account details pasted manually; reconciled manually.

### 4.2 What is explicitly NOT tested in v1

- Live PayPal API integration.
- Wise live integration.
- Stripe / RazorPay / any other gateway.
- Automated webhook handling.

### 4.3 Operator behaviour expected

The operator (Anton) creates the Payment Request, sends it, then performs manual reconciliation (§5–§7). No automated state transitions.

## 5. PayPal handling

### 5.1 Posture in v1

- PayPal is treated as a **manual ledger source**, not as an automated integration.
- **No PayPal API key is added to the sandbox.** Sandbox configuration must explicitly disable any PayPal integration toggle.
- The PayPal balance in the CoA (§2.2) is updated by **Journal Entry** or **Payment Entry** referencing PayPal as the receiving account.

### 5.2 Workflow (sandbox)

1. Sales Invoice issued, marked "Payment method: PayPal" in a note (not a structured field).
2. Customer pays into PayPal (in the real world; in sandbox, this is **simulated by a journal entry** representing an inbound PayPal credit).
3. Operator manually creates a Payment Entry: Debit `PayPal — USD balance`, Credit the receivable.
4. PayPal fee is posted to `PayPal Fees` expense account on the same date.
5. Periodic PayPal withdrawal to bank: Debit `Mauritius Domestic Bank — Main` (MUR), Credit `PayPal — USD balance` (USD); difference posted to FX Gain / FX Loss.

### 5.3 Evidence

- **PayPal CSV / Excel transaction export** is the primary evidence for reconciliation.
- **PayPal email receipts** are attached to the Payment Entry as supporting evidence.
- **No screenshots of the PayPal dashboard** are committed to this repo or stored anywhere with secrets.

## 6. Wise handling (manual / unverified)

### 6.1 Posture in v1

- Wise is **not** verified as a connected bank in ERPNext.
- Each Wise currency balance is its own ledger account in the CoA (§2.2).
- All Wise activity is manual.

### 6.2 Why "unverified" matters

ERPNext has the concept of "Bank Account" records that can be linked to a Bank doctype. For the sandbox, Wise accounts are **Bank Accounts in ERPNext terms but explicitly flagged with `Verified: No` in the description / note field**. This makes it visually obvious during reconciliation that these are manual feeds.

### 6.3 Workflow (sandbox)

1. Wise statement is exported (CSV or Excel).
2. CSV is opened in a read-only viewer; columns mapped per §7.2 (Date, Description, Amount, Currency, Reference).
3. Each Wise line becomes either a Payment Entry (if linked to an invoice) or a Journal Entry (for fees, conversions, transfers).
4. Currency conversion at Wise's published rate (recorded in the entry description) is the basis for FX gain / loss postings.

### 6.4 Reconciliation cadence

- Sandbox: at minimum weekly during the test cycle.
- Production target: weekly or per-event for amounts above an operator-defined threshold (decided at go-live, §10).

## 7. Mauritius domestic bank reconciliation using CSV / Excel

### 7.1 Posture in v1

- The Mauritius domestic bank account is reconciled via **CSV or Excel statement export**.
- **No bank-feed API integration**, no Plaid-style aggregator, no scraping. Bank credentials never enter ERPNext.
- ERPNext's built-in **Bank Reconciliation Tool** is the workflow.

### 7.2 Column mapping (typical Mauritius bank export)

This template is sandbox-only and must be reviewed against the actual bank's export format on first use.

| ERPNext field | Typical column in MU bank export | Notes |
|---|---|---|
| Posting date | `Date` or `Transaction Date` | Use the value-date, not the booking date, if both are present. |
| Description | `Narration` or `Description` | Truncate to ERPNext field length; preserve customer name / reference. |
| Debit amount | `Debit` or `Withdrawal` | Outflow from the bank. |
| Credit amount | `Credit` or `Deposit` | Inflow to the bank. |
| Reference | `Reference` / `Cheque No.` / `Transaction ID` | Used by ERPNext to suggest matches. |
| Currency | (implied MUR for domestic statements) | Set explicitly during import. |

### 7.3 Workflow (sandbox)

1. Export the bank statement as CSV (Excel acceptable; convert to CSV before import).
2. Open the CSV in a viewer — confirm encoding (UTF-8 expected; some MU banks emit Windows-1252).
3. Import via **ERPNext → Bank Reconciliation Tool**:
   a. Select `Mauritius Domestic Bank — Main`.
   b. Upload the CSV.
   c. Map columns per §7.2.
   d. Match against existing Payment Entries / Journal Entries.
   e. For unmatched lines, create:
      - **Payment Entry** if the line is an invoice receipt or supplier payment.
      - **Journal Entry** if the line is a fee, interest, transfer, or correction.
4. Confirm the running bank balance per the CoA matches the statement closing balance within `MUR 0.01`. Any mismatch must be investigated before close.

### 7.4 Test cases to cover before go (§10)

- Inbound MUR receipt from a sandbox local customer.
- Outbound MUR payment to a sandbox local supplier.
- Bank fee charge (line with no associated invoice).
- Transfer from Wise / PayPal MUR balance (cross-bank transfer with no FX).
- Synthetic 30-day cycle reconciled to zero variance.

## 8. PDF statement handling — fallback / evidence only

### 8.1 Rule

- **CSV / Excel is the data of record** for any bank, Wise, or PayPal statement.
- **PDF statements are evidence only**, never the data source for line-item entries.

### 8.2 When PDFs appear

Some sources (older bank statements, screenshots from a payment platform) arrive only as PDF. In those cases:

1. Convert to CSV manually — **read each line yourself**, do not rely on automated OCR for the first sandbox cycle.
2. Validate the CSV totals against the PDF totals before import.
3. Attach the original PDF to the resulting Bank Reconciliation record (or to a Journal Entry) as supporting evidence.

### 8.3 OCR posture in v1

- **No automated PDF parsing in the sandbox.** OCR can be evaluated in a later cycle once the CSV path is reliable.
- No third-party SaaS receives a CorpFlowAI bank statement during the sandbox.

## 9. VAT readiness notes (active VAT deferred)

### 9.1 Posture in v1

- **VAT is deferred.** No live VAT charging on sandbox invoices. VAT-related ledger accounts (`Input VAT`, `VAT Output Holding`) exist in the CoA (§2) as **placeholders** but are not used to record tax.
- **E-invoicing (Mauritius Revenue Authority obligations) is deferred** until either (a) turnover approaches the registration threshold or (b) accountant review.

### 9.2 What needs accountant review before VAT goes live

- Current Mauritius VAT registration threshold (the operator should not rely on memory or a value pasted here; threshold can change).
- Whether CorpFlowAI's offer mix (cross-border B2B services to clients outside Mauritius) is zero-rated, standard-rated, or out of scope.
- E-invoicing XML schema and registration requirements with MRA.
- Periodicity of VAT returns once registered (monthly / quarterly).

### 9.3 Operator behaviour expected in the meantime

- Sandbox invoices may be issued **VAT-exempt** for testing purposes; this is for sandbox flow only.
- Production invoicing **must not** issue tax-bearing invoices until VAT registration and accountant confirmation are in place.
- A short **decisions row** in `docs/decisions/JOURNAL.md` will be added the day VAT activation is approved; that row is the go-signal, not this plan.

## 10. Go / no-go criteria for production adoption

The sandbox is **not** an authorisation to move to production. Going production requires all of §10.1 to be true and none of §10.2 to be true.

### 10.1 Go-signal — all must be true

- Chart of Accounts has been **reviewed in writing by a Mauritius-licensed accountant** and any required changes are merged into the sandbox.
- Invoice flow (§3) tested end-to-end for **both** USD and MUR, including credit notes and recurring billing.
- Payment Request flow (§4) tested for bank transfer, PayPal-manual, and Wise-manual.
- Bank reconciliation (§7) tested against a real (redacted or synthetic) Mauritius bank export, reconciled to zero variance.
- PayPal (§5) and Wise (§6) manual flows tested with at least one cycle of synthetic transactions including FX postings.
- Backup and restore tested at least once; restore-from-backup confirmed in a second sandbox.
- Multi-user access tested: operator can post; accountant role can read and export but cannot post.
- VAT plan reviewed by accountant **or** explicitly recorded as "below threshold; not yet needed; revisit at MUR X turnover" in `docs/decisions/JOURNAL.md`.
- A short go-live runbook exists (separate doc, not this plan) that lists: how to migrate sandbox CoA to a new production instance, how to switch invoice numbering, how to point email DNS, how to back up the sandbox before tear-down.

### 10.2 No-go signal — any one is enough to halt

- Multi-currency posting produces unexplained FX entries that the operator cannot reconcile to the published Wise / PayPal rate within 0.5%.
- Bank reconciliation requires manual fixing of a substantial fraction of lines (operator-defined threshold; suggested: more than 5% of lines need manual journals).
- PayPal / Wise activity cannot be reliably tracked manually within the operator's available time.
- Accountant says the CoA structure does not match Mauritius reporting requirements and a redesign is needed.
- The sandbox-host choice (§1.1) is not stable (frequent outages, lost data).
- Any sandbox testing has accidentally touched real production data, CorpFlowAI client data, or a CorpFlowAI environment variable.

### 10.3 Reversibility

If a no-go signal trips, tear down the sandbox and restart from §1. No production commitment is sunk by an aborted sandbox; this is by design.

## 11. Cross-references

- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — pricing, status pipeline, payment language.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — one-offer rule, payment-after-intake rule, USD 150 pilot wording.
- `docs/decisions/JOURNAL.md` — decisions of record (sandbox host choice, VAT-activation gate, CoA approval — each will be a row).
- `docs/decisions/README.md` — ADR-lite conventions.
- `docs/strategy/sources/2026-05-28-simplicity-1-1-1-proof-email-memo.md` § 3.5 — memo-culture framing that applies to any production-adoption decision spawned from this plan.
- `docs/CORPFLOW_SHARED_TODO.md` — execution priorities; ERPNext production adoption is **not** on the queue until §10 is satisfied.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required if/when a real PayPal/Wise/bank integration is ever introduced (out of v1 scope).

## 12. Honest limits of this plan

- **Cursor has not deployed ERPNext.** All ERPNext behaviour described here is based on documented ERPNext features. Anything that doesn't behave as described in the sandbox should be treated as a finding, not a contradiction to be argued away.
- **Mauritius VAT specifics are deliberately not pinned** to numbers in this plan. Threshold, e-invoicing requirements, and reporting periodicity must come from an accountant before any go-live, not from this file.
- **Wise verification model** in ERPNext may evolve. The "manual / unverified" posture is what makes this safe in v1; if a future ERPNext version offers a vetted Wise integration, that is a separate packet and a separate doctrine review.
- **PayPal integration** is intentionally avoided. If commercial activity volume justifies an API integration later, it goes through `docs/operations/SECURITY_REVIEW_CHECKLIST.md` first.
