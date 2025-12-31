# 🔍 DIAGNÓSTICO: Función Duplicada `get_sales_history_v2`

## ❌ PROBLEMA IDENTIFICADO

El error indica que PostgreSQL tiene **DOS versiones** de la función `get_sales_history_v2`:

1. **Versión A (6 parámetros)**: `(p_company_id, p_store_id, p_date_from, p_date_to, p_limit, p_offset)`
2. **Versión B (7 parámetros)**: `(p_company_id, p_store_id, p_date_from, p_date_to, p_category, p_limit, p_offset)`

Cuando el frontend llama con 6 parámetros, PostgreSQL no puede decidir cuál usar porque ambas son candidatas válidas.

## 📋 ANÁLISIS DEL CÓDIGO ACTUAL

### ✅ Frontend (`useSalesData.ts`)
- **Línea 148-156**: Llama a la RPC con **6 parámetros** (sin `p_category`)
- **Línea 153**: Comentario explícito: `// ❌ REMOVIDO: p_category: filters.category || null`
- **Línea 344-352**: El filtro de categoría se aplica en el **frontend** después de obtener los datos

### ✅ Migraciones Encontradas

1. **`20250125000003_create_get_sales_history_v2.sql`**
   - Crea función con **6 parámetros** (sin `p_category`)
   - ✅ CORRECTO

2. **`20250127000001_update_sales_history_v3.sql`**
   - Actualiza función con **6 parámetros** (sin `p_category`)
   - ✅ CORRECTO

### ❌ PROBLEMA: Migración con `p_category` NO encontrada en el código

Esto significa que:
- La versión con `p_category` fue creada **fuera del control de versiones** (directamente en Supabase)
- O existe una migración **anterior** que no está en el repositorio
- O alguien ejecutó manualmente una versión con `p_category` en Supabase

## 🔧 SOLUCIÓN REQUERIDA

### PASO 1: Verificar funciones existentes en Supabase

Ejecutar en Supabase SQL Editor:

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2'
ORDER BY p.proname, p.oid;
```

**Resultado esperado**: Debe mostrar **2 filas** (una con 6 parámetros, otra con 7)

### PASO 2: Eliminar TODAS las versiones

El script `sql/06_eliminar_funcion_duplicada_get_sales_history_v2.sql` ya intenta esto, pero puede que no esté eliminando correctamente la versión con `p_category`.

### PASO 3: Verificar que el script se ejecutó correctamente

Después de ejecutar el script, verificar de nuevo:

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2';
```

**Resultado esperado**: Debe mostrar **SOLO 1 fila** con 6 parámetros.

## 🎯 CONCLUSIÓN

El problema **NO está en el código del frontend** (que está correcto), sino en la **base de datos** que tiene una función duplicada con `p_category` que no debería existir.

El script SQL `sql/06_eliminar_funcion_duplicada_get_sales_history_v2.sql` debería resolverlo, pero si el error persiste, significa que:

1. El script no se ejecutó correctamente
2. O hay una migración pendiente que está recreando la función con `p_category`
3. O hay permisos que impiden eliminar la función

## 📝 PRÓXIMOS PASOS

1. **Verificar** que el script SQL se ejecutó correctamente en Supabase
2. **Confirmar** que solo existe una versión de la función (6 parámetros)
3. **Si persiste el error**, ejecutar manualmente los DROP FUNCTION con todas las variaciones posibles

