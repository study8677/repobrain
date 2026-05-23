# CorpFlow Execution Packet Standard (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton (project owner), Cursor agents, contractors
**Companion docs:** `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
**Cross-refs:** `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`, `.cursor/rules/commit-push-doc-constraints.mdc`, `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/CORPFLOW_SHARED_TODO.md`

---

## 1. Purpose

A **work packet** is the unit Anton approves **once**. After approval, Cursor (or a contractor) may execute everything inside the packet up to its **next approval gate** without further line-by-line sign-off.

The packet exists so that:

- Anton stops being the **runtime bottleneck** for safe, repeatable work.
- Autonomy is **bounded** — agents may only do what the packet (and `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`) explicitly allow.
- Everything is **evidence-first**: a packet is not "done" until it produces verifiable artifacts (URLs, deployment IDs, test runs, screenshots) recorded in repo and/or CMP.
- Reviews and rollbacks are **fast**: every packet declares its blast radius and how to reverse it before work starts.

If a unit of work cannot be expressed as a packet using the structure below, it is **not yet ready** for autonomous execution. Anton should refuse to approve it and request a rewrite.

---

## 2. Mandatory packet structure

Every work packet **must** contain the following fields, in this order. Missing or empty fields → packet is rejected.

### 2.1 Goal

One sentence in plain language. Describes the **outcome**, not the steps.

> Good: *"Confirm Infisical → Vercel env sync model is documented and verified for `POSTGRES_URL` and the n8n email webhook secret."*
> Bad: *"Update some docs about secrets."*

### 2.2 Definition of Done (DoD)

A bullet list of **observable, testable** conditions. Each item is a yes/no check, not a vibe.

DoD items must be phrased so a reviewer (or future agent) can answer **YES / NO / PARTIAL** without re-running the original conversation.

> - [ ] `docs/operations/POSTGRES_PROVIDER.md` exists and is linked from `AGENTS.md` Must-read table.
> - [ ] `npm test` passes locally.
> - [ ] `npm run build` passes locally.
> - [ ] PR opened against `main`, CI green.

### 2.3 Scope

Explicit **in-scope** and **out-of-scope** lists. Any work item not named in **in-scope** must be deferred to a follow-up packet, even if Cursor notices it is "obviously needed".

> **In scope:** `docs/operations/POSTGRES_PROVIDER.md`, `AGENTS.md` Must-read row.
> **Out of scope:** Migrating data, rotating credentials, changing Prisma schema.

### 2.4 Constraints

Hard rules the packet **must not violate**. This is where Anton restates the boundary that protects the system. Examples:

- Docs-only PR.
- Do not change runtime code.
- Do not touch secrets (no value pasted into chat, repo, or `artifacts/`).
- Do not mutate `tenant_id` or any production data.
- Do not deploy production.
- Do not alter CI workflows.
- Do not bypass `.cursor/rules/security-sensitive-changes.mdc`.

Constraints inherit from `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` automatically; the packet only needs to **add** restrictions tighter than the global policy.

### 2.5 Risks

Briefly name the **plausible failure modes** and their blast radius. One line each.

> - Risk: doc names a value that contradicts current Vercel env (informational mismatch). Blast radius: doc only.
> - Risk: doc references a path that does not exist (broken link). Blast radius: build/test catches in lint.

A packet with **no plausible risks** is suspicious — either the work is trivial (`OK`) or the author has not thought hard enough (`REJECT`).

### 2.6 Allowed actions

Explicit list of action categories Cursor may take during this packet, drawn from `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`. Examples:

- Read-only inspection (filesystem, GitHub API, Vercel API where read-only).
- Docs updates under `docs/`, `artifacts/`, `AGENTS.md`.
- Branch creation under `docs/*` or `chore/*`.
- Run `npm test`, `npm run build`, `pytest core/engine/tests/`.
- Open a PR (no merge).
- Capture screenshots, request bodies, and HTTP status codes from non-production hosts.

If an action category is **not listed**, it is **not allowed** for this packet, even if it is generally allowed by the policy.

### 2.7 Approval gates

The points at which **Cursor must stop and ask Anton** before continuing. Always include at least:

1. **Pre-merge gate** — PR opened, CI green, awaiting Anton's review.
2. **Pre-production gate** — any merge to `main` that would trigger Vercel Production. Cursor never merges its own PRs without an explicit "merge it" from Anton.
3. **Pre-secret-change gate** — any change to env vars, Infisical, Vercel env, GitHub secrets.
4. **Pre-DNS gate** — any hostname/route change.
5. **Pre-billing gate** — any payment/Stripe/wallet change.

Additional gates may be added per packet. **Default rule:** when uncertain whether to stop, stop.

### 2.8 Verification evidence

The artifacts the packet must **produce and record** before declaring `COMPLETE`. Use the `Delivery Reality Audit` block from `.cursor/rules/delivery-reality.mdc` for any packet that touches client-visible behavior.

Minimum evidence shape:

- **Local checks:** `npm test` summary, `npm run build` summary, link to commit.
- **Repo state:** branch name, PR URL, base commit SHA, head commit SHA.
- **Live state (if applicable):** Vercel deployment ID, deployed commit, list of live URLs tested with HTTP status and a one-line observed-vs-expected.
- **Negative checks (where relevant):** "factory-only path returned 401 to anonymous request", "tenant cannot read other tenants' data".

For docs-only packets, evidence is **PR URL + CI status + the diff itself**.

### 2.9 Rollback plan

How to reverse the change if it lands and turns out to be wrong. Always answerable in **one paragraph** before work starts.

For docs-only packets: *"Revert the PR; no runtime impact."*
For runtime packets: name the deployment to roll back to, the env var to flip, the migration to undo, or the feature flag to disable.

A packet with **no credible rollback** is not approved.

### 2.10 Owner

The human or agent **accountable** for the packet — usually Anton for approval and Cursor for execution. Distinguish:

- **Approver:** Anton (always, for v1).
- **Executor:** Cursor agent / contractor name.
- **Reviewer:** Anton, optionally a contractor or peer reviewer.

### 2.11 Status block

A small machine-friendly block kept at the **bottom** of the packet description and updated as work progresses. Suggested fields:

```text
Packet status:
- State: DRAFT | APPROVED | IN_PROGRESS | BLOCKED | AWAITING_APPROVAL | COMPLETE | FAILED
- Started:
- Last update:
- Branch:
- PR:
- Local checks: npm test = ?, npm run build = ?
- Live URLs tested:
- Deployment ID:
- Verdict: COMPLETE | PARTIAL | FAILED (per delivery-reality.mdc)
- Notes:
```

`AWAITING_APPROVAL` is the **autonomy boundary**: when Cursor reaches an approval gate, it sets this state, posts the evidence so far, and stops.

---

## 3. Worked example (template)

Copy this when drafting new packets. Keep it short — a packet is not a design doc.

```markdown
### Packet: Confirm Infisical → Vercel env sync model

- Goal: Document the current Infisical → Vercel env sync path for `POSTGRES_URL` and `N8N_EMAIL_WEBHOOK_SECRET`, so any operator can reproduce a redeploy without Anton.
- Definition of Done:
  - [ ] `docs/operations/POSTGRES_PROVIDER.md` and `docs/operations/SECRETS_SYNC.md` exist or are explicitly linked.
  - [ ] `AGENTS.md` Must-read table references the canonical sync doc.
  - [ ] `npm test` and `npm run build` pass locally on the PR branch.
  - [ ] PR opened against `main`, CI green.
- Scope:
  - In: docs only.
  - Out: changing any secret value, rotating credentials, changing Vercel project settings.
- Constraints:
  - Docs-only PR.
  - Do not paste secret values anywhere (chat, repo, screenshots).
  - Do not change CI workflows.
  - Do not deploy production.
- Risks:
  - Doc may describe an outdated step → reviewer (Anton) catches in PR review.
  - Doc may reference a path that does not exist → caught by repo links / build.
- Allowed actions:
  - Read repo, read Vercel project (no writes), read Infisical project metadata if available without secret values.
  - Edit `docs/operations/*.md`, `AGENTS.md`.
  - Branch creation, commits, PR open, CI runs.
  - `npm test`, `npm run build`.
- Approval gates:
  - Pre-merge: PR opened, CI green, await Anton.
  - Pre-secret-change: hard stop. (None expected in this packet.)
- Verification evidence:
  - Diff of new doc + AGENTS.md row.
  - PR URL, head commit SHA, CI run URL.
  - `npm test` and `npm run build` output.
- Rollback plan: Revert the PR; no runtime impact.
- Owner: Approver = Anton; Executor = Cursor agent; Reviewer = Anton.
- Packet status:
  - State: DRAFT
  - Started:
  - Last update:
  - Branch:
  - PR:
  - Local checks: npm test = ?, npm run build = ?
  - Live URLs tested: n/a (docs-only)
  - Deployment ID: n/a
  - Verdict: pending
  - Notes:
```

---

## 4. Lifecycle

```
DRAFT
  → (Anton approves, packet meets §2 + §3) APPROVED
    → (Cursor begins) IN_PROGRESS
      → (hits approval gate or external dependency) AWAITING_APPROVAL | BLOCKED
        → (Anton responds / dependency resolves) IN_PROGRESS
      → (DoD met, evidence recorded, PR ready) AWAITING_APPROVAL (pre-merge)
        → (Anton merges OR rejects) COMPLETE | FAILED
```

**Rules:**

- Cursor never advances `DRAFT → APPROVED` itself.
- Cursor never advances `AWAITING_APPROVAL (pre-merge) → COMPLETE` itself.
- Cursor **may** advance `APPROVED → IN_PROGRESS → AWAITING_APPROVAL` autonomously, including running tests, builds, opening PRs, and adding evidence.
- `COMPLETE` is reserved for **operationally complete** per `delivery-reality.mdc` — for runtime work, that means **live verified**, not just merged.

---

## 5. What this is **not**

- This is **not** a Jira/Asana/Linear replacement. Use whatever issue tracker you like; the packet is the **handoff contract** between Anton and the executor, not a project board.
- This is **not** a license to act on production. Production deploys, secrets, DNS, billing, and tenant data still require explicit Anton approval per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, regardless of what the packet says.
- This is **not** a substitute for `.cursor/rules/`. Rules always win when they conflict with a packet.

---

## 6. Cross-references

- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what may run without further approval, what must stop and ask.
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — current queue of approved packets.
- `.cursor/rules/delivery-reality.mdc` — `COMPLETE` requires live verification.
- `.cursor/rules/predeploy-decision-checks.mdc` — pre/post-deploy floor checks.
- `.cursor/rules/commit-push-doc-constraints.mdc` — definition of done for the Git step.
- `.cursor/rules/security-sensitive-changes.mdc` — extra discipline for security-relevant diffs.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — where 24/7 execution lives (cloud, not laptop).
- `docs/CORPFLOW_SHARED_TODO.md` — strategic priorities; packets should reference an item here when relevant.
