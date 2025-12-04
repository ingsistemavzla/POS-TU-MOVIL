# 📊 REPORTE TÉCNICO: Análisis de Esquema y Estrategias para Funcionalidades Legacy

**Fecha:** 2025-01-XX  
**Arquitecto:** Sistema Legacy POS  
**Objetivo:** Implementar 3 funcionalidades críticas faltantes

---

## 🔍 1. ESTADO ACTUAL DEL ESQUEMA

### **Tabla `products`**
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- sku (TEXT, UNIQUE por company)
- barcode (TEXT, UNIQUE por company)
- name (TEXT)
- category (TEXT) -- ⚠️ NO hay tabla categories separada, es campo TEXT
- cost_usd (DECIMAL(10,2)) -- ✅ EXISTE: Costo del producto
- sale_price_usd (DECIMAL(10,2)) -- ✅ EXISTE: Precio de venta
- tax_rate (DECIMAL(5,2), DEFAULT 16.00)
- active (BOOLEAN, DEFAULT true)
- created_at, updated_at
```

**✅ CONFIRMACIÓN:** Tenemos `cost_usd` y `sale_price_usd` en la tabla `products`.

---

### **Tabla `inventories`**
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- store_id (UUID, FK → stores) -- ✅ Relación directa con stores
- product_id (UUID, FK → products) -- ✅ Relación directa con products
- qty (INTEGER, DEFAULT 0) -- ✅ Stock por sucursal
- min_qty (INTEGER, DEFAULT 5)
- created_at, updated_at
- UNIQUE(company_id, store_id, product_id) -- ⚠️ Stock SEPARADO por sucursal
```

**✅ CONFIRMACIÓN:** 
- El stock está **separado por sucursal** (no centralizado).
- Relación directa: `inventories.store_id → stores.id`
- Relación directa: `inventories.product_id → products.id`

---

### **Tabla `sales`**
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- store_id (UUID, FK → stores) -- ✅ Relación directa y limpia
- customer_id (UUID, FK → customers, nullable)
- cashier_id (UUID, FK → users)
- total_usd (DECIMAL(10,2)) -- Total facturado
- total_bs (DECIMAL(15,2))
- bcv_rate_used (DECIMAL(10,4))
- payment_method (TEXT) -- Método principal
- status (TEXT, DEFAULT 'completed')
- invoice_number (TEXT, nullable)
- created_at (TIMESTAMP)
```

**✅ CONFIRMACIÓN:**
- Relación directa: `sales.store_id → stores.id`
- Campo `total_usd` = Total Facturado
- **⚠️ NO hay campo directo para "Ingreso Neto" (Ganancia)**

---

### **Tabla `sale_items`**
```sql
- id (UUID, PK)
- sale_id (UUID, FK → sales)
- product_id (UUID, FK → products)
- qty (INTEGER)
- price_usd (DECIMAL(10,2)) -- Precio de venta al momento de la venta
- discount_usd (DECIMAL(10,2), DEFAULT 0)
- subtotal_usd (DECIMAL(10,2)) -- qty * price_usd - discount
- product_name (TEXT) -- Snapshot
- product_sku (TEXT) -- Snapshot
- created_at (TIMESTAMP)
```

**⚠️ OBSERVACIÓN:**
- `sale_items` NO guarda `cost_usd` al momento de la venta.
- Para calcular ganancia, necesitamos JOIN con `products.cost_usd` (puede cambiar en el tiempo).

---

### **Tabla `sale_payments`**
```sql
- id (UUID, PK)
- sale_id (UUID, FK → sales)
- payment_method (TEXT) -- cash_usd, card_usd, zelle, etc.
- amount_usd (DECIMAL(10,2)) -- Monto real recibido
- amount_bs (DECIMAL(15,2))
```

**✅ CONFIRMACIÓN:**
- `sale_payments.amount_usd` = **Ingreso Neto Real** (lo que realmente entra a la tienda).
- Una venta puede tener múltiples pagos (pago mixto).

---

### **Tabla `stores`**
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- name (TEXT)
- address (TEXT, nullable)
- phone (TEXT, nullable)
- active (BOOLEAN, DEFAULT true)
- created_at, updated_at
```

