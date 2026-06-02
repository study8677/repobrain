# Support / ticketing system feasibility — Freshdesk v1 (with Zoho Desk backup)

**Status:** Investigation only. Docs-only artefact.
**Author:** Assistant (Cursor) on behalf of Anton.
**Date (UTC):** 2026-06-02.
**Trigger:** Anton's DECISION on Operator Bridge issue #249 — *"Investigate Freshdesk as the preferred v1 customer-support/ticketing system, but do not configure it yet."*
**Linked JOURNAL row:** `JE-2026-06-02-5`.
**Linked CMP doc:** `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (existing comms framework; this feasibility extends it to inbound customer support).
**Hard limits honoured:** No Freshdesk or Zoho account created. No DNS changes. No email-routing changes. No live-chat widget. No website copy changes beyond PAY-SBM-2. No env vars, secrets, production DB, Vercel settings, GitHub settings, payment settings, ERPNext production, Telegram, Search Console, Plausible, or analytics touched.

---

## § 0 — Hard limits and sensitive-data exclusion

This document is research only. The following are explicitly **out of scope** for this packet:

1. Creating a Freshdesk account, Freshdesk Omni account, or any Freshworks login.
2. Creating a Zoho Desk account or any Zoho One login.
3. Buying a paid plan, entering credit-card details, or activating a free trial.
4. Adding a CNAME, MX, SPF, DKIM, DMARC, or any DNS record to `corpflowai.com`.
5. Adding or removing an email forwarder for `support@corpflowai.com`.
6. Installing a live-chat widget on any page of `corpflowai.com`, `lux.corpflowai.com`, or any tenant surface.
7. Changing any public-site copy about customer support beyond what PAY-SBM-2 already merged on `2026-06-02` (commit `0fd9312b`).
8. Touching `.env`, GitHub Secrets, Vercel environment variables, Vercel project settings, GitHub repository settings, Prisma schema, production DB, Telegram bot config, Plausible config, Search Console properties, or any payment-gateway configuration.

All Anton-personal data, beneficial-owner identifiers, banking details, and signed forms remain strictly outside the repository — same rule as PAY-SBM-1 / PAY-SBM-2.

---

## § 1 — v1 customer-support objectives

The launch-pilot bar is deliberately modest, to match payment readiness and the small Mauritius warm-network outreach:

| # | Capability | v1 target |
|---|---|---|
| O1 | Single public support address | `support@corpflowai.com` (inbound + outbound) |
| O2 | Acknowledgement SLA (public-facing wording) | Within **two working days** (matches `pages/contact.js` and footer copy merged in PAY-SBM-2) |
| O3 | Self-service portal URL | `support.corpflowai.com` or `help.corpflowai.com` |
| O4 | Branding | CorpFlowAI logo, colours, copy; **no visible Freshdesk / Freshworks / Zoho branding** on portal, email, ticket footer |
| O5 | Knowledge base | One small KB for AI Lead Rescue FAQs |
| O6 | Live chat | **NOT in v1.** No widget on any page. |
| O7 | AI chatbot | **NOT in v1.** No automated reply, no AI-deflection claim. |
| O8 | 24/7 support | **NOT claimed.** Business-hours only, Mauritius timezone. |
| O9 | Audit trail | Per-ticket history sufficient for SBM e-Commerce "complaint handling" evidence (Ref172 §). Formal audit log not required v1. |
| O10 | Agent count | 1–2 (Anton; optionally 1 contractor). Free tier eligibility matters. |
| O11 | Cost | Comfortably ≤ **USD 360 / year** at v1 scale (1–2 agents, annual billing). |

---

## § 2 — Freshdesk fit assessment (preferred v1)

### § 2.1 — Plan structure (June 2026, verified from Freshdesk public pricing + official help-centre articles)

| Plan | Annual (per agent / month) | Monthly | Includes |
|---|---|---|---|
| Free | $0 | $0 | Up to 2 agents · email channel · basic ticketing · knowledge base · shared inbox. **No custom domain, branding cannot be removed.** |
| **Growth** | **$15** | $18 | Everything in Free + automation, real-time dashboards, **custom support portal URL with auto-SSL**, marketplace apps. **Freshdesk footer branding is automatically removed on any paid plan.** |
| Pro | $49 | $59 | Everything in Growth + custom portals (segmented), advanced ticketing, multilingual KB, custom roles, round-robin routing, multiple SLAs. |
| Enterprise | $79 | $95 | Everything in Pro + custom CSS/JS on portal, sandbox, audit logs, IP whitelisting, skill-based routing. |

(Pro+AI Copilot bundle exists but is irrelevant — v1 must not claim AI chatbot.)

### § 2.2 — Eight required checks (DECISION → answers)

#### C1 — Can `support@corpflowai.com` be connected for inbound and outbound ticket email?

**YES, on Free and all paid plans.** Freshdesk treats email as a first-class channel. Two integration modes are documented:

- **Forwarding mode (simple, no DNS change):** point a `support@corpflowai.com` mailbox forwarder at the auto-generated Freshdesk inbox address. Operator change is in the mail host (whoever currently owns `corpflowai.com` MX), **not** in DNS. Outbound replies go from `support@corpflowai.com` if DKIM/SPF for Freshdesk is added (DNS change — held).
- **MX-routing mode (full):** add Freshdesk's MX records — out of scope for this packet (DNS change).

For v1 we can run in forwarding mode without any DNS change. Outbound deliverability will read as "via freshdesk.com" until SPF/DKIM is added later. Acceptable for warm-network outreach; recommended to clean up before broad cold outreach.

#### C2 — Can `support.corpflowai.com` or `help.corpflowai.com` be used as a custom support portal domain?

**YES, on Growth and above.** Per Freshdesk's official article *"Use a custom portal URL and verify DNS"*, the operator:
1. Adds the desired hostname (`support.corpflowai.com`) in Admin → Portals → Portal URL.
2. Adds a CNAME record in the `corpflowai.com` DNS panel pointing to the value Freshdesk generates.
3. Freshdesk auto-provisions an SSL certificate after DNS verification (free, no operator action).

Not available on Free. Anton's DNS change is required at activation time — out of scope here, but documented for the future activation packet.

#### C3 — Does Freshdesk support custom logo, colours, and brand copy?

**YES, on Growth and above.** Admin → Portals → Customise portal exposes:
- Logo + favicon upload.
- Brand colour palette and font selection.
- Portal name, link-back URL, hero copy.
- Section toggles (KB on, community off, ticket-submission form on/off).

Free plan supports logo upload but the Freshdesk wordmark remains in the footer.

#### C4 — Can Freshdesk / Freshworks branding be removed from each surface?

| Surface | Free plan | Growth plan | Pro plan | Enterprise plan |
|---|---|---|---|---|
| Portal footer ("Powered by Freshdesk") | NO | **YES** (auto on upgrade) | YES | YES |
| Email templates (default outbound + system) | Limited — wordmark in default templates | **Editable** — full template overrides | Editable | Editable |
| Ticket footer (in agent-sent replies) | Wordmark default | **Removable** via template editor | Removable | Removable |
| Knowledge base | Footer wordmark | **Auto-removed** on upgrade | Removed | Removed |
| Chat widget | Wordmark | **Removable** via widget appearance tab (all paid plans) | Removable | Removable |
| Portal-page deep CSS / layout | Theme-only | Theme-only | Theme + Portal Pages | **Full CSS + JS code editor** |

**Key citation:** Freshdesk's own help article *"How do I remove the Freshdesk branding?"* states: *"The Freshdesk branding at the bottom of the customer support portal would automatically be removed once your account is upgraded to a paid plan."* For CorpFlow v1 (no chat widget, no advanced layout), **Growth removes all visible Freshdesk branding on the surfaces that customers see.**

#### C5 — Which plan is required for custom domain, custom SSL, branding removal?

**Growth ($15/agent/month annual)** is sufficient for v1. Specifically:
- Custom domain (`support.corpflowai.com`): Growth.
- Auto SSL: Growth (free, automatic).
- Branding removal (portal footer + KB + email templates + widget): Growth.
- Custom CSS/JS for deep layout edits: Enterprise (not needed v1).

#### C6 — Can we operate without live chat initially?

**YES.** Live chat (Freshchat) is a separate Freshworks product and not bundled with Freshdesk by default. Email + portal-form only is the default Freshdesk experience. No widget is rendered on any external page unless the operator embeds the JavaScript snippet on the site. **For v1 we will not embed any widget on `corpflowai.com`.**

#### C7 — Does Freshdesk provide audit / ticket history suitable for proving customer support and complaint handling?

**YES, on Growth.** Each ticket carries an append-only conversation thread with timestamps, agent assignments, status transitions, and CSAT-survey responses if enabled. Tickets are searchable, exportable to CSV, and retained per Freshworks' standard retention. **This is sufficient evidence for SBM e-Commerce Ref172 §customer support / §complaints.**

Formal compliance-grade audit logs (IP-level, user-action-level) require Enterprise. Not needed v1; SBM accepts standard ticket-history evidence per their Web Site Requirements doc.

#### C8 — Is Zoho Desk a credible backup if Freshdesk branding removal is too expensive?

**YES.** See § 3 below.

### § 2.3 — Cost projection (v1 launch-pilot scale)

| Scenario | Agents | Plan | Annual cost | Monthly equivalent |
|---|---|---|---|---|
| Solo founder (Anton only) | 1 | Growth | **USD 180 / year** | USD 15 |
| Solo + contractor | 2 | Growth | **USD 360 / year** | USD 30 |
| Solo + Pro tier (if multi-SLA needed later) | 1 | Pro | USD 588 / year | USD 49 |
| Solo + Enterprise (NOT v1) | 1 | Enterprise | USD 948 / year | USD 79 |

**Recommended v1 budget:** USD 180–360 / year. Comfortably below O11 target.

### § 2.4 — Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Email deliverability via forwarding-mode without SPF/DKIM for Freshdesk → "via freshdesk.com" sender label on outbound. | Acceptable for warm network; clean up DNS before broad cold outreach (separate packet). |
| R2 | Freshworks ToS changes (pricing, branding-removal availability). | Re-check before each renewal. Both vendors have raised prices in last 24 months. |
| R3 | Knowledge-base SEO competing with `corpflowai.com` SEO. | Use `noindex` on KB or scope KB to logged-in-only initially. Configurable. |
| R4 | Data residency. Freshworks hosts in US / EU / IN / AU regions; Mauritius operators with Mauritian company prefer EU region for GDPR-friendly posture. | Choose **EU data centre** at signup (one-time choice). Document in DATA_MAP. |
| R5 | Vendor lock-in (ticket history). | Ticket history is exportable to CSV at any time; backup quarterly. |
| R6 | Freshdesk Free plan does not satisfy v1 branding goal — must go straight to Growth. | Budget USD 180–360 / year. |
| R7 | Custom-domain DNS change requires editing `corpflowai.com` DNS; this touches infrastructure shared with Vercel + apex email. | Plan DNS change carefully when the activation packet runs; verify Vercel apex routing unaffected (CNAME `support.` is independent of apex `A` / `CNAME`). |
| R8 | Outbound `support@corpflowai.com` deliverability impacts client communications already running through n8n + Gmail OAuth per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`. Conflict possible if both Freshdesk and Gmail try to send from the same address. | **Decision needed before activation:** either (a) keep Gmail for system-transactional, Freshdesk for customer-initiated; or (b) move all `support@` outbound through Freshdesk and retire the Gmail-OAuth send path. Documented for the activation packet; **out of scope here**. |

