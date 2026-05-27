# Search Console execution packet — `corpflowai.com` apex (v1)

**Status:** v1 execution packet (2026-05-27). **Operator-owned.** Cursor cannot execute the DNS / account steps. Cursor verifies the public surface after Anton completes the operator steps.
**Audience:** Anton (operator), Cursor (verifier).
**Companion docs (read first; this packet is the bounded execution unit, the playbook lives elsewhere):**

- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — the **canonical operator playbook** (Anton runs in the Search Console UI). This packet wraps a bounded subset of the playbook.
- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — order of operations across surfaces.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface checklist.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape this doc follows.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — DNS + Search Console account creation are §3 Anton-only gates.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — §3.1 + §3.7 of the quality system consume the evidence from this packet.

---

## 1. Why a separate execution packet

The operator playbook in `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` covers **all surfaces** (apex, Lux, future tenants) and is structured as a reference. The execution packet is **the bounded, datable, evidence-shaped unit** for the **first rollout** — `corpflowai.com` apex only. Two reasons:

1. **Lux is intentionally deferred.** The 2026-05-25 / 2026-05-26 doctrine refinement (`20260526-plausible-internal-vs-client-facing-boundary.md`) names tenant working surfaces on the CorpFlow umbrella (e.g. `lux.corpflowai.com`) as **internal staging**, not buyer-facing marketing. Search Console verification + indexing for `lux.*` is therefore lower priority than apex; it is gated on a separate operator decision.
2. **Apex is the smallest blast radius for a first Search Console deployment.** The DNS TXT record lives on the apex zone, the property is one Domain property, the sitemap is one URL, the indexing-request batch is five URLs. If anything misfires, it misfires on the surface we control most directly.

This packet is bounded to apex. When apex is COMPLETE, a future packet picks up Lux per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 5.

---

## 2. Packet metadata (per `CORPFLOW_EXECUTION_PACKET_STANDARD.md` § 2)

- **Packet ID:** `search-console-apex`
- **Goal:** Verify `corpflowai.com` in Google Search Console, submit the apex sitemap, request indexing for the top 5 buyer-facing apex URLs, capture T+24h / T+7d / T+30d evidence, and update both the rollout playbook status table and the apex quality score.
- **Definition of Done:**
  - [ ] Apex Search Console property is **verified** via DNS TXT (the §2.2 / §3.1 of the playbook).
  - [ ] `https://corpflowai.com/sitemap.xml` submitted in Search Console → status **Success** with Discovered URLs ≥ 1.
  - [ ] Top 5 apex URLs submitted via **URL inspection → Request indexing** (per playbook § 4.5).
  - [ ] T+24h coverage shows at least the homepage **Indexed**.
  - [ ] T+7d coverage shows ≥ 4/5 of the requested URLs **Indexed** (per playbook § 4.7 DoD).
  - [ ] T+30d performance report has impressions and clicks recorded (per playbook § 4.6).
  - [ ] Evidence folder created and populated: `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/`.
  - [ ] Playbook § 12 *Status* table updated: apex row's columns 4.2 / 4.3 / 4.5 / 4.6 / DoD all marked.
  - [ ] Apex quality audit re-run (or supplemented) to credit §3.1 + §3.7 rows of the v1 quality system.
- **Scope:**
  - **In:** apex `corpflowai.com` Search Console verification, sitemap submission, indexing requests for top 5 apex URLs, evidence capture, status table updates.
  - **Out:** `lux.corpflowai.com` (deferred), `core.corpflowai.com` (not registered — operator-only surface), `aileadrescue.corpflowai.com` (future packet when shipped), any DNS change unrelated to the verification TXT record, any production deploy, any code change.
- **Constraints:**
  - No automation against the Search Console API in v1. UI-driven only per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 9.
  - No secrets created — DNS provider creds and Search Console session are Anton-owned and never enter the repo.
  - No tenant data writes; no Cursor write to Vercel or Infisical; no `tenant_id` mutation.
  - DNS TXT record lives on the **apex zone** (`@` / root), regardless of whether the property is the apex Domain property or a future subdomain prefix property.
