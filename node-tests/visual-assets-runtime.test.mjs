import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  loadVisualAssetManifest,
  listVisualAssetManifests,
  __setVisualAssetManifestDir,
  __restoreVisualAssetManifestDir,
  __resetVisualAssetManifestCache,
} from '../lib/visualAssets/loadManifest.js';
import {
  selectHomepageAssets,
  HOMEPAGE_SLOT_IDS,
  __getHomepageSlotSpecs,
} from '../lib/visualAssets/selectHomepageAssets.js';
import { isAiGeneratedManifest } from '../lib/visualAssets/aiProvenance.js';

const VALID_BASE = {
  schema_version: '1.0.0',
  surface: 'core',
  kind: 'image',
  title: 'Runtime test asset',
  source: {
    type: 'repo',
    path: '/public/assets/test/asset.jpg',
    content_hash: 'sha256:' + 'a'.repeat(56),
    width: 1200,
    height: 630,
  },
  licence: {
    tier: 'corpflow_owned',
    owner: 'CorpFlowAI',
    terms: 'Internal runtime test asset.',
  },
  accessibility: {
    alt: 'Runtime test asset for the loader and selector tests',
    lang: 'en',
    decorative: false,
  },
  usage: {
    allowed_surfaces: ['core', 'shared'],
  },
  lifecycle: {
    state: 'vetted',
  },
};

function manifest(id, overrides = {}) {
  return {
    ...VALID_BASE,
    id,
    ...overrides,
  };
}

function aiManifest(id, overrides = {}) {
  return {
    ...VALID_BASE,
    id,
    kind: 'social_card',
    source: { type: 'ai_generated', url: 'https://cdn.corpflowai.com/test/ai-card.png', width: 1200, height: 630 },
    licence: { tier: 'ai_generated', owner: 'CorpFlowAI', terms: 'Generated under the CorpFlowAI vetted prompt library.' },
    accessibility: { alt: 'AI-generated social card for runtime test', decorative: false },
    usage: { allowed_surfaces: ['core', 'shared'] },
    lifecycle: { state: 'vetted' },
    prompt_provenance: {
      prompt_id: 'corpflow-homepage-card',
      model: 'openai/gpt-image-1',
      model_version: '2026-04',
      generated_at: '2026-05-19T10:00:00.000Z',
      reviewed_by: 'anton@corpflowai.com',
    },
    ...overrides,
  };
}

let TMP_ROOT = null;

function writeManifest(id, contents) {
  const file = path.join(TMP_ROOT, `${id}.manifest.json`);
  writeFileSync(file, JSON.stringify(contents, null, 2), 'utf8');
}

function writeRawManifest(id, raw) {
  const file = path.join(TMP_ROOT, `${id}.manifest.json`);
  writeFileSync(file, raw, 'utf8');
}

before(() => {
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  if (TMP_ROOT) {
    try {
      rmSync(TMP_ROOT, { recursive: true, force: true });
    } catch {}
  }
  TMP_ROOT = mkdtempSync(path.join(tmpdir(), 'cf-visual-assets-'));
  mkdirSync(TMP_ROOT, { recursive: true });
  __setVisualAssetManifestDir(TMP_ROOT);
});

after(() => {
  __restoreVisualAssetManifestDir();
  if (TMP_ROOT) {
    try {
      rmSync(TMP_ROOT, { recursive: true, force: true });
    } catch {}
    TMP_ROOT = null;
  }
});

