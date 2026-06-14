/**
 * Regression guards for the LuxeMaurice /change usability fixes shipped in PR #347
 * (filed against PR #346 follow-up):
 *
 *   1. Media library → Media workspace copy (TASK 2)
 *   2. CRM noise filter wiring (TASK 1)
 *   3. Add content sprint panel + collapsed Advanced workflow state (TASK 3 + 4)
 *   4. Demo opportunity removal from sitemap + public surfaces (TASK 5)
 *
 * Parses source files and asserts the wording/wiring is present. The deeper
 * behaviour tests live in:
 *   - `node-tests/lux-lead-system-test-heuristic.test.mjs`
 *   - `node-tests/lux-content-sprint-guidance.test.mjs`
 *   - `node-tests/lux-sprint-meta-extraction.test.mjs`
 *   - `node-tests/luxe-maurice-staged-properties.test.mjs`
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('TASK 2 — /change Media workspace copy replaces the engineering label', () => {
  const change = readRepo('pages/change.js');
  // Primary operator label must say "Media workspace".
  assert.match(change, /summary="Media workspace"/);
  // Operator-facing helper copy must read in client/operator language.
  assert.match(change, /Review approved images and videos across LuxeMaurice content requests\./);
  // The engineering-phase label and JSON-metadata wording must NOT be in the main copy.
  assert.equal(change.includes('cross-ticket index (Phase 5D)'), false);
  assert.equal(change.includes('JSON metadata only (no bytes)'), false);
  // The technical detail is allowed in a collapsed "Technical note" only.
  assert.match(change, /data-testid="lux-media-workspace-technical-note"/);
  assert.match(change, /<summary[^>]*>Technical note<\/summary>/);
});

test('TASK 1 — change.js wires system_generated filter + toggle + badge', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /const \[crmShowSystemGenerated, setCrmShowSystemGenerated\] = useState\(false\)/);
  assert.match(change, /const operatorViewLeads = useMemo/);
  // Counts strip + visible list both pull from operatorViewLeads, not raw leads.
  assert.match(change, /for \(const lead of operatorViewLeads\)/);
  assert.match(change, /return operatorViewLeads\.filter/);
  // Toggle + badge testids exist for the production verification harness.
  assert.match(change, /data-testid="lux-crm-system-generated-toggle"/);
  assert.match(change, /data-testid="lux-crm-system-generated-badge"/);
});

test('TASK 3 + 4 — change.js detects sprint tickets, renders panel, collapses stage tabs', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /import LuxContentSprintPanel from '\.\.\/components\/LuxContentSprintPanel\.js'/);
  assert.match(change, /isLuxContentSprintTicketSelected/);
  assert.match(change, /<LuxContentSprintPanel/);
  // Stage tab buttons must be split into a collapsed `<details>` for sprint tickets
  // and a primary inline group for everything else.
  assert.match(change, /data-testid="lux-stage-tabs-advanced-collapsed"/);
  assert.match(change, /data-testid="lux-stage-tabs-advanced-buttons"/);
  assert.match(change, /data-testid="lux-stage-tabs-primary"/);
  assert.match(change, /Advanced workflow state/);
});

test('TASK 5 — sitemap.xml.js does not advertise any placeholder property slug (C3 cleanup, 2026-06-12)', () => {
  // Original PR #347 intent (TASK 5): demo slug `lm-phase2d-manual-demo` must
  // not be in the sitemap. That intent is preserved.
  //
  // Updated 2026-06-12 (C3 placeholder cleanup): the 2026-06-12 live audit of
  // https://lux.corpflowai.com/sitemap.xml found the four non-demo `lm-*` slugs
  // and three `lxf-*` slugs all served 200 with zero <img> tags and the default
  // monogram as page title - i.e. discoverable as empty placeholder property
  // pages, contradicting the LuxeMaurice brand doctrine. None of them have
  // real client-approved content, so none should be advertised on the sitemap.
  // See docs/runbooks/LUX_CONTENT_SPRINT_C3_PLACEHOLDER_CLEANUP.md § 8 for the
  // canonical fix and rationale. Direct slug navigation still resolves via
  // resolveLuxPropertyRef for backward-compat bookmarks - only public
  // discoverability is closed.
  //
  // When Jan's first real C2 opportunity slug is approved + published, it is
  // appended back to LUX_PROPERTY_REFS in the same module; this test then
  // legitimately fails on the new slug and is updated to allowlist it.
  const sm = readRepo('pages/sitemap.xml.js');
  const placeholderSlugs = [
    'lm-phase2d-manual-demo',
    'lm-nc-ridge',
    'lm-villa-belombre',
    'lm-pent-plateau',
    'lm-pipeline-q4',
    'lxf-grand-baie-apt',
    'lxf-tamarin-villa',
    'lxf-poste-lafayette',
  ];
  for (const slug of placeholderSlugs) {
    assert.equal(
      sm.includes(`'${slug}'`),
      false,
      `sitemap must not advertise the placeholder slug ${slug} (C3 cleanup, no real client-approved content)`,
    );
  }
});

test('TASK 5 — pages/index.js filters demo entries through getPublicLuxStagedProperties', () => {
  const idx = readRepo('pages/index.js');
  assert.match(idx, /getPublicLuxStagedProperties/);
  // The naive fallback assignment must be replaced by the filtered helper.
  assert.equal(
    /site\.staged_properties\s*=\s*\n?\s*Array\.isArray\(site\.staged_properties\) && site\.staged_properties\.length\s*\n?\s*\?\s*site\.staged_properties\s*\n?\s*:\s*LUXE_MAURICE_STAGED_PROPERTIES;/.test(
      idx,
    ),
    false,
    'naive (unfiltered) staged_properties fallback must be replaced',
  );
});

test('TASK 5 — /property/[slug] returns 404 for demo slugs on the public path', () => {
  const f = readRepo('pages/property/[slug].js');
  assert.match(f, /isLuxStagedDemoSlug/);
  assert.match(f, /if \(isLuxStagedDemoSlug\(raw\)\)\s*\{\s*\n?\s*return \{ notFound: true \};/);
});

test('TASK 5 — /concierge drops demo property context', () => {
  const f = readRepo('pages/concierge.js');
  assert.match(f, /isLuxStagedDemoSlug/);
  assert.match(f, /if \(isLuxStagedDemoSlug\(rawProp\)\)/);
});

test('TASK 5 — ticket-get response surfaces lux_sprint_meta for the desk', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /import \{ extractLuxSprintMetaForApi \} from '\.\/_lib\/lux-sprint-meta-extract\.js'/);
  assert.match(router, /lux_sprint_meta: luxSpriteMeta/);
});

test('TASK 1 — concierge-leads-list returns system_generated flag + counts', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /import \{ classifyLuxLeadSystemTest \} from '\.\/_lib\/lux-lead-system-test-heuristic\.js'/);
  assert.match(router, /system_generated: systemTestClass\.system_generated/);
  assert.match(router, /counts = \{[\s\S]*total: leadsOut\.length[\s\S]*real:[\s\S]*system_generated:/);
});

test('LuxContentSprintPanel renders the documented surface area', () => {
  const c = readRepo('components/LuxContentSprintPanel.js');
  assert.match(c, /data-testid="lux-content-sprint-panel"/);
  assert.match(c, /data-testid="lux-content-sprint-upload-cta-static"/);
  assert.match(c, /data-testid="lux-content-sprint-checklist"/);
});

test('Staged properties module exports the new demo helpers', () => {
  const s = readRepo('lib/client/luxe-maurice-staged-properties.js');
  assert.match(s, /export function isLuxStagedDemoEntry/);
  assert.match(s, /export function isLuxStagedDemoSlug/);
  assert.match(s, /export function getPublicLuxStagedProperties/);
  assert.match(s, /demo: true/);
});
