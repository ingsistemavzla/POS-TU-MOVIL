-- Complete authentication setup migration
-- This migration sets up RLS policies and functions for the multitenant POS system

-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bcv_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.user_has_no_profile();
DROP FUNCTION IF EXISTS public.set_user_company_context();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to get current user's company_id
CREATE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Create function to check if user is admin
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role = 'admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Create function to check if user has no profile yet (for initial registration)
CREATE FUNCTION public.user_has_no_profile()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on companies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.companies';
    END LOOP;
    
    -- Drop all policies on users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
    
    -- Drop all policies on stores
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stores' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.stores';
    END LOOP;
    
    -- Drop all policies on products
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.products';
    END LOOP;
    
    -- Drop all policies on customers
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customers';
    END LOOP;
    
    -- Drop all policies on inventories
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inventories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inventories';
    END LOOP;
    
    -- Drop all policies on inventory_movements
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inventory_movements' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inventory_movements';
    END LOOP;
    
    -- Drop all policies on sales
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sales';
    END LOOP;
    
    -- Drop all policies on sale_items
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sale_items' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sale_items';
    END LOOP;
    
    -- Drop all policies on bcv_rates
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bcv_rates' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bcv_rates';
    END LOOP;
END $$;

-- Companies policies
CREATE POLICY "companies_select_policy" ON public.companies
  FOR SELECT USING (
    id = public.get_user_company_id() OR 
    public.user_has_no_profile()
  );

CREATE POLICY "companies_insert_policy" ON public.companies
  FOR INSERT WITH CHECK (public.user_has_no_profile());

CREATE POLICY "companies_update_policy" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id() AND public.is_admin());

-- Users policies
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    auth_user_id = auth.uid()
  );

CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    (auth_user_id = auth.uid() AND public.user_has_no_profile()) OR
    (company_id = public.get_user_company_id() AND public.is_admin())
  );

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Stores policies
CREATE POLICY "stores_select_policy" ON public.stores
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "stores_insert_policy" ON public.stores
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() OR
    (public.user_has_no_profile() AND EXISTS (
      SELECT 1 FROM public.companies WHERE companies.id = stores.company_id
    ))
  );

CREATE POLICY "stores_update_policy" ON public.stores
  FOR UPDATE USING (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "stores_delete_policy" ON public.stores
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Products policies
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Customers policies
CREATE POLICY "customers_select_policy" ON public.customers
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "customers_insert_policy" ON public.customers
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "customers_update_policy" ON public.customers
  FOR UPDATE USING (company_id = public.get_user_company_id());

CREATE POLICY "customers_delete_policy" ON public.customers
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Inventories policies
CREATE POLICY "inventories_select_policy" ON public.inventories
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "inventories_all_policy" ON public.inventories
  FOR ALL USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Inventory Movements policies
CREATE POLICY "inventory_movements_select_policy" ON public.inventory_movements
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "inventory_movements_insert_policy" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Sales policies
CREATE POLICY "sales_select_policy" ON public.sales
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "sales_insert_policy" ON public.sales
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    cashier_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "sales_update_policy" ON public.sales
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Sale Items policies
CREATE POLICY "sale_items_select_policy" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "sale_items_insert_policy" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

-- BCV Rates policies (public data)
CREATE POLICY "bcv_rates_select_policy" ON public.bcv_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bcv_rates_all_policy" ON public.bcv_rates
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger function to automatically set company_id and user_id
CREATE FUNCTION public.set_user_company_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
  current_user_id uuid;
BEGIN
  -- Get the current user's company_id and user_id
  SELECT company_id, id INTO user_company_id, current_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Set company_id if the table has this column and it's not already set
  IF TG_TABLE_NAME IN ('stores', 'products', 'customers', 'inventories', 'inventory_movements', 'sales') THEN
    IF NEW.company_id IS NULL THEN
      NEW.company_id := user_company_id;
    END IF;
  END IF;

  -- Set user_id for inventory_movements if not set
  IF TG_TABLE_NAME = 'inventory_movements' AND NEW.user_id IS NULL THEN
    NEW.user_id := current_user_id;
  END IF;

  -- Set cashier_id for sales if not set
  IF TG_TABLE_NAME = 'sales' AND NEW.cashier_id IS NULL THEN
    NEW.cashier_id := current_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS set_company_context_stores ON public.stores;
DROP TRIGGER IF EXISTS set_company_context_products ON public.products;
DROP TRIGGER IF EXISTS set_company_context_customers ON public.customers;
DROP TRIGGER IF EXISTS set_company_context_inventories ON public.inventories;
DROP TRIGGER IF EXISTS set_company_context_inventory_movements ON public.inventory_movements;
DROP TRIGGER IF EXISTS set_company_context_sales ON public.sales;

-- Create triggers for automatic company_id setting
CREATE TRIGGER set_company_context_stores
  BEFORE INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();

CREATE TRIGGER set_company_context_products
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();

CREATE TRIGGER set_company_context_customers
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();

CREATE TRIGGER set_company_context_inventories
  BEFORE INSERT ON public.inventories
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();

CREATE TRIGGER set_company_context_inventory_movements
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();

CREATE TRIGGER set_company_context_sales
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_user_company_context();
