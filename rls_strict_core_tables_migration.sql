-- ============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) MIGRATION
-- ============================================================================
-- This script implements strict multi-tenancy and role-based access control
-- for the core tables: sales, products, and stores.
--
-- RULES:
-- 1. Multi-Tenancy: Users can ONLY see data where table.company_id = user.company_id
-- 2. Role Hierarchy:
--    - Master/Admin: See ALL data within their company_id
--    - Manager/Cashier: See ONLY data where table.store_id = user.assigned_store_id
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on Target Tables
-- ============================================================================

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop All Existing Policies (Clean Slate)
-- ============================================================================
-- This ensures we start with a clean slate and no conflicting policies

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on sales
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'sales'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.sales';
        RAISE NOTICE 'Dropped policy: % on sales', policy_record.policyname;
    END LOOP;
    
    -- Drop all policies on products
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'products'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.products';
        RAISE NOTICE 'Dropped policy: % on products', policy_record.policyname;
    END LOOP;
    
    -- Drop all policies on stores
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'stores'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.stores';
        RAISE NOTICE 'Dropped policy: % on stores', policy_record.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create RLS Policies for SALES
-- ============================================================================
-- Sales are store-specific, so managers/cashiers can only see their store's sales
-- Admins can see all sales in their company

-- SELECT Policy: Multi-tenancy + Role-based store filtering
CREATE POLICY "sales_select_policy" ON public.sales
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = sales.company_id  -- Multi-tenancy: Same company
      AND (
        -- Admins/Master see all stores in their company
        u.role IN ('master_admin', 'admin')
        OR
        -- Managers/Cashiers see only their assigned store
        (u.role IN ('manager', 'cashier') AND u.assigned_store_id = sales.store_id)
      )
  )
);

-- INSERT Policy: Only admins can create sales, and must be in their company
CREATE POLICY "sales_insert_policy" ON public.sales
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = sales.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin', 'manager', 'cashier')  -- All roles can create sales
      AND (
        u.role IN ('master_admin', 'admin')
        OR
        (u.role IN ('manager', 'cashier') AND u.assigned_store_id = sales.store_id)
      )
  )
);

-- UPDATE Policy: Only admins can update sales, and must be in their company
CREATE POLICY "sales_update_policy" ON public.sales
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = sales.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = sales.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
);

-- DELETE Policy: Only admins can delete sales, and must be in their company
CREATE POLICY "sales_delete_policy" ON public.sales
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = sales.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can delete
  )
);

-- ============================================================================
-- STEP 4: Create RLS Policies for PRODUCTS
-- ============================================================================
-- Products are company-level (shared across all stores in a company)
-- All users in the company can see all products (no store filtering)
-- Only admins can modify products

-- SELECT Policy: Multi-tenancy only (no store filtering for products)
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = products.company_id  -- Multi-tenancy: Same company
  )
);

-- INSERT Policy: Only admins can create products, and must be in their company
CREATE POLICY "products_insert_policy" ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = products.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can create
  )
);

-- UPDATE Policy: Only admins can update products, and must be in their company
CREATE POLICY "products_update_policy" ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = products.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = products.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
);

-- DELETE Policy: Only admins can delete products, and must be in their company
CREATE POLICY "products_delete_policy" ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = products.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can delete
  )
);

-- ============================================================================
-- STEP 5: Create RLS Policies for STORES
-- ============================================================================
-- Stores are company-level, but managers/cashiers might only see their assigned store
-- Admins can see all stores in their company

-- SELECT Policy: Multi-tenancy + Role-based store filtering
CREATE POLICY "stores_select_policy" ON public.stores
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = stores.company_id  -- Multi-tenancy: Same company
      AND (
        -- Admins/Master see all stores in their company
        u.role IN ('master_admin', 'admin')
        OR
        -- Managers/Cashiers see only their assigned store
        (u.role IN ('manager', 'cashier') AND u.assigned_store_id = stores.id)
      )
  )
);

-- INSERT Policy: Only admins can create stores, and must be in their company
CREATE POLICY "stores_insert_policy" ON public.stores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = stores.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can create
  )
);

-- UPDATE Policy: Only admins can update stores, and must be in their company
CREATE POLICY "stores_update_policy" ON public.stores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = stores.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = stores.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can update
  )
);

-- DELETE Policy: Only admins can delete stores, and must be in their company
CREATE POLICY "stores_delete_policy" ON public.stores
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.company_id = stores.company_id  -- Multi-tenancy
      AND u.role IN ('master_admin', 'admin')  -- Only admins can delete
  )
);

-- ============================================================================
-- STEP 6: Create Indexes for Performance
-- ============================================================================
-- These indexes optimize the EXISTS subqueries in the RLS policies

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_company_role_store 
ON public.users(auth_user_id, company_id, role, assigned_store_id)
WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_company_store 
ON public.sales(company_id, store_id);

CREATE INDEX IF NOT EXISTS idx_products_company 
ON public.products(company_id);

CREATE INDEX IF NOT EXISTS idx_stores_company 
ON public.stores(company_id);

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================
-- Uncomment these to verify the policies are created correctly:

-- Check RLS status:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('sales', 'products', 'stores');

-- Check policies:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('sales', 'products', 'stores')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


