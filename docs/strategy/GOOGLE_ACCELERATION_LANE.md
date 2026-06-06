# Google Acceleration Lane

**Status:** Mandatory operating doc for any use of Google AI tooling inside CorpFlowAI work.

**Anchor sentinel:** `<!-- GOOGLE_ACCELERATION_LANE_V1 -->`

<!-- GOOGLE_ACCELERATION_LANE_V1 -->

## Purpose

CorpFlowAI is a Google-using company. Several Google AI products (AI Studio, Opal, NotebookLM, Pomelli, Gemini Canvas, Gemini image / Nano Banana tooling, AI Studio multi-speaker audio) can materially accelerate prototypes, internal tools, workflow design, training assets, decks and proposals, diagrams and visual assets, client explainers, sales collateral, and product discovery packs.

This lane exists to **accelerate CorpFlowAI production**. It does **not** become CorpFlowAI's moat, identity, or client-facing product.

The strategic rule, taken directly from `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`, applies to every Google-tool use inside the company:

> **Commodity AI is fuel. It is not the moat.**

Google tools are fuel. The moat lives above the line in vertical workflows, managed outcomes, proprietary client context, trust-heavy / secure operations, and owned distribution.

## Doctrine alignment

This lane is bounded by two canonical doctrines. If anything below conflicts with them, they win:

- **`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`** — strategic evaluation; what CorpFlowAI builds and sells.
- **`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`** — buyer-facing brand, conversion, and CTA rules.

Operating implications:

- Google tools may create **first drafts**, **prototypes**, **diagrams**, **audio**, **decks**, **workflow sketches**, and **training materials**.
- Final production still flows through **GitHub**, **Cursor**, **Vercel**, **Postgres**, **n8n**, and **ERPNext** — and through the Delivery Reality discipline in `.cursor/rules/delivery-reality.mdc`.
- Any client-facing output produced with help from these tools requires **human review** against the brand/conversion doctrine and the above-the-line doctrine **before** it leaves CorpFlowAI.
- Google tools must not be used to bypass any existing review gate (PR review, Technical Lead, marketing quality gate, Delivery Reality Audit).
- Google tools must not be used as the operational system for a client deliverable. The operational system is the CorpFlowAI app + Postgres + n8n + ERPNext (where applicable) + the operator cockpit.

## Tool inventory

| Tool | Claimed capability | CorpFlowAI use | Production role | Risk | Priority |
| ---- | ------------------ | -------------- | --------------- | ---- | -------- |
| Google AI Studio | Prototype apps / interfaces and AI behaviour quickly. | Internal prototypes, demo tools, prompt experiments, mini UI sketches. | Prototype only. Productionisation must go through a repo PR via Cursor / Vercel. | Drift into shipping AI Studio prototypes as production. Data leakage if real client data is pasted. | P0 |
| Google Opal | Plain-English workflow app builder. | Workflow prototyping, lead qualification tool sketches, content pipeline shapes. | Prototype workflow shape. **n8n remains the governed production workflow layer** for now. | Becoming a generic automation reseller; running real client workflows on Opal without governance. | P1 (subject to access). |
| NotebookLM Video Overview | Turn documents into narrated / video explainers. | Internal training, operator onboarding, client explainer drafts. | Training / collateral draft. Final content reviewed against brand + above-the-line doctrines. | Uploading sensitive client docs; passing AI-narrated audio off as human-authored. | P0 |
| Pomelli | Brand / campaign generation from a website. | Campaign draft generation, social post drafts, brand consistency experiments. | Draft only. Human + doctrine review required before any external publication. | Off-doctrine copy; auto-generated revenue claims; brand drift; "AI agent company" framing. | P2 (subject to regional availability). |
| Gemini Canvas | Turn documents into presentations. | Proposals, pitch decks, discovery decks, strategy decks. | Deck draft. Final reviewed before sending to a client or prospect. | Generic-looking decks that drift below the line; pasting confidential proposal context. | P1 |
| Gemini image / Nano Banana tooling | Image generation / editing and sketch / reference visual concepts. | Diagrams, marketing visuals, mockups, pitch visuals. | Visual draft. **Never used to fabricate evidence** (no fake screenshots, fake dashboards, fake testimonials, fake metrics). | Fabricated evidence; brand-violating imagery (robots, neon AI swirls, etc.). | P1 |
| AI Studio multi-speaker audio | Generate conversational audio. | Training audio, client explainer audio, founder briefings. | Audio draft. Disclose AI-generated where the audience would reasonably expect human authorship. | Synthetic-voice impersonation; undisclosed AI audio in client-facing material. | P2 |

