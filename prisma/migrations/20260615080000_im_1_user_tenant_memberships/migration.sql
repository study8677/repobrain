-- IM-1 (2026-06-15) — Multi-tenant user membership matrix.
-- Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 (IM-1), §2.3, §2.6, §7.2.
-- Additive only: no DROP, no RENAME, no NOT-NULL backfill on existing rows.
-- If these tables/columns were already created via POST /api/factory/postgres/ensure-schema
-- (the build-time path in scripts/apply-ensure-schema-build.mjs that runs on every Vercel build),
-- run once on Production:
--   npx prisma migrate resolve --applied 20260615080000_im_1_user_tenant_memberships
-- Rollback: see the IM-1 Delivery Reality Audit; rollback is a separate, explicit DDL packet.

-- 1. auth_users.factory_master capability column + CHECK constraint (admin-only).
ALTER TABLE "auth_users" ADD COLUMN "factory_master" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_users_factory_master_admin_only'
  ) THEN
    ALTER TABLE "auth_users"
      ADD CONSTRAINT "auth_users_factory_master_admin_only"
      CHECK ("factory_master" = false OR "level" = 'admin');
  END IF;
END $$;

-- 2. Audit columns on the two append-only event tables (nullable; backfill-safe).
ALTER TABLE "automation_events" ADD COLUMN "actor_user_id" TEXT;
CREATE INDEX "automation_events_actor_user_id_idx" ON "automation_events"("actor_user_id");

ALTER TABLE "telemetry_events" ADD COLUMN "actor_user_id" TEXT;
CREATE INDEX "telemetry_events_actor_user_id_idx" ON "telemetry_events"("actor_user_id");

-- 3. New table: user_tenant_memberships.
CREATE TABLE "user_tenant_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "capability" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "granted_by" TEXT NOT NULL DEFAULT 'system',
    "revoked_at" TIMESTAMPTZ,
    "disabled_at" TIMESTAMPTZ,
    "notes" TEXT,

    CONSTRAINT "user_tenant_memberships_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_tenant_memberships_user_id_idx" ON "user_tenant_memberships"("user_id");
CREATE INDEX "user_tenant_memberships_tenant_id_idx" ON "user_tenant_memberships"("tenant_id");
CREATE INDEX "user_tenant_memberships_user_enabled_revoked_idx"
  ON "user_tenant_memberships"("user_id", "enabled", "revoked_at");

-- Partial unique: one active (non-revoked) membership per (user_id, tenant_id).
-- Revoked rows survive for audit; a new grant after revoke succeeds.
CREATE UNIQUE INDEX "user_tenant_memberships_user_tenant_active_unique"
  ON "user_tenant_memberships"("user_id", "tenant_id")
  WHERE "revoked_at" IS NULL;
