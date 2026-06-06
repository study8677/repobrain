# Strategy source — Google AI tools acceleration (seven-tool overview)

**Anchor sentinel:** `<!-- STRATEGY_SOURCE_20260606_GOOGLE_AI_TOOLS_ACCELERATION -->`

<!-- STRATEGY_SOURCE_20260606_GOOGLE_AI_TOOLS_ACCELERATION -->

## 1. Source metadata

| Field | Value |
|---|---|
| Working title | Google AI tools acceleration — seven-tool overview (assigned by the capture-requesting operator). |
| URL | not supplied to Cursor at capture time. |
| Source type | Transcript supplied by Anton (operator-supplied distillation in the originating prompt). |
| Source publication date | not supplied to Cursor at capture time. |
| Source creator | not supplied to Cursor at capture time. |
| Capture date | 2026-06-06. |
| Captured by | Anton, recorded in repo by Cursor. |
| Capture method | Operator-supplied distillation. **Cursor did not fetch, watch, or read the underlying transcript.** No transcript text is reproduced in this file. |
| Primary relevance | Internal acceleration for prototypes, internal tools, workflow design, training assets, decks / proposals, diagrams / visual assets, client explainers, sales collateral, and product discovery packs. Informs the new acceleration lane in `docs/strategy/GOOGLE_ACCELERATION_LANE.md`. |

**Attribution discipline.** The seven-tool inventory and the claimed capabilities below originate with the external source and the platform vendors (Google). CorpFlowAI does not claim authorship of the tools or the underlying claims; we have only selected, condensed, and mapped them onto CorpFlowAI's operating surfaces. No transcript text is reproduced.

## 2. Short summary of the seven tools

The transcript described seven Google AI surfaces that may accelerate CorpFlowAI work. Each is summarised below in one or two lines. Claimed capabilities are vendor / source claims, not CorpFlowAI verifications.

1. **Google AI Studio** — rapid prototyping of apps / interfaces and AI behaviour; useful for prompt experiments and small UI sketches.
2. **Google Opal** — plain-English workflow app builder; useful for sketching workflow shapes before n8n implementation.
3. **NotebookLM Video Overview** — turns documents into narrated / video explainers; useful for internal training and onboarding drafts.
4. **Pomelli** — generates brand / campaign content from a website; useful for campaign and social-post drafts. Regional availability varies.
5. **Gemini Canvas** — turns documents into presentations; useful for proposal / pitch / discovery / strategy decks.
6. **Gemini image / Nano Banana tooling** — image generation and editing; useful for diagrams, marketing visuals, mockups, pitch visuals.
7. **AI Studio multi-speaker audio** — generates conversational audio; useful for training audio, explainer audio, and founder briefings.

## 3. Claimed capabilities (vendor / source claims, unverified)

- AI Studio can stand up a working AI prototype quickly without a full code project.
- Opal lets a non-engineer describe a workflow in plain English and produces a runnable app shape.
- NotebookLM ingests source documents and produces summaries, Q&A, and (for some accounts) video / audio overviews.
- Pomelli analyses a website and produces brand-consistent campaign assets.
- Gemini Canvas converts documents into multi-slide presentations with editable layouts.
- Gemini image / Nano Banana tooling generates and edits images from prompts and reference inputs.
- AI Studio multi-speaker audio generates multi-voice conversational audio from a script.

CorpFlowAI has **not** independently verified any of these capabilities at capture time. Verification is gated on the access audit in the new acceleration lane.

## 4. CorpFlowAI relevance

- These tools are candidates for **internal acceleration only**, never for replacing the production stack (CorpFlowAI app + GitHub + Vercel + Postgres + n8n + ERPNext).
- They map cleanly onto CorpFlowAI's existing acceleration needs: AI Lead Rescue collateral, Mauritius property prospecting (synthetic data only), proposal accelerators, internal training, secure-workflow discovery packs (no real client data).
- They also map onto the **commodity-tools policy** in `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` § *Commodity tools policy*: research, drafting, code acceleration, workflow design, prototype generation, content repurposing, market monitoring, document summarisation.
- They do **not** change CorpFlowAI's strategic positioning. The above-the-line doctrine still governs what we build and sell. These tools are leverage, not the moat.

## 5. Limitations and unverified claims

