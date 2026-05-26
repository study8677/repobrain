# Plausible as CorpFlow Analytics v1 provider

**Date:** 2026-05-25
**Status:** accepted
**Decided by:** Anton (CorpFlow operator)

## Context

`docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` Step 4.1 left the analytics provider undecided pending Anton's call. CorpFlow needs measurable buyer-funnel data on its public marketing surfaces (apex `corpflowai.com`, tenant `lux.corpflowai.com`, future tenants) to satisfy `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` §2.4 (SEO discoverability) and §2.1 (conversion clarity). Compliance overhead and processor count must stay low (`docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`) and tracking must respect the privacy posture set by `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`.

## Decision

**Plausible Analytics is the v1 provider for every CorpFlow public marketing surface.**

- **In scope (will install):** `https://corpflowai.com/`, `https://lux.corpflowai.com/`, future tenant marketing subdomains following the per-tenant migration template.
- **Out of scope (must not install on):** `core.corpflowai.com`, any factory route, `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/api/*`, password-reset routes, any authenticated tenant-private surface.
- **Not used (explicit non-decision):** Google Analytics 4 — explicitly **not** added in v1; would need a separate ADR + cookie-consent rebuild.
- **No third-party script lands until** Anton confirms the Plausible site is created for each host and the runtime PR is approved per the autonomous-actions policy hard gate.

## Why Plausible (vs GA4 / Fathom / self-hosted Umami)

| Criterion | Plausible | GA4 | Fathom | Self-hosted Umami |
|---|---|---|---|---|
| Cookie-consent banner required (EU/UK/CH visitors) | **No** (no cookies, no fingerprint) | Yes | No | No |
| New subprocessor entry needed | One row | One row + ad-data implications | One row | None (we already host) |
| Snippet weight | <1KB | ~50KB | <2KB | <2KB |
| Event API simplicity | `plausible('Event Name', { props })` | `gtag('event', …)` heavy schema | similar | similar |
| Custom domain proxy support (avoids ad-blocker false positives) | Yes (`script.<our-domain>.com`) | Limited | Yes | n/a |
| Cost shape at CorpFlow's traffic scale (low five figures pageviews/mo) | Flat low monthly | Free but heavier compliance | Similar to Plausible | Server cost + ops time |
| Operator can read data without engineer | Yes — single dashboard | Yes but learning curve | Yes | Yes |
| Reversibility (swap out in v2 by removing snippet) | High | Medium (consent state retained) | High | High |

Plausible wins on **lowest compliance overhead × lowest operator complexity × adequate buyer-funnel signal for v1**. Self-hosted Umami was the close runner-up on cost; rejected because hosting a stateful side-service violates the *brain-on-laptop, hands-in-cloud* model unless containerised on a service we already pay for, which would be a separate packet.

## Consequences

- Positive: zero cookie-consent surface; `DATA_MAP_AND_SUBPROCESSORS.md` adds one row (Plausible Insights) but no DPA renegotiation cascade; Cursor agents can write the analytics adapter without choosing schemas.
- Positive: the existing `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` Step 4.1 is satisfied — Step 4.2 onward is now unblocked for apex; Lux follows once apex is COMPLETE per the plan.
- Negative / follow-ups:
  - `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` must add a Plausible row before the runtime snippet ships.
  - The runtime install is a hard Anton-approved gate (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3) — Cursor cannot push a snippet without explicit approval per surface.
  - If a later tenant insists on GA4, that is a tenant-scoped exception, not a re-write of this decision; record as a separate ADR.
  - **`og:image` for Lux** (and other tenants) is still missing per the 2026-05-25 quality audit; analytics traffic without proper OG cards reduces conversion attribution quality. Treat as a parallel fix packet.

## Links

- Canonical analytics doc: `docs/analytics/CORPFLOW_ANALYTICS_V1.md` (this ADR's runtime contract).
- Companion plan: `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` (apex → Lux → future-tenants ordering).
- Companion checklist: `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` (per-surface verification).
- Search Console split: `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` (verification + indexing operator playbook).
- Quality framework: `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`.
- Compliance: `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` (must update before runtime install).
- Doctrine: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` (CTA + privacy posture).
