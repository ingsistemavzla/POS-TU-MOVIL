-- Temporarily disable RLS for initial registration
-- This allows new users to create their company and profile

-- Create a function to check if user has no profile yet (for initial registration)
CREATE OR REPLACE FUNCTION public.user_has_no_profile()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Allow new users to create companies during initial registration
CREATE POLICY "New users can create companies during registration" ON public.companies
  FOR INSERT WITH CHECK (public.user_has_no_profile());

-- Allow new users to create their initial user profile
CREATE POLICY "New users can create their profile" ON public.users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid() AND 
    public.user_has_no_profile()
  );

-- Allow new users to create stores for their new company
CREATE POLICY "New users can create stores during registration" ON public.stores
  FOR INSERT WITH CHECK (
    public.user_has_no_profile() AND
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = stores.company_id
    )
  );

-- Update the existing policies to handle the case where user profile doesn't exist yet
-- This is needed because get_user_company_id() returns NULL for users without profiles

-- Update companies policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (
    id = public.get_user_company_id() OR 
    (public.user_has_no_profile() AND auth.uid() IS NOT NULL)
  );

-- Update users policies  
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;
CREATE POLICY "Users can view users from their company" ON public.users
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    auth_user_id = auth.uid()
  );

-- Update stores policies
DROP POLICY IF EXISTS "Users can view stores from their company" ON public.stores;
CREATE POLICY "Users can view stores from their company" ON public.stores
  FOR SELECT USING (
    company_id = public.get_user_company_id() OR
    (public.user_has_no_profile() AND auth.uid() IS NOT NULL)
  );

-- Create a trigger to automatically confirm users on registration
-- This bypasses email confirmation for development
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm users for development (remove in production)
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (this might need to be done via Supabase dashboard)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   BEFORE INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
