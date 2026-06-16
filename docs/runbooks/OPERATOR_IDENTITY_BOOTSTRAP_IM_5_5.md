# IM-5.5 — Operator identity bootstrap (prerequisite for IM-6)

**Purpose.** Create exactly one `auth_users` row at `level='admin'` with `enabled=true` and `factory_master=true`, so that the operator's next login goes through the DB-backed lane in `lib/server/auth.js` and produces an IM-5-shaped session (`user_id`, `acting_tenant_id`, `session_version`, `factory_master`). This is the **hard prerequisite for IM-6** — without it, IM-6's `requireFactoryMasterOnly` tightening, `acting_tenant_id` enforcement, and DB-backed membership recheck have no DB-backed admin identity to bind against.

**Owner.** Operator (Anton). Cursor authors this runbook + the read-only verification script; Cursor does **not** create production rows, promote anyone, generate / receive / store / print passwords, compute production password hashes, or run non-`SELECT` SQL against Neon.

**Canonical references.**

- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` § 2.6 (factory-master capability), § Packet IM-6 (the packet this runbook unblocks), § Packet IM-8 (the eventual deprecation of bootstrap rows).
- `lib/server/auth.js` lines 55–60 (`computePasswordHash`), lines 170–210 (`tryPostgresAuthUserLogin`), lines 246–302 (`handleAuthLogin` admin branch).
- `prisma/schema.prisma` lines 49–69 (`AuthUser` model).
- `scripts/promote-factory-master.mjs` (already in repo; the only approved promotion mechanism).
- `scripts/verify-operator-identity-bootstrap.mjs` (added in IM-5.5; the only Cursor-runnable step).

---

## 1. When to use this runbook

Run this runbook only when the IM-6 readiness gate returns **NOT READY** — i.e. when production Neon has zero `auth_users` rows at `level='admin' AND factory_master=true AND enabled=true`. The most recent reading (2026-06-16 06:37 UTC) showed **zero admin rows** of any kind, which confirms the gate.

After IM-5.5 completes and the gate returns READY, return to the IM-6 approval surface and resume with the previously approved IM-6 scope (no new IM-6 approval is needed; only the gate result has changed).

---

## 2. Hard constraints (mirrored from IM-5.5 approval — 2026-06-16 10:54 UTC+4)

- Cursor must not create production rows.
- Cursor must not promote anyone.
- Cursor must not guess the username.
- Cursor must not generate, receive, store, or print Anton's password.
- Cursor must not compute a production password hash unless Anton explicitly chooses that path and runs it locally.
- Cursor must not run non-`SELECT` SQL against Neon.
- Cursor must not modify Vercel env vars.
- Cursor must not alter or remove the legacy env-master break-glass lane (`CORPFLOW_ADMIN_USERNAME` / `CORPFLOW_ADMIN_PASSWORD` / `CORPFLOW_ADMIN_PASSWORD_HASH` / `CORPFLOW_ADMIN_PASSWORD_SALT`).
- Cursor must not resume IM-6 until the IM-5.5 readiness gate returns READY.

The runbook below is written to honour each of these. Steps explicitly tagged **[OPERATOR-ONLY]** must be executed by Anton on his laptop and never via Cursor. Steps tagged **[CURSOR-OK]** may be requested of Cursor under the standing read-only authorisation.

---

## 3. Pre-flight (already true today — no action needed)

The following are already in place and do not need to be set up by this runbook:

1. **IM-1 schema is deployed.** `auth_users.factory_master` column exists (`BOOLEAN DEFAULT FALSE`); the `auth_users_factory_master_admin_only` CHECK constraint enforces `level='admin'` when `factory_master=true`. Verified by `scripts/verify-im-1-schema.mjs` post-IM-1.
2. **`scripts/promote-factory-master.mjs` is in `main`.** Idempotent, refuses `level='tenant'` rows, supports `--dry-run` and `--demote`. **No changes to this script are part of IM-5.5.**
3. **Legacy env-master lane is intact.** `lib/server/auth.js:289` falls through to `getAdminCreds()` if DB-backed login finds no row or returns an error. Anton can continue to log in via the env-master credentials throughout this runbook; the new DB-backed identity does not replace the env-master, it complements it.
4. **PBKDF2 password format is stable.** `computePasswordHash(password, salt)` in `lib/server/auth.js:55` uses `pbkdf2Sync(password, salt, 120_000, 32, 'sha256')`, hex-encoded. The salt is per-row, generated as `randomBytes(16).toString('hex')` (32-char hex). Any new admin row must store hex `password_hash` and hex `password_salt` consistent with this algorithm or login will fail.
5. **Connection target is Neon.** Confirmed by the IM-6 readiness gate run on 2026-06-16: `ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech / neondb`, PostgreSQL 17.10. Not the deprecated `db.prisma.io` shape.

---

## 4. Step 1 — Choose the admin username **[OPERATOR-ONLY]**

The username becomes the persistent operator identity. It is **case-sensitive** for admin rows (no `.toLowerCase()` in the admin login branch — `lib/server/auth.js:247` keeps the input as-is). Pick something you will recognise in audit logs for the next several years.

**Recommended:** a short, stable handle. Examples that are fine: `anton`, `anton.vandenberg`, `anton@corpflowai.com`. The auth code does not require an email-shaped username for admin rows, but matching tenant-user convention can help future audit readability.

**Not recommended:** `bootstrap+<tenant>@corpflowai.com` (this shape is the legacy operator-workaround pattern that IM-8 is designed to deprecate — do not create new bootstrap rows). Cursor will not propose a username; the choice is yours.

**Constraint:** the chosen username must not collide with an existing row. Verify with the read-only gate script in step 7 or with this single-row check (replace `<chosen-username>`):

```sql
SELECT id, username, level, enabled, factory_master
  FROM auth_users
 WHERE username = '<chosen-username>';
