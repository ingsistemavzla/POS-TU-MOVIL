-- Create inventory_transfers table
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  to_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS inventory_transfers_company_id_idx ON public.inventory_transfers(company_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_product_id_idx ON public.inventory_transfers(product_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_from_store_id_idx ON public.inventory_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_to_store_id_idx ON public.inventory_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_transferred_by_idx ON public.inventory_transfers(transferred_by);
CREATE INDEX IF NOT EXISTS inventory_transfers_created_at_idx ON public.inventory_transfers(created_at);

-- Enable RLS
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view transfers from their company" ON public.inventory_transfers
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins and managers can create transfers" ON public.inventory_transfers
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id() AND
    (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
      AND company_id = public.get_user_company_id()
    ))
  );

CREATE POLICY "Admins can update transfers" ON public.inventory_transfers
  FOR UPDATE USING (
    company_id = public.get_user_company_id() AND 
    public.is_admin()
  );

CREATE POLICY "Admins can delete transfers" ON public.inventory_transfers
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND 
    public.is_admin()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_inventory_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER inventory_transfers_updated_at_trigger
  BEFORE UPDATE ON public.inventory_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_transfers_updated_at();
