-- ============================================================================
-- AUTOMATIC USER PROFILE CREATION TRIGGER
-- ============================================================================
-- This script creates a trigger that automatically creates a profile in
-- public.users whenever a new user is created in auth.users.
--
-- IMPORTANT: This ensures that every authenticated user has a corresponding
-- profile row, eliminating the race condition where the profile doesn't exist
-- when the user tries to log in.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing function and trigger if they exist
-- ============================================================================
-- This allows the script to be run multiple times safely (idempotent)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- STEP 2: Create the function to handle new user creation
-- ============================================================================
-- This function runs with SECURITY DEFINER to bypass RLS during profile creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_company_id UUID;
  v_assigned_store_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_existing_profile_id UUID;
BEGIN
  -- Extract email from the new auth user
  v_email := NEW.email;
  
  -- Check if a profile already exists for this auth_user_id
  -- This prevents duplicate profiles if the trigger fires multiple times
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE auth_user_id = NEW.id
  LIMIT 1;
  
  -- If profile already exists, update it with the latest auth_user_id (in case it was NULL)
  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE public.users
    SET 
      auth_user_id = NEW.id,
      email = COALESCE(v_email, email),
      updated_at = NOW()
    WHERE id = v_existing_profile_id;
    
    RAISE NOTICE 'Profile already exists for user % (%), updated auth_user_id', NEW.id, v_email;
    RETURN NEW;
  END IF;
  
  -- Check if a profile exists with the same email but different auth_user_id
  -- This handles the case where a profile was created manually before auth user was created
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE email = v_email
    AND (auth_user_id IS NULL OR auth_user_id != NEW.id)
  LIMIT 1;
  
  -- If found, link the existing profile to this auth user
  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE public.users
    SET 
      auth_user_id = NEW.id,
      updated_at = NOW()
    WHERE id = v_existing_profile_id;
    
    RAISE NOTICE 'Linked existing profile to auth user % (%)', NEW.id, v_email;
    RETURN NEW;
  END IF;
  
  -- Extract metadata from raw_user_meta_data
  -- Role: default to 'cashier' if not provided
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'cashier'
  );
  
  -- Validate role is one of the allowed values
  IF v_role NOT IN ('admin', 'manager', 'cashier', 'master_admin') THEN
    v_role := 'cashier'; -- Default to cashier if invalid role
    RAISE WARNING 'Invalid role in metadata, defaulting to cashier for user %', v_email;
  END IF;
  
  -- Company ID: REQUIRED - must be provided in metadata
  -- If not provided, we cannot create the profile (this is a critical field)
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  
  IF v_company_id IS NULL THEN
    RAISE WARNING 'No company_id provided in metadata for user %. Profile creation skipped. User must be created via admin panel or RPC.', v_email;
    -- Return NEW to allow auth user creation, but skip profile creation
    -- The profile can be created later via admin panel or RPC
    RETURN NEW;
  END IF;
  
  -- Assigned Store ID: Optional (nullable)
  IF NEW.raw_user_meta_data->>'assigned_store_id' IS NOT NULL THEN
    v_assigned_store_id := (NEW.raw_user_meta_data->>'assigned_store_id')::UUID;
  ELSE
    v_assigned_store_id := NULL;
  END IF;
  
  -- Name: Extract from metadata or derive from email
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    split_part(v_email, '@', 1) -- Fallback: use email prefix as name
  );
  
  -- Insert the new profile into public.users
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    role,
    company_id,
    assigned_store_id,
    active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,                    -- auth_user_id from auth.users
    v_email,                   -- email from auth.users
    v_name,                    -- name from metadata or email
    v_role,                    -- role from metadata (default: 'cashier')
    v_company_id,              -- company_id from metadata (REQUIRED)
    v_assigned_store_id,       -- assigned_store_id from metadata (nullable)
    true,                      -- active defaults to true
    NOW(),                     -- created_at
    NOW()                      -- updated_at
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    assigned_store_id = COALESCE(EXCLUDED.assigned_store_id, public.users.assigned_store_id),
    active = true,
    updated_at = NOW();
  
  RAISE NOTICE 'Profile created successfully for user % (%) with role %', NEW.id, v_email, v_role;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent auth user creation
    RAISE WARNING 'Error creating profile for user % (%): %', NEW.id, v_email, SQLERRM;
    -- Return NEW to allow auth user creation to proceed
    -- The profile can be created later via admin panel or RPC
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 3: Create the trigger on auth.users
-- ============================================================================
-- This trigger fires AFTER INSERT on auth.users and calls handle_new_user()

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 4: Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a profile in public.users when a new user is created in auth.users. 
Extracts role, company_id, and assigned_store_id from raw_user_meta_data. 
Defaults role to cashier if not provided. Requires company_id in metadata to create profile.';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================
-- Uncomment these to verify the trigger is working:

-- Check if trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists:
-- SELECT routine_name, routine_type, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================


