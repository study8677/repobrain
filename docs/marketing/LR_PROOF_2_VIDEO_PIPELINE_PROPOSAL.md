# LR-Proof-2 — Server-side video generation pipeline (proposal v1)

Status: Proposal only. This document is a design specification for a server-side video generation pipeline that would produce CorpFlowAI marketing assets (starting with the LR-Proof-1 v1 walkthrough) without requiring a human at a desktop running OBS Studio. Approval of this proposal authorises a separate **build packet** to write the runtime code; this proposal itself adds no runtime, no dependencies, no workflow files, and no video assets.

This proposal is a named alternative path to the OBS-on-laptop approach approved for LR-Proof-1 Phase 1 (the seven choices recorded at Operator Bridge #249 issuecomment-4569335854). The OBS path remains valid as a fallback. This proposal does not invalidate it; it offers a reproducible, off-laptop path that becomes increasingly valuable as the number of marketing videos grows.

## 1. Why now

### 1.1 Strategic rationale

CorpFlowAI's commercial engine increasingly depends on visual proof: the LR-Proof-1 v1 walkthrough is the first in a foreseeable series. Once `/lead-rescue` carries one validation video, the same buyer-trust delta will be wanted on the apex page, on future tenant landing pages, and on each subsequent productized service. A reproducible video pipeline turns "video production" from a recurring operator-side task into a YAML edit + workflow click.

Concretely, this pipeline aims to support, over the next 12 months:

- **LR-Proof-1 v1** — the 45 to 60 second silent walkthrough designed in `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 6 (this proposal's first deliverable).
- **LR-4 article-companion clips** — short visual companions to the first three planned articles (deferred packet).
- **LR-6 short-form research clips** — testing infographic-vs-screen-recording engagement on landing pages (deferred packet).
- **Future tenant-marketing walkthroughs** — `lux.corpflowai.com`, future per-tenant marketing surfaces.
- **Future client-onboarding walkthroughs** — once the first paying pilot completes and consent permits.
- **Quality-gate evidence regeneration** — when a marketing surface changes copy, the matching walkthrough can be regenerated cheaply without re-recording.

Break-even versus manual recording is reached at the second video; everything beyond is pure compounding return.

### 1.2 Connection to existing standards and rules

This proposal aligns explicitly with:

- **`docs/EXECUTION_BRAIN_VS_HANDS.md`** — the philosophy of moving "hands" work off Anton's laptop. A server-side video pipeline removes a recurring desktop-side operator task and replaces it with reproducible automation.
- **`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`** — every recurring job moved off the laptop must satisfy the migration checklist (credential placement, parameterization, idempotency, retries, audit trail, schedule, rollback, doc updates). This pipeline will be designed against that checklist from day one.
- **`docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`** — the LR-Proof-1 plan defined the *what* (a 45 to 60 second silent walkthrough with burned-in captions on a fresh demo tenant). This proposal defines the *how* — programmatically.
- **`docs/marketing/04_DELIVERY_QUALITY_GATE.md`** — generated videos must still pass the quality gate and the proof / validation status flags in the PR template.
- **`.cursor/rules/delivery-reality.mdc`** — videos are operationally complete only when live-verified on the public surface they live on.

### 1.3 Connection to LR-Proof-1's seven Phase 1 choices

The seven choices Anton approved for LR-Proof-1 Phase 1 (issuecomment-4569335854) remain valid in spirit. Two of the seven shift in implementation; five are unchanged.

| # | Choice | Original implementation | Server-pipeline implementation | Change? |
|---:|---|---|---|---|
| 1 | Demo tenant | Fresh synthetic `demo-lead-rescue-validation` | Same — implemented as a static / mocked HTML view served by the workflow run; no real DB, no real `tenant_id` | spirit unchanged |
| 2 | Telegram-style overlay | Redacted on-screen overlay in OBS scene | HTML / CSS overlay rendered in headless Chromium, identical visual result | spirit unchanged |
| 3 | Silent + burned-in captions | OBS overlay text or post-production editor | FFmpeg `drawtext` filter; per-beat caption text lives in walkthrough YAML | spirit unchanged |
| 4 | Recording tool | **OBS Studio** preferred, QuickTime fallback | **Playwright + FFmpeg in GitHub Actions** | **changed** |
| 5 | Hosting | Same-origin under `public/assets/video/` later | Unchanged — same Phase 2 destination after sign-off | unchanged |
| 6 | Production owner | Anton or contractor with a desktop | Anyone with a GitHub account with workflow-run permission; the pipeline replaces the desktop step | **changed** |
| 7 | Approval gate | Anton alone signs off the final cut | Unchanged — Anton downloads the workflow artifact, watches, approves | unchanged |

The change is contained to choices 4 and 6. Hard limits, demo-tenant safety, narration policy, captioning style, hosting destination, and Anton-only sign-off all remain.

## 2. Scope

### 2.1 In scope (this proposal)

- Architecture of the pipeline.
- Walkthrough YAML schema (the source of truth that maps storyboard beats to executable steps).
- Playwright runner shape (how a YAML walkthrough becomes a recorded WebM).
- Caption / overlay pipeline shape (how WebM + per-beat captions become an MP4 with `drawtext` burned-in captions and a separate `.vtt` for HTML5 video).
- GitHub Actions workflow shape (trigger, runner, steps, artifacts, retention).
- Output paths and storage policy (`.mp4`, `.vtt`, `.provenance.json`).
- Integration with the existing LR-Proof-1 sign-off gate (Decision 7).
- Hard limits and what does **not** change.
- Failure modes, retries, and observability.
- Cost / dependency / runtime budget.
- Comparison to the OBS path (and when each wins).
- Phased build plan for the *next* packet (which actually writes the runtime code).
- Open decisions Anton needs to make to unblock the build packet.

### 2.2 Out of scope (this proposal)

- No new dependencies installed (`package.json` untouched).
- No GitHub Actions workflow file added (the `.github/workflows/` directory is untouched).
- No `pages/`, `components/`, `lib/`, `public/`, `data/`, `prisma/`, or `api/` files touched.
- No `.mp4` / `.vtt` / video files added to the repo.
- No changes to env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behavior, Vercel config, GitHub settings, or deployment settings.
- No payment-gateway changes.
- No autonomous merge of this PR — Anton merges only after reviewing.

### 2.3 Out of scope until separately approved (later packets)

- The actual Node + workflow code (build packet, separately approved).
- Any commit of a generated `.mp4` to `public/assets/video/` (Phase 2 packet, requires Anton sign-off of the final cut first).
- Embedding the video into `pages/lead-rescue.js` and updating the visual asset manifest (Phase 2 packet).
- Re-scoring `/lead-rescue` against the Quality Gate post-embed (Phase 2 packet).
- Extending the pipeline to produce additional video assets (LR-4, LR-6, future tenant videos) — each becomes its own walkthrough YAML and a small extension packet.

## 3. Architecture overview

### 3.1 Component diagram (text)

```
+---------------------------------------------------------------+
|  REPO (source of truth — versioned)                           |
|                                                               |
|  data/walkthroughs/                                           |
|    lead-rescue-walkthrough-v1.yml      <-- the YAML beats    |
|    _shared/captions.style.json         <-- typography rules  |
|    _shared/disclosure-card.html        <-- final-frame card  |
|                                                               |
|  scripts/video/                                               |
|    run-walkthrough.mjs                 <-- Playwright runner |
|    encode-mp4.mjs                      <-- FFmpeg wrapper    |
|    write-provenance.mjs                <-- audit metadata    |
|                                                               |
|  .github/workflows/                                           |
|    generate-walkthrough-video.yml      <-- GH Actions runner |
+---------------------------------------------------------------+
                              |
                              | manual_dispatch trigger
                              v
+---------------------------------------------------------------+
|  GITHUB ACTIONS RUNNER (Ubuntu, ephemeral)                    |
|                                                               |
|  1. checkout repo                                             |
|  2. install Node + Playwright + FFmpeg                        |
|  3. spin up local static server (serves data/walkthroughs/    |
|     _mocks/ on http://127.0.0.1:4173)                         |
|  4. node scripts/video/run-walkthrough.mjs                    |
|     -> Playwright drives headless Chromium through beats     |
|     -> records to .artifacts/raw/walkthrough.webm             |
|  5. node scripts/video/encode-mp4.mjs                         |
|     -> FFmpeg: webm -> mp4 (H.264, 30fps, no audio track)    |
|     -> burns drawtext captions per beat timing               |
|     -> writes companion .vtt for HTML5 captions              |
|  6. node scripts/video/write-provenance.mjs                   |
|     -> .artifacts/lead-rescue-walkthrough-v1.provenance.json  |
|     (workflow run id, commit SHA, walkthrough YAML SHA,       |
|      Playwright + FFmpeg versions, timestamp)                 |
|  7. upload .artifacts/* as workflow artifact (90-day default) |
+---------------------------------------------------------------+
                              |
                              | Anton downloads artifact
                              v
+---------------------------------------------------------------+
|  ANTON'S LAPTOP (review only — no production tools)           |
|                                                               |
|  1. open the .mp4, watch it                                   |
|  2. if approved: post `### Operator decision` on #249         |
|     authorising LR-Proof-1 Phase 2 (commit + page wiring)     |
|  3. if rejected: file YAML edits in a follow-up walkthrough   |
|     PR and re-run the workflow                                |
+---------------------------------------------------------------+
                              |
                              | Phase 2 packet (separate)
                              v
+---------------------------------------------------------------+
|  PHASE 2 PR (Cursor authors after sign-off)                   |
|                                                               |
|  - copy .mp4 + .vtt + .provenance.json into                   |
|    public/assets/video/lead-rescue/                           |
|  - wire <video> + <track> into pages/lead-rescue.js or        |
|    components/AiLeadRescueLanding.js                          |
|  - update data/visual-assets/lead-rescue-walkthrough.manifest |
|    .json (provenance, alt text, AI-tooling disclosure)        |
|  - re-score /lead-rescue against Quality Gate (target 13/14)  |
|  - PR template marketing/sales quality gate filled            |
+---------------------------------------------------------------+
```

### 3.2 Components in one table

| Layer | Component | Responsibility | Repo location (proposed) |
|---|---|---|---|
| Source of truth | Walkthrough YAML | Per-video beat list, captions, timings, mock URL, provenance metadata | `data/walkthroughs/<name>.yml` |
| Source of truth | Caption style | Font, size, position, padding, contrast — shared across videos | `data/walkthroughs/_shared/captions.style.json` |
| Source of truth | Mock surfaces | Static HTML / CSS pages used as the "demo tenant" — no real DB, no real `tenant_id` | `data/walkthroughs/_mocks/<name>/` |
| Runtime | Playwright runner | Loads YAML, opens headless Chromium, executes beats, records WebM | `scripts/video/run-walkthrough.mjs` |
| Runtime | FFmpeg wrapper | WebM → MP4, burns captions, writes `.vtt`, no audio | `scripts/video/encode-mp4.mjs` |
| Runtime | Provenance writer | Emits `.provenance.json` per LR-Proof-1 plan § 6.3 | `scripts/video/write-provenance.mjs` |
| Runtime | Local mock server | Serves `data/walkthroughs/_mocks/` on `127.0.0.1:4173` during the workflow | inline (`npx serve` or a 20-line Node static server) |
| Orchestration | GitHub Actions | Manual dispatch; checkout, install, run, upload artifacts | `.github/workflows/generate-walkthrough-video.yml` |
| Storage (pre-sign-off) | Workflow artifact | 90-day default retention; downloadable via `gh run download` or the Actions UI | GitHub Actions storage |
| Storage (post-sign-off) | Same-origin static | `.mp4` + `.vtt` + manifest entry committed in a Phase 2 PR | `public/assets/video/lead-rescue/` |

## 4. Walkthrough YAML schema

The YAML walkthrough is the single source of truth for what a video shows. Editing the YAML and re-running the workflow regenerates the entire video. The schema mirrors `docs/marketing/03_CONTENT_ATOM_SCHEMA.md` style (id, status, owner, last reviewed) so the same retrieval and approval discipline applies.

### 4.1 Schema (proposed v1)

```yaml
walkthrough:
  id: "CF-VID-0001"
  status: "draft | approved | deprecated"
  owner: ""
  last_reviewed: "YYYY-MM-DD"
  next_review_due: "YYYY-MM-DD"

  meta:
    title: "Lead Rescue — 45 to 60 second silent walkthrough (v1)"
    target_surface: "https://corpflowai.com/lead-rescue"
    target_quality_gate_lift: "Conversion logic 1/2 -> 2/2"
    target_duration_seconds_min: 45
    target_duration_seconds_max: 60
    output_basename: "lead-rescue-walkthrough-v1"
    aspect_ratio: "16:9"
    resolution: "1280x720"
    framerate_fps: 30
    audio: "none"
    locale: "en"

  mock:
    base_url: "http://127.0.0.1:4173"
    served_from: "data/walkthroughs/_mocks/lead-rescue-v1/"
    real_tenant_used: false
    real_telegram_used: false
    real_pii_present: false
    representational_marker: "Representational example only"

  caption_style_ref: "data/walkthroughs/_shared/captions.style.json"

  disclosure:
    final_card_html_ref: "data/walkthroughs/_shared/disclosure-card.html"
    final_card_duration_seconds: 3
    text:
      - "Representational example only"
      - "No real client data, no real Telegram resources"
      - "Visual generated and assisted by AI tooling, reviewed by humans"

  beats:
    - id: 1
      start_seconds: 0
      duration_seconds: 5
      action:
        type: "navigate"
        url: "/morning-view"
      caption: "A small business owner opens the morning view"
      cursor: "hidden"

    - id: 2
      start_seconds: 5
      duration_seconds: 6
      action:
        type: "wait_and_highlight"
        selector: "[data-walkthrough='enquiry-card-1']"
      caption: "An enquiry came in overnight from the website form"

    - id: 3
      start_seconds: 11
      duration_seconds: 6
      action:
        type: "show_overlay"
        overlay_html_ref: "data/walkthroughs/_mocks/lead-rescue-v1/overlays/telegram-style.html"
      caption: "A redacted alert was already sent to the operator"

    # ... beats 4 through 9 ...

    - id: 10
      start_seconds: 50
      duration_seconds: 7
      action:
        type: "show_disclosure_card"
      caption: ""

  provenance:
    walkthrough_yaml_sha: "<filled at runtime by write-provenance.mjs>"
    workflow_run_id: "<filled at runtime>"
    workflow_run_url: "<filled at runtime>"
    repo_commit_sha: "<filled at runtime>"
    playwright_version: "<filled at runtime>"
    ffmpeg_version: "<filled at runtime>"
    generated_at_iso: "<filled at runtime>"
    ai_tooling_disclosed: true
    human_review_required: true
    final_cut_signed_off_by: "Anton (recorded as Operator decision on issue #249)"
```

### 4.2 Schema notes

- **`id`** — `CF-VID-NNNN` matches the `CF-MKT-NNNN` and `CF-PROOF-NNNN` patterns elsewhere; the catalog stays consistent.
- **`status`** — only `approved` walkthroughs may be referenced by Phase 2 PRs. `draft` walkthroughs may be regenerated freely; their artifacts are not committed.
- **`mock.real_*` flags** — explicit booleans the runner asserts before recording. If any flag is `true`, the runner refuses to start and the workflow fails. This is the runtime enforcement of LR-Proof-1's "no real client data, no real Telegram, no real PII" hard limit.
- **`beats[].action.type`** — restricted set: `navigate`, `wait`, `wait_and_highlight`, `click`, `scroll`, `show_overlay`, `hide_overlay`, `show_disclosure_card`. New action types require a schema bump and a build-packet extension.
- **`beats[].caption`** — empty string when no caption is desired (e.g. the disclosure card frame). Captions are burned in by FFmpeg `drawtext` per the `caption_style_ref`.
- **`provenance`** — fields with `<filled at runtime>` are written by `write-provenance.mjs` after the encode finishes. The result is a sibling `.provenance.json` file alongside the `.mp4`, packaged in the same workflow artifact.

### 4.3 Why YAML and not JSON

YAML supports human-friendly multi-line strings for caption text, and inline comments for "why this beat exists" notes that survive code review without polluting the rendered video. The runner parses YAML once and validates against a JSON Schema check at startup.

## 5. Playwright runner (`scripts/video/run-walkthrough.mjs`)

### 5.1 Responsibility

Take a walkthrough YAML, drive headless Chromium through every beat in order, and emit a single WebM file capturing the full session.

### 5.2 Behavior contract

1. Read and validate the walkthrough YAML against the JSON Schema check.
2. Assert all `mock.real_*` flags are `false`. Refuse to start otherwise.
3. Verify the local mock server is reachable on `mock.base_url`. Refuse to start otherwise.
4. Launch headless Chromium with:
   - `viewport: 1280 x 720`
   - `deviceScaleFactor: 2` (higher pixel density for crisp captions)
   - `recordVideo.dir = .artifacts/raw/`
   - `recordVideo.size = 1280 x 720`
   - `colorScheme: light`
   - `reducedMotion: reduce` (consistent rendering across runs)
5. Execute beats sequentially. For each beat:
   - Honour the start time (compare to wall clock since recording started; sleep if needed to maintain timing).
   - Execute the action (`navigate`, `wait_and_highlight`, etc.).
   - Move the cursor offscreen unless the beat explicitly opts in to a visible cursor.
   - Stay on the beat for the full `duration_seconds`.
6. Emit `.artifacts/raw/walkthrough.webm`.
7. Write a runner log at `.artifacts/raw/run.log.json` with per-beat actual timings (used by the encode step to align captions exactly to recorded frames, not to YAML-claimed timings).

### 5.3 What the runner does NOT do

- Does not call any production URL.
- Does not load any non-mock domain.
- Does not connect to any real DB, Telegram bot, or analytics endpoint.
- Does not capture audio (audio device is disabled at the Chromium launch flags).
- Does not commit anything to the repo.

### 5.4 Determinism

- Same YAML + same mock + same Playwright version + same Chromium build = visually identical recording (to within sub-pixel anti-aliasing differences). The pipeline is therefore re-runnable for review iterations.
- The mock surfaces (`data/walkthroughs/_mocks/`) are static HTML/CSS so there is no time-of-day variability, no random data, no animation drift.

## 6. Caption / overlay pipeline (`scripts/video/encode-mp4.mjs`)

### 6.1 Responsibility

Take the WebM emitted by the runner plus the runner log plus the beat list and produce a final-cut MP4 and a companion `.vtt`.

### 6.2 Pipeline steps

1. Read `.artifacts/raw/walkthrough.webm` and `.artifacts/raw/run.log.json`.
2. For each beat with a non-empty `caption`, build an FFmpeg `drawtext` filter using the `caption_style_ref` typography rules (font file shipped under `data/walkthroughs/_shared/fonts/`, size, position, padding, contrast, drop shadow).
3. For the final disclosure card beat, fade in the disclosure card HTML (rendered by Playwright as a single still image during the runner step) — this avoids the need for FFmpeg to render HTML.
4. Concatenate filters into one `-vf "...,drawtext=...,drawtext=...,..."` command.
5. Re-encode to MP4 with H.264 video codec (`libx264`), `crf 22` (visually lossless for 720p captioned content), 30 fps, no audio track (`-an`), `+faststart` for streaming-friendly seek.
6. Write `.artifacts/lead-rescue-walkthrough-v1.mp4`.
7. Generate `.artifacts/lead-rescue-walkthrough-v1.vtt` from the same beat captions, using actual timings from the runner log. The `.vtt` is for HTML5 `<track kind="captions">` so accessibility tooling sees machine-readable captions in addition to the burned-in visual ones.

### 6.3 Why both burned-in and `.vtt`

Burned-in captions are mandatory for autoplay-without-sound contexts (most marketing surfaces). The `.vtt` is mandatory for screen-reader and search-indexing accessibility. Doing both costs nothing extra and is the standard pattern.

### 6.4 Style consistency across videos

`data/walkthroughs/_shared/captions.style.json` carries the typography (font, size, position, padding, contrast, drop shadow). All future walkthroughs reference the same file. Brand consistency across videos is a single PR away.

## 7. Provenance writer (`scripts/video/write-provenance.mjs`)

### 7.1 Responsibility

Emit the `.provenance.json` file required by `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 6.3.

### 7.2 Output shape

```json
{
  "walkthrough_id": "CF-VID-0001",
  "walkthrough_yaml_sha": "<git SHA of the YAML at run time>",
  "repo_commit_sha": "<full SHA of the workflow run's checkout>",
  "workflow_run_id": "<GH Actions run id>",
  "workflow_run_url": "https://github.com/.../actions/runs/<id>",
  "playwright_version": "<from package.json>",
  "chromium_version": "<from Playwright>",
  "ffmpeg_version": "<from `ffmpeg -version`>",
  "node_version": "<from `process.version`>",
  "generated_at_iso": "<ISO timestamp at encode finish>",
  "ai_tooling_disclosed": true,
  "human_review_required": true,
  "real_tenant_used": false,
  "real_telegram_used": false,
  "real_pii_present": false,
  "final_cut_signed_off_by": null,
  "final_cut_signed_off_at_iso": null,
  "phase_2_authorisation_comment_url": null
}
```

### 7.3 Filling the sign-off fields

The last three fields stay `null` when the artifact is uploaded by the workflow. The Phase 2 PR (which Cursor authors after Anton signs off) updates them to:

```json
  "final_cut_signed_off_by": "Anton",
  "final_cut_signed_off_at_iso": "<ISO timestamp from the issue comment>",
  "phase_2_authorisation_comment_url": "https://github.com/.../issues/249#issuecomment-<id>"
```

This makes the `.provenance.json` the audit-trail anchor for *which video is on production, generated by which YAML at which commit, signed off by whom, when*.

## 8. GitHub Actions workflow shape (`.github/workflows/generate-walkthrough-video.yml`)

### 8.1 Trigger

`workflow_dispatch` only. No automatic runs on push, no schedule, no PR-triggered runs. The pipeline only runs when an authorised user clicks `Run workflow` and supplies the walkthrough id.

### 8.2 Inputs (proposed)

| Input | Type | Required | Description |
|---|---|---:|---|
| `walkthrough_id` | string | yes | The `CF-VID-NNNN` id; the workflow loads `data/walkthroughs/<id-slug>.yml` |
| `dry_run` | boolean | no, default `false` | If `true`, runs the YAML schema check and the mock-server probe but skips Playwright + FFmpeg. Useful for validating walkthrough edits cheaply. |

### 8.3 Steps (skeleton, conceptual — actual YAML lives in the build packet)

```yaml
name: Generate walkthrough video

on:
  workflow_dispatch:
    inputs:
      walkthrough_id:
        description: "Walkthrough id (CF-VID-NNNN)"
        required: true
      dry_run:
        description: "Validate without rendering"
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@<pinned-sha>
      - uses: actions/setup-node@<pinned-sha>
        with:
          node-version-file: ".nvmrc"
          cache: "npm"
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Install FFmpeg
        run: sudo apt-get update && sudo apt-get install -y ffmpeg
      - name: Validate walkthrough YAML
        run: node scripts/video/validate.mjs --id "${{ inputs.walkthrough_id }}"
      - name: Start mock server
        if: ${{ inputs.dry_run == false }}
        run: node scripts/video/serve-mock.mjs --id "${{ inputs.walkthrough_id }}" &
      - name: Run walkthrough
        if: ${{ inputs.dry_run == false }}
        run: node scripts/video/run-walkthrough.mjs --id "${{ inputs.walkthrough_id }}"
      - name: Encode MP4 + VTT
        if: ${{ inputs.dry_run == false }}
        run: node scripts/video/encode-mp4.mjs --id "${{ inputs.walkthrough_id }}"
      - name: Write provenance
        if: ${{ inputs.dry_run == false }}
        run: node scripts/video/write-provenance.mjs --id "${{ inputs.walkthrough_id }}"
      - name: Upload artifact
        if: ${{ inputs.dry_run == false }}
        uses: actions/upload-artifact@<pinned-sha>
        with:
          name: walkthrough-${{ inputs.walkthrough_id }}-${{ github.run_id }}
          path: .artifacts/
          retention-days: 90
```

The `<pinned-sha>` placeholders are the supply-chain pinning policy from CorpFlowAI's existing CI (full commit SHAs, not floating tags) — the build packet fills these in.

### 8.4 Permissions

`permissions: contents: read` only. The workflow does **not** need `contents: write`, `pull-requests: write`, or any other elevated scope. It does not push commits, does not open PRs, does not comment on issues. Anton's review and sign-off happen out-of-band.

### 8.5 Why GitHub Actions and not a paid VPS

- **Free for public repos** within generous monthly minute budgets; this repo is private but the per-run cost at 15 minute cap is negligible against the included budget.
- **Already part of CorpFlowAI's CI** — adding one workflow file does not introduce new infra.
- **Ephemeral runners** — every video render starts from a clean Ubuntu image, so there is no drift from a long-lived server.
- **Audit trail** — every run has a permanent URL with logs, captured artifacts, and the commit SHA used. This is precisely what the `.provenance.json` cross-references.

### 8.6 What this is NOT

- Not a self-hosted runner. The workflow uses GitHub-hosted runners only, to keep the supply-chain story simple.
- Not a recurring schedule. No `on: schedule:` block. Videos render only on explicit dispatch.

## 9. Outputs and storage policy

### 9.1 During the workflow run

All outputs land in `.artifacts/` (workflow-local, gitignored already). The `actions/upload-artifact` step packages the directory as a single workflow artifact named `walkthrough-<id>-<run_id>`, with **90-day retention** by default.

### 9.2 After the workflow run, before sign-off

Anton (or any reviewer with repo access) downloads the artifact via:

- The Actions UI (Summary tab → Artifacts section), or
- `gh run download <run-id>`

The `.mp4` is reviewed locally. The `.vtt` is opened in a text editor for caption-text review. The `.provenance.json` is read to confirm versions and SHAs.

If the cut is **rejected**, no commit happens; the artifact eventually expires; the YAML or mock surfaces are edited; the workflow is re-run.

If the cut is **approved**, Anton issues an `### Operator decision` on #249 authorising LR-Proof-1 Phase 2 (or the matching Phase 2 for whichever video this is).

### 9.3 After sign-off (Phase 2 packet — separate)

A Phase 2 PR (Cursor-authored, scope-limited) commits:

```
public/assets/video/lead-rescue/
  lead-rescue-walkthrough-v1.mp4
  lead-rescue-walkthrough-v1.vtt
  lead-rescue-walkthrough-v1.provenance.json
```

…and wires the `<video>` + `<track>` element into the page. The Phase 2 PR is its own packet with its own Quality Gate score and its own live verification (`/lead-rescue` re-scored to 13/14 expected).

### 9.4 What lives where after Phase 2

| File type | Repo location | Same-origin URL on production |
|---|---|---|
| `.mp4` | `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` | `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` |
| `.vtt` | `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.vtt` | `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.vtt` |
| `.provenance.json` | `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.provenance.json` | not linked from the page; lives in the repo for audit |
| Walkthrough YAML | `data/walkthroughs/lead-rescue-walkthrough-v1.yml` | not served on production |
| Mock surfaces | `data/walkthroughs/_mocks/lead-rescue-v1/` | not served on production |

## 10. Integration with the existing LR-Proof-1 sign-off gate

The seven Phase 1 choices Anton approved at issuecomment-4569335854 stay binding. This pipeline does not loosen them. Specifically:

- **Decision 1 (demo tenant `demo-lead-rescue-validation`)** — implemented as `data/walkthroughs/_mocks/lead-rescue-v1/`. No real Postgres tenant is provisioned. The runner asserts `mock.real_tenant_used == false`.
- **Decision 2 (redacted Telegram-style overlay)** — implemented as static HTML/CSS at `data/walkthroughs/_mocks/lead-rescue-v1/overlays/telegram-style.html`. No real Telegram chat id, no real bot, no production Telegram secrets. The runner asserts `mock.real_telegram_used == false`.
- **Decision 3 (silent + burned-in captions)** — implemented as `audio: "none"` in YAML, FFmpeg `-an`, and per-beat `drawtext` filters. No narration in any form.
- **Decision 4 (OBS Studio preferred)** — superseded by this proposal *iff* approved. OBS path stays valid as a fallback if Anton or a contractor wants to record a one-off without the pipeline.
- **Decision 5 (same-origin hosting later)** — unchanged. The Phase 2 PR commits `.mp4` to `public/assets/video/lead-rescue/`. The pipeline does not commit anything itself.
- **Decision 6 (production owner = Anton or contractor)** — superseded by *Anton or anyone with workflow-run permission*. Cursor still does not press `Run workflow` autonomously. The trigger is `workflow_dispatch` precisely so the run is operator-initiated.
- **Decision 7 (Anton alone signs off the final cut)** — unchanged. Anton downloads the artifact, watches the `.mp4`, and posts the `### Operator decision` authorising Phase 2.

If the proposal is approved, the seven choices need a small amendment recorded on #249 noting that choices 4 and 6 shift in implementation while keeping the spirit. Cursor can draft that amendment as a follow-up `### Operator decision` mirror after Anton signs off the proposal.

## 11. Hard limits (carried forward, unchanged)

This proposal — and any future build packet that implements it — must respect:

- No autonomous merges. Every PR (this one, the build packet, the Phase 2 packet) is merged by Anton.
- No runtime changes without approval. This proposal is docs-only; the build packet adds runtime code (Node scripts + workflow file) that requires its own approval.
- No payment-gateway changes.
- No env vars / secrets / DNS / DB / `tenant_id` / analytics / Plausible / Search Console / Telegram behavior / Vercel config / GitHub settings / deployment settings without explicit approval.
- No real client data, real PII, real customer names, real phone numbers, real email addresses, real `tenant_id` values, or real Telegram resources in any frame, any caption, any mock, any provenance file.
- No `.mp4` / `.vtt` / video files committed to the repo until Anton has signed off the final cut. The pipeline outputs land in workflow artifacts, not in the repo.
- No claim, on any rendered video frame or caption, that is not already approved on the live `/lead-rescue` page or in `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`. Captions cannot say things the page cannot say.

## 12. Failure modes, retries, observability

### 12.1 Failure modes the pipeline must handle

| Failure | Detection | Behavior |
|---|---|---|
| YAML schema invalid | `validate.mjs` step fails | Workflow fails fast; no recording; no artifact; clear error log |
| Mock server fails to start | Probe step fails before runner | Workflow fails fast; clear error log |
| `mock.real_*` flag is `true` | Runner refuses to start | Workflow fails fast; the YAML is wrong by construction |
| Playwright timeout on a beat (selector not found, navigation failure) | Runner exits non-zero | Workflow fails fast; runner log uploaded as artifact for diagnosis |
| FFmpeg drawtext filter syntax error (e.g. caption with quotes) | Encode step fails | Workflow fails; runner WebM is uploaded so the encode can be re-attempted locally with a fix |
| Disk full on runner (unlikely) | Ubuntu runner has ~14 GB free; our outputs are ~30 MB | Defensive `df` step before encode |
| Rendered video duration outside `[target_duration_seconds_min, target_duration_seconds_max]` | Post-encode `ffprobe` check | Workflow warns (does not fail) so Anton knows to revisit beat timings before sign-off |

### 12.2 No retries inside the workflow

The pipeline runs deterministically once. If it fails, the operator re-runs the workflow. Implicit retries inside the runner can mask flaky beats that should be fixed at the YAML level instead of papered over.

### 12.3 Observability

- GitHub Actions provides logs per step automatically.
- The runner emits a structured `run.log.json` for per-beat actual timings and any selector-resolution warnings.
- The `.provenance.json` carries all version + SHA pinning so a regression three months from now can be diffed against a known-good run.

## 13. Cost / dependencies / runtime budget

### 13.1 New dependencies (added in the build packet, not here)

| Dependency | Purpose | Where it lives |
|---|---|---|
| `playwright` | Headless Chromium driver + video recorder | `package.json` (devDependencies) |
| `js-yaml` (or already-present equivalent) | Parse walkthrough YAML | `package.json` (devDependencies) |
| `ajv` (likely already present) | Validate YAML against JSON Schema | `package.json` (devDependencies) |
| FFmpeg (system) | WebM → MP4 + drawtext | Installed by `apt-get` in the workflow |

The dependency surface is small and broadly used. No bespoke video tooling, no commercial library.

### 13.2 GitHub Actions minute usage

| Step | Approx. minutes |
|---|---:|
| Checkout + Node setup + npm ci | 1 to 2 |
| Playwright browser install | 1 to 2 |
| FFmpeg apt install | 0.5 |
| Validate YAML | < 0.1 |
| Start mock server | < 0.1 |
| Runner (record 60 seconds of video) | ~ 1 to 2 (real-time recording) |
| Encode MP4 + VTT | ~ 0.5 to 1 |
| Write provenance | < 0.1 |
| Upload artifact | < 0.5 |
| **Total per run** | **~ 5 to 8 minutes** |

GitHub-hosted Linux minutes are billed at 1x. At even 20 runs per month for first-pass + iteration, this fits comfortably within the included quota.

### 13.3 Storage cost

90-day default artifact retention; ~30 MB per run; trivial against the included artifact storage budget. After Phase 2, the `.mp4` lives in the repo, which adds ~5–15 MB to repo size per video — manageable.

## 14. Comparison to the OBS path (and when each wins)

| Scenario | OBS-on-laptop wins | Server pipeline wins |
|---|---|---|
| One-off video, you want it produced today, you have OBS already | x |  |
| Video #2, #3, #4… over the next year |  | x |
| You want to iterate captions cheaply (re-render in 5 min vs re-record in 30) |  | x |
| You want a repeatable artifact tied to a specific commit + YAML SHA |  | x |
| You want to hand recording to a contractor without onboarding them on OBS |  | x |
| You only ever need one video and never a second |  x |  |
| You want the recording session to be inspectable + diffable in code review |  | x |
| You want to record real human interaction (mouse hesitation, scroll feel) | x |  |
| You want a video that looks "as if a person used the system" with imperfect timing | x |  |

For LR-Proof-1 specifically, the silent + burned-in-captions + redacted-overlay design *favours* the pipeline because it removes the two things humans do better than scripts: real narration and real navigational hesitation. There is no narration; the script-driven cursor is acceptable.

## 15. Phased build plan (separate packets, separately approved)

This proposal authorises only itself (docs). Each subsequent step is a separate packet with its own approval gate. The proposed sequence:

| Packet | Scope | Trigger to start | Approver |
|---|---|---|---|
| **LR-Proof-2 proposal (this PR)** | This document only | Anton's "deploy option A ASAP" | Anton merges this PR |
| **LR-Proof-2 build** | Add Node scripts + GH Actions workflow + first walkthrough YAML + first mock surfaces. No `.mp4` committed. Run the workflow once and upload an artifact for review. | This proposal merged; Anton approves the build scope | Anton merges the build PR |
| **LR-Proof-2 first cut** | First workflow run produces `lead-rescue-walkthrough-v1` artifact for Anton's review | Build PR merged; operator clicks `Run workflow` | Anton signs off the cut on #249 |
| **LR-Proof-1 Phase 2** | Commit `.mp4` + `.vtt` + `.provenance.json` into `public/assets/video/lead-rescue/`; wire `<video>` + `<track>` into `pages/lead-rescue.js`; update visual asset manifest; re-score `/lead-rescue` against Quality Gate | First cut signed off by Anton on #249 | Anton merges the Phase 2 PR; live-verifies on `https://corpflowai.com/lead-rescue` |
| **Pipeline extension #1** (optional, later) | Extract `data/walkthroughs/_shared/` into a clear convention; add a second walkthrough (e.g. apex page) | Anton requests a second video | Anton approves scope |

Each packet is small, reviewable, reversible. No packet bundles a build with a Phase 2 commit.

## 16. Open decisions Anton needs to make to unblock the build packet

These are the decisions the build packet's `### Operator decision` will need answered. Default recommendations are noted; "no answer" defers the build packet without prejudice.

1. **Walkthrough id** for the first video — recommended `CF-VID-0001`. Alternatives welcome.
2. **`output_basename`** for the first video — recommended `lead-rescue-walkthrough-v1`. Used in artifact names, file names on production.
3. **Resolution / framerate** — recommended `1280 x 720 @ 30 fps`. Alternative: `1920 x 1080 @ 30 fps` (larger files, sharper, ~3x size). 720p is sufficient for embedded landing-page video.
4. **Total target duration** — recommended `45 to 60 seconds` (matches LR-Proof-1 design). The actual final cut may be shorter; the upper bound is the gate.
5. **Workflow-run permission** — recommended: anyone with **write** access to the repo can dispatch (i.e. you, Cursor with repo write, future contractors with explicit access). Alternative: restrict to repo admin only.
6. **Mock surface fidelity** — recommended Path A from the LR-Proof-1 prep brief (visual-only mocks, zero runtime impact, simplest). Alternative: Path B (a real ephemeral demo tenant — more work, no commercial benefit for v1).
7. **First-cut review channel** — recommended: Anton downloads the artifact and posts the `### Operator decision` directly on #249. Alternative: Cursor opens a review-only PR linking to the artifact and adding the `.provenance.json` for inspection (no `.mp4` committed). The PR approach gives a clearer paper trail; the direct-comment approach is faster.
8. **Caption typography / brand** — recommended: a single shared style file `data/walkthroughs/_shared/captions.style.json` with safe defaults (sans-serif, 28 px, bottom-center, semi-opaque dark band, white text, 1 px shadow). Alternative: Anton specifies brand-consistent typography upfront.

## 17. What this proposal does NOT decide

- Does not decide who records the LR-Proof-1 Phase 1 video if Anton chooses to **not** approve the build packet. The OBS-on-laptop path remains valid in that case.
- Does not decide the Lead Rescue payment path (still open; recommended default `manual USD invoice first`).
- Does not decide whether the apex `/` gets a separate walkthrough or shares the lead-rescue one. Future packet.
- Does not decide whether pre-pilot validation videos count as a substitute for real-client testimonials in the Quality Gate proof score. They do not. Validation video raises Conversion logic, not Proof and trust. (Confirming the LR-Proof-1 plan § 6 stance.)

## 18. References

- LR-Proof-1 plan: `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`
- LR-Proof-1 Phase 1 prep brief: Operator Bridge #249 issuecomment-4569120376
- LR-Proof-1 Phase 1 seven approved choices: Operator Bridge #249 issuecomment-4569335854
- Marketing Execution Pack:
  - `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`
  - `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`
  - `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`
  - `docs/marketing/03_CONTENT_ATOM_SCHEMA.md`
  - `docs/marketing/04_DELIVERY_QUALITY_GATE.md`
  - `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`
- Brand and conversion doctrine: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- Off-laptop migration discipline: `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- Brain vs hands philosophy: `docs/EXECUTION_BRAIN_VS_HANDS.md`
- Delivery reality + live-verification rules: `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`
- Operator Bridge runbook (now includes the human-readable summary requirement): `docs/runbooks/OPERATOR_BRIDGE.md`

## 19. Glossary

- **Walkthrough YAML** — the source-of-truth file describing one video, beat-by-beat.
- **Beat** — one timed unit of the video. A beat has a start time, duration, action, and optional caption.
- **Mock surface** — the static HTML/CSS pages served on `127.0.0.1:4173` during a render. No real backend.
- **Final cut** — the encoded MP4 + VTT + provenance JSON produced by one workflow run.
- **Phase 1** (LR-Proof-1) — produce and sign off the first cut.
- **Phase 2** (LR-Proof-1) — commit the signed-off cut into `public/` and wire it into the page.
- **Build packet** — the *next* packet (separately approved) that adds the actual Node scripts + workflow + first walkthrough YAML to make this proposal executable.
- **Provenance file** — `.provenance.json` accompanying every rendered video, recording what produced it and who signed it off.
