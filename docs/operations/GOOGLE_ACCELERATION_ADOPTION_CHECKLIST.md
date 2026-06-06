# Google Acceleration Adoption Checklist

**Status:** Operator checklist v1 for the Google Acceleration Lane.

**Anchor sentinel:** `<!-- GOOGLE_ACCELERATION_ADOPTION_CHECKLIST_V1 -->`

<!-- GOOGLE_ACCELERATION_ADOPTION_CHECKLIST_V1 -->

## Scope

Operator-facing checklist for adopting Google AI tools (AI Studio, Opal, NotebookLM, Pomelli, Gemini Canvas, Gemini image / Nano Banana tooling, AI Studio multi-speaker audio) inside CorpFlowAI work, under the bounds in `docs/strategy/GOOGLE_ACCELERATION_LANE.md`.

This checklist is **not** authority to deploy, change secrets, modify DNS, send anything to a real client, or upload sensitive data. It only tracks access verification and the first three experiments.

## Important — Cursor cannot test these tools

Cursor does not have a Google account, browser session, or interactive UI access. **All access tests below must be run by a human operator in a real browser.** Rows that depend on browser / login / Google-account access are marked **Requires operator browser verification**. Do not pretend the tools were tested by Cursor.

## 1. Access audit

Run on Day 1 of the adoption plan in `docs/strategy/GOOGLE_ACCELERATION_LANE.md` § *Immediate adoption plan*.

| # | Tool | URL | CorpFlowAI Google account works? | Region issue? | Owner | Status | Next action | Blocked by | Evidence link |
|---|------|-----|---------------------------------:|--------------:|-------|--------|-------------|------------|---------------|
| 1 | Google AI Studio | `https://aistudio.google.com` | TBD | TBD | Anton | Requires operator browser verification | Open in operator browser, sign in with the CorpFlowAI Google account, confirm console access, screenshot home view | none | TBD |
| 2 | Google Opal | `https://opal.google.com` | TBD | TBD | Anton | Requires operator browser verification | Open in operator browser, confirm Labs eligibility / waitlist status | Google Labs availability in MU / target region | TBD |
| 3 | NotebookLM | `https://notebooklm.google.com` | TBD | TBD | Anton | Requires operator browser verification | Open in operator browser, create an empty notebook, confirm Video Overview availability for the account | none | TBD |
| 4 | Gemini app / Canvas | Operator-confirmed URL (TBD) | TBD | TBD | Anton | Requires operator browser verification | Confirm exact entry URL for Gemini Canvas, paste it back into this row | none | TBD |
| 5 | Pomelli / Google Labs | Operator-confirmed URL (TBD) | TBD | TBD | Anton | Requires operator browser verification | Confirm exact entry URL, confirm regional availability | Google Labs / region | TBD |
| 6 | Gemini image tools (incl. Nano Banana) | Operator-confirmed URL (TBD) | TBD | TBD | Anton | Requires operator browser verification | Confirm exact entry URL, confirm image-generation availability for the account | none | TBD |
| 7 | AI Studio multi-speaker audio | Operator-confirmed URL (TBD) (likely inside AI Studio) | TBD | TBD | Anton | Requires operator browser verification | Confirm entry point inside AI Studio, confirm multi-speaker audio is enabled for the account | none | TBD |

When a row is verified, update `Status` to one of: `verified-accessible`, `verified-blocked-region`, `verified-blocked-account`, `verified-waitlist`, `not-applicable`. Add an `Evidence link` to a screenshot or short note stored under `artifacts/` or in the operator drive.

## 2. First three experiments

Run after the access audit. Each experiment is bounded; nothing here authorises bulk outreach, sending unedited assets to clients, or uploading sensitive data.

### Experiment 1 — AI Lead Rescue sales deck via Gemini Canvas

