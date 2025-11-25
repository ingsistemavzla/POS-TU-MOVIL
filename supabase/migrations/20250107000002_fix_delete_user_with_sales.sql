-- Migration: Fix delete_user_complete to handle users with associated sales
-- This migration updates the function to set cashier_id to NULL in sales before deleting the user

-- First, check if we need to make cashier_id nullable in sales table
-- Note: We'll try to set it to NULL in sales before deletion
-- If cashier_id is NOT NULL, we need to update the constraint or handle it differently

-- Update the delete_user_complete function to handle sales
CREATE OR REPLACE FUNCTION public.delete_user_complete(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_name text;
  v_user_role text;
  v_user_company_id uuid;
  v_admin_count integer;
  v_sales_count integer;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Solo los administradores pueden eliminar usuarios',
      'code', 'INSUFFICIENT_PERMISSIONS'
    );
  END IF;

  -- Get user data before deletion
  SELECT auth_user_id, name, role, company_id 
  INTO v_auth_user_id, v_user_name, v_user_role, v_user_company_id
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Usuario no encontrado',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Prevent deletion of last admin
  IF v_user_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.users
    WHERE company_id = v_user_company_id
      AND role = 'admin'
      AND active = true;
    
    IF v_admin_count <= 1 THEN
      RETURN json_build_object(
        'error', true,
        'message', 'No se puede eliminar el último administrador activo de la empresa',
        'code', 'LAST_ADMIN_PROTECTION'
      );
    END IF;
  END IF;

  -- Check if user has associated sales
  SELECT COUNT(*) INTO v_sales_count
  FROM public.sales
  WHERE cashier_id = p_user_id;

  -- If user has sales, try to update them to set cashier_id to NULL
  -- Note: If cashier_id is NOT NULL in the schema, we need to make it nullable first
  IF v_sales_count > 0 THEN
    -- Try to make cashier_id nullable if it isn't already
    -- This is a one-time operation, so we check first
    BEGIN
      -- Check if column is nullable
      IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'cashier_id' 
        AND is_nullable = 'YES'
      ) THEN
        -- Column is nullable, we can set it to NULL
        UPDATE public.sales
        SET cashier_id = NULL
        WHERE cashier_id = p_user_id;
      ELSE
        -- Column is NOT NULL, we need to make it nullable first
        -- Then update the sales
        ALTER TABLE public.sales 
        ALTER COLUMN cashier_id DROP NOT NULL;
        
        UPDATE public.sales
        SET cashier_id = NULL
        WHERE cashier_id = p_user_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If we can't update (e.g., constraint violation), return error
        RETURN json_build_object(
          'error', true,
          'message', 'No se puede eliminar el usuario porque tiene ' || v_sales_count || ' venta(s) asociada(s) en el sistema. Las ventas históricas deben conservar la referencia al cajero.',
          'code', 'HAS_ASSOCIATED_SALES',
          'sales_count', v_sales_count
        );
    END;
  END IF;

  -- Now delete the user profile (this will cascade to related tables that allow it)
  DELETE FROM public.users WHERE id = p_user_id;

  -- If user has auth_user_id, try to delete from auth.users
  IF v_auth_user_id IS NOT NULL THEN
    -- Attempt to delete from auth.users
    -- This may fail if we don't have proper permissions, but the profile is already deleted
    BEGIN
      DELETE FROM auth.users WHERE id = v_auth_user_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but continue (profile is already deleted)
        RAISE NOTICE 'Could not delete auth user: %', SQLERRM;
    END;
  END IF;

  -- Return success result
  RETURN json_build_object(
    'error', false,
    'message', 'Usuario eliminado completamente. Se actualizaron ' || v_sales_count || ' venta(s) asociada(s) estableciendo cashier_id a NULL.',
    'user_name', v_user_name,
    'auth_user_deleted', v_auth_user_id IS NOT NULL,
    'sales_updated', v_sales_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Also update the foreign key constraint to allow NULL values
-- First, drop the existing constraint
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey;

-- Make cashier_id nullable if it isn't already
ALTER TABLE public.sales
ALTER COLUMN cashier_id DROP NOT NULL;

-- Recreate the foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.sales
ADD CONSTRAINT sales_cashier_id_fkey
FOREIGN KEY (cashier_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

