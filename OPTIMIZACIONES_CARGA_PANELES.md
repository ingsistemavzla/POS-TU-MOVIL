# 🚀 OPTIMIZACIONES DE CARGA - PANELES DE VENTAS, ALMACÉN Y ARTÍCULOS

## 📋 CLASIFICACIÓN POR IMPACTO

- **🟢 LEVES**: Mejoras rápidas, bajo riesgo, impacto moderado
- **🟡 MEDIAS**: Requieren más trabajo, impacto significativo
- **🔴 FUERTES**: Cambios arquitectónicos, alto impacto, mayor complejidad

---

## 1️⃣ PANEL DE VENTAS (Historial de Ventas)

### 🟢 OPTIMIZACIONES LEVES

#### 1.1 Lazy Loading de Items de Venta
**Problema:** Se cargan items de todas las ventas expandidas, incluso si el usuario no las ve.
**Solución:** Cargar items solo cuando el usuario expande una venta específica.
**Impacto:** Reduce carga inicial en ~40-60%
**Archivo:** `src/pages/SalesPage.tsx` (línea ~916)
**Código actual:**
```typescript
// Ya está implementado con fetchSaleItems, pero se puede mejorar
```
**Mejora:**
- ✅ Ya implementado con `fetchSaleItems` bajo demanda
- ⚠️ Agregar debounce al expandir múltiples ventas rápidamente

#### 1.2 Memoización de Cálculos
**Problema:** Cálculos de totales y estadísticas se recalculan en cada render.
**Solución:** Usar `useMemo` para cálculos costosos.
**Impacto:** Reduce renders innecesarios en ~20-30%
**Archivo:** `src/pages/SalesPage.tsx`
**Implementar:**
```typescript
const categoryStats = useMemo(() => {
  // Calcular estadísticas por categoría
}, [data, filters]);
```

#### 1.3 Debounce en Búsqueda
**Problema:** Cada tecla en el buscador dispara una consulta.
**Solución:** Debounce de 300-500ms en búsqueda.
**Impacto:** Reduce consultas en ~70-80%
**Archivo:** `src/pages/SalesPage.tsx`
**Implementar:**
```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
```

#### 1.4 Paginación Virtual
**Problema:** Renderiza todas las filas visibles aunque solo se vean 10-15.
**Solución:** Usar `react-window` o `react-virtual` para virtualización.
**Impacto:** Mejora rendimiento con muchas ventas (~50-70%)
**Archivo:** `src/pages/SalesPage.tsx`

#### 1.5 Cache de Items Cargados
**Problema:** Si se expande/colapsa una venta, se vuelve a cargar.
**Solución:** Cachear items ya cargados en memoria.
**Impacto:** Reduce consultas repetidas en ~30-40%
**Archivo:** `src/pages/SalesPage.tsx` (línea ~924)
**Mejora:**
- ✅ Ya existe `loadedSaleIdsRef`, pero se puede mejorar con TTL

---

### 🟡 OPTIMIZACIONES MEDIAS

#### 2.1 RPC Optimizada con Menos Campos
**Problema:** `get_sales_history_v2` retorna muchos campos que no siempre se usan.
**Solución:** Crear variante de RPC con campos mínimos para lista, cargar detalles bajo demanda.
**Impacto:** Reduce payload en ~40-50%
**Archivo:** `src/hooks/useSalesData.ts`
**Implementar:**
```sql
-- Nueva RPC: get_sales_list (solo campos esenciales)
CREATE OR REPLACE FUNCTION get_sales_list(...)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  created_at TIMESTAMP,
  total_usd NUMERIC,
  store_name TEXT,
  customer_name TEXT
  -- Solo campos esenciales
)
```

#### 2.2 Batch Loading de Items
**Problema:** Si se expanden 5 ventas, se hacen 5 consultas separadas.
**Solución:** Cargar items de múltiples ventas en una sola consulta.
**Impacto:** Reduce consultas en ~60-70%
**Archivo:** `src/pages/SalesPage.tsx`
**Implementar:**
```typescript
const fetchMultipleSaleItems = async (saleIds: string[]) => {
  const { data } = await supabase
    .from('sale_items')
    .select('*')
    .in('sale_id', saleIds);
  // Agrupar por sale_id
};
```

