# Website quality reporting standard (v1)

**Status:** Canonical (v1, 2026-05-25)
**Audience:** Anton, Cursor agents, contractors, future client-facing reviewers.
**Companion docs (read first; this doc does not restate them):**

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — the **scoring rubric** (5 dimensions × 20 points = 100). This standard tells you when to *run* the rubric, what the totals *mean*, and how to *report* them.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console verification feeds the SEO row of every report.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — analytics installation feeds the Performance/Conversion observation rows in re-runs.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — non-negotiables that override total scores.
- `.cursor/rules/delivery-reality.mdc` — live-production discipline; "Operational" only when verified live.

---

## 1. Purpose

CorpFlow runs websites for itself and for clients. Quality cannot be a moving feeling. This standard makes the cadence, thresholds, evidence shape, and client-facing wording **the same for every site**, so:

- Anton can compare two clients (or two versions of the same client) without re-deriving scoring rules.
- Cursor agents know exactly when an audit is due, what evidence to ship, and what verbal range is allowed for a given total.
- A client receives a quality report that reads identically to every other CorpFlow client's quality report — no reviewer's mood, no improvised language.

The framework defines **how to score**. This standard defines **when to score, what to do with the score, and how to talk about it**.

---

## 2. Acceptance thresholds

| Total | Label | Allowed in client-facing report | Allowed in internal language | What blocks closing the audit |
|-------|-------|---|---|---|
| **85–100** | **Premium** | "Premium quality. Ready to drive paid traffic." | same | none |
| **75–84** | **Operational (production-ready)** | "Production-ready. Acceptable for paid traffic." | same | nothing — site can run; recommend a backlog of improvements. |
| **60–74** | **Below acceptable; remediation required** | "Site is usable for warm/direct traffic; we are tightening N items before paid traffic." | "Below the 75/100 production bar — remediation packet required before paid traffic or new tenant launch." | Ship a remediation packet with explicit point-targeted fixes. |
| **40–59** | **Substantive gaps; treat as draft** | "Draft quality. Not yet ready for traffic." | "Substantive gaps." | Same as 60–74, plus: the site should not be launched as a new tenant production at this score. |
| **0–39** | **Pre-launch only** | "Internal preview. Not a public-traffic site." | "Pre-launch only." | Cannot be linked from any other public CorpFlow surface. |

**Hard targets per surface type:**

| Surface type | Minimum acceptable | Premium target |
|---|---|---|
| **CorpFlow apex marketing** (`corpflowai.com`) | **75/100** | 85/100 |
| **Tenant marketing surface** (e.g. `lux.corpflowai.com`) | **75/100** at tenant launch; pre-launch at **65/100** is permissible if every gap is operator-driven (Search Console DNS, Lighthouse measurement) and remediation is queued. | 85/100 |
| **Lead-magnet single-page surface** (e.g. lead-rescue) | **75/100** | 85/100 |
| **Internal surfaces** (`/change`, factory, login) | not scored — out of scope per `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` §6. |

### 2.1 Doctrine override

Per `BRAND_AND_CONVERSION_DOCTRINE.md` non-negotiables, a site with **Conversion clarity ≤ 9** is **Conversion-PARTIAL** for buyer-facing usage **regardless of total**. A 90/100 site with a confusing CTA does not get the "Premium" label until conversion clarity is fixed. The reverse is true too: a 55/100 site with Conversion clarity ≥ 16 is *not* "Pre-launch" for warm/direct traffic — it is a draft with a working funnel. Use the framework §3 phrasing.

### 2.2 Asterisk discipline

When Lighthouse / browser-driven a11y / Search Console measurement is **PENDING**, the total carries a `*` (e.g. `59/100*`). Asterisked totals can move a site **up at most one band** when the PENDING items are measured (per the framework conditional rules). They cannot move it down — measurement either confirms the floor or raises it.

A report **must** carry the asterisk in every place the total appears (heading, summary, cross-references) until measurement closes.

---

## 3. Reporting cadence

