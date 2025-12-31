# 🔒 INSTRUCCIONES SEGURAS: Eliminar Función Duplicada

## ⚠️ IMPORTANTE: Sigue estos pasos en orden

### PASO 1: Consultar y Respaldar (OBLIGATORIO)

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `sql/00_consultar_y_respaldar_get_sales_history_v2.sql`
3. Ejecuta el script
4. **GUARDA los resultados**, especialmente:
   - La CONSULTA 2 que muestra el código completo (`function_definition`)
   - El RESUMEN que indica cuántas versiones hay

### PASO 2: Verificar Versión Correcta

Compara el código de la función en la base de datos con:
- `supabase/migrations/20250127000001_update_sales_history_v3.sql`

**La versión correcta debe:**
- ✅ Tener 6 parámetros (sin `p_category`)
- ✅ Incluir `created_at` en el JSONB output
- ✅ Incluir `category` en los items
- ✅ Tener todos los campos de Krece y Cashea (USD y BS)

### PASO 3: Eliminar Todas las Versiones

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `sql/07_eliminar_todas_variaciones_get_sales_history_v2.sql`
3. Ejecuta el script
4. Verifica que el mensaje diga: "✅ Todas las versiones de get_sales_history_v2 fueron eliminadas correctamente."

### PASO 4: Recrear Función Correcta

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `sql/08_recrear_funcion_desde_respaldo.sql`
3. Ejecuta el script
4. Verifica que al final muestre: "✅ Versión correcta (sin p_category)"

### PASO 5: Verificar en Frontend

1. Recarga la página del panel de ventas
2. El error "Could not choose the best candidate function" debe desaparecer
3. Las ventas deben cargarse correctamente

## 🆘 Si algo sale mal

Si después del PASO 3 (eliminar) algo falla:

1. **NO ENTRES EN PÁNICO**
2. Usa el código que guardaste en el PASO 1 (CONSULTA 2)
3. Ejecuta manualmente el código de `sql/08_recrear_funcion_desde_respaldo.sql`
4. O usa el código que guardaste del `function_definition` de la versión correcta

## 📋 Checklist de Seguridad

Antes de ejecutar cualquier script:

- [ ] Ejecuté el script de consulta (PASO 1)
- [ ] Guardé los resultados del `function_definition`
- [ ] Verifiqué que la versión sin `p_category` es la correcta
- [ ] Tengo acceso a `supabase/migrations/20250127000001_update_sales_history_v3.sql` como respaldo
- [ ] Entiendo que voy a eliminar funciones de la base de datos
- [ ] Tengo permisos de administrador en Supabase

## 🎯 Resultado Esperado

Después de completar todos los pasos:

```sql
-- Esta consulta debe retornar SOLO 1 fila:
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_sales_history_v2';
```

**Resultado esperado:**
```
function_name              | arguments
---------------------------|--------------------------------------------------------
get_sales_history_v2       | p_company_id uuid, p_store_id uuid, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_limit integer, p_offset integer
```

**NO debe aparecer ninguna versión con `p_category`.**