#### 2.3 Índices en Base de Datos
**Problema:** Consultas lentas sin índices apropiados.
**Solución:** Agregar índices compuestos en campos frecuentemente consultados.
**Impacto:** Reduce tiempo de consulta en ~50-80%
**SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_sales_company_date 
ON sales(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sales_store_date 
ON sales(store_id, created_at DESC);
```

#### 2.4 Prefetch de Página Siguiente
**Problema:** Usuario espera al cambiar de página.
**Solución:** Prefetch de página siguiente mientras usuario ve la actual.
**Impacto:** Reduce tiempo percibido en ~60-70%
**Archivo:** `src/hooks/useSalesData.ts`

#### 2.5 Compresión de Respuestas
**Problema:** Payloads grandes sin comprimir.
**Solución:** Habilitar compresión gzip en Supabase (ya debería estar).
**Impacto:** Reduce tamaño de transferencia en ~60-70%

---

### 🔴 OPTIMIZACIONES FUERTES

#### 3.1 Server-Side Pagination Real
**Problema:** Se carga todo y se pagina en cliente.
**Solución:** Paginación real en servidor con límites estrictos.
**Impacto:** Reduce carga inicial en ~80-90%
**Archivo:** `src/hooks/useSalesData.ts`
**Implementar:**
- Limitar a 50-100 ventas por página
- Deshabilitar "cargar todas" para grandes datasets

#### 3.2 Caché con React Query
**Problema:** Sin caché persistente entre navegaciones.
**Solución:** Implementar React Query con caché persistente.
**Impacto:** Reduce consultas repetidas en ~70-80%
**Archivo:** `src/hooks/useSalesData.ts`
**Implementar:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['sales', filters, page],
  queryFn: () => fetchSales(filters, page),
  staleTime: 30000, // 30 segundos
  cacheTime: 300000, // 5 minutos
});
```

#### 3.3 Virtualización Completa
**Problema:** Renderiza todas las filas aunque solo se vean pocas.
**Solución:** Virtualización completa de tabla con `react-window`.
**Impacto:** Mejora rendimiento con 1000+ ventas (~80-90%)
**Archivo:** `src/pages/SalesPage.tsx`

#### 3.4 Web Workers para Procesamiento
**Problema:** Cálculos pesados bloquean UI.
**Solución:** Mover cálculos de estadísticas a Web Worker.
**Impacto:** Mejora responsividad en ~50-60%
**Archivo:** `src/workers/salesStats.worker.ts`

#### 3.5 Streaming de Datos
**Problema:** Espera completa antes de mostrar resultados.
**Solución:** Streaming de ventas mientras se cargan.
**Impacto:** Reduce tiempo percibido en ~70-80%
**Complejidad:** ALTA - Requiere cambios en backend

---

## 2️⃣ PANEL DE ALMACÉN

### 🟢 OPTIMIZACIONES LEVES

#### 1.1 Lazy Loading de Stock por Tienda
**Problema:** Se carga stock de todas las tiendas aunque solo se vea una.
**Solución:** Cargar stock solo de tienda seleccionada inicialmente.
**Impacto:** Reduce carga inicial en ~50-70%
**Archivo:** `src/pages/AlmacenPage.tsx` (línea ~164)
**Implementar:**
```typescript
// Solo cargar inventario de tienda seleccionada
if (storeFilter !== 'all') {
  inventoryQuery = inventoryQuery.eq('store_id', storeFilter);
}
```

#### 1.2 Memoización de Filtros
**Problema:** Filtros se recalculan en cada render.
**Solución:** `useMemo` para productos filtrados.
**Impacto:** Reduce renders en ~30-40%
**Archivo:** `src/pages/AlmacenPage.tsx`

#### 1.3 Debounce en Búsqueda
**Problema:** Búsqueda dispara filtrado en cada tecla.
**Solución:** Debounce de 300ms.
**Impacto:** Reduce procesamiento en ~70-80%

#### 1.4 Cache de Productos
**Problema:** Productos se recargan en cada refresh.
**Solución:** Cache en memoria con invalidación manual.
**Impacto:** Reduce consultas en ~40-50%

#### 1.5 Paginación de Productos
**Problema:** Carga todos los productos de una vez.
**Solución:** Paginación de 50-100 productos por página.
**Impacto:** Reduce carga inicial en ~60-80%
**Archivo:** `src/pages/AlmacenPage.tsx`

---

### 🟡 OPTIMIZACIONES MEDIAS

#### 2.1 Carga Selectiva de Inventario
**Problema:** Carga inventario de todos los productos aunque solo se vean algunos.
**Solución:** Cargar inventario solo de productos visibles (lazy loading).
**Impacto:** Reduce carga inicial en ~70-80%
**Archivo:** `src/pages/AlmacenPage.tsx`
**Implementar:**
```typescript
// Cargar inventario solo cuando producto es visible
const loadInventoryForProduct = async (productId: string) => {
  // ...
};
```

#### 2.2 Batch Updates de Stock
**Problema:** Cada cambio de stock hace una consulta individual.
**Solución:** Agrupar cambios y actualizar en batch.
**Impacto:** Reduce consultas en ~60-70%
**Archivo:** `src/pages/AlmacenPage.tsx`

#### 2.3 Índices en Inventario
**Problema:** Consultas lentas sin índices.
**Solución:** Índices compuestos en inventario.
**Impacto:** Reduce tiempo de consulta en ~50-70%
**SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_inventories_product_store 
ON inventories(product_id, store_id);

CREATE INDEX IF NOT EXISTS idx_inventories_company_store 
ON inventories(company_id, store_id);
```

#### 2.4 Vista Materializada de Totales
**Problema:** Cálculo de totales en cada carga.
**Solución:** Vista materializada con refresh periódico.
**Impacto:** Reduce tiempo de carga en ~40-50%
**SQL:**
```sql
CREATE MATERIALIZED VIEW inventory_totals AS
SELECT 
  product_id,
  SUM(qty) as total_stock,
  COUNT(DISTINCT store_id) as store_count
FROM inventories
GROUP BY product_id;

CREATE INDEX ON inventory_totals(product_id);
```

#### 2.5 Optimistic Updates
**Problema:** Espera respuesta del servidor antes de actualizar UI.
**Solución:** Actualizar UI inmediatamente, revertir si falla.
**Impacto:** Mejora UX percibida en ~80-90%

---

### 🔴 OPTIMIZACIONES FUERTES

#### 3.1 Virtualización de Lista
**Problema:** Renderiza todos los productos aunque solo se vean 20-30.
**Solución:** Virtualización con `react-window`.
**Impacto:** Mejora rendimiento con 500+ productos (~80-90%)
**Archivo:** `src/pages/AlmacenPage.tsx`

#### 3.2 WebSocket para Updates en Tiempo Real
**Problema:** Cambios de stock requieren refresh manual.
**Solución:** WebSocket para updates en tiempo real.
**Impacto:** Mejora UX y reduce refreshes (~90%)
**Complejidad:** ALTA - Requiere backend

#### 3.3 Caché con Service Worker
**Problema:** Sin caché offline.
**Solución:** Service Worker para caché offline.
**Impacto:** Funciona offline, reduce consultas (~70-80%)

#### 3.4 Lazy Loading de Componentes
**Problema:** Todos los componentes se cargan al inicio.
**Solución:** Code splitting y lazy loading.
**Impacto:** Reduce bundle inicial en ~30-40%
**Implementar:**
```typescript
const ProductForm = lazy(() => import('@/components/pos/ProductForm'));
```

#### 3.5 Base de Datos Local (IndexedDB)
**Problema:** Sin persistencia local.
**Solución:** IndexedDB para caché local persistente.
**Impacto:** Reduce consultas repetidas en ~80-90%

---

## 3️⃣ PANEL DE ARTÍCULOS

### 🟢 OPTIMIZACIONES LEVES

#### 1.1 Mismas Optimizaciones que Almacén
**Problema:** Misma estructura que Almacén.
**Solución:** Aplicar mismas optimizaciones leves.
**Impacto:** Similar a Almacén

#### 1.2 Filtro de Categoría en SQL
**Problema:** Filtrado de categoría en memoria.
**Solución:** Filtrar en SQL antes de cargar.
**Impacto:** Reduce datos transferidos en ~40-60%
**Archivo:** `src/pages/ArticulosPage.tsx`

#### 1.3 Cache de Categorías
**Problema:** Categorías se recalculan en cada render.
**Solución:** Cache de productos agrupados por categoría.
**Impacto:** Reduce procesamiento en ~30-40%

---

### 🟡 OPTIMIZACIONES MEDIAS

#### 2.1 Carga Diferida de Stock
**Problema:** Stock se carga para todos los productos.
**Solución:** Cargar stock solo cuando se expande producto.
**Impacto:** Reduce carga inicial en ~60-70%
**Archivo:** `src/pages/ArticulosPage.tsx`

#### 2.2 Vista Materializada de Productos
**Problema:** JOINs costosos en cada consulta.
**Solución:** Vista materializada con datos pre-calculados.
**Impacto:** Reduce tiempo de consulta en ~50-60%
**SQL:**
```sql
CREATE MATERIALIZED VIEW products_with_stock AS
SELECT 
  p.*,
  SUM(i.qty) as total_stock,
  COUNT(DISTINCT i.store_id) as store_count
FROM products p
LEFT JOIN inventories i ON p.id = i.product_id
WHERE p.active = true
GROUP BY p.id;

REFRESH MATERIALIZED VIEW CONCURRENTLY products_with_stock;
```

#### 2.3 Batch Loading de Inventario
**Problema:** Inventario se carga producto por producto.
**Solución:** Cargar inventario de múltiples productos en batch.
**Impacto:** Reduce consultas en ~70-80%

---

### 🔴 OPTIMIZACIONES FUERTES

#### 3.1 Virtualización Completa
**Problema:** Renderiza todos los productos.
**Solución:** Virtualización con `react-window`.
**Impacto:** Mejora rendimiento con 500+ productos (~80-90%)

#### 3.2 Caché Distribuido (Redis)
**Problema:** Sin caché en servidor.
**Solución:** Redis para caché de consultas frecuentes.
**Impacto:** Reduce carga en BD en ~70-80%
**Complejidad:** ALTA - Requiere infraestructura

#### 3.3 CDN para Assets Estáticos
**Problema:** Assets se cargan desde servidor principal.
**Solución:** CDN para imágenes y assets.
**Impacto:** Reduce tiempo de carga en ~40-50%

---

## 📊 RESUMEN DE IMPACTO

### 🟢 LEVES (Implementación: 1-2 días)
- **Impacto total:** ~30-50% mejora en carga inicial
- **Riesgo:** Bajo
- **Esfuerzo:** 1-2 días por panel

### 🟡 MEDIAS (Implementación: 3-5 días)
- **Impacto total:** ~50-70% mejora en carga inicial
- **Riesgo:** Medio
- **Esfuerzo:** 3-5 días por panel

### 🔴 FUERTES (Implementación: 1-2 semanas)
- **Impacto total:** ~70-90% mejora en carga inicial
- **Riesgo:** Alto
- **Esfuerzo:** 1-2 semanas por panel

---

## 🎯 RECOMENDACIÓN DE IMPLEMENTACIÓN

### Fase 1: Leves (Semana 1)
1. ✅ Debounce en búsquedas
2. ✅ Memoización de cálculos
3. ✅ Cache de items cargados
4. ✅ Paginación de productos

### Fase 2: Medias (Semana 2-3)
1. ✅ Índices en base de datos
2. ✅ Batch loading
3. ✅ RPC optimizada
4. ✅ Vista materializada

### Fase 3: Fuertes (Semana 4+)
1. ✅ Virtualización
2. ✅ React Query
3. ✅ WebSocket (opcional)
4. ✅ Service Worker (opcional)

---

## 📝 NOTAS IMPORTANTES

- **Medir antes y después:** Usar Chrome DevTools Performance
- **Probar con datos reales:** No solo con datasets pequeños
- **Monitorear:** Agregar métricas de rendimiento
- **Iterar:** Implementar por fases y medir impacto

---

**Fecha:** 2025-01-31  
**Versión:** 1.0