- **Cursor did not fetch or watch the underlying transcript.** The summary above is built entirely from the operator-supplied distillation in the originating prompt. Nuance, counter-examples, or qualifications present in the original source but not surfaced in the distillation are not represented here.
- Claimed capabilities are vendor / source claims. CorpFlowAI has not independently verified any of them.
- Regional availability for Opal, Pomelli, NotebookLM Video Overview, Gemini image tools, and AI Studio multi-speaker audio is unknown at capture time and may be limited.
- Pricing, rate limits, retention, and data-handling policies for each tool were not captured. Any use that touches client data must be gated on a separate review.
- No quantitative claims (productivity multipliers, time savings, conversion lift) were imported. CorpFlowAI does not propagate unverified numbers into the repo.
- The transcript is **opinion-shaped operating advice**, not measurable evidence. It is adopted as a candidate acceleration set because it is consistent with the existing commodity-tools policy and the above-the-line doctrine.

## 6. Recommended action

Adopt the seven-tool set as an internal **Google Acceleration Lane**, governed by the new doctrine doc and the existing strategic + brand doctrines. Specifically:

1. Create the new `docs/strategy/GOOGLE_ACCELERATION_LANE.md` (this PR).
2. Create the operator adoption checklist `docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md` (this PR).
3. Add a **must-read** entry to `AGENTS.md` so future agents check the strategic guardrails before proposing generic AI / tooling work (this PR).
4. Add a **Google-tool-generated collateral** section to `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` so any Google-drafted buyer-facing material passes the brand + above-the-line filter before publication (this PR).
5. Run the access audit (Day 1 of the adoption plan) in a real operator browser — Cursor cannot test these tools because login / browser / Google-account access is not available to the agent.

### Do not

- Do not run the access audit by claiming tools were "tested" without a real operator browser session.
- Do not paste the underlying transcript or large quoted passages into this file or anywhere else in the repo.
- Do not edit runtime code, env vars, secrets, DNS, DB schema, analytics, Search Console wiring, or deployment configuration from this capture.
- Do not delay AI Lead Rescue launch for Google-tool experiments.
- Do not re-position CorpFlowAI as a generic AI / chatbot / agent / prompt-to-app / content-generation / automation-reseller company on the strength of these tools.
- Do not upload sensitive client data (bank statements, medical / clinical records, credentials, card data, confidential contracts) into any Google tool without a separate security / privacy review.

### Future packets (named only — not opened by this PR)

| Working name | Purpose | Approval gate |
|---|---|---|
| **GoogleAccel-Access-Audit-1** | Operator browser session that tests each of the seven tools against the CorpFlowAI Google account and records results in the adoption checklist. Docs-only output (the audit results). | Separate operator DECISION block. |
| **GoogleAccel-AILeadRescue-Collateral-1** | Day 2 collateral pack for AI Lead Rescue (one-pager, six-slide deck, two-minute script, training summary, workflow diagram), all reviewed against brand + above-the-line doctrines. Docs / collateral only. | Separate operator DECISION block. |
| **GoogleAccel-Mauritius-Prospecting-1** | Day 3 prospect-scoring prototype using **synthetic** rows only; no bulk outreach. | Separate operator DECISION block. |
| **GoogleAccel-Secure-Discovery-Pack-1** | Day 6 paid-discovery pack for bank-statement-to-system automation; risk map, data-flow diagram (synthetic only), feasibility checklist, paid scope. | Separate operator DECISION block. |
| **GoogleAccel-Productionisation-Decisions-1** | Day 7 decisions for which Day 2–6 outputs become repo docs, sales collateral, Cursor prompts, n8n workflows, or operator cockpit features. | Separate operator DECISION block. |

## 7. Proposed doctrine updates

This capture has **already** produced the following changes in the same PR. They are listed here for traceability — the authoritative versions are the doctrine / lane / operations files, not this capture.

1. **New** `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — the operating doc that bounds use of the seven tools.
2. **New** `docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md` — operator adoption checklist + first three experiments tracker.
3. **Updated** `AGENTS.md` — added a must-read line pointing to the above-the-line doctrine and the acceleration lane.
4. **Updated** `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — added the *Google-tool-generated collateral* section.
5. **Updated** `docs/strategy/sources/README.md` — added the index row for this capture.

Any further doctrine changes (for example, lifting a data-safety rule, changing the production-stack rule, or promoting a Google tool to "production-allowed") must go through their **own** PR with their **own** operator DECISION block.

## 8. Cross-references

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — the lane this capture informs (authoritative for tool use).
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — strategic evaluation doctrine; commodity-tools policy.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand + conversion + Google-tool-generated collateral rules.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth doctrine.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate for prospect / client-facing work.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — Lead Rescue operator runbook (input for Day 2 + Day 5 experiments).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers (gates Google-tool use on sensitive data).
- `docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md` — operator adoption checklist + experiments tracker.
- `docs/strategy/sources/README.md` — strategy sources index + capture conventions.
- `docs/strategy/sources/2026-06-06-above-the-line-ai-strategy.md` — companion strategy capture that produced the above-the-line doctrine.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.
