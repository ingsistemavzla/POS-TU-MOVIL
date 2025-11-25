# Verificación y Solución de Problemas de Krece

## Problema Identificado
- Error al cargar estadísticas de Krece
- Las compras con Krece no aparecen en cuentas por cobrar

## Pasos para Solucionar

### 1. Aplicar Migraciones
```bash
npx supabase db push
```

### 2. Verificar Tablas en Base de Datos
Ejecutar en Supabase SQL Editor:

```sql
-- Verificar si las columnas de Krece existen en sales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name LIKE 'krece%';

-- Verificar si existe la tabla krece_financing
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'krece_financing'
);

-- Verificar si existe la tabla krece_accounts_receivable
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'krece_accounts_receivable'
);

-- Verificar si existe la función get_krece_accounts_summary
SELECT EXISTS (
  SELECT FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'get_krece_accounts_summary'
);
```

### 3. Crear Datos de Prueba
Si las tablas existen pero no hay datos, crear una venta de prueba:

```sql
-- Insertar una venta de prueba con Krece
INSERT INTO sales (
  company_id, 
  store_id, 
  cashier_id, 
  customer_id,
  total_usd,
  total_bs,
  krece_enabled,
  krece_financed_amount_usd,
  krece_initial_amount_usd,
  krece_initial_percentage,
  created_at
) VALUES (
  'TU_COMPANY_ID', -- Reemplazar con el ID real
  'TU_STORE_ID',   -- Reemplazar con el ID real
  'TU_CASHIER_ID', -- Reemplazar con el ID real
  'TU_CUSTOMER_ID', -- Reemplazar con el ID real
  1000.00,
  35000000.00,
  true,
  800.00,
  200.00,
  20.00,
  now()
);
```

### 4. Verificar Funciones
```sql
-- Probar la función get_krece_accounts_summary
SELECT * FROM get_krece_accounts_summary('TU_COMPANY_ID');
```

### 5. Verificar Permisos RLS
```sql
-- Verificar políticas RLS para las tablas de Krece
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('krece_financing', 'krece_accounts_receivable');
```

## Componente de Prueba
Se ha agregado un componente de prueba al dashboard que:
- Verifica la existencia de las tablas
- Prueba las funciones de base de datos
- Muestra información de debugging
- Permite refrescar las estadísticas

## Posibles Causas del Problema

1. **Migraciones no aplicadas**: Las tablas de Krece no existen
2. **Columnas faltantes**: Las columnas de Krece no están en la tabla sales
3. **Funciones no creadas**: La función get_krece_accounts_summary no existe
4. **Permisos RLS**: Las políticas de seguridad bloquean el acceso
5. **Datos faltantes**: No hay ventas con Krece en la base de datos

## Solución Temporal
Si las migraciones no se pueden aplicar inmediatamente, el hook useKreceStats:
- Maneja errores graciosamente
- Muestra estadísticas básicas de ventas con Krece
- No falla completamente si faltan tablas o funciones

## Próximos Pasos
1. Aplicar la migración `20250101000010_fix_krece_tables_and_functions.sql`
2. Verificar que las tablas y funciones existan
3. Crear datos de prueba si es necesario
4. Probar el componente de prueba en el dashboard
5. Remover el componente de prueba una vez que todo funcione



