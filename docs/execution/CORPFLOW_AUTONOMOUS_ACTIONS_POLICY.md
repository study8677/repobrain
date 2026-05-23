# CorpFlow Autonomous Actions Policy (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton (project owner), Cursor agents, contractors
**Companion docs:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
**Cross-refs:** `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`, `.cursor/rules/security-sensitive-changes.mdc`, `.cursor/rules/commit-push-doc-constraints.mdc`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, `docs/EXECUTION_BRAIN_VS_HANDS.md`

---

## 1. Purpose

This policy defines what a Cursor agent (or trusted contractor operating under the same rules) **may** and **may not** do **without further approval** from Anton, once a work packet has been approved per `CORPFLOW_EXECUTION_PACKET_STANDARD.md`.

The split is deliberately conservative for v1: anything that touches **production**, **real client data**, **secrets**, **DNS**, **billing**, **auth/security logic**, or **destructive database state** stops at an approval gate, even when the packet says "go".

If a particular packet wants tighter restrictions than this policy, the **packet wins**.
If a particular packet wants looser restrictions than this policy, the **policy wins**, until the policy is amended in a separate, explicit PR Anton approves.

---

## 2. Allowed without further approval

A Cursor agent operating under an approved packet **may** do the following without re-asking, provided the packet's `Allowed actions` block lists them and the packet's `Constraints` are not violated.

### 2.1 Read-only inspection

- Read any file in this repo (including `docs/`, `lib/`, `pages/`, `api/`, `scripts/`, `prisma/`, `node-tests/`, `core/engine/`).
- Run read-only `git` commands: `git status`, `git log`, `git diff`, `git branch`, `git show`.
- Read GitHub PRs, issues, check-runs, workflow logs (via `gh` CLI or GitHub API) for **this** repo.
- Read Vercel project metadata where the API token is read-scoped (deployments list, build logs, env var **names** without values).
- Read public production URLs with `curl` / `Invoke-WebRequest` to capture HTTP status, headers, and body shape — **never** to mutate state.
- Read `lib/cmp/README.md`, `docs/operations/*`, `docs/runbooks/*`, and treat them as authoritative.

### 2.2 Documentation updates

- Add or edit files under `docs/`, `artifacts/`, `AGENTS.md`, `CLAUDE.md`, and similar agent-readable docs.
- Update `docs/CORPFLOW_SHARED_TODO.md` to mark items done **only** when the underlying work has been verified per `delivery-reality.mdc`.
- Update `artifacts/chat_history.md` per `.cursor/rules/chat-history-cadence.mdc` after substantive work.

### 2.3 Branch creation