```

Expected: zero rows. If non-zero, choose a different username or stop and re-evaluate.

---

## 5. Step 2 — Choose the password **[OPERATOR-ONLY]**

- Generate a strong password using your password manager (1Password, Bitwarden, KeePass, or equivalent). Recommended: 20+ characters, mixed case + digits + symbols.
- Store the password in your password manager **before** moving to step 3. The password is never re-readable once you have hashed it.
- **Do not paste the password into any Cursor chat, terminal, file, or PR description.** Cursor's tooling persists terminal output and chat history; the password belongs in your password manager only.
- **Do not commit the password or the salt/hash to git.** The runbook examples below use placeholders only.

---

## 6. Step 3 — Compute the salt + hash locally **[OPERATOR-ONLY]**

The application uses PBKDF2-SHA256 with 120,000 iterations, a 32-byte derived key, and a per-row 16-byte hex salt. To produce a row that the existing `tryPostgresAuthUserLogin` lane will accept, the hash and salt must match this algorithm exactly.

The Node one-liner below reads the password from **stdin** (so it never appears in shell history, in process listings, or in Cursor's terminal logs), generates a fresh salt, and prints only `{ "salt": "...", "hash": "..." }` to stdout.

### PowerShell (Windows)

```powershell
node -e "const c=require('crypto');const r=require('readline').createInterface({input:process.stdin,output:process.stdout,terminal:false});r.question('',(pw)=>{const s=c.randomBytes(16).toString('hex');const h=c.pbkdf2Sync(pw.trim(),s,120000,32,'sha256').toString('hex');console.log(JSON.stringify({salt:s,hash:h}));r.close();});"
```

After running, the terminal will appear to hang — that is the `readline` waiting for input. Type or paste the password, press **Enter**, then press **Ctrl+D** (or close stdin) to end input. The output is a single JSON line: `{"salt":"<32-hex-chars>","hash":"<64-hex-chars>"}`.

### Bash / Zsh (macOS / Linux)

```bash
node -e "const c=require('crypto');const r=require('readline').createInterface({input:process.stdin,output:process.stdout,terminal:false});r.question('',(pw)=>{const s=c.randomBytes(16).toString('hex');const h=c.pbkdf2Sync(pw.trim(),s,120000,32,'sha256').toString('hex');console.log(JSON.stringify({salt:s,hash:h}));r.close();});"
```

### Sanity-check the output

The salt must be exactly **32 hex characters** (`/^[0-9a-f]{32}$/`). The hash must be exactly **64 hex characters** (`/^[0-9a-f]{64}$/`). If either length is wrong, do not proceed — re-run the command and ensure stdin received the password and only the password.

### Capture salt + hash to clipboard, not to a file

You only need the salt and hash for the duration of step 4. After step 4 inserts the row, the values exist in `auth_users.password_salt` and `auth_users.password_hash` and are not needed again. Do not save them to a local file.

---

## 7. Step 4 — Insert the row **[OPERATOR-ONLY]**

Two equivalent execution paths. Both end in the same DB state: one new row at `level='admin'`, `enabled=true`, `factory_master=false`, with the salt + hash from step 6, and a Prisma-generated cuid `id`.

### Path B1 — Prisma Studio (recommended for first-time admin row creation)

Prisma Studio handles the cuid generation automatically and gives you a visual confirmation before save.

1. Ensure `POSTGRES_URL` in your `.env` points at production Neon (confirmed by step 7's read-only check earlier — `ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech / neondb`).
2. From the repo root, run:

   ```powershell
   npx prisma studio
   ```

3. In the browser tab that opens, click **AuthUser** in the left rail.
4. Click **Add record**. Fill in:

   | Column | Value |
   |---|---|
   | `id` | Leave blank — Prisma will generate a cuid. |
   | `username` | The chosen username from step 4. |
   | `passwordHash` | The `hash` value from step 6 (64 hex chars). |
   | `passwordSalt` | The `salt` value from step 6 (32 hex chars). |
   | `level` | `admin` |
   | `tenantId` | Leave blank (admin rows are not bound to a tenant). |
   | `enabled` | `true` |
   | `factoryMaster` | `false` — promotion happens in step 9, not here. |
   | `createdAt` | Leave blank — DB default `now()`. |
   | `lastLoginAt` | Leave blank — nullable. |

5. Click **Save 1 change**. The new row appears in the table.
6. **Do not close Prisma Studio yet** — keep it open for step 8 to verify the row visually before promotion.

### Path B2 — psql (fallback if Prisma Studio is unavailable)

Use this only if you cannot run `npx prisma studio` locally. Cursor does **not** run this command; you run it.

```bash
psql "$POSTGRES_URL" <<SQL
INSERT INTO auth_users
  (id, username, password_hash, password_salt, level, tenant_id, enabled, factory_master, created_at)