## Prototype vs production matrix

| Work type | Google tool role | Existing CorpFlowAI production role | Rule |
| --------- | ---------------- | ----------------------------------- | ---- |
| App prototype | AI Studio / Gemini Canvas to sketch UI + behaviour. | Cursor + repo + Vercel ship the production app. | Prototype freely; productionisation goes through PR + Delivery Reality. |
| Workflow prototype | Opal to sketch the workflow shape. | n8n hosts the governed production workflow with HMAC / ingest / forward secrets per `docs/automation-framework.md`. | Sketches stay in Opal; production workflows are n8n only until a separate architecture decision says otherwise. |
| n8n production workflow | None (Google tools do not run client workflows). | n8n + Postgres + CorpFlowAI app. | Do not move a live client workflow onto a Google tool. |
| Client-facing proposal | Gemini Canvas to draft. | Reviewed PDF / deck stored under `docs/` or operator drive becomes the approved collateral. | Doctrine + brand review before sending. |
| Landing page copy | NotebookLM / Gemini for a first draft from existing approved copy. | Production copy lives in the repo (e.g. `pages/lead-rescue/`, apex marketing components) and ships via PR. | Final buyer-facing copy must pass `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and `docs/marketing/04_DELIVERY_QUALITY_GATE.md`. |
| Training document | NotebookLM to summarise existing runbook. | Source of truth is the runbook in `docs/operations/` (e.g. `AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`). | The runbook is canonical; NotebookLM output is a reading aid, not a replacement. |
| Operator runbook | NotebookLM for onboarding summaries; Gemini Canvas for diagrams. | Operator runbooks live in the repo under `docs/operations/` and `docs/runbooks/`. | Never replace the repo runbook with a Google-hosted doc. |
| Secure data automation | None by default. Google tools do **not** touch client bank statements, medical records, credentials, or other sensitive data. | CorpFlowAI-controlled architecture (Postgres + ERPNext + n8n + audit trail). | A separate security / privacy review is required before any Google-tool use on sensitive data. |
| Marketing visual | Gemini image / Nano Banana for diagrams + draft visuals. | Approved visuals live in the repo (`public/`) and are referenced by the production site. | Drafts only; never fake evidence; brand doctrine applies. |
| Social campaign | Pomelli / Gemini for draft posts, hooks, and angles. | Approved posts go through the marketing quality gate before publishing. | Doctrine + above-the-line review per post; no auto-post pipelines yet. |
| Client onboarding explainer | NotebookLM / AI Studio audio for a draft. | Final explainer is reviewed and stored as approved collateral. | Disclose AI-generated where appropriate; no client-specific legal / compliance claims without human review. |

Important distinctions:

- **Google AI Studio can prototype; Cursor / repo / Vercel productionise.**
- **Opal can sketch workflows; n8n governs production workflows.**
- **NotebookLM can explain docs; repo docs remain source of truth.**
- **Gemini Canvas can draft decks; reviewed PDFs / decks become approved collateral.**
- **Image tools can draft visuals; they cannot create fake screenshots or fake evidence.**
- **Audio tools can draft explainers; they cannot replace client-specific legal / compliance review.**

## Immediate adoption plan

A 7-day plan. Each day is bounded; nothing here authorises production deploys, secret changes, DNS, or sending anything to a real client.

### Day 1 — Access audit

Confirm CorpFlowAI Google account access (or document the gap) for:

- Google AI Studio
- Google Opal
- NotebookLM
- Pomelli
- Gemini Canvas (Gemini app)
- Gemini image tools
- AI Studio multi-speaker audio

Record results in `docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md` § access audit. Mark anything Cursor cannot verify as **Requires operator browser verification**.

### Day 2 — AI Lead Rescue collateral

Using only the approved AI Lead Rescue copy in the repo (landing page text + `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` + `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md`), draft:

- One-page handout (Gemini Canvas).
- Six-slide sales deck (Gemini Canvas).
- Two-minute explainer script (NotebookLM / Gemini).
- Operator training summary (NotebookLM from the runbook).
- Workflow diagram (Gemini image / Nano Banana, or Opal sketch).

All outputs are drafts. None ships to a prospect or client without doctrine review.

### Day 3 — Mauritius property prospecting accelerator

Prototype a prospect scoring sheet / tool:

- Define inputs (business name, niche, lead source, current follow-up gap, regional fit).
- Define outputs (fit score, pain hypothesis, outreach angle, next action).
- Use **synthetic** prospect rows; do **not** load real Mauritius client lists into Google tools without a separate review.
- Do **not** automate outreach. No bulk email, no bulk WhatsApp, no bulk SMS, no bulk LinkedIn. The wedge is qualified human outreach.

### Day 4 — Proposal accelerator

Draft, review, and store:

- AI Lead Rescue proposal deck (Gemini Canvas).
- Secure automation discovery proposal — paid discovery scope only, per `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` § immediate-implication (5).
- Restaurant marketing operations one-pager.

### Day 5 — Internal training

- Run NotebookLM on `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.
- Produce a training summary.
- Produce a video / audio draft if NotebookLM Video Overview / AI Studio audio is available.
- Confirm a new operator can understand the **intake → qualify → setup checklist** workflow from the summary alone.

