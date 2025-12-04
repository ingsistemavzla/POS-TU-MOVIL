-- Verificar la estructura real de la tabla sale_payments
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sale_payments'
ORDER BY ordinal_position;

-- Verificar si la tabla existe
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'sale_payments'
) as table_exists;