VALUES
  (
    -- Generate a cuid client-side OR use a UUID as a fallback. For consistency with
    -- Prisma-generated ids, prefer cuid. Either of:
    --   node -e "console.log(require('@paralleldrive/cuid2').createId())"     (if cuid2 is installed)
    --   node -e "console.log(require('crypto').randomUUID())"                 (UUID fallback; works but format differs)
    '<computed-cuid-or-uuid>',
    '<chosen-username>',
    '<password-hash-from-step-6>',
    '<password-salt-from-step-6>',
    'admin',
    NULL,
    TRUE,
    FALSE,
    NOW()
  );
SQL
```

Notes:

- The `cuid()` Prisma default is application-side, not a DB default. A raw SQL INSERT must supply the `id` value explicitly. Cuid format is preferred for consistency with all other rows in the table; UUID is a functional fallback but visually distinct in audit logs.
- The trailing single statement is intentionally a plain `INSERT` with no `RETURNING` clause to keep the psql output minimal. The next step verifies the row.
- Wrap exactly one INSERT in a single command. Do **not** combine with `UPDATE auth_users SET factory_master = TRUE` in the same statement — promotion is a separate, idempotent, audited step (step 9).

### Constraints regardless of path

- `level` must be exactly `'admin'` (lowercase).
- `tenant_id` must be `NULL`. The DB CHECK constraint will reject `factory_master=true` for any non-admin row in step 9; but at this step the row is `factory_master=false` so the constraint is not yet involved.
- `enabled` must be `TRUE` (otherwise login will fail at `lib/server/auth.js:184`).
- Do not set `factory_master=true` at insert time. Setting it via `scripts/promote-factory-master.mjs` produces a deterministic, idempotent log entry in operator history (your terminal session) that is easier to audit later.

---

## 8. Step 5 — Read-only sanity check before promotion **[CURSOR-OK or OPERATOR]**

Confirm the row is what you intended **before** promoting it. Either you or Cursor may run this read-only SELECT under the standing read-only authorisation:

```sql
SELECT id, username, level, tenant_id, enabled, factory_master, created_at
  FROM auth_users
 WHERE username = '<chosen-username>';
