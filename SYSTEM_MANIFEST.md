# 📜 Master System Manifest: CorpFlowAI
**Version:** 1.0.0 (Master Synchronization)  
**Last Audit:** March 24, 2026  
**Status:** **SYNCHRONIZED**

---

## 🏛️ 1. The Source of Truth (Hardware)
These are the **only** authenticated connection strings in the environment. Any code referencing variables outside this list is considered "Ghost Logic" and will fail.

| Variable | Provider | Purpose | Confirmed |
| :--- | :--- | :--- | :--- |
| `POSTGRES_URL` (+ 5 aliases) | **Neon Postgres** (via Prisma ORM) | Sole production data store. See `docs/operations/POSTGRES_PROVIDER.md` for all six aliases (pooled vs non-pooled) and the rotation playbook. **Not** Prisma Postgres (`*.prisma.io`). | ✅ (2026-05-22) |
| `GROQ_API_KEY` | Groq Cloud | Llama-3-70B Intelligence Engine | ✅ |
| `TELEGRAM_BOT_TOKEN` | Telegram | Notification Sentry | ✅ |

---

## 🏗️ 2. Architectural Constraints
* **Serverless Runtime:** All API routes (`/api/*`) run on Vercel Functions. 
* **Filesystem:** **READ-ONLY**. Do not attempt to use SQLite (`.db` files) in production.
* **Database Provider:** **Neon Postgres** (https://neon.tech), accessed via **Prisma Client** (ORM). Canonical operational doc: **`docs/operations/POSTGRES_PROVIDER.md`**.
* **Data Flow:** `Lead Input` → `Neon (Postgres via Prisma)` (and optional n8n via `N8N_WEBHOOK_URL`).

---

## ⚠️ 3. Forbidden 'Ghost' Assets (The Purge List)
The following variables were identified as non-existent in the Hardware Audit and are **strictly forbidden** from the codebase until API keys are provided:
* ❌ `SERPER_API_KEY` (Web Search disabled)
* ❌ `TWILIO_SID` (WhatsApp/SMS disabled)
* ❌ `VAPI_KEY` (Voice AI disabled)

---

## 🛠️ 4. Maintenance & Sync Commands
To maintain synchronization, use only these verified commands:

* **To sync the Vault schema:** `npx prisma generate` (Pushed to Vercel via Git)
* **To verify the Handshake:** `curl -X POST https://corpflow-ai-command-center.vercel.app/api/intake`
* **To view the Vault (Local):** `npx prisma studio`

---
