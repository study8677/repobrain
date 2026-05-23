# CorpFlowAI Prompt Library

**Status:** Scaffolding (v1) — non-breaking. The prompts here are the vetted starting set every AI-generated asset must trace back to via `prompt_provenance.prompt_id`.

**Audience:** Anyone generating visual assets for CorpFlowAI surfaces using image / illustration / social-card models.

**Companion docs:**

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- `docs/marketing/CORPFLOW_CONTENT_MODEL.md`
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`
- `lib/visualAssets/schema.js` (the validator enforces a `prompt_id` whose value matches an entry below)

## Why a prompt library

Generative models are non-deterministic. If we re-generate or audit an asset six months from now, we need:

- the **exact prompt** that produced it (or a vetted variant);
- the **brand constraints** baked into the prompt so a content editor can re-run safely;
- a **negative-prompt** discipline so we never accidentally reintroduce hype copy, fake dashboards, or unsupported revenue guarantees.

Every AI-generated manifest in `data/visual-assets/` must reference a `prompt_id` defined here. A prompt without a manifest is just a note; a manifest without a prompt entry fails validation.

## Global constraints (apply to every prompt)

Insert these as the trailing block of any image/illustration prompt:

```
Brand constraints:
- Honest, calm, useful aesthetic; not flashy, not "AI futuristic".
- No fake dashboards, no fake metrics, no fake testimonials, no celebrity likeness.
- No revenue guarantees, no "10x leads" / "guaranteed sales" copy.
- No exaggerated AI imagery (no glowing brains, no holograms, no chrome robots).
- No payment cards, no chip imagery, no bank logos.
- No identifiable real person without an on-file model release.
- Composition leaves room for a primary CTA on the right or bottom.
- Mobile-first: legible at 360 px wide.
```

Insert these as the standing negative prompt:

```
Negative: text overlays we did not write, fake UI elements, fake brand logos, glossy
3D AI clichés, revenue guarantees, "$$$", crypto/finance hype, casino imagery,
celebrity likeness, photorealistic faces of identifiable people without a release.
```

## Prompts (v1)

Each entry is the **source of truth**. Edit-in-place changes require a brand-doctrine review and a new manifest with a new `id` (do not silently re-point existing manifests).

### `lead-rescue-social-card`

- **Use case:** Open-graph / Telegram / WhatsApp / LinkedIn share card for `/lead-rescue`.
- **Surface:** `lead-rescue`.
- **Kind:** `social_card` (1200×630 PNG).
- **Lifecycle:** `vetted`.
- **Reviewer:** anton@corpflowai.com.

Prompt:

```
A flat, calm illustration for a small-business productivity tool called "AI Lead
Rescue". The composition shows three simple shapes on the left third: a small
notepad with a tick mark, a phone with a single soft notification dot, and a short
five-row checklist with two rows already ticked. Right two thirds reserved for
later text overlay (do NOT add any text). Limited palette: deep teal, warm sand,
off-white. Soft, even lighting. No people, no glossy gradients, no 3D depth.

[Append global brand constraints]
```

### `lux-hero-photography-treatment`

- **Use case:** Visual treatment guidance for repo-hosted Lux hero photography. NOT a generative prompt — used when commissioning or selecting photography.
- **Surface:** `lux`.
- **Kind:** `image` (selection, not generation).
- **Lifecycle:** `vetted`.

Selection brief:

```
Wide-angle dusk shots of Lux Maurice property exteriors, pool decks, or ocean
views. Natural light only. No people in frame (or back-of-head only) unless we
hold a model release. Composition leaves the upper-right third clean for a
headline + CTA overlay. Avoid: heavy HDR, drone shots that look generic, anything
without a clear sense of place. Prefer: golden / blue hour, soft shadows,
recognisable Mauritian ocean colour.
```

### `core-promise-icon-set`

- **Use case:** Single-stroke SVG icons paired with the CORE promise statements (visible, trackable, easier to act on).
- **Surface:** `core` (also `shared`).
- **Kind:** `icon` (SVG, max 64 × 64 viewBox).
- **Lifecycle:** `vetted`.

Prompt:

```
Single-stroke line icon, 2 px stroke, rounded caps, monochrome (currentColor),
no fill. Subject for this variant: an eye over a three-row checklist, representing
"make business work visible". The icon must scale cleanly from 24 px to 96 px and
read at a glance on a coloured button background. No text, no shadows, no
gradients.

[Append global brand constraints]
```

Variants in this set use the same skeleton with one subject change:

- `core-promise-icon-trackable` → small clock paired with a progress bar.
- `core-promise-icon-actionable` → a single CTA-shaped button with a forward arrow.

### `corpflow-homepage-hero`

- **Use case:** Hero photograph anchoring the CorpFlowAI public homepage (`https://corpflowai.com/`). Should communicate calm operational competence, not AI hype.
- **Surface:** `core` (also usable on `shared`).
- **Kind:** `image` (raster, encoded to optimized WebP at 1920/1280/768 widths for responsive serving).
- **Lifecycle:** `vetted`.
- **Reviewer:** anton@corpflowai.com.

