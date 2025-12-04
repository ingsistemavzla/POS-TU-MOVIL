# 📋 INSTRUCCIONES DE EJECUCIÓN: Funciones RPC Legacy Financial

## ✅ ARCHIVOS GENERADOS

1. **`supabase/migrations/20250105000001_create_legacy_financial_functions.sql`**
   - Script SQL completo con las 3 funciones RPC
   - Índices recomendados
   - Tests manuales comentados

2. **`src/types/legacy-financial.ts`**
   - Interfaces TypeScript para las respuestas
   - Type guards para validación

---

## 🚀 PASOS DE EJECUCIÓN

### **Paso 1: Ejecutar Script SQL en Supabase**

1. Abre el **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido completo de `supabase/migrations/20250105000001_create_legacy_financial_functions.sql`
3. Pega y ejecuta el script
4. Verifica que no haya errores

### **Paso 2: Verificar Funciones Creadas**

Ejecuta en el SQL Editor:

```sql
-- Verificar que las funciones existen
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_inventory_financial_summary',
    'get_stock_matrix_by_store',
    'get_dashboard_store_performance'
  )
ORDER BY routine_name;
```

**Resultado esperado:** 3 filas (una por función)

---

## 🧪 PASO 3: TESTS MANUALES

### **Test 1: get_inventory_financial_summary**

```sql
-- Test básico (usa company_id del usuario autenticado)
SELECT public.get_inventory_financial_summary();

-- Test con company_id específico
SELECT public.get_inventory_financial_summary('aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid);
```

**Resultado esperado:**
```json
{
  "total_cost_value": 15000.00,
  "total_retail_value": 25000.00,
  "profit_potential": 10000.00,
  "out_of_stock_count": 5,
  "critical_stock_count": 12,
  "category_breakdown": [
    {
      "category_name": "Teléfonos",
      "total_cost_value": 12000.00,
      "total_retail_value": 20000.00,
      "profit_potential": 8000.00,
      "items_count": 50,
      "total_quantity": 100,
      "percentage_of_total": 80.0
    }
  ],
  "calculated_at": "2025-01-05T10:00:00Z"
}
```

---

### **Test 2: get_stock_matrix_by_store**

```sql
-- Test básico
SELECT public.get_stock_matrix_by_store();

-- Test con company_id específico
SELECT public.get_stock_matrix_by_store('aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid);
```

**Resultado esperado:**
```json
{
  "matrix": [
    {
      "store_id": "bb11cc22-dd33-ee44-ff55-aa6677889900",
      "store_name": "Tu Móvil Centro",
      "total_items": 117,
      "total_stock_quantity": 500,
      "categories": [
        {
          "category_name": "Teléfonos",
          "stock_qty": 112,
          "value_cost": 14000.00,
          "value_retail": 22000.00,
          "products_count": 45,
          "low_stock_count": 3
        },
        {
          "category_name": "Accesorios",
          "stock_qty": 5,
          "value_cost": 200.00,
          "value_retail": 300.00,
          "products_count": 5,
          "low_stock_count": 2
        }
      ]
    }
  ],
  "generated_at": "2025-01-05T10:00:00Z"
}
```

---

### **Test 3: get_dashboard_store_performance**

```sql
-- Test básico (últimos 30 días)
SELECT public.get_dashboard_store_performance();

-- Test con rango personalizado
SELECT public.get_dashboard_store_performance(
  NULL,
  '2025-01-01 00:00:00+00'::timestamptz,
  '2025-01-31 23:59:59+00'::timestamptz
);

-- Test con company_id específico
SELECT public.get_dashboard_store_performance(
  'aa11bb22-cc33-dd44-ee55-ff6677889900'::uuid,
  '2025-01-01 00:00:00+00'::timestamptz,
  '2025-01-31 23:59:59+00'::timestamptz
);
```

**Resultado esperado:**
```json
{
  "summary": [
    {
      "store_id": "bb11cc22-dd33-ee44-ff55-aa6677889900",
      "store_name": "Tu Móvil Centro",
      "total_invoiced": 50000.00,
      "net_income_real": 48000.00,
      "estimated_profit": 15000.00,
      "orders_count": 250,
      "avg_order_value": 200.00,
      "profit_margin_percent": 30.0
    }
  ],
  "period": {
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-31T23:59:59Z"
  },
  "generated_at": "2025-01-05T10:00:00Z"
}
```

---

## 🔍 VERIFICACIÓN DE ÍNDICES

Ejecuta para verificar que los índices se crearon:

```sql
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_inventories_company_product',
    'idx_products_company_category',
    'idx_inventories_store_product',
    'idx_sales_store_created',
    'idx_sale_payments_sale',
    'idx_sale_items_sale_product'
  )
ORDER BY tablename, indexname;
```

**Resultado esperado:** 6 filas (uno por índice)

---

## ⚠️ TROUBLESHOOTING

### **Error: "function get_user_company_id() does not exist"**

**Solución:** Verifica que la función helper existe:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_company_id';
```

Si no existe, busca en las migraciones anteriores o créala.

### **Error: "permission denied for schema public"**

**Solución:** Asegúrate de ejecutar el script como usuario con permisos de administrador en Supabase.

### **Error: "column does not exist"**

**Solución:** Verifica que las tablas tienen las columnas esperadas:

```sql
-- Verificar estructura de products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- Verificar estructura de inventories
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventories'
ORDER BY ordinal_position;
```

---

## 📊 PRÓXIMOS PASOS (FASE 2 - Frontend)

Una vez verificadas las funciones:

1. ✅ Crear hooks de React (`useInventoryFinancial`, `useStockMatrix`, `useStorePerformance`)
2. ✅ Implementar componentes UI para mostrar los datos
3. ✅ Integrar en los paneles correspondientes (Almacén, Dashboard)

---

**Estado:** ✅ **SQL LISTO PARA EJECUTAR**


