# SUPPORT-1 — Freshdesk Growth activation plan (proposal only)

**Status:** Proposal only. Docs-only artefact.
**Author:** Assistant (Cursor) on behalf of Anton.
**Date (UTC):** 2026-06-02.
**Trigger:** Anton's DECISION on Operator Bridge issue [#249](https://github.com/antonvdberg-bit/2-command-center/issues/249) (2026-06-02, *"Re: PR #285 — Freshdesk / Zoho Desk feasibility"*) — accepted Freshdesk Growth as the preferred v1 route and locked in answers Q1–Q8, with instruction: *"Prepare a proposal only: `SUPPORT-1 — Freshdesk Growth activation plan`. Activation requires a separate explicit Anton decision."*
**Linked JOURNAL row:** `JE-2026-06-02-6`.
**Linked predecessor:** `JE-2026-06-02-5` (feasibility), `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` (PR #285, merged `45b0426d`).
**Linked comms doc:** `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (existing n8n + Gmail OAuth `support@corpflowai.com` outbound path — must be preserved per Q5 coexistence decision).

This document is a **plan only.** No account is created, no DNS record is added, no payment is made, no email-routing change is performed, no live-chat widget is added, no website-copy change beyond PAY-SBM-2 (`0fd9312b`) is included. Activation requires a separate explicit Anton DECISION.

---

## § 0 — Hard limits and sensitive-data exclusion

Out of scope for THIS packet (proposal):

1. Creating a Freshdesk / Freshworks account.
2. Activating the 21-day free trial.
3. Choosing a Freshdesk billing currency or entering a credit card.
4. Adding any DNS record (CNAME / MX / SPF / DKIM / DMARC / TXT) to `corpflowai.com`.
5. Modifying any mail-host forwarder rule (Gmail, Microsoft 365, or other).
6. Changing the n8n + Gmail OAuth path for `support@corpflowai.com` outbound system-transactional email.
7. Embedding a Freshchat / live-chat widget on any page of `corpflowai.com`, `lux.corpflowai.com`, or any tenant surface.
8. Editing live page copy beyond PAY-SBM-2 (`0fd9312b`).
9. Touching env vars, GitHub Secrets, Vercel env vars, Vercel project settings, GitHub repository settings, Prisma schema, production DB, Telegram bot config, Plausible config, Search Console properties, payment-gateway configuration, ERPNext production settings.

Personal data, beneficial-owner identifiers, banking details, signed forms, and all KYC remain strictly outside the repository — unchanged from PAY-SBM-1 / PAY-SBM-2.

---

## § 1 — Operator decisions locked in (from PR #285 closure DECISION)

| # | Decision | Locked value |
|---|---|---|
| Q1 | Vendor | **Freshdesk** |
| Q2 | Agent count v1 | **1 agent** (Anton) |
| Q3 | Data centre | **EU (EEA)** if available during account setup; fallback US if EU is somehow not offered |
| Q4 | Portal subdomain | **`support.corpflowai.com`** |
| Q5 | Coexistence with n8n + Gmail OAuth | **Coexist for v1.** Do not replace the current `password_reset` outbound path. |
| Q6 | Billing cadence | **Annual**, acceptable at ~USD 180/year for 1 agent on Freshdesk Growth |
| Q7 | v1 scope | **Lead Rescue support only** |
| Q8 | Site-copy PR shape | **Do not bundle** activation with unrelated site-copy. If a portal URL needs to appear publicly, the smallest possible site-copy change. |

---

## § 2 — Account creation steps (Anton performs)

**Note:** Cursor cannot perform these steps. They require Anton's email address, business identity, and trial-acceptance click-through.

### § 2.1 — Pre-flight (Anton)

Have ready:
- Anton's Mauritius operator email (the one Anton wants to be the primary admin email — **not** `support@corpflowai.com`, which becomes the customer-facing channel).
- CorpFlowAI Ltd legal name: `CorpFlowAI Ltd`.
- Registered office: `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`.
- BRN: `C25228280`.
- Business phone: as registered with SBM Bank Mauritius (Anton's choice; not stored in this repo).
- Time-zone preference: **Indian/Mauritius (UTC+4)** for SLA business-hours.
- Browser: clean session (no other Freshworks tab open) to avoid confusion at the data-centre selection step.

### § 2.2 — Sign up at Freshdesk (Anton)

1. Open `https://www.freshworks.com/freshdesk/signup/` in a clean browser tab.
2. Fill in:
   - Your name (Anton's name).
   - Work email (Anton's operator email per § 2.1).
   - Phone (Mauritius mobile or office).
   - Company: `CorpFlowAI Ltd`.
   - Number of employees: `1–10`.
3. **Data centre selection — critical.** Freshdesk currently offers five regions: US, EEA, IND, AU, MEC. Confirm during signup that **EEA (Europe / European Economic Area)** is the chosen region. If the signup UI defaults to US, look for a *Choose region* / *Data location* dropdown before completing signup. If EEA is not visible during signup, stop and contact Anton — Freshdesk data-centre cannot be changed self-service after creation.
4. Choose a sub-domain at signup: `corpflowai.freshdesk.com` (the Freshdesk-issued URL; will be replaced by `support.corpflowai.com` after § 5).
5. Complete email verification (Freshdesk sends a verification email to the operator email used at signup).
6. **Do not enter a credit card.** The 21-day free trial does not require one.
7. After signup, Anton lands on the admin dashboard. The account is on the **trial Pro tier** by default for the trial period; Anton will downgrade to **Growth** at conversion time (§ 8).

### § 2.3 — Confirm data centre after signup (Anton)

1. In Freshdesk admin, open **Account Settings → Account Information**.
2. Verify the *Data Center* row shows **EEA** (or the European equivalent label).
3. If it does not, do not proceed further. Pause and write to `support@freshdesk.com` per Freshdesk's own guidance to initiate a data-centre migration project. **Do not start the EU coexistence configuration until the data centre is confirmed EEA.**

---

## § 3 — EU data centre selection — risk and decision tree

| Outcome | Action |
|---|---|
| EEA selected at signup, confirmed in Account Information | Proceed to § 4 |
| EEA defaulted to US, can be changed in admin within 24 hours | Change in admin; verify, then proceed |
| EEA not offered at signup OR account already in US | Do not proceed with branding / DNS configuration. Contact `support@freshdesk.com` for migration project. Re-engage Cursor only after EEA confirmation. |

**Why this matters:** Once tickets and contacts are persisted in the US data centre, migration to EEA is a vendor-side project, not a self-service toggle. Doing the wrong data-centre at signup leaks v1 ticket data into US data residency, which is a soft fit for a Mauritius-registered company with EU-style data-protection posture (GDPR-style governance is a competitive advantage for international clients).

---

## § 4 — Freshdesk Growth plan confirmation (Anton, post-trial)

The Freshdesk free trial includes **full feature access for 21 days** to all paid-tier capabilities. At the end of the trial:

1. Anton confirms the trial portal looks acceptable (visual check; no Freshdesk wordmark visible on the v1 surfaces — see § 7 / branding).
2. Anton goes to **Admin → Plans and Billing → Switch plan**.
3. Selects product = **Freshdesk** (not Freshdesk Omni; not Freshdesk + Freddy AI Copilot).
4. Selects plan = **Growth**.
5. Enters number of agents = **1** (Q2).
6. Selects billing cycle = **Annual** (Q6).
7. Selects currency. **USD recommended for v1** (matches SBM USD-primary settlement posture; matches Lead Rescue USD 150 pricing). MUR or EUR also acceptable; Anton's choice. If unsure, default USD.
8. Confirms approximate annual total **USD 180** (1 agent × USD 15/month × 12). If Freshdesk surfaces a higher number (e.g., region tax, add-on bundle), **STOP** and verify the line items. Add-ons that should not be on the v1 Growth plan: Freddy AI Copilot (+USD 29/agent/month), Freshchat bundle, Freshcaller bundle.
9. Add credit card / payment method. **Cursor is not involved in this step.**
10. Confirm purchase. Subscription is active.

**Acceptance rule:** Anton may convert the trial to paid only if the annual total is ~USD 180 for 1 agent on Freshdesk Growth (per Q6). Otherwise pause and ask Cursor to re-audit the plan selection.

---

## § 5 — `support@corpflowai.com` inbound + outbound setup (forwarding mode — no DNS change v1)

### § 5.1 — Why forwarding mode for v1

Two reasons forwarding mode is the correct v1 choice:

1. **Preserves `JE-2026-05-22-1` coexistence (Q5 decision).** The existing n8n + Gmail OAuth path sends `password_reset` (live) and 6 other planned events from `support@corpflowai.com`. Adding Freshdesk's DKIM CNAME records to `corpflowai.com` DNS would not strictly conflict, but would require careful SPF coexistence design and a separate Anton DECISION. Forwarding mode requires **no DNS change** at all.
2. **Lower-risk reversibility.** Forwarding mode can be deactivated in 30 seconds by removing the Gmail forwarder rule. DNS rollbacks take 24+ hours to propagate.

### § 5.2 — Cursor draft of the inbound configuration (Anton performs in Freshdesk admin)

In Freshdesk admin:

1. **Admin → Channels → Email**.
2. Click **New support email**.
3. Configure:
   - **Name** (visible to customers in From-header): `CorpFlowAI Support`
   - **Your support email** (the address customers will write to): `support@corpflowai.com`
   - **Group / department** (who handles tickets at this address): `Customer Support` (default group; rename in § 8 if needed)
4. Click **Save**. Freshdesk generates a **long forwarding address** that looks like `corpflowai+xxxxx-xxxxx@inbox.freshdesk.com` (the exact value is unique per setup and never published in this repo).
5. Copy this long forwarding address to a temporary scratch buffer (NOT into the repo — see § 0 hard limit on credentials).
6. Open `support@corpflowai.com` mailbox provider admin (whoever owns the `corpflowai.com` MX records today — Gmail / Google Workspace per current operator setup, or whichever mail host serves the address).
7. Add a forwarding rule:
   - **From:** any incoming message to `support@corpflowai.com`.
   - **To:** the long forwarding address from step 5.
   - **Mode:** *Forward a copy* (Gmail) or equivalent — keep the original copy in Gmail so n8n + the live `password_reset` audit trail are preserved. **Do not** use *Delete after forwarding*.
8. Verify in Freshdesk: send a test email from an external address (Anton's personal Gmail) to `support@corpflowai.com`. Within 1 minute, the test email should appear as a ticket in Freshdesk's Tickets view. If it does not, check Gmail's *Filters and Blocked Addresses* / *Forwarding* panel for the forwarder, and verify the long forwarding address was pasted correctly.

### § 5.3 — Outbound from Freshdesk agents (v1: via Freshdesk mail server, no DNS change)

In v1, when an agent replies to a customer ticket from inside Freshdesk:
- The outbound email is sent via Freshdesk's mail server (in EEA region).
- The **From:** header reads `support@corpflowai.com <reply+xxxxx@freshdesk-mail-server>`.
- The **Sender:** / **Return-Path:** header reads a Freshdesk-owned domain.
- Some email clients (Gmail) display *"via freshdesk.com"* in small grey text next to the sender name.

This is acceptable for warm-network Mauritius launch (Q7 v1 scope = Lead Rescue support only). Cursor recommends deferring DKIM CNAME setup to a future packet (SUPPORT-2 or SUPPORT-DKIM-1) for two reasons:
- DKIM requires DNS changes that intersect with Gmail's SPF for the existing n8n outbound path. SPF coexistence design is non-trivial.
- The cleaner outbound branding is a *nice-to-have*, not a v1 blocker.

### § 5.4 — System-transactional outbound continues unchanged

`password_reset` (live) and the 6 planned events documented in `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 4 continue to send via n8n + Gmail OAuth `support@corpflowai.com`. **Activation must not change this path.**

How they avoid conflict with Freshdesk:
- The n8n + Gmail OAuth send is server-side. It does not write to the Gmail Inbox folder (sent items folder only).
- The Gmail forwarder configured in § 5.2 only forwards incoming messages from the Inbox. Outbound server-side n8n+OAuth sends do not pass through the forwarder.
- Therefore: a customer receives a `password_reset` email from `support@corpflowai.com` via n8n + Gmail OAuth, and that customer's reply (if any) lands in `support@corpflowai.com` Inbox → gets forwarded to Freshdesk → becomes a ticket. **This is the desired behaviour** (reply-handling is now in Freshdesk).

### § 5.5 — Risks specific to this email design

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| E1 | Customer replies to a `password_reset` automated email; reply lands in Freshdesk as a ticket and confuses the operator. | Medium | Reply-To header on `password_reset` already points to `support@corpflowai.com`; ticket appears under "Customer Support" group; operator triages and closes with template "this was an automated email, please open a new ticket if you have a question". |
| E2 | Gmail forwarder loop if Freshdesk's outbound reply email lands back in `support@corpflowai.com` Inbox. | Low | Freshdesk uses unique long forwarding address per ticket; outbound never targets `support@corpflowai.com` as recipient. |
| E3 | Customer sends a message to `support@corpflowai.com` but Gmail's filter labels it as spam → not forwarded → never reaches Freshdesk. | Low-Medium | Whitelist `inbox.freshdesk.com` in Gmail spam filter; periodically check Spam folder (weekly v1 manual review). |
| E4 | Outbound "via freshdesk.com" tag damages first-impression brand for cold international outreach. | Low (Q7 limits v1 to Lead Rescue support, not cold outreach) | Defer DKIM packet until needed. |
| E5 | Freshdesk's auto-acknowledgement template double-fires for system-transactional events that customers somehow reply to. | Low | Configure Freshdesk SLA-policy auto-response to only fire on new tickets (default), not on reply threads. |

---

## § 6 — `support.corpflowai.com` DNS requirements (Anton performs at DNS host, AFTER trial validation in § 7)

### § 6.1 — Records required

**Only one DNS record is required for v1.** No MX, no TXT, no SPF change, no DKIM CNAMEs (DKIM is deferred per § 5.3).

| Type | Name | Value | TTL | Purpose |
|---|---|---|---|---|
| CNAME | `support` | (value Freshdesk generates after Anton enters `support.corpflowai.com` in the Freshdesk portal admin — typically `corpflowai.freshdesk.com` or a Freshdesk-issued CNAME target) | 3600 (1 hour) | Maps `support.corpflowai.com` → Freshdesk portal |

### § 6.2 — Exact steps

1. In Freshdesk admin: **Admin → Portals → Edit (default portal) → Portal URL**.
2. Type `support.corpflowai.com` and click **Save**. Freshdesk generates the CNAME target value.
3. Copy the CNAME target value to a scratch buffer (NOT in repo).
4. Open the `corpflowai.com` DNS panel (whoever hosts DNS today — Cloudflare / Namecheap / Google Domains / etc.). For Cloudflare specifically, **set proxy status = DNS only** (grey cloud, not orange) — Freshdesk requires direct DNS resolution for the SSL provisioning probe.
5. Add a new CNAME record:
   - **Name / Host:** `support`
   - **Target / Value:** the value from step 3.
   - **TTL:** 3600 (1 hour) or auto.
   - **Proxy / Cloud (Cloudflare only):** OFF.
6. Save the record. Allow 5 minutes to 1 hour for DNS to propagate.
7. Return to Freshdesk **Admin → Portals → Portal URL** and click **Verify**. On success, Freshdesk auto-provisions an SSL certificate (free, no operator action). Provisioning typically completes within 2 hours.
8. Once SSL is provisioned, the portal becomes accessible at `https://support.corpflowai.com`. The default `corpflowai.freshdesk.com` URL continues to work; Anton may keep both or disable the Freshworks-issued URL (recommend keep both for fallback).

### § 6.3 — Pre-flight DNS sanity check

Before adding the CNAME, confirm:
- Apex `corpflowai.com` and `www.corpflowai.com` still resolve to the current Vercel A / CNAME — adding a `support` subdomain is independent and must not break apex routing.
- `core.corpflowai.com` (`/api/factory/health`) still resolves to its current Vercel target.
- `lux.corpflowai.com` still resolves to its current Vercel target.
- `aileadrescue.corpflowai.com` still resolves to its current Vercel target.

Spot-check command Anton can run from a Mauritius operator workstation **after** the CNAME is added:

```
nslookup support.corpflowai.com
```

Expected: a CNAME chain ending at a Freshdesk-owned domain. If `nslookup` shows the wrong target, remove the record and re-add.

### § 6.4 — DNS rollback

If anything goes wrong with the CNAME or SSL provisioning:
1. Delete the `support` CNAME record from `corpflowai.com` DNS.
2. Wait 5 minutes to 1 hour for DNS cache to clear.
3. The Freshdesk portal reverts to the Freshworks-issued URL (`corpflowai.freshdesk.com`).
4. No apex / lux / core / aileadrescue impact.

---

## § 7 — Coexistence with existing n8n + Gmail OAuth `support@corpflowai.com` (per Q5)

**Decision (Q5 locked in):** coexist for v1. The activation packet does **not** replace, modify, or interfere with the existing n8n + Gmail OAuth path.

### § 7.1 — Channel separation matrix

| Direction | Path | Sender / route |
|---|---|---|
| **Outbound** — system-transactional (`password_reset` live + 6 planned events per `CORPFLOW_COMMUNICATIONS_V1.md` § 4) | App server → n8n → Gmail OAuth → recipient | `support@corpflowai.com` via Gmail (UNCHANGED in this packet) |
| **Outbound** — agent reply to customer ticket | Freshdesk → Freshdesk mail server → recipient | `support@corpflowai.com` "via freshdesk.com" (NEW in this packet) |
| **Inbound** — customer-initiated email | Customer → `support@corpflowai.com` Gmail Inbox → Gmail forwarder → Freshdesk long forwarding address | Becomes a Freshdesk ticket (NEW in this packet) |
| **Inbound** — customer reply to outbound system-transactional | Customer reply → `support@corpflowai.com` Gmail Inbox → Gmail forwarder → Freshdesk | Becomes a Freshdesk ticket (NEW in this packet) |

### § 7.2 — What this packet does NOT change

- The n8n webhook configuration.
- The Gmail OAuth credentials.
- The `EMAIL_FROM` env var (already `support@corpflowai.com`).
- The `password_reset_delivery_configured` health flag in `/api/factory/health`.
- The `recovery_vault_entries` table or `automation_events` table.
- Any `lib/server/communications.js` API (Phase 2 work; out of scope here).
- Any tenant-side support behaviour (the CMP "Refine the request" chat at `/change` for tenant users is unaffected; tenants have their own support UI).

### § 7.3 — Migration deferred

A future packet (named tentatively SUPPORT-MIGRATION-1) may consolidate all `support@` outbound through Freshdesk and retire the n8n + Gmail OAuth send path. **That packet requires its own DECISION and is explicitly out of scope here.**

---

## § 8 — Branding setup (Anton performs in Freshdesk admin)

### § 8.1 — Portal appearance

1. **Admin → Portals → Edit (default portal) → Portal Settings**:
   - Portal name: `CorpFlowAI Support`
   - Portal URL: `support.corpflowai.com` (per § 6)
   - Default language: English
   - Supported languages: English only v1 (French / Creole can be added later in a separate packet if outreach goes wider)
   - Linkback URL (where the logo click takes the visitor): `https://corpflowai.com/`
2. **Admin → Portals → Edit → Customise portal**:
   - Logo: upload `public/assets/logos/LogoSQBK.png` (or whichever Anton designates as the canonical portal logo — same one used on the public site).
   - Favicon: upload `public/favicon.ico` (or the same square logo at 32×32).
   - Brand colours: match `corpflowai.com` apex palette — Cursor draft:
     - Primary: `#0a0a0a` (apex dark background)
     - Accent: `#7dd3fc` (link blue used on `/about`, `/contact`, `/lead-rescue` per PAY-SBM-2)
     - Text on dark: `#dbe7f5`
   - Font: system default (Inter / Helvetica fallback to match apex).
3. **Admin → Portals → Edit → Manage Sections**:
   - Knowledge base: **ON** (KB seed comes in a future PR-next-2 packet)
   - Community forums: **OFF** (not needed v1)
   - Solution articles: **ON** (will host KB articles)
   - Ticket submission form: **ON** (allows customers to file a ticket via portal in addition to email)
   - New support ticket via portal: **ON**
   - Search bar: **ON**

### § 8.2 — Email template branding

1. **Admin → Email → Email Templates**.
2. Override default templates:
   - **New ticket acknowledgement** (auto-fires when a customer email arrives):
     ```
     Hi {{ticket.requester.firstname}},
     
     Thanks for contacting CorpFlowAI support. We have received your message and aim to respond within two working days (Mauritius business hours, Monday-Friday 09:00-17:00 UTC+4).
     
     Your ticket reference: {{ticket.id}}. You can track the status of your ticket at https://support.corpflowai.com.
     
     For service questions or complaints, this email address is the canonical channel. If your matter is urgent, please reply to this email with "URGENT" in the subject.
     
     CorpFlowAI Ltd · Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius · BRN C25228280
     
     This is an automated acknowledgement. We will follow up with a substantive reply within the SLA.
     ```
   - **Agent reply to ticket**: standard Freshdesk template; ensure footer contains the merchant identity line above for SBM Ref172 compliance.
   - **Ticket resolved**: standard template; include a one-line CSAT-survey link if enabled (optional v1).
3. Remove the default "Powered by Freshdesk" footer (already auto-removed at Growth tier per `JE-2026-06-02-5` § 2.2 C4).

### § 8.3 — Sender alias verification

Confirm that Freshdesk-issued outbound emails carry **From: `CorpFlowAI Support <support@corpflowai.com>`** — not the Freshdesk-default `<noreply@yourcompany.freshdesk.com>`.

If the From: header is wrong, return to **Admin → Channels → Email → support@corpflowai.com → Edit → Reply-from address** and set it explicitly to `support@corpflowai.com`.

---

## § 9 — Ticket categories (Cursor draft, Anton confirms)

Lead Rescue v1 expected support volume is modest (per Q7 scope). Five categories cover the support surface comfortably:

| # | Category | Use when |
|---|---|---|
| 1 | **Pre-purchase enquiry** | Customer is exploring Lead Rescue, has not yet submitted intake |
| 2 | **Intake / qualification** | Intake submitted, customer asks about review timeline or status |
| 3 | **Payment & invoicing** | Payment-link / SBM wire / invoice question, refund request |
| 4 | **Setup & onboarding** | During the 48-hour setup window or 5-business-day soft-cap |
| 5 | **Live pilot — operations** | Routing rules, lead-list cadence, Plausible / WhatsApp issues during the running pilot |
| 6 | **Complaint / escalation** | Customer expresses dissatisfaction or escalates |
| 7 | **Other** | Anything that does not fit |

Configure in **Admin → Ticket Fields → Type** (or whichever Freshdesk version-specific field name is used for category).

### § 9.1 — Tags (optional v1)

Auto-applicable tags on ticket creation:
- `lead-rescue` (all v1 tickets — Q7 scope)
- `mauritius-pilot` (warm-network outreach tickets — applied manually by operator)
- `sbm-evidence` (tickets that should be exported for SBM compliance review — applied manually by operator)
- `payment-related` (any payment / invoice question — applied manually for finance audit)

---

## § 10 — 2-working-day acknowledgement workflow

### § 10.1 — Public-facing wording (already live, PAY-SBM-2 `0fd9312b`)

The following copy is already on production and must remain consistent with the Freshdesk SLA:

- `pages/contact.js`: *"We acknowledge messages within two working days for routine queries and within one business day during active pilot windows."*
- `components/PublicSiteFooter.js`: *"Service questions: support@corpflowai.com (acknowledged within two working days)."*
- `components/AiLeadRescueLanding.js`: *"Service questions: support@corpflowai.com (acknowledged within two working days)."*

### § 10.2 — Freshdesk SLA policy configuration

1. **Admin → SLA Policies → Default SLA Policy → Edit**.
2. Configure SLA targets for v1:
   - **First response time** — within **2 business days** (per public wording).
   - **Resolution time** — within **10 business days** (generous v1 target).
   - **Priority**: only "Medium" used v1; do not differentiate Low/High/Urgent yet.
3. Business hours:
   - **Admin → Business Hours → Default Business Hours → Edit**.
   - Time zone: **Indian/Mauritius (UTC+4)**.
   - Working days: Monday–Friday.
   - Working hours: 09:00 – 17:00 UTC+4.
   - Holidays: configure 2026 Mauritius public holidays (Independence Day, Eid, Diwali, Christmas, etc.) — Anton decides on the full list.

### § 10.3 — Auto-acknowledgement on ticket creation

The email template in § 8.2 fires automatically. SLA timer starts at ticket-creation timestamp. Freshdesk surfaces an SLA-breach warning at 75% of the response window (i.e., at ~1.5 working days) and a breach alert at 100% (2 working days).

### § 10.4 — Active-pilot variant (1 business day)

Anton's public commitment is **1 business day during active pilot windows**. v1 implementation: Anton manually flips the ticket priority from Medium to High on tickets tagged `mauritius-pilot` (or whichever active pilot tag), and Freshdesk's High priority SLA can be configured to first-response = 1 business day. Cleaner automation (auto-bumping priority based on tag) is a v1.1 enhancement, not in this packet.

---

## § 11 — SBM evidence / use case

### § 11.1 — Why this matters

SBM e-Commerce application form Ref172 § *customer support* + § *complaints* require evidence that the merchant operates a real customer-support channel. Per `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` § 2 (G6, G7) and § 5 (DRAFT customer-support process), CorpFlowAI's commitment is:
- 2-business-day acknowledgement (now SLA-backed in Freshdesk per § 10).
- 1-business-day during active pilots (now manual priority bump per § 10.4).
- Channel of record: `support@corpflowai.com`.
- Complaints handled with written acknowledgement → resolution / partial refund / written explanation → founder review on escalation.

### § 11.2 — Evidence shape for SBM submission

Once Freshdesk is activated:

1. **Anonymised sample ticket export** — pick 1–3 closed tickets representative of the support process; export from Freshdesk **Tickets → Filter → Export to CSV**.
2. **Anonymise** before sharing with SBM:
   - Replace customer email with `[CUSTOMER_REDACTED]`.
   - Replace customer name with `[NAME_REDACTED]`.
   - Keep ticket timestamps, status transitions, agent reply timestamps, resolution category.
3. **Do not commit the export to this repo.** Store in Anton's local SBM-submission folder (outside `corpflow-ai-command-center`), same posture as the rest of the SBM application materials.
4. The Web Site Requirements form attestation (Ref176 / equivalent) can reference: *"Customer support is operated through a dedicated helpdesk system (Freshdesk). The support channel is `support@corpflowai.com`. Acknowledgement SLA: 2 working days (1 working day during active pilots). Each customer interaction is logged in the helpdesk with a unique ticket ID, timestamp, status transitions, and agent reply audit trail. CSV evidence available on request."*

### § 11.3 — Quarterly SBM evidence review

Anton's standing task: every calendar quarter, export the last 90 days of tickets to CSV → anonymise → review for compliance posture → archive locally with a 7-year retention period (matches typical SBM merchant-agreement retention).

---

## § 12 — Rollback plan

### § 12.1 — At any stage before § 6 (DNS change)

Trivial rollback:
- Cancel the Freshdesk trial (let it lapse — 21 days, no card on file = auto-cancel).
- Remove the Gmail forwarder rule for `support@corpflowai.com`.
- All ticket history is forfeit; no DNS impact; no public-site impact.

### § 12.2 — After § 6 (DNS change made) but before § 4 (paid conversion)

- Remove the `support` CNAME from `corpflowai.com` DNS.
- Wait up to 1 hour for DNS cache.
- Remove the Gmail forwarder rule.
- Cancel the Freshdesk trial.
- All ticket history is forfeit; no public-site impact.

### § 12.3 — After § 4 (paid conversion)

Two options:

**A. Soft pause:**
- Disable inbound forwarding (Gmail).
- Leave Freshdesk subscription active (USD 180/year sunk cost) for 12 months in case re-activation is wanted.
- No DNS change needed.

**B. Full cancel:**
- Export all ticket history to CSV (compliance retention).
- Remove the `support` CNAME from DNS (5-minute change at DNS host).
- Cancel Freshdesk subscription at the end of the current billing period.
- Remove the Gmail forwarder rule.
- The system-transactional n8n + Gmail OAuth path is unaffected throughout — it never touched Freshdesk.

### § 12.4 — Worst-case email-routing rollback

If a customer reports inbox-loop or broken delivery during or after activation:
1. **Immediate (60 seconds):** Disable the Gmail forwarder rule.
2. **Verify:** Send a test email from an external address to `support@corpflowai.com`; confirm it lands in Gmail Inbox normally.
3. **Diagnose:** Check Freshdesk Tickets → Recent for the test message. If the forwarder was disabled in step 1, expect no new ticket — confirms the forwarder was the failure surface.
4. **Re-enable carefully:** Once root cause is identified, re-add the forwarder with the correct long forwarding address.

No DNS change is required in this rollback because the DNS only governs the `support.corpflowai.com` portal page, not the inbound email path.

---

## § 13 — Exact operator actions Anton must perform (consolidated)

Numbered for tracking; each step is the operator's responsibility. Cursor is read-only beyond producing this plan and (later) reviewing evidence.

| # | Step | Where | Reversibility |
|---|---|---|---|
| A1 | Sign up at `freshdesk.com/signup`, select **EEA** data centre | Freshdesk web | Cancel trial = full rollback |
| A2 | Verify Account Information → Data Center = EEA | Freshdesk admin | Stop here if not EEA; contact Freshdesk support |
| A3 | Configure inbound email `support@corpflowai.com` in Admin → Channels → Email | Freshdesk admin | Delete email channel = full rollback |
| A4 | Copy Freshdesk-generated long forwarding address (scratch buffer, NOT repo) | Freshdesk admin | n/a |
| A5 | Add Gmail forwarder for `support@corpflowai.com` → long forwarding address (mode: *forward a copy*) | Gmail admin | Disable forwarder = full inbound rollback (60 sec) |
| A6 | Send test email from personal address to `support@corpflowai.com`; confirm ticket appears in Freshdesk | Manual test | n/a |
| A7 | Configure portal branding (§ 8.1): logo, favicon, colours, portal name, linkback | Freshdesk admin | Replace assets / revert |
| A8 | Override email templates (§ 8.2) — new-ticket acknowledgement + agent-reply footer | Freshdesk admin | Revert to Freshdesk defaults |
| A9 | Configure 5–7 ticket categories (§ 9) | Freshdesk admin | Edit / delete categories |
| A10 | Configure SLA policy + business hours (§ 10.2) | Freshdesk admin | Edit / revert |
| A11 | Configure 21-day trial period — visual review of portal during trial | Freshdesk admin + browser | Trial auto-expires |
| A12 | Add `support` CNAME at `corpflowai.com` DNS host | DNS host UI | Remove record = full rollback (~1 hr) |
| A13 | Verify `support.corpflowai.com` portal is reachable + SSL provisioned | Browser | n/a |
| A14 | Convert trial to paid Growth plan, 1 agent, annual, ~USD 180 | Freshdesk admin + payment | Cancel subscription |
| A15 | Capture 1 anonymised sample ticket CSV for SBM evidence (local file, NOT repo) | Freshdesk export | n/a |
| A16 | Notify Cursor that activation is complete; Cursor opens the small site-copy PR (§ 14) to expose the portal link publicly | Operator Bridge #249 | n/a |

---

## § 14 — Small site-copy PR (per Q8)

Anton's Q8 decision: do not bundle activation with unrelated site-copy. If a support-portal URL needs to appear publicly, propose the smallest possible site-copy change.

### § 14.1 — Minimum change

After A16 (Anton confirms activation), Cursor opens a **separate small PR** with two-line edits:

- `pages/contact.js` — extend the "Customer support and complaints" section with:
  > *"You can also reach us through our support portal at https://support.corpflowai.com."*
- `components/PublicSiteFooter.js` — extend the merchant-identity line:
  > *"Service questions: [support@corpflowai.com](mailto:support@corpflowai.com) or [support.corpflowai.com](https://support.corpflowai.com) (acknowledged within two working days)."*

**No other files change.** No copy on `/lead-rescue`, `/about`, `/terms`, `/privacy`, `/refund-policy`, `/standards`, `/process`, or `/onboarding` is touched.

### § 14.2 — Decision token

The small site-copy PR is **HELD** until Anton's A16 confirmation. Cursor does not open it on the back of this activation plan. A separate Anton DECISION is required at that moment.

---

## § 15 — Acceptance criteria (gate the activation execution)

Before Anton authorises Cursor to assist with any post-activation step (template wording, KB seed, SBM evidence shaping, etc.):

| # | Criterion | Pass condition |
|---|---|---|
| AC1 | Account region | Freshdesk admin shows Data Center = EEA |
| AC2 | Plan | Subscription = Freshdesk Growth (NOT Pro, NOT Enterprise, NOT Omni) |
| AC3 | Agents | 1 agent provisioned (Q2) |
| AC4 | Billing | Annual cycle, total ~USD 180 (Q6) |
| AC5 | Inbound | Test email to `support@corpflowai.com` becomes a Freshdesk ticket within 1 minute |
| AC6 | n8n + Gmail OAuth preserved | `/api/factory/health` still returns `password_reset_delivery_configured: true`; a test `POST /api/auth/password-reset/request` still triggers an email via n8n + Gmail (not via Freshdesk) |
| AC7 | Portal URL | `https://support.corpflowai.com` returns 200 with CorpFlowAI logo + brand colours; no Freshdesk wordmark in the footer |
| AC8 | SLA | Default SLA policy = 2 business days first response; business hours = Mauritius UTC+4 09:00–17:00 |
| AC9 | Auto-acknowledgement template | Contains the merchant identity line + 2-working-day SLA wording + ticket reference link |
| AC10 | No card-scheme logos | No Visa/Mastercard/UPI/JCB/Alipay anywhere on the portal |
| AC11 | No live-payment overclaim | No "Pay now" / "instant checkout" / "online card payment available" / "SBM gateway is live" on the portal |
| AC12 | No live-chat widget | No widget embedded on `corpflowai.com`, `lux.corpflowai.com`, or any tenant surface |
| AC13 | Apex / Lux / factory health regression | `/`, `/lead-rescue`, `lux.corpflowai.com/`, `/api/factory/health` all return 200 after the `support` CNAME is added |

---

## § 16 — Open questions for Anton (block the activation packet)

Cursor recommends Anton answer these before the activation execution. Defaults provided where Cursor's recommendation is clear.

| # | Question | Default if unanswered |
|---|---|---|
| Q9 | Logo file for the portal — use `public/assets/logos/LogoSQBK.png` (existing) or a different file Anton supplies? | LogoSQBK.png |
| Q10 | Portal brand colours — match apex (`#0a0a0a` + `#7dd3fc`) or Lux (different) or a third Cursor-proposed palette? | Match apex |
| Q11 | Knowledge base v1 — enabled at activation, or wait for SUPPORT-2 KB-seed packet? | Wait — open KB shell, no published articles at activation |
| Q12 | Business hours — confirm Mauritius UTC+4 Mon–Fri 09:00–17:00? Or different? | Mon–Fri 09:00–17:00 UTC+4 |
| Q13 | 2026 Mauritius public holidays list — Anton supplies, or Cursor drafts from a reputable source? | Cursor drafts; Anton confirms |
| Q14 | Ticket categories — confirm 5–7 categories in § 9, or a different cut? | § 9 list as drafted |
| Q15 | Currency on Freshdesk subscription — USD (recommended), MUR, or EUR? | USD |
| Q16 | Optional CSAT survey — enabled or disabled v1? | Disabled v1 (Cursor recommendation: skip until first 10 tickets are handled, then evaluate) |

---

## § 17 — ANTON TO-DO (high-level checklist before authorising execution)

1. Read this plan end-to-end. Flag anything that does not match expectations.
2. Answer Q9–Q16 above (or accept the defaults).
3. Confirm the Gmail / mailbox host that currently owns `support@corpflowai.com` (so § 5.2 step 6 is clear).
4. Confirm the DNS host for `corpflowai.com` (so § 6.2 step 4 is clear).
5. Decide whether to start trial-only first (no payment, 21 days) and evaluate before paying, OR sign up + pay annual upfront. **Cursor recommendation: trial-only first.**
6. Decide whether to allow Cursor to draft the auto-acknowledgement template wording further (or finalize as-is in § 8.2).
7. When ready, post a fresh DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) titled *"AUTHORISE — Freshdesk Growth activation"* with explicit go for A1–A14 (or a subset).

---

## § 18 — Standing holds (unchanged by this packet)

Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB signing.

**Holds explicitly maintained by this plan:**
- Freshdesk account creation — Anton-authored, not Cursor.
- Trial activation — Anton authorises.
- Paid plan conversion — Anton authorises.
- DNS `support` CNAME — Anton authorises (separate go/no-go at A12).
- DKIM / SPF DNS changes — DEFERRED to a future SUPPORT-DKIM-1 packet. Out of scope here.
- Live-chat widget — never v1.
- AI chatbot — never v1.
- Migration of n8n + Gmail OAuth `support@` outbound to Freshdesk — DEFERRED to a future SUPPORT-MIGRATION-1 packet. Out of scope here.
- Public site-copy adding the portal URL — DEFERRED to a separate small PR after A16, per Q8.

---

## § 19 — Hard limits honoured

Zero Freshdesk / Freshworks account creation; zero trial activation; zero credit card entered; zero CNAME / MX / SPF / DKIM / DMARC change to `corpflowai.com`; zero email forwarder modified; zero live-chat widget installed; zero website-copy change beyond PAY-SBM-2 (`0fd9312b`); zero modification of n8n + Gmail OAuth path; zero env vars / GitHub Secrets / Vercel env vars / Vercel settings / GitHub settings / Prisma schema / production DB / Telegram / Plausible / Search Console / payment gateway / ERPNext production setting touched.

Personal data, banking details, KYC documents, signed forms, beneficial-owner identifiers — none committed to this repo.

---

## § 20 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE** at PR merge (no customer-visible URL to probe by design; activation execution is a separate Anton-authored process). The verdict for the live activation execution is determined separately by Anton's post-activation evidence per § 15 acceptance criteria.

---

## § 21 — Cross-references

- `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` (PR #285, merged `45b0426d`) — feasibility predecessor.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — existing comms framework; the n8n + Gmail OAuth `support@` path that this packet must preserve.
- `docs/n8n/password-reset-email-recipe.md` — the live wire-level recipe; unaffected.
- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (PR #283, merged `aa64db78`) — § 5 customer-support process drafts; § 2 G1–G9 gap list.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` — sets the payment-route reality this support system serves.
- PAY-SBM-2 page-compliance copy (PR #284, merged `0fd9312b`) — the live public 2-working-day SLA wording the Freshdesk SLA must match.
- `JE-2026-05-22-1` — comms v1 sender alias policy.
- `JE-2026-06-02-5` — feasibility decision.
- `JE-2026-06-02-6` — this activation plan.
- `.cursor/rules/security-sensitive-changes.mdc` — applies to A3–A14 (email channel changes), even though no env vars / secrets are in this packet.
- `.cursor/rules/predeploy-decision-checks.mdc` — applies to A12 (DNS change) when the activation executes.

---

## § 22 — Change-log

- **2026-06-02 (v1):** Initial activation-plan proposal. 16 numbered operator actions A1–A16, 13 acceptance criteria AC1–AC13, 8 open questions Q9–Q16 with defaults, ticket-category cut, SLA-policy spec, branding spec referencing existing `public/assets/logos/LogoSQBK.png`, 21-day-trial-first path, SBM evidence shape, full rollback ladder, n8n + Gmail OAuth preservation guarantees. (`JE-2026-06-02-6`.)