### Day 6 — Secure workflow discovery pack

Draft a paid-discovery pack for **bank-statement-to-system** automation:

- Risk map (data sensitivity, audit-trail requirements, failure modes).
- Data flow diagram (no real bank data; synthetic only).
- Feasibility checklist (what needs to be true before CorpFlowAI accepts the engagement).
- Paid discovery scope (timebox, deliverable, fee).

This is a **paid discovery candidate**, not free scoping, per the above-the-line doctrine.

### Day 7 — Productionisation decisions

For each Day 2–6 output, decide:

- Which becomes a **repo doc** (under `docs/` with a PR).
- Which becomes **sales collateral** (approved, reviewed, stored).
- Which becomes a **Cursor prompt / template** for repeat use.
- Which becomes an **n8n workflow** under the governed automation layer.
- Which becomes an **operator cockpit feature** (admin pages, CMP action, factory tooling).

Anything that does not clearly belong in one of the five buckets is dropped — not promoted to production.

## Access test checklist

| Tool | URL | Accessible with CorpFlowAI Google account? | Region issue? | Tested by | Date | Result | Notes |
| ---- | --- | -----------------------------------------: | ------------: | --------- | ---- | ------ | ----- |
| Google AI Studio | `https://aistudio.google.com` | TBD | TBD | Requires operator browser verification | TBD | TBD | Cursor cannot log in to Google with the operator account; verify in a real browser. |
| Google Opal | `https://opal.google.com` | TBD | TBD | Requires operator browser verification | TBD | TBD | Region availability may vary (Google Labs); confirm from operator browser. |
| NotebookLM | `https://notebooklm.google.com` | TBD | TBD | Requires operator browser verification | TBD | TBD | Confirm Video Overview availability separately. |
| Gemini app / Canvas | Operator-confirmed URL (TBD) | TBD | TBD | Requires operator browser verification | TBD | TBD | Add the exact URL after operator confirms. |
| Pomelli / Google Labs | Operator-confirmed URL (TBD) | TBD | TBD | Requires operator browser verification | TBD | TBD | Region availability may block access; confirm from operator browser. |
| Gemini image tools | Operator-confirmed URL (TBD) | TBD | TBD | Requires operator browser verification | TBD | TBD | Includes Nano Banana surface; operator confirms entry point. |
| AI Studio multi-speaker audio | Operator-confirmed URL (TBD) | TBD | TBD | Requires operator browser verification | TBD | TBD | Likely a feature within AI Studio; confirm location. |

Cursor cannot interactively test these tools because login / browser / Google-account access is not available to the agent. Rows above are intentionally marked **TBD** and **Requires operator browser verification**. Do not pretend the tools were tested.

## Data safety rules

Hard rules. No exceptions without a separate, documented security / privacy review:

- **Do not** upload real client bank statements.
- **Do not** upload medical or clinical records.
- **Do not** upload passwords, API keys, tokens, OAuth secrets, session cookies, or credentials of any kind.
- **Do not** upload bank account numbers, IBANs, card numbers, CVVs, or payment-instrument data.
- **Do not** upload confidential client documents (NDAs, contracts, PII-heavy spreadsheets, internal financials) unless the client has explicitly approved Google-tool processing **and** an internal review has signed off.
- **Use sanitized examples** for prototypes (placeholder names, redacted numbers, fabricated rows).
- **Use synthetic data** for demos and training.
- **Client-sensitive workflows require a separate security / privacy review** per `docs/operations/SECURITY_REVIEW_CHECKLIST.md`.
- **Secure workflow automation** (e.g. bank-statement-to-system, document-to-ERP, finance / admin exception queues) is a CorpFlowAI-controlled architecture question, not a casual Google-tool upload. The discovery pack is allowed; running real client data through a Google tool is not.