- **Risks:**
  - TXT record placed in a wrong DNS zone (rare; mitigated by §6.1 of this packet — Anton confirms which DNS provider hosts the apex NS records first).
  - Sitemap discovered count lower than expected (mitigated by §6.2 — read `pages/sitemap.xml.js` apex branch first; do not request more URLs than the live sitemap lists).
  - Indexing requests rate-limited (mitigated by §6.3 — pace per playbook § 8).
  - T+7d coverage below 4/5 for a non-content reason (mitigated by playbook § 7 *Common failure modes*).
- **Allowed actions:**
  - **Anton:** DNS edit (apex zone, add TXT record only), Search Console UI (add property, verify, submit sitemap, request indexing, read coverage + performance reports, take screenshots), email notifications from Search Console (no auto-replies; informational).
  - **Cursor:** read repo, edit docs (this packet, the playbook § 12 status, the apex audit doc), public probes against `https://corpflowai.com/sitemap.xml` + `https://corpflowai.com/robots.txt` + the 5 indexed URLs, `npm test` / `npm run build`, branch + PR creation for any docs PR updating evidence.
- **Approval gates:**
  - **Pre-action:** Anton confirms DNS provider for the apex zone and confirms the Search Console account he is using is the long-term CorpFlow-controlled account (not a personal account that may rotate). Both are §3 hard gates per autonomous policy.
  - **Post-action:** PR opening this packet's evidence folder is pre-merge gated; Cursor opens, Anton merges.
- **Verification evidence:** Per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 10 — evidence folder, files listed below in §5.
- **Rollback plan:** Search Console verification is reversible — remove the DNS TXT record + remove the property from Search Console. No production impact. The DNS TXT record is the only side-effect outside Search Console; removing it has no other consequence.
- **Owner:** Approver = Anton. Executor = Anton (operator steps) + Cursor (verifier steps + docs).
- **Status:** PENDING — awaiting Anton's pre-action confirmation per §3 gates.

---

## 3. Operator action checklist (Anton)

Each box is ticked only when its specific evidence is captured.

### 3.1 Pre-flight (no DNS change yet)

