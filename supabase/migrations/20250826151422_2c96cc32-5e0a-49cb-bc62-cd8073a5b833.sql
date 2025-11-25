-- Add missing RLS policies for inventory_movements
CREATE POLICY "Users can view inventory_movements from their company" ON public.inventory_movements
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create inventory_movements for their company" ON public.inventory_movements
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE auth_user_id = auth.uid()));