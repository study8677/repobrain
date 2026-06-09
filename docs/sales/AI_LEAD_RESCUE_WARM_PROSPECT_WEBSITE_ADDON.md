# AI Lead Rescue — Warm Prospect Website Add-On

**Audience:** the operator handling a single warm prospect who may want AI Lead Rescue and may also need a simple website built (or rebuilt) so the pilot has a proper capture surface.

**Status:** Sales-side reference. Docs-only — no runtime, no schema, no env vars, no deploy config, no paid-ads positioning.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON_V1 -->`

<!-- AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON_V1 -->

## 1. Purpose

This document covers the **rare** case where a warm prospect for AI Lead Rescue needs a simple website built (or rebuilt) so the pilot has somewhere to capture enquiries from. It is **not** a generic web design service offer. It is a tightly scoped lead-capture surface, sold *alongside* AI Lead Rescue, owned by the buyer, operator-built, and deliberately bounded so it cannot become a custom-website rabbit hole.

The default offer remains AI Lead Rescue alone (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`). The website add-on is offered only when a warm prospect cannot run AI Lead Rescue without a working capture surface, and only when the operator is willing to ship a 1–3 page site under the constraints in this doc.

If a prospect wants a *real* website project (multi-page marketing site, branded design system, e-commerce, booking engine, membership portal), the right answer is **decline politely and refer out** — see § 13.

## 2. When to offer AI Lead Rescue only

Default to *AI Lead Rescue only* when **all** of the following are true:

- The prospect **already has a working website** with a contact form / WhatsApp button / email button — i.e. an existing capture surface we can plug into.
- The prospect **already has a working email address** and a working WhatsApp number.
- The prospect's enquiries **already arrive somewhere** (Property24 inbox, Facebook page, WhatsApp Business, existing form-handler) — even if the follow-up is broken.
- The prospect is **not** asking us to build their website. They are asking us to fix the lead-response leak.

In that case the offer is the standard `https://corpflowai.com/lead-rescue` pilot — USD 150, 48-hour managed setup, 7-day monitoring window, manual pro-forma after intake review (`docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`). No website work attached.

Most warm prospects fall here. **Do not invent the website add-on** when the pilot alone is sufficient.

## 3. When to offer Lead-ready website + AI Lead Rescue

Offer the combined package only when **all** of the following are true:

- The prospect has **no working website**, or the website they have is broken / unreachable / does not collect enquiries.
- The prospect has a **clear single offer** they sell (one service, or a tightly bounded short list of services) that fits on a 1–3 page site.
- The prospect can **provide copy-grade source material** (existing flyer, brochure, social bio) inside one week, or accept operator-drafted copy reviewed by them.
- The prospect **owns a domain** they can point to the new site (or accepts that we will register / configure one inside scope; see § 4 hosting / domain notes).
- The prospect understands and has agreed *in writing* (WhatsApp / email is sufficient) that:
  - the site is **a capture surface for AI Lead Rescue**, not a custom marketing site,
  - the scope is **1–3 pages**, not unlimited pages,
  - the visual treatment is **simple and on-brand**, not a full brand identity,
  - revisions are **bounded** (see § 5 / § 9), not unlimited.
- The operator has **3–5 contiguous business days** of capacity to build the site, then run the standard AI Lead Rescue 48-hour setup window after the site is live.

If any of those is missing — particularly the *clear single offer* and the *bounded revisions* understanding — **decline the website portion** and offer AI Lead Rescue only on whatever capture surface they have. A scope-confused website project is the fastest way to lose money on the offer.

## 4. What is included in a simple lead-ready website

The lead-ready website is a deliberately small static / lightly-dynamic site whose only job is to **convert a visitor into an enquiry that AI Lead Rescue can capture**. The included scope is fixed:

| Item | What "done" means |
|---|---|
| **1–3 pages** | One page (Home only) **or** up to three pages (Home + Services + Contact). Operator picks the shape with the buyer in discovery. No hidden fourth page. |
| **Mobile-friendly layout** | Renders cleanly on a typical phone (iPhone-class width and Android mid-range), no horizontal scroll, tap targets at minimum 44 px. Tested on at least one real iOS and one real Android device before hand-over. |
| **One enquiry form** | A short form (name + contact + one-line message) that submits into the AI Lead Rescue intake handler — the same handler that powers `https://corpflowai.com/lead-rescue`. Submissions emit the `corpflow.lead_rescue.intake_received` automation event so the standard operator alert + Activity Log workflow runs end-to-end. |
| **Call / WhatsApp button** | A persistent header / hero button that opens a `tel:` dialer **and** a separate `https://wa.me/<number>` deep link to the buyer's WhatsApp Business number. Both fire on mobile; on desktop the call button is a copy-on-click. |
| **Basic service copy** | Hero headline + sub + 3–5 bullets describing the offer + a short "how it works" or "what we do" block. Operator-drafted from the buyer's existing material; buyer reviews. **Not** ghost-written long-form blog content. |
| **Simple contact section** | Address (if relevant), business hours (if relevant), email link, WhatsApp link, embedded Google Maps `iframe` if the buyer is a physical business (e.g. clinic, contractor shop). |
| **Connection into AI Lead Rescue workflow** | Form posts into the same intake endpoint; Telegram alert fires for the operator on every new enquiry; the buyer-shared Google Sheet is configured per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 5; daily summary is wired per § 6 of the same doc. |

### Implementation defaults (operator-side decisions, not buyer menu)

