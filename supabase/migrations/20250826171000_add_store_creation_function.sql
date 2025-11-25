-- Create RPC function to create default store during registration
CREATE OR REPLACE FUNCTION create_default_store(
  p_company_id uuid,
  p_store_name text DEFAULT 'Tienda Principal'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  store_record record;
BEGIN
  -- Insert the store directly bypassing RLS
  INSERT INTO public.stores (company_id, name, active)
  VALUES (p_company_id, p_store_name, true)
  RETURNING * INTO store_record;
  
  -- Return the created store as JSON
  RETURN row_to_json(store_record);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_store(uuid, text) TO authenticated;