Prompt:

```
Premium architectural editorial photograph for the hero of an enterprise B2B
website. Wide cinematic 16:9 composition, photorealistic, magazine-quality.
Subject: an empty modern executive workspace shot in soft natural daylight — a
long brushed-oak meeting table running diagonally into the frame, a single
matte-black document folder closed neatly on it, a low ceramic vessel with a
single dry stem. Behind, full-height frosted-glass partitions cast soft
horizontal shadows across a polished concrete floor. Tall vertical windows
out of frame on the right wash the scene in warm late-afternoon light, with
the rest of the room receding into calm cool shadow. Restrained palette:
deep navy, warm cream, slate grey, brushed brass accents. Atmosphere of
quiet professionalism, calm confidence, operational order.

Strict constraints: no people, no faces, no hands, no electronics, no
laptops, no phones, no screens, no monitors, no televisions, no signage,
no logos, no text, no letters, no numbers, no posters, no charts, no brand
marks, no neon, no glowing lights, no holograms, no robots, no machinery,
no abstract sci-fi elements, no generic stock-photo composition, no
over-saturated colors. Architectural Digest / Wallpaper magazine aesthetic.

[Append global brand constraints]
```

### `corpflow-homepage-social-card`

- **Use case:** Open-graph / Twitter / LinkedIn share card for `https://corpflowai.com/`. Used as `og:image` and `twitter:image`.
- **Surface:** `core` (also usable on `shared`).
- **Kind:** `social_card` (1200 × 630, encoded to optimized WebP).
- **Lifecycle:** `vetted`.
- **Reviewer:** anton@corpflowai.com.

Prompt:

```
Open-graph social-share card, 1200 × 630, ultra-wide horizontal composition.
Premium architectural editorial photograph for an enterprise B2B brand.
Centered low-angle photograph: a single calm modern interior corner — deep
navy painted wall on the left, warm cream linen-textured wall on the right,
the boundary between them a perfectly vertical line at center. Below: a
polished dark walnut shelf running the full width, holding a single small
ceramic vessel with one dry stem. Soft directional warm afternoon side-light
from off-frame on the right. Restrained palette: deep navy, warm cream,
brushed brass, dark walnut. Architectural Digest aesthetic — calm, restrained,
structured, quiet, premium.

Strict constraints: NO people, NO faces, NO hands, NO electronics, NO
laptops, NO phones, NO screens, NO text, NO letters, NO numbers, NO
words, NO logos, NO signage, NO charts, NO graphs, NO arrows, NO icons,
NO neon, NO glow, NO holograms, NO robots, NO sci-fi, NO futuristic
elements, NO over-saturated colors, NO stock-photo composition.

[Append global brand constraints]
```

### `concierge-handoff-illustration`

- **Use case:** Quiet supporting illustration for `/concierge` explaining "talk to a human → we set it up".
- **Surface:** `concierge`.
- **Kind:** `illustration`.
- **Lifecycle:** `draft` (awaiting first generation pass).

Prompt:

```
A two-panel flat illustration. Left panel: a stylised chat bubble with a wrench
icon inside, suggesting a request being made. Right panel: a stylised checklist
with three items, the first ticked. Connect the panels with a thin horizontal
arrow. Palette: muted teal, warm grey, off-white. No people. Leave the lower
third clean for a one-line caption.

[Append global brand constraints]
```

## Workflow when generating a new asset

1. Pick the `prompt_id` from this library. If none fits, propose a new entry in this file in the same PR — never inline an ad-hoc prompt in a manifest.
2. Generate. Keep at least three candidates; do not ship the first pass.
3. Brand-doctrine review (against `BRAND_AND_CONVERSION_DOCTRINE.md`). Reject hype, fake UI, revenue guarantees, glossy AI tropes.
4. Upload the chosen binary (CDN preferred) and create `data/visual-assets/<id>.manifest.json` with:
   - `source.type = "ai_generated"`,
   - `licence.tier = "ai_generated"`, `licence.owner = "CorpFlowAI"`,
   - full `prompt_provenance` including `prompt_id`, `model`, `model_version`, `generated_at`, `seed`, `reviewed_by`.
5. PR opens, schema validator runs, reviewer signs off → `lifecycle.state = vetted`.

## Retiring a prompt

If a prompt is no longer brand-safe (e.g. produces outputs that drift toward hype), move it to a `Retired prompts (do not use)` section at the bottom of this file (added when first needed) with a one-line reason. Manifests that still reference the retired prompt id must move to `lifecycle.state = retired` in the same PR.
