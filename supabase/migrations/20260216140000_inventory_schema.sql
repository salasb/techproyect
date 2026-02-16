-- Add inventory fields to Product
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'SERVICE' CHECK (type IN ('PRODUCT', 'SERVICE'));
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "stock" integer NOT NULL DEFAULT 0;
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "min_stock" integer NOT NULL DEFAULT 0;
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "sku" text;

-- Create InventoryMovement table
CREATE TABLE IF NOT EXISTS public."InventoryMovement" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "organizationId" uuid NOT NULL REFERENCES public."Organization"("id"),
    "productId" text NOT NULL REFERENCES public."Product"("id"),
    "quantity" integer NOT NULL,
    "type" text NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'PURCHASE')),
    "referenceId" text, -- Can be ProjectID, InvoiceID, etc.
    "reason" text,
    "createdAt" timestamptz DEFAULT now(),
    "createdBy" uuid REFERENCES auth.users("id")
);

-- RLS for InventoryMovement
ALTER TABLE public."InventoryMovement" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Select" ON public."InventoryMovement" FOR SELECT USING ("organizationId" IN (SELECT "organizationId" FROM public."OrganizationMember" WHERE "userId" = auth.uid()));
CREATE POLICY "Tenant Isolation Insert" ON public."InventoryMovement" FOR INSERT WITH CHECK ("organizationId" IN (SELECT "organizationId" FROM public."OrganizationMember" WHERE "userId" = auth.uid()));