- Create new branches under namespaces such as `docs/*`, `chore/*`, `feat/*`, `fix/*`, `refactor/*`.
- Never push directly to `main`. Never delete remote branches that are not the agent's own.
- Never force-push to shared branches (`main`, release branches, anyone else's PR branch).

### 2.4 Tests and builds

- Run `npm ci`, `npm test`, `npm run build` locally.
- Run `pytest core/engine/tests/` for the legacy Python engine when relevant.
- Run repo smoke scripts that the package.json marks as test/smoke (`npm run smoke:*`, `npm run technical-lead:run`, etc.) **only when** they are read-only or operate against non-production hosts. Any smoke that mutates production data is **not** in this category.
- Capture and persist test output as evidence in PR description or `artifacts/`.

### 2.5 Preview deploys

- Open PRs that **trigger** Vercel Preview deploys.
- Read Preview deployment URLs and exercise them with `curl` or browser-style automation **against the Preview host only** (e.g. `*.vercel.app`).
- Compare Preview behavior to expected output and record diff in PR.

Cursor **does not** promote a Preview to Production. Promotion happens by **merging the PR**, which is an Anton action under §3.

### 2.6 PR creation

- Open PRs against `main` (or another base branch Anton names) using `gh pr create` or equivalent.
- Add labels, assignees, and reviewers per repo conventions.
- Respond to PR review comments with code changes when those changes stay inside the packet's `Scope` and `Constraints`.
- Update PR body with verification evidence as work progresses.

Cursor **does not** merge PRs. Even when CI is green and the packet looks done, the agent stops at `AWAITING_APPROVAL (pre-merge)` per the packet standard.

### 2.7 Screenshots and evidence capture

- Capture screenshots of Preview UIs, local dev runs, and **read-only** views of production where the page is anonymous-public (e.g. `https://lux.corpflowai.com/` HTML).
- Save evidence into `artifacts/` (or attach to the PR) following naming conventions already in the repo. **Never** include secrets, tokens, session cookies, or PII in screenshots.
- Record HTTP status, response headers, deployment ID, and commit SHA when verifying.

### 2.8 Non-production verification

- Hit any non-production host (Preview, staging, local dev, `*.vercel.app`, sandbox tenants explicitly marked as non-production).
- Run `npm test`, `npm run build`, and similar local checks as many times as needed.
- Use the `cursor-ide-browser` MCP to drive Preview URLs and capture snapshots.

---

## 3. Requires Anton's explicit approval

A Cursor agent **must stop and ask** before taking any of the following actions, **even if the packet says "go"**. These are **hard gates**: the agent posts current evidence, sets state to `AWAITING_APPROVAL`, and waits.

### 3.1 Production deploy

- Merging any PR that lands on `main` and would build a Vercel Production deployment.
- Triggering a Vercel deploy via API/CLI to **Production**.
- Promoting a Preview to Production.
- Triggering production-bound GitHub Actions / `repository_dispatch` events.

> Why: `delivery-reality.mdc` makes "live verified" the bar; production deploys cross the irreversible boundary between **merged** and **deployed**.

### 3.2 Secret changes

- Adding, editing, rotating, or deleting any value in:
  - GitHub Actions secrets / variables.
  - Vercel project env (Production, Preview, or Development).
  - Infisical projects, environments, or secrets.
  - Any `.env*` file that is not a placeholder template.
- Pasting any **secret value** into chat, PR description, code, comments, screenshots, `artifacts/`, or commit messages. (Names of env vars are fine; values are not.)

> Why: secret leaks are unrecoverable. `.cursor/rules/security-sensitive-changes.mdc` and `docs/operations/SECURITY_REVIEW_CHECKLIST.md` apply.

### 3.3 DNS changes

- Editing DNS records, registrar settings, or Vercel domain mappings.
- Changing `tenant_hostnames` mapping for production tenants.
- Splitting traffic between deployments (e.g. apex vs `core.*`).
- Altering `CORPFLOW_FACTORY_HEALTH_URL` or any host-derived env that changes which surface CI monitors.

> Why: `predeploy-decision-checks.mdc` `## DNS / traffic split reminder` — DNS desyncs leave clients on a different host than CI is watching.

### 3.4 Billing / payment changes

- Stripe configuration, products, prices, webhooks, restricted keys.
- Tenant wallet balances, billing-exempt flags, token credits.
- Any code path that issues invoices, charges cards, or moves money.

> Why: financial blast radius and regulatory exposure.

### 3.5 Destructive DB changes

- Any `DROP`, `TRUNCATE`, destructive `UPDATE`/`DELETE` against production or staging shared with production data.
- Schema migrations that rename, drop, or change types of columns in tables containing tenant data.
- Running `prisma migrate reset`, `db push --accept-data-loss`, or equivalent on a non-empty database.
- Bulk backfills or data corrections, even when "obviously correct".

> Why: data loss is irreversible; backfills mis-targeted at `tenant_id` violate isolation.

### 3.6 Tenant migration

- Creating, deleting, renaming, or merging tenants in production.
- Moving a tenant between hostnames, between databases, or between deployments.
- Changing the canonical `tenant_id` for a customer-facing tenant.
- Any code that mutates `tenant_id` outside an explicit, approved migration packet.

> Why: tenant identity is the isolation boundary; every CMP/automation gate keys off it.

### 3.7 Auth / security logic changes

- Edits under `lib/server/` for auth, session, password, token, or PIN logic.
- Edits to `middleware.*`, login pages (`public/login.html`, `pages/login.*`), or redirect/`next=` validation.
- Edits to `lib/cmp/router.js` action gating (`requireDormantGate`, `requireFactoryMasterOnly`, `requireTenantSession`).
- Changes to webhook signature/HMAC validation or ingest secrets.

> Why: silent widening of trust is the worst class of bug; `.cursor/rules/security-sensitive-changes.mdc` requires the security review checklist.

### 3.8 Client-facing email automation

- Adding, editing, or enabling any **outbound** email path that reaches a real client mailbox.
- Wiring new event types into `lib/server/email-delivery.js` or `lib/server/communications.js`.
- Sending live test emails to any address that is not Anton's own.
- Changing sender aliases, approval rules, or auto-send conditions defined in `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.

> Why: communications doctrine — client-facing events require operator approval; auto-send is reserved for system-transactional or operator-only events.

### 3.9 Anything touching real client data beyond read-only verification

- Reading is fine for **verification** (e.g. checking that a CMP ticket exists, confirming `automation_events` has a row).
- Writing, updating, deleting, exporting, copying, or relocating real client data is **not** in scope without explicit approval.
- "Just for testing" is **never** a valid reason to write to a production tenant row.

> Why: real client data is the trust contract.

---

## 4. Behavior at a gate

When Cursor reaches a gate in §3 (or any gate the packet defines), it **must**:

1. Stop work on the gated action.
2. Update the packet status block to `AWAITING_APPROVAL`.
3. Post a concise summary in the working channel (chat, PR comment, or both) including:
   - What it was about to do.
   - Why it stopped (which §3 clause or which packet gate).
   - Current evidence (branch, PR, test results, deployment IDs if any).
   - The smallest, clearest question for Anton.
4. Wait. Do **not** explore alternative paths that bypass the gate.

If Anton answers "go", record the approval (chat link or commit message reference) and resume.
If Anton answers "no" or does not answer within the packet's stated horizon, mark the packet `BLOCKED` and stop.

---

## 5. Failure modes this policy is designed to prevent

- **Silent production deploy** — agent merges its own PR, ships an unverified change, then declares COMPLETE. Prevented by §3.1 and the pre-merge gate in the packet standard.
- **Secret in a screenshot** — agent captures a Vercel env page or `.env.local` and posts it. Prevented by §3.2 + §2.7 wording.
- **Backfill via "helpful" script** — agent decides to fix obviously wrong rows in production. Prevented by §3.5, §3.9.
- **DNS split skew** — agent toggles a domain mapping, CI keeps pinging the old host, real clients see a different surface. Prevented by §3.3 and `predeploy-decision-checks.mdc`.
- **Auth widening** — agent removes a "redundant" check in `requireDormantGate`. Prevented by §3.7 and the security review checklist.
- **Email blast** — agent wires `estimate_ready` to auto-send before the approval surface exists. Prevented by §3.8 and Communications v1.

---

## 6. Amending this policy

This document is amended only via:

- An explicit Anton-approved PR titled `policy: amend autonomous actions policy ...`.
- A clear before/after diff of the rule(s) being changed.
- A note in `docs/decisions/JOURNAL.md` recording the date, the change, and the reversibility.

Agents may **propose** amendments by drafting such a PR, but may not enable any newly relaxed rule until the PR is merged.

---

## 7. Cross-references

- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — the unit Anton approves.
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — current approved packets.
- `.cursor/rules/delivery-reality.mdc` — live verification = done.
- `.cursor/rules/predeploy-decision-checks.mdc` — pre/post-deploy + DNS reminders.
- `.cursor/rules/security-sensitive-changes.mdc` — auth, sessions, secrets, webhooks.
- `.cursor/rules/commit-push-doc-constraints.mdc` — Git-level definition of done.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required for security-relevant diffs.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — email is a sanctioned channel; rules for auto-send.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — 24/7 execution lives in cloud, not on Anton's laptop.