describe('loadManifest — valid manifest loads', () => {
  it('returns a single manifest by id', () => {
    writeManifest('alpha-asset', manifest('alpha-asset'));
    const m = loadVisualAssetManifest('alpha-asset');
    assert.ok(m, 'expected manifest to load');
    assert.equal(m.id, 'alpha-asset');
    assert.equal(m.surface, 'core');
  });

  it('returns null for unknown id (does not throw)', () => {
    writeManifest('alpha-asset', manifest('alpha-asset'));
    __resetVisualAssetManifestCache();
    const m = loadVisualAssetManifest('does-not-exist');
    assert.equal(m, null);
  });

  it('lists multiple manifests filtered by surface', () => {
    writeManifest('one', manifest('one'));
    writeManifest('two', manifest('two', { surface: 'lux', usage: { allowed_surfaces: ['lux'] } }));
    writeManifest('three', manifest('three', { usage: { allowed_surfaces: ['core', 'shared'] } }));
    const list = listVisualAssetManifests('core');
    const ids = list.map((m) => m.id).sort();
    assert.deepEqual(ids, ['one', 'three']);
  });

  it('excludes draft and retired manifests by default', () => {
    writeManifest('keep-me', manifest('keep-me', { lifecycle: { state: 'published' } }));
    writeManifest('skip-draft', manifest('skip-draft', { lifecycle: { state: 'draft' } }));
    writeManifest('skip-retired', manifest('skip-retired', { lifecycle: { state: 'retired' } }));
    const list = listVisualAssetManifests('core');
    const ids = list.map((m) => m.id).sort();
    assert.deepEqual(ids, ['keep-me']);
  });
});