---

## § 3 — Zoho Desk fit assessment (backup option)

### § 3.1 — Plan structure (June 2026, USD annual)

| Plan | Annual (per agent / month) | Monthly | Notes |
|---|---|---|---|
| Free | $0 | $0 | **Up to 3 agents** (more generous than Freshdesk Free), email channel, KB, predefined SLA. **No custom domain.** |
| Express | $7 | $9 | 5 agents max, custom email channel, basic ticket forms. Custom domain availability unclear at this tier. |
| **Standard** | **$14** | $17 | Unlimited agents, social channel, public KB, custom domain (CNAME + free SSL), themes gallery, rebranding (logo + favicon + portal name). |
| Professional | $23 | $28 | Multi-department, telephony, automatic time tracking, advanced reporting. |
| Enterprise | $40 | $50 | Multi-brand help centre, full help-centre customisation, Zia AI, sandbox, audit log, custom roles, advanced process management. |

INR pricing is materially cheaper for buyers transacting in INR (₹420 / ₹800 / ₹1,400 / ₹2,400 per agent annual), but CorpFlowAI Ltd transacts in USD via SBM Bank Mauritius — INR pricing is not relevant.

### § 3.2 — Eight checks against the same criteria

| # | Check | Zoho Desk answer | Tier required |
|---|---|---|---|
| C1 | Custom inbound + outbound email | YES | All plans (Free works) |
| C2 | Custom portal domain `support.corpflowai.com` | YES — Setup → Organization → Rebranding → Domain Mapping; CNAME to `desk.zoho.com` / `desk.cs.zohost.com`; free SSL after request | **Standard or higher** (Express ambiguous, lean to Standard for safety) |
| C3 | Custom logo, colours, copy | YES | All paid plans; help-centre themes gallery on Standard+ |
| C4 | Remove Zoho branding (portal, email, ticket footer, KB) | **Partial.** Multiple third-party sources note Zoho branding persists in some surfaces unless you pay for full white-label or use Zoho Developer programs. Self-service "remove footer wordmark" is **not as explicit** as Freshdesk's documented behaviour. | Enterprise (multi-brand + full help-centre customisation) for cleanest result; Standard removes portal-name branding but Zoho wordmark may remain in some emails |
| C5 | Plan required | Standard ($14/agent/month) for v1; Enterprise ($40) for cleaner white-label | — |
| C6 | Operate without live chat | YES (chat is a separate add-on / Zoho SalesIQ) | — |
| C7 | Audit / ticket history sufficient for SBM evidence | YES — ticket history exportable, SLA breach reports, CSAT | Standard |
| C8 | Vs Freshdesk | Slightly cheaper at Standard ($14 vs $15); slightly less clean white-label at the same tier. | — |