- [ ] Confirm DNS provider for the apex zone (the registrar's NS records). Example: Cloudflare / Route 53 / GoDaddy / etc. **Where:** the registrar's UI — look at NS records on the apex.
- [ ] Confirm the Google account that will own the Search Console property is the long-term CorpFlow-controlled account (e.g. `support@corpflowai.com` or a delegate). **Why:** changing ownership later requires re-verification.
- [ ] Confirm `https://corpflowai.com/sitemap.xml` returns **200** with current public routes. **Cursor can verify** — see §4 below.
- [ ] Confirm `https://corpflowai.com/robots.txt` returns **200**, allows marketing routes, disallows operator/factory namespaces, and lists the apex sitemap URL. **Cursor can verify** — see §4 below.

### 3.2 Add the Search Console property

- [ ] Open https://search.google.com/search-console.
- [ ] **Add property** → **Domain** → enter `corpflowai.com` → continue.
- [ ] Search Console issues a TXT record value (begins with `google-site-verification=…`). **Copy** the value.

### 3.3 Add the DNS TXT record

- [ ] DNS provider → apex zone → **Add TXT record**.
  - **Name / Host:** `@` (apex / root). If the provider does not allow `@`, use blank or the apex hostname depending on the UI convention.
  - **Type:** `TXT`.
  - **Value:** the verification string from §3.2 (paste verbatim, including the `google-site-verification=` prefix).
  - **TTL:** whatever the provider's default is (usually 1 hour); shorter does not help.
- [ ] Save the record. Note the time.

### 3.4 Verify the property

- [ ] Wait 1–5 minutes for propagation. (Most providers propagate in <2 minutes; allow up to 1 hour.)
- [ ] Search Console → **Verify**.
- [ ] On success: Capture a screenshot of the **verified-property confirmation** page → save as `verified.png` in the evidence folder (§5).
- [ ] If verification times out after 1 hour: re-check the TXT record value (whitespace? wrong zone?) and retry. Do **not** keep clicking Verify in a loop — that does not help and the playbook § 7 names the diagnostic.

### 3.5 Submit the sitemap

- [ ] Search Console → **Sitemaps** → enter `https://corpflowai.com/sitemap.xml` → **Submit**.
- [ ] Wait for status to read **Success** (typically <1 hour). Refresh as needed.
- [ ] Capture **Discovered URLs** count → save as `sitemap-discovered.png` in the evidence folder.
- [ ] If discovered count is lower than expected: **stop** and flag — likely a sitemap-generation issue in `pages/sitemap.xml.js`, not a Search Console issue. Cursor will diagnose.

### 3.6 Robots.txt validation

- [ ] Search Console → **Settings** → **robots.txt** → confirm it parses with no errors.
- [ ] If the report flags `Disallow:` rules that block routes the audit expects to index: **stop** and flag — likely an issue in `public/robots.txt`. Cursor will diagnose.

### 3.7 Request indexing for the top 5 apex URLs

For each URL: **URL inspection** (top bar) → enter URL → **Request indexing**. Capture the confirmation toast.

Top 5 apex URLs (per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 4.5):

1. `https://corpflowai.com/`
2. `https://corpflowai.com/lead-rescue`
3. `https://corpflowai.com/about`
4. `https://corpflowai.com/process`
5. `https://corpflowai.com/onboarding`

For each, save the confirmation toast as `indexing-request-<N>.png` (N = 1..5) in the evidence folder.

If a URL fails inspection (`Page cannot be indexed`): do **not** retry blindly — read the diagnosis (usually `noindex` header, redirect chain, or robots disallow), drop the URL from the request batch, and surface the diagnostic in the evidence folder as `indexing-failure-<N>.txt`. Cursor will help diagnose.

### 3.8 First-week observations

- [ ] **T+24 hours** — Coverage report shows at least the homepage **Indexed**. Capture as `coverage-t+24h.png`.
- [ ] **T+7 days** — All 5 requested URLs **Indexed** (or with named errors). Capture as `coverage-t+7d.png`. If errors exist, save the error rows as `errors-t+7d.txt` (plain text).

### 3.9 First-month performance

- [ ] **T+30 days** — Performance report has impressions and clicks. Capture as `performance-t+30d.png`.

### 3.10 Closure

- [ ] Open a small docs PR (Cursor drafts) updating `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 12 status table.
- [ ] Open a small docs PR (Cursor drafts) updating the apex quality audit doc to credit §3.1 + §3.7 rows of the v1 quality system.
- [ ] Mark this packet's *Status* field in §2 above as **COMPLETE**.

---

## 4. Cursor-side verification steps

Cursor runs these in parallel / after Anton's operator steps, never bypasses them.

### 4.1 Public probe set (pre-rollout)

```text
GET https://corpflowai.com/sitemap.xml      → 200, application/xml, lists current public routes
GET https://corpflowai.com/robots.txt       → 200, text/plain, marketing-allow + operator/factory disallow + sitemap URL
GET https://corpflowai.com/                 → 200, HTML, full <head> with title/description/canonical/OG
GET https://corpflowai.com/lead-rescue      → 200, HTML, full <head>
GET https://corpflowai.com/about            → 200, HTML, full <head>
GET https://corpflowai.com/process          → 200, HTML, full <head>
GET https://corpflowai.com/onboarding       → 200, HTML, full <head>
```

If any of those returns non-200 or has an incomplete `<head>`, **stop** — Anton should not request indexing for broken URLs. A small fix PR closes the gap first.

### 4.2 Public probe set (T+24h, T+7d, T+30d)

Same 5 URLs as above. Cursor captures HTTP status + content-type + body's `<title>` + `<meta name="description">` + `<link rel="canonical">` to confirm the page Search Console is indexing is the same page we expect.

### 4.3 Quality audit update

Once §3.4 / §3.5 / §3.8 are checked, Cursor (autonomous, per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2 — read-only-then-docs PR) updates the apex audit's §3.1 + §3.7 rows of the v1 quality system. Point gains:

- §3.1 *SEO / indexing* — Search Console verification row (+1.5), Indexing-requested row (+1.5 if ≥ 4/5 by T+7d).
- §3.7 *Analytics / measurement* — Search Console verification row (+2), sitemap submitted row (+1.5 once ≥ 1 URL indexed).

Total apex score is expected to lift ~5 points across the two dimensions when this packet COMPLETEs.

### 4.4 Evidence folder population

`artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/`:

```
verified.png                         (Anton, §3.4)
sitemap-discovered.png               (Anton, §3.5)
indexing-request-1.png .. -5.png     (Anton, §3.7)
coverage-t+24h.png                   (Anton, §3.8)
coverage-t+7d.png                    (Anton, §3.8)
errors-t+7d.txt                      (Anton, §3.8 only if errors)
performance-t+30d.png                (Anton, §3.9)
probe-pre-rollout.txt                (Cursor, §4.1 — captured before Anton's §3.2)
probe-t+24h.txt                      (Cursor, §4.2)
probe-t+7d.txt                       (Cursor, §4.2)
probe-t+30d.txt                      (Cursor, §4.2)
README.md                            (Cursor, summarises the rollout — one page, dated, references this packet)
```

---

## 5. Evidence requirements summary

A row counts as evidence when:

- Screenshot: legible, full window, captured at the moment described.
- Text capture: timestamped, plain UTF-8, no secrets, no session cookies.
- Probe output: HTTP status + content-type + first 256 bytes of body (sufficient to identify the page; no need to mirror full HTML).

The folder **README.md** at closure ties everything together; without it, the evidence folder is a pile, not an audit.

---

## 6. Common pitfalls and mitigations

### 6.1 DNS TXT in the wrong zone

The most common verification failure. The TXT record must go on the **apex zone** that the registrar's NS records currently authoritatively serve. If `corpflowai.com`'s NS records point at, say, Cloudflare, but Anton edits a TXT record at the registrar's "parking" zone (different DNS provider), Search Console will not see it. **Mitigation:** confirm the DNS provider in §3.1 before §3.3.

### 6.2 Sitemap discovered count low

If the sitemap lists fewer URLs than expected, the issue is in `pages/sitemap.xml.js` (the apex branch). Cursor opens a small fix PR to add the missing route; Anton re-submits the sitemap. The sitemap is host-aware, so the apex branch differs from the Lux branch — confirm the apex branch.

### 6.3 Indexing request rate limit

Search Console rate-limits indexing requests per property (rough order: 10–20 per day per property). For 5 URLs in one day, this is well inside the limit. Pacing is in `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 8.

### 6.4 "Discovered – currently not indexed"

This status persists for 1–4 weeks after the first request on a fresh property. Mitigations are content-quality items (uniqueness of meta description, internal link reachability) — not retry volume. The playbook § 7 lists the diagnostic.

---

## 7. After apex COMPLETE — what's next

When the §2 Definition of Done is fully checked:

- This packet's *Status* in §2 becomes **COMPLETE**.
- The playbook § 12 status table's apex row is **complete**.
- The apex quality audit gains §3.1 + §3.7 rows worth ~5 points.
- A follow-on packet (`search-console-lux`) becomes the next candidate, gated by an explicit Anton decision because Lux is a tenant working surface (the 2026-05-26 doctrine note may apply differently).

---

## 8. Why Cursor cannot execute this packet

Two reasons listed for clarity in case the question recurs:

1. **DNS / Search Console account verification is a §3 Anton-only gate** per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`. Cursor cannot edit DNS or create / claim a Google account.
2. **UI-driven Search Console** is the v1 path. The API exists but: (a) requires service-account credentials Anton has not created, (b) rate-limits aggressively, (c) operator-driven inspection forces a human to read the diagnosis (which is usually the actual fix). Per `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` § 8 we deliberately do not automate URL inspection in v1.

Cursor's role here is **scoping the packet**, **verifying public-surface readiness**, **updating docs and quality scores after Anton's steps**, and **drafting the closure PR**. The operator action set is bounded and short; Anton's time on the actual operator steps is roughly 15 minutes spread over a month (with 28 days of waiting time mostly).

---

## 9. Cross-references

- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — canonical operator playbook.
- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — sequencing across surfaces.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface checklist.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §3 hard gates.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — §3.1 + §3.7 consumers of this packet's evidence.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — §4.2 of that model is blocked on this packet COMPLETEing.
- `pages/sitemap.xml.js`, `public/robots.txt` — runtime sources of truth.
