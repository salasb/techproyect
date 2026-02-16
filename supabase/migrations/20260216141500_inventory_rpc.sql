-- Function to atomically adjust inventory and record movement
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_product_id text,
  p_quantity integer,
  p_type text,
  p_reason text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_org_id uuid;
  v_current_stock integer;
BEGIN
  -- 1. Get Organization and Current Stock lock row
  SELECT "organizationId", "stock" INTO v_org_id, v_current_stock
  FROM public."Product"
  WHERE id = p_product_id
  FOR UPDATE; -- Lock the product row

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- 2. Verify User Permission (Basic RLS check inside logic)
  IF NOT EXISTS (
      SELECT 1 FROM public."OrganizationMember" 
      WHERE "organizationId" = v_org_id 
      AND "userId" = auth.uid()
  ) THEN
      RAISE EXCEPTION 'Access Denied: You do not belong to the organization of this product.';
  END IF;

  -- 3. Update Product Stock
  UPDATE public."Product"
  SET stock = stock + p_quantity,
      "updatedAt" = now()
  WHERE id = p_product_id;

  -- 4. Insert Inventory Movement
  INSERT INTO public."InventoryMovement"
  ("organizationId", "productId", "quantity", "type", "reason", "referenceId", "createdBy")
  VALUES
  (v_org_id, p_product_id, p_quantity, p_type, p_reason, p_reference_id, auth.uid());

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