- **Stack.** A Next.js page deployed on Vercel under a CorpFlow-managed sub-route or a buyer-owned domain pointed at Vercel. *Or* a deliberately simple static site on a managed host (Webflow / Carrd / Framer) if the buyer prefers self-management later. The operator picks one based on what makes hand-over cleanest for the buyer; **the buyer does not choose the stack on the call**.
- **Domain ownership.** Buyer-owned. If the buyer does not have a domain, operator helps them register one through a registrar of the buyer's choice (Namecheap / Google Domains / local Mauritius registrar). **Operator does not register domains in operator's own name** — domain stays in buyer's account from day 1 to avoid hand-over disputes later.
- **Hosting.** Operator-managed during the pilot window via the operator's Vercel account *or* the buyer's own host if they already have one. Hand-over of hosting is part of the *Future enhancement* path (§ 13), not the pilot.
- **Analytics.** Plausible (privacy-friendly) per `docs/analytics/CORPFLOW_ANALYTICS_V1.md`, configured by the operator. No Google Analytics by default. No Meta Pixel by default — paid-ads tracking is out of doctrine for first paid pilots (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13).
- **Brand.** Buyer's existing logo (if they have one) + brand colour. **No** new logo design, **no** new brand identity work.

## 5. What is excluded

The following are **explicitly out of scope** for the lead-ready website add-on. If the prospect asks for any of these, the right answer is *"that is a different shape from this offer — let me decline cleanly rather than overpromise"*. Decline politely; refer to a generalist agency (§ 13) or quote a separate engagement (§ 9 *Custom build* path).

| Out-of-scope | Why it is out |
|---|---|
| **E-commerce** | Cart, checkout, product catalogue, inventory, Stripe/PayPal integration, shipping rules. Out of pilot scope. CorpFlowAI is not a Shopify / WooCommerce shop. |
| **Booking engine** | Calendly-style scheduling, real-time availability, payment-on-booking, multi-resource calendars. Out of scope. (Calendly link in a button is fine; building a booking engine is not.) |
| **Custom CRM** | Deal pipelines, contact databases, multi-user permissioning, sales reporting. Doctrine: AI Lead Rescue is not a CRM (`docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` row 28). |
| **Membership portal** | User registration, gated content, account dashboards, subscription management. Out of scope. |
| **Complex integrations** | API integrations to third-party systems beyond the AI Lead Rescue intake handler (HubSpot / Salesforce / Pipedrive / Mailchimp / Zapier / Make.com / etc.). Custom build path only — separate quote. |
| **Paid ads** | Meta / Google / LinkedIn ad campaigns, ad-creative production, ad-budget management, conversion-pixel work. Forbidden by doctrine in the first-paid-pilots window (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13). |
| **Full brand identity** | Logo design, brand guidelines, colour-system development, typography selection beyond a single legible default, brand voice work. The website uses the buyer's existing brand assets; new brand identity is a separate engagement. |
| **Unlimited revisions** | One round of structured revisions is included (see § 9). Beyond that, additional rounds are billable per § 9. The *unlimited revisions* failure mode is precisely how cheap web-design jobs become unprofitable; we explicitly do not run that risk. |
| **SEO retainer** | Long-form blog, technical SEO audits, link-building, monthly SEO reporting. The site ships SEO-clean (titles, meta, sitemap, robots.txt) but **ongoing SEO is a separate offer**, not bundled. |
| **Translation / multilingual site** | English-only by default. French / Mauritian Creole versions of the page are a quick add-on per `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` row 21 — not bundled. |
| **Email / domain hosting** | Operator does not run the buyer's email or domain hosting beyond the pilot window. The buyer owns the domain in their registrar and points DNS at the chosen host. |
| **Photography / illustration commissions** | Stock images licensed by the buyer or operator-provided placeholder visuals only. No paid commissions inside the pilot fee. |
| **24/7 site uptime SLA** | Pilot-window operator availability is the buyer-confirmed timezone working hours per `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 2.1. No 24/7 uptime SLA. |

If a prospect insists on any of the above as part of the offer, **decline the project**. The operator's brand discipline depends on never accepting an off-doctrine engagement under pricing pressure.

## 6. Discovery questions for the warm prospect

Use the standard 15-minute discovery script (`docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`) for the AI Lead Rescue qualification, then add the following website-specific questions. Limit the website discovery to **10 minutes** — anything longer means the project is too big for this offer.

### 6.1 Existing-website questions

1. **Do you have a website today?** *Yes / No / Sort of (broken / out-of-date).*
2. **If yes, what is the URL?** Open it on phone + desktop while you talk. Note: does the contact form work? Does the WhatsApp button work? Is mobile usable?
3. **If yes, who built it and who can edit it today?** *(Self / a freelancer they can reach / a freelancer they cannot reach / a previous in-house person.)*
4. **If yes, do you control the domain?** *(I.e. can you log into the registrar and change DNS.)*

### 6.2 Offer / content questions

5. **In one sentence, what do you sell?** Buyer's own words. If they cannot answer in one sentence, the project is not yet ready — see § 13.
6. **Who is your buyer?** One sentence. Geography, decision-maker role, typical price band.
7. **What 3 things do you most want a visitor to know in the first 5 seconds on your page?**
8. **What is the one action you want a visitor to take?** *(Submit the form / call / WhatsApp / book a viewing / request a quote.)* If they say *"all of them equally"*, refer them to the AI Lead Rescue brand-doctrine line: one primary conversion goal per page.

### 6.3 Operational questions

9. **What is your working WhatsApp number for enquiries?** Confirm it is a number they actively read.
10. **What is your working email for enquiries?**
11. **Do you have any existing material we can reuse?** *(Flyer / brochure / Facebook page bio / portfolio photos.)* Operator confirms file-sharing channel — Google Drive / WhatsApp / email.
12. **What is the volume of enquiries you handle today, roughly per week?** Sizing — fits the same `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` § 3 Q5 guidance.

### 6.4 Timeline / scope questions

13. **When do you want the site live?** Operator names a realistic 3–5 business day build window for the website + 48 hours for the AI Lead Rescue setup. **Reject** the *"this Friday"* asks if it is already Wednesday — slip honestly per the brand-doctrine line.
14. **Do you have a fixed budget for the site, or are we discussing options?** This is the only direct money question on the call. Use the answer to pick Option A or Option B in § 7 / § 8.
15. **Are you the decision-maker for the budget, or is someone else?** If someone else, get the conversation onto a call with that person before quoting.

### 6.5 Red-flag answers (decline cues)

If the buyer answers *"yes"* to any of the following, the offer is **not a fit**:

- *"I want a really beautiful site that wins design awards."* — wrong offer.
- *"I want to sell products online from this site."* — out of scope (e-commerce).
- *"I need a member login area for my customers."* — out of scope (membership).
- *"I want to integrate it with my existing CRM."* — custom build path, not pilot scope.
- *"I want unlimited revisions until I am happy."* — out of scope (revisions are bounded).
- *"I want it ready by tomorrow."* — operator capacity is a hard constraint.

Decline politely on any of these. The script for declining is in § 13.

## 7. Option A proposal: AI Lead Rescue only

Use this when the prospect has a working capture surface (per § 2). This is the canonical offer.

```text
Option A — AI Lead Rescue Setup (launch pilot)