### § 3.3 — Cost projection (v1)

| Scenario | Agents | Plan | Annual cost |
|---|---|---|---|
| Solo | 1 | Standard | **USD 168 / year** |
| Solo + contractor | 2 | Standard | **USD 336 / year** |
| Solo, cleanest white-label | 1 | Enterprise | USD 480 / year |
| Solo + contractor, cleanest white-label | 2 | Enterprise | USD 960 / year |

### § 3.4 — Zoho Desk risks specific to CorpFlow v1

| # | Risk | Mitigation |
|---|---|---|
| ZR1 | Branding removal less explicit at Standard than Freshdesk Growth. Some third-party reviews report residual Zoho wordmarks. | Operator validation during 15-day trial before paying. If unacceptable, upgrade to Enterprise (USD 480/year) — still cheaper than Freshdesk Enterprise but loses the cost advantage vs Freshdesk Growth. |
| ZR2 | Documentation quality. Setup → Organization → Rebranding is well-documented but third-party walkthroughs (zentegra.com, productgrowth.in) are more polished than Zoho's own. | Use Zoho's official video shorts + product docs as primary; community blogs as secondary. |
| ZR3 | Migration cost if we start on Zoho and move to Freshdesk later (or vice-versa). | CSV export both directions; ticket-history portability is acceptable but breaks ticket-URL continuity. **Pick one and stick with it for at least 12 months.** |
| ZR4 | Same email-routing conflict with n8n + Gmail OAuth as Freshdesk R8. | Same mitigation. |