**✅ CONFIRMACIÓN:** Estructura simple y directa.

---

## 📋 2. ANÁLISIS POR NECESIDAD

### **NECESIDAD 1: TABLERO FINANCIERO DE INVENTARIO**

#### **Preguntas Respondidas:**
- ✅ **¿Tenemos `cost` y `price`?** 
  - SÍ: `products.cost_usd` y `products.sale_price_usd`
  
- ✅ **¿El stock está centralizado o separado por sucursal?**
  - SEPARADO: `inventories` tiene `store_id`, cada sucursal tiene su propio stock.

#### **Estrategia Propuesta:**

**OPCIÓN A: RPC Function (Recomendada para tiempo real)**
```sql
CREATE OR REPLACE FUNCTION get_inventory_financial_dashboard(
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_total_value DECIMAL(15,2);
  v_category_breakdown JSONB;
BEGIN
  -- Obtener company_id del usuario si no se proporciona
  IF p_company_id IS NULL THEN
    v_company_id := public.get_user_company_id();
  ELSE
    v_company_id := p_company_id;
  END IF;

  -- Calcular valor total del inventario
  SELECT COALESCE(SUM(inv.qty * p.sale_price_usd), 0)
  INTO v_total_value
  FROM public.inventories inv
  INNER JOIN public.products p ON inv.product_id = p.id
  WHERE inv.company_id = v_company_id
    AND p.active = true;

  -- Desglose por categoría
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', COALESCE(p.category, 'Sin Categoría'),
      'total_quantity', SUM(inv.qty),
      'total_value', SUM(inv.qty * p.sale_price_usd),
      'avg_cost', AVG(p.cost_usd),
      'avg_price', AVG(p.sale_price_usd),
      'potential_profit', SUM(inv.qty * (p.sale_price_usd - p.cost_usd))
    )
    ORDER BY SUM(inv.qty * p.sale_price_usd) DESC
  )
  INTO v_category_breakdown
  FROM public.inventories inv
  INNER JOIN public.products p ON inv.product_id = p.id
  WHERE inv.company_id = v_company_id
    AND p.active = true
  GROUP BY COALESCE(p.category, 'Sin Categoría');

  RETURN jsonb_build_object(
    'total_inventory_value', v_total_value,
    'category_breakdown', COALESCE(v_category_breakdown, '[]'::jsonb),
    'calculated_at', NOW()
  );
END;
$$;
```

**Ventajas:**
- ✅ Tiempo real (siempre actualizado)
- ✅ Respeta RLS automáticamente
- ✅ Puede incluir lógica de negocio adicional

**Desventajas:**
- ⚠️ Puede ser más lento con grandes volúmenes (pero aceptable para dashboard)

---

### **NECESIDAD 2: MATRIZ DE STOCK POR SUCURSAL**

#### **Preguntas Respondidas:**
- ✅ **¿Cómo está relacionada `inventories` con `stores`?**
  - Relación directa: `inventories.store_id → stores.id`
  - Relación directa: `inventories.product_id → products.id`
  - `products.category` es TEXT (no hay tabla categories)

#### **Estrategia Propuesta:**

**OPCIÓN A: RPC Function con PIVOT (Recomendada)**
```sql
CREATE OR REPLACE FUNCTION get_stock_matrix_by_store_category(
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_matrix JSONB;
BEGIN
  IF p_company_id IS NULL THEN
    v_company_id := public.get_user_company_id();
  ELSE
    v_company_id := p_company_id;
  END IF;

  -- Matriz: Categoría × Sucursal
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', COALESCE(p.category, 'Sin Categoría'),
      'stores', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'total_stock', SUM(inv.qty),
            'products_count', COUNT(DISTINCT inv.product_id),
            'low_stock_count', COUNT(DISTINCT CASE WHEN inv.qty <= inv.min_qty THEN inv.product_id END)
          )
        )
        FROM public.inventories inv
        INNER JOIN public.stores s ON inv.store_id = s.id
        WHERE inv.company_id = v_company_id
          AND inv.product_id IN (
            SELECT id FROM public.products 
            WHERE company_id = v_company_id 
              AND COALESCE(category, 'Sin Categoría') = COALESCE(p.category, 'Sin Categoría')
              AND active = true
          )
        GROUP BY s.id, s.name
      )
    )
    ORDER BY COALESCE(p.category, 'Sin Categoría')
  )
  INTO v_matrix
  FROM public.products p
  WHERE p.company_id = v_company_id
    AND p.active = true
  GROUP BY COALESCE(p.category, 'Sin Categoría');

  RETURN jsonb_build_object(
    'matrix', COALESCE(v_matrix, '[]'::jsonb),
    'generated_at', NOW()
  );
END;
$$;
```