What we deliver:

- 48-hour managed setup of one of your existing enquiry
  channels (website form / WhatsApp Business / Facebook DMs /
  email forward — we agree which one in your intake review).
- Operator-side Telegram alert per new enquiry.
- Buyer-shared Google Sheet with a daily lead log.
- Daily summary to your WhatsApp + email at the time you
  choose, for 7 days.
- Five-status follow-up board on the Sheet (new / replied /
  followed-up / qualified / won-or-lost).
- Operator availability during your local working hours for
  the 7-day monitoring window.

What we do not deliver:

- A new website (you already have a working capture surface).
- Customer-facing automated replies.
- A CRM. Bulk outbound. Paid ads. Any guaranteed-revenue
  promise.

Investment: USD 150 launch pilot, one-time. Invoiced after
intake review. Manual wire transfer through SBM Bank
Mauritius for warm-network buyers (or international wire,
USD invoice). No card on the public page.

Timeline: setup window starts when payment lands in our
account. 48 hours of managed setup. 7 days of monitoring.
End-of-pilot recap on day 7; nothing auto-renews.

Next step: fill the intake at https://corpflowai.com/lead-rescue
and we will come back within 2 business hours with the
pro-forma invoice.
```

## 8. Option B proposal: Lead-ready website + AI Lead Rescue

Use this when § 3 conditions are all met.

```text
Option B — Lead-ready website + AI Lead Rescue (launch pilot)

What we deliver:

Part 1 — Lead-ready website (3-5 business days)
- 1 to 3 pages (Home, optionally Services, optionally
  Contact). We agree which on the discovery call — not after
  the project starts.
- Mobile-friendly layout (renders cleanly on iPhone- and
  Android-class phones, no horizontal scroll).
- One enquiry form that posts directly into the AI Lead
  Rescue intake handler (so every form submission already
  fires your operator alerts on day one).
- A persistent header button for Call + WhatsApp.
- Hero copy + 3-5 service bullets + a short "how it works"
  block. We draft from your existing material; you review.
- Simple contact section (address, hours, email, WhatsApp,
  embedded map if you are a physical business).
- Privacy-friendly analytics (Plausible) so you can see
  visitor numbers without Google Analytics.
- One round of structured revisions on the draft before
  go-live.

Part 2 — AI Lead Rescue (48-hour managed setup, 7-day pilot)
- Same scope as Option A, plus we connect the new website
  form as your primary lead source on day one.

What we do not deliver (please read this list — it is the
single biggest reason these projects go wrong):

- E-commerce. Booking engines. CRM rebuilds. Membership
  portals. Complex third-party integrations.
- Paid ads. Full brand identity work. New logo design.
- Unlimited revisions. SEO retainer. Multilingual versions
  (English-only by default; French / Creole versions are a
  separate quick add-on after launch).
- Customer-facing automated replies in any language.

Investment: see the band in the discovery call. Manual
pro-forma invoice; no card on the public page. SBM wire
transfer for warm-network buyers; international USD wire
otherwise.

Timeline:
- Day 0: pro-forma sent within 2 business hours of intake
  review.
- Day 0: payment lands; we confirm receipt over WhatsApp.
- Days 1-5: website build window. You see one draft on
  Day 3, give one round of structured revisions, we ship the
  revised version on Day 5.
- Days 5-7: AI Lead Rescue 48-hour setup runs after the
  site is live.
- Days 7-14: 7-day pilot monitoring window.
- Day 14: end-of-pilot recap; nothing auto-renews.