describe('loadManifest — invalid manifest rejected', () => {
  it('throws in development (NODE_ENV !== production) with clear errors', () => {
    process.env.NODE_ENV = 'development';
    writeManifest('broken', { ...manifest('broken'), surface: 'not-a-surface' });
    __resetVisualAssetManifestCache();
    assert.throws(
      () => loadVisualAssetManifest('broken'),
      (err) => {
        assert.match(err.message, /failed schema validation/);
        assert.match(err.message, /surface/);
        return true;
      },
    );
  });

  it('does not throw in production; logs and skips the bad manifest', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };
    try {
      writeManifest('good', manifest('good'));
      writeManifest('bad', { ...manifest('bad'), surface: 'not-a-surface' });
      __resetVisualAssetManifestCache();
      const list = listVisualAssetManifests('core');
      const ids = list.map((m) => m.id);
      assert.deepEqual(ids, ['good'], 'production should keep the good one and skip the bad one');
      assert.equal(loadVisualAssetManifest('bad'), null);
      assert.ok(warned, 'expected console.warn to have been called for the bad manifest');
    } finally {
      console.warn = originalWarn;
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('rejects malformed JSON in development', () => {
    process.env.NODE_ENV = 'development';
    writeRawManifest('garbage', '{ this is not json');
    __resetVisualAssetManifestCache();
    assert.throws(
      () => loadVisualAssetManifest('garbage'),
      (err) => {
        assert.match(err.message, /not valid JSON/);
        return true;
      },
    );
  });
});

describe('loadManifest — missing manifest fails safely', () => {
  it('returns null and does not throw when the directory is empty', () => {
    __resetVisualAssetManifestCache();
    assert.equal(loadVisualAssetManifest('anything'), null);
    assert.deepEqual(listVisualAssetManifests('core'), []);
  });

  it('returns null and does not throw when the directory does not exist', () => {
    const ghost = path.join(tmpdir(), `cf-visual-ghost-${Date.now()}`);
    __setVisualAssetManifestDir(ghost);
    assert.equal(loadVisualAssetManifest('anything'), null);
    assert.deepEqual(listVisualAssetManifests('core'), []);
  });
});

describe('selectHomepageAssets — homepage slot mapping valid', () => {
  it('exposes the four documented slots', () => {
    assert.deepEqual([...HOMEPAGE_SLOT_IDS], [
      'homepage_hero',
      'homepage_services_graphic',
      'homepage_trust_band',
      'homepage_social_card',
    ]);
    const specs = __getHomepageSlotSpecs();
    for (const slotId of HOMEPAGE_SLOT_IDS) {
      assert.ok(specs[slotId], `missing spec for ${slotId}`);
      assert.ok(Array.isArray(specs[slotId].preferredIds) && specs[slotId].preferredIds.length > 0);
      assert.ok(Array.isArray(specs[slotId].acceptedKinds) && specs[slotId].acceptedKinds.length > 0);
    }
  });

  it('returns nulls for every slot when given no manifests (preserves layout)', () => {
    const result = selectHomepageAssets([]);
    for (const slot of HOMEPAGE_SLOT_IDS) {
      assert.equal(result[slot], null, `${slot} should be null when no manifests provided`);
    }
  });

  it('matches preferred-id manifests to their slots', () => {
    const manifests = [
      manifest('corpflow-homepage-hero', { kind: 'image' }),
      manifest('corpflow-homepage-services-graphic', { kind: 'illustration' }),
      manifest('corpflow-homepage-trust-band', { kind: 'illustration' }),
      aiManifest('corpflow-homepage-social-card'),
    ];
    const result = selectHomepageAssets(manifests);
    assert.equal(result.homepage_hero?.id, 'corpflow-homepage-hero');
    assert.equal(result.homepage_services_graphic?.id, 'corpflow-homepage-services-graphic');
    assert.equal(result.homepage_trust_band?.id, 'corpflow-homepage-trust-band');
    assert.equal(result.homepage_social_card?.id, 'corpflow-homepage-social-card');
  });

  it('falls back to slot:<id> hint in usage.notes when no preferred id matches', () => {
    const manifests = [
      manifest('arbitrary-id-1', {
        kind: 'image',
        usage: { allowed_surfaces: ['core'], notes: 'Used for slot:homepage_hero on the public homepage.' },
      }),
    ];
    const result = selectHomepageAssets(manifests);
    assert.equal(result.homepage_hero?.id, 'arbitrary-id-1');
  });

  it('refuses manifests whose allowed_surfaces excludes core/shared', () => {
    const manifests = [
      manifest('lux-only', { surface: 'lux', usage: { allowed_surfaces: ['lux'] } }),
    ];
    const result = selectHomepageAssets(manifests);
    for (const slot of HOMEPAGE_SLOT_IDS) {
      assert.equal(result[slot], null, `${slot} must not select a non-core/shared manifest`);
    }
  });

  it('refuses draft and retired manifests', () => {
    const manifests = [
      manifest('corpflow-homepage-hero', { kind: 'image', lifecycle: { state: 'draft' } }),
    ];
    const result = selectHomepageAssets(manifests);
    assert.equal(result.homepage_hero, null);
  });
});

describe('AI provenance disclosure eligibility', () => {
  it('isAiGeneratedManifest returns true for ai_generated source', () => {
    const m = aiManifest('any-id');
    assert.equal(isAiGeneratedManifest(m), true);
  });

  it('isAiGeneratedManifest returns true for ai_generated licence tier', () => {
    const m = manifest('client-card', {
      licence: { tier: 'ai_generated', owner: 'CorpFlowAI', terms: 'Generated under the vetted prompt library.' },
      source: { type: 'cdn', url: 'https://cdn.corpflowai.com/test/x.png', width: 1200, height: 630 },
      kind: 'social_card',
      prompt_provenance: {
        prompt_id: 'corpflow-homepage-card',
        model: 'openai/gpt-image-1',
        model_version: '2026-04',
        generated_at: '2026-05-19T10:00:00.000Z',
        reviewed_by: 'anton@corpflowai.com',
      },
    });
    assert.equal(isAiGeneratedManifest(m), true);
  });

  it('isAiGeneratedManifest returns false for client_owned and corpflow_owned', () => {
    assert.equal(isAiGeneratedManifest(manifest('a')), false);
    assert.equal(
      isAiGeneratedManifest(manifest('b', { licence: { tier: 'client_owned', owner: 'Lux Maurice', terms: 'Licensed.' } })),
      false,
    );
  });

  it('AI-generated manifest selected into a homepage slot is eligible for disclosure', () => {
    const m = aiManifest('corpflow-homepage-social-card');
    const result = selectHomepageAssets([m]);
    assert.equal(result.homepage_social_card?.id, 'corpflow-homepage-social-card');
    assert.equal(isAiGeneratedManifest(result.homepage_social_card), true);
  });
});