**OPCIÓN B: Vista Materializada (Si se requiere alta performance)**
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_matrix_view AS
SELECT 
  COALESCE(p.category, 'Sin Categoría') AS category,
  s.id AS store_id,
  s.name AS store_name,
  SUM(inv.qty) AS total_stock,
  COUNT(DISTINCT inv.product_id) AS products_count,
  SUM(inv.qty * p.sale_price_usd) AS total_value
FROM public.inventories inv
INNER JOIN public.products p ON inv.product_id = p.id
INNER JOIN public.stores s ON inv.store_id = s.id
WHERE p.active = true
GROUP BY COALESCE(p.category, 'Sin Categoría'), s.id, s.name;

CREATE INDEX idx_inventory_matrix_category_store 
ON inventory_matrix_view(category, store_id);

-- Refresh manual o programado
REFRESH MATERIALIZED VIEW inventory_matrix_view;
```

**Recomendación:** RPC Function (Opción A) porque:
- ✅ Más flexible (filtros dinámicos)
- ✅ Respeta RLS automáticamente
- ✅ No requiere mantenimiento de refresh

---

### **NECESIDAD 3: RESUMEN DE VENTAS POR TIENDA**

#### **Preguntas Respondidas:**
- ✅ **¿La tabla `sales` tiene relación directa con `stores`?**
  - SÍ: `sales.store_id → stores.id` (relación directa y limpia)

- ✅ **¿Tenemos campo para "Ingreso Neto" (Ganancia)?**
  - **NO directamente en `sales`**, pero podemos calcular:
    - **Total Facturado:** `sales.total_usd`
    - **Ingreso Neto Real:** `SUM(sale_payments.amount_usd)` (lo que realmente entra)
    - **Ganancia (Profit):** `SUM(sale_items.subtotal_usd) - SUM(sale_items.qty * products.cost_usd)`

#### **Estrategia Propuesta:**

**OPCIÓN A: RPC Function Completa (Recomendada)**
```sql
CREATE OR REPLACE FUNCTION get_sales_summary_by_store(
  p_company_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_summary JSONB;
BEGIN
  IF p_company_id IS NULL THEN
    v_company_id := public.get_user_company_id();
  ELSE
    v_company_id := p_company_id;
  END IF;

  -- Si no se proporcionan fechas, usar último mes
  IF p_start_date IS NULL THEN
    p_start_date := NOW() - INTERVAL '1 month';
  END IF;
  IF p_end_date IS NULL THEN
    p_end_date := NOW();
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'store_id', s.id,
      'store_name', s.name,
      'total_invoiced', COALESCE(SUM(sales.total_usd), 0), -- Total Facturado
      'net_income', COALESCE(SUM(sp.amount_usd), 0), -- Ingreso Neto Real (de sale_payments)
      'gross_profit', COALESCE(
        SUM(si.subtotal_usd) - SUM(si.qty * p.cost_usd), 
        0
      ), -- Ganancia Bruta
      'total_orders', COUNT(DISTINCT sales.id),
      'avg_order_value', CASE 
        WHEN COUNT(DISTINCT sales.id) > 0 
        THEN SUM(sales.total_usd) / COUNT(DISTINCT sales.id)
        ELSE 0 
      END,
      'profit_margin_percent', CASE
        WHEN SUM(si.subtotal_usd) > 0
        THEN ((SUM(si.subtotal_usd) - SUM(si.qty * p.cost_usd)) / SUM(si.subtotal_usd)) * 100
        ELSE 0
      END
    )
    ORDER BY SUM(sales.total_usd) DESC
  )
  INTO v_summary
  FROM public.stores s
  LEFT JOIN public.sales ON s.id = sales.store_id 
    AND sales.company_id = v_company_id
    AND sales.created_at >= p_start_date
    AND sales.created_at < p_end_date
    AND sales.status = 'completed'
  LEFT JOIN public.sale_items si ON sales.id = si.sale_id
  LEFT JOIN public.products p ON si.product_id = p.id
  LEFT JOIN public.sale_payments sp ON sales.id = sp.sale_id
  WHERE s.company_id = v_company_id
    AND s.active = true
  GROUP BY s.id, s.name;

  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, '[]'::jsonb),
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'generated_at', NOW()
  );