| Trigger | Cadence | Owner |
|---|---|---|
| **New tenant launch** (any new public marketing surface) | One audit before launch + one within 7 days of launch | Cursor (audit) → Anton (verifies) |
| **Major content change** (rebrand, new section, new property type, redesigned hero) | One audit within 7 days of change | Cursor |
| **SEO / a11y / accessibility runtime PR** (e.g. PR #222) | One audit within 24 hours of merge **and** production deploy | Cursor (autonomous) |
| **Quarterly drift check** for live tenants | Once per calendar quarter | Cursor (scheduled packet under WEEKEND_EXECUTION_QUEUE.md) |
| **Operator on-demand** | When Anton flags a regression or runs a deal-shaped review | Cursor |
| **Pre-paid-traffic gate** | Mandatory; cannot run paid traffic on a site whose last audit was > 30 days old | Anton enforces |

The audit folder is `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>[-<event>]/README.md`. Folder names use the event suffix when more than one audit lands per day (`-postfix`, `-pre-launch`, `-quarterly`).

A site is **not** "audited" because someone clicked through it. An audit follows §4.

---

## 4. Audit procedure (read-only, single source of truth)

A quality audit is a **read-only** action under `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2. Cursor may run one against any production tenant URL without further approval. Procedure (verbatim from the framework §4 with this standard's evidence shape):

1. **Identify the surface.** Single tenant root + the top three CTA destinations + sitemap + robots + 404 + favicon + tenant-resolution sanity (`/api/tenant/site`, `/api/ui/context`).
2. **Capture production identification.** `core/api/factory/production-pulse/runtime` snapshot, target host's `BuildID`, the merged commit SHA visible in `__NEXT_DATA__` if obtainable. This is `delivery-reality.mdc` evidence.
3. **Run automated checks.** Public-probe set (`curl`/`Invoke-WebRequest` for headers + body), Lighthouse mobile if available, PageSpeed Insights API if Lighthouse local is unavailable.
4. **Run manual checks** for items automation does not cover (CTA wording, doctrine alignment, offer-clarity-in-five-seconds).
5. **Score against the framework §2.** Use the rubric verbatim. Each row gets either its full points, partial points (if the framework supports a fraction for that row), 0, or PENDING.
6. **Write the report** using the template in §5 below.
7. **Save** to `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>[-<event>]/README.md`.
8. **Commit** the report on a documentation-only branch; **do not** include site fixes in the same PR (a fix packet is a separate approval).

---

## 5. Report template (use verbatim — internal version)

```markdown
# Quality audit — <tenant_id> — <YYYY-MM-DD>[-<event>]

**Surface:** <list of URLs reviewed>
**Auditor:** <human or agent name>
**Mode:** read-only

## Score

| Dimension | Score | Δ vs <previous-audit-date> | Notes |
|-----------|-------|----------------------------|-------|
| Conversion clarity | x/20 | ±n | … |
| Performance | x/20[*] | ±n | LCP=…, CLS=…, TBT=…, TTFB=… |
| Accessibility | x/20[*] | ±n | … |
| SEO / discoverability | x/20[*] | ±n | … |
| Trust + governance | x/20 | ±n | … |
| **Total** | **x/100[*]** | **±n** | |

## Verdict (per framework §3 + reporting standard §2)

<verdict label> — <one-sentence rationale>.
[Doctrine note if Conversion clarity ≤ 9 or ≥ 16.]

## Top 5 recommended fixes

1. <fix> (gains ~N points)
2. …

## Doctrine alignment

<PASS/FAIL on each non-negotiable from BRAND_AND_CONVERSION_DOCTRINE.md>

## Evidence

- Probe outputs: <inline summary or link>
- Lighthouse JSON / screenshots: <links into artifacts/>
- Production identification at audit time: <commit SHA + deployment ID + BuildID>
- HSTS / TLS notes: <…>

## Operator-required follow-ups

<items that need Anton or browser/Search Console access>

## Whether the framework needs adjustment

<one paragraph; usually "v1 holding up" + 0-2 small refinements>

## Files referenced

<list>
```

The `[*]` markers are literal — keep them when measurement is pending; remove when measurement is captured.

---

## 6. Client-facing version

Internal reports use the §5 template verbatim. **Client-facing summaries** strip internal language, framework references, and operator-only items. Use this short template:

```markdown
# <Site name> — quality summary — <YYYY-MM-DD>

**Score:** <total>/100[*]  ·  **Status:** <Premium / Operational / Below acceptable / Draft / Pre-launch>

## What is working

- <2–4 bullets, plain language, no jargon — pull from doctrine PASS items + scored-high dimensions>

## What we are improving next

- <top 3 fixes from the internal report; describe the buyer-facing outcome, not the technical change>

## When the next review happens

- Next audit: <date> (<reason: scheduled / post-fix / pre-launch>)

---

*Methodology: a CorpFlow quality audit scores a site across five dimensions — conversion clarity, performance, accessibility, search discoverability, and trust. The maximum is 100. Sites at 75/100 and above are considered production-ready.*
```

Rules for the client-facing version:

- **Never** include the asterisk explanation in client copy — replace with "preliminary; full Lighthouse measurement scheduled for `<date>`".
- **Never** include `<html lang>`, `<main>`, `<meta name="description">` jargon. Translate to plain language ("the page tells search engines what it's about").
- **Never** include screenshots of internal dashboards, deployment IDs, or commit SHAs.
- **Never** include the framework reference (`framework §2.4`) in client copy.
- **Always** include the score *and* the status label so the number stands alone.

---

## 7. Improvement backlog format

Every audit produces a **top-5 fixes** list. Those fixes feed the improvement backlog under `docs/execution/WEEKEND_EXECUTION_QUEUE.md` (or its successor) as **packets**. Backlog item shape:

```markdown
- [ ] <Fix title> — <surface> — gains ~N points (lifts dimension from a/20 to b/20)
  - Evidence reference: <audit folder path>
  - Owner: <Anton (gate) | Cursor (executes) | Both>
  - Gates: <DNS | runtime PR | secret change | none>
  - Target audit re-run date: <YYYY-MM-DD>
```

A fix is **closed** when:

1. The runtime change (if any) is on `main` and Production deploy is Ready (`delivery-reality.mdc` discipline).
2. A re-audit covers the same dimension and confirms the point gain.
3. The audit folder for the re-run links back to the original audit folder.

Do not close a fix on "merge alone" — the framework requires *measured* improvement.

---

## 8. Launch-ready definition (for new tenants)

A new client tenant is **launch-ready** for paid traffic / public announcement when **all** of the following hold:

1. Quality score ≥ 75/100 (operator-acceptable; preferably ≥ 85/100 for premium clients).
2. Conversion clarity ≥ 14/20 (no doctrine override risk).
3. Per-tenant migration audit (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`) Sections A–F all PASS or PARTIAL with named follow-ups.
4. Search Console verification COMPLETE for the tenant host (per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md`).
5. Analytics decision recorded for the tenant (default = Plausible per `docs/analytics/CORPFLOW_ANALYTICS_V1.md`); snippet either installed or queued behind an explicit gate.
6. `delivery-reality.mdc` audit captured for the tenant marketing surface.
7. No open `db.prisma.io` / Postgres-drift fingerprints (per `docs/operations/POSTGRES_PROVIDER.md` §4b).

If any one of these is false, the tenant is in a **named pre-launch state** (e.g. `Lux: pre-launch — gated on Search Console verification`) until it closes. The quality report carries that state in the verdict line.

---

## 9. Anti-patterns (what this standard forbids)

- **Score-but-no-evidence audits.** Numbers without probe outputs, screenshots, or commits are not audits.
- **Silent re-runs.** Replacing a previous audit folder's content. Each audit is its own folder; the previous one stays.
- **Mixing audit + fix in one PR.** A read-only audit goes in one PR (or commit). Fixes are separate, gated by the framework's improvement-backlog discipline.
- **Client-facing claims that exceed the score's verdict band.** A 60/100 site does not get "Premium" wording even if the conversion side is excellent.
- **Inventing dimensions.** The framework has 5. Do not add or split for a one-off audit; raise a framework rev (v1.1) instead.
- **Asterisk drift.** Asterisks appear in the heading **and** the summary **and** every cross-reference. Removing one place but not another causes downstream confusion.

---

## 10. Cross-references

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — scoring rubric (this doc's substrate).
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console operator playbook.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible decision; ties to Performance + Conversion observations on re-runs.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — doctrine non-negotiables.
- `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` — Section C consumes the quality score.
- `.cursor/rules/delivery-reality.mdc` — live-prod-only "Operational" rule.

---

## 11. Status (2026-05-25)

| Site | Last audit | Score | Verdict | Next audit |
|---|---|---|---|---|
| `lux.corpflowai.com` | 2026-05-25 (post-SEO-fix) | **59/100\*** | Substantive gaps closing toward Operational | After Lighthouse run **or** after Search Console verification — whichever lands first. |
| `corpflowai.com` (apex) | none recorded | — | — | First baseline audit queued under WEEKEND_EXECUTION_QUEUE Goal 3 (next packet). |
| Future tenants | — | — | — | Per migration packet. |

When a row updates, copy the previous row down to a "Previous audits" sub-section so the table stays current and the timeline is preserved.
