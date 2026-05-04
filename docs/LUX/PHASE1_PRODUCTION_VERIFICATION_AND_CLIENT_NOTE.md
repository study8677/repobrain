# Phase 1 production verification + client gate (LuxeMaurice)

**Ticket:** `cmo8mjijk0000jl04l1jz0v6d`  
**Production:** `https://lux.corpflowai.com/`

## 1) Record inside the ticket (CMP)

**Option A — automated (recommended)**  
From a machine with `POSTGRES_URL` pointed at **production** Postgres:

```bash
node scripts/lux-ticket-append-phase1-production-verification.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d --execute
```

The script is **idempotent** (marker `<!-- lux-phase1-production-verified:2026-05-04 -->`); safe to re-run.

**Option B — manual paste**  
In `/change`, open the ticket and **append** the block below to the ticket **Description** (or operator-visible brief), preserving existing programme text.

```markdown
---

<!-- lux-phase1-production-verified:2026-05-04 -->

## Phase 1 — Production verification (recorded 2026-05-04)

**Merged to main:** PR #128 — `feat(lux): Phase 1 luxury copy for lux.corpflowai.com` — commit `ad30e6d6`.

**Live production checks (GET):**
- `https://lux.corpflowai.com/` → **200**
- `https://lux.corpflowai.com/concierge` → **200**
- `https://lux.corpflowai.com/change` → **200** (Change Console reachable; not Vercel 403)

**Client-visible `/` (rendered):**
- No Preview / Draft / Tenant slug / CorpFlow footer in default view.
- Luxury acquisition copy: off-market, invitation-only, limited clients; CTA **Request Private Access** → `/concierge`.
- Contact placeholders show **By appointment** where email/phone unset.

**Client-visible `/concierge`:**
- **Private Client Concierge** (replaced AI Concierge Lite); dark + gold presentation; advisor + discretion language.

**Not in scope for this verification:** Phase 2 IDX / property discovery; CRM; automation. Ticket remains open for programme delivery beyond homepage/concierge presentation.

**Gate:** Client direction approval requested before Phase 2 (see §2).
```

---

## 2) Short client review note (approval before Phase 2)

Use as email / WhatsApp / meeting follow-up. Adjust greeting only.

---

**Subject:** Lux Mauritius — Phase 1 live: please confirm direction before we open Phase 2 (property discovery)

Dear [Name],

Phase 1 of your public acquisition path is now **live on production** at **https://lux.corpflowai.com/** with a matching **Private Client Concierge** at **/concierge**.

We have deliberately kept this phase to **presentation, positioning, and lead capture** — **no** IDX listings feed, **no** CRM integration, and **no** marketing automation yet, per the agreed staged programme.

**Please review and confirm:**

1. **Tone and positioning** — exclusivity, discretion, and invitation-only language feel right for LuxeMaurice.  
2. **The concierge path** — acceptable as the primary “raise your hand” channel for now.  
3. **Anything you want tightened** before we commission **Phase 2 (IDX / property discovery)** work.

Once you confirm **approval on Phase 1 direction**, we will schedule Phase 2 scope (provider choice, listing rules, and how much appears on-site vs on request).

Thank you,  
[Operator name]  
CorpFlow

---

**Do not** mark ticket `cmo8mjijk0000jl04l1jz0v6d` operationally complete until programme gates in `/change` match delivery reality (homepage alone is not programme completion — see `docs/LUX/LUX_DELIVERY_PROGRAMME.md`).