Next step: fill the intake at https://corpflowai.com/lead-rescue,
note that you would like the website add-on in the message
field, and we will come back within 2 business hours with
the pro-forma invoice tailored to Option B.
```

## 9. Suggested pricing bands

Pricing for Option A is fixed. Pricing for Option B is **banded** — the operator quotes one number from the band based on the answers in § 6 (number of pages, content readiness, brand-asset readiness, niche complexity). **Do not invent a tiered good / better / best menu on the call.**

### 9.1 Option A — AI Lead Rescue only

Per `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 1:

| Item | International (USD) | Mauritius (MUR — operator-side) |
|---|---|---|
| AI Lead Rescue Setup launch pilot | **USD 150** (one-time) | **~MUR 7,000** (operator converts at SBM USD→MUR rate at invoice time) |
| Monthly monitoring (after pilot, optional) | **USD 99 / month** | **~MUR 4,500 / month** |

### 9.2 Option B — Lead-ready website + AI Lead Rescue

The website add-on is operator-quoted within these bands. **The bands are not a buyer menu — the operator picks one number based on actual scope agreed in discovery.**

| Shape | Pages | Indicative band (USD, one-time) | When to quote which |
|---|---|---|---|
| **B1 — Single-page lead site + pilot** | 1 page (Home only) | **USD 600 – USD 900** | Buyer has clear single offer, all copy material ready, owns brand assets, simple service / no physical address. |
| **B2 — Two-page lead site + pilot** | 2 pages (Home + Services *or* Home + Contact) | **USD 900 – USD 1 200** | Buyer needs slightly more depth (e.g. distinct services need their own bullets, or a physical-business contact page with map). |
| **B3 — Three-page lead site + pilot** | 3 pages (Home + Services + Contact) | **USD 1 200 – USD 1 500** | Niche has two clearly distinct service tracks (e.g. residential vs commercial contractor), or buyer needs a contact page with hours / location / map / staff names. |

All Option B prices **include** the standard USD 150 AI Lead Rescue pilot — they are not on top of it. The website portion is the difference (e.g. B1 = ~USD 450–750 of website work + USD 150 pilot = USD 600–900 total).

**Mauritius warm-network conversion.** Operator quotes the MUR equivalent at the same SBM USD→MUR rate used in `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 1.1. Round to the nearest MUR 500 for buyer convenience (e.g. USD 600 ≈ MUR 28 000; USD 1 200 ≈ MUR 56 000 at MUR ~46.50/USD).

### 9.3 Revisions policy (the single most important pricing line)

- **One round of structured revisions** is included in Option B. *Structured* means a single consolidated message (email or shared doc) listing every change, sent within 2 business days of receiving the draft.
- **Additional revision rounds** are billed at **USD 75 / round** (or MUR 3 500 / round). Operator informs the buyer in writing before starting the second round; never silently absorbs the cost.
- **Out-of-scope changes** disguised as revisions (e.g. *"can you add a fourth page"*, *"can you redesign the logo"*, *"can you add a booking calendar"*) are declined and listed back to the buyer in writing as separate quotes — not folded into the existing fee.

### 9.4 Discount rules (same as the pricing guide)

Default: **no discounts** on Option B. The bands are already at the operator-floor for first paid pilots. The four narrow discount carve-outs in `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 4 (two pilots paid together, public-reference comp on month-1 monitoring, ex-CorpFlow operator clients, warm-network introducer share) apply only to the **pilot** portion of Option B — never to the website portion. The website portion is hand-built operator hours; discounting it is discounting the operator's time, which the doctrine forbids.

### 9.5 What is NOT in any pricing band

- **Hosting / domain registration fees** — buyer pays the registrar / host directly. We can advise; we do not pay.
- **Stock photography licences** — buyer pays. We can suggest free sources (Unsplash, Pexels) by default to avoid this.
- **Custom illustrations / paid commissions** — out of scope.
- **Stripe / PayPal account setup for the buyer** — out of scope.

## 10. Manual invoice / pro-forma path

The manual pro-forma path is the **same** as `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 5, with two additions for Option B.

### 10.1 Option A — same as the pricing guide

Single line item: *"AI Lead Rescue Setup — launch pilot (48-hour managed setup + 7-day monitoring window)"* — USD 150. Number sequence `AILR-2026-NNN`. SBM Bank Mauritius wire (Mauritius warm network) or international USD wire.

### 10.2 Option B — two line items, one invoice, one wire

```text
Pro-forma Invoice — AI Lead Rescue + Lead-ready website
Invoice number: AILR-WEB-2026-NNN
Date issued:    {ISO date}
Buyer:          {business name, contact, country, email}

Line items:

1. AI Lead Rescue Setup — launch pilot
   (48-hour managed setup + 7-day monitoring window)
   USD 150

2. Lead-ready website ({1 / 2 / 3} pages)
   (mobile-friendly, single enquiry form connected to the
   AI Lead Rescue intake handler, call / WhatsApp button,
   service copy + contact section, one round of structured
   revisions)
   USD {amount from § 9.2 band}

Total: USD {sum}

Payment method: Manual wire transfer to SBM Bank Mauritius
{account name, IBAN/SWIFT, bank reference instructions on
the operator pro-forma template}.

Due: Setup window starts when the wire clears the operator
account.

Footer: Pro-forma issued pending VAT activation — this is
not a tax invoice. A tax invoice will be issued
retrospectively once VAT registration completes, for buyers
requesting it.

Boundaries (printed on the invoice):

