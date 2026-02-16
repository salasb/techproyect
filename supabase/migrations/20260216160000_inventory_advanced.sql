-- Create Enum for Location Type
DO $$ BEGIN
    CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'VEHICLE', 'SITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Enum for Movement Type
DO $$ BEGIN
    CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Location Table
CREATE TABLE IF NOT EXISTS "Location" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "name" text NOT NULL,
  "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
  "address" text,
  "status" text DEFAULT 'ACTIVE',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),

  CONSTRAINT "Location_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Create LocationMember Table (Permissions)
CREATE TABLE IF NOT EXISTS "LocationMember" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "locationId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "role" text NOT NULL DEFAULT 'WORKER', -- MANAGER, WORKER
  "createdAt" timestamptz DEFAULT now(),

  CONSTRAINT "LocationMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE,
  CONSTRAINT "LocationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE,
  CONSTRAINT "LocationMember_unique_user_location" UNIQUE ("locationId", "userId")
);

-- Create ProductStock Table (Stock per Location)
-- Changed productId to TEXT to match Product table
CREATE TABLE IF NOT EXISTS "ProductStock" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "productId" text NOT NULL, -- CHANGED TO TEXT
  "locationId" uuid NOT NULL,
  "quantity" integer NOT NULL DEFAULT 0,
  "minStock" integer DEFAULT 0,
  "maxStock" integer,
  "updatedAt" timestamptz DEFAULT now(),

  CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE,
  CONSTRAINT "ProductStock_unique_product_location" UNIQUE ("productId", "locationId")
);

-- Create InventoryMovement Table (Audit Log)
-- Changed productId to TEXT to match Product table
CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "productId" text NOT NULL, -- CHANGED TO TEXT
  "fromLocationId" uuid, -- Null if Purchase/New
  "toLocationId" uuid,   -- Null if Consumption/Loss
  "quantity" integer NOT NULL,
  "type" "MovementType" NOT NULL,
  "reference" text,      -- Project ID, PO Number, etc.
  "notes" text,
  "userId" uuid,         -- Who performed the action
  "createdAt" timestamptz DEFAULT now(),

  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryMovement_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL,
  CONSTRAINT "InventoryMovement_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL,
  CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL
);

-- Add Barcode to Product Table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" text;
DO $$ BEGIN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_barcode_key" UNIQUE ("barcode");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add RLS Policies (Basic Organization Isolation)
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;

-- Note: We drop existing policies first to avoid "policy already exists" errors if re-running
DROP POLICY IF EXISTS "Users can view locations in their org" ON "Location";
CREATE POLICY "Users can view locations in their org" ON "Location"
  FOR SELECT USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "OrganizationMember" WHERE "userId" = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage locations" ON "Location";
CREATE POLICY "Admins can manage locations" ON "Location"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" 
      WHERE "userId" = auth.uid() 
      AND "organizationId" = "Location"."organizationId"
      AND "role" IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Policy: ProductStock
DROP POLICY IF EXISTS "Users can view stock in their org" ON "ProductStock";
CREATE POLICY "Users can view stock in their org" ON "ProductStock"
  FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Product" p
        JOIN "OrganizationMember" om ON p."organizationId" = om."organizationId"
        WHERE p.id = "ProductStock"."productId" AND om."userId" = auth.uid()
    )
  );

-- Policy: InventoryMovement
DROP POLICY IF EXISTS "Users can view movements in their org" ON "InventoryMovement";
CREATE POLICY "Users can view movements in their org" ON "InventoryMovement"
  FOR SELECT USING (
    "organizationId" IN (
      SELECT "organizationId" FROM "OrganizationMember" WHERE "userId" = auth.uid()
    )
  );