```

Expected:

- exactly **1** row,
- `level = 'admin'`,
- `tenant_id IS NULL`,
- `enabled = true`,
- `factory_master = false`,
- `created_at` within the last few minutes.

If any of these are wrong, do **not** run step 9. Either correct the row (re-insert via Prisma Studio with the right values) or disable the row (`UPDATE auth_users SET enabled = false WHERE id = '<id>'` — Anton-only) and try again.

---

## 9. Step 6 — Promote to factory_master via the existing approved script **[OPERATOR-ONLY]**

This is the only step that mutates `factory_master`. The script is already in the repo and you may not modify it under IM-5.5.

### Dry run first (no DB writes; prints what would change)

```powershell
node scripts/promote-factory-master.mjs --username=<chosen-username> --dry-run
```

Expected output:

```
[promote-factory-master] start action=PROMOTE username=<chosen-username> dry_run=true
[promote-factory-master] found id=<cuid> level=admin tenant_id=(null) factory_master=false enabled=true
[promote-factory-master] WOULD-PROMOTE username=<chosen-username> id=<cuid>: factory_master=false -> true
```

Verify the printed `id`, `level`, `tenant_id`, `factory_master`, and `enabled` match what step 8 returned. If they do not, **stop** — the script is targeting the wrong row.

### Real promotion (single UPDATE)

```powershell
node scripts/promote-factory-master.mjs --username=<chosen-username>
```

Expected output:

```
[promote-factory-master] start action=PROMOTE username=<chosen-username> dry_run=false
[promote-factory-master] found id=<cuid> level=admin tenant_id=(null) factory_master=false enabled=true
[promote-factory-master] PROMOTE OK id=<cuid> username=<chosen-username> level=admin factory_master=true
```

### Idempotency self-test (optional but recommended)

Re-run the same command. Expected output:

```
[promote-factory-master] NO-OP factory_master already true; nothing to do (idempotent).
```

This proves the script is safely re-runnable and there was no double-promotion.

---

## 10. Step 7 — Run the read-only IM-5.5 verification script **[CURSOR-OK or OPERATOR]**

This is the only Cursor-runnable step in this runbook. The script is `scripts/verify-operator-identity-bootstrap.mjs` (added in this PR). It runs three SELECTs and prints a single verdict:

```powershell
node scripts/verify-operator-identity-bootstrap.mjs
```

Expected verdict on success:

```
[verify] VERDICT: READY
[verify] Exactly 1 enabled DB-backed admin row has factory_master=true.
[verify] That admin row has zero user_tenant_memberships rows (correct — factory_master expansion in getEffectiveMemberships handles tenant visibility, not explicit grants).
[verify] No orphan memberships were detected.
[verify] IM-6 readiness gate is now: READY.
```

If the verdict is NOT READY for any reason (more than one fm=true admin, zero fm=true admins, orphan memberships, disabled row, etc.), the script prints the exact reason and exits with code 1. Do **not** proceed to step 11 until the verdict is READY.

Cursor may run this script on request; it issues only SELECTs and does not write to disk or to Neon.

---

## 11. Step 8 — Login self-test (DB-backed lane wins) **[OPERATOR-ONLY]**

Confirm the new identity actually authenticates via the DB-backed lane:

```powershell
# Replace placeholders. Password is supplied via the inline JSON; this terminal
# command IS persisted to PowerShell history — clear it after running, or use
# a temporary file you delete.
$body = @{ level='admin'; username='<chosen-username>'; password='<chosen-password>' } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'https://core.corpflowai.com/api/auth/login' -ContentType 'application/json' -Body $body
```

Expected response: `{ "ok": true, "level": "admin", "expires_sec": 43200, "source": "postgres" }`.

The **`source: "postgres"`** field is the smoking gun — it confirms `tryPostgresAuthUserLogin` matched the new row and the DB-backed lane was used. If the response shows `source: "env"`, the env-master lane handled the request instead (likely because the username/password did not match the DB row); re-check step 4 (username) and step 6 (password hash).

### Clean up

After confirming `source: "postgres"`:

```powershell
# Clear the local session cookie so subsequent browser-based testing starts fresh.
Remove-Variable body
Clear-History -Count 5  # remove the last few commands from PowerShell history
```

(If you used Bash, the equivalent is `unset body && history -d $(history 1 | awk '{print $1}')` repeated as needed, or restart the shell.)

### Confirm env-master lane still works (escape hatch preserved)

```powershell
$envBody = @{ level='admin'; username='<env-master-username>'; password='<env-master-password>' } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'https://core.corpflowai.com/api/auth/login' -ContentType 'application/json' -Body $envBody
```

Expected response: `{ "ok": true, "level": "admin", "expires_sec": 43200, "source": "env" }`. If you see `source: "postgres"` here, the env-master username collides with the new DB-backed username — choose a different env-master username (in Vercel env vars) or rename the DB-backed row. (Likely not an issue if you picked a unique new username in step 4.)

---

## 12. Step 9 — Signal READY back to Cursor

When step 10's verification script returned `VERDICT: READY` and step 11's login test returned `source: "postgres"`, post back to the IM-6 approval thread:

> IM-5.5 readiness gate: READY. Resume IM-6 from approved scope (2026-06-16 09:34 UTC+4).

Cursor will then re-run the IM-6 readiness gate as a final sanity check and, on READY, create `feat/platform-multi-tenant-im-6` from latest `origin/main` and proceed with the previously approved IM-6 scope.

---

## 13. Rollback **[OPERATOR-ONLY]**

If IM-5.5 needs to be undone for any reason — wrong username chosen, password leaked, identity conflict with future SSO planning, change of mind — the rollback is a single SQL statement and is fully reversible:

```sql
UPDATE auth_users SET enabled = false WHERE id = '<id-from-step-8>';
```

Effect after rollback:

- The DB-backed admin row stays in the table (preserves any future audit foreign-key references) but cannot log in (`lib/server/auth.js:184` blocks `enabled=false`).
- Next login attempt for that username falls through to the env-master lane (`lib/server/auth.js:289`) **if** the username also matches `CORPFLOW_ADMIN_USERNAME`. If the new DB-backed username is different from the env-master username (recommended), the row is simply unreachable.
- IM-6 readiness gate returns NOT READY again on the next run.
- Re-enable later with `UPDATE auth_users SET enabled = true WHERE id = '<id>'` — fully reversible.

To permanently delete the row (after a cool-down period), use a separate, audited operator decision; do not delete the row as part of this rollback. Audit rows with `actor_user_id = '<id>'` would orphan if the row is hard-deleted before IM-7 ships.

---

## 14. What this runbook does NOT do

- Does **not** grant the new admin any `user_tenant_memberships` rows. Anton's tenant visibility comes from the `factory_master` expansion inside `getEffectiveMemberships` (`lib/server/effective-memberships.js:67`), which broadens to every `tenant_status='Active'` tenant when `factory_master=true`. No explicit grants are needed and the verification script in step 10 confirms zero membership rows for the new admin.
- Does **not** change Vercel env vars. The env-master lane (`CORPFLOW_ADMIN_USERNAME`, `CORPFLOW_ADMIN_PASSWORD`, `CORPFLOW_ADMIN_PASSWORD_HASH`, `CORPFLOW_ADMIN_PASSWORD_SALT`) remains exactly as it is today.
- Does **not** write `automation_events` or `telemetry_events` rows. Audit-event population is owned by IM-7; the row creation and promotion in this runbook leave no audit trail in the application-event tables for now. The `created_at` timestamp on the new `auth_users` row and the PowerShell terminal log of `promote-factory-master.mjs` are the only operator-readable artefacts.
- Does **not** alter the `automation_events`, `telemetry_events`, `cmp_tickets`, `tenants`, `user_tenant_memberships`, or any other table beyond the single new row in `auth_users`.
- Does **not** modify `lib/server/auth.js`, `lib/cmp/router.js`, `pages/change.js`, or any application code. Code changes for IM-6 happen only after this runbook's gate returns READY.
- Does **not** open IM-6's branch. `feat/platform-multi-tenant-im-6` will be created by Cursor **after** the verification script returns READY and you sign off.

---

## 15. Cross-references

- IM-5.5 approval: chat thread 2026-06-16 10:54 UTC+4 (this runbook's authority to exist).
- IM-6 approval (held pending this runbook): chat thread 2026-06-16 10:34 UTC+4. Scope re-applies as-is once the gate is READY.
- Canonical platform spec: `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` — IM-5.5 is added as an additive subsection under § 10 between Packet IM-5 and Packet IM-6.
- Existing promotion script: `scripts/promote-factory-master.mjs`.
- Existing read-only verification: `scripts/verify-im-1-post-backfill.mjs` (IM-1's post-backfill pattern); IM-5.5's `scripts/verify-operator-identity-bootstrap.mjs` follows the same shape.
- Future deprecation: `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` § Packet IM-8 will eventually disable the legacy `bootstrap+<tenant>@corpflowai.com` rows. The DB-backed admin row created here is the canonical replacement identity for those bootstrap operator rows.