- Scope is bounded to the line items above.
- Out of scope: e-commerce, booking engine, custom CRM,
  membership portal, complex integrations, paid ads, full
  brand identity, unlimited revisions.
- Revisions: one round included; further rounds at USD 75
  per round.
- Domain registration and hosting fees, stock-photo licences,
  and any custom illustration are not included in this fee.
- We do not guarantee revenue. We help make sure existing
  enquiries are captured, visible, and followed up.
```

The boundary block on the invoice is **not optional**. It is the document that protects the operator when scope arguments come up two weeks in.

### 10.3 What never goes on the invoice

Same hard rules as the pricing guide and the operator runbook (`docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *What not to store*):

- ❌ Card numbers, CVV, banking credentials, OTPs.
- ❌ Buyer's bank account details (you do not need them — they are wiring to you).
- ❌ Any guaranteed-revenue or ROI number (per `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 7).
- ❌ Any line item priced as *"to be determined"*. Every line on the pro-forma is a fixed number agreed in writing with the buyer before the pro-forma is issued.

### 10.4 Activity-log entry

When the pro-forma is sent, the operator adds an activity-log entry of type `manual_pro_forma_sent`, channel `email`, note: *"Option B pro-forma sent. AILR-WEB-2026-NNN. Total USD {sum}. Awaiting wire."* — same shape as `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 5.3, just with the website-add-on invoice number prefix.

## 11. Client information needed (operator collects after the wire clears)

For Option B, the operator needs everything in `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 2, **plus** the following website-specific items. Collect these inside one structured WhatsApp / email message, not piecemeal.

### 11.1 Identity / brand

- [ ] **Business display name** (exact spelling, including punctuation and capitalisation).
- [ ] **Existing logo file** if available (PNG with transparent background preferred). Single working version is enough — no need for the full brand-asset library.
- [ ] **Brand colour** (one). If the buyer cannot name one, operator picks a doctrine-aligned default and confirms.
- [ ] **Tagline / one-line offer description** (the buyer's own words).

### 11.2 Domain / hosting

- [ ] **Domain status.** Owned (registrar + login confirmed) / not yet owned (operator helps register in buyer's name) / does not need a custom domain (will use a Vercel sub-route during the pilot).
- [ ] **DNS access.** Buyer can log into the registrar to update DNS *or* buyer can grant temporary delegated access (preferred: buyer changes one record themselves with operator instructions, no shared password).
- [ ] **Existing email setup.** Stays as-is; the website does not change anything about the buyer's existing email.

### 11.3 Content

- [ ] **Service list.** 3–5 bullet-shaped items the buyer offers.
- [ ] **Existing copy material.** Flyer / brochure / Facebook page bio / portfolio descriptions — whatever exists. Operator drafts from this; no fabricated marketing claims.
- [ ] **Photography.** Either buyer-supplied (working files, not phone screenshots) or operator-selected from a free stock source. **No** photos of identifiable people who have not consented.
- [ ] **Address / hours / map** (if the business is physical).
- [ ] **Working WhatsApp number for the call/WhatsApp button** (same number used for AI Lead Rescue alerts per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 2).
- [ ] **Working email** for the contact section.

### 11.4 Permissions / consents

- [ ] **Photo / staff-name consent.** If the page mentions named staff or shows staff photos, operator gets written consent (WhatsApp / email) from each named person before publishing.
- [ ] **Stock-photo licence confirmation.** Operator records the source URL + licence tier of every stock image used, in a private operator notes file. Free-source default; no licence fees for the buyer.
- [ ] **Domain transfer-out understanding.** Buyer confirms in writing that the domain stays in their registrar; CorpFlow does not register domains in operator's name.

### 11.5 What the operator must NEVER collect

Same hard rules as `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 2 *What the operator must never collect*:

- ❌ Card numbers, CVV, OTPs, banking passwords.
- ❌ Government ID numbers (national ID, passport, NIC, NID).
- ❌ Salary / payroll detail.
- ❌ Health information.
- ❌ Customer / patient data from the buyer.

If the buyer offers any of the above, decline politely. The website does not require any of it.

## 12. 48-hour definition of done

Option B has **two** "done" gates: the website-build gate (Day 5 in § 8) and the AI Lead Rescue 48-hour gate (Day 7 in § 8). The AI Lead Rescue gate is unchanged from the runbook; the website gate is operator-defined.

### 12.1 Website-build "done" (end of Day 5 in the § 8 timeline)

The website is **DONE** when **all** of the following are true:

| # | Item | Evidence |
|---|---|---|
| 1 | All agreed pages are live on the buyer's chosen URL | Operator opens each page on a fresh browser session; pages return HTTP 200, render correctly, and contain the agreed copy. |
| 2 | Mobile rendering is clean | Operator opens the page on a real iOS device + a real Android device. No horizontal scroll, all tap targets reachable, hero CTA visible above the fold. |
| 3 | Enquiry form posts into the AI Lead Rescue intake handler end-to-end | Operator submits a test enquiry from the live site; the test enquiry appears in the cockpit at `/admin/lead-rescue` within 30 seconds and fires the operator-side Telegram alert. |
| 4 | Call / WhatsApp buttons fire correctly | Operator taps the Call button on a real phone (opens dialer with buyer's number prefilled). Operator taps WhatsApp button (opens WhatsApp with buyer's number and an empty message). Both verified on iOS and Android. |
| 5 | Contact section is correct | Address (if relevant), business hours, email, WhatsApp link, embedded map (if relevant) all match what the buyer agreed. |
| 6 | Plausible analytics is recording visits | Operator confirms the site appears in Plausible and a visit during the test produced one pageview. |
| 7 | One round of structured revisions has been applied | Operator received the consolidated revision message from the buyer, applied the changes, and has re-shipped. |
| 8 | Buyer has acknowledged the live site over WhatsApp | A thumbs-up reaction on the live URL is enough for first paid pilots. |
| 9 | Activity-log entry of type `note` records the website hand-over | Channel `internal`, note: *"Website live at {URL}. Pages: {N}. Form connected to intake handler. Buyer acknowledged. Starting AI Lead Rescue 48-hour setup window."*. |

If any of the nine is missing, **do not declare the website "done"**. Slip honestly per the brand-doctrine line in `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 11.

### 12.2 AI Lead Rescue 48-hour "done" (end of Day 7 in the § 8 timeline)

Same as `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 11. The website's enquiry form **is** the connected lead source for the pilot; checklist item 3 (`lead_source_selected`) and item 4 (`google_sheet_created`) and item 6 (`test_lead_submitted`) all use the new form.

### 12.3 The combined "done" line

Option B is **operationally complete** when **all** of the following are true:

- Website-build "done" (§ 12.1) is satisfied — 9 / 9.
- AI Lead Rescue 48-hour "done" (§ 12.2) is satisfied — at least 8 / 13 setup-checklist items in the cockpit.
- Buyer-side daily summary has been received in WhatsApp + email at least once.
- Hand-over message sent and acknowledged (operator runbook hand-over template).

Per `.cursor/rules/delivery-reality.mdc`, **the project is COMPLETE only when this combined gate passes on the buyer's actual production URL** — not on a preview deployment. Recording the production URL + the AI Lead Rescue cockpit lead-id is part of the closure.

## 13. Risks and boundaries

### 13.1 Top risks

| Risk | What it looks like | How to prevent it |
|---|---|---|
| **Scope creep dressed as revisions** | *"Can you also add a portfolio page / a careers section / a blog?"* mid-build. | Refer back to the agreed § 8 page list. *"That is a different shape from what we agreed. I can quote it as a separate engagement after launch."* |
| **Brand-identity drift** | *"Can you redesign the logo while you are at it?"* | Decline; refer to a brand designer. The site uses the buyer's existing logo. |
| **Domain / hosting hand-over confusion** | Buyer assumes operator owns their domain post-launch. | Set the expectation in writing on day one — domain stays in buyer's registrar in buyer's name. |
| **Content delays** | Buyer cannot supply copy material; build window slips. | Operator drafts from existing buyer materials within the agreed window. If the buyer cannot provide a flyer / brochure / Facebook bio, the project is not yet ready — see § 13.3. |
| **Buyer wants to "test it first"** | Buyer asks for a free preview before paying. | Decline — the offer is paid-pilot only (`docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` § 9.3). |
| **Buyer wants pay-on-results** | Buyer asks to pay only if the site brings in clients. | Decline — same forbidden category as `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 7. We do not guarantee revenue, so we do not price on revenue. |
| **Multi-decision-maker stall** | Buyer needs sign-off from a partner / accountant / committee. | Get the conversation onto a call with the actual decision-maker before quoting. Do not send a pro-forma to a buyer who cannot approve it. |
| **Operator capacity slip** | Operator agrees to a 5-day build with 2 days of capacity. | Be honest about capacity at quote time. Slipping the start to next Monday is fine; slipping mid-build is brand-damaging. |
| **Tech-stack debate** | Buyer wants the site on a specific platform they prefer for their own reasons. | Operator picks the stack; buyer does not. If the buyer insists on a stack the operator does not support, decline the project. |
| **Accidental e-commerce ask** | Late in the build the buyer says *"can people pay through the site?"*. | Decline; the offer is lead-capture only. Refer to a Shopify / WooCommerce specialist. |

### 13.2 Hard boundaries (operator does not break these)

- **No generic web design agency positioning** — even if a prospect asks for it. The doctrine line: *"We are not a web design agency. We build a single capture surface that connects into AI Lead Rescue."* If the prospect needs a real web project, refer them out.
- **No paid ads work bundled into Option B.** Per `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13.
- **No revenue guarantees, anywhere — invoice, copy, conversation, follow-up.** The standard line is `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 7.
- **No regulated-data scope on the website itself.** No clinic patient-record forms. No financial-data intake. No minor-data intake. The form on the page is a lead-capture form (name + contact + one-line message) — that is its only shape.
- **No unattended automated replies** to enquiries that come through the new website. The operator reviews and replies, same as the standard pilot.

### 13.3 When to decline politely (and how)

If discovery surfaces a misalignment, decline cleanly. Use this script:

```text
Honest answer: this is not the right shape for what you need.
You are looking for {what they actually want — a full
marketing site / an e-commerce store / a custom CRM build /
unlimited ongoing work}, and the offer I have is
deliberately narrower than that — a 1-3 page lead-capture
site connected to AI Lead Rescue.

If you go ahead with what I have, you will end up
disappointed because you wanted something bigger. So I am
going to step back and either (a) suggest someone better
suited for the bigger scope, or (b) we keep talking once
the scope feels right for what I do.

Either way, no pressure.
```

Refer-out options the operator can keep in their notes (not committed publicly):

- For full marketing sites: a generalist Mauritius web-design freelancer / agency the operator personally trusts.
- For e-commerce: a Shopify specialist.
- For booking engines: Calendly / Cal.com self-serve, or a booking-engine specialist.
- For brand identity: a brand designer the operator personally trusts.
- For CRM: see `docs/strategy/CORPFLOWAI_CRM_REUSE_AUDIT_V1.md` — the canonical answer is that we are not the right partner for that.

### 13.4 What the buyer should never see in the boundary conversation

- ❌ Apology language for declining (the offer is intentionally narrow; that is not an apology shape).
- ❌ A made-up-on-the-call discount to keep the prospect.
- ❌ A made-up-on-the-call new tier (*"OK what about a Premium pack?"*).
- ❌ A promise to build something bigger *"as a special favour"*.

If the operator finds themselves drifting into any of those, the right move is to end the call politely and message the buyer one hour later with the structured decline above.

## 14. Follow-up message templates

These are operator-side templates the operator personalises before sending. Plain text. No marketing-cadence language. Same tone as `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` and `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`.

### 14.1 After the discovery call — sending the proposal

**WhatsApp / email, ~1 business hour after the call.**

```text
Hi {first name},

Thanks for the time today. As promised, here is what we
talked through:

Option A (you already have a working capture surface):
- AI Lead Rescue Setup launch pilot.
- USD 150 one-time.
- 48-hour managed setup, 7-day pilot monitoring.

Option B (I build a small lead-ready website + the pilot):
- 1 to 3 pages, mobile, single enquiry form connected to
  the AI Lead Rescue intake handler, call / WhatsApp
  buttons, contact section.
- One round of structured revisions.
- USD {amount from the band in § 9.2} all-in.
- Build window: 3-5 business days. Pilot setup: 48 hours
  after the site goes live. Pilot monitoring: 7 days.

Either way, the same things hold:
- No card on the public page; manual pro-forma after we
  agree the scope.
- We do not guarantee revenue. We help make sure existing
  enquiries are captured, visible, and followed up.
- One round of revisions on Option B; further rounds are
  USD 75 each, agreed in writing first.
- The list of things the website is NOT for — e-commerce,
  booking engines, CRMs, paid ads, full brand identity work
  — is on the proposal so neither of us gets surprised.

If you would like to go ahead, fill the intake form here:
https://corpflowai.com/lead-rescue

If you choose Option B, mention that in the message field
and I will come back within 2 business hours with the
combined pro-forma. If you choose Option A, the pro-forma
is automatic.

Happy to answer any questions before you fill it in.

Best,
Anton
```

### 14.2 If the prospect goes quiet after the proposal

**WhatsApp / email, 2-3 business days later.** Same tone as `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` § 6.1.

```text
Hi {first name}, no pressure - just wanted to make sure
the proposal landed. If the timing is not right, a quick
"not for us" is genuinely fine; saves us both time.

If you have a question on either option, ask away.

The page in case you misplaced the link:
https://corpflowai.com/lead-rescue
```

### 14.3 If the prospect asks for unlimited revisions / scope expansion

**WhatsApp / email, same day.**

```text
Hi {first name},

Quick note on the revision question: the proposal includes
one round of structured revisions on the website draft -
that is one consolidated message from you with every change
listed, applied within 2 business days, then we ship the
revised version.

Beyond that, additional rounds are USD 75 each, agreed in
writing before I start them. The reason it works this way
is honest: open-ended revisions are how cheap web projects
turn into expensive ones, and I would rather both of us see
the cost up front.

If that does not match what you had in mind, tell me - I
would rather restructure the offer now than partway through
the build.
```

### 14.4 If the prospect asks to bundle in something out of scope

**WhatsApp / email, same day.**

```text
Hi {first name},

That is a different shape from what we agreed for the
launch pilot. The offer in the proposal is deliberately
narrow - one capture surface plus AI Lead Rescue, on a
fixed timeline.

What you are describing ({what they asked for}) sits
outside that scope. Two options:

1. We do the launch pilot as proposed first, see if it
   delivers what you need on the lead-response side, and
   then I quote {what they asked for} as a separate
   engagement after the pilot.

2. If {what they asked for} is the priority for you, the
   right person is probably {a generalist agency / a
   specialist - operator's personal contacts}. I am happy
   to point you at someone good rather than overpromise.

Which works for you?
```

### 14.5 After the website goes live (operator-internal)

**Operator-side activity-log entry, not buyer-facing.** Channel `internal`, type `note`:

```text
Website live: {production URL}.
Pages: {N}.
Form connected to intake handler at /api/tenant/intake.
Test enquiry submitted; cockpit lead-id {id}; Telegram
alert fired at {timestamp}; pageview recorded in Plausible.
Buyer acknowledged at {timestamp via WhatsApp/email}.
Starting AI Lead Rescue 48-hour setup window.
Hand-over message scheduled for {ISO timestamp}.
```

## 15. Mini proposal template (paste-ready for email or WhatsApp)

This is the **single document** the operator sends after the discovery call. Paste into email body or a WhatsApp message; do not attach a PDF for first paid pilots — the friction reduces conversion.

```text
AI Lead Rescue + Lead-ready website — short proposal for {Business name}

Prepared for: {first name + last name}, {role}
Prepared by:  Anton, CorpFlowAI
Date:         {ISO date}

---

What you told me on the call

You sell {one-sentence offer in their words}. Enquiries
come through {2-3 channels they named}. The biggest leak
right now is {channel they named in discovery Q2}, and
{the specific recent missed-enquiry pain phrase from
discovery Q3}.

You also mentioned that {your existing website is broken /
you do not have a website yet / your existing website does
not have a contact form}, which is why we are also looking
at the website portion below.

---

What I am proposing

Option {A or B - circle one based on the call}.

Option A — AI Lead Rescue only (USD 150)
- 48-hour managed setup of {their named lead source} into
  a daily lead list.
- Operator alerts on every new enquiry.
- Daily summary to your WhatsApp + email at {their preferred
  time} for 7 days.
- Five-status follow-up board on the Sheet.

Option B — Lead-ready website + AI Lead Rescue (USD {sum from § 9.2})
Part 1 — Lead-ready website (3-5 business days)
- {1 / 2 / 3} pages: {Home / Home + Services / Home +
  Services + Contact}.
- Mobile-friendly. One enquiry form connected to AI Lead
  Rescue. Call + WhatsApp buttons. Contact section.
- Privacy-friendly analytics (Plausible).
- One round of structured revisions on the draft.
Part 2 — AI Lead Rescue 48-hour managed setup + 7-day
monitoring window. Same scope as Option A, with the new
website form as the lead source from day one.

---

What is NOT in either option (read this please)

- E-commerce. Booking engines. Custom CRM. Membership
  portal. Complex integrations.
- Paid ads.
- Full brand identity work or a new logo.
- Unlimited revisions. SEO retainer.
- Multilingual versions of the site (English-only by
  default; French / Creole are a separate quick add-on).
- Customer-facing automated replies in any language.
- Hosting fees, domain registration fees, paid stock-photo
  licences (you pay these directly to the provider).

---

What I am NOT promising

I do not promise more revenue. I do not promise more leads.
What I do promise: existing enquiries will be captured,
visible, and tracked daily inside the pilot window.

---

Timeline

- Day 0: you fill the intake at
  https://corpflowai.com/lead-rescue and mention "Option {A
  or B}" in the message field.
- Within 2 business hours: I send the pro-forma invoice
  through email, with SBM Bank Mauritius wire details for
  the warm-network route (or international USD wire if
  preferred).
- Day 0 (later): wire clears my account; I confirm receipt
  on WhatsApp.
- Days 1-5 (Option B only): website build window. You
  receive one draft on Day 3, give me a single consolidated
  revision message within 2 business days, I ship the
  revised version.
- Days 5-7 (or Day 0-2 for Option A): AI Lead Rescue
  48-hour setup window.
- Days 7-14 (or Days 2-9 for Option A): 7-day pilot
  monitoring.
- End-of-pilot recap; nothing auto-renews.

---

Investment

{Pick the matching line}

- Option A: USD 150 one-time, manual wire transfer.
- Option B: USD {sum from § 9.2} one-time, manual wire
  transfer.

Optional after the pilot: monthly monitoring at USD 99 /
month (~MUR 4 500 / month). Quoted only if you say yes
after the 7-day window. Nothing auto-renews.

---

What I need from you to proceed

1. Choose Option A or Option B.
2. Fill the intake at https://corpflowai.com/lead-rescue
   and mention the chosen option in the message field.
3. Confirm your working WhatsApp number and working email
   in the form.

I will come back within 2 business hours with the pro-forma
invoice. The 48-hour setup clock starts when the wire
clears my account.

---

Questions? Reply to this message. Honest "not for me" replies
are welcome - saves us both time.

— Anton
```

The mini proposal is **deliberately one page** when pasted into an email. Buyers in the warm-network phase do not read three-page proposals; they read short, plain, honest ones and decide on those.

## Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, allowed claims, no-guarantee copy, *Definition of done* for marketing surfaces.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — the website is a **capture surface**, not a generic web design service; managed-workflow framing.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook; § 13 *What NOT to build yet* (no paid ads / no bulk outbound / no CRM rebuild bundled with the pilot).
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — canonical AI Lead Rescue pricing (USD 150 pilot; USD 99 / MUR 4 500 monthly), manual pro-forma path, no-revenue-guarantee language.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery call structure (this doc adds 10 minutes of website-specific discovery on top).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — paste-ready scripts + objection handling.
- `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` — capability matrix; the website add-on lines up with row 3 *Client website enquiry form forwarding* extended to a built-from-scratch capture surface.
- `docs/sales/AI_LEAD_RESCUE_PROSPECT_QA.md` — owner-friendly Q&A guide (uses *"Can this work with my website?"* and *"Do I need to change my website?"* answers).
- `docs/strategy/AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md` — roadmap buckets; this offer sits between *Quick add-on* and *Custom build* by explicit operator scope-bounding.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator cockpit runbook + Activity log lifecycle scope.
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — paid-pilot intake checklist + 48-hour setup definition of done.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers (no regulated-data scope on the lead-capture form).
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible analytics defaults.
- `docs/strategy/CORPFLOWAI_CRM_REUSE_AUDIT_V1.md` — CRM decision (we are not a CRM partner; refer-out path).
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; combined-gate closure rule in § 12.3.

## Delivery reality

This is a **docs-only** pack. Per `.cursor/rules/delivery-reality.mdc` § *docs-only*:

- **PARTIAL** until reviewed + merged.
- **COMPLETE on merge** because no runtime / customer-visible flow changes.

When the first warm prospect signs Option B and the project ships end-to-end, append an `artifacts/chat_history.md` entry recording the buyer's first name + business + niche + outcome — preserving operator audit trail without leaking PII.