If unsure whether a document is safe to upload, the default answer is **no**.

## Above-the-line filter

Apply this filter to every Google-generated output **before** it influences a production artefact, a client-facing surface, or a roadmap decision:

1. **Is this merely generic AI output?** If yes, do not ship it as a CorpFlowAI deliverable.
2. **What client-specific workflow does it support?** If none, narrow it or drop it.
3. **What managed outcome does it accelerate?** Tie it to a real outcome CorpFlowAI is accountable for.
4. **What proof or evidence does it help us create?** Drafts that do not feed a real proof artefact are training only.
5. **What remains valuable if Google gives the same tool to everyone?** If nothing remains valuable, the output is leverage, not strategy.

If the output fails the filter, keep it as internal acceleration. Do not promote it to client-facing.

## First three experiments

Concrete, bounded experiments. Each has a defined input, output, and success criterion.

### Experiment 1 — AI Lead Rescue sales deck via Gemini Canvas

- **Input.** Approved AI Lead Rescue copy from `pages/lead-rescue` and `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.
- **Output.** Six-slide draft sales deck (problem → outcome → offer → how it works → who it is for → CTA).
- **Success.** Deck is usable after a human / doctrine edit pass within 60 minutes.
- **Out of scope.** Sending the deck to a prospect without review. Pasting confidential client lists into Canvas.

### Experiment 2 — NotebookLM operator training from the AI Lead Rescue runbook

- **Input.** `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` only.
- **Output.** A NotebookLM-generated training summary, plus an optional NotebookLM Video Overview if available.
- **Success.** A new operator can understand the **intake → qualify → setup checklist** workflow from the summary alone, without reading the full runbook first.
- **Out of scope.** Replacing the runbook. The repo runbook stays canonical.

### Experiment 3 — AI Studio / Opal prospect scoring prototype

- **Input.** Synthetic Mauritius property prospect rows (no real prospect data).
- **Output.** A prospect-scoring tool that returns: fit score, pain hypothesis, outreach angle, next action.
- **Success.** Helps create up to **25 qualified Mauritius property prospects** without bulk spam, using human-reviewed outreach.
- **Out of scope.** Bulk email / SMS / WhatsApp / LinkedIn. Loading real prospect lists. Auto-sending anything.

## Workflow integration

The proposed CorpFlowAI workflow when a Google tool is involved:

1. **Idea or requirement** captured (in a packet, ticket, or operator note).
2. **Google tool first draft or prototype.**
3. **Doctrine review** — above-the-line + brand / conversion + delivery-reality.
4. **Human edit** — concrete, specific, outcome-led.
5. **Cursor PR or n8n build** if production is needed.
6. **Delivery Reality Audit** — only **live verified** is `COMPLETE`.
7. **Approved collateral or workflow** stored in the repo / operator drive / production system.

Skipping steps 3 or 6 is how generic AI output ends up in front of clients. Don't.

## What not to do

- **Do not delay AI Lead Rescue launch** for Google-tool experiments. Lead Rescue verification, login / autofill fixes, and first revenue come first.
- **Do not** use these tools as an excuse to build generic chatbots, generic AI agents, generic prompt-to-app wrappers, generic content generators, or generic automation resellers. The above-the-line doctrine forbids that positioning.
- **Do not** let generated assets bypass the brand / conversion review or the marketing quality gate.
- **Do not** upload sensitive data — see *Data safety rules*.
- **Do not** replace n8n / Postgres / Vercel production paths without a separate architecture decision and a separate PR.
- **Do not** create client-facing claims from AI-generated content without verification. No fabricated screenshots, no fabricated testimonials, no fabricated metrics, no fabricated revenue guarantees.
- **Do not** position CorpFlowAI as "the AI agent company that uses Google" or any equivalent commodity framing.

## Cross-references

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — strategic evaluation doctrine.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand and conversion doctrine.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth doctrine.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate for prospect / client-facing output.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — Lead Rescue operator runbook.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers.
- `docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md` — adoption checklist + experiments tracker.
- `docs/strategy/sources/2026-06-06-google-ai-tools-acceleration-source.md` — strategy source capture that informed this lane.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

