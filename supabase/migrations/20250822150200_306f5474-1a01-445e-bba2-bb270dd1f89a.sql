-- Create companies table (multitenant)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'basic',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT,
  price_usd DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 16.00,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku),
  UNIQUE(company_id, barcode)
);

-- Create inventories table
CREATE TABLE public.inventories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, store_id, product_id)
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER', 'ADJUST')),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  store_from_id UUID REFERENCES public.stores(id),
  store_to_id UUID REFERENCES public.stores(id),
  reason TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bcv_rates table
CREATE TABLE public.bcv_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate DECIMAL(10,4) NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID NOT NULL REFERENCES public.users(id),
  total_usd DECIMAL(10,2) NOT NULL,
  total_bs DECIMAL(15,2) NOT NULL,
  bcv_rate_used DECIMAL(10,4) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  discount_usd DECIMAL(10,2) DEFAULT 0,
  subtotal_usd DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for users
CREATE POLICY "Users can view users from their company" ON public.users
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for stores
CREATE POLICY "Users can view stores from their company" ON public.stores
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for customers
CREATE POLICY "Users can view customers from their company" ON public.customers
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create customers for their company" ON public.customers
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for products
CREATE POLICY "Users can view products from their company" ON public.products
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for inventories
CREATE POLICY "Users can view inventories from their company" ON public.inventories
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for sales
CREATE POLICY "Users can view sales from their company" ON public.sales
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create sales for their company" ON public.sales
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for sale_items
CREATE POLICY "Users can view sale_items from their company sales" ON public.sale_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Users can create sale_items for their company sales" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid())
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventories_updated_at BEFORE UPDATE ON public.inventories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();