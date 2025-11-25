-- Fix security issues: Enable RLS on bcv_rates and fix function security
ALTER TABLE public.bcv_rates ENABLE ROW LEVEL SECURITY;

-- Create policy for bcv_rates (publicly readable for all authenticated users)
CREATE POLICY "Authenticated users can view BCV rates" ON public.bcv_rates
  FOR SELECT TO authenticated USING (true);

-- Create policy for bcv_rates insert (only for system/admin use)
CREATE POLICY "System can insert BCV rates" ON public.bcv_rates
  FOR INSERT WITH CHECK (true);

-- Fix function search path security (replace instead of drop)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;