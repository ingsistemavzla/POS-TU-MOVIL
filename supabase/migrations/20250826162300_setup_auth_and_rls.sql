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

-- Create function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
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
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role = 'admin'
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Companies: Users can only see their own company
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id());

CREATE POLICY "Users can update their own company" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id() AND public.is_admin());

-- Users: Users can only see users from their company
CREATE POLICY "Users can view users from their company" ON public.users
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can insert users in their company" ON public.users
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "Admins can update users in their company" ON public.users
  FOR UPDATE USING (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "Admins can delete users in their company" ON public.users
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Stores: Users can only see stores from their company
CREATE POLICY "Users can view stores from their company" ON public.stores
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can insert stores in their company" ON public.stores
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "Admins can update stores in their company" ON public.stores
  FOR UPDATE USING (company_id = public.get_user_company_id() AND public.is_admin());

CREATE POLICY "Admins can delete stores in their company" ON public.stores
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Products: Users can only see products from their company
CREATE POLICY "Users can view products from their company" ON public.products
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Managers and admins can insert products" ON public.products
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "Managers and admins can update products" ON public.products
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Customers: Users can only see customers from their company
CREATE POLICY "Users can view customers from their company" ON public.customers
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert customers in their company" ON public.customers
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update customers in their company" ON public.customers
  FOR UPDATE USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE USING (company_id = public.get_user_company_id() AND public.is_admin());

-- Inventories: Users can only see inventories from their company
CREATE POLICY "Users can view inventories from their company" ON public.inventories
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Managers and admins can manage inventories" ON public.inventories
  FOR ALL USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Inventory Movements: Users can only see movements from their company
CREATE POLICY "Users can view inventory movements from their company" ON public.inventory_movements
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert inventory movements in their company" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Sales: Users can only see sales from their company
CREATE POLICY "Users can view sales from their company" ON public.sales
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert sales in their company" ON public.sales
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    cashier_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Managers and admins can update sales" ON public.sales
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) IN ('admin', 'manager')
  );

-- Sale Items: Users can see sale items for sales from their company
CREATE POLICY "Users can view sale items from their company" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Users can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.company_id = public.get_user_company_id()
    )
  );

-- BCV Rates: All authenticated users can view rates (public data)
CREATE POLICY "Authenticated users can view BCV rates" ON public.bcv_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can manage BCV rates" ON public.bcv_rates
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger function to automatically set company_id and user_id
CREATE OR REPLACE FUNCTION public.set_user_company_context()
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