END;
$$;
```

**Ventajas:**
- ✅ Calcula **Total Facturado** (`sales.total_usd`)
- ✅ Calcula **Ingreso Neto Real** (`sale_payments.amount_usd`) - diferencia importante si hay pagos diferidos
- ✅ Calcula **Ganancia Bruta** (Revenue - Cost)
- ✅ Incluye métricas adicionales (avg order, profit margin)

---

## 🎯 3. RESUMEN EJECUTIVO

### **✅ Campos Disponibles:**
| Necesidad | Campo Requerido | Estado | Ubicación |
|-----------|----------------|--------|-----------|
| **1. Valor Inventario** | `cost_usd`, `sale_price_usd` | ✅ DISPONIBLE | `products` |
| **1. Valor Inventario** | `qty` por store | ✅ DISPONIBLE | `inventories` |
| **2. Matriz Stock** | `store_id`, `category` | ✅ DISPONIBLE | `inventories.store_id`, `products.category` |
| **3. Ventas por Tienda** | `store_id` | ✅ DISPONIBLE | `sales.store_id` |
| **3. Ingreso Neto** | `amount_usd` | ✅ DISPONIBLE | `sale_payments.amount_usd` |
| **3. Ganancia** | `cost_usd` | ✅ DISPONIBLE | `products.cost_usd` (via JOIN) |

### **⚠️ Consideraciones Técnicas:**

1. **Categorías:**
   - `products.category` es **TEXT** (no hay tabla `categories`).
   - Agrupar por `COALESCE(category, 'Sin Categoría')`.

2. **Stock por Sucursal:**
   - Stock está **separado** (`inventories` tiene `store_id`).
   - Para valor total, sumar todas las sucursales.

3. **Cálculo de Ganancia:**
   - `sale_items` NO guarda `cost_usd` histórico.
   - Usar JOIN con `products.cost_usd` (puede cambiar, pero es aceptable para reportes).

4. **Ingreso Neto vs Total Facturado:**
   - **Total Facturado:** `sales.total_usd` (monto de la factura).
   - **Ingreso Neto Real:** `SUM(sale_payments.amount_usd)` (lo que realmente entra, puede ser menor si hay pagos diferidos/Krece).

---

## 📝 4. RECOMENDACIONES FINALES

### **Estrategia General:**
✅ **Usar RPC Functions (SECURITY DEFINER)** para las 3 funcionalidades porque:
- Respeta RLS automáticamente
- Permite lógica de negocio compleja
- Performance aceptable para dashboards
- Fácil de mantener y actualizar

### **Índices Recomendados (si no existen):**
```sql
-- Para Necesidad 1
CREATE INDEX IF NOT EXISTS idx_inventories_company_product 
ON public.inventories(company_id, product_id);

CREATE INDEX IF NOT EXISTS idx_products_company_category 
ON public.products(company_id, category) WHERE active = true;

-- Para Necesidad 2
CREATE INDEX IF NOT EXISTS idx_inventories_store_product 
ON public.inventories(store_id, product_id);

-- Para Necesidad 3
CREATE INDEX IF NOT EXISTS idx_sales_store_created 
ON public.sales(store_id, created_at) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale 
ON public.sale_payments(sale_id);
```

### **Próximos Pasos:**
1. ✅ Crear las 3 RPC Functions propuestas
2. ✅ Agregar índices si no existen
3. ✅ Crear hooks de React para consumir las funciones
4. ✅ Implementar componentes UI para mostrar los datos

---

**Estado:** ✅ **ESQUEMA COMPLETO - LISTO PARA IMPLEMENTACIÓN**


