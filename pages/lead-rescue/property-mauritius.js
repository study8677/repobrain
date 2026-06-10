import AiLeadRescuePropertyMauritiusLanding from '../../components/AiLeadRescuePropertyMauritiusLanding.js';

/**
 * `/lead-rescue/property-mauritius` is a property-sector landing page for
 * Mauritius property operators (real estate agencies, villa rental
 * operators, property managers, serviced apartments / short-term
 * rentals). It is a niche-specific surface — the existing
 * `/lead-rescue` page remains the canonical pan-vertical AI Lead
 * Rescue landing page (per `JE-2026-06-08-1`).
 *
 * Why a separate page (not a query-param toggle on `/lead-rescue`):
 *  - Property operators need a property-aware aesthetic and copy. The
 *    apex `/lead-rescue` page uses the SaaS-tech operations aesthetic
 *    (deep navy + electric teal) which is correct for cross-sector
 *    use but reads as generic against Mauritius luxury property
 *    references (Beach Properties Mauritius, Expat Immobilier).
 *  - The user's identified market-perception blocker requires a
 *    visually credible property surface before any further cold
 *    outreach into the Mauritius property niche.
 *  - Keeping the existing page intact protects every existing inbound
 *    link (Mauritius outreach copy v1, social cards, footer link).
 *
 * No new env vars, no new DB schema, no new API routes:
 *  - The CTA submits to the existing `/api/tenant/intake` handler in
 *    `lib/server/tenant-intake.js`. The handler triggers the AI Lead
 *    Rescue operator notification when `meta.product` matches
 *    `AI_LEAD_RESCUE_PRODUCT` ('ai-lead-rescue'); we keep that exact
 *    value so the property-page intake fires the same operator
 *    alert path. Property differentiation is conveyed via
 *    `meta.lead_rescue_variant = 'property-mauritius'` and
 *    `meta.page = '/lead-rescue/property-mauritius'`, both of which
 *    flow through to `qualificationJson.intake_meta` and become
 *    visible on `/admin/lead-rescue/[id]`.
 *
 * SSG: this page has no per-request data; rendered at build time.
 */

export default function LeadRescuePropertyMauritiusPage() {
  return <AiLeadRescuePropertyMauritiusLanding host="corpflowai.com" />;
}

export async function getStaticProps() {
  return { props: {} };
}
