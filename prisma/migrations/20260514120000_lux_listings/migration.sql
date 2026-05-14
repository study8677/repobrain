-- LuxeMaurice Phase 2 — Postgres-backed manual property catalogue (read APIs first).
-- If this table was already created via POST /api/factory/postgres/ensure-schema, run once:
--   npx prisma migrate resolve --applied 20260514120000_lux_listings

CREATE TABLE "lux_listings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region_label" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "listing_status" TEXT,
    "price_range" TEXT,
    "short_teaser" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "highlights_json" JSONB NOT NULL DEFAULT '[]',
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "area_sqm" DOUBLE PRECISION,
    "media_refs_json" JSONB,
    "visibility_status" TEXT NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lux_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lux_listings_tenant_id_slug_key" ON "lux_listings"("tenant_id", "slug");

CREATE INDEX "lux_listings_tenant_id_visibility_status_idx" ON "lux_listings"("tenant_id", "visibility_status");