---

## § 4 — Side-by-side comparison

| Criterion | Freshdesk Growth | Zoho Desk Standard | Verdict |
|---|---|---|---|
| Annual cost (1 agent) | USD 180 | USD 168 | Zoho marginally cheaper |
| Annual cost (2 agents) | USD 360 | USD 336 | Zoho marginally cheaper |
| Free-plan agent count | 2 | **3** | Zoho more generous |
| Custom domain at lowest paid tier | YES (Growth) | YES (Standard, Express ambiguous) | Tie |
| Auto SSL on custom domain | YES (free, automatic) | YES (free, requires SSL request via support ticket) | Freshdesk simpler |
| **Branding removal at lowest paid tier — portal** | **YES — Freshdesk's own help article confirms** | Partial — Zoho wordmark may remain in some surfaces | **Freshdesk wins** |
| **Branding removal at lowest paid tier — emails** | YES — template editor | Partial | **Freshdesk wins** |
| Knowledge base | YES | YES | Tie |
| Live-chat optional / off by default | YES | YES | Tie |
| Ticket history exportable | YES | YES | Tie |
| Documentation quality (official) | Strong, single canonical help-centre | Strong, multi-region docs | Tie |
| Free trial length | 14 days, full feature access | 15 days, full feature access | Tie |
| Data-centre choice (EU available) | YES — chosen at signup | YES — chosen at signup | Tie |
| Compatibility with `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (n8n + Gmail OAuth `support@` already running) | Same coexistence question | Same coexistence question | Tie — resolved in activation packet, not now |
| Brand recognition with vendors / partners (e.g., SBM compliance reviewer) | Slightly higher | Slightly lower | Marginal Freshdesk advantage |

---

## § 5 — Recommended setup steps (NOT executing now — activation packet only)

When Anton authorises the activation packet (separate DECISION), the sequence will be:

1. **Pre-flight (docs-only update of this file):** record final choice (Freshdesk Growth or Zoho Desk Standard), agent count, billing cadence (annual vs monthly), data-centre region (EU recommended), and whether n8n + Gmail OAuth `support@` keeps system-transactional traffic (R8 / ZR4 resolution).
2. **Create account (Anton):** sign up at `freshdesk.com` (or `zoho.com/desk`) using Anton's Mauritius email and CorpFlowAI Ltd legal name (`Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, BRN `C25228280`). Choose EU data centre. **14/15-day free trial — no credit card required.**
3. **Configure portal (Anton + Cursor docs guidance):** Admin → Portals → upload CorpFlowAI logo + favicon, set brand colours to match `lux.corpflowai.com` palette, write portal-name and link-back URL.
4. **Connect email (Anton, mail-host change):** add forwarder on whoever owns `corpflowai.com` mailbox (Google Workspace / Zoho Mail / similar) to forward `support@corpflowai.com` to the Freshdesk-generated inbox. **No DNS change at this step.**
5. **Custom domain (Anton, DNS change — separate go/no-go):** Admin → Portals → Portal URL → enter `support.corpflowai.com`; add the CNAME record returned by Freshdesk in the `corpflowai.com` DNS panel; wait for auto-SSL provisioning (typically < 2 hours).
6. **Trial validation (Anton):** during the 14/15-day trial, verify on the running portal that no Freshdesk/Zoho wordmark appears in: footer of `support.corpflowai.com`, default outbound email to a test address, KB pages, ticket-submission confirmation page. **If branding remains visible at the chosen tier, escalate to higher tier or switch vendor.**
7. **Pay (Anton):** convert trial to paid annual subscription at Growth (Freshdesk) or Standard (Zoho).
8. **Update website copy (small page-compliance-copy PR, Cursor):** add a single visible link in `pages/contact.js` or footer → `https://support.corpflowai.com` next to `support@corpflowai.com`. Update no other copy.
9. **Document in `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (Cursor, docs-only):** add Freshdesk / Zoho Desk as the inbound channel; clarify n8n + Gmail OAuth keeps system-transactional outbound; record evidence shape for SBM compliance.
10. **Verify SBM-compliance fit:** confirm ticket-history export + complaint-handling SLA wording matches what SBM's Web Site Requirements doc + Ref172 §customer-support sections expect.

**Each step from §5.2 onward requires a separate Anton DECISION before Cursor proceeds.** This document does not authorise any of them.

---

## § 6 — Risks (consolidated)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 (Freshdesk) | Outbound deliverability via forwarding mode reads "via freshdesk.com" | Low | Acceptable for warm network; clean up DNS before broad cold outreach. |
| R2 | Vendor pricing changes | Low | Annual billing locks for 12 months; re-evaluate at renewal. |
| R3 | KB SEO competing with `corpflowai.com` SEO | Low | `noindex` or logged-in-only KB v1. |
| R4 | Data residency | Low | Choose EU data centre. |
| R5 | Vendor lock-in | Low | CSV export quarterly. |
| R6 | Freshdesk Free plan does not satisfy v1 branding goal | Low | Budget USD 180–360 / year. |
| R7 | DNS change at activation | Medium | Carefully scope CNAME `support.corpflowai.com` to not affect Vercel apex routing. |
| R8 | Coexistence with n8n + Gmail OAuth `support@` outbound | Medium | Resolve in activation packet — either coexist (system-transactional via Gmail, customer-initiated via Freshdesk) or migrate all to Freshdesk. |
| ZR1 (Zoho) | Branding removal less clean than Freshdesk at lowest tier | Medium-Low | Trial validation; upgrade or switch if not acceptable. |
| ZR2 | Documentation quality slightly weaker | Low | Use official docs as primary. |
| ZR3 | Migration cost between vendors | Medium | Pick one, stick for 12 months. |

---

## § 7 — Recommendation

**Cursor's recommendation: Freshdesk Growth at USD 180–360 / year, EU data centre.**

Reasoning:

1. **Branding removal is explicit at the lowest paid tier.** Freshdesk's own help article confirms portal-footer branding is automatically removed on any paid plan (`Growth+`). Zoho Desk's branding-removal at `Standard` is less explicit per multiple third-party reviews and may require `Enterprise` ($40/agent/month) for the same result — eliminating Zoho's cost advantage.

2. **Custom-domain auto-SSL.** Freshdesk auto-provisions SSL after CNAME verification. Zoho requires a manual "Get SSL" ticket. Lower operator friction.

3. **Cost difference vs Zoho Desk Standard is marginal** (USD 12 / agent / year). For 1–2 agents, the absolute difference is USD 12–24 / year — well within the budget envelope, not worth optimising over white-label quality.

4. **Compatibility with the SBM e-Commerce compliance posture** is identical between the two vendors; both produce ticket-history exports acceptable to SBM. Choose on white-label quality, not on compliance.

5. **Brand recognition.** Freshdesk is more commonly seen in SaaS-vendor inboxes; minor reassurance signal if SBM or Peach Payments compliance reviewers ever inspect.

**Zoho Desk Standard remains the credible backup** if (a) Freshdesk pricing changes adversely before activation, (b) trial validation shows branding-removal not as advertised at Growth tier, or (c) Anton later wants to consolidate with another Zoho One product (CRM, Books, Inventory).

**Do not act on this recommendation yet.** This document is investigation only. A separate DECISION from Anton is required before any account creation, DNS change, or paid subscription.

---

## § 8 — Open questions for Anton (block activation packet)

1. **Q1.** Which vendor — Freshdesk (Cursor's recommendation) or Zoho Desk?
2. **Q2.** Agent count for v1 — 1 (Anton only) or 2 (Anton + contractor)?
3. **Q3.** Data centre region — EU (Cursor's recommendation for GDPR-friendly Mauritius posture) or US?
4. **Q4.** Custom portal subdomain — `support.corpflowai.com` (Cursor's recommendation) or `help.corpflowai.com`?
5. **Q5.** Coexistence with existing n8n + Gmail OAuth `support@` outbound path — keep Gmail for system-transactional + Freshdesk for customer-initiated (Cursor's recommendation), or migrate all outbound to Freshdesk?
6. **Q6.** Billing cadence — annual (Cursor's recommendation, saves ~17%) or monthly?
7. **Q7.** Are there other CorpFlowAI products beyond AI Lead Rescue that should share this support address v1, or should Lead Rescue alone use it for now?
8. **Q8.** Should the activation packet include the small site-copy PR adding a public `support.corpflowai.com` link in `pages/contact.js` + footer, or stage that separately?

Defaults if Anton does not answer:
- Q1 Freshdesk · Q2 1 agent · Q3 EU · Q4 `support.corpflowai.com` · Q5 coexist · Q6 annual · Q7 Lead Rescue only · Q8 include in activation packet.

---

## § 9 — Recommended next PR plan

| Order | PR | Scope | Status |
|---|---|---|---|
| **PR-this** | `docs/support-system-freshdesk-feasibility` | This feasibility doc + JOURNAL row + chat_history sentinel | **Open now (docs-only)** |
| PR-next-1 | Activation packet | Account creation guidance for Anton + DNS-change plan + R8 resolution + site-copy PR for the public portal link | **HELD — requires Anton DECISION on Q1–Q8 + explicit activation approval** |
| PR-next-2 | KB seed packet | First 3 KB articles for AI Lead Rescue (intake, payment, fulfilment) | **HELD — after PR-next-1 lands and portal exists** |
| PR-next-3 | SBM compliance evidence packet | Capture ticket-export sample as evidence for SBM Ref172 §customer-support submission | **HELD — after PR-next-1 lands** |

---

## § 10 — Sources consulted (June 2026)

- Freshworks Support — *Use a custom portal URL and verify DNS* (Freshdesk official docs).
- Freshworks Support — *How do I remove the Freshdesk branding?* (Freshdesk official docs).
- Freshworks Support — *Customizing your customer portal* (Freshdesk official docs).
- Freshworks Support — *Configure Customer Portal Settings* (Freshdesk official docs).
- Freshworks CRM Support — *How can I remove the Freshworks branding from the widget?* (Freshdesk official docs).
- chatsy.app / clearfeed.ai / gorgias.com — Freshdesk pricing analyses (2026 captures of public pricing page).
- eesel.ai — Freshdesk portal customization guide 2026.
- zoho.com/desk/pricing.html — Zoho Desk public pricing page.
- thoughtlogik.com — *Rebranding Zoho Desk Account* (third-party walkthrough).
- zentegra.com — *Zoho Desk Custom Domain Setup Guide* (third-party walkthrough).
- selectsoftwarereviews.com — Zoho Desk expert review 2026.
- productgrowth.in — Zoho Desk Indian-built helpdesk review 2026.

All sources cross-checked; no single source relied on for any plan-tier-required claim. Pricing page captures dated within H1 2026.

---

## § 11 — Change-log

- **2026-06-02 (v1):** Initial feasibility report. Recommendation = Freshdesk Growth; backup = Zoho Desk Standard. No vendor commitments, no DNS changes, no website-copy changes beyond PAY-SBM-2. (`JE-2026-06-02-5`.)