| Field | Value |
|---|---|
| Goal | Six-slide draft sales deck (problem → outcome → offer → how it works → who it is for → CTA). |
| Input | Approved AI Lead Rescue copy from `pages/lead-rescue` and `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`. |
| Output | Draft deck reviewed against `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and `docs/marketing/04_DELIVERY_QUALITY_GATE.md` (target ≥ 12/14). |
| Success | Deck usable after a human / doctrine edit pass within 60 minutes. |
| Out of scope | Sending the deck to a prospect without review. Pasting confidential client lists into Canvas. |
| Owner | Anton |
| Status | not-started |
| Next action | Run access audit row 4 first; once Canvas is verified, generate the draft. |
| Blocked by | Access audit row 4. |
| Evidence link | TBD |

### Experiment 2 — NotebookLM operator training from the AI Lead Rescue runbook

| Field | Value |
|---|---|
| Goal | Training summary (and optional Video Overview) from `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`. |
| Input | The runbook only. No client data. |
| Output | A NotebookLM-generated summary that lets a new operator understand intake → qualify → setup checklist. |
| Success | A new operator can describe the workflow back without reading the full runbook. |
| Out of scope | Replacing the runbook. The repo runbook stays canonical. |
| Owner | Anton |
| Status | not-started |
| Next action | Run access audit row 3 first; once NotebookLM is verified, run the summary. |
| Blocked by | Access audit row 3. |
| Evidence link | TBD |

### Experiment 3 — AI Studio / Opal prospect scoring prototype

| Field | Value |
|---|---|
| Goal | Prospect-scoring prototype that returns fit score, pain hypothesis, outreach angle, next action. |
| Input | **Synthetic** Mauritius property prospect rows. No real prospect lists. |
| Output | A working prototype (AI Studio or Opal) plus a short usage note. |
| Success | Helps create up to 25 qualified Mauritius property prospects without bulk spam, using human-reviewed outreach. |
| Out of scope | Bulk email / SMS / WhatsApp / LinkedIn. Loading real prospect lists. Auto-sending anything. |
| Owner | Anton |
| Status | not-started |
| Next action | Run access audit rows 1 and 2 first; pick whichever tool is accessible; build prototype with synthetic rows. |
| Blocked by | Access audit rows 1 and 2. |
| Evidence link | TBD |

## 3. Productionisation tracking (Day 7 outputs)

Once Experiments 1–3 (and any Day 2–6 collateral) are reviewed, decide where each output belongs. Use this table to track the decision per output.

| Output | Type | Disposition | Owner | Status | Next action | Blocked by | Evidence link |
|--------|------|-------------|-------|--------|-------------|------------|---------------|
| TBD | TBD (deck / one-pager / script / diagram / training summary / prototype / discovery pack) | TBD (repo doc / sales collateral / Cursor prompt / n8n workflow / operator cockpit feature / dropped) | TBD | TBD | TBD | TBD | TBD |

Add a row per output as Days 2–6 produce them. If an output cannot be classified into one of the five productionisation buckets, it is **dropped**, not promoted to production.

## 4. Boundaries (read before adding any row)

- **No runtime code, no env vars, no secrets, no DNS, no deployment changes** are made to satisfy this checklist.
- **No real client bank statements, medical / clinical records, credentials, card data, or confidential contracts** are uploaded into any Google tool. Use sanitised / synthetic examples only.
- **No bulk outreach** (email, SMS, WhatsApp, LinkedIn) is automated from a Google tool against real prospect lists.
- **No production workflow** is moved off n8n / Postgres / Vercel / ERPNext onto a Google tool.
- **No buyer-facing claim** is shipped from AI-drafted content without verification against `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`.
- **Sensitive-data exceptions require a separate review** per `docs/operations/SECURITY_REVIEW_CHECKLIST.md`.

## 5. Cross-references

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — operating doc that bounds tool use.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — strategic evaluation doctrine.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand / conversion doctrine + Google-tool-generated collateral rules.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate for prospect / client-facing output.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — Lead Rescue operator runbook.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers.
- `docs/strategy/sources/2026-06-06-google-ai-tools-acceleration-source.md` — the strategy source capture that informed this checklist.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.
