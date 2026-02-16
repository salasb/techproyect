-- 1. Ensure Location for Default Stock exists
DO $$ 
DECLARE 
    v_default_location_id uuid;
    v_org_id uuid;
BEGIN
    -- Get an organization ID (taking the first one for simplicity in migration, assuming single tenant or robust context)
    -- Ideally we should loop organizations, but here we assume context.
    -- Let's just create a default location for EACH organization that has products but no location.
    
    FOR v_org_id IN SELECT DISTINCT "organizationId" FROM "Product" LOOP
        -- Check if default warehouse exists
        SELECT id INTO v_default_location_id FROM "Location" WHERE "organizationId" = v_org_id AND name = 'Bodega Principal' LIMIT 1;
        
        IF v_default_location_id IS NULL THEN
            INSERT INTO "Location" ("organizationId", "name", "type", "address")
            VALUES (v_org_id, 'Bodega Principal', 'WAREHOUSE', 'Migración Automática')
            RETURNING id INTO v_default_location_id;
        END IF;

        -- Migrate existing Product stock to this location
        INSERT INTO "ProductStock" ("productId", "locationId", "quantity", "minStock", "maxStock")
        SELECT id, v_default_location_id, stock, min_stock, NULL
        FROM "Product" p
        WHERE "organizationId" = v_org_id
        AND stock != 0
        ON CONFLICT ("productId", "locationId") DO NOTHING; -- Skip if already exists
        
    END LOOP;
END $$;

-- 2. Update InventoryMovement Table
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "fromLocationId" uuid REFERENCES "Location"("id") ON DELETE SET NULL;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "toLocationId" uuid REFERENCES "Location"("id") ON DELETE SET NULL;

-- Rename columns to match new schema (SAFE UPDATES)
DO $$ BEGIN
    ALTER TABLE "InventoryMovement" RENAME COLUMN "referenceId" TO "reference";
EXCEPTION
    WHEN undefined_column THEN null; -- Already renamed
END $$;

DO $$ BEGIN
    ALTER TABLE "InventoryMovement" RENAME COLUMN "reason" TO "notes";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InventoryMovement" RENAME COLUMN "createdBy" TO "userId";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- 3. Create Trigger Function to Sync Product.stock
CREATE OR REPLACE FUNCTION update_product_globale_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Product.stock to be the sum of all ProductStock for that product
    UPDATE "Product"
    SET stock = (
        SELECT COALESCE(SUM(quantity), 0)
        FROM "ProductStock"
        WHERE "productId" = NEW."productId"
    )
    WHERE id = NEW."productId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trg_update_product_stock ON "ProductStock";
CREATE TRIGGER trg_update_product_stock
AFTER INSERT OR UPDATE OR DELETE ON "ProductStock"
FOR EACH ROW
EXECUTE FUNCTION update_product_globale_stock();

-- 5. Drop old RPC and Create new RPC for Movements with Locations
DROP FUNCTION IF EXISTS adjust_inventory;

CREATE OR REPLACE FUNCTION register_inventory_movement(
    p_product_id text,
    p_quantity integer,
    p_type "MovementType",
    p_from_location_id uuid DEFAULT NULL,
    p_to_location_id uuid DEFAULT NULL,
    p_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_org_id uuid;
BEGIN
    -- Get Org ID
    SELECT "organizationId" INTO v_org_id FROM "Product" WHERE id = p_product_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Insert Audit Record
    INSERT INTO "InventoryMovement"
    ("organizationId", "productId", "quantity", "type", "fromLocationId", "toLocationId", "reference", "notes", "userId")
    VALUES
    (v_org_id, p_product_id, p_quantity, p_type, p_from_location_id, p_to_location_id, p_reference, p_notes, auth.uid());

    -- Update Stock (Source)
    IF p_from_location_id IS NOT NULL THEN
        UPDATE "ProductStock"
        SET quantity = quantity - p_quantity,
            "updatedAt" = now()
        WHERE "productId" = p_product_id AND "locationId" = p_from_location_id;
        
        -- Check if row exists (it should, but safety)
        IF NOT FOUND THEN
             RAISE EXCEPTION 'Not enough stock in source location or location not found for product.';
        END IF;
    END IF;

    -- Update Stock (Destination)
    IF p_to_location_id IS NOT NULL THEN
        INSERT INTO "ProductStock" ("productId", "locationId", "quantity")
        VALUES (p_product_id, p_to_location_id, p_quantity)
        ON CONFLICT ("productId", "locationId")
        DO UPDATE SET
            quantity = "ProductStock".quantity + p_quantity,
            "updatedAt" = now();
    END IF;

END;
$$ LANGUAGE plpgsql;
