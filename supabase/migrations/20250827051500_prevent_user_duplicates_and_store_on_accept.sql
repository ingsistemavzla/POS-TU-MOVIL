-- Prevent duplicate users and ensure invitation acceptance captures assigned store

-- 1) Enforce unique auth_user_id in users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_auth_user_id_key'
  ) THEN
    -- Create a unique index to prevent duplicate profiles per auth user
    CREATE UNIQUE INDEX users_auth_user_id_key ON public.users(auth_user_id);
  END IF;
END$$;

-- 2) Optional: also avoid duplicate active profiles by email within a company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_unique_company_email'
  ) THEN
    CREATE UNIQUE INDEX users_unique_company_email ON public.users(company_id, lower(email));
  END IF;
END$$;

-- 3) Helper function to accept an invitation atomically (optional usage via RPC later)
CREATE OR REPLACE FUNCTION public.accept_invitation_create_user(p_auth_user_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv record;
  v_user_id uuid;
BEGIN
  -- Find the most recent pending invitation for this email
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE lower(email) = lower(p_email) AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Nothing to do
    RETURN NULL;
  END IF;

  -- Upsert user using invitation data; copy assigned_store_id
  INSERT INTO public.users(auth_user_id, company_id, name, email, role, active, assigned_store_id)
  VALUES (p_auth_user_id, v_inv.company_id, split_part(p_email, '@', 1), p_email, v_inv.role, true, v_inv.assigned_store_id)
  ON CONFLICT (auth_user_id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        active = true,
        assigned_store_id = COALESCE(EXCLUDED.assigned_store_id, public.users.assigned_store_id)
  RETURNING id INTO v_user_id;

  -- Mark invitation as accepted
  UPDATE public.invitations SET status = 'accepted' WHERE id = v_inv.id;

  RETURN v_user_id;
END;
$$;
